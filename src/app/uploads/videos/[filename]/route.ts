import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

    if (!fileExists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get('range');

    // Handle HTTP Range Requests (essential for HTML5 video seeking)
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` }
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // Convert Node.js readable stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        }
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
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
      }
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to serve media file' },
      { status: 500 }
    );
  }
}
