'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Settings, Play, Home as HomeIcon, BookOpen, 
  User, Search, Star, CheckCircle, Activity, ChevronRight,
  Sun, Moon
} from 'lucide-react';

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
  initialTab?: 'catalog' | 'favorites' | 'progress';
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
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'favorites' | 'progress'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Local state for courses
  const [courses] = useState<CourseItem[]>(coursesList);

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
      <aside className="w-20 hidden md:flex flex-col items-center py-8 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shrink-0 z-40 justify-between">
        <div className="flex flex-col items-center gap-10 w-full">
          {/* Logo compacta / Emblema F */}
          <button onClick={() => setActiveTab('catalog')} className="group flex items-center justify-center cursor-pointer">
            <span className="font-black text-3xl tracking-tighter text-red-600 transition-transform group-hover:scale-110 drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">
              F
            </span>
          </button>

          {/* Menus */}
          <nav className="flex flex-col items-center gap-6 w-full">
            <button 
              onClick={() => setActiveTab('catalog')} 
              className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'catalog' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Catálogo"
            >
              <HomeIcon className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setActiveTab('favorites')} 
              className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'favorites' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Aulas Salvas"
            >
              <BookOpen className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setActiveTab('progress')} 
              className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'progress' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-sidebar-accent'}`} 
              title="Meu Progresso"
            >
              <User className="w-5 h-5" />
            </button>

            {isAdmin && (
              <Link 
                href="/admin" 
                className="p-3 rounded-xl transition-all text-muted-foreground hover:text-primary hover:bg-sidebar-accent"
                title="Painel Admin"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </nav>
        </div>

        {/* Base da Sidebar: Theme Toggle & Logout */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Botão de Alternar Tema */}
          <button 
            onClick={toggleTheme} 
            className="p-3 text-sidebar-foreground/70 hover:text-primary hover:bg-sidebar-accent rounded-xl transition-all cursor-pointer"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Logout */}
          <form action="/api/auth/logout" method="POST" className="w-full flex justify-center">
            <button type="submit" className="p-3 text-sidebar-foreground/70 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer" title="Sair">
              <LogOut className="w-5 h-5" />
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
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'favorites' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'progress' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
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
            <>
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
                        className="relative rounded-3xl overflow-hidden border border-border shadow-md dark:shadow-2xl min-h-[260px] md:aspect-[7/2] w-full flex items-center justify-start group cursor-pointer hover:border-primary/20 hover:shadow-lg dark:hover:shadow-[0_0_35px_rgba(229,9,20,0.06)] hover:scale-[1.005] transition-all duration-300"
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
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-1015" 
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
            </>
          )}

          {/* VIEW: FAVORITES */}
          {activeTab === 'favorites' && (
            <section className="space-y-6 text-left">
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
            <section className="space-y-6 text-left">
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
    </div>
  );
}
