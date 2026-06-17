import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { CourseViewer } from '@/components/course-viewer';

interface PageProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { courseSlug, lessonId } = await params;

  // 1. Verificar autenticação via cookie JWT
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

  if (!sessionUser) {
    redirect('/login');
  }

  const db = getDB();
  let isSubscribed = false;
  let courseTitle = '';
  let courseDescription = '';
  let courseId = '';
  let thumbnailGradient = 'from-red-600 to-red-600';
  let activeLesson = null;
  let modules: any[] = [];
  let completedLessonIds: string[] = [];
  let favoriteLessonIds: string[] = [];

  try {
    // 1. Buscar status de assinatura do usuário e detalhes do curso em paralelo
    const [usersRes, coursesRes] = await Promise.all([
      db.prepare('SELECT role, subscription_active FROM users WHERE id = ?').bind(sessionUser.id).all<any>(),
      db.prepare('SELECT * FROM courses WHERE slug = ?').bind(courseSlug).all<any>()
    ]);

    const userProfile = usersRes.results[0];
    if (userProfile) {
      isSubscribed = userProfile.subscription_active === 1 || userProfile.role === 'admin';
    }

    const dbCourse = coursesRes.results[0];

    if (dbCourse) {
      courseTitle = dbCourse.title;
      courseDescription = dbCourse.description || '';
      courseId = dbCourse.id;
      thumbnailGradient = dbCourse.thumbnail_gradient || 'from-red-600 to-red-600';

      // 2. Buscar módulos, progresso e favoritos em paralelo
      const [modulesRes, progressRes, favoritesRes] = await Promise.all([
        db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC').bind(dbCourse.id).all<any>(),
        db.prepare('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1').bind(sessionUser.id).all<any>(),
        db.prepare('SELECT lesson_id FROM favorites WHERE user_id = ?').bind(sessionUser.id).all<any>()
      ]);

      const dbModules = modulesRes.results || [];
      completedLessonIds = progressRes.results ? progressRes.results.map((p) => p.lesson_id) : [];
      favoriteLessonIds = favoritesRes.results ? favoritesRes.results.map((f) => f.lesson_id) : [];

      if (dbModules && dbModules.length > 0) {
        // Obter todas as aulas do curso de uma vez só (Sem N+1)
        const { results: dbLessons } = await db
          .prepare(`
            SELECT id, title, video_id, duration_seconds, position, module_id, description
            FROM lessons
            WHERE module_id IN (${dbModules.map(() => '?').join(',')})
            ORDER BY position ASC
          `)
          .bind(...dbModules.map(m => m.id))
          .all<any>();

        const lessonsList = dbLessons || [];

        // Agrupar aulas nos módulos correspondentes e procurar a ativa
        modules = dbModules.map(mod => {
          const modLessons = lessonsList.filter((l: any) => l.module_id === mod.id);
          
          return {
            id: mod.id,
            title: mod.title,
            position: mod.position,
            lessons: modLessons.map((l: any) => ({
              id: l.id,
              title: l.title,
              duration_seconds: l.duration_seconds || 0,
              video_id: l.video_id || '',
              position: l.position,
            })),
          };
        });

        // Encontrar a aula ativa
        const currentActive = lessonsList.find((l: any) => l.id === lessonId);
        if (currentActive) {
          activeLesson = {
            id: currentActive.id,
            title: currentActive.title,
            description: currentActive.description || '',
            video_id: currentActive.video_id || '',
            duration_seconds: currentActive.duration_seconds || 0,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[D1] Erro ao carregar dados da D1, utilizando fallback dos mocks.', err);
  }

  // 4. Fallback para os dados simulados
  if (!activeLesson) {
    const mockCourse = MOCK_COURSES_DATA.find((c) => c.slug === courseSlug);
    if (mockCourse) {
      courseTitle = mockCourse.title;
      courseDescription = mockCourse.description;
      courseId = mockCourse.id;
      thumbnailGradient = mockCourse.thumbnail_gradient;
      modules = mockCourse.modules;

      // Se logado localmente em modo teste/demo, fingir assinatura ativa nos mocks
      isSubscribed = true;

      // Encontrar aula ativa nos mocks
      for (const mod of mockCourse.modules) {
        const found = mod.lessons.find((l) => l.id === lessonId);
        if (found) {
          activeLesson = {
            id: found.id,
            title: found.title,
            description: 'Aula prática simulada do curso de Forró.',
            video_id: found.video_id,
            duration_seconds: found.duration_seconds,
          };
        }
      }
    }
  }

  // Se a aula não for encontrada em nenhum lugar, redireciona para a home
  if (!activeLesson) {
    redirect('/');
  }

  const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;

  return (
    <CourseViewer
      course={{
        id: courseId,
        title: courseTitle,
        description: courseDescription,
        slug: courseSlug,
        thumbnail_gradient: thumbnailGradient,
      }}
      modules={modules}
      completedLessonIds={completedLessonIds}
      favoriteLessonIds={favoriteLessonIds}
      initialLessonId={activeLesson.id}
      userEmail={sessionUser.email || ''}
      isAdmin={sessionUser.role === 'admin'}
      isSubscribed={isSubscribed}
      libraryId={pullZone}
    />
  );
}
