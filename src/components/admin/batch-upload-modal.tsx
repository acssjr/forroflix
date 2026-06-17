'use client';

import { useState, useRef, useEffect } from 'react';
import * as tus from 'tus-js-client';
import { 
  X, 
  Plus, 
  FileVideo, 
  Film, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Play,
  Trash2,
  RefreshCw,
  Info,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadableFile {
  id: string;
  file: File;
  title: string;
  relativePath: string;
  folderName: string;
  status: 'pending' | 'preparing' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  videoId?: string;
  lessonId?: string;
  uploadInstance?: tus.Upload | null;
}

interface ModuleStructure {
  folderName: string;
  files: UploadableFile[];
}

interface BatchUploadModalProps {
  courseId: string;
  moduleId?: string | null;
  moduleTitle?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUploadCompleted: () => void; // Recarregar a lista de aulas ao finalizar
}

// Helper para ler entradas FileSystem recursivamente baseadas em Promises
const readEntriesPromise = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
};

export function BatchUploadModal({
  courseId,
  moduleId,
  moduleTitle,
  isOpen,
  onClose,
  onUploadCompleted
}: BatchUploadModalProps) {
  const [structure, setStructure] = useState<ModuleStructure[]>([]);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  // Limpar ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      // Abortar qualquer upload em andamento
      structure.forEach((mod) => {
        mod.files.forEach((f) => {
          if (f.uploadInstance) f.uploadInstance.abort();
        });
      });
      setStructure([]);
      setUploadingAll(false);
      setGlobalProgress(0);
      setUploadDone(false);
    }
  }, [isOpen]);

  // Monitorar conclusão dos uploads
  useEffect(() => {
    const flatFiles = structure.flatMap(m => m.files);
    if (flatFiles.length === 0) return;

    const anyUploading = flatFiles.some(f => f.status === 'uploading' || f.status === 'preparing');
    const allDone = flatFiles.every(f => f.status === 'completed' || f.status === 'error');

    if (uploadingAll && !anyUploading && allDone) {
      setUploadingAll(false);
      setUploadDone(true);
    }
  }, [structure, uploadingAll]);

  if (!isOpen) return null;

  // Função recursiva para varrer FileSystemEntry (drag e drop de pasta)
  const traverseEntry = async (entry: FileSystemEntry, path = ""): Promise<UploadableFile[]> => {
    const list: UploadableFile[] = [];

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });

      // Aceitar apenas arquivos de vídeo
      if (file.type.startsWith('video/')) {
        const parts = path.split('/').filter(Boolean);
        // Se houver moduleId (modo local), forçamos o nome do módulo a ser o moduleTitle.
        // Caso contrário, extraímos o nome do diretório ou 'Módulo Geral'.
        const folderName = moduleId && moduleTitle ? moduleTitle : (parts.length > 0 ? parts[parts.length - 1] : 'Módulo Geral');
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

        list.push({
          id: crypto.randomUUID(),
          file,
          title: baseName,
          relativePath: path + file.name,
          folderName,
          status: 'pending',
          progress: 0,
          uploadInstance: null
        });
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      
      const entries: FileSystemEntry[] = [];
      while (true) {
        const batch = await readEntriesPromise(reader);
        if (batch.length === 0) break;
        entries.push(...batch);
      }

      for (const subEntry of entries) {
        const nested = await traverseEntry(subEntry, `${path}${entry.name}/`);
        list.push(...nested);
      }
    }

    return list;
  };

  // Organizar arquivos agrupando por módulos (nomes das pastas)
  const groupFilesIntoStructure = (files: UploadableFile[]) => {
    setStructure(prev => {
      const currentMap = new Map<string, UploadableFile[]>();
      
      // Preservar itens já existentes
      prev.forEach(mod => {
        currentMap.set(mod.folderName, [...mod.files]);
      });

      files.forEach(f => {
        const list = currentMap.get(f.folderName) || [];
        // Evitar adicionar arquivos duplicados por nome
        if (!list.some(existing => existing.file.name === f.file.name && existing.file.size === f.file.size)) {
          list.push(f);
        }
        currentMap.set(f.folderName, list);
      });

      return Array.from(currentMap.entries()).map(([folderName, filesList]) => {
        // Ordenação natural/numérica para manter a ordem sequencial das aulas (ex: 1, 2, ..., 16)
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        const sortedFiles = [...filesList].sort((a, b) => collator.compare(a.title, b.title));
        
        return {
          folderName,
          files: sortedFiles
        };
      });
    });
  };

  // Tratar seleção múltipla de arquivos ou pastas (File Picker)
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const videoFiles = files.filter(f => f.type.startsWith('video/'));

      if (videoFiles.length === 0) {
        alert('Por favor, selecione apenas arquivos de vídeo.');
        return;
      }

      const list: UploadableFile[] = videoFiles.map(f => {
        // webkitRelativePath conterá a estrutura caso selecionado via picker de pasta
        const parts = f.webkitRelativePath.split('/');
        // Se houver moduleId (modo local), forçamos o nome do módulo a ser o moduleTitle.
        const folderName = moduleId && moduleTitle ? moduleTitle : (parts.length > 1 ? parts[parts.length - 2] : 'Módulo Geral');
        const baseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;

        return {
          id: crypto.randomUUID(),
          file: f,
          title: baseName,
          relativePath: f.webkitRelativePath || f.name,
          folderName,
          status: 'pending',
          progress: 0,
          uploadInstance: null
        };
      });

      groupFilesIntoStructure(list);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const promises = items.map(item => {
        const entry = item.webkitGetAsEntry();
        return entry ? traverseEntry(entry) : Promise.resolve([]);
      });

      const results = await Promise.all(promises);
      const flatFiles = results.flat();
      groupFilesIntoStructure(flatFiles);
    }
  };

  // Remover arquivo individual
  const removeFile = (folderName: string, id: string) => {
    setStructure(prev => {
      return prev.map(mod => {
        if (mod.folderName === folderName) {
          const target = mod.files.find(f => f.id === id);
          if (target?.uploadInstance) target.uploadInstance.abort();
          return {
            ...mod,
            files: mod.files.filter(f => f.id !== id)
          };
        }
        return mod;
      }).filter(mod => mod.files.length > 0);
    });
  };

  // Remover módulo inteiro
  const removeModule = (folderName: string) => {
    setStructure(prev => {
      const mod = prev.find(m => m.folderName === folderName);
      mod?.files.forEach(f => {
        if (f.uploadInstance) f.uploadInstance.abort();
      });
      return prev.filter(m => m.folderName !== folderName);
    });
  };

  // Editar título da aula
  const updateTitle = (folderName: string, id: string, newTitle: string) => {
    setStructure(prev => prev.map(mod => {
      if (mod.folderName === folderName) {
        return {
          ...mod,
          files: mod.files.map(f => f.id === id ? { ...f, title: newTitle } : f)
        };
      }
      return mod;
    }));
  };

  // Iniciar importação e uploads
  const startBatchUpload = async () => {
    if (structure.length === 0 || uploadingAll) return;
    setUploadingAll(true);

    try {
      // 1. Preparar lote completo na D1 (cria os módulos e as aulas sob uma transação atômica)
      const importPayload = structure.map(mod => ({
        folderName: mod.folderName,
        moduleId: moduleId || undefined, // Envia o id do módulo se em modo local
        files: mod.files.map(f => ({ title: f.title, tempId: f.id }))
      }));

      const res = await fetch('/api/admin/courses/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          structure: importPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar estrutura.');

      const { libraryId, uploads } = data;

      // 2. Mapear credenciais recebidas nos itens locais
      setStructure(prev => {
        const updated = prev.map(mod => {
          return {
            ...mod,
            files: mod.files.map(f => {
              const credentials = uploads.find((u: any) => u.tempId === f.id);
              if (credentials) {
                return {
                  ...f,
                  status: 'preparing' as const,
                  videoId: credentials.videoId,
                  lessonId: credentials.lessonId,
                  authSignature: credentials.signature,
                  authExpire: credentials.expirationTime
                };
              }
              return {
                ...f,
                status: 'error' as const,
                error: 'Não autorizado.'
              };
            })
          };
        });

        // Disparar fila de upload TUS paralela
        setTimeout(() => {
          triggerUploadQueue(updated, libraryId);
        }, 100);

        return updated;
      });

    } catch (err: any) {
      alert(err.message || 'Erro de inicialização delote.');
      setUploadingAll(false);
    }
  };

  // Fila de upload concorrente (Limite: 3 uploads simultâneos)
  const triggerUploadQueue = (currentStructure: ModuleStructure[], libraryId: string) => {
    const flatFilesList = currentStructure.flatMap(m => m.files.filter(f => f.status === 'preparing' && f.videoId));
    if (flatFilesList.length === 0) {
      setUploadingAll(false);
      return;
    }

    const maxConcurrency = 3;
    let activeCount = 0;
    let currentIndex = 0;

    const processNext = () => {
      if (currentIndex >= flatFilesList.length) {
        return;
      }

      const item = flatFilesList[currentIndex];
      currentIndex++;

      activeCount++;
      performTusUpload(item, libraryId, () => {
        activeCount--;
        processNext();
      });

      if (activeCount < maxConcurrency) {
        processNext();
      }
    };

    for (let i = 0; i < Math.min(maxConcurrency, flatFilesList.length); i++) {
      processNext();
    }
  };

  // Executar upload individual via TUS Client
  const performTusUpload = (
    item: UploadableFile & { authSignature?: string; authExpire?: number },
    libraryId: string,
    onFinished: () => void
  ) => {
    if (!item.videoId || !item.authSignature || !item.authExpire) {
      updateItemStatus(item.folderName, item.id, { status: 'error', error: 'Credenciais ausentes' });
      onFinished();
      return;
    }

    updateItemStatus(item.folderName, item.id, { status: 'uploading' });

    const upload = new tus.Upload(item.file, {
      endpoint: 'https://video.bunnycdn.com/tusupload',
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        'AuthorizationSignature': item.authSignature,
        'AuthorizationExpire': String(item.authExpire),
        'LibraryId': libraryId,
        'VideoId': item.videoId
      },
      metadata: {
        filetype: item.file.type,
        title: item.title
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        updateItemStatus(item.folderName, item.id, { 
          status: 'error', 
          error: error.message || 'Falha no envio.' 
        });
        onFinished();
      },
      onShouldRetry: (error, retryAttempt) => {
        console.warn(`TUS retry attempt ${retryAttempt} due to error:`, error);
        updateItemStatus(item.folderName, item.id, {
          status: 'uploading',
          error: 'Conexão instável. Retomando upload...'
        });
        return true;
      },
      onProgress: (bytesSent, bytesTotal) => {
        const percentage = Math.round((bytesSent / bytesTotal) * 100);
        updateItemStatus(item.folderName, item.id, { 
          progress: percentage,
          error: undefined
        });
      },
      onSuccess: () => {
        updateItemStatus(item.folderName, item.id, { status: 'completed', progress: 100, error: undefined });
        
        // Atualizar status no banco de dados para 'completed'
        fetch('/api/admin/courses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lesson',
            id: item.lessonId,
            uploadStatus: 'completed'
          })
        }).catch(err => console.error('Erro ao atualizar status da lição:', err));

        onFinished();
      }
    });

    setStructure(prev => prev.map(mod => {
      if (mod.folderName === item.folderName) {
        return {
          ...mod,
          files: mod.files.map(f => f.id === item.id ? { ...f, uploadInstance: upload } : f)
        };
      }
      return mod;
    }));

    upload.start();
  };

  // Retentar upload individual
  const retryIndividualUpload = async (item: UploadableFile) => {
    if (item.status !== 'error') return;
    updateItemStatus(item.folderName, item.id, { status: 'preparing', error: undefined, progress: 0 });

    try {
      const res = await fetch('/api/admin/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, videoId: item.videoId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reautorização falhou.');

      const { libraryId, signature, expirationTime } = data;

      performTusUpload(
        {
          ...item,
          authSignature: signature,
          authExpire: expirationTime
        },
        libraryId,
        () => {
          onUploadCompleted();
        }
      );
    } catch (err: any) {
      updateItemStatus(item.folderName, item.id, { status: 'error', error: err.message });
    }
  };

  // Helper para atualizar estados dos arquivos
  const updateItemStatus = (folderName: string, id: string, updates: Partial<UploadableFile>) => {
    setStructure(prev => {
      const newList = prev.map(mod => {
        if (mod.folderName === folderName) {
          return {
            ...mod,
            files: mod.files.map(f => f.id === id ? { ...f, ...updates } : f)
          };
        }
        return mod;
      });

      // Progresso Médio Global
      const flatFiles = newList.flatMap(m => m.files);
      const totalProgress = flatFiles.reduce((acc, curr) => acc + curr.progress, 0);
      const average = Math.round(totalProgress / flatFiles.length);
      setGlobalProgress(average);

      return newList;
    });
  };

  if (uploadDone) {
    const flatFiles = structure.flatMap(m => m.files);
    const successCount = flatFiles.filter(f => f.status === 'completed').length;
    const errorCount = flatFiles.filter(f => f.status === 'error').length;
    const totalCount = flatFiles.length;
    const createdModulesCount = structure.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
        <div 
          className="relative w-full max-w-md bg-slate-950 border border-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          {errorCount === 0 ? (
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <AlertCircle className="w-10 h-10 animate-pulse" />
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-extrabold text-white text-xl">
              {errorCount === 0 ? 'Upload concluído com sucesso!' : 'Importação com Pendências'}
            </h3>
            <p className="text-slate-400 text-sm">
              {errorCount === 0 
                ? 'Todos os seus vídeos foram enviados e as aulas foram criadas.' 
                : 'Alguns vídeos não puderam ser enviados. Você pode concluir as aulas de sucesso ou revisar os erros.'}
            </p>
          </div>

          <div className="w-full bg-[#0b0b11] border border-slate-900 rounded-2xl p-5 space-y-3.5 text-left text-xs text-slate-300">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900/60 font-semibold text-slate-400">
              <span>Resumo do Processamento</span>
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">D1 & Bunny</span>
            </div>
            
            {!moduleId && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Módulos Criados:</span>
                <span className="font-bold text-white font-mono">{createdModulesCount}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Aulas com Sucesso:</span>
              <span className="font-bold text-green-400 font-mono">{successCount} / {totalCount}</span>
            </div>

            {errorCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Aulas com Erro:</span>
                <span className="font-bold text-red-400 font-mono">{errorCount}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={() => {
                onUploadCompleted();
                onClose();
              }}
              className="w-full bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/10 text-sm uppercase tracking-wider transition-all duration-200"
            >
              Concluir e Ver Grade
            </Button>
            
            {errorCount > 0 && (
              <button
                onClick={() => setUploadDone(false)}
                className="w-full text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider py-2 cursor-pointer transition-colors"
              >
                Revisar Aulas com Erro
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-red-600" />
            <h3 className="font-extrabold text-white text-lg">
              {moduleId ? `Adicionar em Lote: ${moduleTitle}` : 'Upload Estruturado em Lote'}
            </h3>
          </div>
          <button 
            disabled={uploadingAll}
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-900 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-red-600/5 border border-red-600/10 p-3 rounded-2xl flex items-start gap-2.5 my-4">
          <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide block">
              {moduleId ? 'Upload Local de Aulas' : 'Importação de Pastas'}
            </span>
            <p className="text-[11px] text-slate-400 leading-normal">
              {moduleId 
                ? `Selecione ou arraste múltiplos vídeos. Eles serão adicionados diretamente como novas aulas ao módulo "${moduleTitle}" em ordem.`
                : 'Arraste pastas com vídeos. Cada pasta será automaticamente convertida em um Módulo e seus vídeos serão as Aulas aninhadas. Você também pode clicar abaixo para carregar uma pasta pelo seletor de arquivos.'
              }
            </p>
          </div>
        </div>

        {/* Area */}
        <div className="flex-grow flex flex-col min-h-0 relative">
          {structure.length === 0 ? (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="tus-upload-input-trigger"
              className={`flex-grow border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center gap-3 transition-all cursor-pointer ${
                isDragOver 
                  ? 'border-red-600 bg-red-600/5' 
                  : 'border-slate-900 bg-slate-950/40 hover:border-slate-800'
              }`}
            >
              <FileVideo className={`w-12 h-12 transition-colors ${isDragOver ? 'text-red-600' : 'text-slate-700'}`} />
              <div className="space-y-1">
                <span className="text-sm font-semibold text-slate-400 block">
                  {moduleId ? 'Arraste os vídeos aqui' : 'Arraste Pastas contendo vídeos aqui'}
                </span>
                <span className="text-xs text-slate-600 block">
                  {moduleId ? 'ou clique para selecionar múltiplos vídeos' : 'ou clique para carregar uma Pasta inteira'}
                </span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                {...(moduleId ? {} : {
                  webkitdirectory: "",
                  directory: ""
                } as any)}
                multiple 
                accept="video/*" 
                className="hidden" 
                onChange={handleFileSelection}
              />
            </div>
          ) : (
            <div className="flex-grow flex flex-col min-h-0">
              {/* Lista Estruturada */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                {structure.map((mod) => (
                  <div key={mod.folderName} className="border border-slate-900/60 bg-slate-950 rounded-2xl p-4 space-y-3">
                    {/* Header do Módulo sugerido */}
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <div className="flex items-center gap-2 text-slate-200">
                        <FolderOpen className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Módulo: {mod.folderName}</span>
                      </div>
                      {!uploadingAll && !moduleId && (
                        <button 
                          onClick={() => removeModule(mod.folderName)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase cursor-pointer"
                        >
                          Remover Módulo
                        </button>
                      )}
                    </div>

                    {/* Aulas/Arquivos dentro do módulo */}
                    <div className="space-y-2">
                      {mod.files.map((item) => (
                        <div 
                          key={item.id}
                          className="p-3 bg-[#0b0b11]/80 border border-slate-900/55 rounded-xl flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <div className="bg-slate-950 p-1.5 rounded-lg text-slate-500 shrink-0">
                              <Play className="w-3.5 h-3.5 fill-slate-500" />
                            </div>
                            
                            <div className="flex-grow min-w-0 space-y-1 text-left">
                              {item.status === 'pending' ? (
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateTitle(mod.folderName, item.id, e.target.value)}
                                  className="bg-[#0c0c14] border border-slate-800 rounded-lg px-2.5 py-0.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-red-600/50 w-full"
                                />
                              ) : (
                                <span className="text-xs font-bold text-slate-300 line-clamp-1 block px-1">
                                  {item.title}
                                </span>
                              )}
                              <div className="text-[9px] text-slate-500 font-semibold font-mono px-1">
                                {(item.file.size / 1024 / 1024).toFixed(1)} MB
                              </div>
                              {item.status === 'uploading' && (
                                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              )}
                              {item.error && (
                                <div className="text-[10px] text-amber-500 font-semibold animate-pulse mt-1 px-1">
                                  {item.error}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => removeFile(mod.folderName, item.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-950 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {item.status === 'preparing' && (
                              <span className="text-[9px] text-red-500/80 font-bold uppercase flex items-center gap-1.5 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin animate-pulse" />
                                Preparando
                              </span>
                            )}

                            {item.status === 'uploading' && (
                              <span className="text-[9px] text-red-500 font-extrabold uppercase flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {item.progress}%
                              </span>
                            )}

                            {item.status === 'completed' && (
                              <span className="text-[9px] text-green-500 font-extrabold uppercase flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 fill-green-950/20" />
                                Sucesso
                              </span>
                            )}

                            {item.status === 'error' && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-red-400 font-bold uppercase flex items-center gap-0.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Falha
                                </span>
                                <button
                                  onClick={() => retryIndividualUpload(item)}
                                  className="p-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded hover:bg-red-500/20 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Global */}
              {uploadingAll && (
                <div className="mt-4 p-4 rounded-2xl bg-red-950/10 border border-red-600/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-red-500">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      Enviando estrutura completa para Bunny CDN...
                    </span>
                    <span>{globalProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-900 mt-4 shrink-0">
          {structure.length > 0 && !uploadingAll ? (
            <button
              onClick={() => setStructure([])}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider cursor-pointer"
            >
              Limpar lote
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline"
              disabled={uploadingAll}
              onClick={onClose}
              className="border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl cursor-pointer text-xs"
            >
              Fechar
            </Button>
            {structure.length > 0 && (
              <Button 
                onClick={startBatchUpload}
                disabled={uploadingAll || structure.every(m => m.files.every(f => f.status === 'completed'))}
                className="bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-red-600/10 disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
              >
                {uploadingAll ? 'Processando Lote...' : 'Iniciar Importação Estruturada'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
