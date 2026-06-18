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
  Trash2,
  ArrowUpDown
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
  cover_vertical?: string | null;
  cover_vertical_position?: string | null;
  lessons: Lesson[];
}

interface CourseEditorProps {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  initialModules: Module[];
  onBack?: () => void;
}

export function CourseEditor({ courseId, courseTitle, courseSlug, initialModules, onBack }: CourseEditorProps) {
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

  // Estados para Modal de Edição de Módulo (Metadados/Capa)
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState('');
  const [editModuleCoverVertical, setEditModuleCoverVertical] = useState('');
  const [editModuleCoverVerticalPosition, setEditModuleCoverVerticalPosition] = useState('50% 50%');
  const [editModuleLoading, setEditModuleLoading] = useState(false);

  useEffect(() => {
    if (editingModule) {
      setEditModuleTitle(editingModule.title || '');
      setEditModuleCoverVertical(editingModule.cover_vertical || '');
      setEditModuleCoverVerticalPosition(editingModule.cover_vertical_position || '50% 50%');
    }
  }, [editingModule]);

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

  const [draggableModuleId, setDraggableModuleId] = useState<string | null>(null);
  const [draggableLessonId, setDraggableLessonId] = useState<string | null>(null);

  // Controle de Módulos Colapsados
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  
  // Controle de Menu de Movimentação por Clique
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);

  // Estados para Seleção de Aulas em Lote (Checkboxes)
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [isSorting, setIsSorting] = useState(false);
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

  // Auto-scroll suave da página durante o drag and drop
  useEffect(() => {
    if (!draggedItem) return;

    let scrollSpeed = 0;
    let animationFrameId: number | null = null;

    const scrollLoop = () => {
      if (scrollSpeed !== 0) {
        window.scrollBy(0, scrollSpeed);
      }
      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    const handleDragOverGlobal = (e: DragEvent) => {
      const threshold = 120; // distância da borda para começar a rolar (px)
      const maxSpeed = 15; // velocidade máxima de rolagem
      const clientY = e.clientY;
      const height = window.innerHeight;

      if (clientY < threshold) {
        // Rola para cima (velocidade negativa)
        const intensity = (threshold - clientY) / threshold;
        scrollSpeed = -maxSpeed * intensity;
      } else if (clientY > height - threshold) {
        // Rola para baixo (velocidade positiva)
        const intensity = (clientY - (height - threshold)) / threshold;
        scrollSpeed = maxSpeed * intensity;
      } else {
        scrollSpeed = 0;
      }
    };

    const stopScrolling = () => {
      scrollSpeed = 0;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(scrollLoop);
    window.addEventListener('dragover', handleDragOverGlobal);
    window.addEventListener('dragend', stopScrolling);
    window.addEventListener('drop', stopScrolling);

    return () => {
      window.removeEventListener('dragover', handleDragOverGlobal);
      window.removeEventListener('dragend', stopScrolling);
      window.removeEventListener('drop', stopScrolling);
      stopScrolling();
    };
  }, [draggedItem]);

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

  // Ordenar aulas de um módulo numericamento ou alfabeticamente
  const handleSortLessons = async (moduleId: string, type: 'numeric' | 'alphabetic') => {
    if (isSorting) return;
    setIsSorting(true);
    try {
      const updated = modules.map(m => {
        if (m.id === moduleId) {
          const sorted = [...m.lessons];
          if (type === 'numeric') {
            // Extrair o primeiro número do título e ordenar com base nele. Se não houver, vai para o fim.
            sorted.sort((a, b) => {
              const numA = parseInt(a.title.match(/\d+/)?.[0] || '999999', 10);
              const numB = parseInt(b.title.match(/\d+/)?.[0] || '999999', 10);
              if (numA !== numB) {
                return numA - numB;
              }
              // Fallback para ordem alfabética se os números forem iguais ou ausentes
              return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
            });
          } else {
            // Ordenação alfabética
            sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
          }
          
          // Atualizar as posições das aulas
          const mappedLessons = sorted.map((l, idx) => ({
            ...l,
            position: idx + 1
          }));
          
          return {
            ...m,
            lessons: mappedLessons
          };
        }
        return m;
      });

      setModules(updated);
      await saveNewOrder(updated);
    } catch (err) {
      console.error("Erro ao ordenar aulas:", err);
    } finally {
      setIsSorting(false);
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

  // Salvar metadados do módulo (Capa, Título)
  const handleSaveModuleMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    setEditModuleLoading(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'module_metadata',
          id: editingModule.id,
          title: editModuleTitle,
          cover_vertical: editModuleCoverVertical || null,
          cover_vertical_position: editModuleCoverVerticalPosition,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar metadados do módulo.');

      setModules(prev => prev.map(m => {
        if (m.id === editingModule.id) {
          return {
            ...m,
            title: editModuleTitle,
            cover_vertical: editModuleCoverVertical || null,
            cover_vertical_position: editModuleCoverVerticalPosition,
          };
        }
        return m;
      }));

      setEditingModule(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao salvar metadados do módulo.');
    } finally {
      setEditModuleLoading(false);
    }
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
      <div className="w-full bg-background text-foreground flex flex-col animate-page-enter">
      {/* Top Header */}
      <header className="border-b border-border bg-sidebar/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack ? (
              <button 
                onClick={onBack} 
                className="flex items-center gap-2 group text-red-500 hover:text-red-400 cursor-pointer border-0 bg-transparent p-0"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-semibold hidden md:inline">Voltar para Cursos</span>
              </button>
            ) : (
              <Link href="/admin" className="flex items-center gap-2 group text-red-500 hover:text-red-400">
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm font-semibold hidden md:inline">Voltar para Cursos</span>
              </Link>
            )}
            <span className="text-border">|</span>
            <span className="font-extrabold text-sm text-foreground line-clamp-1">
              Curso: {courseTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setActiveModuleId(null);
                setShowBatchModal(true);
              }}
              className="bg-red-600/10 hover:bg-red-600/20 active:scale-[0.97] text-red-500 font-bold border border-red-600/20 gap-1.5 rounded-xl cursor-pointer transition-all duration-200"
            >
              <Film className="w-4 h-4" />
              Upload em Lote
            </Button>
            <Button 
              onClick={() => setShowModuleModal(true)}
              className="bg-secondary hover:bg-secondary/80 text-primary font-bold border border-border gap-2 rounded-xl cursor-pointer transition-all active:scale-[0.97]"
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
          <h2 className="text-2xl font-black text-foreground">Grade de Conteúdo</h2>
          <p className="text-sm text-muted-foreground mt-1">Crie módulos organizados e envie as vídeoaulas para preencher sua área de membros.</p>
        </div>

        {/* Lista de Módulos */}
        <div className="space-y-6">
          {modules.length === 0 ? (
            <div className="border border-dashed border-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-card/10">
              <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
              <div className="space-y-1">
                <h4 className="font-semibold text-muted-foreground">Nenhum módulo criado</h4>
                <p className="text-muted-foreground/60 text-xs max-w-sm">Adicione seu primeiro módulo para organizar as aulas do curso de Forró.</p>
              </div>
              <Button onClick={() => setShowModuleModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-2">
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
                    <div 
                      onDragOver={(e) => handleDragOverItem(e, 'module', mod.id)}
                      onDragLeave={handleDragLeaveItem}
                      onDrop={(e) => handleDropItem(e, 'module', mod.id)}
                      className="h-[76px] border-2 border-dashed border-red-600/40 rounded-2xl bg-red-600/[0.02] my-3 flex items-center justify-center gap-2 text-red-500/60 transition-all duration-300 ease-out animate-pulse shadow-[0_0_20px_rgba(229,9,20,0.02)]"
                    >
                      <FolderInput className="w-4 h-4 animate-bounce" />
                      <span className="text-xs font-bold uppercase tracking-wider">Mover Módulo para cá</span>
                    </div>
                  )}
                  
                  <div 
                    className={`bg-card border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                      draggedItem?.id === mod.id && draggedItem?.type === 'module' 
                        ? 'opacity-25 border-dashed border-red-600/35 bg-red-600/[0.01] shadow-none scale-[0.98]' 
                        : ''
                    } ${
                      isLessonHoveringModule 
                        ? 'border-red-600/70 bg-red-600/[0.02] shadow-[0_0_25px_rgba(229,9,20,0.03)]' 
                        : 'border-border hover:border-red-600/10'
                    }`}
                  >
                    {/* Módulo Header */}
                    <div 
                      draggable={draggableModuleId === mod.id}
                      onDragStart={(e) => handleDragStart(e, 'module', mod.id)}
                      onDragEnd={(e) => {
                        handleDragEnd(e);
                        setDraggableModuleId(null);
                      }}
                      onDragOver={(e) => handleDragOverItem(e, 'module', mod.id)}
                      onDragLeave={handleDragLeaveItem}
                      onDrop={(e) => {
                        handleDropItem(e, 'module', mod.id);
                        setDraggableModuleId(null);
                      }}
                      onClick={() => toggleModuleCollapse(mod.id)}
                      className={`p-5 flex items-center justify-between cursor-pointer select-none transition-all duration-200 ${
                        isCollapsed 
                          ? 'bg-card/90 hover:bg-secondary/20' 
                          : 'bg-secondary/40 border-b border-border/60 hover:bg-secondary/60'
                      }`}
                    >
                      <h3 className="font-bold text-foreground text-base flex items-center gap-2 group select-none">
                        <GripVertical 
                          className="w-4 h-4 text-muted-foreground/60 hover:text-foreground mr-0.5 shrink-0 cursor-grab" 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={() => setDraggableModuleId(mod.id)}
                          onMouseUp={() => setDraggableModuleId(null)}
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
                          className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                          title={isCollapsed ? "Expandir Módulo" : "Colapsar Módulo"}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        
                        <span className="w-1.5 h-5 bg-red-600 rounded-full shrink-0"></span>
                        <span className="truncate">{mod.title}</span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(mod);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded-lg cursor-pointer shrink-0"
                          title="Editar Módulo"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(mod.id, mod.title);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded-lg cursor-pointer shrink-0"
                          title="Excluir Módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </h3>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {moduleLessons.length > 1 && (
                          <div className="flex items-center bg-secondary/50 border border-border/80 rounded-xl p-0.5 shadow-sm">
                            <span className="text-[9px] text-muted-foreground font-extrabold uppercase px-2 tracking-wider select-none">Ordenar:</span>
                            <button
                              disabled={isSorting}
                              onClick={() => handleSortLessons(mod.id, 'numeric')}
                              className="h-7 px-2.5 text-[9px] font-bold text-muted-foreground hover:text-red-500 hover:bg-background/80 active:scale-[0.96] transition-all duration-150 cursor-pointer rounded-lg uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Ordenar por número no título (1-9)"
                            >
                              1-9
                            </button>
                            <button
                              disabled={isSorting}
                              onClick={() => handleSortLessons(mod.id, 'alphabetic')}
                              className="h-7 px-2.5 text-[9px] font-bold text-muted-foreground hover:text-red-500 hover:bg-background/80 active:scale-[0.96] transition-all duration-150 cursor-pointer rounded-lg uppercase tracking-wider border-l border-border/40 disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Ordenar alfabeticamente (A-Z)"
                            >
                              A-Z
                            </button>
                          </div>
                        )}
                        <Button 
                          size="sm"
                          onClick={() => {
                            setActiveModuleId(mod.id);
                            setShowBatchModal(true);
                          }}
                          className="bg-red-600/10 hover:bg-red-600/20 active:scale-[0.96] text-red-500 font-bold border border-red-600/20 gap-1.5 transition-all duration-200 cursor-pointer"
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
                          className="bg-red-600/10 hover:bg-red-600/20 active:scale-[0.96] text-red-500 font-bold border border-red-600/20 gap-1.5 transition-all duration-200 cursor-pointer"
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
                                ? 'border-red-600/40 bg-red-600/5' 
                                : 'border-border bg-card/20'
                            }`}
                          >
                            <p className="text-muted-foreground text-xs italic font-medium">Este módulo não possui nenhuma aula ativa ainda. Arraste uma aula para cá.</p>
                          </div>
                        ) : (
                          mod.lessons.map(les => {
                            const isLesIndicatorBefore = draggedItem?.type === 'lesson' && dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id && dropIndicator.position === 'before';
                            const isLesIndicatorAfter = draggedItem?.type === 'lesson' && dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id && dropIndicator.position === 'after';

                            return (
                              <div key={les.id} className="space-y-1.5">
                                {isLesIndicatorBefore && (
                                  <div 
                                    onDragOver={(e) => handleDragOverItem(e, 'lesson', les.id, mod.id)}
                                    onDragLeave={handleDragLeaveItem}
                                    onDrop={(e) => {
                                      handleDropItem(e, 'lesson', les.id, mod.id);
                                      setDraggableLessonId(null);
                                    }}
                                    className="h-[52px] border-2 border-dashed border-red-600/40 rounded-xl bg-red-600/[0.02] my-2 flex items-center justify-center gap-2 text-red-500/60 transition-all duration-300 ease-out animate-pulse shadow-[0_0_15px_rgba(229,9,20,0.02)]"
                                  >
                                    <Plus className="w-3.5 h-3.5 animate-bounce" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Mover Aula para cá</span>
                                  </div>
                                )}
                                
                                <div 
                                  draggable={draggableLessonId === les.id}
                                  onDragStart={(e) => handleDragStart(e, 'lesson', les.id, mod.id)}
                                  onDragEnd={(e) => {
                                    handleDragEnd(e);
                                    setDraggableLessonId(null);
                                  }}
                                  onDragOver={(e) => handleDragOverItem(e, 'lesson', les.id, mod.id)}
                                  onDragLeave={handleDragLeaveItem}
                                  onDrop={(e) => {
                                    handleDropItem(e, 'lesson', les.id, mod.id);
                                    setDraggableLessonId(null);
                                  }}
                                  onClick={() => toggleLessonSelection(les.id)}
                                  className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl bg-card/50 border transition-all duration-250 gap-4 group cursor-grab active:cursor-grabbing select-none hover:cursor-pointer ${
                                    draggedItem?.id === les.id && draggedItem?.type === 'lesson' 
                                      ? 'opacity-25 border-dashed border-red-600/35 bg-red-600/[0.01] shadow-none scale-[0.98]' 
                                      : 'border-border/40 hover:bg-secondary/40 hover:border-red-600/10'
                                  } ${
                                    selectedLessons[les.id] ? 'border-red-600/30 bg-red-600/[0.01]' : ''
                                  } ${
                                    dropIndicator?.type === 'lesson' && dropIndicator.targetId === les.id ? 'border-red-600/80 bg-red-600/[0.02] shadow-[0_0_15px_rgba(229,9,20,0.04)] scale-[1.01]' : ''
                                  }`}
                                >
                                  {editingLessonId === les.id ? (
                                    <form onSubmit={(e) => handleRenameLesson(e, mod.id, les.id)} className="flex flex-col gap-3 flex-grow bg-muted/30 p-4 rounded-xl border border-border w-full" onClick={(e) => e.stopPropagation()}>
                                      <div>
                                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Título da Aula</label>
                                        <input
                                          type="text"
                                          value={editingLessonTitle}
                                          onChange={(e) => setEditingLessonTitle(e.target.value)}
                                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-red-600 text-xs font-semibold"
                                          autoFocus
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-semibold text-muted-foreground mb-1">Descrição da Aula</label>
                                        <textarea
                                          value={editingLessonDescription}
                                          onChange={(e) => setEditingLessonDescription(e.target.value)}
                                          placeholder="Adicione instruções práticas..."
                                          rows={2}
                                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-red-600 text-xs resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)} type="button" className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-3.5 h-8">
                                          Cancelar
                                        </Button>
                                        <Button size="sm" type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3.5 h-8">
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
                                      <GripVertical 
                                        className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground cursor-grab shrink-0 mr-0.5" 
                                        onMouseDown={() => setDraggableLessonId(les.id)}
                                        onMouseUp={() => setDraggableLessonId(null)}
                                      />
                                      <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded-lg text-red-600 self-start shrink-0">
                                        <Play className="w-3.5 h-3.5 fill-red-600" />
                                      </div>
                                      <div className="flex flex-col min-w-0 text-left">
                                        <span className="text-foreground text-xs font-semibold truncate">{les.title}</span>
                                        {les.description ? (
                                          <span className="text-muted-foreground text-[10px] font-medium mt-0.5 line-clamp-1">
                                            {les.description}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground/60 text-[9px] italic mt-0.5">Sem descrição</span>
                                        )}
                                      </div>
                                      
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingLessonId(les.id);
                                          setEditingLessonTitle(les.title);
                                          setEditingLessonDescription(les.description || '');
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded cursor-pointer self-start mt-0.5 shrink-0"
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
                                          className="p-1 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                                          title="Mover para outro módulo"
                                        >
                                          <FolderInput className="w-3 h-3" />
                                        </button>
                                        
                                        {movingLessonId === les.id && (
                                          <div 
                                            className="absolute right-0 mt-1 w-56 bg-popover border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="px-2 py-1.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left">
                                              Mover para Módulo:
                                            </div>
                                            <div className="max-h-40 overflow-y-auto space-y-0.5">
                                              {modules
                                                .filter(m => m.id !== mod.id)
                                                .map(m => (
                                                  <button
                                                    key={m.id}
                                                    onClick={() => moveLessonToModule(les.id, mod.id, m.id)}
                                                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-red-600/10 hover:text-red-500 transition-colors truncate cursor-pointer"
                                                  >
                                                    {m.title}
                                                  </button>
                                                ))}
                                              {modules.length <= 1 && (
                                                <div className="px-2 py-1.5 text-[10px] text-muted-foreground/60 italic text-left">
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
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-red-500 rounded cursor-pointer self-start mt-0.5 shrink-0"
                                        title="Excluir Aula"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold font-mono shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {les.video_id ? (
                                      <span className="text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Vídeo Ativo
                                      </span>
                                    ) : (
                                      <span className="text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                        Aguardando Vídeo
                                      </span>
                                    )}
                                    <span>ID: {les.video_id ? les.video_id.substring(0, 8) : 'n/a'}...</span>
                                  </div>
                                </div>

                                {isLesIndicatorAfter && (
                                  <div 
                                    onDragOver={(e) => handleDragOverItem(e, 'lesson', les.id, mod.id)}
                                    onDragLeave={handleDragLeaveItem}
                                    onDrop={(e) => {
                                      handleDropItem(e, 'lesson', les.id, mod.id);
                                      setDraggableLessonId(null);
                                    }}
                                    className="h-[52px] border-2 border-dashed border-red-600/40 rounded-xl bg-red-600/[0.02] my-2 flex items-center justify-center gap-2 text-red-500/60 transition-all duration-300 ease-out animate-pulse shadow-[0_0_15px_rgba(229,9,20,0.02)]"
                                  >
                                    <Plus className="w-3.5 h-3.5 animate-bounce" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Mover Aula para cá</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isModuleIndicatorAfter && (
                    <div 
                      onDragOver={(e) => handleDragOverItem(e, 'module', mod.id)}
                      onDragLeave={handleDragLeaveItem}
                      onDrop={(e) => handleDropItem(e, 'module', mod.id)}
                      className="h-[76px] border-2 border-dashed border-red-600/40 rounded-2xl bg-red-600/[0.02] my-3 flex items-center justify-center gap-2 text-red-500/60 transition-all duration-300 ease-out animate-pulse shadow-[0_0_20px_rgba(229,9,20,0.02)]"
                    >
                      <FolderInput className="w-4 h-4 animate-bounce" />
                      <span className="text-xs font-bold uppercase tracking-wider">Mover Módulo para cá</span>
                    </div>
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover/95 border border-border px-6 py-3.5 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-6 fade-in duration-200 backdrop-blur-md">
        <div className="flex items-center gap-2 border-r border-border pr-6 shrink-0">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
          <span className="text-xs font-bold text-foreground font-mono">
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
              className="bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold border border-red-600/20 gap-1.5 h-8.5 rounded-xl cursor-pointer text-[11px]"
            >
              <FolderInput className="w-3.5 h-3.5" />
              Mover para...
            </Button>

            {bulkMoveDropdownOpen && (
              <div 
                className="absolute bottom-full mb-2 right-0 w-56 bg-popover border border-border rounded-xl shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-left">
                  Selecionar Módulo Destino:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {modules.map(m => (
                    <button
                      key={m.id}
                      onClick={() => moveSelectedLessonsToModule(m.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-red-600/10 hover:text-red-500 transition-colors truncate cursor-pointer"
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
            className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider pl-2 transition-colors cursor-pointer"
          >
            Desmarcar
          </button>
        </div>
      </div>
    )}

    {/* Modal - Novo Módulo */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Novo Módulo</h3>
              <button 
                onClick={() => setShowModuleModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Nome do Módulo</label>
                <input 
                  type="text" 
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="Ex: Passo Básico Universitário"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowModuleModal(false)}
                  className="border-border hover:bg-muted text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={moduleLoading}
                  className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-6"
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
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Film className="w-5 h-5 text-red-600" />
                Upload de Vídeoaula
              </h3>
              <button 
                onClick={() => !uploading && setShowLessonModal(false)}
                disabled={uploading}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Título da Aula</label>
                <input 
                  type="text" 
                  required
                  disabled={uploading}
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ex: Aula 01 - Postura e Giro Simples"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Descrição da Aula (Opcional)</label>
                <textarea 
                  disabled={uploading}
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Instruções sobre o que praticar..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-sm resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-1.5">Arquivo de Vídeo (.mp4, .mov, etc.)</label>
                <div className="relative border border-dashed border-border rounded-xl p-6 bg-muted/10 text-center flex flex-col items-center justify-center gap-2">
                  <input 
                    type="file" 
                    required
                    disabled={uploading}
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <FileVideo className="w-8 h-8 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'Arraste ou clique para selecionar o vídeo'}
                  </span>
                  {selectedFile && (
                    <span className="text-[10px] text-muted-foreground font-semibold font-mono">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              </div>

              {/* Status de Progresso do Upload */}
              {uploading && (
                <div className="space-y-2 p-4 rounded-2xl bg-red-950/10 border border-red-600/10">
                  <div className="flex items-center justify-between text-xs font-semibold text-red-500">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      {uploadStatus}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
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
                  className="border-border hover:bg-muted text-muted-foreground disabled:opacity-30"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading}
                  className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-6"
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

      {/* Modal - Editar Detalhes do Módulo */}
      {editingModule && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingModule(null);
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 md:p-10 animate-modal-backdrop"
        >
          <div 
            className="bg-card border border-border w-full max-w-lg flex flex-col rounded-3xl overflow-hidden shadow-2xl animate-modal-content text-left my-auto"
            style={{ maxHeight: '80vh' }}
          >
            <div className="p-6 border-b border-border bg-secondary/60 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Detalhes do Módulo
              </h3>
              <button 
                onClick={() => setEditingModule(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveModuleMetadata} className="p-6 space-y-4 overflow-y-auto min-h-0 flex-grow">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nome do Módulo</label>
                <input 
                  type="text" 
                  required
                  value={editModuleTitle}
                  onChange={(e) => setEditModuleTitle(e.target.value)}
                  placeholder="Ex: Passo Básico Universitário"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              {/* Capa Vertical (4:5) */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-semibold text-muted-foreground">Capa do Módulo (Proporção 4:5)</label>
                
                {editModuleCoverVertical ? (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ajuste de Enquadramento (Arrastar Imagem)</span>
                      <div 
                        className="relative w-full max-w-[130px] aspect-[4/5] mx-auto rounded-2xl overflow-hidden border border-border bg-secondary shadow-inner select-none cursor-move group"
                        onMouseDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const initialX = e.clientX;
                          const initialY = e.clientY;
                          const currentPos = editModuleCoverVerticalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - initialX;
                            const deltaY = moveEvent.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditModuleCoverVerticalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
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
                          const currentPos = editModuleCoverVerticalPosition || '50% 50%';
                          const [currXPct, currYPct] = currentPos.split(' ').map(val => parseFloat(val) || 50);

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const moveTouch = moveEvent.touches[0];
                            const deltaX = moveTouch.clientX - initialX;
                            const deltaY = moveTouch.clientY - initialY;
                            const newX = Math.max(0, Math.min(100, currXPct - (deltaX / rect.width) * 100));
                            const newY = Math.max(0, Math.min(100, currYPct - (deltaY / rect.height) * 100));
                            setEditModuleCoverVerticalPosition(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
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
                          src={editModuleCoverVertical} 
                          alt="" 
                          className="w-full h-full object-cover pointer-events-none"
                          style={{ objectPosition: editModuleCoverVerticalPosition || '50% 50%' }}
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black pointer-events-none p-3 text-center leading-tight">
                          <span>Arraste a imagem para enquadrar</span>
                          <span className="text-[8px] text-white/75 mt-1 font-semibold">{editModuleCoverVerticalPosition || '50% 50%'}</span>
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
                                setEditModuleCoverVertical(event.target?.result as string);
                                setEditModuleCoverVerticalPosition('50% 50%');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditModuleCoverVertical('');
                          setEditModuleCoverVerticalPosition('50% 50%');
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
                          setEditModuleCoverVertical(event.target?.result as string);
                          setEditModuleCoverVerticalPosition('50% 50%');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  >
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">Enviar Capa (4:5)</span>
                    <span className="text-[9px] text-muted-foreground/60 mt-1">Clique ou arraste a imagem aqui</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setEditModuleCoverVertical(event.target?.result as string);
                            setEditModuleCoverVerticalPosition('50% 50%');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingModule(null)}
                  className="border-border hover:bg-muted text-muted-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={editModuleLoading}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6"
                >
                  {editModuleLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
