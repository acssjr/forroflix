import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Usuário é obrigatório' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitKey = `check-user:${ip}`;
    const limiter = rateLimit(rateLimitKey, 15, 60 * 1000); // 15 tentativas por minuto por IP
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de verificação. Tente novamente mais tarde.' },
        { status: 429 }
      );
    }

    const db = getDB();
    
    // Buscar se usuário existe por username (apenas SELECT 1 para performance e privacidade)
    const { results } = await db
      .prepare('SELECT 1 FROM users WHERE username = ? LIMIT 1')
      .bind(username.toLowerCase().trim())
      .all<any>();

    const exists = results && results.length > 0;

    return NextResponse.json({ exists });
  } catch (error: any) {
    console.error('Erro na rota de verificação de usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
