import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/admin/courses/batch-import/route';
import { getDB } from '@/lib/db';

// Mockar cookies e autenticação admin do Next.js
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'session') {
        return { value: 'admin-valid-token' };
      }
      return null;
    }
  })
}));

vi.mock('@/lib/auth', () => ({
  verifyJWT: async (token: string) => {
    if (token === 'admin-valid-token') {
      return { role: 'admin', email: 'admin@forroflix.com' };
    }
    return null;
  }
}));

describe('Integração: Rota API /api/admin/courses/batch-import', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Definir as variáveis de ambiente necessárias
    process.env.BUNNY_STREAM_LIBRARY_ID = '684595';
    process.env.BUNNY_STREAM_API_KEY = 'mocked-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Deve criar módulo e lições com sucesso e retornar credenciais TUS', async () => {
    // Mock do fetch para a Bunny API
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('video.bunnycdn.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ guid: 'mock-guid-12345' })
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const db = getDB();

    // Inserir um curso fictício para vincular o lote
    await db.prepare('INSERT INTO courses (id, title, slug) VALUES (?, ?, ?)')
      .bind('course-123', 'Curso de Roots', 'curso-roots')
      .run();

    const requestPayload = {
      courseId: 'course-123',
      structure: [
        {
          folderName: 'Módulo Introdução',
          files: [
            { title: 'Aula 01 - Postura', tempId: 'temp-1' },
            { title: 'Aula 02 - Balanço', tempId: 'temp-2' }
          ]
        }
      ]
    };

    const request = new Request('http://localhost/api/admin/courses/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    const response = await POST(request);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.uploads.length).toBe(2);
    expect(data.uploads[0].tempId).toBe('temp-1');
    expect(data.uploads[0].videoId).toBe('mock-guid-12345');

    // Verificar banco de dados
    const modulesRes = await db.prepare('SELECT * FROM modules WHERE course_id = ?').bind('course-123').all();
    expect(modulesRes.results.length).toBe(1);
    expect(modulesRes.results[0].title).toBe('Módulo Introdução');

    const lessonsRes = await db.prepare('SELECT * FROM lessons WHERE module_id = ?').bind(modulesRes.results[0].id).all();
    expect(lessonsRes.results.length).toBe(2);
    expect(lessonsRes.results[0].title).toBe('Aula 01 - Postura');
    expect(lessonsRes.results[0].position).toBe(1);
    expect(lessonsRes.results[1].position).toBe(2);
  });

  it('Deve reverter (rollback) o lote inteiro no banco se ocorrer uma falha de restrição no D1', async () => {
    const db = getDB();

    // Inserir um curso e módulo fictício para vincular a aula
    await db.prepare('INSERT INTO courses (id, title, slug) VALUES (?, ?, ?)')
      .bind('course-789', 'Curso de Teste Rollback', 'teste-rollback')
      .run();

    await db.prepare('INSERT INTO modules (id, course_id, title) VALUES (?, ?, ?)')
      .bind('mod-789', 'course-789', 'Módulo 1')
      .run();

    // Criar um lote contendo uma inserção válida e outra inválida (violação de NOT NULL em title)
    const stmt1 = db.prepare('INSERT INTO lessons (id, module_id, title) VALUES (?, ?, ?)')
      .bind('les-valid', 'mod-789', 'Aula Válida');
    
    const stmt2 = db.prepare('INSERT INTO lessons (id, module_id, title) VALUES (?, ?, ?)')
      .bind('les-invalid', 'mod-789', null); // Vai falhar pois title é NOT NULL

    // Executar o lote esperando falha do banco
    await expect(db.batch([stmt1, stmt2])).rejects.toThrow();

    // Verificar que a primeira inserção (les-valid) também sofreu rollback e não existe no banco!
    const lessonsRes = await db.prepare('SELECT * FROM lessons WHERE id = ?').bind('les-valid').all();
    expect(lessonsRes.results.length).toBe(0);
  });
});
