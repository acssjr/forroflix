import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Falta o parâmetro videoId' }, { status: 400 });
    }

    // 1. Obter e verificar token de sessão dos cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // 2. Buscar o status de assinatura atualizado no D1
    const db = getDB();
    const { results } = await db
      .prepare('SELECT role, subscription_active FROM users WHERE id = ?')
      .bind(sessionUser.id)
      .all<any>();

    const user = results[0];

    if (!user) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    const hasAccess = user.subscription_active === 1 || user.role === 'admin';
    if (!hasAccess) {
      return NextResponse.json({ error: 'Assinatura inativa' }, { status: 403 });
    }

    // 3. Obter configurações do Bunny Stream do .env.local
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;

    if (!libraryId || !tokenKey) {
      console.warn('[BUNNY] Bunny Stream não está configurado completamente no .env.local.');
      return NextResponse.json({
        playUrl: `https://iframe.mediadelivery.net/play/mock-library/mock-video/playlist.m3u8`,
        token: 'mock-token',
        expires: 0,
        warning: 'Bunny Stream não configurado no .env.local'
      });
    }

    // 4. Gerar expiração do token (2 horas a partir de agora)
    const expires = Math.floor(Date.now() / 1000) + 7200;

    // Algoritmo de Assinatura SHA256 padrão para Iframe Embed do Bunny Stream:
    // SHA256(token_security_key + video_id + expiration)
    const tokenInput = tokenKey + videoId + expires;
    const token = crypto.createHash('sha256').update(tokenInput).digest('hex');

    // URL segura de reprodução via Iframe
    const playUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;

    // 5. Sincronizar duração da aula no banco se estiver zerada
    let duration = 0;
    try {
      const lessonRes = await db
        .prepare('SELECT id, duration_seconds FROM lessons WHERE video_id = ?')
        .bind(videoId)
        .all<any>();
      
      const lesson = lessonRes.results[0];
      if (lesson) {
        duration = lesson.duration_seconds || 0;

        if (duration === 0) {
          const apiKey = process.env.BUNNY_STREAM_API_KEY;
          if (apiKey) {
            const bunnyRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
              headers: { 'AccessKey': apiKey, 'accept': 'application/json' }
            });
            if (bunnyRes.ok) {
              const bunnyData = await bunnyRes.json() as any;
              const length = bunnyData.length || 0;
              if (length > 0) {
                duration = length;
                await db
                  .prepare('UPDATE lessons SET duration_seconds = ? WHERE id = ?')
                  .bind(length, lesson.id)
                  .run();
                console.log(`[BUNNY SYNC] Duração da aula ${lesson.id} sincronizada: ${length}s.`);
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('[BUNNY SYNC] Falha ao sincronizar duração:', dbErr);
    }

    return NextResponse.json({
      playUrl,
      token,
      expires,
      libraryId,
      duration
    });
  } catch (error: any) {
    console.error('Erro na rota de token do vídeo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
