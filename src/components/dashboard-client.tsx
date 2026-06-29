'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Settings, Play, Home as HomeIcon, BookOpen, 
  User, Search, Star, CheckCircle, Activity, ChevronRight,
  Sun, Moon, Menu, Video, ChevronLeft
} from 'lucide-react';
import { VideoPlayer } from '@/components/video-player';
import { NotesSection } from '@/components/lesson/NotesSection';

interface FavoriteLesson {
  id: string;
  title: string;
  video_id: string;
  duration_seconds: number;
  course_id: string;
  course_slug: string;
  course_title: string;
  module_title: string;
}

interface CourseItem {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_gradient: string;
  center_text: string;
  label: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  cover_vertical?: string | null;
  cover_horizontal?: string | null;
  cover_background?: string | null;
  cover_vertical_position?: string | null;
  cover_horizontal_position?: string | null;
  cover_background_position?: string | null;
  is_featured?: number;
  hide_title?: number;
}

interface VideoAnalysisLesson {
  id: string;
  title: string;
  video_id: string;
  duration_seconds: number;
  module_title: string;
}

interface DashboardClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  coursesList: CourseItem[];
  favoritesList: FavoriteLesson[];
  lastLesson: {
    lesson_id: string;
    lesson_title: string;
    duration_seconds: number;
    module_title: string;
    course_id: string;
    course_title: string;
    course_slug: string;
  } | null;
  lastLessonProgressPercent: number;
  totalCompletedLessons: number;
  coursesInProgress: number;
  coursesCompleted: number;
  isAdmin: boolean;
  pullZone: string;
  initialTab?: 'catalog' | 'favorites' | 'progress' | 'video-analysis';
  videoAnalysisLessons: VideoAnalysisLesson[];
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

export function DashboardClient({
  user,
  coursesList,
  favoritesList,
  lastLesson,
  lastLessonProgressPercent,
  totalCompletedLessons,
  coursesInProgress,
  coursesCompleted,
  isAdmin,
  pullZone,
  initialTab = 'catalog',
  videoAnalysisLessons = [],
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'favorites' | 'progress' | 'video-analysis'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoAnalysisLesson | null>(null);
  const [videoProgress, setVideoProgress] = useState({ currentTime: 0, duration: 0 });
  const [seekTrigger, setSeekTrigger] = useState<{ seconds: number; ts: number } | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Limpar notificação flutuante de toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Local state for courses (filtrando 'anlise-de-vdeos' do catálogo inicial)
  const [courses] = useState<CourseItem[]>(() => 
    (coursesList || []).filter(c => c && c.slug !== 'anlise-de-vdeos')
  );

  useEffect(() => {
    // Carregar preferências da barra lateral
    const savedSidebar = localStorage.getItem('sidebar_expanded');
    if (savedSidebar === 'true') {
      setIsSidebarExpanded(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !isSidebarExpanded;
    setIsSidebarExpanded(nextVal);
    localStorage.setItem('sidebar_expanded', String(nextVal));
  };

  useEffect(() => {
    if (videoAnalysisLessons && videoAnalysisLessons.length > 0 && !selectedVideo) {
      setSelectedVideo(videoAnalysisLessons[0]);
    }
  }, [videoAnalysisLessons, selectedVideo]);

  // Resetar estados do player ao trocar de vídeo
  useEffect(() => {
    setVideoProgress({ currentTime: 0, duration: 0 });
    setSeekTrigger(null);
    setAnalysisNotes([]);
  }, [selectedVideo]);

  // Synchronous dark theme script loader
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    
    const root = window.document.documentElement;
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    
    const root = window.document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Filter courses based on search
  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter favorites based on search
  const filteredFavorites = favoritesList.filter(fav =>
    fav.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fav.course_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans animate-page-enter">
      {/* Sidebar de Navegação (Esquerda) */}
      <aside className={`hidden md:flex flex-col py-8 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shrink-0 z-40 justify-between transition-all duration-300 ${isSidebarExpanded ? 'w-60 px-4' : 'w-20 px-2'}`}>
        <div className="flex flex-col gap-8 w-full">
          {/* Top section: Logo & Toggle button */}
          <div className={`flex items-center w-full ${isSidebarExpanded ? 'justify-between px-2' : 'justify-center'}`}>
            <button 
              onClick={() => setActiveTab('catalog')} 
              className="group flex items-center justify-center cursor-pointer shrink-0"
            >
              {isSidebarExpanded ? (
                <Image
                  src="/logo.svg"
                  alt="Forróflix"
                  width={110}
                  height={28}
                  priority
                  className="h-7 w-auto object-contain animate-fade-in"
                />
              ) : (
                <span className="font-black text-3xl tracking-tighter text-red-600 transition-transform group-hover:scale-110 drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">
                  F
                </span>
              )}
            </button>
            {isSidebarExpanded && (
              <button 
                onClick={toggleSidebar} 
                className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-primary transition-all cursor-pointer hidden md:block"
                title="Recolher Menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Menus */}
          <nav className="flex flex-col gap-3 w-full">
            {/* If collapsed, show a Menu icon at the top to expand */}
            {!isSidebarExpanded && (
              <button 
                onClick={toggleSidebar}
                className="flex items-center justify-center p-3 rounded-xl text-muted-foreground hover:text-primary hover:bg-sidebar-accent cursor-pointer transition-all mb-2"
                title="Expandir Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={() => setActiveTab('catalog')} 
              className={`flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} ${activeTab === 'catalog' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Catálogo"
            >
              <HomeIcon className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && (
                <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                  Catálogo
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('video-analysis')} 
              className={`flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} ${activeTab === 'video-analysis' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Análise de Vídeos"
            >
              <Video className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && (
                <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                  Análise de Vídeos
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('favorites')} 
              className={`flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} ${activeTab === 'favorites' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Aulas Salvas"
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && (
                <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                  Aulas Salvas
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('progress')} 
              className={`flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} ${activeTab === 'progress' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Meu Progresso"
            >
              <User className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && (
                <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                  Meu Progresso
                </span>
              )}
            </button>

            {isAdmin && (
              <Link 
                href="/admin" 
                className={`flex items-center gap-3.5 p-3 rounded-xl transition-all ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} text-muted-foreground hover:text-primary hover:bg-sidebar-accent`}
                title="Painel Admin"
              >
                <Settings className="w-5 h-5 shrink-0" />
                {isSidebarExpanded && (
                  <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                    Painel Admin
                  </span>
                )}
              </Link>
            )}
          </nav>
        </div>

        {/* Base da Sidebar: Theme Toggle & Logout */}
        <div className="flex flex-col gap-3 w-full">
          {/* Botão de Alternar Tema */}
          <button 
            onClick={toggleTheme} 
            className={`flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'w-full justify-start' : 'justify-center'} text-sidebar-foreground/70 hover:text-primary hover:bg-sidebar-accent`}
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {isSidebarExpanded && (
              <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              </span>
            )}
          </button>

          {/* Logout */}
          <form action="/api/auth/logout" method="POST" className="w-full">
            <button 
              type="submit" 
              className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all cursor-pointer ${isSidebarExpanded ? 'justify-start' : 'justify-center'} text-sidebar-foreground/70 hover:text-primary hover:bg-primary/10`} 
              title="Sair"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && (
                <span className="text-xs font-bold whitespace-nowrap animate-fade-in">
                  Sair
                </span>
              )}
            </button>
          </form>
        </div>
      </aside>

      {/* Wrapper principal: central + lateral direita */}
      <div className="flex-grow flex flex-col lg:flex-row min-w-0 relative z-10">
        
        {/* Mobile Top Header (Visível apenas em mobile/tablet) */}
        <header className="md:hidden border-b border-sidebar-border bg-sidebar/95 backdrop-blur sticky top-0 z-40 w-full px-4 h-16 flex items-center justify-between shrink-0">
          <button onClick={() => setActiveTab('catalog')} className="flex items-center cursor-pointer">
            <Image
              src="/logo.svg"
              alt="Forróflix"
              width={120}
              height={32}
              priority
              className="h-8 w-auto object-contain"
            />
          </button>
          <div className="flex items-center gap-2.5">
            <button 
              onClick={toggleTheme}
              className="p-2 text-sidebar-foreground/70 hover:text-primary"
              title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setActiveTab('video-analysis')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'video-analysis' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
              title="Análise de Vídeos"
            >
              <Video className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'favorites' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
              title="Aulas Salvas"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'progress' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
              title="Meu Progresso"
            >
              <User className="w-4 h-4" />
            </button>
            {isAdmin && (
              <Link 
                href="/admin"
                className="inline-flex items-center justify-center border border-primary/20 hover:bg-primary/10 gap-1.5 text-[10px] py-1.5 px-3 rounded-xl cursor-pointer text-sidebar-foreground/70 hover:text-primary font-semibold transition-colors"
              >
                <Settings className="w-3 h-3" />
                Admin
              </Link>
            )}
          </div>
        </header>

        {/* Área Principal (Centro) */}
        <main className="flex-grow px-4 sm:px-6 md:px-8 py-8 space-y-8 w-full">
          
          {/* Saudação do Aluno no Topo */}
          <div className="text-left space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">
              Olá, {user.full_name || 'Aluno'}!
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Bom ver você de volta. O que vamos aprender a dançar hoje?
            </p>
          </div>

          {/* Barra de Pesquisa */}
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por curso, aula ou assunto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card text-card-foreground border border-border hover:border-border/80 focus:border-primary/50 rounded-2xl py-3 pl-12 pr-4 text-xs placeholder-muted-foreground outline-none transition-all focus:ring-1 focus:ring-primary/30 shadow-sm"
            />
          </div>

          {/* VIEW: CATALOG (Catálogo Principal) */}
          {activeTab === 'catalog' && (
            <div className="space-y-8 animate-fade-in">
              {/* Curso em Destaque */}
              {coursesList.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase text-left">
                    Curso em Destaque
                  </h2>
                  {(() => {
                    const featuredCourse = courses.find(c => c.is_featured === 1) || courses[0];
                    if (!featuredCourse) return null;
                    return (
                      <div 
                        className="relative rounded-3xl overflow-hidden border border-border shadow-md dark:shadow-2xl min-h-[260px] md:aspect-[7/2] w-full flex items-center justify-start group cursor-pointer hover:border-primary/20 hover:shadow-lg dark:hover:shadow-[0_0_35px_rgba(229,9,20,0.06)] transition-all duration-300"
                      >
                        <Link 
                          href={`/courses/${featuredCourse.slug}`}
                          className="absolute inset-0 z-30 rounded-3xl"
                        />
                        {featuredCourse.cover_horizontal ? (
                          <>
                            <img 
                              src={featuredCourse.cover_horizontal} 
                              alt="" 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500" 
                              style={{ objectPosition: featuredCourse.cover_horizontal_position || '50% 50%' }}
                            />
                            <div className="absolute inset-y-0 left-0 w-[50%] md:w-[40%] bg-gradient-to-r from-black/80 via-black/35 to-transparent z-10 pointer-events-none" />
                            
                            <div className="relative z-20 p-6 md:p-8 lg:p-10 text-left text-white flex flex-col justify-center h-full w-full md:max-w-md space-y-4">
                              {!featuredCourse.hide_title && (
                                <div className="space-y-1.5">
                                  <h3 className="text-xl md:text-2xl font-black tracking-tight leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                                    {featuredCourse.title}
                                  </h3>
                                  <p className="text-[10px] md:text-xs text-white/90 line-clamp-2 leading-relaxed drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.8)]">
                                    {featuredCourse.description || 'Aulas exclusivas do Forroflix.'}
                                  </p>
                                </div>
                              )}
                              <div className="bg-primary group-hover:bg-primary/95 text-white font-bold text-[10px] md:text-xs flex items-center justify-center gap-2 px-4 py-2 rounded-xl shadow-lg shadow-primary/20 transition-all w-fit duration-200">
                                <Play className="w-3.5 h-3.5 fill-current" />
                                ACESSAR
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-r from-red-50/60 to-card dark:from-red-950/20 dark:to-card" />
                            <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none hidden dark:block" />
                            
                            <div className="relative z-20 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 w-full">
                              <div className="space-y-4 max-w-md text-left w-full text-foreground">
                                {!featuredCourse.hide_title && (
                                  <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                                      {featuredCourse.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                      {featuredCourse.description || 'Aulas exclusivas do Forroflix.'}
                                    </p>
                                  </div>
                                )}
                                <div className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-primary/15 transition-all w-fit">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  ACESSAR
                                </div>
                              </div>
                              
                              <div className={`relative w-full md:w-[490px] lg:w-[630px] aspect-[7/2] rounded-2xl overflow-hidden border border-border/10 bg-gradient-to-br ${featuredCourse.thumbnail_gradient} shadow-md shrink-0 flex items-center justify-center`}>
                                <span className="text-sm font-black text-white uppercase drop-shadow-md">
                                  {featuredCourse.title.split(' - ')[0]}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Todos os Cursos */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase text-left">
                    TODOS OS CURSOS
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <div 
                      key={course.id}
                      className="bg-card border border-border hover:border-primary/20 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(229,9,20,0.04)] hover:scale-[1.02] transition-all duration-300 relative group cursor-pointer"
                    >
                      <Link href={`/courses/${course.slug}`} className="absolute inset-0 z-10 rounded-3xl" />

                      {/* Capa Vertical com Aspect Ratio 4:5 */}
                      <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden mb-4 relative border border-border/10 bg-secondary shadow-inner">
                        {course.cover_vertical ? (
                          <img 
                            src={course.cover_vertical} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            style={{ objectPosition: course.cover_vertical_position || '50% 50%' }}
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${course.thumbnail_gradient} flex items-center justify-center p-4`}>
                            <span className="font-black text-3xl tracking-tighter text-white/20 select-none">
                              F
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                        
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/55 to-transparent flex justify-between items-center text-[9px] font-bold text-white z-10 select-none">
                          <span>{course.completed_lessons}/{course.total_lessons} aulas</span>
                          <span>{course.progress_percent}%</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${course.progress_percent}%` }} />
                        </div>
                      </div>

                      <div className="space-y-3 flex-grow flex flex-col justify-between">
                        {!course.hide_title && (
                          <div className="space-y-1 text-left">
                            <h3 className="text-sm font-extrabold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                              {course.title}
                            </h3>
                          </div>
                        )}
                        
                        <div className="w-full bg-secondary border border-border group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center gap-2 transition-all duration-200 text-xs py-2 rounded-xl text-card-foreground font-bold">
                          ACESSAR
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCourses.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground text-xs">
                      Nenhum curso correspondente encontrado.
                    </div>
                  )}
                </div>
              </section>

              {/* Última Aula Acessada e Estatísticas */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
                {/* Última Aula Acessada */}
                <div className="space-y-3 text-left">
                  <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Última Aula Acessada
                  </h2>
                  {lastLesson ? (
                    <div className="bg-card border border-border rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-primary/20 transition-colors">
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none hidden dark:block" />
                      
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 shrink-0 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xs shadow-inner">
                          {lastLesson.course_title?.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                            {lastLesson.course_title}
                          </span>
                          <h3 className="text-xs font-extrabold text-card-foreground line-clamp-1 leading-snug">
                            {lastLesson.lesson_title}
                          </h3>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Módulo: {lastLesson.module_title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="relative w-10 h-10 flex items-center justify-center select-none" title={`Curso ${lastLessonProgressPercent}% concluído`}>
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              className="stroke-secondary"
                              strokeWidth="3.5"
                              fill="transparent"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              className="stroke-primary transition-all duration-500"
                              strokeWidth="3.5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 16}
                              strokeDashoffset={2 * Math.PI * 16 * (1 - lastLessonProgressPercent / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold text-card-foreground">
                            {lastLessonProgressPercent}%
                          </span>
                        </div>

                        <Link href={`/courses/${lastLesson.course_slug}/${lastLesson.lesson_id}`} className="z-20">
                          <Button className="bg-foreground text-background hover:bg-foreground/90 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
                            Continuar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-3xl p-5 flex items-center justify-center text-center h-[90px]">
                      <p className="text-xs text-muted-foreground">Nenhum progresso registrado.</p>
                    </div>
                  )}
                </div>

                {/* Estatísticas Rápidas */}
                <div className="space-y-3 text-left">
                  <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Estatísticas de Progresso
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-3xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-xl">
                      <div className="bg-primary/10 p-2.5 rounded-2xl text-primary border border-primary/10">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-lg font-black text-card-foreground leading-none block">
                          {totalCompletedLessons}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Aulas Concluídas
                        </span>
                      </div>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-4 flex items-center gap-3.5 shadow-sm dark:shadow-xl">
                      <div className="bg-primary/10 p-2.5 rounded-2xl text-primary border border-primary/10">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-lg font-black text-card-foreground leading-none block">
                          {coursesInProgress + coursesCompleted}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Cursos Iniciados
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW: FAVORITES */}
          {activeTab === 'favorites' && (
            <section className="space-y-6 text-left animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  Minhas Aulas Salvas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Todas as vídeoaulas marcadas para revisão rápida e acompanhamento de estudos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFavorites.map((fav) => (
                  <div 
                    key={fav.id}
                    className="bg-card border border-border rounded-3xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 relative group cursor-pointer"
                  >
                    <Link href={`/courses/${fav.course_slug}/${fav.id}`} className="absolute inset-0 z-10 rounded-3xl" />

                    <div className="w-full aspect-video rounded-2xl bg-secondary border border-border/10 overflow-hidden mb-3 relative">
                      {pullZone && fav.video_id ? (
                        <img
                          src={`https://vz-${pullZone}.b-cdn.net/${fav.video_id}/thumbnail.jpg`}
                          alt=""
                          className="w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 transition-all duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center font-black text-primary">
                          F
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 group-hover:bg-primary/20">
                        <Play className="w-5 h-5 fill-current text-white scale-90 group-hover:scale-100 transition-all" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-primary uppercase tracking-widest block">
                          {fav.course_title}
                        </span>
                        <h3 className="text-xs font-extrabold text-card-foreground line-clamp-2 leading-tight block">
                          {fav.title}
                        </h3>
                        <span className="text-[9px] text-muted-foreground block truncate">
                          Módulo: {fav.module_title}
                        </span>
                      </div>
                      
                      <div className="w-full bg-secondary border border-border group-hover:bg-primary/10 group-hover:text-primary text-card-foreground font-bold flex items-center justify-center gap-2 transition-all duration-200 text-xs py-2 rounded-xl z-20 relative">
                        ASSISTIR AULA
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}

                {filteredFavorites.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-card border border-border rounded-3xl shadow-sm">
                    <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma aula salva para revisão.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* VIEW: PROGRESS */}
          {activeTab === 'progress' && (
            <section className="space-y-6 text-left animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Meu Rendimento
                </h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhamento de estudos, aulas concluídas e taxas de progresso por curso.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesList.map((course) => (
                  <div 
                    key={course.id}
                    className="bg-card border border-border rounded-3xl p-5 flex flex-col items-center justify-between text-center shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 relative group cursor-pointer"
                  >
                    <Link href={`/courses/${course.slug}`} className="absolute inset-0 z-10 rounded-3xl" />
                    
                    <div className="relative w-24 h-24 flex items-center justify-center select-none mb-4">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          className="stroke-secondary"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          className="stroke-primary transition-all duration-500 shadow-inner"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - course.progress_percent / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-base font-black text-card-foreground">
                        {course.progress_percent}%
                      </span>
                    </div>

                    <div className="space-y-3 w-full">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-card-foreground line-clamp-1 leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                          {course.completed_lessons} de {course.total_lessons} aulas assistidas
                        </p>
                      </div>

                      <div className="w-full bg-secondary border border-border group-hover:bg-primary/10 group-hover:text-primary text-card-foreground font-bold flex items-center justify-center gap-2 transition-all duration-200 text-xs py-2 rounded-xl">
                        CONTINUAR ESTUDOS
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VIEW: VIDEO ANALYSIS */}
          {activeTab === 'video-analysis' && (
            <section className="space-y-6 text-left animate-fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Análise de Vídeos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Assista a análises técnicas detalhadas de passos, movimentações e musicalidade no forró.
                </p>
              </div>

              {videoAnalysisLessons.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Player Principal (Esquerda - 2/3) */}
                  <div className="lg:col-span-2 space-y-6">
                    {selectedVideo ? (
                      <div className="space-y-6">
                        <VideoPlayer
                          videoId={selectedVideo.video_id}
                          userEmail={user.email}
                          courseTitle="Análise de Vídeos"
                          moduleTitle={selectedVideo.module_title}
                          lessonTitle={selectedVideo.title}
                          onProgress={(current, duration) => setVideoProgress({ currentTime: current, duration })}
                          seekTrigger={seekTrigger}
                        />

                        {/* Linha do Tempo das Anotações Interativa */}
                        {videoProgress.duration > 0 && (
                          <div className="space-y-2 select-none bg-card border border-border p-4 rounded-2xl shadow-sm animate-fade-in">
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
                              {analysisNotes.map((note) => {
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

                        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-2.5 text-left shadow-sm">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                            {selectedVideo.module_title}
                          </span>
                          <h3 className="text-lg font-black text-foreground leading-tight">
                            {selectedVideo.title}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Vídeo-análise detalhada para estudo técnico e melhoria da sua dança. Acompanhe a postura, tempo e variações de passos demonstradas passo a passo.
                          </p>
                        </div>

                        {/* Seção de Anotações/Comentários da Análise */}
                        <NotesSection
                          lessonId={selectedVideo.id}
                          currentTime={videoProgress.currentTime}
                          isAdmin={isAdmin}
                          onSeek={(sec) => setSeekTrigger({ seconds: sec, ts: Date.now() })}
                          onNotesLoaded={(notes) => setAnalysisNotes(notes)}
                          showToast={(message, type) => setToast({ message, type })}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted rounded-3xl flex items-center justify-center border border-border">
                        <p className="text-xs text-muted-foreground">Selecione uma análise para reproduzir</p>
                      </div>
                    )}
                  </div>

                  {/* Playlist / Lista Lateral (Direita - 1/3) */}
                  <div className="space-y-3.5">
                    <h3 className="text-[10px] font-bold text-muted-foreground/75 tracking-wider uppercase">
                      Vídeos Disponíveis ({videoAnalysisLessons.length})
                    </h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {videoAnalysisLessons.map((les) => {
                        const isSelected = selectedVideo?.id === les.id;
                        return (
                          <button
                            key={les.id}
                            onClick={() => setSelectedVideo(les)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3.5 items-start ${
                              isSelected 
                                ? 'bg-primary/5 border-primary/30 shadow-sm' 
                                : 'bg-card border-border hover:border-primary/20 hover:bg-sidebar-accent/50'
                            }`}
                          >
                            <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'} flex items-center justify-center`}>
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                                {les.module_title}
                              </span>
                              <h4 className={`text-xs font-bold leading-tight block truncate ${isSelected ? 'text-primary' : 'text-card-foreground'}`}>
                                {les.title}
                              </h4>
                              {les.duration_seconds > 0 && (
                                <span className="text-[9px] text-muted-foreground font-medium mt-1 block">
                                  {Math.floor(les.duration_seconds / 60)} min e {les.duration_seconds % 60} seg
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="col-span-full py-16 text-center bg-card border border-border rounded-3xl shadow-sm">
                  <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhuma vídeo-análise disponível no momento.</p>
                </div>
              )}
            </section>
          )}

          {/* Rodapé Interno */}
          <footer className="border-t border-border/60 pt-8 text-center text-muted-foreground text-xs">
            <p>&copy; {new Date().getFullYear()} Forroflix. Todos os direitos reservados.</p>
          </footer>
        </main>
        
        {/* Painel Lateral (Direita) */}
        <aside className="w-full lg:w-90 bg-sidebar text-sidebar-foreground border-t lg:border-t-0 lg:border-l border-sidebar-border p-6 space-y-8 shrink-0">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shadow-md">
                {user.full_name?.substring(0, 2).toUpperCase() || 'AL'}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-sidebar-foreground/90 block">
                  {user.full_name || 'Aluno'}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {user.role === 'admin' ? 'Administrador' : 'Estudante'}
                </span>
              </div>
            </div>
          </div>

          {/* Estatísticas Rápidas Lateral */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-muted-foreground/75 tracking-wider uppercase text-left">
              Seu Progresso Geral
            </h3>
            
            <div className="space-y-3.5">
              <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/60 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-muted-foreground block">AULAS CONCLUÍDAS</span>
                  <span className="text-base font-black text-sidebar-foreground">{totalCompletedLessons} aulas</span>
                </div>
                <CheckCircle className="w-5 h-5 text-primary/70" />
              </div>

              <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/60 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-muted-foreground block">CURSOS EM ANDAMENTO</span>
                  <span className="text-base font-black text-sidebar-foreground">{coursesInProgress} cursos</span>
                </div>
                <Activity className="w-5 h-5 text-primary/70" />
              </div>
            </div>
          </div>
        </aside>
      </div>
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[9999] p-4 rounded-2xl shadow-xl border transition-all duration-300 animate-fade-in flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-950/20' :
          toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white shadow-rose-950/20' :
          'bg-slate-800 border-slate-700 text-white shadow-slate-950/20'
        }`}>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
