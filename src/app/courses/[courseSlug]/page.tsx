import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';

interface PageProps {
  params: Promise<{ courseSlug: string }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { courseSlug } = await params;

  try {
    // 1. Tentar buscar no banco do Cloudflare D1
    const db = getDB();
    const { results: dbCourses } = await db
      .prepare('SELECT id FROM courses WHERE slug = ?')
      .bind(courseSlug)
      .all<any>();

    const dbCourse = dbCourses[0];

    if (dbCourse) {
      // Obter primeiro módulo do curso
      const { results: dbModules } = await db
        .prepare('SELECT id FROM modules WHERE course_id = ? ORDER BY position ASC')
        .bind(dbCourse.id)
        .all<any>();

      if (dbModules && dbModules.length > 0) {
        // Obter primeira aula do primeiro módulo
        const { results: dbLessons } = await db
          .prepare('SELECT id FROM lessons WHERE module_id = ? ORDER BY position ASC LIMIT 1')
          .bind(dbModules[0].id)
          .all<any>();

        if (dbLessons && dbLessons.length > 0) {
          redirect(`/courses/${courseSlug}/${dbLessons[0].id}`);
        }
      }
    }
  } catch (err) {
    console.warn('[D1] Erro ao buscar curso na D1, tentando dados simulados.');
  }

  // 2. Fallback para os dados simulados
  const mockCourse = MOCK_COURSES_DATA.find((c) => c.slug === courseSlug);
  if (
    mockCourse &&
    mockCourse.modules.length > 0 &&
    mockCourse.modules[0].lessons.length > 0
  ) {
    redirect(`/courses/${courseSlug}/${mockCourse.modules[0].lessons[0].id}`);
  }

  // Se o curso não for encontrado, redireciona para a home
  redirect('/');
}
