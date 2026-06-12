import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyPassword, signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    const db = getDB();
    
    // Buscar usuário no Cloudflare D1
    const { results } = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email.toLowerCase().trim())
      .all<any>();

    const user = results[0];

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Verificar a senha
    const isPasswordValid = verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Gerar token JWT com os dados da sessão
    const sessionToken = await signJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription_active: user.subscription_active === 1
    });

    // Definir cookie seguro
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        subscription_active: user.subscription_active === 1
      }
    });
  } catch (error: any) {
    console.error('Erro na rota de login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
