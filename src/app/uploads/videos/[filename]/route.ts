import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

async function resolveMediaFile(inputFilename: string): Promise<{
  filePath: string;
  contentType: string;
  fileSize: number;
} | null> {
  let decoded = inputFilename;
  try {
    decoded = decodeURIComponent(inputFilename);
  } catch {}
  const safeFilename = path.basename(decoded);
  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  // 1. Check local public uploads directory
  let filePath = path.join(process.cwd(), 'public', 'uploads', 'videos', safeFilename);
  let fileExists = fs.existsSync(filePath);

  // 2. Fallback to os.tmpdir() (for serverless environments like Vercel)
  if (!fileExists) {
    const tmpPath = path.join(os.tmpdir(), safeFilename);
    if (fs.existsSync(tmpPath)) {
      filePath = tmpPath;
      fileExists = true;
    }
  }

  // 3. Fallback to database MediaAsset table (guarantees cross-instance persistence on Vercel)
  if (!fileExists) {
    try {
      const cleanName = safeFilename.replace(/^\d+_/, '').replace(/^media-\d+-[a-z0-9]+-?/, '');
      let asset = await prisma.mediaAsset.findFirst({
        where: {
          data: { not: null },
          OR: [
            { url: { endsWith: safeFilename } },
            { url: `/uploads/videos/${safeFilename}` }
          ]
        },
        select: { data: true }
      });

      if (!asset && cleanName && cleanName.length > 3) {
        asset = await prisma.mediaAsset.findFirst({
          where: {
            data: { not: null },
            OR: [
              { url: { contains: cleanName } },
              { name: { contains: cleanName } }
            ]
          },
          select: { data: true }
        });
      }

      if (asset?.data) {
        const buf = Buffer.from(asset.data, 'base64');
        const tmpPath = path.join(os.tmpdir(), safeFilename);
        const tempWritePath = `${tmpPath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
        await fs.promises.writeFile(tempWritePath, buf).catch(() => {});
        try {
          await fs.promises.rename(tempWritePath, tmpPath);
        } catch {
          await fs.promises.unlink(tempWritePath).catch(() => {});
        }
        filePath = tmpPath;
        fileExists = true;
      }
    } catch {}
  }

  // 4. Fallback to VideoUploadChunk table (for large/chunked videos up to 500MB)
  if (!fileExists) {
    try {
      const chunks = await prisma.videoUploadChunk.findMany({
        where: {
          OR: [
            { fileName: safeFilename },
            { uploadId: safeFilename }
          ]
        },
        orderBy: { chunkIndex: 'asc' },
        select: { data: true }
      });

      if (chunks && chunks.length > 0) {
        const tmpPath = path.join(os.tmpdir(), safeFilename);
        const tempWritePath = `${tmpPath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
        const writeStream = fs.createWriteStream(tempWritePath);
        for (const c of chunks) {
          const chunkBuf = Buffer.from(c.data, 'base64');
          await new Promise<void>((resolve) => {
            if (!writeStream.write(chunkBuf)) {
              writeStream.once('drain', resolve);
            } else {
              process.nextTick(resolve);
            }
          });
        }
        await new Promise<void>((resolve) => writeStream.end(resolve));

        try {
          await fs.promises.rename(tempWritePath, tmpPath);
        } catch {
          await fs.promises.unlink(tempWritePath).catch(() => {});
        }
        filePath = tmpPath;
        fileExists = fs.existsSync(filePath);
      }
    } catch {}
  }

  if (!fileExists || !fs.existsSync(filePath)) {
    return null;
  }

  const stat = fs.statSync(filePath);
  return {
    filePath,
    contentType,
    fileSize: stat.size
  };
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new NextResponse(null, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const media = await resolveMediaFile(safeFilename);

    if (!media) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(media.fileSize),
        'Content-Type': media.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept'
      }
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const media = await resolveMediaFile(safeFilename);

    if (!media) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { filePath, contentType, fileSize } = media;
    const rangeHeader = req.headers.get('range');

    const commonHeaders: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept'
    };

    // Handle HTTP Range Requests (essential for HTML5 video seeking & buffering)
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            ...commonHeaders,
            'Content-Range': `bytes */${fileSize}`
          }
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        }
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          ...commonHeaders,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(chunkSize)
        }
      });
    }

    // Full file response
    const fileStream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      }
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Length': String(fileSize)
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to serve media file' },
      { status: 500 }
    );
  }
}
