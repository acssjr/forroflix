'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  X,
  Music,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Play,
  Star,
  CheckCircle2,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration_seconds: number;
  video_id: string;
  position: number;
  description?: string;
  submodule?: string | null;
}

interface Module {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface LessonAccordionProps {
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  localModules: Module[];
  currentActiveLessonId: string;
  completedIds: string[];
  favoriteIds: string[];
  courseSlug: string;
  libraryId: string;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleLessonProgress: (e: React.MouseEvent, lessonId: string, currentCompleted: boolean) => void;
  onToggleLessonFavorite: (e: React.MouseEvent, lessonId: string, isFavorited: boolean) => void;
}

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getDisplayTitle(title: string, submodule?: string | null): string {
  if (!submodule) return title;
  const parts = title.split(/\s*-\s*/);
  const submoduleIndex = parts.findIndex(p => p.toLowerCase() === submodule.toLowerCase());
  if (submoduleIndex !== -1) {
    const remaining = parts.slice(submoduleIndex + 1);
    if (remaining.length > 0) {
      return remaining.join(' - ');
    }
  }
  return title;
}

export function LessonAccordion({
  sidebarOpen,
  setSidebarOpen,
  localModules,
  currentActiveLessonId,
  completedIds,
  favoriteIds,
  courseSlug,
  libraryId,
  onSelectLesson,
  onToggleLessonProgress,
  onToggleLessonFavorite,
}: LessonAccordionProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubmodules, setExpandedSubmodules] = useState<Record<string, boolean>>({});
  const [openModuleIds, setOpenModuleIds] = useState<string[]>([]);

  // Auto-expand active lesson's submodule
  useEffect(() => {
    if (currentActiveLessonId) {
      const activeMod = localModules.find((m) =>
        m.lessons.some((l) => l.id === currentActiveLessonId)
      );
      if (activeMod) {
        const activeLes = activeMod.lessons.find((l) => l.id === currentActiveLessonId);
        if (activeLes && activeLes.submodule) {
          const key = `${activeMod.id}-${activeLes.submodule}`;
          setExpandedSubmodules((prev) => {
            if (prev[key]) return prev;
            return {
              ...prev,
              [key]: true,
            };
          });
        }
      }
    }
  }, [currentActiveLessonId, localModules]);

  // Auto-expand active lesson's module in accordion and scroll to it
  useEffect(() => {
    if (currentActiveLessonId) {
      const activeMod = localModules.find((m) =>
        m.lessons.some((l) => l.id === currentActiveLessonId)
      );
      if (activeMod) {
        setOpenModuleIds((prev) => {
          if (prev.includes(activeMod.id)) return prev;
          return [...prev, activeMod.id];
        });

        // Rolagem suave do elemento do módulo para o topo da barra lateral (deixando o título visível)
        setTimeout(() => {
          if (sidebarRef.current) {
            const itemElement = sidebarRef.current.querySelector(
              `[data-module-id="${activeMod.id}"]`
            ) as HTMLElement;
            if (itemElement) {
              sidebarRef.current.scrollTo({
                top: itemElement.offsetTop - 56,
                behavior: 'smooth',
              });
            }
          }
        }, 200);
      }
    }
  }, [currentActiveLessonId, localModules]);

  const renderLessonLink = (les: Lesson) => {
    const isActive = les.id === currentActiveLessonId;
    const isLesCompleted = completedIds.includes(les.id);
    const isLesFavorited = favoriteIds.includes(les.id);
    const displayTitle = getDisplayTitle(les.title, les.submodule);

    return (
      <Link
        href={`/courses/${courseSlug}/${les.id}`}
        key={les.id}
        onClick={(e) => {
          e.preventDefault();
          onSelectLesson(les);
        }}
        style={{ textDecoration: 'none' }}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer !no-underline no-underline ${
          isActive
            ? 'bg-red-600/10 text-red-500 border border-red-600/20 font-bold'
            : isLesCompleted
              ? 'bg-green-500/10 dark:bg-green-950/20 text-green-700 dark:text-green-300 hover:bg-green-500/20 dark:hover:bg-green-950/30 border border-green-500/20 font-medium'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
        }`}
      >
        {/* Miniatura do vídeo à esquerda */}
        <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-secondary border border-border shrink-0">
          {libraryId && les.video_id ? (
            <img
              src={`https://vz-${libraryId}.b-cdn.net/${les.video_id}/thumbnail.jpg`}
              alt=""
              className="w-full h-full object-cover relative z-10"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-card to-secondary text-muted-foreground">
            <Play className="w-4 h-4 fill-current opacity-40" />
          </div>
          <div className="absolute bottom-1 right-1 bg-black/85 px-1 rounded text-[9px] font-mono font-medium text-white z-20">
            {formatDuration(les.duration_seconds)}
          </div>
        </div>

        {/* Título no centro */}
        <span 
          style={{ textDecoration: 'none' }}
          className="line-clamp-2 flex-grow leading-snug !no-underline no-underline text-left"
        >
          {displayTitle}
        </span>

        {/* Botões Favorito e Conclusão no canto direito */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Favorito */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleLessonFavorite(e, les.id, isLesFavorited);
            }}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0"
            title={isLesFavorited ? 'Remover dos Favoritos' : 'Favoritar Aula'}
          >
            <Star className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${
              isLesFavorited 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-muted-foreground hover:text-foreground'
            }`} />
          </button>

          {/* Checkbox redondo interativo */}
          <button
            onClick={(e) => onToggleLessonProgress(e, les.id, isLesCompleted)}
            className="p-1 hover:bg-secondary rounded-lg transition-colors shrink-0"
          >
            {isLesCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-500/10 shrink-0 hover:scale-110 transition-transform" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-border hover:border-primary transition-colors shrink-0" />
            )}
          </button>
        </div>
      </Link>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={`shrink-0 border-l border-border bg-sidebar/95 backdrop-blur w-80 md:w-96 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto absolute md:relative right-0 top-0 bottom-0 z-30 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden'
      }`}
    >
      <div className="p-4 border-b border-border flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Music className="w-4 h-4 text-red-600 animate-pulse" />
            Módulos e Aulas
          </h3>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome da aula ou submódulo..."
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-red-650 transition-colors placeholder:text-muted-foreground/60 shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer p-0.5 rounded hover:bg-secondary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {searchQuery.trim() !== '' ? (
          (() => {
            const query = searchQuery.toLowerCase().trim();
            const matchingResults: { module: Module; lesson: Lesson }[] = [];
            localModules.forEach((mod) => {
              mod.lessons.forEach((les) => {
                const titleMatch = les.title.toLowerCase().includes(query);
                const submoduleMatch = les.submodule ? les.submodule.toLowerCase().includes(query) : false;
                if (titleMatch || submoduleMatch) {
                  matchingResults.push({ module: mod, lesson: les });
                }
              });
            });

            const groupedResults: {
              module: Module;
              submoduleGroups: { name: string; lessons: Lesson[] }[];
              flatLessons: Lesson[];
            }[] = [];

            matchingResults.forEach(({ module, lesson }) => {
              let modGroup = groupedResults.find((x) => x.module.id === module.id);
              if (!modGroup) {
                modGroup = { module, submoduleGroups: [], flatLessons: [] };
                groupedResults.push(modGroup);
              }

              if (lesson.submodule) {
                let subGroup = modGroup.submoduleGroups.find((x) => x.name === lesson.submodule);
                if (!subGroup) {
                  subGroup = { name: lesson.submodule, lessons: [] };
                  modGroup.submoduleGroups.push(subGroup);
                }
                subGroup.lessons.push(lesson);
              } else {
                modGroup.flatLessons.push(lesson);
              }
            });

            if (groupedResults.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                  Nenhuma aula encontrada para {'"'}{searchQuery}{'"'}
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {groupedResults.map(({ module, submoduleGroups, flatLessons }) => (
                  <div key={module.id} className="space-y-2 border border-border/40 rounded-2xl p-3 bg-card/25 text-left">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Módulo: {module.title}
                    </div>

                    <div className="space-y-1.5">
                      {/* Flat matching lessons */}
                      {flatLessons.map(renderLessonLink)}

                      {/* Submodule groups */}
                      {submoduleGroups.map((sg) => (
                        <div key={sg.name} className="ml-6 pl-3.5 border-l-2 border-red-600/20 space-y-1 text-left">
                          <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-foreground bg-secondary/35 rounded-lg w-fit">
                            <FolderOpen className="w-3 h-3 text-red-500 shrink-0" />
                            <span>{sg.name}</span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            {sg.lessons.map(renderLessonLink)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <Accordion 
            multiple 
            value={openModuleIds} 
            onValueChange={(val: any) => setOpenModuleIds(val)} 
            className="space-y-3"
          >
            {localModules.map((mod, modIdx) => (
              <AccordionItem
                value={mod.id}
                key={mod.id}
                className="border border-border rounded-xl overflow-hidden bg-card/40"
                data-module-id={mod.id}
              >
                <AccordionTrigger className="hover:no-underline px-4 py-3 bg-card/85 text-foreground">
                  <div className="flex items-center gap-2.5 text-left text-sm font-bold leading-tight">
                    <span className="w-6 h-6 rounded-full bg-secondary border border-border text-muted-foreground flex items-center justify-center text-xs font-mono shrink-0 select-none">
                      {modIdx + 1}
                    </span>
                    <span>{mod.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-1 space-y-1.5 text-left">
                  {(() => {
                    const items: (
                      | { type: 'lesson'; lesson: Lesson }
                      | { type: 'submodule'; name: string; lessons: Lesson[] }
                    )[] = [];

                    mod.lessons.forEach((les) => {
                      if (les.submodule) {
                        const existing = items.find(
                          (item) => item.type === 'submodule' && item.name === les.submodule
                        );
                        if (existing && existing.type === 'submodule') {
                          existing.lessons.push(les);
                        } else {
                          items.push({
                            type: 'submodule',
                            name: les.submodule,
                            lessons: [les],
                          });
                        }
                      } else {
                        items.push({
                          type: 'lesson',
                          lesson: les,
                        });
                      }
                    });

                    return (
                      <div className="space-y-1.5">
                        {items.map((item, idx) => {
                          if (item.type === 'lesson') {
                            return renderLessonLink(item.lesson);
                          }

                          const key = `${mod.id}-${item.name}`;
                          const isExpanded = !!expandedSubmodules[key];
                          const hasActiveLesson = item.lessons.some((l) => l.id === currentActiveLessonId);

                          return (
                            <div key={`${item.name}-${idx}`} className="ml-6 pl-3.5 border-l-2 border-red-600/20 space-y-1 bg-transparent">
                              <button
                                onClick={() => {
                                  setExpandedSubmodules((prev) => ({
                                    ...prev,
                                    [key]: !prev[key],
                                  }));
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/40 transition-colors rounded-lg cursor-pointer ${
                                  hasActiveLesson ? 'text-red-500 font-extrabold bg-red-650/[0.01]' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2 max-w-[85%]">
                                  <FolderOpen className={`w-3.5 h-3.5 ${hasActiveLesson ? 'text-red-500' : 'text-muted-foreground'}`} />
                                  <span className="truncate">{item.name}</span>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>

                              <div className={`grid transition-all duration-300 ease-in-out ${
                                isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                              }`}>
                                <div className="overflow-hidden space-y-1">
                                  {item.lessons.map(renderLessonLink)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </aside>
  );
}
