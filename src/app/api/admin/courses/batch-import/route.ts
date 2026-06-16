import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface ImportStructure {
  folderName: string;
  moduleId?: string; // ID do módulo existente, se houver
  files: { title: string; tempId: string }[];
}

export async function POST(request: Request) {
  try {
    const { courseId, structure } = await request.json() as { courseId: string; structure: ImportStructure[] };

    if (!courseId || !structure || !Array.isArray(structure) || structure.length === 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // 1. Validar autenticação admin
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? (await verifyJWT(sessionToken)) as any : null;
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;
    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: 'Bunny Stream não configurado' }, { status: 500 });
    }

    const db = getDB();

    // 2. Obter a posição atual do último módulo do curso
    const maxModPosRes = await db
      .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM modules WHERE course_id = ?')
      .bind(courseId)
      .first<{ max_pos: number }>();
    const baseModulePosition = maxModPosRes?.max_pos ?? 0;

    // 3. Criar os placeholders de vídeos na Bunny CDN em paralelo
    const flatFilesToCreate = structure.flatMap((mod, modIdx) =>
      mod.files.map((file, fileIdx) => ({
        ...file,
        folderName: mod.folderName,
        modIdx,
        fileIdx
      }))
    );

    const bunnyCreationPromises = flatFilesToCreate.map(async (f) => {
      try {
        const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
          method: 'POST',
          headers: { 
            'AccessKey': apiKey, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ title: f.title })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Erro Bunny');

        const videoId = data.guid;
        // Gerar assinatura TUS
        const expirationTime = Math.floor(Date.now() / 1000) + 86400; // 24h
        const signature = crypto
          .createHash('sha256')
          .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
          .digest('hex');

        return {
          ...f,
          videoId,
          expirationTime,
          signature,
          success: true
        };
      } catch (err: any) {
        return {
          ...f,
          videoId: null,
          success: false,
          error: err.message
        };
      }
    });

    const bunnyResults = await Promise.all(bunnyCreationPromises);
    const validBunnyResults = bunnyResults.filter(r => r.success && r.videoId);

    // 4. Obter posições máximas das aulas para módulos existentes
    const existingModuleIds = structure.map(m => m.moduleId).filter(Boolean) as string[];
    const maxLessonPositions: Record<string, number> = {};
    
    if (existingModuleIds.length > 0) {
      for (const mId of existingModuleIds) {
        const res = await db
          .prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM lessons WHERE module_id = ?')
          .bind(mId)
          .first<{ max_pos: number }>();
        maxLessonPositions[mId] = res?.max_pos ?? 0;
      }
    }

    // 5. Montar os Statements SQL para execução em Lote (Transação única na Cloudflare D1)
    const dbStatements: any[] = [];
    const responseUploads: any[] = [];

    // Para cada módulo da estrutura de diretórios importada
    structure.forEach((mod, modIndex) => {
      const isExistingModule = !!mod.moduleId;
      const moduleId = mod.moduleId || crypto.randomUUID();

      if (!isExistingModule) {
        const modPosition = baseModulePosition + modIndex + 1;
        // Inserir Módulo
        dbStatements.push(
          db.prepare('INSERT INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)')
            .bind(moduleId, courseId, mod.folderName, modPosition)
        );
      }

      const baseLessonPosition = maxLessonPositions[moduleId] ?? 0;

      // Inserir Aulas pertencentes a este Módulo específico
      const modFiles = validBunnyResults.filter(r => r.modIdx === modIndex);
      modFiles.forEach((file, fileIndex) => {
        const lessonId = crypto.randomUUID();
        const lessonPosition = baseLessonPosition + fileIndex + 1;

        dbStatements.push(
          db.prepare('INSERT INTO lessons (id, module_id, title, position, video_id, upload_status) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(lessonId, moduleId, file.title, lessonPosition, file.videoId, 'pending')
        );

        responseUploads.push({
          tempId: file.tempId,
          lessonId,
          videoId: file.videoId,
          title: file.title,
          signature: file.signature,
          expirationTime: file.expirationTime,
          folderName: file.folderName
        });
      });
    });

    // Executa toda a estrutura no BD sob uma única transação D1
    if (dbStatements.length > 0) {
      await db.batch(dbStatements);
    }

    return NextResponse.json({
      success: true,
      libraryId,
      uploads: responseUploads,
      errors: bunnyResults.filter(r => !r.success).map(e => ({ title: e.title, error: e.error }))
    });

  } catch (error: any) {
    console.error('Erro na importação em lote:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
