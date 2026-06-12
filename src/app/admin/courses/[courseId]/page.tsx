import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { CourseEditor } from '@/components/admin/course-editor';

export const runtime = 'edge';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCoursePage({ params }: PageProps) {
  const { courseId } = await params;

  // 1. Validar autenticação e se o usuário é administrador
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

  if (!sessionUser) {
    redirect('/login');
  }

  if (sessionUser.role !== 'admin') {
    redirect('/');
  }

  const db = getDB();
  let courseTitle = '';
  let courseSlug = '';
  let modules: any[] = [];

  try {
    // 2. Buscar o curso específico no Cloudflare D1
    const { results: dbCourses } = await db
      .prepare('SELECT * FROM courses WHERE id = ?')
      .bind(courseId)
      .all<any>();

    const dbCourse = dbCourses[0];

    if (dbCourse) {
      courseTitle = dbCourse.title;
      courseSlug = dbCourse.slug;

      // Buscar os módulos do curso
      const { results: dbModules } = await db
        .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC')
        .bind(courseId)
        .all<any>();

      if (dbModules) {
        for (const mod of dbModules) {
          // Buscar aulas do módulo
          const { results: dbLessons } = await db
            .prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC')
            .bind(mod.id)
            .all<any>();

          modules.push({
            id: mod.id,
            title: mod.title,
            position: mod.position,
            lessons: (dbLessons || []).map(l => ({
              id: l.id,
              title: l.title,
              duration_seconds: l.duration_seconds || 0,
              video_id: l.video_id || '',
              position: l.position
            }))
          });
        }
      }
    }
  } catch (err) {
    console.warn('[D1] Erro ao buscar módulos do curso na D1, tentando dados simulados.');
  }

  // 3. Fallback para os dados simulados se não encontrar na D1
  if (modules.length === 0) {
    const mockCourse = MOCK_COURSES_DATA.find(c => c.id === courseId);
    if (mockCourse) {
      courseTitle = mockCourse.title;
      courseSlug = mockCourse.slug;
      modules = mockCourse.modules;
    }
  }

  if (!courseTitle) {
    redirect('/admin');
  }

  return (
    <CourseEditor
      courseId={courseId}
      courseTitle={courseTitle}
      courseSlug={courseSlug}
      initialModules={modules}
    />
  );
}
