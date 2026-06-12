import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Limpar o cookie de sessão
    cookieStore.set('session', '', {
      path: '/',
      maxAge: 0
    });

    // Redirecionar de volta para a home page
    const { origin } = new URL(request.url);
    return NextResponse.redirect(origin);
  } catch (error) {
    console.error('Erro na rota de logout:', error);
    return NextResponse.json({ error: 'Erro ao deslogar' }, { status: 500 });
  }
}
export async function GET(request: Request) {
  // Também aceitar requisições GET para facilidade de uso do link de logout
  return POST(request);
}
