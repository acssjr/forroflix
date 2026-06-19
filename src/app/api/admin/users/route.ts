import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyJWT, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

// Validar se o usuário é administrador
async function validateAdminSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  const sessionUser = sessionToken ? await verifyJWT(sessionToken) as any : null;

  if (!sessionUser || sessionUser.role !== 'admin') {
    return null;
  }
  return sessionUser;
}

// GET: Listar todos os usuários
export async function GET() {
  try {
    const admin = await validateAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDB();
    const { results } = await db
      .prepare('SELECT id, email, full_name, role, subscription_active, created_at FROM users ORDER BY created_at DESC')
      .all<any>();

    return NextResponse.json({ success: true, users: results || [] });
  } catch (error: any) {
    console.error('[API Admin Users GET] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH: Atualizar role ou assinatura do usuário
export async function PATCH(request: Request) {
  try {
    const admin = await validateAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role, subscription_active } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Trava de segurança: impede o admin de se auto-bloquear ou alterar o próprio papel
    if (userId === admin.id) {
      return NextResponse.json({ error: 'Não é permitido alterar as próprias permissões ou status de assinatura.' }, { status: 400 });
    }

    const db = getDB();

    // Validar se o usuário a ser modificado existe
    const { results: existingUsers } = await db
      .prepare('SELECT id, role, subscription_active FROM users WHERE id = ?')
      .bind(userId)
      .all<any>();

    const userToUpdate = existingUsers?.[0];
    if (!userToUpdate) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Montar os campos dinâmicos a atualizar
    const updates: string[] = [];
    const bindings: any[] = [];

    if (role !== undefined) {
      if (role !== 'student' && role !== 'admin') {
        return NextResponse.json({ error: 'Papel (role) inválido' }, { status: 400 });
      }
      updates.push('role = ?');
      bindings.push(role);
    }

    if (subscription_active !== undefined) {
      const activeVal = Number(subscription_active);
      if (activeVal !== 0 && activeVal !== 1) {
        return NextResponse.json({ error: 'Status de assinatura inválido' }, { status: 400 });
      }
      updates.push('subscription_active = ?');
      bindings.push(activeVal);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar fornecido' }, { status: 400 });
    }

    // Vincular o ID no final
    bindings.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(query).bind(...bindings).run();

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário atualizado com sucesso',
      updated: {
        id: userId,
        role: role !== undefined ? role : userToUpdate.role,
        subscription_active: subscription_active !== undefined ? Number(subscription_active) : userToUpdate.subscription_active
      }
    });
  } catch (error: any) {
    console.error('[API Admin Users PATCH] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST: Criar usuário manualmente pelo admin
export async function POST(request: Request) {
  try {
    const admin = await validateAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, fullName, role, subscriptionActive } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDB();

    // 1. Verificar se o e-mail já existe
    const { results: existingUsers } = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(cleanEmail)
      .all<any>();

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 });
    }

    // 2. Criar novo ID e encriptar a senha
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const userRole = role === 'admin' ? 'admin' : 'student';
    const subActive = subscriptionActive === 1 || subscriptionActive === true ? 1 : 0;

    // 3. Inserir no banco D1
    await db
      .prepare('INSERT INTO users (id, email, password_hash, full_name, role, subscription_active) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, cleanEmail, passwordHash, fullName || '', userRole, subActive)
      .run();

    return NextResponse.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id,
        email: cleanEmail,
        full_name: fullName || '',
        role: userRole,
        subscription_active: subActive,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API Admin Users POST] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
