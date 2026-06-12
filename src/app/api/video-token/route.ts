import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const runtime = 'edge';

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

    // 4. Gerar expiração do token (1 hora a partir de agora)
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const path = `/play/${libraryId}/${videoId}/playlist.m3u8`;

    // Algoritmo de Assinatura MD5 padrão do Bunny
    const tokenInput = tokenKey + path + expires;
    const token = crypto.createHash('md5').update(tokenInput).digest('hex');

    const playUrl = `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}/playlist.m3u8?token=${token}&expires=${expires}`;

    return NextResponse.json({
      playUrl,
      token,
      expires,
      libraryId
    });
  } catch (error: any) {
    console.error('Erro na rota de token do vídeo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
