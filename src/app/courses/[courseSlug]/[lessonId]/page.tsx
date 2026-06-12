import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import dynamic from 'next/dynamic';

const LessonViewer = dynamic(
  () => import('@/components/lesson-viewer').then((mod) => mod.LessonViewer),
  { ssr: false }
);

export const runtime = 'edge';

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
  let activeLesson = null;
  let modules: any[] = [];
  let completedLessonIds: string[] = [];

  try {
    // 2. Buscar o status de assinatura atualizado na D1
    const { results: dbUsers } = await db
      .prepare('SELECT role, subscription_active FROM users WHERE id = ?')
      .bind(sessionUser.id)
      .all<any>();

    const userProfile = dbUsers[0];
    if (userProfile) {
      isSubscribed = userProfile.subscription_active === 1 || userProfile.role === 'admin';
    }

    // 3. Tentar carregar o curso do banco de dados D1
    const { results: dbCourses } = await db
      .prepare('SELECT * FROM courses WHERE slug = ?')
      .bind(courseSlug)
      .all<any>();

    const dbCourse = dbCourses[0];

    if (dbCourse) {
      courseTitle = dbCourse.title;
      courseDescription = dbCourse.description || '';

      // Obter módulos do curso
      const { results: dbModules } = await db
        .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC')
        .bind(dbCourse.id)
        .all<any>();

      if (dbModules) {
        for (const mod of dbModules) {
          // Obter aulas do módulo
          const { results: dbLessons } = await db
            .prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC')
            .bind(mod.id)
            .all<any>();

          const lessons = dbLessons || [];
          modules.push({
            id: mod.id,
            title: mod.title,
            position: mod.position,
            lessons: lessons.map((l) => ({
              id: l.id,
              title: l.title,
              duration_seconds: l.duration_seconds || 0,
              video_id: l.video_id || '',
              position: l.position,
            })),
          });

          // Encontrar a aula ativa
          const currentActive = lessons.find((l) => l.id === lessonId);
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

      // Buscar progresso de conclusão do aluno
      const { results: dbProgress } = await db
        .prepare('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1')
        .bind(sessionUser.id)
        .all<any>();

      if (dbProgress) {
        completedLessonIds = dbProgress.map((p) => p.lesson_id);
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

  return (
    <LessonViewer
      courseTitle={courseTitle}
      courseDescription={courseDescription}
      courseSlug={courseSlug}
      activeLesson={activeLesson}
      modules={modules}
      completedLessonIds={completedLessonIds}
      userEmail={sessionUser.email || ''}
      isSubscribed={isSubscribed}
    />
  );
}
