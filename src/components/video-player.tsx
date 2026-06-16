'use client';

import { useEffect, useState, useRef } from 'react';
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
  lessonTitle?: string;
}

export function VideoPlayer({ videoId, userEmail, userIp = '127.0.0.1', courseTitle, lessonTitle }: VideoPlayerProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado da marca d'água flutuante (posições x, y em %)
  const [watermarkPos, setWatermarkPos] = useState({ top: '20%', left: '20%' });
  const playerRef = useRef<any>(null);

  // 1. Efeito para carregar a URL assinada da API do Next.js
  const fetchVideoToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/video-token?videoId=${videoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar vídeo.');
      }
      
      setPlayUrl(data.playUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao autenticar o vídeo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchVideoToken();
    }
  }, [videoId]);

  // 2. Mover a marca d'água flutuante aleatoriamente a cada 30 segundos
  useEffect(() => {
    const moveWatermark = () => {
      // Gera porcentagens seguras entre 10% e 80% para evitar sair totalmente da tela
      const top = `${Math.floor(Math.random() * 70) + 10}%`;
      const left = `${Math.floor(Math.random() * 70) + 10}%`;
      setWatermarkPos({ top, left });
    };

    const interval = setInterval(moveWatermark, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

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
          onClick={fetchVideoToken} 
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
      {playUrl && (
        playUrl.includes('playlist.m3u8') ? (
          <MediaPlayer
            ref={playerRef}
            src={playUrl}
            title={lessonTitle || 'Vídeoaula'}
            className="w-full h-full object-cover"
            playsInline
          >
            <MediaProvider />
            <DefaultVideoLayout 
              icons={defaultLayoutIcons}
            />
          </MediaPlayer>
        ) : (
          <iframe
            src={playUrl}
            loading="lazy"
            className="w-full h-full border-none"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )
      )}

      {/* Marca D'água Dinâmica Anti-Pirataria */}
      <div
        className="absolute pointer-events-none select-none text-slate-500/25 font-mono text-[10px] md:text-xs z-50 transition-all duration-1000 ease-in-out whitespace-nowrap bg-black/10 px-2 py-0.5 rounded shadow-sm"
        style={{
          top: watermarkPos.top,
          left: watermarkPos.left,
          textShadow: '1px 1px 0px rgba(0,0,0,0.8)'
        }}
      >
        <span>{userEmail}</span>
        <span className="mx-1.5">|</span>
        <span>IP: {userIp}</span>
        {courseTitle && (
          <>
            <span className="mx-1.5">|</span>
            <span className="hidden sm:inline">Exclusivo Forroflix</span>
          </>
        )}
      </div>
    </div>
  );
}
