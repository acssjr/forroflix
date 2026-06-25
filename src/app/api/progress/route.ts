import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { lessonId, completed } = await request.json();

    if (!lessonId) {
      return NextResponse.json({ error: 'Falta o parâmetro lessonId' }, { status: 400 });
    }

    // 1. Verificar autenticação via cookie JWT
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const db = getDB();

    // Validar existência da aula
    const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').bind(lessonId).first();
    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
    }

    const progressId = crypto.randomUUID();
    const completedInt = completed ? 1 : 0;

    // 2. Gravar ou atualizar progresso no Cloudflare D1 via UPSERT
    await db
      .prepare(`
        INSERT INTO progress (id, user_id, lesson_id, completed)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, lesson_id) 
        DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP
      `)
      .bind(progressId, sessionUser.id, lessonId, completedInt)
      .run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota de progresso D1:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
