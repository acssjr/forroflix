import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, PATCH, POST, DELETE } from '@/app/api/admin/users/route';
import { getDB } from '@/lib/db';

let mockSessionToken = 'admin-valid-token';

// Mockar cookies e autenticação do Next.js
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'session') {
        return { value: mockSessionToken };
      }
      return null;
    }
  })
}));

vi.mock('@/lib/auth', () => ({
  verifyJWT: async (token: string) => {
    if (token === 'admin-valid-token') {
      return { id: 'admin-id-123', role: 'admin', email: 'admin@forroflix.com' };
    }
    if (token === 'student-valid-token') {
      return { id: 'student-id-456', role: 'student', email: 'student@forroflix.com' };
    }
    return null;
  },
  hashPassword: (password: string) => 'hashed_' + password,
  verifyPassword: (password: string, hash: string) => hash === 'hashed_' + password
}));

describe('Integração: Rota API /api/admin/users', () => {
  beforeEach(async () => {
    mockSessionToken = 'admin-valid-token';
    const db = getDB();
    // Limpar e reinserir usuários na base em memória
    await db.exec('DELETE FROM users');
    
    // Inserir um administrador
    await db.prepare(`
      INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind('admin-id-123', 'admin@forroflix.com', 'admin', 'hashed', 'Admin User', 'admin', 1).run();

    // Inserir um estudante comum
    await db.prepare(`
      INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind('student-id-456', 'student@forroflix.com', 'student', 'hashed', 'Student User', 'student', 0).run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET - Listagem de Usuários', () => {
    it('Deve listar todos os usuários com sucesso para o administrador', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.users.length).toBe(2);
      
      const admin = data.users.find((u: any) => u.id === 'admin-id-123');
      expect(admin).toBeDefined();
      expect(admin.email).toBe('admin@forroflix.com');
      expect(admin.role).toBe('admin');
      
      const student = data.users.find((u: any) => u.id === 'student-id-456');
      expect(student).toBeDefined();
      expect(student.email).toBe('student@forroflix.com');
      expect(student.role).toBe('student');
      expect(student.subscription_active).toBe(0);
    });

    it('Deve retornar erro 403 (Acesso Negado) se o usuário não for administrador', async () => {
      mockSessionToken = 'student-valid-token';
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Acesso negado');
    });

    it('Deve retornar erro 403 (Acesso Negado) se não houver cookie de sessão', async () => {
      mockSessionToken = '';
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Acesso negado');
    });
  });

  describe('PATCH - Atualização de Permissões e Acessos', () => {
    it('Deve permitir que o administrador ative a assinatura de um aluno', async () => {
      const payload = {
        userId: 'student-id-456',
        subscription_active: 1
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.subscription_active).toBe(1);

      // Verificar persistência no banco
      const db = getDB();
      const userRes = await db.prepare('SELECT subscription_active FROM users WHERE id = ?').bind('student-id-456').first<any>();
      expect(userRes.subscription_active).toBe(1);
    });

    it('Deve permitir que o administrador mude o papel de um aluno para administrador', async () => {
      const payload = {
        userId: 'student-id-456',
        role: 'admin'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('admin');

      // Verificar persistência no banco
      const db = getDB();
      const userRes = await db.prepare('SELECT role FROM users WHERE id = ?').bind('student-id-456').first<any>();
      expect(userRes.role).toBe('admin');
    });

    it('Deve impedir que o administrador altere as próprias permissões de acesso (auto-trancamento)', async () => {
      const payload = {
        userId: 'admin-id-123',
        role: 'student'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Não é permitido alterar o seu próprio papel administrativo');
    });

    it('Deve barrar com 403 se um aluno tentar fazer PATCH nas permissões de outro usuário', async () => {
      mockSessionToken = 'student-valid-token';
      const payload = {
        userId: 'admin-id-123',
        subscription_active: 0
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Acesso negado');
    });

    it('Deve retornar 404 se o userId de destino não existir no banco', async () => {
      const payload = {
        userId: 'non-existing-user-id',
        subscription_active: 1
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Usuário não encontrado');
    });
  });

  describe('POST - Cadastro de Usuários pelo Admin', () => {
    it('Deve permitir que o administrador crie um novo usuário', async () => {
      const payload = {
        username: 'novoaluno',
        password: '1234',
        fullName: 'Novo Aluno Teste',
        role: 'student',
        subscriptionActive: 1
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.username).toBe('novoaluno');
      expect(data.user.role).toBe('student');
      expect(data.user.subscription_active).toBe(1);

      // Verificar persistência no banco
      const db = getDB();
      const dbUser = await db.prepare('SELECT username, role, subscription_active FROM users WHERE id = ?').bind(data.user.id).first<any>();
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe('student');
      expect(dbUser.subscription_active).toBe(1);
    });

    it('Deve retornar 400 se tentarmos criar um usuário com username já existente', async () => {
      const payload = {
        username: 'student',
        password: '1234',
        fullName: 'Usuário Duplicado'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('já está cadastrado');
    });

    it('Deve retornar 403 se um aluno tentar cadastrar um novo usuário', async () => {
      mockSessionToken = 'student-valid-token';
      const payload = {
        email: 'invasor@forroflix.com',
        password: 'senha',
        fullName: 'Aluno Invasor'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Acesso negado');
    });
  });

  describe('PATCH - Redefinição de Senha (PIN) e Username', () => {
    it('Deve permitir que o administrador mude o username e o nome completo do aluno', async () => {
      const payload = {
        userId: 'student-id-456',
        username: 'alunonovo',
        fullName: 'Nome Atualizado Aluno'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.username).toBe('alunonovo');
      expect(data.user.full_name).toBe('Nome Atualizado Aluno');

      // Verificar persistência no banco
      const db = getDB();
      const userRes = await db.prepare('SELECT username, full_name FROM users WHERE id = ?').bind('student-id-456').first<any>();
      expect(userRes.username).toBe('alunonovo');
      expect(userRes.full_name).toBe('Nome Atualizado Aluno');
    });

    it('Deve permitir que o administrador redefina o PIN do aluno', async () => {
      const payload = {
        userId: 'student-id-456',
        password: '9999'
      };

      const request = new Request('http://localhost/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verificar persistência da hash no banco
      const db = getDB();
      const userRes = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind('student-id-456').first<any>();
      expect(userRes.password_hash).toBe('hashed_9999'); // mock hashPassword concatena hashed_
    });
  });

  describe('DELETE - Exclusão de Membros', () => {
    it('Deve permitir que o administrador exclua um aluno do sistema', async () => {
      const request = new Request('http://localhost/api/admin/users?userId=student-id-456', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verificar se foi excluído do banco
      const db = getDB();
      const userRes = await db.prepare('SELECT id FROM users WHERE id = ?').bind('student-id-456').first<any>();
      expect(userRes).toBeNull();
    });

    it('Deve impedir que o administrador exclua a própria conta', async () => {
      const request = new Request('http://localhost/api/admin/users?userId=admin-id-123', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Não é permitido excluir a própria conta');
    });

    it('Deve retornar 404 se tentar excluir um usuário inexistente', async () => {
      const request = new Request('http://localhost/api/admin/users?userId=inexistente-id', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Usuário não encontrado');
    });
  });
});
