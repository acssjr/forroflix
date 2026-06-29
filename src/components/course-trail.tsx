'use client';
 
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Clock, Play, Layers, Star, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderSelectorModal } from '@/components/folder-selector-modal';
 
interface Lesson {
  id: string;
  title: string;
  video_id: string;
  duration_seconds: number;
}
 
interface Module {
  id: string;
  title: string;
  position: number;
  cover_vertical?: string | null;
  cover_vertical_position?: string | null;
  lessons: Lesson[];
}
  
interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_gradient: string;
  cover_vertical?: string | null;
  cover_horizontal?: string | null;
  cover_background?: string | null;
  cover_vertical_position?: string | null;
  cover_horizontal_position?: string | null;
  cover_background_position?: string | null;
}
 
interface CourseTrailProps {
  course: Course;
  modules: Module[];
  completedLessonIds: string[];
  favoriteLessonIds: string[];
  setFavoriteIds?: React.Dispatch<React.SetStateAction<string[]>>;
  continueLessonId: string | null;
  userEmail: string;
  isAdmin: boolean;
  onSelectLesson: (lessonId: string) => void;
  libraryId: string;
}
 
// Cores de gradientes para os cartões de módulos (Trilhas)
const MODULE_GRADIENTS = [
  'from-blue-600 to-indigo-800',
  'from-emerald-500 to-teal-700',
  'from-red-600 to-amber-700',
  'from-violet-600 to-indigo-900',
  'from-rose-600 to-red-800',
  'from-cyan-600 to-blue-800',
  'from-purple-600 to-fuchsia-800',
  'from-teal-600 to-emerald-800',
  'from-amber-600 to-red-800',
  'from-pink-600 to-rose-800',
];
 
export function CourseTrail({
  course,
  modules,
  completedLessonIds,
  favoriteLessonIds = [],
  setFavoriteIds,
  continueLessonId,
  userEmail,
  isAdmin,
  onSelectLesson,
  libraryId,
}: CourseTrailProps) {
  const [activeTab, setActiveTab] = useState<'conteudos' | 'salvas' | 'sobre'>('conteudos');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [selectedLessonIdForFolder, setSelectedLessonIdForFolder] = useState<string | null>(null);
 
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

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
 
  // Cálculos de Aulas e Progresso
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessonsCount = allLessons.length;
  
  // Filtrar apenas conclusões pertencentes a aulas deste curso
  const courseLessonIds = allLessons.map((l) => l.id);
  const completedCount = completedLessonIds.filter((id) => courseLessonIds.includes(id)).length;
 
  const percentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;
 
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans animate-page-enter">
      {/* Header Premium do Topo */}
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="/" className="flex items-center group">
            <Image
              src="/logo.svg"
              alt="Forróflix"
              width={140}
              height={38}
              priority
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </a>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline">{userEmail}</span>
            <a href="/">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-xs">
                Voltar ao Catálogo
              </Button>
            </a>
          </div>
        </div>
      </header>
 
      {/* Hero Banner do Curso (Hotmart Style) */}
      <section className="relative overflow-hidden border-b border-border bg-sidebar">
        {/* Fundo desfocado com a imagem ou gradiente do curso */}
        {(() => {
          const bgImage = course.cover_background || course.cover_horizontal || null;
          const bgPos = course.cover_background ? course.cover_background_position : course.cover_horizontal_position;
          
          if (bgImage) {
            return (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <Image
                  src={bgImage}
                  alt=""
                  fill
                  priority
                  className="object-cover opacity-55 dark:opacity-40 blur-[35px] scale-110"
                  style={{ objectPosition: bgPos || '50% 50%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/70 to-sidebar/20" />
              </div>
            );
          }
          return (
            <div className={`absolute inset-0 bg-gradient-to-br ${course.thumbnail_gradient} opacity-5 dark:opacity-10 blur-3xl`} />
          );
        })()}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Lado Esquerdo: Metadados, Progresso e Ações */}
          <div className="flex-grow space-y-6 max-w-2xl text-left">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 group transition-colors">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Voltar
            </Link>
  
            <div className="space-y-3">
              <div className="inline-block bg-secondary border border-border px-3 py-1 rounded-full text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                Curso Online
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-none">
                {course.title}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                {course.description}
              </p>
            </div>
  
            {/* Barra de Progresso do Curso */}
            {totalLessonsCount > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs md:text-sm text-foreground font-semibold flex items-center gap-2">
                  <span className="text-primary font-bold">{completedCount}/{totalLessonsCount}</span> conteúdos concluídos
                  <span className="text-muted-foreground/30">•</span>
                  <span className="text-muted-foreground">{percentage}%</span>
                </div>
                <div className="h-2 w-72 bg-secondary border border-border/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
  
            {/* Botão de Continuar Assistindo */}
            {continueLessonId && (
              <div className="pt-2">
                <Link 
                  href={`/courses/${course.slug}/${continueLessonId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectLesson(continueLessonId);
                  }}
                  className="cursor-pointer"
                >
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-8 rounded-2xl shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm md:text-base flex items-center gap-2.5 cursor-pointer">
                    <Play className="w-4 h-4 fill-current" />
                    {completedCount === 0 ? 'Começar Curso' : 'Continuar Assistindo'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
  
          {/* Lado Direito: Poster Estético Vertical (Oculto em telas pequenas) */}
          <div className="shrink-0 hidden md:block relative z-10">
            <div className={`relative w-64 aspect-[3/4.2] rounded-3xl overflow-hidden bg-gradient-to-b ${course.thumbnail_gradient} p-6 flex flex-col justify-end border border-border/15 shadow-2xl select-none`}>
              {course.cover_vertical ? (
                <>
                  <Image
                    src={course.cover_vertical}
                    alt=""
                    fill
                    priority
                    className="absolute inset-0 object-cover z-0"
                    style={{ objectPosition: course.cover_vertical_position || '50% 50%' }}
                  />
                  {/* Sutil gradiente para destacar o rodapé caso a imagem seja muito clara */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-10" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-black/10 z-10" />
                  <div className="flex-grow flex items-center justify-center text-center py-12 relative z-20">
                    <h3 className="text-2xl font-black tracking-tight text-white leading-none uppercase drop-shadow-lg">
                      {course.title.split(' - ')[0]}
                    </h3>
                  </div>
                </>
              )}
              <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase z-20 relative">
                Forroflix Player
              </span>
            </div>
          </div>
        </div>
      </section>
 
      {/* Abas de Navegação (Hotmart Style) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col">
        <div className="border-b border-border flex gap-8 mb-8">
          <button
            onClick={() => setActiveTab('conteudos')}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all ${
              activeTab === 'conteudos'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Conteúdos
          </button>
          <button
            onClick={() => setActiveTab('salvas')}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all ${
              activeTab === 'salvas'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Aulas Salvas
          </button>
          <button
            onClick={() => setActiveTab('sobre')}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all ${
              activeTab === 'sobre'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Sobre
          </button>
        </div>
 
        {/* Conteúdo das Abas */}
        <div className="flex-grow min-h-[500px]">
          {activeTab === 'conteudos' ? (
            <div className="space-y-6 animate-slide-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Trilhas de Aprendizado
                </h2>
                <p className="text-xs text-muted-foreground">Escolha uma trilha de aulas abaixo e comece a praticar.</p>
              </div>
 
              {modules.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
                  Nenhuma trilha cadastrada para este curso ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {modules.map((mod, index) => {
                    const gradient = MODULE_GRADIENTS[index % MODULE_GRADIENTS.length];
                    const firstLessonId = mod.lessons.length > 0 ? mod.lessons[0].id : null;
                    
                    // Calcular conclusão específica deste módulo
                    const modLessons = mod.lessons.map(l => l.id);
                    const modCompletedCount = completedLessonIds.filter(id => modLessons.includes(id)).length;
                    const isModCompleted = mod.lessons.length > 0 && modCompletedCount === mod.lessons.length;
 
                    const cardContent = (
                      <div className="flex flex-col gap-3 group cursor-pointer text-left">
                        {/* Poster Vertical do Módulo */}
                        <div className={`relative aspect-[3/4.2] w-full rounded-2xl overflow-hidden bg-gradient-to-b ${gradient} p-4 flex flex-col justify-between border border-transparent group-hover:border-primary/30 transition-all duration-300 group-hover:scale-[1.03] shadow-lg shadow-black/30 group-hover:shadow-[0_0_25px_rgba(229,9,20,0.06)]`}>
                          {mod.cover_vertical ? (
                            <>
                              <Image
                                src={mod.cover_vertical}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 50vw"
                                className="absolute inset-0 object-cover z-0 transition-transform duration-300 group-hover:scale-[1.03]"
                                style={{ objectPosition: mod.cover_vertical_position || '50% 50%' }}
                              />
                              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors z-10" />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors z-10" />
                          )}
                          
                          {/* Indicador Numérico do Módulo (Hotmart Style) */}
                          <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-card border border-border text-card-foreground flex items-center justify-center text-xs font-mono font-bold select-none z-20">
                            {index + 1}
                          </div>

                          {/* Indicador de Concluído */}
                          {isModCompleted ? (
                            <div className="absolute top-4 right-4 bg-green-500 text-white p-1 rounded-full shadow-lg z-20">
                              <Play className="w-3 h-3 fill-white rotate-90" />
                            </div>
                          ) : (
                            <div className="absolute top-4 right-4 bg-secondary border border-border/10 px-2 py-0.5 rounded text-[8px] font-bold text-muted-foreground z-20">
                              {modCompletedCount}/{mod.lessons.length}
                            </div>
                          )}
                          
                          {/* Título Centralizado do Módulo */}
                          <div className="flex-grow flex items-center justify-center text-center py-6 relative z-20">
                            <h4 className="text-lg font-black tracking-tight text-white uppercase leading-tight drop-shadow-md select-none">
                              {mod.title}
                            </h4>
                          </div>

                          <span className="text-[8px] font-bold text-white/50 tracking-wider uppercase z-20">
                            MÓDULO {index + 1}
                          </span>
                        </div>
 
                        {/* Informações Textuais Abaixo do Poster */}
                        <div className="px-1">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {mod.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                            {mod.lessons.length} aulas • {Math.ceil(mod.lessons.reduce((acc, l) => acc + l.duration_seconds, 0) / 60)}m
                          </span>
                        </div>
                      </div>
                    );
 
                    return firstLessonId ? (
                      <Link 
                        href={`/courses/${course.slug}/${firstLessonId}`} 
                        key={mod.id}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectLesson(firstLessonId);
                        }}
                      >
                        {cardContent}
                      </Link>
                    ) : (
                      <div key={mod.id} className="opacity-60 cursor-not-allowed">
                        {cardContent}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'salvas' ? (
            <div className="space-y-6 animate-slide-in">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  Aulas Salvas para Revisão
                </h2>
                <p className="text-xs text-muted-foreground">Aulas que você marcou com estrela neste curso para revisar e praticar depois.</p>
              </div>
 
              {(() => {
                const favoritedLessons = modules.flatMap((m, mIdx) => 
                  m.lessons
                    .filter((l) => favoriteLessonIds.includes(l.id))
                    .map((l) => ({
                      ...l,
                      moduleTitle: `${mIdx + 1}. ${m.title}`,
                    }))
                );
 
                const formatDuration = (seconds: number) => {
                  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
                  const mins = Math.floor(seconds / 60);
                  const secs = Math.floor(seconds % 60);
                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                };
 
                if (favoritedLessons.length === 0) {
                  return (
                    <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
                      Nenhuma aula salva neste curso ainda. Clique no ícone de estrela dentro das aulas para salvá-las aqui.
                    </div>
                  );
                }
 
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {favoritedLessons.map((les) => {
                      const isCompleted = completedLessonIds.includes(les.id);
                      return (
                        <div key={les.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 transition-all duration-300 flex flex-col group relative">
                          {/* Miniatura com hover play e badges */}
                          <div 
                            className="relative aspect-video w-full bg-secondary border-b border-border/10 overflow-hidden cursor-pointer"
                            onClick={() => onSelectLesson(les.id)}
                          >
                            {libraryId && les.video_id ? (
                              <img
                                src={`https://vz-${libraryId}.b-cdn.net/${les.video_id}/thumbnail.jpg`}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/15 transition-colors">
                              <div className="bg-primary text-primary-foreground p-2.5 rounded-full scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg shadow-primary/20">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                            
                            {/* Duração */}
                            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                              {formatDuration(les.duration_seconds)}
                            </div>
 
                            {/* Indicador Concluído */}
                            {isCompleted && (
                              <div className="absolute top-2 left-2 bg-green-550 text-white px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-md">
                                <CheckCircle2 className="w-3 h-3 text-white fill-white/10" />
                                Concluída
                              </div>
                            )}
                          </div>
 
                          {/* Infos e botão favorito */}
                          <div className="p-4 flex-grow flex flex-col justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase block">
                                {les.moduleTitle}
                              </span>
                              <h4 
                                onClick={() => onSelectLesson(les.id)}
                                className="text-sm font-extrabold text-card-foreground hover:text-primary cursor-pointer transition-colors line-clamp-2 leading-tight"
                              >
                                {les.title}
                              </h4>
                            </div>
 
                            <div className="flex justify-between items-center pt-1 border-t border-border/50">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  
                                  // Remover dos favoritos imediatamente com 1 clique
                                  if (setFavoriteIds) {
                                    setFavoriteIds((prev) => prev.filter((id) => id !== les.id));
                                  }
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
                                    console.error('Erro ao desfavoritar:', err);
                                    if (setFavoriteIds) {
                                      setFavoriteIds((prev) => [...prev, les.id]);
                                    }
                                  }
                                }}
                                className="text-xs font-bold text-yellow-500 flex items-center gap-1 hover:text-yellow-400 transition-colors"
                              >
                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                Salva
                              </button>
 
                              <button
                                onClick={() => onSelectLesson(les.id)}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors"
                              >
                                Assistir Aula
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="max-w-3xl space-y-6 animate-slide-in">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Descrição do Curso
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {course.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>
 
              <div className="border-t border-border pt-6 grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-3">
                  <Layers className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold uppercase block">Total de Trilhas</span>
                    <span className="text-foreground font-extrabold text-sm">{modules.length} módulos</span>
                  </div>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-muted-foreground text-[10px] font-bold uppercase block">Duração Total</span>
                    <span className="text-foreground font-extrabold text-sm">
                      {Math.ceil(allLessons.reduce((acc, l) => acc + l.duration_seconds, 0) / 60)} minutos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Folder Selector Modal */}
      {folderModalOpen && selectedLessonIdForFolder && (
        <FolderSelectorModal
          lessonId={selectedLessonIdForFolder}
          courseId={course.id}
          isOpen={folderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onFavoritesUpdated={(lessonId, isFavorited) => {
            if (setFavoriteIds) {
              setFavoriteIds((prev) => {
                if (isFavorited) {
                  return prev.includes(lessonId) ? prev : [...prev, lessonId];
                } else {
                  return prev.filter((id) => id !== lessonId);
                }
              });
            }
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
                : 'bg-slate-950/95 border-slate-900 text-slate-300'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'warning'
                ? 'bg-red-500'
                : toast.type === 'info'
                  ? 'bg-yellow-500'
                  : 'bg-slate-400'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
