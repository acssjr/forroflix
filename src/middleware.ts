import { NextResponse, NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Decodificar JWT
  const user = sessionCookie ? await verifyJWT(sessionCookie) : null;

  // 2. Proteção de rotas do Administrador (/admin)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. Proteção de rotas do Aluno (/courses)
  if (pathname.startsWith('/courses')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Nota: O bloqueio de assinatura inativa é feito no player para carregar o menu de aulas
  }

  // 4. Se o usuário já estiver logado e tentar ir para /login, redireciona para a home
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/courses/:path*', '/login'],
};
