import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client';

export default async function AdminPage() {
  console.time('[Admin Performance] Total execution time');
  console.time('[Admin Performance] 1. JWT verification');
  // 1. Validar autenticação e se o usuário é administrador
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const decoded = sessionToken ? (await verifyJWT(sessionToken)) as any : null;
  console.timeEnd('[Admin Performance] 1. JWT verification');

  if (!decoded) {
    console.timeEnd('[Admin Performance] Total execution time');
    redirect('/login');
  }

  let sessionUser: any = null;
  try {
    console.time('[Admin Performance] 2. Select User from DB');
    const db = getDB();
    const dbUser = await db.prepare('SELECT id, email, username, full_name, role, subscription_active, avatar_url FROM users WHERE id = ?').bind(decoded.id).first<any>();
    console.timeEnd('[Admin Performance] 2. Select User from DB');
    sessionUser = dbUser ?? null;
  } catch (err) {
    console.timeEnd('[Admin Performance] 2. Select User from DB');
    console.error('Erro ao buscar dados do usuário administrador:', err);
  }

  // Require a live DB record — a stale JWT alone is not sufficient for admin access
  if (!sessionUser || sessionUser.role !== 'admin') {
    console.timeEnd('[Admin Performance] Total execution time');
    redirect('/');
  }


  const db = getDB();
  let courses: any[] = [];
  let usersList: any[] = [];

  try {
    console.time('[Admin Performance] 3. Database Parallel Queries');
    // Buscar todos os cursos e usuários em paralelo (async-parallel)
    const [coursesRes, usersRes] = await Promise.all([
      db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all<any>(),
      db.prepare('SELECT id, email, username, full_name, role, subscription_active, created_at FROM users ORDER BY created_at DESC').all<any>()
    ]);
    console.timeEnd('[Admin Performance] 3. Database Parallel Queries');

    courses = coursesRes.results || [];
    
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
    console.timeEnd('[Admin Performance] 3. Database Parallel Queries');
    console.error('Erro ao buscar dados do painel admin:', err);
  }

  const rawPullZone = process.env.BUNNY_STREAM_PULL_ZONE || process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const pullZone = rawPullZone.startsWith('vz-') ? rawPullZone.substring(3) : rawPullZone;

  console.timeEnd('[Admin Performance] Total execution time');

  return (
    <AdminDashboardClient
      user={{
        id: sessionUser.id,
        email: sessionUser.email,
        full_name: sessionUser.full_name || '',
        role: sessionUser.role,
        avatar_url: sessionUser.avatar_url || ''
      }}
      initialCourses={courses}
      initialUsersList={usersList}
      pullZone={pullZone}
    />
  );
}
