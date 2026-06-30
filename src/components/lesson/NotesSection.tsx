'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, Globe, Lock, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createNoteAction, deleteNoteAction } from '@/app/actions';

interface Note {
  id: string;
  lesson_id: string;
  user_id: string;
  watched_seconds: number;
  content: string;
  is_public: number;
  created_at: string;
  full_name?: string;
  username?: string;
  role?: string;
  is_owner?: boolean;
}

interface NotesSectionProps {
  lessonId: string;
  currentTime: number;
  isAdmin: boolean;
  onSeek: (seconds: number) => void;
  showToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onNotesLoaded?: (notes: Note[]) => void;
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

export function NotesSection({
  lessonId,
  currentTime,
  isAdmin,
  onSeek,
  showToast,
  onNotesLoaded,
}: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteContent, setNoteContent] = useState('');
  const [noteIsPublic, setNoteIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);

  const onNotesLoadedRef = useRef(onNotesLoaded);
  useEffect(() => {
    onNotesLoadedRef.current = onNotesLoaded;
  }, [onNotesLoaded]);

  // Report notes back to parent
  useEffect(() => {
    onNotesLoadedRef.current?.(notes);
  }, [notes]);

  // Load notes when active lesson changes
  useEffect(() => {
    const controller = new AbortController();
    setNotes([]);
    setLoading(true);
    setTypingStartTime(null);

    const fetchNotes = async () => {
      let aborted = false;
      try {
        const res = await fetch(`/api/notes?lessonId=${lessonId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        } else {
          setNotes([]);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          aborted = true;
        } else {
          console.error('Erro ao buscar notas da aula:', err);
          setNotes([]);
        }
      } finally {
        if (!aborted) {
          setLoading(false);
        }
      }
    };
    fetchNotes();

    return () => {
      controller.abort();
    };
  }, [lessonId]);

  const activeTime = typingStartTime !== null ? typingStartTime : currentTime;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      const res = await createNoteAction(lessonId, noteContent.trim(), activeTime, noteIsPublic);

      if (res.note) {
        setNotes((prev) => {
          const updated = [...prev, res.note as Note];
          return updated.sort((a, b) => a.watched_seconds - b.watched_seconds);
        });
        setNoteContent('');
        setTypingStartTime(null);
        showToast('Anotação adicionada com sucesso!', 'success');
      } else if (res.error) {
        showToast(res.error, 'warning');
      }
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
      showToast('Falha de conexão ao salvar anotação.', 'warning');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Deseja realmente excluir esta anotação?')) return;

    try {
      const res = await deleteNoteAction(noteId);

      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast('Anotação removida.', 'info');
      } else if (res.error) {
        showToast(res.error, 'warning');
      }
    } catch (err) {
      console.error('Erro ao excluir anotação:', err);
      showToast('Falha de conexão ao excluir anotação.', 'warning');
    }
  };

  return (
    <div className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-md">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-550" />
          <h3 className="font-extrabold text-base text-foreground tracking-tight">
            Anotações da Aula
          </h3>
        </div>
        <span className="text-[10px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full font-bold">
          {notes.length} {notes.length === 1 ? 'anotação' : 'anotações'}
        </span>
      </div>

      {/* Formulário para Nova Anotação */}
      <form onSubmit={handleAddNote} className="space-y-4">
        <div className="relative">
          <textarea
            value={noteContent}
            onChange={(e) => {
              const val = e.target.value;
              setNoteContent(val);
              if (val.trim().length > 0) {
                if (typingStartTime === null) {
                  setTypingStartTime(currentTime);
                }
              } else {
                setTypingStartTime(null);
              }
            }}
            placeholder="Escreva sua anotação ou observação para este momento do vídeo..."
            className="w-full min-h-[90px] bg-background border border-border rounded-xl p-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-650 focus:border-red-650 transition-all placeholder:text-muted-foreground/60 resize-y"
            maxLength={1000}
          />
          {/* Indicador do caractere */}
          <span className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/50">
            {noteContent.length}/1000
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Controle de Privacidade */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
              <input
                type="radio"
                name="note-privacy"
                checked={noteIsPublic}
                onChange={() => setNoteIsPublic(true)}
                className="w-3.5 h-3.5 rounded-full border border-border text-red-600 focus:ring-red-500"
              />
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Pública (visível para todos)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
              <input
                type="radio"
                name="note-privacy"
                checked={!noteIsPublic}
                onChange={() => setNoteIsPublic(false)}
                className="w-3.5 h-3.5 rounded-full border border-border text-red-600 focus:ring-red-500"
              />
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Privada (apenas para mim)</span>
            </label>
          </div>

          {/* Botão de Envio com tempo atual */}
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 h-9 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Anotar em {formatSeconds(activeTime)}
          </Button>
        </div>
      </form>

      {/* Lista de Anotações */}
      {notes.length > 0 ? (
        <div className="space-y-3.5 mt-6 pt-4 border-t border-border/60 max-h-[400px] overflow-y-auto pr-1">
          {notes.map((note) => {
            const isOwner = !!note.is_owner;
            const canDelete = isOwner || isAdmin;

            return (
              <div
                key={note.id}
                className="flex gap-4 p-4 rounded-xl bg-background/50 border border-border/40 hover:border-border/80 transition-colors group relative"
              >
                {/* Timestamp Button */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSeek(note.watched_seconds)}
                    className="bg-red-650/10 hover:bg-red-600 hover:text-white text-red-500 text-[10px] font-black py-1 px-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none"
                    title="Pular para este momento no vídeo"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    {formatSeconds(note.watched_seconds)}
                  </button>
                </div>

                {/* Content & Metadata */}
                <div className="flex-grow space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">
                      {note.full_name || note.username || 'Aluno'}
                    </span>
                    {note.role === 'admin' && (
                      <span className="bg-red-600/10 text-red-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider">
                        Admin
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(note.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {note.is_public === 0 && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full select-none">
                        <Lock className="w-2.5 h-2.5" />
                        Privada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
                    {note.content}
                  </p>
                </div>

                {/* Delete Button */}
                {canDelete && (
                  <div className="shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-muted-foreground hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Excluir anotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-muted-foreground text-xs font-medium">
          Carregando anotações...
        </div>
      ) : (
        <div className="text-center py-8 bg-background/30 rounded-xl border border-dashed border-border text-muted-foreground text-xs font-medium">
          Nenhuma anotação nesta aula ainda. Seja o primeiro a fazer uma observação!
        </div>
      )}
    </div>
  );
}
