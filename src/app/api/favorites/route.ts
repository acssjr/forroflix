import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const db = getDB();

    // 1. Buscar pastas existentes do usuário no banco (globais ou daquele curso específico)
    const { results: dbFolders } = await db
      .prepare('SELECT * FROM favorite_folders WHERE user_id = ? AND (is_global = 1 OR course_id = ?)')
      .bind(sessionUser.id, courseId)
      .all<any>();

    // 2. Definir as pastas padrão
    // Como as pastas padrão são inicialmente geradas sob demanda e depois salvas no banco de dados com um escopo,
    // nós as fornecemos como globais (is_global = 1). Caso o usuário já as tenha salvo como específicas de um curso no banco,
    // a etapa seguinte mesclará a versão real do banco de dados (que terá is_global = 0 e o course_id correto).
    const defaultFolders = [
      { name: 'Revisar Passo', is_global: 1, course_id: null },
      { name: 'Aprender Depois', is_global: 1, course_id: null },
      { name: 'Favoritas do Coração', is_global: 1, course_id: null }
    ];

    // Mesclar pastas padrão com as do banco
    const allFoldersMap = new Map<string, any>();
    
    // Adicionar padrões no escopo global primeiro
    defaultFolders.forEach((def, index) => {
      allFoldersMap.set(`${def.name}_global`, {
        id: `default-global-${index}`,
        name: def.name,
        is_global: 1,
        course_id: null,
        active: false
      });

      // Se um courseId foi fornecido, também pré-cria os padrões no escopo deste curso
      if (courseId) {
        allFoldersMap.set(`${def.name}_course_${courseId}`, {
          id: `default-course-${index}`,
          name: def.name,
          is_global: 0,
          course_id: courseId,
          active: false
        });
      }
    });

    // Sobrescrever ou complementar com as pastas reais do banco
    dbFolders?.forEach((folder: any) => {
      // Cria chaves separadas para a pasta global e a específica do curso
      const key = folder.is_global === 1 ? `${folder.name}_global` : `${folder.name}_course_${folder.course_id}`;
      allFoldersMap.set(key, {
        id: folder.id,
        name: folder.name,
        is_global: folder.is_global,
        course_id: folder.course_id,
        active: false
      });
    });

    // 3. Se lessonId foi fornecido, verificar em quais pastas a aula está associada
    if (lessonId) {
      const { results: activeMappings } = await db
        .prepare(`
          SELECT folder_id, ff.name, ff.is_global, ff.course_id
          FROM favorite_folder_lessons ffl
          JOIN favorite_folders ff ON ffl.folder_id = ff.id
          WHERE ffl.user_id = ? AND ffl.lesson_id = ?
        `)
        .bind(sessionUser.id, lessonId)
        .all<any>();

      activeMappings?.forEach((mapping: any) => {
        const key = mapping.is_global === 1 ? `${mapping.name}_global` : `${mapping.name}_course_${mapping.course_id}`;
        const folder = allFoldersMap.get(key);
        if (folder) {
          folder.active = true;
          if (folder.id.startsWith('default-')) {
            folder.id = mapping.folder_id;
          }
        } else {
          allFoldersMap.set(key, {
            id: mapping.folder_id,
            name: mapping.name,
            is_global: mapping.is_global,
            course_id: mapping.course_id,
            active: true
          });
        }
      });
    }

    return NextResponse.json({ folders: Array.from(allFoldersMap.values()) });
  } catch (error) {
    console.error('Erro ao buscar pastas de favoritos:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lessonId, favorited, folderName, isGlobal, courseId, active } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Falta o parâmetro lessonId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const db = getDB();

    // Validar existência da aula
    const lesson = await db.prepare('SELECT id FROM lessons WHERE id = ?').bind(lessonId).first();
    if (!lesson) {
      return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
    }

    // 1. Caso de uso A: Gerenciamento detalhado de Pastas (Instagram-style)
    if (folderName !== undefined) {
      const isGlobalVal = isGlobal ? 1 : 0;
      const targetCourseId = isGlobal ? null : courseId;

      // Buscar se a pasta já existe
      const { results: folderResults } = await db
        .prepare('SELECT id FROM favorite_folders WHERE user_id = ? AND name = ? AND (course_id = ? OR (course_id IS NULL AND ? IS NULL))')
        .bind(sessionUser.id, folderName, targetCourseId, targetCourseId)
        .all<any>();

      let folderId = folderResults?.[0]?.id;

      // Criar a pasta se não existir
      if (!folderId) {
        folderId = crypto.randomUUID();
        await db
          .prepare('INSERT INTO favorite_folders (id, user_id, name, course_id, is_global) VALUES (?, ?, ?, ?, ?)')
          .bind(folderId, sessionUser.id, folderName, targetCourseId, isGlobalVal)
          .run();
      }

      if (active) {
        // Associar a aula à pasta
        const mappingId = crypto.randomUUID();
        await db
          .prepare('INSERT OR IGNORE INTO favorite_folder_lessons (id, user_id, folder_id, lesson_id) VALUES (?, ?, ?, ?)')
          .bind(mappingId, sessionUser.id, folderId, lessonId)
          .run();

        // Garantir que a aula está marcada como favorita na tabela simplificada 'favorites'
        const favId = crypto.randomUUID();
        await db
          .prepare('INSERT OR IGNORE INTO favorites (id, user_id, lesson_id) VALUES (?, ?, ?)')
          .bind(favId, sessionUser.id, lessonId)
          .run();
      } else {
        // Remover a associação da pasta
        await db
          .prepare('DELETE FROM favorite_folder_lessons WHERE user_id = ? AND folder_id = ? AND lesson_id = ?')
          .bind(sessionUser.id, folderId, lessonId)
          .run();

        // Verificar se a aula ainda está em alguma outra pasta do usuário
        const { results: remaining } = await db
          .prepare('SELECT id FROM favorite_folder_lessons WHERE user_id = ? AND lesson_id = ?')
          .bind(sessionUser.id, lessonId)
          .all<any>();

        // Se não restar nenhuma pasta, remove também da tabela 'favorites'
        if (!remaining || remaining.length === 0) {
          await db
            .prepare('DELETE FROM favorites WHERE user_id = ? AND lesson_id = ?')
            .bind(sessionUser.id, lessonId)
            .run();
        }
      }

      return NextResponse.json({ success: true, folderId });
    }

    // 2. Caso de uso B: Toggle Simples (clique direto na estrela)
    if (favorited) {
      const folderNameDefault = 'Favoritas do Coração';
      
      const { results: folderResults } = await db
        .prepare('SELECT id FROM favorite_folders WHERE user_id = ? AND name = ? AND course_id IS NULL')
        .bind(sessionUser.id, folderNameDefault)
        .all<any>();

      let folderId = folderResults?.[0]?.id;
      if (!folderId) {
        folderId = crypto.randomUUID();
        await db
          .prepare('INSERT INTO favorite_folders (id, user_id, name, course_id, is_global) VALUES (?, ?, ?, ?, ?)')
          .bind(folderId, sessionUser.id, folderNameDefault, null, 1)
          .run();
      }

      const mappingId = crypto.randomUUID();
      await db
        .prepare('INSERT OR IGNORE INTO favorite_folder_lessons (id, user_id, folder_id, lesson_id) VALUES (?, ?, ?, ?)')
        .bind(mappingId, sessionUser.id, folderId, lessonId)
        .run();

      const favId = crypto.randomUUID();
      await db
        .prepare('INSERT OR IGNORE INTO favorites (id, user_id, lesson_id) VALUES (?, ?, ?)')
        .bind(favId, sessionUser.id, lessonId)
        .run();
    } else {
      await db
        .prepare('DELETE FROM favorites WHERE user_id = ? AND lesson_id = ?')
        .bind(sessionUser.id, lessonId)
        .run();

      await db
        .prepare('DELETE FROM favorite_folder_lessons WHERE user_id = ? AND lesson_id = ?')
        .bind(sessionUser.id, lessonId)
        .run();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro na rota de favoritos:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
