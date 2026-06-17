'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Play } from 'lucide-react';
import { FolderSelectorModal } from '@/components/folder-selector-modal';

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

interface GlobalFavoritesProps {
  initialFavorites: FavoriteLesson[];
  libraryId: string;
}

export function GlobalFavorites({ initialFavorites, libraryId }: GlobalFavoritesProps) {
  const [favorites, setFavorites] = useState<FavoriteLesson[]>(initialFavorites);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleOpenFolderModal = (e: React.MouseEvent, lessonId: string, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedLessonId(lessonId);
    setSelectedCourseId(courseId);
    setModalOpen(true);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (favorites.length === 0) return null;

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          Aulas Salvas para Revisão
        </h2>
        <p className="text-xs text-slate-400">Sua pasta de aulas salvas para revisar e praticar de todos os cursos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {favorites.map((fav) => (
          <div 
            key={fav.id} 
            className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden hover:border-red-600/20 transition-all duration-300 flex flex-col group relative"
          >
            {/* Thumbnail Wrapper */}
            <Link 
              href={`/courses/${fav.course_slug}/${fav.id}`}
              style={{ textDecoration: 'none' }}
              className="relative aspect-video w-full bg-slate-900 border-b border-slate-900 overflow-hidden !no-underline no-underline"
            >
              {libraryId && fav.video_id ? (
                <img
                  src={`https://vz-${libraryId}.b-cdn.net/${fav.video_id}/thumbnail.jpg`}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                <div className="bg-red-600 text-white p-2.5 rounded-full scale-90 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg shadow-red-600/20">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                {formatDuration(fav.duration_seconds)}
              </div>
            </Link>

            {/* Content info */}
            <div className="p-4 flex-grow flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
                  <span className="text-red-500/85">{fav.course_title}</span>
                  <span>•</span>
                  <span>{fav.module_title}</span>
                </div>
                <Link 
                  href={`/courses/${fav.course_slug}/${fav.id}`}
                  style={{ textDecoration: 'none' }}
                  className="text-sm font-extrabold text-slate-200 hover:text-red-500 transition-colors line-clamp-2 leading-tight block !no-underline no-underline"
                >
                  {fav.title}
                </Link>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-900/50">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Remover dos favoritos imediatamente com 1 clique
                    setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
                    showToast('Removido das aulas salvas', 'warning');
                    
                    try {
                      await fetch('/api/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          lessonId: fav.id,
                          favorited: false,
                        }),
                      });
                    } catch (err) {
                      console.error('Erro ao desfavoritar global:', err);
                      window.location.reload();
                    }
                  }}
                  className="text-xs font-bold text-yellow-500 flex items-center gap-1 hover:text-slate-400 transition-colors"
                  title="Remover dos favoritos"
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  Salva
                </button>

                <Link
                  href={`/courses/${fav.course_slug}/${fav.id}`}
                  style={{ textDecoration: 'none' }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider transition-colors !no-underline no-underline"
                >
                  Assistir Aula
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selector Modal */}
      {modalOpen && selectedLessonId && selectedCourseId && (
        <FolderSelectorModal
          lessonId={selectedLessonId}
          courseId={selectedCourseId}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onFavoritesUpdated={(lessonId, isFavorited) => {
            if (!isFavorited) {
              setFavorites((prev) => prev.filter((f) => f.id !== lessonId));
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border backdrop-blur-md font-semibold text-xs py-3 px-6 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-page-enter select-none ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : toast.type === 'warning'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : toast.type === 'info'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-slate-950/95 border-slate-900 text-slate-300'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'warning'
                ? 'bg-red-500'
                : toast.type === 'info'
                  ? 'bg-yellow-500'
                  : 'bg-slate-400'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
