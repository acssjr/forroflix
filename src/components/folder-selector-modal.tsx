'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Star, Folder, Check, Globe, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FolderItem {
  id: string;
  name: string;
  is_global: number;
  course_id: string | null;
  active: boolean;
}

interface FolderSelectorModalProps {
  lessonId: string;
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onFavoritesUpdated?: (lessonId: string, isFavorited: boolean) => void;
}

export function FolderSelectorModal({
  lessonId,
  courseId,
  isOpen,
  onClose,
  onFavoritesUpdated,
}: FolderSelectorModalProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIsGlobal, setNewFolderIsGlobal] = useState(true); // padrão global
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/favorites?lessonId=${lessonId}&courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Erro ao buscar pastas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lessonId) {
      fetchFolders();
    }
  }, [isOpen, lessonId]);

  // Limpar feedback após 2.5s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const showFeedback = (msg: string, type: 'success' | 'warning' = 'success') => {
    setFeedback({ message: msg, type });
  };

  const handleToggleFolder = async (folder: FolderItem) => {
    const newActiveState = !folder.active;
    
    // feedback visual
    if (newActiveState) {
      showFeedback(`Vídeo salvo na pasta "${folder.name}"`, 'success');
    } else {
      showFeedback(`Vídeo removido da pasta "${folder.name}"`, 'warning');
    }

    // Atualização otimista local
    const updatedFolders = folders.map((f) =>
      f.name === folder.name && f.is_global === folder.is_global && f.course_id === folder.course_id
        ? { ...f, active: newActiveState }
        : f
    );
    setFolders(updatedFolders);

    // Notificar pai sobre o status favorito geral da lição
    const isNowFavorited = updatedFolders.some((f) => f.active);
    if (onFavoritesUpdated) {
      onFavoritesUpdated(lessonId, isNowFavorited);
    }

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          folderName: folder.name,
          isGlobal: folder.is_global === 1,
          courseId: folder.is_global === 1 ? null : courseId,
          active: newActiveState,
        }),
      });

      if (!res.ok) {
        // Reverter em caso de erro
        fetchFolders();
      }
    } catch (err) {
      console.error('Erro ao alternar pasta:', err);
      fetchFolders();
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || actionLoading) return;

    setActionLoading(true);
    const folderName = newFolderName.trim();
    const isGlobal = newFolderIsGlobal;
    const currentCourseId = isGlobal ? null : courseId;

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          folderName,
          isGlobal,
          courseId: currentCourseId,
          active: true,
        }),
      });

      if (res.ok) {
        setNewFolderName('');
        showFeedback(`Vídeo salvo na pasta "${folderName}"`);
        // Recarregar pastas da API para garantir ids e estados consistentes
        await fetchFolders();
        
        // Notificar pai que agora está favoritado
        if (onFavoritesUpdated) {
          onFavoritesUpdated(lessonId, true);
        }
      }
    } catch (err) {
      console.error('Erro ao criar pasta:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visual Feedback Toast inside Modal */}
        {feedback && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 border backdrop-blur-md font-semibold text-xs py-3.5 px-6 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-page-enter select-none w-[90%] justify-center ${
            feedback.type === 'success'
              ? 'bg-slate-950 border-green-500/30 text-green-400'
              : 'bg-slate-950 border-red-500/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Header do modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <h3 className="font-extrabold text-white text-lg">Salvar aula em...</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de pastas */}
        <div className="flex-grow overflow-y-auto max-h-60 space-y-2 pr-1 min-h-24">
          {loading ? (
            <div className="h-24 flex items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span>Carregando pastas...</span>
            </div>
          ) : (() => {
            // Filtra as pastas exibidas baseado na seleção do toggle "Tipo de nova pasta" (Geral vs Deste Curso)
            const filteredFolders = folders.filter((f) => {
              if (newFolderIsGlobal) {
                // Modo Geral: Mostra apenas pastas globais (is_global === 1)
                return f.is_global === 1;
              } else {
                // Modo Deste Curso: Mostra apenas pastas com escopo deste curso (is_global === 0 e course_id === courseId)
                return f.is_global === 0 && f.course_id === courseId;
              }
            });

            if (filteredFolders.length === 0) {
              return (
                <div className="h-24 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                  <span>Nenhuma pasta pré-criada ou personalizada encontrada neste escopo.</span>
                  <span className="text-[10px] mt-1 text-slate-600">Crie uma nova no campo abaixo para este tipo.</span>
                </div>
              );
            }

            return filteredFolders.map((folder) => {
              const scopeLabel = folder.is_global === 1 ? 'Global' : 'Este Curso';
              const ScopeIcon = folder.is_global === 1 ? Globe : GraduationCap;
              
              return (
                <button
                  key={folder.id + '_' + folder.is_global}
                  onClick={() => handleToggleFolder(folder)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer ${
                    folder.active
                      ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-500'
                      : 'bg-slate-900/30 border-slate-900 text-slate-300 hover:bg-slate-900/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className={`w-4 h-4 ${folder.active ? 'fill-yellow-500/10' : ''}`} />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{folder.name}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase flex items-center gap-1 mt-0.5">
                        <ScopeIcon className="w-3 h-3 text-slate-600" />
                        {scopeLabel}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    folder.active
                      ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'border-slate-800 group-hover:border-slate-600'
                  }`}>
                    {folder.active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            });
          })()}
        </div>

        {/* Botão de Salvar/Concluir explicitamente */}
        <Button 
          onClick={onClose}
          className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider mt-1"
        >
          Concluir
        </Button>

        {/* Formulário para criar pasta (Instagram-style inline form) */}
        <form onSubmit={handleCreateFolder} className="border-t border-slate-900 pt-4 space-y-3">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Tipo de nova pasta
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewFolderIsGlobal(true)}
                className={`py-2 px-3 rounded-xl border text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                  newFolderIsGlobal
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Geral (Todos)
              </button>
              <button
                type="button"
                onClick={() => setNewFolderIsGlobal(false)}
                className={`py-2 px-3 rounded-xl border text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                  !newFolderIsGlobal
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Deste Curso
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Criar nova pasta..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
              maxLength={30}
              required
            />
            <button
              type="submit"
              disabled={!newFolderName.trim() || actionLoading}
              className="p-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/10 transition-all shrink-0"
              title="Criar Pasta"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
