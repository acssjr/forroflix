import { redirect } from 'next/navigation';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCoursePage({ params }: PageProps) {
  const { courseId } = await params;

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

  // Redireciona para o painel principal na aba de configurações com o ID do curso em edição
  redirect(`/?tab=settings&editCourseId=${courseId}`);
}
