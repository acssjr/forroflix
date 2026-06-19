import { getDB } from './db';

interface LessonToSync {
  id: string;
  video_id: string | null;
  duration_seconds: number;
}

/**
 * Sincroniza em segundo plano a duração de aulas que estão com duração zerada
 */
export async function syncZeroDurationLessons(lessons: LessonToSync[]) {
  const zeroDurationLessons = lessons.filter(
    (l) => l.video_id && (l.duration_seconds || 0) <= 0
  );

  if (zeroDurationLessons.length === 0) return;

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '';
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  if (!libraryId || !apiKey) {
    return;
  }

  const db = getDB();

  // Executa a sincronização em paralelo (sem travar a thread principal se rodar em background)
  return Promise.all(
    zeroDurationLessons.map(async (lesson) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const res = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${lesson.video_id}`,
          {
            signal: controller.signal,
            headers: {
              'AccessKey': apiKey,
              'accept': 'application/json',
            },
          }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const bunnyData = (await res.json()) as any;
          const length = bunnyData.length || 0;
          if (length > 0) {
            await db
              .prepare('UPDATE lessons SET duration_seconds = ? WHERE id = ?')
              .bind(length, lesson.id)
              .run();
            
            // Atualizar a referência em memória local do objeto para a renderização atual
            lesson.duration_seconds = length;
            console.log(
              `[BUNNY SYNC] Aula ${lesson.id} sincronizada com sucesso: ${length}s.`
            );
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn(
          `[BUNNY SYNC] Erro ao sincronizar duração da aula ${lesson.id}:`,
          err.name === 'AbortError' ? 'Timeout de requisição (30s) excedido' : err
        );
      }
    })
  ).catch((err) => {
    console.error('[BUNNY SYNC] Falha na sincronização concorrente:', err);
  });
}
