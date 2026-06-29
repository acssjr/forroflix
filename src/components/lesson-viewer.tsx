'use client';

import { useState, useEffect, useRef, useTransition, useOptimistic } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/video-player').then((mod) => mod.VideoPlayer),
  { ssr: false }
);
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Star,
} from 'lucide-react';
const FolderSelectorModal = dynamic(
  () => import('@/components/folder-selector-modal').then((mod) => mod.FolderSelectorModal),
  { ssr: false }
);
import { toggleProgressAction, toggleFavoriteAction } from '@/app/actions';
import { NotesSection } from '@/components/lesson/NotesSection';
import { LessonAccordion } from '@/components/lesson/LessonAccordion';
import { AutoplayOverlay } from '@/components/lesson/AutoplayOverlay';

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

  const [seekTrigger, setSeekTrigger] = useState<{ seconds: number; ts: number } | null>(null);

  // Transition & Optimistic states (React 19)
  const [, startTransition] = useTransition();

  const [optimisticCompletedIds, setOptimisticCompletedIds] = useOptimistic(
    completedIds,
    (state, { lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (completed) {
        return state.includes(lessonId) ? state : [...state, lessonId];
      } else {
        return state.filter((id) => id !== lessonId);
      }
    }
  );

  const [optimisticFavoriteIds, setOptimisticFavoriteIds] = useOptimistic(
    favoriteIds,
    (state, { lessonId, favorited }: { lessonId: string; favorited: boolean }) => {
      if (favorited) {
        return state.includes(lessonId) ? state : [...state, lessonId];
      } else {
        return state.filter((id) => id !== lessonId);
      }
    }
  );

  // Encontrar o ID da aula anterior e da próxima
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
  const autoCompletingLessonsRef = useRef<Set<string>>(new Set());
 
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);

  useEffect(() => {
    setCurrentActiveLesson(activeLesson);
    setAutoplayDisabled(false);
    setVideoProgress({ currentTime: 0, duration: 0 });
    setLessonNotes([]);
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

  const toggleActiveFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isCurrentlyFav = optimisticFavoriteIds.includes(currentActiveLesson.id);
    handleToggleLessonFavorite(e, currentActiveLesson.id, isCurrentlyFav);
  };

  const handleToggleLessonFavorite = async (e: React.MouseEvent, lessonId: string, isCurrentlyFav: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newFavoriteState = !isCurrentlyFav;
    
    if (newFavoriteState) {
      // Abrir o modal para escolher a pasta de favoritos
      setSelectedLessonIdForFolder(lessonId);
      setFolderModalOpen(true);
    } else {
      showToast('Removido das aulas salvas', 'warning');
      startTransition(async () => {
        setOptimisticFavoriteIds({ lessonId, favorited: false });
        
        const res = await toggleFavoriteAction(lessonId, false);
        if (res.success) {
          setFavoriteIds((prev) => prev.filter((id) => id !== lessonId));
        } else {
          showToast(res.error || 'Erro ao atualizar favoritos', 'warning');
        }
      });
    }
  };

  // Monitorar tempo e progresso do vídeo
  const handleVideoProgress = async (currentTime: number, duration: number) => {
    if (!duration || isNaN(duration) || duration <= 0) return;
    setVideoProgress({ currentTime, duration });
    
    // Auto-Concluir a aula com 90% assistidos
    const percentageWatched = (currentTime / duration) * 100;
    const isAlreadyCompleted = completedIds.includes(currentActiveLesson.id);
    const isAlreadyAutoCompleted = autoCompletedLessons.includes(currentActiveLesson.id);
    const isAlreadyAutoCompleting = autoCompletingLessonsRef.current.has(currentActiveLesson.id);

    if (percentageWatched >= 90 && !isAlreadyCompleted && !isAlreadyAutoCompleted && !isAlreadyAutoCompleting) {
      autoCompletingLessonsRef.current.add(currentActiveLesson.id);
      showToast('Aula concluída automaticamente (90% assistida)! 🎉', 'success');
      
      startTransition(async () => {
        setOptimisticCompletedIds({ lessonId: currentActiveLesson.id, completed: true });
        try {
          const res = await toggleProgressAction(currentActiveLesson.id, true);
          if (res.success) {
            setCompletedIds((prev) => [...prev, currentActiveLesson.id]);
            setAutoCompletedLessons((prev) => [...prev, currentActiveLesson.id]);
          } else {
            showToast(res.error || 'Erro ao registrar auto-conclusão', 'warning');
            autoCompletingLessonsRef.current.delete(currentActiveLesson.id);
          }
        } catch (err) {
          console.error(err);
          autoCompletingLessonsRef.current.delete(currentActiveLesson.id);
        }
      });
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

  const isActiveFavorited = optimisticFavoriteIds.includes(currentActiveLesson.id);

  useEffect(() => {
    setLocalModules(modules);
  }, [modules]);

  const isCompleted = optimisticCompletedIds.includes(currentActiveLesson.id);

  // Alternar conclusão de qualquer aula via checkbox lateral
  const toggleLessonProgress = async (e: React.MouseEvent, lessonId: string, currentCompleted: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    const newCompletedState = !currentCompleted;
    
    if (newCompletedState) {
      showToast('Aula concluída! 🎉', 'success');
    } else {
      showToast('Progresso removido.', 'info');
    }

    startTransition(async () => {
      setOptimisticCompletedIds({ lessonId, completed: newCompletedState });
      
      const res = await toggleProgressAction(lessonId, newCompletedState);
      if (res.success) {
        setCompletedIds((prev) => {
          if (newCompletedState) {
            return prev.includes(lessonId) ? prev : [...prev, lessonId];
          } else {
            return prev.filter((id) => id !== lessonId);
          }
        });
      } else {
        showToast(res.error || 'Erro ao salvar progresso', 'warning');
      }
    });
  };

  // Selecionar aula client-side (SPA)
  const handleSelectLesson = (lesson: any) => {
    onSelectLesson(lesson.id);
  };

  // Alternar conclusão de aula ativa
  const toggleProgress = async () => {
    setMarkingProgress(true);
    const newCompletedState = !isCompleted;
    
    if (newCompletedState) {
      showToast('Aula concluída! 🎉', 'success');
    } else {
      showToast('Progresso removido.', 'info');
    }

    startTransition(async () => {
      setOptimisticCompletedIds({ lessonId: currentActiveLesson.id, completed: newCompletedState });
      
      const res = await toggleProgressAction(currentActiveLesson.id, newCompletedState);
      if (res.success) {
        setCompletedIds((prev) => {
          if (newCompletedState) {
            return prev.includes(currentActiveLesson.id) ? prev : [...prev, currentActiveLesson.id];
          } else {
            return prev.filter((id) => id !== currentActiveLesson.id);
          }
        });
      } else {
        showToast(res.error || 'Erro ao salvar progresso', 'warning');
      }
      setMarkingProgress(false);
    });
  };

  const timeRemaining = videoProgress.duration > 0 ? videoProgress.duration - videoProgress.currentTime : 999;
  const threshold = videoProgress.duration > 0 ? Math.min(20, videoProgress.duration * 0.1) : 20;
  const isTimeForCountdown = videoProgress.duration > 0 && timeRemaining <= threshold && timeRemaining > 0 && nextLesson && !autoplayDisabled;
  const countdownDisplay = Math.ceil(timeRemaining);

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
                <AutoplayOverlay
                  countdownDisplay={countdownDisplay}
                  nextLesson={nextLesson}
                  onWatchNow={() => handleSelectLesson(nextLesson)}
                  onReverAula={handleReverAula}
                />
              )}
            </div>

            {/* Linha do Tempo das Anotações Interativa */}
            {videoProgress.duration > 0 && (
              <div className="space-y-2 select-none bg-card border border-border p-4 rounded-2xl shadow-sm animate-fade-in text-left">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                  <span>Marcadores de Anotação na Linha do Tempo</span>
                  <span>{formatSeconds(videoProgress.currentTime)} / {formatSeconds(videoProgress.duration)}</span>
                </div>
                <div 
                  className="w-full h-3 bg-secondary border border-border/60 rounded-full relative cursor-pointer group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    const targetSeconds = Math.round(percentage * videoProgress.duration);
                    setSeekTrigger({ seconds: targetSeconds, ts: Date.now() });
                  }}
                >
                  {/* Barra de Progresso Real */}
                  <div 
                    className="h-full bg-primary/35 rounded-full transition-all" 
                    style={{ width: `${(videoProgress.currentTime / videoProgress.duration) * 100}%` }} 
                  />
                  
                  {/* Marcadores */}
                  {lessonNotes.map((note) => {
                    const pct = (note.watched_seconds / videoProgress.duration) * 100;
                    return (
                      <div
                        key={note.id}
                        className="absolute group/marker -translate-x-1/2 -top-0.5 z-20"
                        style={{ left: `${pct}%` }}
                        onClick={(e) => {
                          e.stopPropagation(); // Evitar clique na barra
                          setSeekTrigger({ seconds: note.watched_seconds, ts: Date.now() });
                        }}
                      >
                        <div className="w-3.5 h-3.5 bg-primary hover:bg-primary/80 border-2 border-background rounded-full cursor-pointer hover:scale-125 transition-transform shadow-md" />
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded-lg border border-border shadow-lg opacity-0 pointer-events-none group-hover/marker:opacity-100 transition-opacity z-50 text-center leading-normal">
                          <span className="font-bold text-primary block mb-0.5">Tempo: {formatSeconds(note.watched_seconds)}</span>
                          <span className="line-clamp-2">{note.content}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
            <NotesSection
              lessonId={currentActiveLesson.id}
              currentTime={videoProgress.currentTime}
              isAdmin={isAdmin}
              onSeek={(seconds) => setSeekTrigger({ seconds, ts: Date.now() })}
              onNotesLoaded={(notes) => setLessonNotes(notes)}
              showToast={showToast}
            />

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
        <LessonAccordion
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          localModules={localModules}
          currentActiveLessonId={currentActiveLesson.id}
          completedIds={optimisticCompletedIds}
          favoriteIds={optimisticFavoriteIds}
          courseSlug={courseSlug}
          libraryId={libraryId}
          onSelectLesson={handleSelectLesson}
          onToggleLessonProgress={toggleLessonProgress}
          onToggleLessonFavorite={handleToggleLessonFavorite}
        />
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
