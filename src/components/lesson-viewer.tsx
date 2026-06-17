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
} from 'lucide-react';
import { FolderSelectorModal } from '@/components/folder-selector-modal';

interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
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
  isSubscribed: boolean;
  onBackToTrail: () => void;
  onSelectLesson: (lessonId: string) => void;
  libraryId: string;
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
          <div className="p-4 border-b border-border flex justify-between items-center">
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

          <div className="p-4">
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
                  <AccordionContent className="p-1 space-y-1">
                    {mod.lessons.map((les) => {
                      const isActive = les.id === currentActiveLesson.id;
                      const isLesCompleted = completedIds.includes(les.id);
                      const isLesFavorited = favoriteIds.includes(les.id);
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
                            {les.title}
                          </span>
 
                          {/* Botões Favorito e Conclusão no canto direito */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Favorito */}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (isLesFavorited) {
                                  // Remover imediatamente com 1 clique
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
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
