'use server';

import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to authenticate user from session cookie
async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;
  return await verifyJWT(sessionToken);
}

// 1. Action to toggle lesson progress
export async function toggleProgressAction(lessonId: string, completed: boolean) {
  try {
    if (!lessonId) {
      return { error: 'Falta o parâmetro lessonId' };
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return { error: 'Usuário não autenticado' };
    }

    const db = getDB();
    const progressId = crypto.randomUUID();
    const completedInt = completed ? 1 : 0;

    await db
      .prepare(`
        INSERT INTO progress (id, user_id, lesson_id, completed)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, lesson_id) 
        DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP
      `)
      .bind(progressId, sessionUser.id, lessonId, completedInt)
      .run();

    return { success: true };
  } catch (error: any) {
    console.error('Erro na action toggleProgressAction:', error);
    return { error: 'Erro interno no servidor' };
  }
}

// 2. Action to toggle favorites
export async function toggleFavoriteAction(lessonId: string, favorited: boolean) {
  try {
    if (!lessonId) {
      return { error: 'Falta o parâmetro lessonId' };
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return { error: 'Usuário não autenticado' };
    }

    const db = getDB();

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

    return { success: true };
  } catch (error: any) {
    console.error('Erro na action toggleFavoriteAction:', error);
    return { error: 'Erro interno no servidor' };
  }
}

// 3. Action to create a note
export async function createNoteAction(lessonId: string, content: string, seconds: number, isPublic: boolean) {
  try {
    if (!lessonId || seconds === undefined || !content) {
      return { error: 'Parâmetros incompletos' };
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return { error: 'Usuário não autenticado' };
    }

    const db = getDB();
    const noteId = crypto.randomUUID();
    const isPublicVal = isPublic ? 1 : 0;

    await db
      .prepare(`
        INSERT INTO lesson_notes (id, lesson_id, user_id, watched_seconds, content, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(noteId, lessonId, sessionUser.id, Math.round(seconds), content.trim(), isPublicVal)
      .run();

    // Fetch the newly created note joining user metadata
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

    return { success: true, note };
  } catch (error: any) {
    console.error('Erro na action createNoteAction:', error);
    return { error: 'Erro interno no servidor' };
  }
}

// 4. Action to delete a note
export async function deleteNoteAction(noteId: string) {
  try {
    if (!noteId) {
      return { error: 'Falta o parâmetro noteId' };
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return { error: 'Usuário não autenticado' };
    }

    const db = getDB();

    const note = await db
      .prepare('SELECT user_id FROM lesson_notes WHERE id = ?')
      .bind(noteId)
      .first<any>();

    if (!note) {
      return { error: 'Anotação não encontrada' };
    }

    if (note.user_id !== sessionUser.id && sessionUser.role !== 'admin') {
      return { error: 'Permissão negada' };
    }

    await db.prepare('DELETE FROM lesson_notes WHERE id = ?').bind(noteId).run();

    return { success: true };
  } catch (error: any) {
    console.error('Erro na action deleteNoteAction:', error);
    return { error: 'Erro interno no servidor' };
  }
}
