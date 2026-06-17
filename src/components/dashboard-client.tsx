'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Settings, Play, Home as HomeIcon, BookOpen, 
  User, Bell, Search, Star, CheckCircle, Activity, ChevronRight,
  Sun, Moon, Loader2, Plus, FolderPlus, Pencil
} from 'lucide-react';
import { CourseEditor } from './admin/course-editor';

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
  cover_vertical_position?: string | null;
  cover_horizontal_position?: string | null;
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
  initialTab?: 'catalog' | 'favorites' | 'progress' | 'settings';
  initialEditingCourseId?: string | null;
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
  initialEditingCourseId = null
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'favorites' | 'progress' | 'settings'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Local state for courses so it updates dynamically on course creation/edit
  const [courses, setCourses] = useState<CourseItem[]>(coursesList);

  // States for dynamic admin course modules/lessons editing within the dashboard
  const [editingCourseId, setEditingCourseId] = useState<string | null>(initialEditingCourseId);
  const [editingCourseData, setEditingCourseData] = useState<{ title: string; slug: string; modules: any[] } | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  // States for course creation modal inside settings tab
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newGradient, setNewGradient] = useState('from-red-600 to-red-600');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // States for metadata editing modal inside settings tab
  const [metadataEditCourse, setMetadataEditCourse] = useState<CourseItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editGradient, setEditGradient] = useState('');
  const [editCoverVertical, setEditCoverVertical] = useState('');
  const [editCoverHorizontal, setEditCoverHorizontal] = useState('');
  const [editCoverVerticalPosition, setEditCoverVerticalPosition] = useState('50% 50%');
  const [editCoverHorizontalPosition, setEditCoverHorizontalPosition] = useState('50% 50%');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editHideTitle, setEditHideTitle] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Synchronize edit state when metadataEditCourse is set
  useEffect(() => {
    if (metadataEditCourse) {
      setEditTitle(metadataEditCourse.title || '');
      setEditDescription(metadataEditCourse.description || '');
      setEditSlug(metadataEditCourse.slug || '');
      setEditGradient(metadataEditCourse.thumbnail_gradient || 'from-red-600 to-red-600');
      setEditCoverVertical(metadataEditCourse.cover_vertical || '');
      setEditCoverHorizontal(metadataEditCourse.cover_horizontal || '');
      setEditCoverVerticalPosition(metadataEditCourse.cover_vertical_position || '50% 50%');
      setEditCoverHorizontalPosition(metadataEditCourse.cover_horizontal_position || '50% 50%');
      setEditIsFeatured(metadataEditCourse.is_featured === 1);
      setEditHideTitle(metadataEditCourse.hide_title === 1);
      setEditError(null);
    }
  }, [metadataEditCourse]);

  // Handler to toggle featured course
  const handleToggleFeatured = async (courseId: string) => {
    const currentCourse = courses.find(c => c.id === courseId);
    const nextFeaturedState = currentCourse?.is_featured === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'toggle_featured',
          id: courseId,
          is_featured: nextFeaturedState
        })
      });
      if (!res.ok) throw new Error('Erro ao destacar curso');
      // Local state update
      setCourses(prev => prev.map(c => ({
        ...c,
        is_featured: c.id === courseId ? nextFeaturedState : 0
      })));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao atualizar destaque.');
    }
  };

  // Handler to save metadata modifications
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadataEditCourse) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course_metadata',
          id: metadataEditCourse.id,
          title: editTitle,
          description: editDescription,
          slug: editSlug,
          thumbnail_gradient: editGradient,
          cover_vertical: editCoverVertical || null,
          cover_horizontal: editCoverHorizontal || null,
          cover_vertical_position: editCoverVerticalPosition,
          cover_horizontal_position: editCoverHorizontalPosition,
          is_featured: editIsFeatured ? 1 : 0,
          hide_title: editHideTitle ? 1 : 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar metadados.');

      setCourses(prev => prev.map(c => {
        if (c.id === metadataEditCourse.id) {
          return {
            ...c,
            title: editTitle,
            description: editDescription,
            slug: editSlug,
            thumbnail_gradient: editGradient,
            cover_vertical: editCoverVertical || null,
            cover_horizontal: editCoverHorizontal || null,
            cover_vertical_position: editCoverVerticalPosition,
            cover_horizontal_position: editCoverHorizontalPosition,
            is_featured: editIsFeatured ? 1 : 0,
            hide_title: editHideTitle ? 1 : 0
          };
        }
        if (editIsFeatured && c.id !== metadataEditCourse.id) {
          return { ...c, is_featured: 0 };
        }
        return c;
      }));
      setMetadataEditCourse(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setEditLoading(false);
    }
  };

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

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (metadataEditCourse || showCreateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [metadataEditCourse, showCreateModal]);

  // Fetch course detail dynamically for editing inside settings tab
  useEffect(() => {
    if (editingCourseId) {
      setLoadingCourse(true);
      fetch(`/api/admin/courses?courseId=${editingCourseId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error(data.error);
          } else {
            setEditingCourseData(data);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingCourse(false));
    } else {
      setEditingCourseData(null);
    }
  }, [editingCourseId]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const generatedSlug = newSlug || newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course',
          title: newTitle,
          description: newDescription,
          slug: generatedSlug,
          thumbnail_gradient: newGradient
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar curso.');
      }

      const newCourse: CourseItem = {
        id: data.id,
        title: newTitle,
        description: newDescription || 'Curso recém-criado no painel administrativo.',
        slug: generatedSlug,
        thumbnail_gradient: newGradient,
        center_text: newTitle.split(' - ')[0].toUpperCase(),
        label: 'Curso Online',
        total_lessons: 0,
        completed_lessons: 0,
        progress_percent: 0
      };

      setCourses(prev => [newCourse, ...prev]);
      setShowCreateModal(false);
      
      setNewTitle('');
      setNewDescription('');
      setNewSlug('');
      setNewGradient('from-red-600 to-red-600');
    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || 'Falha ao criar curso.');
    } finally {
      setCreateLoading(false);
    }
  };

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

  // Filter courses based on local courses state
  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtrar favoritos com base no input
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
              <button 
                onClick={() => { setActiveTab('settings'); setEditingCourseId(null); }}
                className={`p-3 rounded-xl transition-all cursor-pointer ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary hover:bg-sidebar-accent'}`}
                title="Painel Admin"
              >
                <Settings className="w-5 h-5" />
              </button>
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

      {/* Wrapper principal: central + lateral direita (rolam integrados sem scrolls internos) */}
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
              <Button 
                onClick={() => { setActiveTab('settings'); setEditingCourseId(null); }}
                variant="outline" 
                className={`border-primary/20 hover:bg-primary/10 gap-1.5 text-[10px] py-1.5 px-3 rounded-xl cursor-pointer ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-sidebar-foreground/70 hover:text-primary'}`}
              >
                <Settings className="w-3 h-3" />
                Admin
              </Button>
            )}
          </div>
        </header>

        {/* Área Principal (Centro) */}
        <main className="flex-grow px-4 sm:px-6 md:px-8 py-8 space-y-8 w-full">
          
          {/* Saudação do Aluno no Topo (Acima de tudo no centro) */}
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
                        {/* Link de sobreposição absoluto no topo de tudo para garantir navegabilidade de todos os elementos */}
                        <Link 
                          href={`/courses/${featuredCourse.slug}`}
                          className="absolute inset-0 z-30 rounded-3xl"
                        />
                        {featuredCourse.cover_horizontal ? (
                          <>
                            {/* Imagem de Fundo (Capa Horizontal Completa) */}
                            <img 
                              src={featuredCourse.cover_horizontal} 
                              alt="" 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.015]" 
                              style={{ objectPosition: featuredCourse.cover_horizontal_position || '50% 50%' }}
                            />
                            {/* Gradiente escuro para contraste e legibilidade das letras */}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/60 to-transparent z-10" />
                            
                            {/* Textos com contraste aumentado em branco */}
                            <div className="relative z-20 p-6 md:p-8 max-w-md md:max-w-lg text-left space-y-4 text-white flex flex-col justify-end min-h-[260px] md:min-h-0 md:h-full w-full">
                              {!featuredCourse.hide_title && (
                                <div className="space-y-2">
                                  <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                                    {featuredCourse.title}
                                  </h3>
                                  <p className="text-xs md:text-sm text-white/80 line-clamp-2 leading-relaxed drop-shadow-sm">
                                    {featuredCourse.description || 'Aulas exclusivas do Forroflix.'}
                                  </p>
                                </div>
                              )}
                              <div className="bg-primary group-hover:bg-primary/95 text-white font-bold text-xs flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all w-fit duration-200">
                                <Play className="w-3.5 h-3.5 fill-current" />
                                ACESSAR
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Layout de Fallback sem capa */}
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
                      {/* Link de sobreposição absoluto */}
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
                            {/* Fallback sem título para capas */}
                            <span className="font-black text-3xl tracking-tighter text-white/20 select-none">
                              F
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                        
                        {/* Overlay do Progresso no rodapé da imagem */}
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
          )}            {/* VIEW: PROGRESS */}
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
                    
                    {/* Ring Progress Grande */}
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

          {/* VIEW: SETTINGS (Painel Admin/Criador) */}
          {activeTab === 'settings' && (
            <section className="space-y-6 text-left">
              {!isAdmin ? (
                <div className="bg-card border border-border rounded-3xl p-8 text-center max-w-md mx-auto space-y-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
                    <Settings className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Acesso Restrito</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Você não tem permissão para acessar o painel de gerenciamento de cursos.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('catalog')} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                  >
                    Voltar ao Catálogo
                  </Button>
                </div>
              ) : editingCourseId ? (
                loadingCourse ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Carregando dados do editor...</span>
                  </div>
                ) : editingCourseData ? (
                  <CourseEditor
                    courseId={editingCourseId}
                    courseTitle={editingCourseData.title}
                    courseSlug={editingCourseData.slug}
                    initialModules={editingCourseData.modules}
                    onBack={() => {
                      setEditingCourseId(null);
                      setEditingCourseData(null);
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Erro ao carregar dados do curso.
                    <button 
                      onClick={() => setEditingCourseId(null)}
                      className="ml-2 text-primary font-bold hover:underline"
                    >
                      Voltar
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {/* Cabeçalho do Painel Admin */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                    <div className="text-left space-y-1">
                      <h2 className="text-xl font-black text-foreground">Painel do Criador</h2>
                      <p className="text-xs text-muted-foreground">
                        Gerencie os cursos, módulos e envie novas vídeoaulas para seus alunos.
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-primary/10 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Novo Curso
                    </Button>
                  </div>

                  {/* Grid de Cursos para Admin */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <div 
                        key={course.id}
                        onClick={() => setEditingCourseId(course.id)}
                        className="bg-card border border-border hover:border-primary/20 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 relative group cursor-pointer"
                      >
                        <div className={`w-full aspect-[2.1/1] rounded-2xl bg-gradient-to-br ${course.thumbnail_gradient} p-4 flex flex-col justify-between mb-4 relative overflow-hidden border border-border/10 shadow-inner`}>
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFeatured(course.id);
                            }}
                            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/65 text-white hover:scale-105 rounded-xl transition-all z-30 cursor-pointer"
                            title={course.is_featured === 1 ? "Remover destaque" : "Destacar Curso"}
                          >
                            <Star className={`w-3.5 h-3.5 ${course.is_featured === 1 ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                          </button>
                          
                          <div className="flex-grow flex items-center justify-center text-center select-none py-2">
                            <span className="text-sm font-black tracking-tight text-white leading-tight drop-shadow-md">
                              {course.title.split(' - ')[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[8px] font-semibold text-white/50 tracking-wider uppercase">
                            <span>{course.total_lessons || 0} aulas</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1 text-left">
                            <h3 className="text-sm font-extrabold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                              {course.title}
                            </h3>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {course.description || 'Sem descrição cadastrada.'}
                            </p>
                          </div>
                          
                          <div className="flex gap-2 w-full">
                            <div className="flex-grow bg-secondary border border-border group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center gap-2 transition-all duration-200 text-xs py-2 rounded-xl text-card-foreground font-bold">
                              <Settings className="w-3.5 h-3.5" />
                              GERENCIAR CONTEÚDO
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setMetadataEditCourse(course);
                              }}
                              className="p-2.5 bg-secondary border border-border hover:bg-primary/10 hover:text-primary rounded-xl text-card-foreground transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Editar Metadados"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {courses.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground text-xs">
                      Nenhum curso cadastrado ainda. Comece criando um!
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Rodapé Interno */}
          <footer className="border-t border-border/60 pt-8 text-center text-muted-foreground text-xs">
            <p>&copy; {new Date().getFullYear()} Forroflix. Todos os direitos reservados.</p>
          </footer>
        </main>
        
        {/* Painel Lateral (Direita) - Integrado para rolar junto (oculto em settings) */}
        {activeTab !== 'settings' && (
          <aside className="w-full lg:w-90 bg-sidebar text-sidebar-foreground border-t lg:border-t-0 lg:border-l border-sidebar-border p-6 space-y-8 shrink-0">
            
            {/* Top Header do Painel (Apenas Avatar & Notificações com tema integrado) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shadow-md">
                  {user.full_name?.substring(0, 2).toUpperCase() || 'AL'}
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Meu Perfil</span>
                  <span className="text-xs font-black text-sidebar-foreground block truncate max-w-[150px]">
                    {user.full_name || 'Aluno'}
                  </span>
                </div>
              </div>
              
              {/* Bell Notification */}
              <button className="relative p-2.5 bg-card border border-border hover:border-border/80 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer shadow-sm">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
              </button>
            </div>

            {/* MEU PROGRESSO (Circular Cards à lá Lacourse Mockup) */}
            <div className="space-y-4 text-left">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Meu Progresso
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {coursesList.slice(0, 3).map((course) => (
                  <div 
                    key={course.id} 
                    onClick={() => setActiveTab('progress')}
                    className="bg-card border border-border hover:border-primary/30 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm cursor-pointer transition-all hover:scale-[1.03]"
                    title={course.title}
                  >
                    {/* Progress Ring */}
                    <div className="relative w-12 h-12 flex items-center justify-center select-none">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          className="stroke-secondary"
                          strokeWidth="3.5"
                          fill="transparent"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="19"
                          className="stroke-primary transition-all duration-350"
                          strokeWidth="3.5"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 19}
                          strokeDashoffset={2 * Math.PI * 19 * (1 - course.progress_percent / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[8px] font-black text-card-foreground">
                        {course.progress_percent}%
                      </span>
                    </div>
                    <span className="text-[9px] font-extrabold text-card-foreground mt-2 line-clamp-1 block w-full text-center">
                      {course.title.split(' - ')[0]}
                    </span>
                  </div>
                ))}
                {coursesList.length === 0 && (
                  <div className="col-span-full py-4 text-center text-muted-foreground text-xs">
                    Sem cursos registrados.
                  </div>
                )}
              </div>
            </div>

            {/* AULAS SALVAS (Saved Lessons Sidebar Playlist) */}
            <div className="space-y-4 text-left">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                Aulas Salvas
              </h2>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                {favoritesList.length > 0 ? (
                  favoritesList.slice(0, 4).map((fav) => (
                    <div 
                      key={fav.id}
                      className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-border/80 transition-all group relative cursor-pointer"
                    >
                      <Link href={`/courses/${fav.course_slug}/${fav.id}`} className="absolute inset-0 z-10 rounded-2xl" />

                      <div className="min-w-0 flex items-center gap-3 w-full">
                        <div className="w-10 h-10 shrink-0 bg-secondary border border-border rounded-xl overflow-hidden relative flex items-center justify-center group-hover:border-primary/20 transition-all">
                          {pullZone && fav.video_id ? (
                            <img
                              src={`https://vz-${pullZone}.b-cdn.net/${fav.video_id}/thumbnail.jpg`}
                              alt=""
                              className="w-full h-full object-cover opacity-80 dark:opacity-60 group-hover:opacity-100 transition-all duration-300"
                              loading="lazy"
                            />
                          ) : null}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/40 group-hover:bg-primary/10">
                            <Play className="w-3 h-3 fill-current text-white scale-90 group-hover:scale-100 transition-all animate-pulse" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-grow">
                          <h4 className="text-[11px] font-black text-card-foreground hover:text-primary transition-colors line-clamp-1 leading-snug">
                            {fav.title}
                          </h4>
                          <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wide block truncate">
                            {fav.course_title}
                          </span>
                        </div>
                        
                        <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
                    <p className="text-[10px] text-muted-foreground italic">Nenhuma aula salva.</p>
                  </div>
                )}
              </div>

              {favoritesList.length > 0 && (
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className="w-full bg-card hover:bg-secondary border border-border text-muted-foreground hover:text-primary text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer text-center block w-full shadow-sm"
                >
                  VER TODAS AS AULAS SALVAS
                </button>
              )}
            </div>

          </aside>
        )}

      </div>

      {/* Modal - Criar Novo Curso */}
      {showCreateModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div 
            className="bg-card border border-border w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left"
            style={{ maxHeight: '75vh' }}
          >
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                Criar Novo Curso de Forró
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-5 overflow-y-auto min-h-0 flex-grow">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Forró Roots Avançado"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Descrição Curta</label>
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Resumo sobre o que o aluno vai aprender..."
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">URL Slug (Opcional)</label>
                  <input 
                    type="text" 
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="forro-roots-avancado"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Paleta Visual (Degradê)</label>
                  <select 
                    value={newGradient}
                    onChange={(e) => setNewGradient(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="from-red-600 to-red-600">Laranja a Vermelho (Quente)</option>
                    <option value="from-violet-600 to-pink-500">Violeta a Rosa (Charmoso)</option>
                    <option value="from-blue-600 to-cyan-500">Azul a Ciano (Roots)</option>
                    <option value="from-emerald-500 to-teal-600">Esmeralda a Teal</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="border-border hover:bg-secondary text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : 'Criar Curso'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Editar Metadados do Curso */}
      {metadataEditCourse && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setMetadataEditCourse(null);
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-10 animate-modal-backdrop"
        >
          <div 
            className="bg-card border border-border w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-modal-content text-left my-auto"
            style={{ maxHeight: '70vh' }}
          >
            <div className="p-6 border-b border-border bg-secondary/60 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Detalhes do Curso
              </h3>
              <button 
                onClick={() => setMetadataEditCourse(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-grow">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Forró Roots Avançado"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Descrição Curta</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Resumo sobre o que o aluno vai aprender..."
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">URL Slug</label>
                  <input 
                    type="text" 
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="forro-roots-avancado"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Paleta Visual (Degradê)</label>
                  <select 
                    value={editGradient}
                    onChange={(e) => setEditGradient(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="from-red-600 to-red-600">Laranja a Vermelho (Quente)</option>
                    <option value="from-violet-600 to-pink-500">Violeta a Rosa (Charmoso)</option>
                    <option value="from-blue-600 to-cyan-500">Azul a Ciano (Roots)</option>
                    <option value="from-emerald-500 to-teal-600">Esmeralda a Teal</option>
                  </select>
                </div>
              </div>

              {/* Capa Vertical (4:5) */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold text-muted-foreground">Capa Vertical (Proporção 4:5)</label>
                
                {editCoverVertical ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ajuste de Enquadramento (Arrastar Imagem)</span>
                      <div 
                        className="relative w-full max-w-[130px] aspect-[4/5] mx-auto rounded-2xl overflow-hidden border border-border bg-secondary shadow-inner select-none cursor-move group"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const initialX = e.clientX;
                          const initialY = e.clientY;
                          const currentPos = editCoverVerticalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - initialX;
                            const deltaY = moveEvent.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditCoverVerticalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
                          };

                          const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                          };

                          window.addEventListener('mousemove', handleMouseMove);
                          window.addEventListener('mouseup', handleMouseUp);
                        }}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          const rect = e.currentTarget.getBoundingClientRect();
                          const initialX = touch.clientX;
                          const initialY = touch.clientY;
                          const currentPos = editCoverVerticalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const moveTouch = moveEvent.touches[0];
                            const deltaX = moveTouch.clientX - initialX;
                            const deltaY = moveTouch.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditCoverVerticalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
                          };

                          const handleTouchEnd = () => {
                            window.removeEventListener('touchmove', handleTouchMove);
                            window.removeEventListener('touchend', handleTouchEnd);
                          };

                          window.addEventListener('touchmove', handleTouchMove, { passive: true });
                          window.addEventListener('touchend', handleTouchEnd);
                        }}
                      >
                        <img 
                          src={editCoverVertical} 
                          alt="" 
                          className="w-full h-full object-cover pointer-events-none"
                          style={{ objectPosition: editCoverVerticalPosition || '50% 50%' }}
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black pointer-events-none p-3 text-center leading-tight">
                          <span>Arraste a imagem para enquadrar</span>
                          <span className="text-[8px] text-white/75 mt-1 font-semibold">{editCoverVerticalPosition || '50% 50%'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <label className="text-[10px] bg-secondary border border-border text-foreground hover:bg-primary/15 hover:text-primary font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        Alterar Foto
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setEditCoverVertical(event.target?.result as string);
                                setEditCoverVerticalPosition('50% 50%');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditCoverVertical('');
                          setEditCoverVerticalPosition('50% 50%');
                        }}
                        className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/45 rounded-2xl p-4 cursor-pointer bg-secondary/30 hover:bg-primary/5 transition-all group select-none max-w-[200px] mx-auto"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditCoverVertical(event.target?.result as string);
                          setEditCoverVerticalPosition('50% 50%');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">Enviar Capa Vertical (4:5)</span>
                    <span className="text-[9px] text-muted-foreground/60 mt-1">Clique para buscar ou arraste o arquivo aqui</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditCoverVertical(event.target?.result as string);
                            setEditCoverVerticalPosition('50% 50%');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Capa Horizontal (7:2) */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold text-muted-foreground">Capa Horizontal (Widescreen - Destaque 7:2)</label>
                
                {editCoverHorizontal ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ajuste de Enquadramento (Arrastar Imagem)</span>
                      <div 
                        className="relative w-full max-w-[320px] aspect-[7/2] mx-auto rounded-2xl overflow-hidden border border-border bg-secondary shadow-inner select-none cursor-move group"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const initialX = e.clientX;
                          const initialY = e.clientY;
                          const currentPos = editCoverHorizontalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - initialX;
                            const deltaY = moveEvent.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditCoverHorizontalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
                          };

                          const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                          };

                          window.addEventListener('mousemove', handleMouseMove);
                          window.addEventListener('mouseup', handleMouseUp);
                        }}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          const rect = e.currentTarget.getBoundingClientRect();
                          const initialX = touch.clientX;
                          const initialY = touch.clientY;
                          const currentPos = editCoverHorizontalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const moveTouch = moveEvent.touches[0];
                            const deltaX = moveTouch.clientX - initialX;
                            const deltaY = moveTouch.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditCoverHorizontalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
                          };

                          const handleTouchEnd = () => {
                            window.removeEventListener('touchmove', handleTouchMove);
                            window.removeEventListener('touchend', handleTouchEnd);
                          };

                          window.addEventListener('touchmove', handleTouchMove, { passive: true });
                          window.addEventListener('touchend', handleTouchEnd);
                        }}
                      >
                        <img 
                          src={editCoverHorizontal} 
                          alt="" 
                          className="w-full h-full object-cover pointer-events-none"
                          style={{ objectPosition: editCoverHorizontalPosition || '50% 50%' }}
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black pointer-events-none p-3 text-center leading-tight">
                          <span>Arraste a imagem para enquadrar</span>
                          <span className="text-[8px] text-white/75 mt-1 font-semibold">{editCoverHorizontalPosition || '50% 50%'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2">
                      <label className="text-[10px] bg-secondary border border-border text-foreground hover:bg-primary/15 hover:text-primary font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                        Alterar Foto
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setEditCoverHorizontal(event.target?.result as string);
                                setEditCoverHorizontalPosition('50% 50%');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditCoverHorizontal('');
                          setEditCoverHorizontalPosition('50% 50%');
                        }}
                        className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label 
                    className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/45 rounded-2xl p-4 cursor-pointer bg-secondary/30 hover:bg-primary/5 transition-all group select-none max-w-[320px] mx-auto"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setEditCoverHorizontal(event.target?.result as string);
                          setEditCoverHorizontalPosition('50% 50%');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">Enviar Capa Horizontal (7:2)</span>
                    <span className="text-[9px] text-muted-foreground/60 mt-1">Clique para buscar ou arraste o arquivo aqui</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditCoverHorizontal(event.target?.result as string);
                            setEditCoverHorizontalPosition('50% 50%');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="editIsFeatured"
                    checked={editIsFeatured}
                    onChange={(e) => setEditIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary cursor-pointer"
                  />
                  <label htmlFor="editIsFeatured" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                    Marcar este curso como destaque do catálogo
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="editHideTitle"
                    checked={editHideTitle}
                    onChange={(e) => setEditHideTitle(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary cursor-pointer"
                  />
                  <label htmlFor="editHideTitle" className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                    Não exibir o nome em texto do curso (apenas a capa)
                  </label>
                </div>
              </div>

              {editError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setMetadataEditCourse(null)}
                  className="border-border hover:bg-secondary text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={editLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
