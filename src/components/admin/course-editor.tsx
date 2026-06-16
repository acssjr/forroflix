'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  ArrowLeft, 
  Play, 
  FileVideo, 
  Film, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FolderOpen,
  Pencil,
  Check,
  X,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FolderInput,
  Trash2
} from 'lucide-react';
import { BatchUploadModal } from './batch-upload-modal';

interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
  description?: string;
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
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados do Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estados para Edição Inline (Rename)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState('');
  const [editingLessonDescription, setEditingLessonDescription] = useState('');

  // Estados para Controle de Drag and Drop
  const [draggedItem, setDraggedItem] = useState<{
    type: 'module' | 'lesson';
    id: string;
    sourceModuleId?: string;
  } | null>(null);

  const [dropIndicator, setDropIndicator] = useState<{
    targetId: string;
    type: 'module' | 'lesson';
    position: 'before' | 'after';
  } | null>(null);

  // Controle de Módulos Colapsados
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  
  // Controle de Menu de Movimentação por Clique
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);

  // Estados para Seleção de Aulas em Lote (Checkboxes)
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [bulkMoveDropdownOpen, setBulkMoveDropdownOpen] = useState(false);

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  const clearSelection = () => {
    setSelectedLessons({});
  };

  const toggleSelectAllModuleLessons = (moduleLessons: Lesson[], isAllSelected: boolean) => {
    setSelectedLessons(prev => {
      const updated = { ...prev };
      moduleLessons.forEach(l => {
        if (isAllSelected) {
          delete updated[l.id];
        } else {
          updated[l.id] = true;
        }
      });
      return updated;
    });
  };

  // Fechar menus de movimentação ao clicar fora
  useEffect(() => {
    const handleOutsideClick = () => {
      setMovingLessonId(null);
      setBulkMoveDropdownOpen(false);
    };
    if (movingLessonId || bulkMoveDropdownOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [movingLessonId, bulkMoveDropdownOpen]);

  // Excluir Módulo do Banco (D1)
  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir o módulo "${title}"? Todas as aulas dentro dele também serão excluídas.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'module',
          id: moduleId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir módulo.');

      setModules(prev => prev.filter(m => m.id !== moduleId));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir módulo.');
    }
  };

  // Excluir Aula Individual
  const handleDeleteLesson = async (lessonId: string, title: string, moduleId: string) => {
    if (!confirm(`Tem certeza que deseja excluir a aula "${title}"? Esta ação é irreversível.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          id: lessonId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir aula.');

      setModules(prev => prev.map(m => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: m.lessons.filter(l => l.id !== lessonId)
          };
        }
        return m;
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir aula.');
    }
  };

  // Mover aulas selecionadas em lote
  const moveSelectedLessonsToModule = async (targetModuleId: string) => {
    const idsToMove = Object.keys(selectedLessons).filter(id => selectedLessons[id]);
    if (idsToMove.length === 0) return;

    const updated = modules.map(m => {
      const filteredLessons = m.lessons.filter(l => !selectedLessons[l.id]);
      return {
        ...m,
        lessons: filteredLessons
      };
    });

    const lessonsToMove: Lesson[] = [];
    modules.forEach(m => {
      m.lessons.forEach(l => {
        if (selectedLessons[l.id]) {
          lessonsToMove.push(l);
        }
      });
    });

    const targetMod = updated.find(m => m.id === targetModuleId);
    if (targetMod) {
      targetMod.lessons.push(...lessonsToMove);
    }

    setModules(updated);
    setSelectedLessons({});
    setBulkMoveDropdownOpen(false);

    await saveNewOrder(updated);
  };

  // Excluir aulas selecionadas em lote
  const deleteSelectedLessons = async () => {
    const idsToDelete = Object.keys(selectedLessons).filter(id => selectedLessons[id]);
    if (idsToDelete.length === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${idsToDelete.length} aula(s)? Esta ação é irreversível.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lessons',
          ids: idsToDelete
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir aulas.');

      setModules(prev => prev.map(m => ({
        ...m,
        lessons: m.lessons.filter(l => !selectedLessons[l.id])
      })));

      setSelectedLessons({});
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar exclusão em lote.');
    }
  };

  // Mover aula para outro módulo via clique/menu
  const moveLessonToModule = async (lessonId: string, sourceModuleId: string, targetModuleId: string) => {
    if (sourceModuleId === targetModuleId) return;

    const updated = modules.map(m => ({
      ...m,
      lessons: [...m.lessons]
    }));

    const sourceMod = updated.find(m => m.id === sourceModuleId);
    const targetMod = updated.find(m => m.id === targetModuleId);
    if (!sourceMod || !targetMod) return;

    const lessonIdx = sourceMod.lessons.findIndex(l => l.id === lessonId);
    if (lessonIdx === -1) return;
    const [lesson] = sourceMod.lessons.splice(lessonIdx, 1);

    // Mover para o fim do módulo de destino
    targetMod.lessons.push(lesson);

    setModules(updated);
    setMovingLessonId(null);
    await saveNewOrder(updated);
  };

  // Enviar ordenação final para persistência no banco
  const saveNewOrder = async (updatedModules: Module[]) => {
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reorder',
          modules: updatedModules.map(m => ({
            id: m.id,
            lessons: m.lessons.map(l => ({ id: l.id }))
          }))
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao persistir nova ordenação.');
      }
    } catch (err: any) {
      console.error('Erro ao reordenar:', err);
      alert(err.message || 'Falha ao salvar nova ordenação no servidor. Revertendo alterações.');
      // Reverter estado local em caso de falha de conexão ou erro no banco
      window.location.reload();
    }
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (
    e: React.DragEvent,
    type: 'module' | 'lesson',
    id: string,
    sourceModuleId?: string
  ) => {
    // Evitar drag se o clique foi em elemento interativo
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('button, input, textarea, a, select')) {
      e.preventDefault();
      return;
    }

    // Definimos efeito visual
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ type, id, sourceModuleId });
    
    // Forçar opacidade menor no item original arrastado
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    setDropIndicator(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOverItem = (
    e: React.DragEvent,
    type: 'module' | 'lesson',
    targetId: string,
    targetModuleId?: string
  ) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Bloquear Drag-over inválidos (ex: arrastar módulo sobre aula)
    if (draggedItem.type === 'module' && type !== 'module') return;

    // Bloquear drag-over sobre si mesmo
    if (draggedItem.id === targetId) {
      setDropIndicator(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isAfter = relativeY > rect.height / 2;

    setDropIndicator({
      targetId,
      type,
      position: isAfter ? 'after' : 'before'
    });
  };

  const handleDragLeaveItem = () => {
    setDropIndicator(null);
  };

  const handleDropItem = (
    e: React.DragEvent,
    type: 'module' | 'lesson',
    targetId: string,
    targetModuleId?: string
  ) => {
    e.preventDefault();
    if (!draggedItem) return;

    // 1. Caso A: Reordenar Módulos entre si
    if (draggedItem.type === 'module' && type === 'module') {
      const position = dropIndicator?.position || 'after';
      const updated = [...modules];
      const dragIdx = updated.findIndex(m => m.id === draggedItem.id);
      const [draggedModule] = updated.splice(dragIdx, 1);
      
      let targetIdx = updated.findIndex(m => m.id === targetId);
      if (position === 'after') targetIdx += 1;
      
      updated.splice(targetIdx, 0, draggedModule);
      
      // Atualizar posições localmente
      const finalModules = updated.map((m, idx) => ({ ...m, position: idx + 1 }));
      setModules(finalModules);
      saveNewOrder(finalModules);
    }

    // 2. Caso B: Reordenar Aulas
    if (draggedItem.type === 'lesson' && draggedItem.sourceModuleId) {
      const position = dropIndicator?.position || 'after';
      
      // Criar nova cópia profunda das aulas de cada módulo
      const updated = modules.map(m => ({
        ...m,
        lessons: [...m.lessons]
      }));

      // Achar o módulo de origem da aula arrastada
      const sourceMod = updated.find(m => m.id === draggedItem.sourceModuleId);
      if (!sourceMod) return;

      const draggedLessonIdx = sourceMod.lessons.findIndex(l => l.id === draggedItem.id);
      if (draggedLessonIdx === -1) return;
      const [draggedLesson] = sourceMod.lessons.splice(draggedLessonIdx, 1);

      // Se soltarmos a aula sobre outra aula
      if (type === 'lesson' && targetModuleId) {
        const targetMod = updated.find(m => m.id === targetModuleId);
        if (!targetMod) return;

        let targetIdx = targetMod.lessons.findIndex(l => l.id === targetId);
        if (position === 'after') targetIdx += 1;

        targetMod.lessons.splice(targetIdx, 0, draggedLesson);
      } 
      
      // Se soltarmos a aula sobre a header de um módulo (vai para o início da lista daquele módulo)
      else if (type === 'module') {
        const targetMod = updated.find(m => m.id === targetId);
        if (!targetMod) return;
        targetMod.lessons.unshift(draggedLesson);
      }

      setModules(updated);
      saveNewOrder(updated);
    }

    setDraggedItem(null);
    setDropIndicator(null);
  };

  const handleLessonDropOnEmptyModule = (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== 'lesson' || !draggedItem.sourceModuleId) return;
    if (draggedItem.sourceModuleId === targetModuleId) return;

    const updated = modules.map(m => ({
      ...m,
      lessons: [...m.lessons]
    }));

    const sourceMod = updated.find(m => m.id === draggedItem.sourceModuleId);
    const targetMod = updated.find(m => m.id === targetModuleId);
    if (!sourceMod || !targetMod) return;

    const draggedLessonIdx = sourceMod.lessons.findIndex(l => l.id === draggedItem.id);
    if (draggedLessonIdx === -1) return;
    const [draggedLesson] = sourceMod.lessons.splice(draggedLessonIdx, 1);

    targetMod.lessons.push(draggedLesson);

    setModules(updated);
    saveNewOrder(updated);
    setDraggedItem(null);
    setDropIndicator(null);
  };

  // Renomear Módulo via PATCH API
  const handleRenameModule = async (e: React.FormEvent, moduleId: string) => {
    e.preventDefault();
    if (!editingModuleTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'module',
          id: moduleId,
          title: editingModuleTitle
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao renomear módulo');

      // Atualizar estado local
      setModules(prev => prev.map(m => {
        if (m.id === moduleId) {
          return { ...m, title: editingModuleTitle };
        }
        return m;
      }));

      setEditingModuleId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao renomear módulo.');
    }
  };

  // Renomear Aula e Alterar Descrição via PATCH API
  const handleRenameLesson = async (e: React.FormEvent, moduleId: string, lessonId: string) => {
    e.preventDefault();
    if (!editingLessonTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          id: lessonId,
          title: editingLessonTitle,
          description: editingLessonDescription
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar aula');

      // Atualizar estado local
      setModules(prev => prev.map(m => {
        if (m.id === moduleId) {
          return {
            ...m,
            lessons: m.lessons.map(l => {
              if (l.id === lessonId) {
                return { 
                  ...l, 
                  title: editingLessonTitle,
                  description: editingLessonDescription
                };
              }
              return l;
            })
          };
        }
        return m;
      }));

      setEditingLessonId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações da aula.');
    }
  };

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
        position,
        description: lessonDescription
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
  const selectedCount = Object.keys(selectedLessons).filter(id => selectedLessons[id]).length;

  return (
    <>
      <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col animate-page-enter">
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

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setActiveModuleId(null);
                setShowBatchModal(true);
              }}
              className="bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.97] text-orange-400 font-bold border border-orange-500/20 gap-1.5 rounded-xl cursor-pointer transition-all duration-200"
            >
              <Film className="w-4 h-4" />
              Upload em Lote
            </Button>
            <Button 
              onClick={() => setShowModuleModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-orange-400 font-bold border border-orange-500/10 gap-2 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              Adicionar Módulo
            </Button>
          </div>
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
            modules.map(mod => {
              const isModuleIndicatorBefore = draggedItem?.type === 'module' && dropIndicator?.type === 'module' && dropIndicator.targetId === mod.id && dropIndicator.position === 'before';
              const isModuleIndicatorAfter = draggedItem?.type === 'module' && dropIndicator?.type === 'module' && dropIndicator.targetId === mod.id && dropIndicator.position === 'after';
              const isLessonHoveringModule = draggedItem?.type === 'lesson' && dropIndicator?.type === 'module' && dropIndicator.targetId === mod.id;
              const isCollapsed = !!collapsedModules[mod.id];
              
              const moduleLessons = mod.lessons;
              const selectedModuleLessons = moduleLessons.filter(l => selectedLessons[l.id]);
              const isAllModuleLessonsSelected = moduleLessons.length > 0 && selectedModuleLessons.length === moduleLessons.length;
              const isSomeModuleLessonsSelected = selectedModuleLessons.length > 0 && selectedModuleLessons.length < moduleLessons.length;

              return (
                <div key={mod.id} className="space-y-2">
                  {isModuleIndicatorBefore && (
                    <div className="h-1 bg-orange-500 rounded-full animate-pulse transition-all duration-250" />
                  )}
                  
                  <div 
                    className={`bg-slate-950 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                      draggedItem?.id === mod.id && draggedItem?.type === 'module' ? 'opacity-35 border-slate-900' : ''
                    } ${
                      isLessonHoveringModule 
                        ? 'border-orange-500/70 bg-orange-500/[0.02] shadow-[0_0_25px_rgba(249,115,22,0.03)]' 
                        : 'border-slate-900 hover:border-orange-500/10'
                    }`}
                  >
                    {/* Módulo Header */}
                    <div 
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, 'module', mod.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOverItem(e, 'module', mod.id)}
                      onDragLeave={handleDragLeaveItem}
                      onDrop={(e) => handleDropItem(e, 'module', mod.id)}
                      onClick={() => toggleModuleCollapse(mod.id)}
                      className={`p-5 flex items-center justify-between cursor-pointer select-none transition-all duration-200 ${
                        isCollapsed 
                          ? 'bg-[#101018]/90 hover:bg-[#151522]' 
                          : 'bg-[#141420] border-b border-slate-900/60 hover:bg-[#181829]'
                      }`}
                    >
                      {editingModuleId === mod.id ? (
                        <form onSubmit={(e) => handleRenameModule(e, mod.id)} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingModuleTitle}
                            onChange={(e) => setEditingModuleTitle(e.target.value)}
                            className="bg-[#0c0c14] border border-orange-500/30 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 text-sm font-semibold max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingModuleId(null);
                            }}
                          />
                          <Button size="sm" variant="ghost" type="submit" className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-slate-900 rounded-lg">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingModuleId(null)} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-400 hover:bg-slate-900 rounded-lg">
                            <X className="w-4 h-4" />
                          </Button>
                        </form>
                      ) : (
                        <h3 className="font-bold text-slate-200 text-base flex items-center gap-2 group select-none">
                          <GripVertical 
                            className="w-4 h-4 text-slate-600 hover:text-slate-400 mr-0.5 shrink-0 cursor-grab" 
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          {moduleLessons.length > 0 && (
                            <Checkbox
                              checked={isAllModuleLessonsSelected}
                              indeterminate={isSomeModuleLessonsSelected}
                              onCheckedChange={() => {
                                toggleSelectAllModuleLessons(moduleLessons, isAllModuleLessonsSelected);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              title="Selecionar todas as aulas deste módulo"
                            />
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleModuleCollapse(mod.id);
                            }}
                            className="p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                            title={isCollapsed ? "Expandir Módulo" : "Colapsar Módulo"}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          
                          <span className="w-1.5 h-5 bg-orange-500 rounded-full shrink-0"></span>
                          <span className="truncate">{mod.title}</span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModuleId(mod.id);
                              setEditingModuleTitle(mod.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-orange-400 rounded-lg cursor-pointer shrink-0"
                            title="Renomear Módulo"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModule(mod.id, mod.title);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-500 rounded-lg cursor-pointer shrink-0"
                            title="Excluir Módulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </h3>
                      )}
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setActiveModuleId(mod.id);
                            setShowBatchModal(true);
                          }}
                          className="bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.96] text-orange-400 font-bold border border-orange-500/20 gap-1.5 transition-all duration-200 cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5" />
                          Upload em Lote
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setActiveModuleId(mod.id);
                            setShowLessonModal(true);
                          }}
                          className="bg-orange-500/10 hover:bg-orange-500/20 active:scale-[0.96] text-orange-400 font-bold border border-orange-500/20 gap-1.5 transition-all duration-200 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Enviar Vídeoaula
                        </Button>
                      </div>
                    </div>

                    {/* Aulas do Módulo */}
                    {!isCollapsed && (
                      <div className="p-4 space-y-2">
                        {mod.lessons.length === 0 ? (
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedItem?.type === 'lesson') {
                                handleDragOverItem(e, 'module', mod.id);
                              }
                            }}
                            onDragLeave={handleDragLeaveItem}
                            onDrop={(e) => handleLessonDropOnEmptyModule(e, mod.id)}
                            className={`border border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                              isLessonHoveringModule 
                                ? 'border-orange-500/40 bg-orange-500/5' 
                                : 'border-slate-900 bg-slate-950/20'
                            }`}
                          >
                            <p className="text-slate-500 text-xs italic font-medium">Este módulo não possui nenhuma aula ativa ainda. Arraste uma aula para cá.</p>
                          </div>
                        ) : (
                          mod.lessons.map(les => {
                            const isLesIndicatorBefore = draggedItem?.type === 'lesson' && dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id && dropIndicator.position === 'before';
                            const isLesIndicatorAfter = draggedItem?.type === 'lesson' && dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id && dropIndicator.position === 'after';

                            return (
                              <div key={les.id} className="space-y-1.5">
                                {isLesIndicatorBefore && (
                                  <div className="h-0.5 bg-orange-500 rounded-full animate-pulse transition-all duration-200" />
                                )}
                                
                                <div 
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, 'lesson', les.id, mod.id)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOverItem(e, 'lesson', les.id, mod.id)}
                                  onDragLeave={handleDragLeaveItem}
                                  onDrop={(e) => handleDropItem(e, 'lesson', les.id, mod.id)}
                                  onClick={() => toggleLessonSelection(les.id)}
                                  className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl bg-[#0b0b11]/50 border transition-all duration-200 gap-4 group cursor-grab active:cursor-grabbing select-none hover:cursor-pointer ${
                                    draggedItem?.id === les.id && draggedItem?.type === 'lesson' ? 'opacity-35 border-slate-900' : 'border-slate-900/40 hover:bg-[#0b0b11] hover:border-orange-500/10'
                                  } ${
                                    selectedLessons[les.id] ? 'border-orange-500/30 bg-orange-500/[0.01]' : ''
                                  } ${
                                    dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id ? 'border-orange-500/30' : ''
                                  }`}
                                >
                                  {editingLessonId === les.id ? (
                                    <form onSubmit={(e) => handleRenameLesson(e, mod.id, les.id)} className="flex flex-col gap-3 flex-grow bg-[#0a0a0f] p-4 rounded-xl border border-slate-900 w-full" onClick={(e) => e.stopPropagation()}>
                                      <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Título da Aula</label>
                                        <input
                                          type="text"
                                          value={editingLessonTitle}
                                          onChange={(e) => setEditingLessonTitle(e.target.value)}
                                          className="w-full bg-[#0c0c14] border border-slate-900 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs font-semibold"
                                          autoFocus
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Descrição da Aula</label>
                                        <textarea
                                          value={editingLessonDescription}
                                          onChange={(e) => setEditingLessonDescription(e.target.value)}
                                          placeholder="Adicione instruções práticas..."
                                          rows={2}
                                          className="w-full bg-[#0c0c14] border border-slate-900 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)} type="button" className="text-slate-500 hover:text-slate-400 hover:bg-slate-900 text-xs px-3.5 h-8">
                                          Cancelar
                                        </Button>
                                        <Button size="sm" type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 h-8">
                                          Salvar
                                        </Button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                      <Checkbox
                                        checked={!!selectedLessons[les.id]}
                                        onCheckedChange={() => {
                                          toggleLessonSelection(les.id);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        title="Selecionar esta aula"
                                      />
                                      <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 cursor-grab shrink-0 mr-0.5" />
                                      <div className="bg-slate-900 p-2 rounded-lg text-orange-500 self-start shrink-0">
                                        <Play className="w-3.5 h-3.5 fill-orange-500" />
                                      </div>
                                      <div className="flex flex-col min-w-0 text-left">
                                        <span className="text-slate-300 text-xs font-semibold truncate">{les.title}</span>
                                        {les.description ? (
                                          <span className="text-slate-500 text-[10px] font-medium mt-0.5 line-clamp-1">
                                            {les.description}
                                          </span>
                                        ) : (
                                          <span className="text-slate-600 text-[9px] italic mt-0.5">Sem descrição</span>
                                        )}
                                      </div>
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingLessonId(les.id);
                                          setEditingLessonTitle(les.title);
                                          setEditingLessonDescription(les.description || '');
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-orange-400 rounded cursor-pointer self-start mt-0.5 shrink-0"
                                        title="Editar Aula"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>

                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity self-start mt-0.5 shrink-0 relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMovingLessonId(movingLessonId === les.id ? null : les.id);
                                          }}
                                          className="p-1 text-slate-500 hover:text-orange-400 rounded cursor-pointer"
                                          title="Mover para outro módulo"
                                        >
                                          <FolderInput className="w-3 h-3" />
                                        </button>
                                        
                                        {movingLessonId === les.id && (
                                          <div 
                                            className="absolute right-0 mt-1 w-56 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="px-2 py-1.5 border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                                              Mover para Módulo:
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-0.5">
                                              {modules
                                                .filter(m => m.id !== mod.id)
                                                .map(m => (
                                                  <button
                                                    key={m.id}
                                                    onClick={() => moveLessonToModule(les.id, mod.id, m.id)}
                                                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-orange-500/10 hover:text-orange-400 transition-colors truncate cursor-pointer"
                                                  >
                                                    {m.title}
                                                  </button>
                                                ))}
                                              {modules.length <= 1 && (
                                                <div className="px-2 py-1.5 text-[10px] text-slate-600 italic text-left">
                                                  Nenhum outro módulo
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLesson(les.id, les.title, mod.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-500 rounded cursor-pointer self-start mt-0.5 shrink-0"
                                        title="Excluir Aula"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold font-mono shrink-0" onClick={(e) => e.stopPropagation()}>
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

                                {isLesIndicatorAfter && (
                                  <div className="h-0.5 bg-orange-500 rounded-full animate-pulse transition-all duration-200" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isModuleIndicatorAfter && (
                    <div className="h-1 bg-orange-500 rounded-full animate-pulse transition-all duration-250" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>

    {/* Barra de Ações em Lote */}
    {selectedCount > 0 && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-orange-500/20 px-6 py-3.5 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-6 fade-in duration-200 backdrop-blur-md">
        <div className="flex items-center gap-2 border-r border-slate-900 pr-6 shrink-0">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-white font-mono">
            {selectedCount} {selectedCount === 1 ? 'aula selecionada' : 'aulas selecionadas'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Botão de Mover em Lote */}
          <div className="relative">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setBulkMoveDropdownOpen(!bulkMoveDropdownOpen);
              }}
              className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold border border-orange-500/20 gap-1.5 h-8.5 rounded-xl cursor-pointer text-[11px]"
            >
              <FolderInput className="w-3.5 h-3.5" />
              Mover para...
            </Button>

            {bulkMoveDropdownOpen && (
              <div 
                className="absolute bottom-full mb-2 right-0 w-56 bg-slate-950 border border-slate-900 rounded-xl shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1.5 border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
                  Selecionar Módulo Destino:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {modules.map(m => (
                    <button
                      key={m.id}
                      onClick={() => moveSelectedLessonsToModule(m.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-orange-500/10 hover:text-orange-400 transition-colors truncate cursor-pointer"
                    >
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botão de Excluir em Lote */}
          <Button
            size="sm"
            onClick={deleteSelectedLessons}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20 gap-1.5 h-8.5 rounded-xl cursor-pointer text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Selecionadas
          </Button>

          {/* Cancelar Seleção */}
          <button
            onClick={clearSelection}
            className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider pl-2 transition-colors cursor-pointer"
          >
            Desmarcar
          </button>
        </div>
      </div>
    )}

    {/* Modal - Novo Módulo */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200">Novo Módulo</h3>
              <button 
                onClick={() => setShowModuleModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold cursor-pointer"
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
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
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
      
      {showBatchModal && (
        <BatchUploadModal
          courseId={courseId}
          moduleId={activeModuleId}
          moduleTitle={activeModuleId ? modules.find(m => m.id === activeModuleId)?.title : null}
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          onUploadCompleted={() => {
            // Recarregar os dados da página/D1 quando o upload for concluído
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
