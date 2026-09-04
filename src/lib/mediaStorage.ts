import fs from 'fs';
import path from 'path';

export const SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/ogg',
  'application/x-mpegURL',
  'application/vnd.apple.mpegurl'
];

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.m3u8'];

export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export interface VideoSourceAnalysis {
  provider: 'DIRECT_UPLOAD' | 'YOUTUBE' | 'VIMEO' | 'HLS_STREAM' | 'AWS_S3' | 'CDN_STORAGE' | 'EXTERNAL_URL';
  isValid: boolean;
  cleanUrl: string;
  embedUrl?: string;
  format?: string;
  durationEstimate?: string;
  errorMessage?: string;
}

/**
 * Validates and classifies external video sources
 */
export function analyzeExternalVideoSource(rawUrl: string): VideoSourceAnalysis {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { provider: 'EXTERNAL_URL', isValid: false, cleanUrl: '', errorMessage: 'URL is required.' };
  }

  const url = rawUrl.trim();

  // 1. YouTube Match (Standard, Short, Embed)
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      provider: 'YOUTUBE',
      isValid: true,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      format: 'youtube',
      durationEstimate: '15:00'
    };
  }

  // 2. Vimeo Match
  const vimeoMatch = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|))(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'VIMEO',
      isValid: true,
      cleanUrl: `https://vimeo.com/${videoId}`,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      format: 'vimeo',
      durationEstimate: '15:00'
    };
  }

  // 3. HLS Stream (.m3u8)
  if (url.includes('.m3u8') || url.startsWith('hls://')) {
    return {
      provider: 'HLS_STREAM',
      isValid: true,
      cleanUrl: url,
      format: 'm3u8',
      durationEstimate: '18:00'
    };
  }

  // 4. AWS S3 / Cloudflare R2 / GCS Bucket
  if (url.includes('.s3.') || url.includes('s3.amazonaws.com') || url.includes('storage.googleapis.com') || url.includes('r2.cloudflarestorage.com')) {
    const ext = path.extname(new URL(url).pathname).toLowerCase() || '.mp4';
    return {
      provider: 'AWS_S3',
      isValid: true,
      cleanUrl: url,
      format: ext.replace('.', ''),
      durationEstimate: '12:00'
    };
  }

  // 5. Direct MP4 / WebM / CDN stream
  const ext = path.extname(url.split('?')[0]).toLowerCase();
  if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext) || url.startsWith('http://') || url.startsWith('https://')) {
    return {
      provider: 'CDN_STORAGE',
      isValid: true,
      cleanUrl: url,
      format: ext ? ext.replace('.', '') : 'mp4',
      durationEstimate: '12:00'
    };
  }

  return {
    provider: 'EXTERNAL_URL',
    isValid: false,
    cleanUrl: url,
    errorMessage: 'Unsupported video stream URL. Supported sources: Direct MP4/WebM/MOV, YouTube, Vimeo, HLS .m3u8, S3/CDN.'
  };
}

/**
 * Ensures uploads directory exists on disk
 */
export function ensureVideoUploadDir(): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
