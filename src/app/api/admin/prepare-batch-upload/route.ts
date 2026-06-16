import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { moduleId, files } = await request.json();

    if (!moduleId || !files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // 1. Verificar autenticação e permissão de admin
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;

    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({
        error: 'Bunny Stream não configurado no servidor'
      }, { status: 500 });
    }

    const db = getDB();

    // 2. Obter a posição máxima atual de aulas dentro do módulo para sequenciar corretamente
    const maxPosRes = await db
      .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM lessons WHERE module_id = ?')
      .bind(moduleId)
      .first<{ max_pos: number }>();

    const basePosition = maxPosRes?.max_pos ?? 0;

    // 3. Criar os vídeos na Bunny CDN em paralelo (Promise.all)
    const creationPromises = files.map(async (file: { title: string }, index: number) => {
      try {
        const title = file.title;
        const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
          method: 'POST',
          headers: {
            'AccessKey': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Erro HTTP ${res.status} ao criar vídeo no Bunny.`);
        }

        const videoId = data.guid;
        
        // Gerar assinatura TUS segura: SHA256(libraryId + apiKey + expirationTime + videoId)
        // Definir expiração para 24 horas no futuro (timestamp UNIX em segundos)
        const expirationTime = Math.floor(Date.now() / 1000) + 86400; 
        const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
        const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

        return {
          title,
          videoId,
          expirationTime,
          signature,
          position: basePosition + index + 1,
          success: true,
          error: null
        };
      } catch (err: any) {
        return {
          title: file.title,
          videoId: null,
          expirationTime: null,
          signature: null,
          position: basePosition + index + 1,
          success: false,
          error: err.message || 'Erro ao criar vídeo'
        };
      }
    });

    const bunnyResults = await Promise.all(creationPromises);

    // 4. Preparar statements de inserção na D1 em lote (db.batch)
    const dbStatements: any[] = [];
    const validResults = bunnyResults.filter(r => r.success && r.videoId);

    // Mapeamento de lessonId gerado localmente
    const resultsWithLessonIds = validResults.map((v) => {
      const lessonId = crypto.randomUUID();
      const statement = db
        .prepare('INSERT INTO lessons (id, module_id, title, description, position, video_id, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(
          lessonId,
          moduleId,
          v.title,
          null,
          v.position,
          v.videoId,
          0 // Será atualizado em background pela Bunny CDN
        );

      dbStatements.push(statement);
      
      return {
        ...v,
        lessonId
      };
    });

    if (dbStatements.length > 0) {
      await db.batch(dbStatements);
    }

    // Retorna as credenciais e ids para os uploads individuais funcionarem via TUS
    return NextResponse.json({
      libraryId,
      uploads: resultsWithLessonIds.map(u => ({
        lessonId: u.lessonId,
        videoId: u.videoId,
        title: u.title,
        signature: u.signature,
        expirationTime: u.expirationTime,
        position: u.position
      })),
      errors: bunnyResults.filter(r => !r.success).map(e => ({ title: e.title, error: e.error }))
    });

  } catch (error: any) {
    console.error('Erro ao preparar upload em lote:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
