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
      .prepare('SELECT id, email, username, full_name, role, subscription_active, created_at FROM users ORDER BY created_at DESC')
      .all<any>();

    return NextResponse.json({ success: true, users: results || [] });
  } catch (error: any) {
    console.error('[API Admin Users GET] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

// PATCH: Atualizar role, assinatura, username, fullName ou senha (PIN) do usuário
export async function PATCH(request: Request) {
  try {
    const admin = await validateAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role, subscription_active, username, fullName, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    const db = getDB();

    // Validar se o usuário a ser modificado existe
    const { results: existingUsers } = await db
      .prepare('SELECT id, role, subscription_active, username, email, full_name FROM users WHERE id = ?')
      .bind(userId)
      .all<any>();

    const userToUpdate = existingUsers?.[0];
    if (!userToUpdate) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Montar os campos dinâmicos a atualizar
    const updates: string[] = [];
    const bindings: any[] = [];

    // Validar e atualizar papel (role)
    if (role !== undefined) {
      if (userId === admin.id) {
        return NextResponse.json({ error: 'Não é permitido alterar o seu próprio papel administrativo.' }, { status: 400 });
      }
      if (role !== 'student' && role !== 'admin') {
        return NextResponse.json({ error: 'Papel (role) inválido' }, { status: 400 });
      }
      updates.push('role = ?');
      bindings.push(role);
    }

    // Validar e atualizar assinatura
    if (subscription_active !== undefined) {
      if (userId === admin.id) {
        return NextResponse.json({ error: 'Não é permitido desativar a sua própria assinatura vitalícia.' }, { status: 400 });
      }
      const activeVal = Number(subscription_active);
      if (activeVal !== 0 && activeVal !== 1) {
        return NextResponse.json({ error: 'Status de assinatura inválido' }, { status: 400 });
      }
      updates.push('subscription_active = ?');
      bindings.push(activeVal);
    }

    // Validar e atualizar Nome de Usuário (username)
    if (username !== undefined) {
      const cleanUsername = username.toLowerCase().trim();
      if (!cleanUsername) {
        return NextResponse.json({ error: 'O nome de usuário não pode ser vazio' }, { status: 400 });
      }
      if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
        return NextResponse.json({ error: 'O nome de usuário deve conter apenas letras minúsculas, números, sublinhados, pontos ou traços' }, { status: 400 });
      }

      // Verificar se o username já está em uso por outro usuário
      const generatedEmail = `${cleanUsername}@forroflix.com`;
      const { results: usernameCheck } = await db
        .prepare('SELECT id FROM users WHERE id != ? AND (username = ? OR email = ?)')
        .bind(userId, cleanUsername, generatedEmail)
        .all<any>();

      if (usernameCheck && usernameCheck.length > 0) {
        return NextResponse.json({ error: 'Este nome de usuário já está em uso' }, { status: 400 });
      }

      updates.push('username = ?');
      bindings.push(cleanUsername);

      // Também atualizamos o e-mail fictício correspondente caso o usuário tenha sido criado no modelo novo
      if (userToUpdate.email && userToUpdate.email.endsWith('@forroflix.com')) {
        updates.push('email = ?');
        bindings.push(generatedEmail);
      }
    }

    // Validar e atualizar Nome Completo
    if (fullName !== undefined) {
      updates.push('full_name = ?');
      bindings.push(fullName || '');
    }

    // Validar e atualizar Senha (PIN de 4 dígitos)
    if (password !== undefined) {
      if (!password) {
        return NextResponse.json({ error: 'A nova senha não pode ser vazia' }, { status: 400 });
      }
      if (!/^\d{4}$/.test(password)) {
        return NextResponse.json({ error: 'A senha deve ser um PIN de 4 dígitos' }, { status: 400 });
      }
      const passwordHash = hashPassword(password);
      updates.push('password_hash = ?');
      bindings.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar fornecido' }, { status: 400 });
    }

    // Vincular o ID no final
    bindings.push(userId);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.prepare(query).bind(...bindings).run();

    // Buscar o usuário atualizado completo para retornar
    const { results: updatedUsers } = await db
      .prepare('SELECT id, email, username, full_name, role, subscription_active, created_at FROM users WHERE id = ?')
      .bind(userId)
      .all<any>();

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário atualizado com sucesso',
      user: updatedUsers?.[0]
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
    const { username, password, fullName, role, subscriptionActive } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'O nome de usuário deve conter apenas letras minúsculas, números, sublinhados, pontos ou traços' }, { status: 400 });
    }

    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json({ error: 'A senha deve ser um PIN de 4 dígitos' }, { status: 400 });
    }

    const db = getDB();
    const generatedEmail = `${cleanUsername}@forroflix.com`;

    // 1. Verificar se o username ou e-mail já existe
    const { results: existingUsers } = await db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(cleanUsername, generatedEmail)
      .all<any>();

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'Este nome de usuário já está cadastrado' }, { status: 400 });
    }

    // 2. Criar novo ID e encriptar a senha
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const userRole = role === 'admin' ? 'admin' : 'student';
    const subActive = subscriptionActive === 1 || subscriptionActive === true ? 1 : 0;

    // 3. Inserir no banco D1
    await db
      .prepare('INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, generatedEmail, cleanUsername, passwordHash, fullName || '', userRole, subActive)
      .run();

    return NextResponse.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: {
        id,
        email: generatedEmail,
        username: cleanUsername,
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

// DELETE: Excluir usuário do sistema
export async function DELETE(request: Request) {
  try {
    const admin = await validateAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Trava de segurança: impede o admin de se auto-excluir
    if (userId === admin.id) {
      return NextResponse.json({ error: 'Não é permitido excluir a própria conta.' }, { status: 400 });
    }

    const db = getDB();

    // 1. Validar se o usuário a ser deletado existe
    const { results } = await db
      .prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .all<any>();

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 2. Deletar do banco D1/SQLite
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return NextResponse.json({ 
      success: true, 
      message: 'Usuário excluído com sucesso' 
    });
  } catch (error: any) {
    console.error('[API Admin Users DELETE] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
