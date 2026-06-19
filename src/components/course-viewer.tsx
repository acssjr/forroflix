'use client';

import { useState, useEffect } from 'react';
import { CourseTrail } from '@/components/course-trail';
import { LessonViewer } from '@/components/lesson-viewer';

interface Lesson {
  id: string;
  title: string;
  video_id: string;
  duration_seconds: number;
  position: number;
}

interface Module {
  id: string;
  title: string;
  position: number;
  cover_vertical?: string | null;
  cover_vertical_position?: string | null;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  thumbnail_gradient: string;
  cover_vertical?: string | null;
  cover_horizontal?: string | null;
  cover_background?: string | null;
  cover_vertical_position?: string | null;
  cover_horizontal_position?: string | null;
  cover_background_position?: string | null;
}

interface CourseViewerProps {
  course: Course;
  modules: Module[];
  completedLessonIds: string[];
  favoriteLessonIds: string[];
  initialLessonId: string | null;
  userEmail: string;
  isAdmin: boolean;
  isSubscribed: boolean;
  libraryId: string;
}

export function CourseViewer({
  course,
  modules,
  completedLessonIds: initialCompletedIds,
  favoriteLessonIds: initialFavoriteIds = [],
  initialLessonId,
  userEmail,
  isAdmin,
  isSubscribed,
  libraryId,
}: CourseViewerProps) {
  const [viewMode, setViewMode] = useState<'trail' | 'player'>(initialLessonId ? 'player' : 'trail');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId);
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompletedIds);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(initialFavoriteIds);

  const allLessons = modules.flatMap((m) => m.lessons);

  // Sincronizar com cliques nos botões avançar/voltar do próprio navegador
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/');
      // A estrutura da rota é /courses/[courseSlug]/[lessonId] ou /courses/[courseSlug]
      const currentLessonId = pathParts[3] || null;
      if (currentLessonId) {
        setActiveLessonId(currentLessonId);
        setViewMode('player');
      } else {
        setViewMode('trail');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setViewMode('player');
    window.history.pushState(null, '', `/courses/${course.slug}/${lessonId}`);
  };

  const handleBackToTrail = () => {
    setViewMode('trail');
    window.history.pushState(null, '', `/courses/${course.slug}`);
  };

  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0];

  // Calcular próxima aula não concluída
  const firstUncompleted = allLessons.find((l) => !completedIds.includes(l.id));
  const continueLessonId = firstUncompleted ? firstUncompleted.id : (allLessons[0]?.id || null);

  if (viewMode === 'player' && activeLesson) {
    return (
      <LessonViewer
        courseId={course.id}
        courseTitle={course.title}
        courseDescription={course.description}
        courseSlug={course.slug}
        activeLesson={{
          id: activeLesson.id,
          title: activeLesson.title,
          description: '', // Descrição da lição pode ser nula ou mock
          video_id: activeLesson.video_id || '',
          duration_seconds: activeLesson.duration_seconds || 0,
        }}
        modules={modules}
        completedLessonIds={completedIds}
        setCompletedIds={setCompletedIds}
        favoriteLessonIds={favoriteIds}
        setFavoriteIds={setFavoriteIds}
        userEmail={userEmail}
        isSubscribed={isSubscribed}
        onBackToTrail={handleBackToTrail}
        onSelectLesson={handleSelectLesson}
        libraryId={libraryId}
      />
    );
  }

  return (
    <CourseTrail
      course={course}
      modules={modules}
      completedLessonIds={completedIds}
      favoriteLessonIds={favoriteIds}
      setFavoriteIds={setFavoriteIds}
      continueLessonId={continueLessonId}
      userEmail={userEmail}
      isAdmin={isAdmin}
      onSelectLesson={handleSelectLesson}
      libraryId={libraryId}
    />
  );
}
