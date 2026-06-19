import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    const db = getDB();
    
    // Buscar usuário por username
    const { results } = await db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username.toLowerCase().trim())
      .all<any>();

    const user = results[0];

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      name: user.full_name || user.username
    });
  } catch (error: any) {
    console.error('Erro na rota de verificação de usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
