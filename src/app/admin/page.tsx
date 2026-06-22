import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

export default async function AdminPage() {
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
  let courses: any[] = [];
  let usersList: any[] = [];

  try {
    // Buscar todos os cursos
    const coursesRes = await db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<any>();
    courses = coursesRes.results || [];

    // Buscar lista de usuários
    const usersRes = await db
      .prepare('SELECT id, email, username, full_name, role, subscription_active, created_at FROM users ORDER BY created_at DESC')
      .all<any>();
    
    usersList = (usersRes.results || []).map((u: any) => ({
      id: u.id || '',
      email: u.email || '',
      username: u.username || '',
      full_name: u.full_name || '',
      role: u.role || 'student',
      subscription_active: Number(u.subscription_active || 0),
      created_at: u.created_at || ''
    }));
  } catch (err) {
    console.error('Erro ao buscar dados do painel admin:', err);
  }

  const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;

  return (
    <AdminDashboardClient
      user={{
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.full_name || '',
        role: sessionUser.role
      }}
      initialCourses={courses}
      initialUsersList={usersList}
      pullZone={pullZone}
    />
  );
}
