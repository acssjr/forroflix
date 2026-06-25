import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET: Fetch notes for a lesson
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

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

    // Buscar observações da aula
    // Se for admin, vê todas. Se for aluno, vê todas as públicas ou as suas próprias privadas.
    let notesQuery = `
      SELECT 
        ln.*,
        u.full_name,
        u.username,
        u.role
      FROM lesson_notes ln
      JOIN users u ON ln.user_id = u.id
      WHERE ln.lesson_id = ?
    `;

    const params: any[] = [lessonId];

    if (sessionUser.role !== 'admin') {
      notesQuery += ` AND (ln.is_public = 1 OR ln.user_id = ?)`;
      params.push(sessionUser.id);
    }

    notesQuery += ` ORDER BY ln.watched_seconds ASC, ln.created_at DESC`;

    const notesRes = await db.prepare(notesQuery).bind(...params).all<any>();
    const notes = (notesRes.results || []).map((note: any) => ({
      ...note,
      is_owner: sessionUser ? note.user_id === sessionUser.id : false,
    }));

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('Erro na rota GET /api/notes:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Create a note
export async function POST(request: Request) {
  try {
    const { lessonId, watchedSeconds, content, isPublic } = await request.json();

    if (!lessonId || watchedSeconds === undefined || !content) {
      return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 });
    }

    // 1. Verificar autenticação
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const db = getDB();

    // Validar anotação vazia ou muito longa
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return NextResponse.json({ error: 'A anotação não pode estar vazia' }, { status: 400 });
    }
    if (trimmedContent.length > 1000) {
      return NextResponse.json({ error: 'A anotação não pode ter mais de 1000 caracteres' }, { status: 400 });
    }

    // Validar tempo do vídeo não negativo
    const roundedSeconds = Math.round(watchedSeconds);
    if (roundedSeconds < 0) {
      return NextResponse.json({ error: 'O tempo do vídeo não pode ser negativo' }, { status: 400 });
    }

    // Validar existência da aula
    const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').bind(lessonId).first();
    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
    }

    const noteId = crypto.randomUUID();
    const isPublicVal = isPublic ? 1 : 0;

    await db
      .prepare(`
        INSERT INTO lesson_notes (id, lesson_id, user_id, watched_seconds, content, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(noteId, lessonId, sessionUser.id, roundedSeconds, trimmedContent, isPublicVal)
      .run();

    // Buscar a nota recém-criada juntando o usuário para retornar um objeto completo ao frontend
    const noteRes = await db
      .prepare(`
        SELECT 
          ln.*,
          u.full_name,
          u.username,
          u.role
        FROM lesson_notes ln
        JOIN users u ON ln.user_id = u.id
        WHERE ln.id = ?
      `)
      .bind(noteId)
      .first<any>();

    const note = noteRes ? {
      ...noteRes,
      is_owner: true,
    } : null;

    return NextResponse.json({ note });
  } catch (error: any) {
    console.error('Erro na rota POST /api/notes:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE: Delete a note
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json({ error: 'Falta o parâmetro noteId' }, { status: 400 });
    }

    // 1. Verificar autenticação
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const db = getDB();

    // 2. Buscar a nota existente para validar propriedade
    const note = await db
      .prepare('SELECT user_id FROM lesson_notes WHERE id = ?')
      .bind(noteId)
      .first<any>();

    if (!note) {
      return NextResponse.json({ error: 'Anotação não encontrada' }, { status: 404 });
    }

    // 3. Somente o próprio autor ou administradores podem excluir
    if (note.user_id !== sessionUser.id && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    await db.prepare('DELETE FROM lesson_notes WHERE id = ?').bind(noteId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota DELETE /api/notes:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
