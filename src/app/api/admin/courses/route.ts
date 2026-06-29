import { NextResponse, after } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { syncZeroDurationLessons } from '@/lib/sync-duration';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId é obrigatório' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDB();
    const { results: dbCourses } = await db
      .prepare('SELECT * FROM courses WHERE id = ?')
      .bind(courseId)
      .all<any>();

    const dbCourse = dbCourses[0];
    if (!dbCourse) {
      return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 });
    }

    const { results: dbModules } = await db
      .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC')
      .bind(courseId)
      .all<any>();

    const allLessonsToSync: any[] = [];
    const modules: any[] = [];
    if (dbModules) {
      for (const mod of dbModules) {
        const { results: dbLessons } = await db
          .prepare('SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC')
          .bind(mod.id)
          .all<any>();

        if (dbLessons) {
          allLessonsToSync.push(...dbLessons);
        }

        modules.push({
          id: mod.id,
          title: mod.title,
          position: mod.position,
          cover_vertical: mod.cover_vertical || null,
          cover_vertical_position: mod.cover_vertical_position || '50% 50%',
          lessons: (dbLessons || []).map(l => ({
            id: l.id,
            title: l.title,
            duration_seconds: l.duration_seconds || 0,
            video_id: l.video_id || '',
            position: l.position,
            description: l.description || '',
            submodule: l.submodule || null
          }))
        });
      }
    }

    if (allLessonsToSync.length > 0) {
      after(async () => {
        try {
          await syncZeroDurationLessons(allLessonsToSync);
        } catch (err) {
          console.error('[API SYNC] Error in background sync:', err);
        }
      });
    }

    return NextResponse.json({
      title: dbCourse.title,
      slug: dbCourse.slug,
      cover_vertical: dbCourse.cover_vertical || null,
      cover_horizontal: dbCourse.cover_horizontal || null,
      cover_background: dbCourse.cover_background || null,
      cover_vertical_position: dbCourse.cover_vertical_position || '50% 50%',
      cover_horizontal_position: dbCourse.cover_horizontal_position || '50% 50%',
      cover_background_position: dbCourse.cover_background_position || '50% 50%',
      is_featured: dbCourse.is_featured || 0,
      hide_title: dbCourse.hide_title || 0,
      modules
    });
  } catch (error: any) {
    console.error('Erro na rota admin courses GET:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}

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
      const { title, description, slug, thumbnail_gradient, cover_vertical, cover_horizontal, is_featured } = body;

      if (!title || !slug) {
        return NextResponse.json({ error: 'Título e slug são obrigatórios' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const gradient = thumbnail_gradient || 'from-red-600 to-red-600';
      const featured = is_featured ? 1 : 0;

      const statements: any[] = [];
      if (featured === 1) {
        statements.push(db.prepare('UPDATE courses SET is_featured = 0'));
      }

      statements.push(
        db
          .prepare('INSERT INTO courses (id, title, description, slug, thumbnail_gradient, cover_vertical, cover_horizontal, is_featured, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(position), 0) + 1 FROM courses))')
          .bind(id, title, description || '', slug.toLowerCase().trim(), gradient, cover_vertical || null, cover_horizontal || null, featured)
      );

      await db.batch(statements);

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
      const { moduleId, title, description, position, videoId, durationSeconds, submodule } = body;

      if (!moduleId || !title) {
        return NextResponse.json({ error: 'moduleId e título são obrigatórios' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const pos = position || 0;
      const duration = durationSeconds || 0;

      await db
        .prepare('INSERT INTO lessons (id, module_id, title, description, position, video_id, duration_seconds, submodule) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, moduleId, title, description || '', pos, videoId || null, duration, submodule || null)
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

    // Permite pular a verificação de 'id' para operações de reordenação estrutural global
    if (type !== 'reorder' && type !== 'reorder_courses' && !id) {
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

    // 2b. Reordenação de cursos (posição na tela inicial)
    if (type === 'reorder_courses') {
      const { courseIds } = body;
      if (!courseIds || !Array.isArray(courseIds)) {
        return NextResponse.json({ error: 'Lista de IDs de cursos inválida' }, { status: 400 });
      }
      const statements: any[] = [];
      courseIds.forEach((courseId: string, idx: number) => {
        statements.push(
          db.prepare('UPDATE courses SET position = ? WHERE id = ?')
            .bind(idx + 1, courseId)
        );
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

    // 3b. Editar Metadados do Módulo (Capa Vertical, Título, etc.)
    if (type === 'module_metadata') {
      const { cover_vertical, cover_vertical_position } = body;
      if (!title) {
        return NextResponse.json({ error: 'Título do módulo é obrigatório' }, { status: 400 });
      }
      await db
        .prepare('UPDATE modules SET title = ?, cover_vertical = ?, cover_vertical_position = ? WHERE id = ?')
        .bind(title.trim(), cover_vertical || null, cover_vertical_position || '50% 50%', id)
        .run();

      return NextResponse.json({ success: true });
    }

    // 4. Editar Aula (Título, Descrição, Submódulo e/ou uploadStatus)
    if (type === 'lesson') {
      const { description, uploadStatus, submodule } = body;
      if (title === undefined && description === undefined && uploadStatus === undefined && submodule === undefined) {
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
      if (submodule !== undefined) {
        updates.push('submodule = ?');
        params.push(submodule ? submodule.trim() : null);
      }

      // Adicionar id no fim
      params.push(id);

      await db
        .prepare(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();

      return NextResponse.json({ success: true });
    }

    // 5. Editar Metadados do Curso
    if (type === 'course_metadata') {
      const { 
        title, description, slug, thumbnail_gradient, 
        cover_vertical, cover_horizontal, cover_background,
        cover_vertical_position, cover_horizontal_position, cover_background_position,
        is_featured, hide_title 
      } = body;

      if (!id) {
        return NextResponse.json({ error: 'ID do curso é obrigatório' }, { status: 400 });
      }

      if (!title?.trim()) {
        return NextResponse.json({ error: 'Título do curso é obrigatório' }, { status: 400 });
      }

      if (!slug?.trim()) {
        return NextResponse.json({ error: 'Slug do curso é obrigatório' }, { status: 400 });
      }

      const featured = is_featured ? 1 : 0;
      const statements: any[] = [];

      // Se for tornar destaque, zera todos os outros primeiro
      if (featured === 1) {
        statements.push(db.prepare('UPDATE courses SET is_featured = 0'));
      }

      statements.push(
        db.prepare(`
          UPDATE courses 
          SET title = ?, description = ?, slug = ?, thumbnail_gradient = ?, 
              cover_vertical = ?, cover_horizontal = ?, cover_background = ?,
              cover_vertical_position = ?, cover_horizontal_position = ?, cover_background_position = ?,
              is_featured = ?, hide_title = ?
          WHERE id = ?
        `).bind(
          title?.trim(), 
          description?.trim() || '', 
          slug?.toLowerCase().trim(), 
          thumbnail_gradient || 'from-red-600 to-red-600', 
          cover_vertical?.trim() || null, 
          cover_horizontal?.trim() || null, 
          cover_background?.trim() || null, 
          cover_vertical_position || '50% 50%',
          cover_horizontal_position || '50% 50%',
          cover_background_position || '50% 50%',
          featured, 
          hide_title ? 1 : 0,
          id
        )
      );

      await db.batch(statements);
      return NextResponse.json({ success: true });
    }

    // 6. Alternar Destaque (is_featured) de Curso
    if (type === 'toggle_featured') {
      const { is_featured } = body;
      if (!id) {
        return NextResponse.json({ error: 'ID do curso é obrigatório' }, { status: 400 });
      }

      const featured = is_featured ? 1 : 0;
      const statements: any[] = [];

      if (featured === 1) {
        statements.push(db.prepare('UPDATE courses SET is_featured = 0'));
      }

      statements.push(
        db.prepare('UPDATE courses SET is_featured = ? WHERE id = ?')
          .bind(featured, id)
      );

      await db.batch(statements);
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
