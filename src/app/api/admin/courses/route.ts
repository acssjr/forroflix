import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { type, id, title } = body;

    // 1. Validar autenticação e se o usuário é administrador
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDB();

    // Permite pular a verificação de 'id' somente para a operação de reordenação estrutural global
    if (type !== 'reorder' && !id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // 2. Reordenação em lote (Drag & Drop de módulos/aulas)
    if (type === 'reorder') {
      const { modules } = body;

      if (!modules || !Array.isArray(modules)) {
        return NextResponse.json({ error: 'Lista de módulos inválida' }, { status: 400 });
      }

      const statements: any[] = [];

      modules.forEach((mod: any, modIdx: number) => {
        // Atualizar a posição do módulo
        statements.push(
          db.prepare('UPDATE modules SET position = ? WHERE id = ?')
            .bind(modIdx + 1, mod.id)
        );

        // Atualizar a posição e a associação com o módulo pai de todas as aulas
        if (mod.lessons && Array.isArray(mod.lessons)) {
          mod.lessons.forEach((les: any, lesIdx: number) => {
            statements.push(
              db.prepare('UPDATE lessons SET position = ?, module_id = ? WHERE id = ?')
                .bind(lesIdx + 1, mod.id, les.id)
            );
          });
        }
      });

      if (statements.length > 0) {
        await db.batch(statements);
      }

      return NextResponse.json({ success: true });
    }

    // 3. Renomear Módulo
    if (type === 'module') {
      if (!title) {
        return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
      }
      await db
        .prepare('UPDATE modules SET title = ? WHERE id = ?')
        .bind(title.trim(), id)
        .run();

      return NextResponse.json({ success: true });
    }

    // 4. Editar Aula (Título, Descrição e/ou uploadStatus)
    if (type === 'lesson') {
      const { description, uploadStatus } = body;
      if (title === undefined && description === undefined && uploadStatus === undefined) {
        return NextResponse.json({ error: 'Nenhum campo para atualizar informado' }, { status: 400 });
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description.trim());
      }
      if (uploadStatus !== undefined) {
        updates.push('upload_status = ?');
        params.push(uploadStatus);
      }

      // Adicionar id no fim
      params.push(id);

      await db
        .prepare(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo de operação inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na rota admin courses PATCH:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { type, id, ids } = body;

    // 1. Validar autenticação e se o usuário é administrador
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDB();

    // 2. Excluir Aulas (Lote ou Individual)
    if (type === 'lesson' || type === 'lessons') {
      const targetIds = ids || (id ? [id] : []);
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return NextResponse.json({ error: 'Nenhum ID de aula informado' }, { status: 400 });
      }

      const statements = targetIds.map((lessonId: string) => 
        db.prepare('DELETE FROM lessons WHERE id = ?').bind(lessonId)
      );

      await db.batch(statements);
      return NextResponse.json({ success: true });
    }

    // 3. Excluir Módulo
    if (type === 'module') {
      if (!id) {
        return NextResponse.json({ error: 'ID do módulo é obrigatório' }, { status: 400 });
      }

      await db.prepare('DELETE FROM modules WHERE id = ?').bind(id).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo de operação inválido' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na rota admin courses DELETE:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
