import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    // 1. Validar autenticação e se o usuário é administrador
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDB();

    // 2. Inserir Curso
    if (type === 'course') {
      const { title, description, slug, thumbnail_gradient } = body;

      if (!title || !slug) {
        return NextResponse.json({ error: 'Título e slug são obrigatórios' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const gradient = thumbnail_gradient || 'from-orange-500 to-red-600';

      await db
        .prepare('INSERT INTO courses (id, title, description, slug, thumbnail_gradient) VALUES (?, ?, ?, ?, ?)')
        .bind(id, title, description || '', slug.toLowerCase().trim(), gradient)
        .run();

      return NextResponse.json({ success: true, id });
    }

    // 3. Inserir Módulo
    if (type === 'module') {
      const { courseId, title, description, position } = body;

      if (!courseId || !title) {
        return NextResponse.json({ error: 'courseId e título são obrigatórios' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const pos = position || 0;

      await db
        .prepare('INSERT INTO modules (id, course_id, title, description, position) VALUES (?, ?, ?, ?, ?)')
        .bind(id, courseId, title, description || '', pos)
        .run();

      return NextResponse.json({ success: true, id });
    }

    // 4. Inserir Aula
    if (type === 'lesson') {
      const { moduleId, title, description, position, videoId, durationSeconds } = body;

      if (!moduleId || !title) {
        return NextResponse.json({ error: 'moduleId e título são obrigatórios' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const pos = position || 0;
      const duration = durationSeconds || 0;

      await db
        .prepare('INSERT INTO lessons (id, module_id, title, description, position, video_id, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(id, moduleId, title, description || '', pos, videoId || null, duration)
        .run();

      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'Tipo de operação inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na rota admin courses:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
