import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyPassword, signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const cleanUsername = username.toLowerCase().trim();
    const rateLimitKey = `login:${ip}:${cleanUsername}`;

    const limiter = rateLimit(rateLimitKey, 5, 60 * 1000); // 5 tentativas por minuto por IP/usuário
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
        { status: 429 }
      );
    }

    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json({ error: 'A senha deve ser um PIN de 4 dígitos' }, { status: 400 });
    }

    const db = getDB();
    
    // Buscar usuário no Cloudflare D1
    const { results } = await db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .bind(cleanUsername, cleanUsername)
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
      username: user.username,
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
        username: user.username,
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
