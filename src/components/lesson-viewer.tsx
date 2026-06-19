'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/video-player').then((mod) => mod.VideoPlayer),
  { ssr: false }
);
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Music,
  Play,
  X,
  Star,
  FolderOpen,
  ChevronDown,
  Lock,
  Globe,
  Clock,
  Trash2,
} from 'lucide-react';
import { FolderSelectorModal } from '@/components/folder-selector-modal';

interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
  description?: string;
  submodule?: string | null;
}

interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface LessonViewerProps {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  courseSlug: string;
  activeLesson: {
    id: string;
    title: string;
    description: string;
    video_id: string;
    duration_seconds: number;
  };
  modules: Module[];
  completedLessonIds: string[];
  setCompletedIds: React.Dispatch<React.SetStateAction<string[]>>;
  favoriteLessonIds: string[];
  setFavoriteIds: React.Dispatch<React.SetStateAction<string[]>>;
  userEmail: string;
  isAdmin: boolean;
  isSubscribed: boolean;
  onBackToTrail: () => void;
  onSelectLesson: (lessonId: string) => void;
  libraryId: string;
}

function formatSeconds(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const parts = [];
  if (hours > 0) {
    parts.push(hours.toString().padStart(2, '0'));
  }
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(seconds.toString().padStart(2, '0'));
  return parts.join(':');
}

function getDisplayTitle(title: string, submodule?: string | null): string {
  if (!submodule) return title;
  const parts = title.split(/\s*-\s*/);
  const submoduleIndex = parts.findIndex(p => p.toLowerCase() === submodule.toLowerCase());
  if (submoduleIndex !== -1) {
    const remaining = parts.slice(submoduleIndex + 1);
    if (remaining.length > 0) {
      return remaining.join(' - ');
    }
  }
  return title;
}

export function LessonViewer({
  courseId,
  courseTitle,
  courseDescription,
  courseSlug,
  activeLesson,
  modules,
  completedLessonIds: completedIds,
  setCompletedIds,
  favoriteLessonIds: favoriteIds,
  setFavoriteIds,
  userEmail,
  isAdmin,
  isSubscribed,
  onBackToTrail,
  onSelectLesson,
  libraryId,
}: LessonViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [markingProgress, setMarkingProgress] = useState(false);
  const [currentActiveLesson, setCurrentActiveLesson] = useState(activeLesson);
  const [localModules, setLocalModules] = useState(modules);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [selectedLessonIdForFolder, setSelectedLessonIdForFolder] = useState<string | null>(null);
  const [expandedSubmodules, setExpandedSubmodules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para as anotações da aula
  const [notes, setNotes] = useState<any[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [noteIsPublic, setNoteIsPublic] = useState(true);
  const [seekTrigger, setSeekTrigger] = useState<{ seconds: number; ts: number } | null>(null);

  // Auto-expand active lesson's submodule
  useEffect(() => {
    if (currentActiveLesson) {
      const activeMod = localModules.find((m) =>
        m.lessons.some((l) => l.id === currentActiveLesson.id)
      );
      if (activeMod) {
        const activeLes = activeMod.lessons.find((l) => l.id === currentActiveLesson.id);
        if (activeLes && activeLes.submodule) {
          const key = `${activeMod.id}-${activeLes.submodule}`;
          setExpandedSubmodules((prev) => {
            if (prev[key]) return prev;
            return {
              ...prev,
              [key]: true,
            };
          });
        }
      }
    }
  }, [currentActiveLesson, localModules]);

  // Encontrar o ID da aula anterior e da próxima (definido antes de hooks para evitar TDZ)
  const allLessons = localModules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentActiveLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  // Autoplay countdown and progress state
  const [videoProgress, setVideoProgress] = useState({ currentTime: 0, duration: 0 });
  const [replayTrigger, setReplayTrigger] = useState(0);
  const [autoplayDisabled, setAutoplayDisabled] = useState(false);
  const [autoCompletedLessons, setAutoCompletedLessons] = useState<string[]>([]);
 
  useEffect(() => {
    setCurrentActiveLesson(activeLesson);
    setAutoplayDisabled(false);
    setVideoProgress({ currentTime: 0, duration: 0 });
  }, [activeLesson]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Carregar as anotações do banco de dados quando a lição ativa muda
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/notes?lessonId=${currentActiveLesson.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      } catch (err) {
        console.error('Erro ao buscar notas da aula:', err);
      }
    };
    fetchNotes();
  }, [currentActiveLesson.id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentActiveLesson.id,
          watchedSeconds: videoProgress.currentTime,
          content: noteContent.trim(),
          isPublic: noteIsPublic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.note) {
          setNotes((prev) => {
            const updated = [...prev, data.note];
            return updated.sort((a, b) => a.watched_seconds - b.watched_seconds);
          });
          setNoteContent('');
          showToast('Anotação adicionada com sucesso!', 'success');
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao criar anotação.', 'warning');
      }
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
      showToast('Falha de conexão ao salvar anotação.', 'warning');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Deseja realmente excluir esta anotação?')) return;

    try {
      const res = await fetch(`/api/notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast('Anotação removida.', 'info');
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao excluir anotação.', 'warning');
      }
    } catch (err) {
      console.error('Erro ao excluir anotação:', err);
      showToast('Falha de conexão ao excluir anotação.', 'warning');
    }
  };
 
  const toggleActiveFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isCurrentlyFav = favoriteIds.includes(currentActiveLesson.id);
    
    if (isCurrentlyFav) {
      // Remover dos favoritos imediatamente com 1 clique
      setFavoriteIds((prev) => prev.filter((id) => id !== currentActiveLesson.id));
      showToast('Removido das aulas salvas', 'warning');
      
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: currentActiveLesson.id,
            favorited: false,
          }),
        });

        if (!res.ok) {
          setFavoriteIds((prev) => [...prev, currentActiveLesson.id]);
        }
      } catch (err) {
        console.error('Erro ao remover favorito:', err);
        setFavoriteIds((prev) => [...prev, currentActiveLesson.id]);
      }
    } else {
      // Abrir o modal para escolher a pasta
      setSelectedLessonIdForFolder(currentActiveLesson.id);
      setFolderModalOpen(true);
    }
  };

  // Monitorar tempo e progresso do vídeo
  const handleVideoProgress = async (currentTime: number, duration: number) => {
    if (!duration || isNaN(duration) || duration <= 0) return;
    setVideoProgress({ currentTime, duration });
    
    // 1. Auto-Concluir a aula com 90% assistidos
    const percentageWatched = (currentTime / duration) * 100;
    const isAlreadyCompleted = completedIds.includes(currentActiveLesson.id);
    const isAlreadyAutoCompleted = autoCompletedLessons.includes(currentActiveLesson.id);

    if (percentageWatched >= 90 && !isAlreadyCompleted && !isAlreadyAutoCompleted) {
      setAutoCompletedLessons((prev) => [...prev, currentActiveLesson.id]);
      setCompletedIds((prev) => [...prev, currentActiveLesson.id]);
      showToast('Aula concluída automaticamente (90% assistida)! 🎉', 'success');
      
      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: currentActiveLesson.id,
            completed: true,
          }),
        });
      } catch (err) {
        console.error('Erro ao marcar auto-conclusão:', err);
      }
    }
  };

  const handleReverAula = () => {
    setAutoplayDisabled(true);
    setReplayTrigger((prev) => prev + 1);
  };

  const handleVideoEnded = () => {
    if (nextLesson && !autoplayDisabled) {
      handleSelectLesson(nextLesson);
    }
  };

  const isActiveFavorited = favoriteIds.includes(currentActiveLesson.id);

  useEffect(() => {
    setLocalModules(modules);
  }, [modules]);

  const isCompleted = completedIds.includes(currentActiveLesson.id);

  // Formatar duração para MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Alternar conclusão de qualquer aula via checkbox lateral
  const toggleLessonProgress = async (e: React.MouseEvent, lessonId: string, currentCompleted: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const newCompletedState = !currentCompleted;
      
      if (newCompletedState) {
        showToast('Aula concluída! 🎉', 'success');
      } else {
        showToast('Progresso removido.', 'info');
      }

      // Atualização otimista
      if (newCompletedState) {
        setCompletedIds((prev) => [...prev, lessonId]);
      } else {
        setCompletedIds((prev) => prev.filter((id) => id !== lessonId));
      }

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          completed: newCompletedState,
        }),
      });

      if (!res.ok) {
        // Reverter em caso de falha
        if (newCompletedState) {
          setCompletedIds((prev) => prev.filter((id) => id !== lessonId));
        } else {
          setCompletedIds((prev) => [...prev, lessonId]);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar progresso da aula:', err);
      // Reverter em caso de falha
      if (!currentCompleted) {
        setCompletedIds((prev) => prev.filter((id) => id !== lessonId));
      } else {
        setCompletedIds((prev) => [...prev, lessonId]);
      }
    }
  };

  // Selecionar aula client-side (SPA)
  const handleSelectLesson = (lesson: any) => {
    onSelectLesson(lesson.id);
  };

  // Alternar conclusão de aula ativa
  const toggleProgress = async () => {
    setMarkingProgress(true);
    try {
      const newCompletedState = !isCompleted;
      
      if (newCompletedState) {
        showToast('Aula concluída! 🎉', 'success');
      } else {
        showToast('Progresso removido.', 'info');
      }

      if (newCompletedState) {
        setCompletedIds((prev) => [...prev, currentActiveLesson.id]);
      } else {
        setCompletedIds((prev) => prev.filter((id) => id !== currentActiveLesson.id));
      }

      // Chamar API local para atualizar no Cloudflare D1
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: currentActiveLesson.id,
          completed: newCompletedState,
        }),
      });

      if (!res.ok) {
        if (newCompletedState) {
          setCompletedIds((prev) => prev.filter((id) => id !== currentActiveLesson.id));
        } else {
          setCompletedIds((prev) => [...prev, currentActiveLesson.id]);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    } finally {
      setMarkingProgress(false);
    }
  };

  // Aulas mapeadas e posicionamento para uso nos componentes
  const timeRemaining = videoProgress.duration > 0 ? videoProgress.duration - videoProgress.currentTime : 999;
  // O tempo limite para o countdown é 20 segundos ou 10% da duração do vídeo (o que for menor)
  const threshold = videoProgress.duration > 0 ? Math.min(20, videoProgress.duration * 0.1) : 20;
  const isTimeForCountdown = videoProgress.duration > 0 && timeRemaining <= threshold && timeRemaining > 0 && nextLesson && !autoplayDisabled;
  const countdownDisplay = Math.ceil(timeRemaining);

  const renderLessonLink = (les: Lesson) => {
    const isActive = les.id === currentActiveLesson.id;
    const isLesCompleted = completedIds.includes(les.id);
    const isLesFavorited = favoriteIds.includes(les.id);
    const displayTitle = getDisplayTitle(les.title, les.submodule);

    return (
      <Link
        href={`/courses/${courseSlug}/${les.id}`}
        key={les.id}
        onClick={(e) => {
          e.preventDefault();
          handleSelectLesson(les);
        }}
        style={{ textDecoration: 'none' }}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer !no-underline no-underline ${
          isActive
            ? 'bg-red-600/10 text-red-500 border border-red-600/20 font-bold'
            : isLesCompleted
              ? 'bg-green-500/10 dark:bg-green-950/20 text-green-700 dark:text-green-300 hover:bg-green-500/20 dark:hover:bg-green-950/30 border border-green-500/20 font-medium'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
        }`}
      >
        {/* Miniatura do vídeo à esquerda */}
        <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
          {libraryId && les.video_id ? (
            <img
              src={`https://vz-${libraryId}.b-cdn.net/${les.video_id}/thumbnail.jpg`}
              alt=""
              className="w-full h-full object-cover relative z-10"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-card to-secondary text-muted-foreground">
            <Play className="w-4 h-4 fill-current opacity-40" />
          </div>
          <div className="absolute bottom-1 right-1 bg-black/85 px-1 rounded text-[9px] font-mono font-medium text-white z-20">
            {formatDuration(les.duration_seconds)}
          </div>
        </div>

        {/* Título no centro */}
        <span 
          style={{ textDecoration: 'none' }}
          className="line-clamp-2 flex-grow leading-snug !no-underline no-underline"
        >
          {displayTitle}
        </span>

        {/* Botões Favorito e Conclusão no canto direito */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Favorito */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              if (isLesFavorited) {
                setFavoriteIds((prev) => prev.filter((id) => id !== les.id));
                showToast('Removido das aulas salvas', 'warning');
                try {
                  await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      lessonId: les.id,
                      favorited: false,
                    }),
                  });
                } catch (err) {
                  console.error(err);
                  setFavoriteIds((prev) => [...prev, les.id]);
                }
              } else {
                setSelectedLessonIdForFolder(les.id);
                setFolderModalOpen(true);
              }
            }}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0"
            title={isLesFavorited ? 'Remover dos Favoritos' : 'Favoritar Aula'}
          >
            <Star className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${
              isLesFavorited 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-muted-foreground hover:text-foreground'
            }`} />
          </button>

          {/* Checkbox redondo interativo */}
          <button
            onClick={(e) => toggleLessonProgress(e, les.id, isLesCompleted)}
            className="p-1 hover:bg-secondary rounded-lg transition-colors shrink-0"
          >
            {isLesCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10 shrink-0 hover:scale-110 transition-transform" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-border hover:border-primary transition-colors shrink-0" />
            )}
          </button>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col animate-page-enter">
      {/* Top Bar / Header */}
      <header className="border-b border-border bg-sidebar/90 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/courses/${courseSlug}`} 
              onClick={(e) => {
                e.preventDefault();
                onBackToTrail();
              }}
              className="flex items-center gap-2 group text-red-500 hover:text-red-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold hidden md:inline">Voltar para o Curso</span>
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-foreground line-clamp-1">
                {courseTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
              Aluno: {userEmail}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-border hover:bg-secondary text-foreground gap-2"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">
                {sidebarOpen ? 'Esconder Aulas' : 'Mostrar Aulas'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-grow flex relative overflow-hidden">
        {/* Left Side: Video Player & Info */}
        <main className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-full">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Player Container */}
            <div className="relative">
              <VideoPlayer
                videoId={currentActiveLesson.video_id}
                userEmail={userEmail}
                courseTitle={courseTitle}
                moduleTitle={
                  (() => {
                    const activeModule = localModules.find(m => m.lessons.some(l => l.id === currentActiveLesson.id));
                    return activeModule 
                      ? `${localModules.indexOf(activeModule) + 1}. ${activeModule.title}`
                      : '';
                  })()
                }
                lessonTitle={currentActiveLesson.title}
                onDurationLoaded={(dur) => {
                  setLocalModules((prev) =>
                    prev.map((m) => ({
                      ...m,
                      lessons: m.lessons.map((l) => {
                        if (l.id === currentActiveLesson.id && l.duration_seconds === 0) {
                          return { ...l, duration_seconds: dur };
                        }
                        return l;
                      }),
                    }))
                  );
                  if (currentActiveLesson.duration_seconds === 0) {
                    setCurrentActiveLesson((prev) => ({ ...prev, duration_seconds: dur }));
                  }
                }}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
                replayTrigger={replayTrigger}
                seekTrigger={seekTrigger}
              />

              {/* Autoplay Next Lesson Overlay */}
              {isTimeForCountdown && nextLesson && (
                <div className="absolute bottom-16 right-6 z-40 bg-card/95 backdrop-blur border border-border rounded-2xl p-4 shadow-2xl max-w-xs animate-page-enter flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Próxima Aula em {countdownDisplay}s</span>
                    <h5 className="text-xs font-extrabold text-foreground line-clamp-1">{nextLesson.title}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        handleSelectLesson(nextLesson);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      Assistir agora
                    </button>
                    <button 
                      onClick={handleReverAula}
                      className="border border-border hover:bg-secondary text-muted-foreground hover:text-foreground font-bold text-[10px] py-1.5 px-3 rounded-xl cursor-pointer"
                    >
                      Rever Aula
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Info Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                  {currentActiveLesson.title}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={toggleActiveFavorite}
                  variant="outline"
                  title={isActiveFavorited ? 'Remover dos Favoritos' : 'Salvar para Revisar'}
                  className={`rounded-xl font-bold py-5 px-4 transition-all border border-border hover:bg-secondary ${
                    isActiveFavorited
                      ? 'text-yellow-500 bg-yellow-500/5 border-yellow-500/20'
                      : 'text-muted-foreground border-border'
                  }`}
                >
                  <Star className={`w-5 h-5 ${isActiveFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  <span className="ml-2 hidden sm:inline">{isActiveFavorited ? 'Favoritada' : 'Favoritar'}</span>
                </Button>

                <Button
                  onClick={toggleProgress}
                  disabled={markingProgress}
                  variant={isCompleted ? 'secondary' : 'default'}
                  className={`rounded-xl font-bold py-5 px-6 transition-all ${
                    isCompleted
                      ? 'bg-green-950/40 hover:bg-green-900/30 text-green-400 border border-green-500/20'
                      : 'bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 mr-2 ${isCompleted ? 'text-green-400' : ''}`} />
                  {isCompleted ? 'Aula Concluída' : 'Marcar como Assistida'}
                </Button>
              </div>
            </div>

            {/* Navigation Buttons (Prev/Next) */}
            <div className="flex justify-between items-center bg-card p-4 rounded-2xl border border-border">
              {prevLesson ? (
                <Link 
                  href={`/courses/${courseSlug}/${prevLesson.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectLesson(prevLesson);
                  }}
                >
                  <Button variant="ghost" className="text-foreground hover:bg-secondary gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Aula Anterior</span>
                  </Button>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link 
                  href={`/courses/${courseSlug}/${nextLesson.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectLesson(nextLesson);
                  }}
                >
                  <Button className="bg-secondary hover:bg-secondary/80 text-primary gap-2 border border-border">
                    <span className="hidden sm:inline">Próxima Aula</span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* Seção de Anotações do Vídeo */}
            <div className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-550" />
                  <h3 className="font-extrabold text-base text-foreground tracking-tight">Anotações da Aula</h3>
                </div>
                <span className="text-[10px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full font-bold">
                  {notes.length} {notes.length === 1 ? 'anotação' : 'anotações'}
                </span>
              </div>

              {/* Formulário para Nova Anotação */}
              <form onSubmit={handleAddNote} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Escreva sua anotação ou observação para este momento do vídeo..."
                    className="w-full min-h-[90px] bg-background border border-border rounded-xl p-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-650 focus:border-red-650 transition-all placeholder:text-muted-foreground/60 resize-y"
                    maxLength={1000}
                  />
                  {/* Indicador do caractere */}
                  <span className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/50">
                    {noteContent.length}/1000
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Controle de Privacidade */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="radio"
                        name="note-privacy"
                        checked={noteIsPublic}
                        onChange={() => setNoteIsPublic(true)}
                        className="w-3.5 h-3.5 rounded-full border border-border text-red-600 focus:ring-red-500"
                      />
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Pública (visível para todos)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="radio"
                        name="note-privacy"
                        checked={!noteIsPublic}
                        onChange={() => setNoteIsPublic(false)}
                        className="w-3.5 h-3.5 rounded-full border border-border text-red-600 focus:ring-red-500"
                      />
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Privada (apenas para mim)</span>
                    </label>
                  </div>

                  {/* Botão de Envio com tempo atual */}
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 h-9 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Anotar em {formatSeconds(videoProgress.currentTime)}
                  </Button>
                </div>
              </form>

              {/* Lista de Anotações */}
              {notes.length > 0 ? (
                <div className="space-y-3.5 mt-6 pt-4 border-t border-border/60 max-h-[400px] overflow-y-auto pr-1">
                  {notes.map((note) => {
                    const isOwner = note.email === userEmail;
                    const canDelete = isOwner || isAdmin;
                    
                    return (
                      <div
                        key={note.id}
                        className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border/40 hover:border-border/80 transition-colors group relative"
                      >
                        {/* Timestamp Button */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSeekTrigger({ seconds: note.watched_seconds, ts: Date.now() });
                            }}
                            className="bg-red-650/10 hover:bg-red-600 hover:text-white text-red-500 text-[10px] font-black py-1 px-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
                            title="Pular para este momento no vídeo"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {formatSeconds(note.watched_seconds)}
                          </button>
                        </div>

                        {/* Content & Metadata */}
                        <div className="flex-grow space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {note.full_name || note.username || 'Aluno'}
                            </span>
                            {note.role === 'admin' && (
                              <span className="bg-red-600/10 text-red-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider">
                                Admin
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(note.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {note.is_public === 0 && (
                              <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                                <Lock className="w-2.5 h-2.5" />
                                Privada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
                            {note.content}
                          </p>
                        </div>

                        {/* Delete Button */}
                        {canDelete && (
                          <div className="shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-muted-foreground hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Excluir anotação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border text-muted-foreground text-xs font-medium">
                  Nenhuma anotação nesta aula ainda. Seja o primeiro a fazer uma observação!
                </div>
              )}
            </div>

            {/* Course Description */}
            <div className="space-y-3 bg-card/40 p-6 rounded-2xl border border-border/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-500" />
                Sobre este Curso
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {courseDescription || 'Este curso faz parte do catálogo premium do Forroflix. Aproveite as aulas para aprender na prática os passos e movimentações.'}
              </p>
            </div>
          </div>
        </main>
        {/* Right Side: Collapsible Sidebar Menu */}
        <aside
          className={`shrink-0 border-l border-border bg-sidebar/95 backdrop-blur w-80 md:w-96 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto absolute md:relative right-0 top-0 bottom-0 z-30 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden'
          }`}
        >
          <div className="p-4 border-b border-border flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Music className="w-4 h-4 text-red-600 animate-pulse" />
                Módulos e Aulas
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome da aula ou submódulo..."
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-red-650 transition-colors placeholder:text-muted-foreground/60 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer p-0.5 rounded hover:bg-secondary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {searchQuery.trim() !== '' ? (
              (() => {
                const query = searchQuery.toLowerCase().trim();
                const matchingResults: { module: Module; lesson: Lesson }[] = [];
                localModules.forEach((mod) => {
                  mod.lessons.forEach((les) => {
                    const titleMatch = les.title.toLowerCase().includes(query);
                    const submoduleMatch = les.submodule ? les.submodule.toLowerCase().includes(query) : false;
                    if (titleMatch || submoduleMatch) {
                      matchingResults.push({ module: mod, lesson: les });
                    }
                  });
                });

                const groupedResults: {
                  module: Module;
                  submoduleGroups: { name: string; lessons: Lesson[] }[];
                  flatLessons: Lesson[];
                }[] = [];

                matchingResults.forEach(({ module, lesson }) => {
                  let modGroup = groupedResults.find((x) => x.module.id === module.id);
                  if (!modGroup) {
                    modGroup = { module, submoduleGroups: [], flatLessons: [] };
                    groupedResults.push(modGroup);
                  }

                  if (lesson.submodule) {
                    let subGroup = modGroup.submoduleGroups.find((x) => x.name === lesson.submodule);
                    if (!subGroup) {
                      subGroup = { name: lesson.submodule, lessons: [] };
                      modGroup.submoduleGroups.push(subGroup);
                    }
                    subGroup.lessons.push(lesson);
                  } else {
                    modGroup.flatLessons.push(lesson);
                  }
                });

                if (groupedResults.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                      Nenhuma aula encontrada para "{searchQuery}"
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {groupedResults.map(({ module, submoduleGroups, flatLessons }) => (
                      <div key={module.id} className="space-y-2 border border-border/40 rounded-2xl p-3 bg-card/25 text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Módulo: {module.title}
                        </div>

                        <div className="space-y-1.5">
                          {/* Flat matching lessons */}
                          {flatLessons.map(renderLessonLink)}

                          {/* Submodule groups */}
                          {submoduleGroups.map((sg) => (
                            <div key={sg.name} className="ml-6 pl-3.5 border-l-2 border-red-600/20 space-y-1 text-left">
                              <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-foreground bg-secondary/35 rounded-lg w-fit">
                                <FolderOpen className="w-3 h-3 text-red-500 shrink-0" />
                                <span>{sg.name}</span>
                              </div>
                              <div className="space-y-1 pt-0.5">
                                {sg.lessons.map(renderLessonLink)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <Accordion multiple defaultValue={localModules.map((m) => m.id)} className="space-y-3">
                {localModules.map((mod, modIdx) => (
                  <AccordionItem
                    value={mod.id}
                    key={mod.id}
                    className="border border-border rounded-xl overflow-hidden bg-card/40"
                  >
                    <AccordionTrigger className="hover:no-underline px-4 py-3 bg-card/85 text-foreground">
                      <div className="flex items-center gap-2.5 text-left text-sm font-bold leading-tight">
                        <span className="w-6 h-6 rounded-full bg-secondary border border-border text-muted-foreground flex items-center justify-center text-xs font-mono shrink-0 select-none">
                          {modIdx + 1}
                        </span>
                        <span>{mod.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-1 space-y-1.5 text-left">
                      {(() => {
                        const items: (
                          | { type: 'lesson'; lesson: Lesson }
                          | { type: 'submodule'; name: string; lessons: Lesson[] }
                        )[] = [];

                        mod.lessons.forEach((les) => {
                          if (les.submodule) {
                            const existing = items.find(
                              (item) => item.type === 'submodule' && item.name === les.submodule
                            );
                            if (existing && existing.type === 'submodule') {
                              existing.lessons.push(les);
                            } else {
                              items.push({
                                type: 'submodule',
                                name: les.submodule,
                                lessons: [les],
                              });
                            }
                          } else {
                            items.push({
                              type: 'lesson',
                              lesson: les,
                            });
                          }
                        });

                        return (
                          <div className="space-y-1.5">
                            {items.map((item, idx) => {
                              if (item.type === 'lesson') {
                                return renderLessonLink(item.lesson);
                              }

                              const key = `${mod.id}-${item.name}`;
                              const isExpanded = !!expandedSubmodules[key];
                              const hasActiveLesson = item.lessons.some((l) => l.id === currentActiveLesson.id);

                              return (
                                <div key={`${item.name}-${idx}`} className="ml-6 pl-3.5 border-l-2 border-red-600/20 space-y-1 bg-transparent">
                                  <button
                                    onClick={() => {
                                      setExpandedSubmodules((prev) => ({
                                        ...prev,
                                        [key]: !prev[key],
                                      }));
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/40 transition-colors rounded-lg cursor-pointer ${
                                      hasActiveLesson ? 'text-red-500 font-extrabold bg-red-650/[0.01]' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 max-w-[85%]">
                                      <FolderOpen className={`w-3.5 h-3.5 ${hasActiveLesson ? 'text-red-500' : 'text-muted-foreground'}`} />
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                  </button>

                                  <div className={`grid transition-all duration-300 ease-in-out ${
                                    isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                  }`}>
                                    <div className="overflow-hidden space-y-1">
                                      {item.lessons.map(renderLessonLink)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </aside>
      </div>

      {/* Folder Selector Modal */}
      {folderModalOpen && selectedLessonIdForFolder && (
        <FolderSelectorModal
          lessonId={selectedLessonIdForFolder}
          courseId={courseId}
          isOpen={folderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onFavoritesUpdated={(lessonId, isFavorited) => {
            setFavoriteIds((prev) => {
              if (isFavorited) {
                return prev.includes(lessonId) ? prev : [...prev, lessonId];
              } else {
                return prev.filter((id) => id !== lessonId);
              }
            });
          }}
        />
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border backdrop-blur-md font-semibold text-xs py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-page-enter select-none ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : toast.type === 'warning'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : toast.type === 'info'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-card border-border text-foreground'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'warning'
                ? 'bg-red-500'
                : toast.type === 'info'
                  ? 'bg-yellow-500'
                  : 'bg-muted-foreground'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
