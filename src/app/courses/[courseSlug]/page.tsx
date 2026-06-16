import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { CourseTrail } from '@/components/course-trail';
 
interface PageProps {
  params: Promise<{ courseSlug: string }>;
}
 
export default async function CoursePage({ params }: PageProps) {
  const { courseSlug } = await params;
 
  // 1. Verificar autenticação via cookie JWT
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;
 
  if (!sessionUser) {
    redirect('/login');
  }
 
  try {
    const db = getDB();
    
    // 2. Buscar o curso na D1
    const { results: dbCourses } = await db
      .prepare('SELECT * FROM courses WHERE slug = ?')
      .bind(courseSlug)
      .all<any>();
 
    const dbCourse = dbCourses[0];
 
    if (dbCourse) {
      // 3. Buscar módulos do curso
      const { results: dbModules } = await db
        .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC')
        .bind(dbCourse.id)
        .all<any>();
 
      const modulesWithLessons = [];
      
      // 4. Buscar aulas para cada módulo
      for (const mod of dbModules) {
        const { results: dbLessons } = await db
          .prepare('SELECT id, title, video_id, duration_seconds, position FROM lessons WHERE module_id = ? ORDER BY position ASC')
          .bind(mod.id)
          .all<any>();
 
        modulesWithLessons.push({
          id: mod.id,
          title: mod.title,
          position: mod.position,
          lessons: dbLessons || [],
        });
      }
 
      // 5. Buscar progresso concluído do aluno
      const { results: dbProgress } = await db
        .prepare('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1')
        .bind(sessionUser.id)
        .all<any>();
 
      const completedLessonIds = dbProgress ? dbProgress.map((p) => p.lesson_id) : [];
 
      // 6. Encontrar próxima aula não assistida (Continuar Assistindo)
      const allLessons = modulesWithLessons.flatMap((m) => m.lessons);
      const firstUncompleted = allLessons.find((l) => !completedLessonIds.includes(l.id));
      const continueLessonId = firstUncompleted ? firstUncompleted.id : (allLessons[0]?.id || null);
 
      return (
        <CourseTrail
          course={{
            id: dbCourse.id,
            title: dbCourse.title,
            description: dbCourse.description || '',
            slug: dbCourse.slug,
            thumbnail_gradient: dbCourse.thumbnail_gradient,
          }}
          modules={modulesWithLessons}
          completedLessonIds={completedLessonIds}
          continueLessonId={continueLessonId}
          userEmail={sessionUser.email || ''}
          isAdmin={sessionUser.role === 'admin'}
        />
      );
    }
  } catch (err) {
    console.warn('[D1] Erro ao carregar trilha na D1, tentando fallback dos mocks.', err);
  }
 
  // 7. Fallback para os dados simulados
  const mockCourse = MOCK_COURSES_DATA.find((c) => c.slug === courseSlug);
  if (mockCourse) {
    const modulesWithLessons = mockCourse.modules;
    const allLessons = modulesWithLessons.flatMap((m) => m.lessons);
    const continueLessonId = allLessons[0]?.id || null;
 
    return (
      <CourseTrail
        course={{
          id: mockCourse.id,
          title: mockCourse.title,
          description: mockCourse.description,
          slug: mockCourse.slug,
          thumbnail_gradient: mockCourse.thumbnail_gradient,
        }}
        modules={modulesWithLessons}
        completedLessonIds={[]}
        continueLessonId={continueLessonId}
        userEmail={sessionUser.email || ''}
        isAdmin={sessionUser.role === 'admin'}
      />
    );
  }
 
  // Se o curso não existir de forma alguma, volta à Home
  redirect('/');
}
