'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  ArrowLeft, 
  Play, 
  FileVideo, 
  Film, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FolderOpen 
} from 'lucide-react';

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

interface CourseEditorProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  initialModules: Module[];
}

export function CourseEditor({ courseId, courseTitle, courseSlug, initialModules }: CourseEditorProps) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  
  // Estados para Modal de Módulo
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleLoading, setModuleLoading] = useState(false);

  // Estados para Modal de Aula/Upload
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados do Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Criar Módulo
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle) return;
    setModuleLoading(true);

    try {
      const position = modules.length + 1;
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'module',
          courseId,
          title: moduleTitle,
          position
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar módulo');

      const newModule: Module = {
        id: data.id,
        title: moduleTitle,
        position,
        lessons: []
      };

      setModules(prev => [...prev, newModule]);
      setShowModuleModal(false);
      setModuleTitle('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar módulo.');
    } finally {
      setModuleLoading(false);
    }
  };

  // Tratar alteração do arquivo de vídeo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Criar Aula e Fazer Upload Direto
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle || !selectedFile || !activeModuleId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadStatus('Preparando upload seguro...');

    let videoId = '';
    
    try {
      // 1. Obter autorização de upload e criar o placeholder do vídeo na Bunny Stream
      const prepareRes = await fetch('/api/admin/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: lessonTitle })
      });

      const prepareData = await prepareRes.json();
      if (!prepareRes.ok) throw new Error(prepareData.error || 'Erro ao obter autorização do Bunny Stream.');

      const { libraryId, signature } = prepareData;
      videoId = prepareData.videoId;

      setUploadStatus('Transmitindo vídeo para a Bunny Stream (Direct-to-Cloud)...');

      // 2. Realizar upload via XHR para acompanhar o progresso em tempo real
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`);
        
        // Passamos a assinatura criptografada no cabeçalho AccessKey
        xhr.setRequestHeader('AccessKey', signature);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Falha no upload para Bunny Stream: HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Erro de conexão durante o upload.'));
        
        xhr.send(selectedFile);
      });

      setUploadStatus('Gravando informações da aula no banco de dados...');

      // 3. Cadastrar a nova lição no Cloudflare D1
      const lessonsCount = modules.find(m => m.id === activeModuleId)?.lessons.length || 0;
      const position = lessonsCount + 1;

      const registerRes = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          moduleId: activeModuleId,
          title: lessonTitle,
          description: lessonDescription,
          position,
          videoId
        })
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.error || 'Erro ao registrar aula no banco.');

      // Atualizar o estado local
      const newLesson: Lesson = {
        id: registerData.id,
        title: lessonTitle,
        duration_seconds: 0, // Bunny transcodifica e atualiza a duração em background
        video_id: videoId,
        position
      };

      setModules(prev => prev.map(m => {
        if (m.id === activeModuleId) {
          return { ...m, lessons: [...m.lessons, newLesson] };
        }
        return m;
      }));

      setUploadStatus('Aula criada e upload concluído com sucesso!');
      setTimeout(() => {
        setShowLessonModal(false);
        setLessonTitle('');
        setLessonDescription('');
        setSelectedFile(null);
        setUploading(false);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Erro durante o upload/cadastro.');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-[#07070a]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 group text-orange-400 hover:text-orange-300">
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold hidden md:inline">Voltar para Cursos</span>
            </Link>
            <span className="text-slate-800">|</span>
            <span className="font-extrabold text-sm text-slate-300 line-clamp-1">
              Curso: {courseTitle}
            </span>
          </div>

          <Button 
            onClick={() => setShowModuleModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-orange-400 font-bold border border-orange-500/10 gap-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Adicionar Módulo
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12 flex-grow w-full space-y-8">
        <div>
          <h2 className="text-2xl font-black text-white">Grade de Conteúdo</h2>
          <p className="text-sm text-slate-400 mt-1">Crie módulos organizados e envie as vídeoaulas para preencher sua área de membros.</p>
        </div>

        {/* Lista de Módulos */}
        <div className="space-y-6">
          {modules.length === 0 ? (
            <div className="border border-dashed border-slate-900 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-slate-950/20">
              <FolderOpen className="w-12 h-12 text-slate-700" />
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-400">Nenhum módulo criado</h4>
                <p className="text-slate-600 text-xs max-w-sm">Adicione seu primeiro módulo para organizar as aulas do curso de Forró.</p>
              </div>
              <Button onClick={() => setShowModuleModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Módulo
              </Button>
            </div>
          ) : (
            modules.map(mod => (
              <div key={mod.id} className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
                {/* Módulo Header */}
                <div className="p-5 bg-slate-950/80 border-b border-slate-900/60 flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 text-base flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                    {mod.title}
                  </h3>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setActiveModuleId(mod.id);
                      setShowLessonModal(true);
                    }}
                    className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold border border-orange-500/20 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Enviar Vídeoaula
                  </Button>
                </div>

                {/* Aulas do Módulo */}
                <div className="p-4 space-y-2">
                  {mod.lessons.length === 0 ? (
                    <p className="text-slate-600 text-xs italic py-2 px-1">Este módulo não possui nenhuma aula ativa ainda.</p>
                  ) : (
                    mod.lessons.map(les => (
                      <div key={les.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0b0b11]/50 border border-slate-900/40 hover:bg-[#0b0b11] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-900 p-2 rounded-lg text-orange-500">
                            <Play className="w-3.5 h-3.5 fill-orange-500" />
                          </div>
                          <span className="text-slate-300 text-xs font-semibold">{les.title}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold font-mono">
                          {les.video_id ? (
                            <span className="text-green-500 bg-green-950/20 px-2 py-0.5 rounded border border-green-500/10 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Vídeo Ativo
                            </span>
                          ) : (
                            <span className="text-yellow-500">Aguardando Vídeo</span>
                          )}
                          <span>ID: {les.video_id ? les.video_id.substring(0, 8) : 'n/a'}...</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal - Novo Módulo */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200">Novo Módulo</h3>
              <button 
                onClick={() => setShowModuleModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Nome do Módulo</label>
                <input 
                  type="text" 
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Ex: Passo Básico Universitário"
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModuleModal(false)}
                  className="border-slate-800 hover:bg-slate-900 text-slate-400"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={moduleLoading}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold px-6"
                >
                  {moduleLoading ? 'Criando...' : 'Criar Módulo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Nova Aula / Upload de Vídeo */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-500" />
                Upload de Vídeoaula
              </h3>
              <button 
                onClick={() => !uploading && setShowLessonModal(false)}
                disabled={uploading}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold disabled:opacity-30"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Título da Aula</label>
                <input 
                  type="text" 
                  required
                  disabled={uploading}
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Aula 01 - Postura e Giro Simples"
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Descrição da Aula (Opcional)</label>
                <textarea 
                  disabled={uploading}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Instruções sobre o que praticar..."
                  rows={2}
                  className="w-full bg-[#0d0d14] border border-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-400 mb-1.5">Arquivo de Vídeo (.mp4, .mov, etc.)</label>
                <div className="relative border border-dashed border-slate-900 rounded-xl p-6 bg-slate-950/40 text-center flex flex-col items-center justify-center gap-2">
                  <input 
                    type="file" 
                    required
                    disabled={uploading}
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <FileVideo className="w-8 h-8 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-400">
                    {selectedFile ? selectedFile.name : 'Arraste ou clique para selecionar o vídeo'}
                  </span>
                  {selectedFile && (
                    <span className="text-[10px] text-slate-500 font-semibold font-mono">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              </div>

              {/* Status de Progresso do Upload */}
              {uploading && (
                <div className="space-y-2 p-4 rounded-2xl bg-orange-950/10 border border-orange-500/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-orange-400">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      {uploadStatus}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadStatus.includes('concluído') && (
                <div className="p-3 bg-green-950/20 border border-green-500/20 rounded-xl text-xs text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{uploadStatus}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={uploading}
                  onClick={() => setShowLessonModal(false)}
                  className="border-slate-800 hover:bg-slate-900 text-slate-400 disabled:opacity-30"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold px-6"
                >
                  {uploading ? 'Fazendo Upload...' : 'Criar Aula & Upload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
