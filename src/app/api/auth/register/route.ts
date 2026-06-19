import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { hashPassword, signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password, full_name } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'O nome de usuário deve conter apenas letras minúsculas, números, sublinhados, pontos ou traços' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json({ error: 'A senha deve ser um PIN de 4 dígitos' }, { status: 400 });
    }

    const db = getDB();
    const generatedEmail = `${cleanUsername}@forroflix.com`;

    // 1. Verificar se o username ou e-mail já existe cadastrado
    const { results: existingUsers } = await db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(cleanUsername, generatedEmail)
      .all();

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'Este nome de usuário já está em uso' }, { status: 400 });
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
      .prepare('INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, generatedEmail, cleanUsername, passwordHash, full_name || '', role, subscriptionActive)
      .run();

    // 4. Iniciar sessão automática do usuário recém-criado
    const sessionToken = await signJWT({
      id,
      email: generatedEmail,
      username: cleanUsername,
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
        email: generatedEmail,
        username: cleanUsername,
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
