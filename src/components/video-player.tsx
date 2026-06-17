'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface VideoPlayerProps {
  videoId: string;
  userEmail: string;
  userIp?: string;
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  onDurationLoaded?: (duration: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  replayTrigger?: number;
}

export function VideoPlayer({ 
  videoId, 
  userEmail: _userEmail, 
  userIp: _userIp = '127.0.0.1', 
  courseTitle, 
  moduleTitle,
  lessonTitle,
  onDurationLoaded,
  onProgress,
  onEnded,
  replayTrigger = 0,
}: VideoPlayerProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerJsRef = useRef<any>(null);
 
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Guardar callbacks em refs para evitar re-criação de listeners e fetches repetidos
  const onDurationLoadedRef = useRef(onDurationLoaded);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onDurationLoadedRef.current = onDurationLoaded;
    onProgressRef.current = onProgress;
    onEndedRef.current = onEnded;
  });

  // 1. Função para carregar a URL assinada da API do Next.js
  const fetchVideoToken = useCallback(async () => {
    if (!videoId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/video-token?videoId=${encodeURIComponent(videoId)}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar vídeo.');
      }

      if (isMountedRef.current) {
        setPlayUrl(data.playUrl);
        if (data.duration && onDurationLoadedRef.current) {
          onDurationLoadedRef.current(data.duration);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (isMountedRef.current) {
        console.error(err);
        setError(err.message || 'Falha ao autenticar o vídeo.');
      }
    } finally {
      if (isMountedRef.current && abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [videoId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchVideoToken();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchVideoToken]);

  // Carregar player.js da Bunny CDN para iframes e ouvir eventos
  useEffect(() => {
    if (!playUrl || playUrl.includes('playlist.m3u8')) return;

    let script = document.querySelector('script[src*="playerjs"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const initPlayer = () => {
      if (typeof window !== 'undefined' && (window as any).playerjs && iframeRef.current) {
        try {
          const player = new (window as any).playerjs.Player(iframeRef.current);
          playerJsRef.current = player;
          player.on('ready', () => {
            player.on('timeupdate', (data: any) => {
              if (data && onProgressRef.current) {
                onProgressRef.current(data.seconds, data.duration);
              }
            });
            player.on('ended', () => {
              if (onEndedRef.current) {
                onEndedRef.current();
              }
            });
          });
        } catch (err) {
          console.error('Error initializing playerjs:', err);
        }
      }
    };

    if ((window as any).playerjs) {
      initPlayer();
    } else {
      script.addEventListener('load', initPlayer);
    }

    return () => {
      script?.removeEventListener('load', initPlayer);
    };
  }, [playUrl]);

  // Efeito para reiniciar o vídeo (Rever Aula)
  useEffect(() => {
    if (replayTrigger > 0) {
      if (playUrl?.includes('playlist.m3u8')) {
        if (playerRef.current) {
          playerRef.current.currentTime = 0;
          playerRef.current.play();
        }
      } else {
        if (playerJsRef.current) {
          try {
            playerJsRef.current.setCurrentTime(0);
            playerJsRef.current.play();
          } catch (e) {
            console.error('Error replaying via playerjs:', e);
          }
        }
      }
    }
  }, [replayTrigger, playUrl]);
 
  // Bloquear clique direito sobre o player
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
        <Skeleton className="w-full h-full flex items-center justify-center">
          <div className="text-sm text-slate-400 animate-pulse">Carregando player seguro...</div>
        </Skeleton>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-red-900/30 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="rounded-full bg-red-950/50 p-3 text-red-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h4 className="text-red-400 font-semibold text-lg">Não foi possível carregar a vídeoaula</h4>
          <p className="text-slate-400 text-sm max-w-md">
            {error === 'Assinatura inativa' 
              ? 'Sua assinatura do Forroflix está inativa. Regularize seu plano na área financeira para reestabelecer o acesso.'
              : error}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchVideoToken()} 
          className="border-red-900/40 hover:bg-red-950/30 text-slate-300 gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl group"
      onContextMenu={handleContextMenu}
    >
      {/* Hotmart-Style Hover Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/85 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 pointer-events-none flex flex-col gap-0.5 select-none">
        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{courseTitle}</span>
        <h4 className="text-sm font-extrabold text-white leading-tight drop-shadow-md">
          {moduleTitle ? `${moduleTitle} • ` : ''}{lessonTitle}
        </h4>
      </div>
      {playUrl && (
        playUrl.includes('playlist.m3u8') ? (
          <MediaPlayer
            ref={playerRef}
            src={playUrl}
            title={lessonTitle || 'Vídeoaula'}
            className="w-full h-full object-cover"
            playsInline
            onDurationChange={(d) => {
              if (d && !isNaN(d) && d > 0 && onDurationLoadedRef.current) {
                onDurationLoadedRef.current(Math.round(d));
              }
            }}
            onTimeUpdate={(e: any) => {
              const target = e.target as any;
              if (target && onProgressRef.current) {
                onProgressRef.current(target.currentTime, target.duration);
              }
            }}
            onEnded={() => {
              if (onEndedRef.current) {
                onEndedRef.current();
              }
            }}
          >
            <MediaProvider />
            <DefaultVideoLayout 
              icons={defaultLayoutIcons}
            />
          </MediaPlayer>
        ) : (
          <iframe
            ref={iframeRef}
            id="bunny-stream-embed"
            src={playUrl}
            loading="lazy"
            className="w-full h-full border-none"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )
      )}
    </div>
  );
}
