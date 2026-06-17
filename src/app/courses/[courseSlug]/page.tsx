import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { CourseViewer } from '@/components/course-viewer';
 
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
 
  let dbCourse: any = null;
  let modulesWithLessons: any[] = [];
  let completedLessonIds: string[] = [];
  let favoriteLessonIds: string[] = [];
  let isSubscribed = false;
  let pullZone = '';
  let loadFromDbSuccess = false;

  try {
    const db = getDB();
    
    // 1. Buscar status de assinatura do usuário e detalhes do curso em paralelo
    const [usersRes, coursesRes] = await Promise.all([
      db.prepare('SELECT role, subscription_active FROM users WHERE id = ?').bind(sessionUser.id).all<any>(),
      db.prepare('SELECT * FROM courses WHERE slug = ?').bind(courseSlug).all<any>()
    ]);

    const userProfile = usersRes.results[0];
    isSubscribed = userProfile ? (userProfile.subscription_active === 1 || userProfile.role === 'admin') : false;

    dbCourse = coursesRes.results[0];
 
    if (dbCourse) {
      // 2. Buscar módulos, aulas, progresso de conclusão e favoritos do aluno em paralelo
      const [modulesRes, lessonsRes, progressRes, favoritesRes] = await Promise.all([
        db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC').bind(dbCourse.id).all<any>(),
        db.prepare(`
          SELECT l.id, l.title, l.video_id, l.duration_seconds, l.position, l.module_id 
          FROM lessons l
          JOIN modules m ON l.module_id = m.id
          WHERE m.course_id = ?
          ORDER BY l.position ASC
        `).bind(dbCourse.id).all<any>(),
        db.prepare('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1').bind(sessionUser.id).all<any>(),
        db.prepare('SELECT lesson_id FROM favorites WHERE user_id = ?').bind(sessionUser.id).all<any>()
      ]);

      const dbModules = modulesRes.results || [];
      const lessonsList = lessonsRes.results || [];
      completedLessonIds = progressRes.results ? progressRes.results.map((p) => p.lesson_id) : [];
      favoriteLessonIds = favoritesRes.results ? favoritesRes.results.map((f) => f.lesson_id) : [];

      // Agrupar aulas nos módulos correspondentes
      modulesWithLessons = dbModules.map(mod => ({
        id: mod.id,
        title: mod.title,
        position: mod.position,
        lessons: lessonsList.filter((les: any) => les.module_id === mod.id)
      }));
 
      const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
      pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;
      loadFromDbSuccess = true;
    }
  } catch (err) {
    console.warn('[D1] Erro ao carregar trilha na D1, tentando fallback dos mocks.', err);
  }

  if (loadFromDbSuccess && dbCourse) {
    return (
      <CourseViewer
        course={{
          id: dbCourse.id,
          title: dbCourse.title,
          description: dbCourse.description || '',
          slug: dbCourse.slug,
          thumbnail_gradient: dbCourse.thumbnail_gradient,
        }}
        modules={modulesWithLessons}
        completedLessonIds={completedLessonIds}
        favoriteLessonIds={favoriteLessonIds}
        initialLessonId={null}
        userEmail={sessionUser.email || ''}
        isAdmin={sessionUser.role === 'admin'}
        isSubscribed={isSubscribed}
        libraryId={pullZone}
      />
    );
  }
 
  // 7. Fallback para os dados simulados
  const mockCourse = MOCK_COURSES_DATA.find((c) => c.slug === courseSlug);
  if (mockCourse) {
    const modulesWithLessons = mockCourse.modules;
    const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
    const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;
 
    return (
      <CourseViewer
        course={{
          id: mockCourse.id,
          title: mockCourse.title,
          description: mockCourse.description,
          slug: mockCourse.slug,
          thumbnail_gradient: mockCourse.thumbnail_gradient,
        }}
        modules={modulesWithLessons}
        completedLessonIds={[]}
        favoriteLessonIds={[]}
        initialLessonId={null}
        userEmail={sessionUser.email || ''}
        isAdmin={sessionUser.role === 'admin'}
        isSubscribed={true}
        libraryId={pullZone}
      />
    );
  }
 
  // Se o curso não existir de forma alguma, volta à Home
  redirect('/');
}
