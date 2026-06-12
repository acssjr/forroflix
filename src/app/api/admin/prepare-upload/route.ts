import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Falta o título do vídeo' }, { status: 400 });
    }

    // 1. Verificar autenticação e permissão de admin
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const sessionUser = sessionToken ? await verifyJWT(sessionToken) : null;

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

    // 2. Chamar a API da Bunny para criar o placeholder do vídeo (obter o GUID/videoId)
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      throw new Error(createData.message || 'Erro ao criar vídeo na API da Bunny.');
    }

    const videoId = createData.guid; // O ID gerado para o vídeo

    // 3. Gerar expiração do token de upload (2 horas)
    const expirationTime = Math.floor(Date.now() / 1000) + 7200;

    // 4. Calcular a assinatura de upload segura: sha256(libraryId + apiKey + expirationTime + videoId)
    const signatureInput = libraryId + apiKey + expirationTime + videoId;
    const signature = crypto
      .createHash('sha256')
      .update(signatureInput)
      .digest('hex');

    // Retornar as credenciais de upload seguro para o frontend realizar o upload direto
    return NextResponse.json({
      libraryId,
      videoId,
      expirationTime,
      signature
    });
  } catch (error: any) {
    console.error('Erro ao preparar upload Bunny:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
