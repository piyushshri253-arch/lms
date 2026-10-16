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
  autoPlay?: boolean;
  onLessonComplete?: () => void;
  onVideoEnded?: () => void;
  onProgressUpdate?: (watchedSeconds: number, percent: number) => void;
}

const getBaseMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  return url.split('?')[0].split('#')[0].trim();
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  title,
  videoUrl,
  lessonId,
  thumbnail,
  duration = '12:00',
  isFree = false,
  autoPlay = false,
  onLessonComplete,
  onVideoEnded,
  onProgressUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayPendingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(720);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(videoUrl || null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

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

  // Helper to check whether browser is in native fullscreen mode
  const isBrowserFullscreen = (): boolean => {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  };

  // Toggle true native browser fullscreen with smooth CSS viewport fallback
  const toggleFullscreen = async (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    try {
      const isCurrentlyFs = isBrowserFullscreen() || isFullscreen;

      if (!isCurrentlyFs) {
        const elem = containerRef.current;
        if (elem) {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          } else if ((elem as any).mozRequestFullScreen) {
            await (elem as any).mozRequestFullScreen();
          } else if ((elem as any).msRequestFullscreen) {
            await (elem as any).msRequestFullscreen();
          } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
            (videoRef.current as any).webkitEnterFullscreen();
          }
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      // Fallback: If native fullscreen is blocked by security context/iframe, toggle CSS fullscreen
      setIsFullscreen((prev) => !prev);
    }
  };

  // Listen to browser fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = isBrowserFullscreen();
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Global keyboard shortcuts (F for fullscreen, Space / K for play/pause, M for mute)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) return;
      if (activeEl && activeEl.isContentEditable) return;

      if (e.key === 'f' || e.key === 'F') {
        if (containerRef.current) {
          e.preventDefault();
          toggleFullscreen();
        }
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        if (
          containerRef.current &&
          (containerRef.current.contains(activeEl) || activeEl === containerRef.current || !activeEl || activeEl === document.body)
        ) {
          e.preventDefault();
          togglePlay();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (
          containerRef.current &&
          (containerRef.current.contains(activeEl) || activeEl === containerRef.current)
        ) {
          e.preventDefault();
          toggleMute();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFullscreen, isMuted, playbackRate]);

  // Rotate anti-piracy watermark position every 18 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPosIndex((prev) => (prev + 1) % 4);
    }, 18000);
    return () => clearInterval(interval);
  }, []);

  // Reset player error and playback state when switching lectures
  useEffect(() => {
    setVideoError(null);
    setIsBuffering(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setResolvedVideoUrl(videoUrl || null);
  }, [lessonId, videoUrl]);

  // Fetch authorized & signed stream URL if lessonId is provided
  useEffect(() => {
    let isMounted = true;
    setVideoError(null);
    const checkStreamAuth = async () => {
      if (!lessonId || lessonId === 'placeholder' || lessonId.startsWith('placeholder') || lessonId.length < 5) {
        setResolvedVideoUrl(videoUrl || null);
        setStreamError(null);
        return;
      }

      try {
        const query = isFree ? '?preview=true&review=true' : '';
        const res = await fetch(`/api/lessons/${lessonId}/stream${query}`);
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.allowed) {
            if (data.videoUrl) {
              setResolvedVideoUrl((current) => {
                if (!current) return data.videoUrl;
                // If current points to the exact same underlying file, DO NOT reset src attribute
                // to avoid canceling active playback or destroying HTML5 video buffer
                if (getBaseMediaUrl(current) === getBaseMediaUrl(data.videoUrl)) {
                  return current;
                }
                return data.videoUrl;
              });
            }
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
            // In free preview or reviewer mode, never display enrollment paywall lock if videoUrl is available
            if (videoUrl || isFree) {
              setResolvedVideoUrl(videoUrl || null);
              setStreamError(null);
            } else {
              setStreamError(data.error || 'Enrollment required to stream this masterclass video.');
            }
          }
        }
      } catch {
        if (isMounted) {
          setResolvedVideoUrl(videoUrl || null);
          setStreamError(null);
        }
      }
    };

    checkStreamAuth();
    return () => {
      isMounted = false;
    };
  }, [lessonId, videoUrl, isFree]);

  // Handle Auto-Play when switched to from another lesson or enabled
  useEffect(() => {
    if (autoPlay && resolvedVideoUrl) {
      let isMounted = true;
      const v = videoRef.current;
      if (!v) return;

      const triggerAutoPlay = async () => {
        try {
          if (!isMounted) return;
          isPlayPendingRef.current = true;
          await v.play();
          if (isMounted) setIsPlaying(true);
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.log('Autoplay deferred or blocked by browser policy:', err?.message);
          }
        } finally {
          isPlayPendingRef.current = false;
        }
      };

      const timer = setTimeout(triggerAutoPlay, 150);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [resolvedVideoUrl, autoPlay, lessonId]);

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

  // Safe and idempotent play/pause toggle with in-flight Promise protection
  const togglePlay = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const v = videoRef.current;
    if (!v) {
      setIsPlaying((prev) => !prev);
      return;
    }

    // Guard against race condition: don't interrupt a pending play() promise with pause()
    if (isPlayPendingRef.current) {
      return;
    }

    if (v.paused || v.ended) {
      try {
        isPlayPendingRef.current = true;
        setIsBuffering(true);
        await v.play();
        setIsPlaying(true);
        setIsBuffering(false);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Playback request error:', err);
        }
      } finally {
        isPlayPendingRef.current = false;
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = Math.floor(pos * durationSeconds);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const toggleMute = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const cycleSpeed = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
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

  // Reset states when video source changes
  useEffect(() => {
    setVideoError(null);
    setIsBuffering(false);
  }, [resolvedVideoUrl]);

  // Robust video ID extractors for diverse hosting providers
  const extractYouTubeId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([\w-]{11})/i);
    if (embedMatch) return embedMatch[1];
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
    return match ? match[1] : null;
  };

  const extractVimeoId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    const match = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
    return match ? match[1] : null;
  };

  const extractGoogleDriveId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed.includes('drive.google.com')) return null;
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  };

  const youtubeId = extractYouTubeId(resolvedVideoUrl);
  const vimeoId = !youtubeId ? extractVimeoId(resolvedVideoUrl) : null;
  const googleDriveId = !youtubeId && !vimeoId ? extractGoogleDriveId(resolvedVideoUrl) : null;
  const isEmbed = Boolean(youtubeId || vimeoId || googleDriveId);

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
      ref={containerRef}
      tabIndex={0}
      onContextMenu={(e) => {
        if (securityPolicy.preventRightClick) {
          e.preventDefault();
        }
      }}
      className={`w-full bg-black relative flex items-center justify-center group select-none transition-all outline-none ${
        isFullscreen
          ? 'fixed inset-0 z-[999999] w-screen h-screen max-w-none max-h-none rounded-none aspect-auto m-0 p-0 overflow-hidden'
          : 'h-full aspect-video max-h-[78vh] rounded-2xl overflow-hidden'
      }`}
    >
      {/* 1. YouTube Stream Embed */}
      {youtubeId ? (
        <div className="w-full h-full aspect-video relative flex items-center justify-center bg-black overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&autoplay=0`}
            title={title}
            className="w-full h-full aspect-video border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : vimeoId ? (
        /* 2. Vimeo Stream Embed */
        <div className="w-full h-full aspect-video relative flex items-center justify-center bg-black overflow-hidden">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
            title={title}
            className="w-full h-full aspect-video border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : googleDriveId ? (
        /* 3. Google Drive Video Preview Embed */
        <div className="w-full h-full aspect-video relative flex items-center justify-center bg-black overflow-hidden">
          <iframe
            src={`https://drive.google.com/file/d/${googleDriveId}/preview`}
            title={title}
            className="w-full h-full aspect-video border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      ) : resolvedVideoUrl ? (
        /* 4. Direct HTML5 MP4 / WebM / Stream */
        <div className={`w-full h-full relative flex items-center justify-center bg-black ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none' : ''}`}>
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            poster={thumbnail}
            controlsList={securityPolicy.allowVideoDownload ? undefined : 'nodownload'}
            disablePictureInPicture={securityPolicy.disablePictureInPicture}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setVideoError(null);
            }}
            onCanPlay={() => {
              setIsBuffering(false);
              setVideoError(null);
            }}
            onTimeUpdate={handleTimeUpdate}
            onError={() => {
              const mediaErr = videoRef.current?.error;
              // Ignore MEDIA_ERR_ABORTED (code 1)
              if (mediaErr?.code === 1) return;

              const curBase = getBaseMediaUrl(resolvedVideoUrl);
              const origBase = getBaseMediaUrl(videoUrl);
              if (videoUrl && curBase !== origBase) {
                setResolvedVideoUrl(videoUrl);
              } else {
                setVideoError('Video format or stream could not be loaded. Please ensure video source is valid.');
              }
            }}
            autoPlay={autoPlay}
            onEnded={() => {
              setIsPlaying(false);
              onLessonComplete?.();
              onVideoEnded?.();
            }}
            className={`w-full object-contain cursor-pointer transition-all ${
              isFullscreen
                ? 'h-full max-h-screen aspect-auto'
                : 'h-full aspect-video max-h-[78vh]'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay(e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              toggleFullscreen(e);
            }}
            playsInline
            preload="auto"
          />

          {/* Central Play Button Overlay when paused */}
          {!videoError && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-200 z-20 pointer-events-none ${
                isPlaying ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {!isBuffering && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    togglePlay(e);
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer pointer-events-auto"
                  aria-label="Play video"
                >
                  <Icon name="play_arrow" size={38} fill />
                </button>
              )}
            </div>
          )}

          {/* Buffering Spinner */}
          {isBuffering && !videoError && (
            <div className="absolute inset-0 m-auto w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin pointer-events-none z-20" />
          )}

          {/* Error Message and Retry Action */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-30 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Icon name="error_outline" size={28} />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-sm font-bold text-white">Video Playback Issue</p>
                <p className="text-xs text-slate-400">{videoError}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVideoError(null);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Retry Playback
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 5. Placeholder when no video attached yet */
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
      {!isEmbed && (
        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white/90 border border-white/10 flex items-center gap-1.5 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>1080p HD Stream</span>
        </div>
      )}

      {/* Signed Private Stream Security Badge */}
      {!isEmbed && securityPolicy.signedUrlEnabled && (
        <div className="absolute top-4 right-4 z-20 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 pointer-events-none">
          <Icon name="verified_user" size={12} />
          <span>Signed DRM Stream</span>
        </div>
      )}

      {/* Dynamic Anti-Piracy Watermark */}
      {watermark.enabled && watermark.text && (
        <div
          className={`absolute ${watermarkPositionClasses} z-20 pointer-events-none transition-all duration-1000 px-3 py-1 rounded-lg bg-black/25 backdrop-blur-[2px] border border-white/5 text-[10px] font-mono font-semibold text-white/45 tracking-wide select-none`}
        >
          {watermark.text}
        </div>
      )}

      {/* Custom Overlay Controls (for direct video / audio files) */}
      {!isEmbed && resolvedVideoUrl && !resolvedVideoUrl.startsWith('blob:') && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col justify-end px-5 pb-3 pt-4 gap-2 z-20 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
        >
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
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(e);
                }}
                className="text-white hover:text-primary transition-colors focus:outline-none cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                <Icon name={isPlaying ? 'pause' : 'play_arrow'} fill size={22} />
              </button>

              <span className="font-mono text-white/90 text-[11px]">
                {formatTime(currentTime)} / {formatTime(durationSeconds)}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute(e);
                }}
                className="text-white hover:text-primary transition-colors focus:outline-none cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <Icon name={isMuted ? 'volume_off' : 'volume_up'} size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSpeed(e);
                }}
                className="hover:text-primary transition-colors text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 cursor-pointer"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen(e);
                }}
                className="text-white hover:text-primary transition-colors cursor-pointer p-1 rounded hover:bg-white/10"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Exit Fullscreen Button */}
      {isFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen(e);
          }}
          className="absolute top-5 right-5 z-40 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 text-white/90 hover:text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-2xl flex items-center gap-1.5 backdrop-blur-md"
          title="Exit Fullscreen (Esc or F)"
        >
          <Icon name="fullscreen_exit" size={18} />
          <span className="text-[11px] font-medium font-mono">Exit (Esc)</span>
        </button>
      )}
    </div>
  );
};
