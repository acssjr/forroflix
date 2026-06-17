'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Music, Plus, Settings, FolderPlus, ArrowLeft, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_gradient: string;
}

interface AdminDashboardProps {
  initialCourses: Course[];
}

export function AdminDashboard({ initialCourses }: AdminDashboardProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [gradient, setGradient] = useState('from-red-600 to-red-600');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'course',
          title,
          description,
          slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
          thumbnail_gradient: gradient
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar curso.');
      }

      // Adicionar novo curso localmente na lista
      const newCourse: Course = {
        id: data.id,
        title,
        description,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
        thumbnail_gradient: gradient
      };

      setCourses(prev => [newCourse, ...prev]);
      setShowModal(false);
      
      // Limpar formulário
      setTitle('');
      setDescription('');
      setSlug('');
      setGradient('from-red-600 to-red-600');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao criar curso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col animate-page-enter">
      {/* Admin Header */}
      <header className="border-b border-slate-900 bg-[#07070a]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group text-red-500 hover:text-red-400">
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold hidden md:inline">Voltar para Site</span>
            </Link>
            <span className="text-slate-800">|</span>
            <span className="font-extrabold text-lg text-slate-200">Painel do Criador</span>
          </div>

          <Button 
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold gap-2 px-5 py-3 rounded-xl shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Curso
          </Button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full space-y-8">
        <div>
          <h2 className="text-2xl font-black text-white mb-2">Seus Cursos de Forró</h2>
          <p className="text-sm text-slate-400">Gerencie os cursos, módulos e envie novas vídeoaulas para seus alunos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => (
            <Link 
              key={course.id} 
              href={`/admin/courses/${course.id}`}
              className="flex flex-col bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl hover:border-red-600/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.02)] hover:scale-[1.01] transition-all duration-300 group cursor-pointer"
            >
              <div className={`aspect-video bg-gradient-to-br ${course.thumbnail_gradient} p-6 flex flex-col justify-end relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 group-hover:scale-105 transition-all duration-500" />
                <h3 className="text-xl font-black text-white relative z-10 drop-shadow-md">{course.title}</h3>
              </div>
              <div className="p-6 flex flex-col flex-grow justify-between gap-6">
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{course.description || 'Sem descrição cadastrada.'}</p>
                
                <div className="flex gap-3">
                  <Button className="w-full bg-slate-900 hover:bg-red-600/10 hover:text-red-500 hover:border-red-600/20 active:scale-[0.98] text-red-500 font-bold border border-red-600/10 gap-2 transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    Gerenciar Conteúdo
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Modal - Criar Novo Curso */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-red-600" />
                Criar Novo Curso de Forró
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Título do Curso</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Forró Roots Avançado"
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Descrição Curta</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo sobre o que o aluno vai aprender..."
                  rows={3}
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1.5">URL Slug (Opcional)</label>
                  <input 
                    type="text" 
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="forro-roots-avancado"
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-1.5">Paleta Visual (Degradê)</label>
                  <select 
                    value={gradient}
                    onChange={(e) => setGradient(e.target.value)}
                    className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm cursor-pointer"
                  >
                    <option value="from-red-600 to-red-600">Laranja a Vermelho (Quente)</option>
                    <option value="from-violet-600 to-pink-500">Violeta a Rosa (Charmoso)</option>
                    <option value="from-blue-600 to-cyan-500">Azul a Ciano (Roots)</option>
                    <option value="from-emerald-500 to-teal-600">Esmeralda a Teal</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModal(false)}
                  className="border-slate-800 hover:bg-slate-900 text-slate-400"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-6"
                >
                  {loading ? (
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
    </div>
  );
}
