import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

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

  // Redireciona para o painel principal com a aba de configurações aberta
  redirect('/?tab=settings');
}
