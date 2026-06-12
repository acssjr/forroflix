import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { MOCK_COURSES_DATA } from '@/lib/mock-data';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default async function AdminPage() {
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

  let courses: any[] = [];

  try {
    // 2. Buscar cursos do banco de dados D1
    const db = getDB();
    const { results } = await db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<any>();
    
    if (results && results.length > 0) {
      courses = results;
    } else {
      // Se estiver vazio na D1, usar os mocks como base inicial de visualização para o admin
      courses = MOCK_COURSES_DATA.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        slug: c.slug,
        thumbnail_gradient: c.thumbnail_gradient
      }));
    }
  } catch (err) {
    console.warn('[D1] Erro ao buscar cursos para o painel admin, usando dados simulados.');
    // Usar mocks se der erro (banco local sem conexões/bindings)
    courses = MOCK_COURSES_DATA.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      slug: c.slug,
      thumbnail_gradient: c.thumbnail_gradient
    }));
  }

  return <AdminDashboard initialCourses={courses} />;
}
