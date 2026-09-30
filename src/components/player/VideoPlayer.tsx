'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';

interface VideoPlayerProps {
  title: string;
  videoUrl?: string | null;
  lessonId?: string;
  thumbnail?: string;
  duration?: string;
  isFree?: boolean;
  onLessonComplete?: () => void;
  onProgressUpdate?: (watchedSeconds: number, percent: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  title,
  videoUrl,
  lessonId,
  thumbnail,
  duration = '12:00',
  isFree = false,
  onLessonComplete,
  onProgressUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(720);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(videoUrl || null);
  const [watermark, setWatermark] = useState<{ enabled: boolean; text: string }>({
    enabled: true,
    text: 'Protected Stream • Morena LMS DRM'
  });
  const [securityPolicy, setSecurityPolicy] = useState<{
    signedUrlEnabled: boolean;
    allowVideoDownload: boolean;
    preventRightClick: boolean;
    disablePictureInPicture: boolean;
  }>({
    signedUrlEnabled: true,
    allowVideoDownload: false,
    preventRightClick: true,
    disablePictureInPicture: true
  });
  const [watermarkPosIndex, setWatermarkPosIndex] = useState(0);

  // Rotate anti-piracy watermark position every 18 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPosIndex((prev) => (prev + 1) % 4);
    }, 18000);
    return () => clearInterval(interval);
  }, []);

  // Fetch authorized & signed stream URL if lessonId is provided
  useEffect(() => {
    let isMounted = true;
    const checkStreamAuth = async () => {
      if (!lessonId || lessonId === 'placeholder' || lessonId.startsWith('placeholder') || lessonId.length < 5) {
        setResolvedVideoUrl(videoUrl || null);
        return;
      }

      try {
        const res = await fetch(`/api/lessons/${lessonId}/stream`);
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.allowed) {
            setResolvedVideoUrl(data.videoUrl || videoUrl || null);
            if (data.durationSeconds) setDurationSeconds(data.durationSeconds);
            if (data.watermark) setWatermark(data.watermark);
            if (data.securityPolicy) {
              setSecurityPolicy({
                signedUrlEnabled: Boolean(data.securityPolicy.signedUrlEnabled),
                allowVideoDownload: Boolean(data.securityPolicy.allowVideoDownload),
                preventRightClick: data.securityPolicy.preventRightClick !== false,
                disablePictureInPicture: data.securityPolicy.disablePictureInPicture !== false
              });
            }
            setStreamError(null);
          } else {
            setStreamError(data.error || 'Enrollment required to stream this masterclass video.');
          }
        }
      } catch {
        if (isMounted) setResolvedVideoUrl(videoUrl || null);
      }
    };

    checkStreamAuth();
    return () => {
      isMounted = false;
    };
  }, [lessonId, videoUrl]);

  // Handle Video Time Updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = Math.floor(videoRef.current.currentTime);
      const dur = Math.floor(videoRef.current.duration) || durationSeconds;
      setCurrentTime(cur);
      if (dur > 0) {
        setDurationSeconds(dur);
        const percent = Math.min(100, Math.round((cur / dur) * 100));
        onProgressUpdate?.(cur, percent);

        // Auto trigger complete at 90%
        if (percent >= 90 && onLessonComplete) {
          onLessonComplete();
        }
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.floor(pos * durationSeconds);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const cycleSpeed = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const progressPercent = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

  const isYouTube = resolvedVideoUrl?.includes('youtube.com') || resolvedVideoUrl?.includes('youtu.be');
  const isVimeo = resolvedVideoUrl?.includes('vimeo.com');

  const watermarkPositionClasses = [
    'bottom-14 right-6',
    'top-14 right-6',
    'bottom-14 left-6',
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  ][watermarkPosIndex];

  if (streamError) {
    return (
      <div className="w-full max-w-[1000px] mx-auto bg-slate-950 rounded-2xl aspect-video relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 text-center space-y-4 select-none">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
          <Icon name="lock" size={32} />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-white">Lecture Video Locked</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{streamError}</p>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full bg-white/10 text-slate-300">
          Secure Stream Gateway • Enrollment Validation Required
        </span>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => {
        if (securityPolicy.preventRightClick) {
          e.preventDefault();
        }
      }}
      className={`w-full h-full aspect-video max-h-[78vh] bg-black relative flex items-center justify-center group select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 max-w-none rounded-none aspect-auto h-screen' : ''
      }`}
    >
      {/* 1. YouTube Stream Embed */}
      {isYouTube ? (
        <div className="w-full h-full aspect-video relative flex items-center justify-center bg-black overflow-hidden">
          <iframe
            src={
              resolvedVideoUrl?.includes('embed')
                ? resolvedVideoUrl
                : `https://www.youtube.com/embed/${resolvedVideoUrl?.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1]}?rel=0&modestbranding=1`
            }
            title={title}
            className="w-full h-full aspect-video border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isVimeo ? (
        /* 2. Vimeo Stream Embed */
        <div className="w-full h-full aspect-video relative flex items-center justify-center bg-black overflow-hidden">
          <iframe
            src={`https://player.vimeo.com/video/${resolvedVideoUrl?.match(/vimeo\.com\/(\d+)/)?.[1]}`}
            title={title}
            className="w-full h-full aspect-video border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : resolvedVideoUrl ? (
        /* 3. Direct HTML5 MP4 / WebM / Local File Stream */
        <video
          ref={videoRef}
          src={resolvedVideoUrl}
          poster={thumbnail}
          controlsList={securityPolicy.allowVideoDownload ? undefined : 'nodownload'}
          disablePictureInPicture={securityPolicy.disablePictureInPicture}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            onLessonComplete?.();
          }}
          className="w-full h-full aspect-video max-h-[78vh] object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
        />
      ) : (
        /* 4. Placeholder when no video attached yet */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="movie" size={32} />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-bold text-sm text-white">{title}</h3>
            <p className="text-xs text-slate-400">
              Curriculum lecture asset ready for streaming.
            </p>
          </div>
        </div>
      )}

      {/* Floating Quality Badge */}
      {!isYouTube && !isVimeo && (
        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white/90 border border-white/10 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>1080p HD Stream</span>
        </div>
      )}

      {/* Signed Private Stream Security Badge (for native authenticated DRM streams) */}
      {!isYouTube && !isVimeo && securityPolicy.signedUrlEnabled && (
        <div className="absolute top-4 right-4 z-20 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 pointer-events-none">
          <Icon name="verified_user" size={12} />
          <span>Signed DRM Stream</span>
        </div>
      )}

      {/* Dynamic Student Anti-Piracy Watermark */}
      {watermark.enabled && watermark.text && (
        <div
          className={`absolute ${watermarkPositionClasses} z-20 pointer-events-none transition-all duration-1000 px-3 py-1 rounded-lg bg-black/25 backdrop-blur-[2px] border border-white/5 text-[10px] font-mono font-semibold text-white/45 tracking-wide select-none`}
        >
          {watermark.text}
        </div>
      )}

      {/* Custom Overlay Controls (for direct video / audio files) */}
      {!isYouTube && !isVimeo && resolvedVideoUrl && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col justify-end px-5 pb-3 pt-4 gap-2 z-20 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
          {/* Scrubber */}
          <div
            onClick={handleSeek}
            className="w-full h-1.5 hover:h-2.5 bg-white/20 hover:bg-white/30 rounded-full relative cursor-pointer transition-all duration-150 group/scrubber"
          >
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/scrubber:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Action Buttons & Time Matrix */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-primary transition-colors focus:outline-none cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <Icon name={isPlaying ? 'pause' : 'play_arrow'} fill size={22} />
              </button>

              <span className="font-mono text-white/90 text-[11px]">
                {formatTime(currentTime)} / {formatTime(durationSeconds)}
              </span>

              <button
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors focus:outline-none cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <Icon name={isMuted ? 'volume_off' : 'volume_up'} size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={cycleSpeed}
                className="hover:text-primary transition-colors text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 cursor-pointer"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:text-primary transition-colors cursor-pointer"
                title="Fullscreen"
              >
                <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
