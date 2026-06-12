'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/video-player').then((mod) => mod.VideoPlayer),
  { ssr: false }
);
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Music,
  Play,
  X,
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

interface LessonViewerProps {
  courseTitle: string;
  courseDescription: string;
  courseSlug: string;
  activeLesson: {
    id: string;
    title: string;
    description: string;
    video_id: string;
    duration_seconds: number;
  };
  modules: Module[];
  completedLessonIds: string[];
  userEmail: string;
  isSubscribed: boolean;
}

export function LessonViewer({
  courseTitle,
  courseDescription,
  courseSlug,
  activeLesson,
  modules,
  completedLessonIds: initialCompletedIds,
  userEmail,
  isSubscribed,
}: LessonViewerProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [markingProgress, setMarkingProgress] = useState(false);

  const isCompleted = completedIds.includes(activeLesson.id);

  // Alternar conclusão de aula
  const toggleProgress = async () => {
    setMarkingProgress(true);
    try {
      const newCompletedState = !isCompleted;
      
      // Chamar API local para atualizar no Cloudflare D1
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: activeLesson.id,
          completed: newCompletedState,
        }),
      });

      if (res.ok) {
        if (newCompletedState) {
          setCompletedIds((prev) => [...prev, activeLesson.id]);
        } else {
          setCompletedIds((prev) => prev.filter((id) => id !== activeLesson.id));
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar progresso:', err);
    } finally {
      setMarkingProgress(false);
    }
  };

  // Encontrar o ID da aula anterior e da próxima
  const allLessons = modules.flatMap((m) => m.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col">
      {/* Top Bar / Header */}
      <header className="border-b border-slate-900 bg-[#07070a]/90 backdrop-blur sticky top-0 z-40">
        <div className="px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group text-orange-400 hover:text-orange-300">
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold hidden md:inline">Voltar para Home</span>
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-300 line-clamp-1">
                {courseTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Aluno: {userEmail}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="border-slate-800 hover:bg-slate-900 text-slate-300 gap-2"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">
                {sidebarOpen ? 'Esconder Aulas' : 'Mostrar Aulas'}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-grow flex relative overflow-hidden">
        {/* Left Side: Video Player & Info */}
        <main className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-full">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Player Container */}
            <div className="relative">
              <VideoPlayer
                videoId={activeLesson.video_id}
                userEmail={userEmail}
                courseTitle={courseTitle}
                lessonTitle={activeLesson.title}
              />
            </div>

            {/* Lesson Info Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {activeLesson.title}
                </h1>
                <p className="text-sm text-slate-400">
                  Duração estimada: {Math.ceil(activeLesson.duration_seconds / 60)} minutos
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={toggleProgress}
                  disabled={markingProgress}
                  variant={isCompleted ? 'secondary' : 'default'}
                  className={`rounded-xl font-bold py-5 px-6 transition-all ${
                    isCompleted
                      ? 'bg-green-950/40 hover:bg-green-900/30 text-green-400 border border-green-500/20'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 mr-2 ${isCompleted ? 'text-green-400' : ''}`} />
                  {isCompleted ? 'Aula Concluída' : 'Marcar como Assistida'}
                </Button>
              </div>
            </div>

            {/* Navigation Buttons (Prev/Next) */}
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-slate-900">
              {prevLesson ? (
                <Link href={`/courses/${courseSlug}/${prevLesson.id}`}>
                  <Button variant="ghost" className="text-slate-300 hover:bg-slate-900 gap-2">
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Aula Anterior</span>
                  </Button>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link href={`/courses/${courseSlug}/${nextLesson.id}`}>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-orange-400 gap-2 border border-orange-500/10">
                    <span className="hidden sm:inline">Próxima Aula</span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* Course Description */}
            <div className="space-y-3 bg-slate-950/40 p-6 rounded-2xl border border-slate-900/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-400" />
                Sobre este Curso
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {courseDescription || 'Este curso faz parte do catálogo premium do Forroflix. Aproveite as aulas para aprender na prática os passos e movimentações.'}
              </p>
            </div>
          </div>
        </main>

        {/* Right Side: Collapsible Sidebar Menu */}
        <aside
          className={`shrink-0 border-l border-slate-900 bg-[#07070a]/90 backdrop-blur w-80 md:w-96 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto absolute md:relative right-0 top-0 bottom-0 z-30 transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full md:hidden'
          }`}
        >
          <div className="p-4 border-b border-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <Music className="w-4 h-4 text-orange-500 animate-pulse" />
              Módulos e Aulas
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded hover:bg-slate-950 text-slate-500 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            <Accordion multiple defaultValue={modules.map((m) => m.id)} className="space-y-3">
              {modules.map((mod) => (
                <AccordionItem
                  value={mod.id}
                  key={mod.id}
                  className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/40"
                >
                  <AccordionTrigger className="hover:no-underline px-4 py-3 bg-slate-950/80 text-sm font-bold text-slate-300">
                    <span className="text-left leading-tight">{mod.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="p-1 space-y-1">
                    {mod.lessons.map((les) => {
                      const isActive = les.id === activeLesson.id;
                      const isLesCompleted = completedIds.includes(les.id);
                      return (
                        <Link
                          href={`/courses/${courseSlug}/${les.id}`}
                          key={les.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-400 border-l-2 border-orange-500 font-semibold'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          {isLesCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : isActive ? (
                            <Play className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0 animate-pulse" />
                          ) : (
                            <Play className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="line-clamp-2 flex-grow">{les.title}</span>
                          <span className="text-[10px] text-slate-600 shrink-0">
                            {Math.ceil(les.duration_seconds / 60)}m
                          </span>
                        </Link>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </aside>
      </div>
    </div>
  );
}
