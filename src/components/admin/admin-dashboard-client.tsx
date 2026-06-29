'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  LogOut, Play, BookOpen, Users, FolderPlus, ArrowLeft,
  Settings, Loader2, Plus, Star, Pencil, Trash2,
  ChevronLeft, ChevronRight, Sun, Moon
} from 'lucide-react';
import { UserManager } from './user-manager';

interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  thumbnail_gradient: string;
  cover_vertical?: string | null;
  cover_horizontal?: string | null;
  cover_background?: string | null;
  cover_vertical_position?: string | null;
  cover_horizontal_position?: string | null;
  cover_background_position?: string | null;
  is_featured?: number;
  hide_title?: number;
}

interface AdminDashboardClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  initialCourses: CourseItem[];
  initialUsersList: any[];
  pullZone: string;
}

export function AdminDashboardClient({
  user,
  initialCourses,
  initialUsersList,
  pullZone
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'users'>('courses');
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  // Carregar e aplicar o tema atual
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

  const handleMoveCourse = async (index: number, direction: 'left' | 'right') => {
    const newCourses = [...courses];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;
    
    // Trocar de posição no array
    const temp = newCourses[index];
    newCourses[index] = newCourses[targetIndex];
    newCourses[targetIndex] = temp;
    
    setCourses(newCourses);
    
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reorder_courses',
          courseIds: newCourses.map(c => c.id)
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar reordenação dos cursos.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao salvar a nova ordem dos cursos.');
    }
  };
  
  // States para criação de curso
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newGradient, setNewGradient] = useState('from-red-600 to-red-600');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // States para edição de metadados do curso
  const [metadataEditCourse, setMetadataEditCourse] = useState<CourseItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editGradient, setEditGradient] = useState('');
  const [editCoverVertical, setEditCoverVertical] = useState('');
  const [editCoverHorizontal, setEditCoverHorizontal] = useState('');
  const [editCoverBackground, setEditCoverBackground] = useState('');
  const [editCoverVerticalPosition, setEditCoverVerticalPosition] = useState('50% 50%');
  const [editCoverHorizontalPosition, setEditCoverHorizontalPosition] = useState('50% 50%');
  const [editCoverBackgroundPosition, setEditCoverBackgroundPosition] = useState('50% 50%');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editHideTitle, setEditHideTitle] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (metadataEditCourse) {
      setEditTitle(metadataEditCourse.title || '');
      setEditDescription(metadataEditCourse.description || '');
      setEditSlug(metadataEditCourse.slug || '');
      setEditGradient(metadataEditCourse.thumbnail_gradient || 'from-red-600 to-red-600');
      setEditCoverVertical(metadataEditCourse.cover_vertical || '');
      setEditCoverHorizontal(metadataEditCourse.cover_horizontal || '');
      setEditCoverBackground(metadataEditCourse.cover_background || '');
      setEditCoverVerticalPosition(metadataEditCourse.cover_vertical_position || '50% 50%');
      setEditCoverHorizontalPosition(metadataEditCourse.cover_horizontal_position || '50% 50%');
      setEditCoverBackgroundPosition(metadataEditCourse.cover_background_position || '50% 50%');
      setEditIsFeatured(metadataEditCourse.is_featured === 1);
      setEditHideTitle(metadataEditCourse.hide_title === 1);
      setEditError(null);
    }
  }, [metadataEditCourse]);

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
      setCourses(prev => prev.map(c => ({
        ...c,
        is_featured: c.id === courseId ? nextFeaturedState : 0
      })));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao atualizar destaque.');
    }
  };

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
          cover_background: editCoverBackground || null,
          cover_vertical_position: editCoverVerticalPosition,
          cover_horizontal_position: editCoverHorizontalPosition,
          cover_background_position: editCoverBackgroundPosition,
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
            cover_background: editCoverBackground || null,
            cover_vertical_position: editCoverVerticalPosition,
            cover_horizontal_position: editCoverHorizontalPosition,
            cover_background_position: editCoverBackgroundPosition,
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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    const generatedSlug = newSlug || newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

    try {
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
      if (!res.ok) throw new Error(data.error || 'Erro ao criar curso.');

      const newCourse: CourseItem = {
        id: data.id,
        title: newTitle,
        description: newDescription,
        slug: generatedSlug,
        thumbnail_gradient: newGradient,
        is_featured: 0
      };

      setCourses(prev => [newCourse, ...prev]);
      setShowCreateModal(false);
      
      // Limpar campos
      setNewTitle('');
      setNewDescription('');
      setNewSlug('');
      setNewGradient('from-red-600 to-red-600');
    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || 'Erro ao criar curso.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Deseja realmente excluir este curso e todas as suas aulas permanentemente? Essa ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${courseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir curso.');
      
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Falha ao excluir curso.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header Admin */}
      <header className="border-b border-border bg-card/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 group text-red-500 hover:text-red-400">
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold hidden md:inline">Voltar para Site</span>
            </a>
            <span className="text-border">|</span>
            <span className="font-extrabold text-base text-foreground">Painel do Criador</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">Admin: {user.email}</span>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            {activeTab === 'courses' && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold gap-2 px-4 py-2 rounded-xl text-xs"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Curso
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-6">
        
        {/* Sub-Tabs Selector */}
        <div className="flex gap-2 p-1 bg-muted/40 border border-border rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-1.5" />
            Cursos & Aulas
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Usuários & Acessos
          </button>
        </div>

        {activeTab === 'courses' ? (
          <div className="space-y-6">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-black text-foreground">Todos os Cursos</h2>
              <p className="text-xs text-muted-foreground">
                Selecione um curso para gerenciar os módulos, as vídeoaulas e as configurações de capap.
              </p>
            </div>

            {/* Grid de Cursos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, idx) => (
                <div 
                  key={course.id}
                  className="bg-card border border-border rounded-3xl p-5 flex flex-col justify-between shadow-sm relative group hover:border-primary/20 hover:shadow-md transition-all duration-300 animate-fade-in"
                >
                  <div className={`w-full aspect-[2.1/1] rounded-2xl bg-gradient-to-br ${course.thumbnail_gradient} p-4 flex flex-col justify-between mb-4 relative overflow-hidden border border-border/40 shadow-inner`}>
                    {course.cover_horizontal ? (
                      <Image
                        src={course.cover_horizontal}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="absolute inset-0 object-cover transition-transform duration-500 group-hover:scale-[1.03] z-0"
                        style={{ objectPosition: course.cover_horizontal_position || '50% 50%' }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 z-10" />

                    {/* Destaque & Reordenação */}
                    <div className="flex justify-between items-start w-full relative z-20">
                      <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
                        <button
                          onClick={() => handleMoveCourse(idx, 'left')}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Mover para trás"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveCourse(idx, 'right')}
                          disabled={idx === courses.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Mover para frente"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleToggleFeatured(course.id)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            course.is_featured === 1 
                              ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' 
                              : 'bg-black/60 border-white/5 text-slate-400 hover:text-white'
                          }`}
                          title={course.is_featured === 1 ? 'Destaque Ativo' : 'Tornar Destaque'}
                        >
                          <Star className={`w-3.5 h-3.5 ${course.is_featured === 1 ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-1.5 rounded-lg bg-black/60 border border-white/5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir Curso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-white relative z-20 leading-tight select-none">
                      {course.title}
                    </h3>
                  </div>

                  <div className="flex-grow flex flex-col justify-between gap-4 text-left">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                      {course.description || 'Sem descrição cadastrada.'}
                    </p>

                    <div className="flex gap-2">
                      <Link 
                        href={`/admin/courses/${course.id}`} 
                        className="flex-grow flex items-center justify-center w-full bg-secondary hover:bg-secondary/80 hover:text-primary text-card-foreground font-bold border border-border text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
                      >
                        Editar Aulas
                      </Link>
                      <Button 
                        onClick={() => setMetadataEditCourse(course)}
                        variant="outline" 
                        className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs py-2 px-3 rounded-xl cursor-pointer"
                        title="Editar Capa / Metadados"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl">
            <UserManager currentUserId={user.id} initialUsersList={initialUsersList} />
          </div>
        )}
      </main>

      {/* Modal: Criar Novo Curso */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-red-600" />
                Criar Novo Curso de Forró
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-350 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Forró Roots Avançado"
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 placeholder-slate-600 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Descrição Curta</label>
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Resumo das aulas do curso..."
                  rows={3}
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 placeholder-slate-600 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">URL Slug (Opcional)</label>
                  <input 
                    type="text" 
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="forro-roots-avancado"
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 placeholder-slate-600 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Paleta Visual (Degradê)</label>
                  <select 
                    value={newGradient}
                    onChange={(e) => setNewGradient(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs cursor-pointer"
                  >
                    <option value="from-red-600 to-red-600">Laranja a Vermelho (Quente)</option>
                    <option value="from-violet-600 to-pink-500">Violeta a Rosa (Charmoso)</option>
                    <option value="from-blue-600 to-cyan-500">Azul a Ciano (Roots)</option>
                    <option value="from-emerald-500 to-teal-600">Esmeralda a Teal</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[10px] text-red-400">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-800 hover:bg-slate-900 text-slate-400 text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLoading}
                  className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-5 text-xs"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : 'Criar Curso'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Metadados / Capas */}
      {metadataEditCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-600" />
                Editar Metadados & Capas
              </h3>
              <button 
                onClick={() => setMetadataEditCourse(null)}
                className="text-slate-500 hover:text-slate-350 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Descrição</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Slug da Rota</label>
                  <input 
                    type="text" 
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Paleta Visual (Degradê)</label>
                  <input 
                    type="text" 
                    required
                    value={editGradient}
                    onChange={(e) => setEditGradient(e.target.value)}
                    placeholder="from-red-600 to-red-605"
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-3 p-3.5 bg-slate-900/30 rounded-2xl border border-slate-900">
                <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Imagens de Capa (URLs)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Capa Vertical (Poster)</label>
                    <input 
                      type="text" 
                      value={editCoverVertical}
                      onChange={(e) => setEditCoverVertical(e.target.value)}
                      placeholder="/covers/course-vertical.jpg"
                      className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Capa Horizontal (Destaque Admin)</label>
                    <input 
                      type="text" 
                      value={editCoverHorizontal}
                      onChange={(e) => setEditCoverHorizontal(e.target.value)}
                      placeholder="/covers/course-horizontal.jpg"
                      className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Fundo do Banner (Desfocado)</label>
                    <input 
                      type="text" 
                      value={editCoverBackground}
                      onChange={(e) => setEditCoverBackground(e.target.value)}
                      placeholder="/covers/course-banner.jpg"
                      className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-2 text-slate-250 focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-650 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={editIsFeatured}
                    onChange={(e) => setEditIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-900 text-red-600 focus:ring-red-500 bg-[#0d0d14]"
                  />
                  <span>Destacar na Home</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={editHideTitle}
                    onChange={(e) => setEditHideTitle(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-900 text-red-600 focus:ring-red-500 bg-[#0d0d14]"
                  />
                  <span>Esconder Título</span>
                </label>
              </div>

              {editError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setMetadataEditCourse(null)}
                  className="border-slate-800 hover:bg-slate-900 text-slate-400 text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={editLoading}
                  className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-5 text-xs"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
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
