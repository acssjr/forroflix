import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { CourseEditorWrapper } from '@/components/admin/course-editor-wrapper';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCoursePage({ params }: PageProps) {
  const { courseId } = await params;

  // 1. Validar autenticação e se o usuário é administrador
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

  if (!sessionUser) {
    redirect('/login');
  }

  if (sessionUser.role !== 'admin') {
    redirect('/');
  }

  const db = getDB();
  let dbCourse = null;
  let modulesWithLessons: any[] = [];

  try {
    // Buscar detalhes do curso, módulos e aulas em paralelo (async-parallel)
    const [courseRes, modulesRes, lessonsRes] = await Promise.all([
      db.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).all<any>(),
      db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC').bind(courseId).all<any>(),
      db.prepare(`
        SELECT l.id, l.title, l.video_id, l.duration_seconds, l.position, l.module_id, l.submodule, l.description 
        FROM lessons l
        JOIN modules m ON l.module_id = m.id
        WHERE m.course_id = ?
        ORDER BY l.position ASC
      `).bind(courseId).all<any>()
    ]);

    dbCourse = courseRes.results?.[0];

    if (dbCourse) {
      const dbModules = modulesRes.results || [];
      const lessonsList = lessonsRes.results || [];

      // Pré-indexar aulas por module_id para agrupamento eficiente O(N + M)
      const lessonsByModule: Record<string, any[]> = {};
      for (const les of lessonsList) {
        if (!lessonsByModule[les.module_id]) {
          lessonsByModule[les.module_id] = [];
        }
        lessonsByModule[les.module_id].push({
          id: les.id,
          title: les.title,
          video_id: les.video_id || '',
          duration_seconds: les.duration_seconds || 0,
          position: les.position,
          submodule: les.submodule || null,
          description: les.description || ''
        });
      }

      // Agrupar aulas nos módulos correspondentes
      modulesWithLessons = dbModules.map((mod: any) => ({
        id: mod.id,
        title: mod.title,
        position: mod.position,
        cover_vertical: mod.cover_vertical || null,
        cover_vertical_position: mod.cover_vertical_position || '50% 50%',
        lessons: lessonsByModule[mod.id] || []
      }));
    }
  } catch (err) {
    console.error('Erro ao buscar dados do curso para o admin editor:', err);
  }

  if (!dbCourse) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-100 p-4 md:p-8">
      <CourseEditorWrapper
        courseId={dbCourse.id}
        courseTitle={dbCourse.title}
        courseSlug={dbCourse.slug}
        initialModules={modulesWithLessons}
      />
    </div>
  );
}
