import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { hashPassword, signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    const db = getDB();
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificar se o e-mail já existe cadastrado
    const { results: existingUsers } = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(cleanEmail)
      .all();

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'Este e-mail já está em uso' }, { status: 400 });
    }

    // 2. Criar novo ID e encriptar a senha
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    
    // Se for o primeiro usuário do banco, podemos defini-lo como admin para facilitar testes locais
    const { results: totalUsers } = await db.prepare('SELECT COUNT(*) as count FROM users').all<any>();
    const isFirstUser = totalUsers && totalUsers[0]?.count === 0;
    const role = isFirstUser ? 'admin' : 'student';
    // Por padrão o primeiro usuário também começa ativo para teste fácil
    const subscriptionActive = isFirstUser ? 1 : 0; 

    // 3. Inserir no Cloudflare D1
    await db
      .prepare('INSERT INTO users (id, email, password_hash, full_name, role, subscription_active) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, cleanEmail, passwordHash, full_name || '', role, subscriptionActive)
      .run();

    // 4. Iniciar sessão automática do usuário recém-criado
    const sessionToken = await signJWT({
      id,
      email: cleanEmail,
      role,
      subscription_active: subscriptionActive === 1
    });

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
        id,
        email: cleanEmail,
        full_name: full_name || '',
        role,
        subscription_active: subscriptionActive === 1
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erro na rota de cadastro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
