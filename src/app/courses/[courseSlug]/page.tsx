import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { CourseViewer } from '@/components/course-viewer';
import { syncZeroDurationLessons } from '@/lib/sync-duration';
import { after } from 'next/server';
 
interface DBCourse {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  thumbnail_gradient: string;
  cover_vertical: string | null;
  cover_horizontal: string | null;
  cover_background: string | null;
  cover_vertical_position: string | null;
  cover_horizontal_position: string | null;
  cover_background_position: string | null;
}

interface DBModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  cover_vertical: string | null;
  cover_vertical_position: string | null;
}
 
interface DBLesson {
  id: string;
  module_id: string;
  title: string;
  video_id: string | null;
  duration_seconds: number;
  position: number;
  submodule?: string | null;
}
 
interface Lesson {
  id: string;
  title: string;
  video_id: string;
  duration_seconds: number;
  position: number;
  submodule?: string | null;
}
 
interface Module {
  id: string;
  title: string;
  position: number;
  cover_vertical: string | null;
  cover_vertical_position: string | null;
  lessons: Lesson[];
}

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
 
  let dbCourse: DBCourse | null = null;
  let modulesWithLessons: Module[] = [];
  let completedLessonIds: string[] = [];
  let favoriteLessonIds: string[] = [];
  let isSubscribed = false;
  let pullZone = '';
  let loadFromDbSuccess = false;

  try {
    const db = getDB();
    
    // 1. Buscar status do usuário, curso, progresso, favoritos, módulos e aulas em um único round-trip (db.batch)
    const batchRes = await db.batch<any>([
      db.prepare('SELECT role, subscription_active FROM users WHERE id = ?').bind(sessionUser.id),
      db.prepare('SELECT * FROM courses WHERE slug = ?').bind(courseSlug),
      db.prepare('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1').bind(sessionUser.id),
      db.prepare('SELECT lesson_id FROM favorites WHERE user_id = ?').bind(sessionUser.id),
      db.prepare('SELECT * FROM modules WHERE course_id = (SELECT id FROM courses WHERE slug = ?) ORDER BY position ASC').bind(courseSlug),
      db.prepare(`
        SELECT l.id, l.title, l.video_id, l.duration_seconds, l.position, l.module_id, l.submodule 
        FROM lessons l
        JOIN modules m ON l.module_id = m.id
        WHERE m.course_id = (SELECT id FROM courses WHERE slug = ?)
        ORDER BY l.position ASC
      `).bind(courseSlug)
    ]);

    const [usersRes, coursesRes, progressRes, favoritesRes, modulesRes, lessonsRes] = batchRes;

    const userProfile = usersRes.results[0];
    isSubscribed = userProfile ? (userProfile.subscription_active === 1 || userProfile.role === 'admin') : false;

    dbCourse = coursesRes.results[0];
 
    if (dbCourse) {
      const dbModules = modulesRes.results || [];
      const lessonsList = lessonsRes.results || [];
      completedLessonIds = progressRes.results ? progressRes.results.map((p) => p.lesson_id) : [];
      favoriteLessonIds = favoritesRes.results ? favoritesRes.results.map((f) => f.lesson_id) : [];
 
      // Sincronizar durações zeradas em segundo plano
      if (lessonsList.length > 0) {
        after(async () => {
          try {
            await syncZeroDurationLessons(lessonsList);
          } catch (err) {
            console.error('[Page Sync] Error in background sync:', err);
          }
        });
      }

      // Pré-indexar aulas por module_id para agrupamento eficiente O(N + M)
      const lessonsByModule: Record<string, Lesson[]> = {};
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
        });
      }
 
      // Agrupar aulas nos módulos correspondentes
      modulesWithLessons = dbModules.map(mod => ({
        id: mod.id,
        title: mod.title,
        position: mod.position,
        cover_vertical: mod.cover_vertical || null,
        cover_vertical_position: mod.cover_vertical_position || '50% 50%',
        lessons: lessonsByModule[mod.id] || []
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
          cover_vertical: dbCourse.cover_vertical || null,
          cover_horizontal: dbCourse.cover_horizontal || null,
          cover_background: dbCourse.cover_background || null,
          cover_vertical_position: dbCourse.cover_vertical_position || '50% 50%',
          cover_horizontal_position: dbCourse.cover_horizontal_position || '50% 50%',
          cover_background_position: dbCourse.cover_background_position || '50% 50%',
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
