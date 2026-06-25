import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { LoginForm } from '@/components/login-form';
import { DashboardClient } from '@/components/dashboard-client';

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Forró Universitário - Do Zero ao Passo Básico',
    description: 'Aprenda os passos fundamentais: o balanço lateral, a caminhada, a virada simples e a condução inicial.',
    slug: 'forro-universitario-basico',
    thumbnail_gradient: 'from-blue-600 to-indigo-700',
    center_text: 'FORRÓ\nUNIVERSITÁRIO',
    label: 'Curso de Forró Básico'
  },
  {
    id: 'course-2',
    title: 'Forró Pé de Serra - Giros e Condução',
    description: 'Domine a arte do cavalheiro e da dama: giros simultâneos, travas de braço e giros dinâmicos.',
    slug: 'forro-pe-de-serra-giros',
    thumbnail_gradient: 'from-purple-600 to-pink-700',
    center_text: 'GIROS &\nCONDUÇÃO',
    label: 'Curso Pé de Serra'
  },
  {
    id: 'course-3',
    title: 'Estilo Roots - Musicalidade e Charme',
    description: 'Aprenda o autêntico Forró Roots: giros cruzados, passos arrastados e como interpretar o ritmo da sanfona e da zabumba.',
    slug: 'estilo-roots-musicalidade',
    thumbnail_gradient: 'from-red-600 to-red-600',
    center_text: 'ESTILO\nROOTS',
    label: 'Curso Roots Avançado'
  }
];

interface PageProps {
  searchParams: Promise<{ tab?: string; editCourseId?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const allowedTabs = ['catalog', 'favorites', 'progress'];
  const initialTab = (params.tab && allowedTabs.includes(params.tab)) ? params.tab : 'catalog';

  // 1. Verificar autenticação via cookie JWT
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const user = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

  // Se NÃO estiver logado, exibe a tela de login estilizada com fundo estético de catálogo
  if (!user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden bg-black font-sans">
        {/* Imagem de Fundo (Aesthetic Catalog Grid) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-[4px] scale-105 pointer-events-none"
          style={{ backgroundImage: 'url("/login-bg.png")' }}
        />
        {/* Overlay Escuro com Gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90 z-0 pointer-events-none" />
        
        {/* Formulário de Login Centralizado */}
        <LoginForm />
      </div>
    );
  }

  // 2. Se ESTIVER logado, busca os dados no D1 ou usa fallbacks
  let coursesList = MOCK_COURSES.map((c, i) => ({
    ...c,
    total_lessons: 4,
    completed_lessons: 0,
    progress_percent: 0
  }));
  let favoritesList: any[] = [];
  let lastLesson: any = null;
  let lastLessonProgressPercent = 0;
  let totalCompletedLessons = 0;
  let coursesInProgress = 0;
  let coursesCompleted = 0;
  
  const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;

  try {
    const db = getDB();
    
    // Buscar cursos, favoritos, progresso e última aula em paralelo
    const [coursesRes, favoritesRes, courseProgressRes, lastLessonRes, defaultLessonRes] = await Promise.all([
      db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<any>(),
      db.prepare(`
        SELECT DISTINCT
          l.id, 
          l.title, 
          l.video_id, 
          l.duration_seconds, 
          c.id as course_id, 
          c.slug as course_slug, 
          c.title as course_title,
          m.title as module_title
        FROM favorite_folder_lessons ffl
        JOIN favorite_folders ff ON ffl.folder_id = ff.id
        JOIN lessons l ON ffl.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE ffl.user_id = ? AND ff.is_global = 1
        ORDER BY ffl.created_at DESC
      `).bind(user.id).all<any>(),
      db.prepare(`
        SELECT 
          c.id, 
          COUNT(l.id) as total_lessons,
          SUM(CASE WHEN p.completed = 1 THEN 1 ELSE 0 END) as completed_lessons
        FROM courses c
        LEFT JOIN modules m ON m.course_id = c.id
        LEFT JOIN lessons l ON l.module_id = m.id
        LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
        GROUP BY c.id
      `).bind(user.id).all<any>(),
      db.prepare(`
        SELECT 
          p.updated_at,
          p.completed,
          l.id as lesson_id,
          l.title as lesson_title,
          l.duration_seconds,
          m.title as module_title,
          c.id as course_id,
          c.title as course_title,
          c.slug as course_slug
        FROM progress p
        JOIN lessons l ON p.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE p.user_id = ?
        ORDER BY p.updated_at DESC
        LIMIT 1
      `).bind(user.id).all<any>(),
      db.prepare(`
        SELECT 
          l.id as lesson_id,
          l.title as lesson_title,
          l.duration_seconds,
          m.title as module_title,
          c.id as course_id,
          c.title as course_title,
          c.slug as course_slug
        FROM courses c
        JOIN modules m ON m.course_id = c.id
        JOIN lessons l ON l.module_id = m.id
        ORDER BY c.created_at DESC, m.position ASC, l.position ASC
        LIMIT 1
      `).all<any>()
    ]);

    const results = coursesRes.results;
    favoritesList = favoritesRes.results || [];
    
    // Mapeamento de progresso por ID do curso
    const progressMap = new Map(
      (courseProgressRes.results || []).map((p: any) => [
        p.id,
        { total: p.total_lessons, completed: p.completed_lessons }
      ])
    );

    // Calcular estatísticas com base no progresso
    if (courseProgressRes.results && courseProgressRes.results.length > 0) {
      totalCompletedLessons = courseProgressRes.results.reduce(
        (sum: number, p: any) => sum + (p.completed_lessons || 0),
        0
      );
      coursesInProgress = courseProgressRes.results.filter(
        (p: any) => p.completed_lessons > 0 && p.completed_lessons < p.total_lessons
      ).length;
      coursesCompleted = courseProgressRes.results.filter(
        (p: any) => p.completed_lessons === p.total_lessons && p.total_lessons > 0
      ).length;
    }

    // Identificar a última aula acessada (ou primeira aula padrão)
    lastLesson = lastLessonRes.results?.[0] || defaultLessonRes.results?.[0];
    if (lastLesson) {
      const prog = progressMap.get(lastLesson.course_id);
      if (prog && prog.total > 0) {
        lastLessonProgressPercent = Math.round((prog.completed / prog.total) * 100);
      } else {
        lastLessonProgressPercent = 0;
      }
    }

    if (results && results.length > 0) {
      coursesList = results.map((c, i) => {
        const mockMatch = MOCK_COURSES[i % MOCK_COURSES.length];
        const prog = progressMap.get(c.id) || { total: 0, completed: 0 };
        return {
          id: c.id,
          title: c.title,
          description: c.description || 'Aulas exclusivas do Forroflix.',
          slug: c.slug,
          thumbnail_gradient: c.thumbnail_gradient || mockMatch.thumbnail_gradient,
          center_text: c.title.split(' - ')[0].toUpperCase(),
          label: 'Curso Online',
          total_lessons: prog.total,
          completed_lessons: prog.completed,
          progress_percent: prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0,
          cover_vertical: c.cover_vertical || null,
          cover_horizontal: c.cover_horizontal || null,
          cover_background: c.cover_background || null,
          cover_vertical_position: c.cover_vertical_position || '50% 50%',
          cover_horizontal_position: c.cover_horizontal_position || '50% 50%',
          cover_background_position: c.cover_background_position || '50% 50%',
          is_featured: c.is_featured || 0,
          hide_title: c.hide_title || 0
        };
      });
      console.log('DEBUG_COURSES_LIST:', JSON.stringify(coursesList, null, 2));
    }
  } catch (err) {
    console.warn('[D1] Erro na home, exibindo catálogo simulado.', err);
  }

  const isAdmin = user.role === 'admin';

  return (
    <DashboardClient
      user={user}
      coursesList={coursesList}
      favoritesList={favoritesList}
      lastLesson={lastLesson}
      lastLessonProgressPercent={lastLessonProgressPercent}
      totalCompletedLessons={totalCompletedLessons}
      coursesInProgress={coursesInProgress}
      coursesCompleted={coursesCompleted}
      isAdmin={isAdmin}
      pullZone={pullZone}
      initialTab={initialTab as any}
    />
  );
}
