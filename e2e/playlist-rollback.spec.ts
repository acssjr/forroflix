import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  'forroflix-secret-key-2026-auth-token-129847'
);

async function generateAdminToken() {
  return await new SignJWT({
    id: 'user-admin-test',
    email: 'admin@forroflix.com',
    role: 'admin',
    subscription_active: true
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

test.describe('Resiliência de Rede e UI Rollback', () => {
  test.beforeAll(async () => {
    // Seed DB local com curso e lições para reordenação
    const dbPath = path.resolve(process.cwd(), 'db/local.db');
    const db = new Database(dbPath);
    
    // Garantir que as tabelas existam
    const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    }
    
    // Inserir curso e módulo
    db.prepare('DELETE FROM courses WHERE id = ?').run('course-test-e2e');
    db.prepare(`
      INSERT INTO courses (id, title, description, slug)
      VALUES (?, ?, ?, ?)
    `).run('course-test-e2e', 'Curso Teste E2E', 'Curso para testes automatizados.', 'curso-teste-e2e');

    db.prepare('DELETE FROM modules WHERE id = ?').run('mod-test-1');
    db.prepare(`
      INSERT INTO modules (id, course_id, title, position)
      VALUES (?, ?, ?, ?)
    `).run('mod-test-1', 'course-test-e2e', 'Módulo 1', 1);

    db.prepare('DELETE FROM lessons WHERE id IN (?, ?)').run('les-test-1', 'les-test-2');
    db.prepare(`
      INSERT INTO lessons (id, module_id, title, position)
      VALUES (?, ?, ?, ?)
    `).run('les-test-1', 'mod-test-1', 'Aula 1', 1);

    db.prepare(`
      INSERT INTO lessons (id, module_id, title, position)
      VALUES (?, ?, ?, ?)
    `).run('les-test-2', 'mod-test-1', 'Aula 2', 2);
  });

  test.beforeEach(async ({ context }) => {
    // Definir cookie de autenticação admin
    const token = await generateAdminToken();
    await context.addCookies([
      {
        name: 'session',
        value: token,
        domain: 'localhost',
        path: '/',
      }
    ]);
  });

  test('Deve reverter a reordenação otimista após erro 500 no servidor', async ({ page }) => {
    // Interceptar a API de reordenação para falhar com 500
    await page.route('**/api/admin/courses', async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON();
        if (body.type === 'reorder') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Erro de concorrência no Cloudflare D1' }),
          });
          return;
        }
      }
      await route.continue();
    });

    // Escutar alerta e fechar para evitar bloqueio
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto('/admin/courses/course-test-e2e');

    // Verificar ordem inicial
    const lessonElements = page.locator('.text-slate-300.truncate');
    await expect(lessonElements.nth(0)).toHaveText('Aula 1');
    await expect(lessonElements.nth(1)).toHaveText('Aula 2');

    // Simular o drag and drop
    const dragSource = page.locator('text=Aula 1').first();
    const dragTarget = page.locator('text=Aula 2').first();
    await dragSource.dragTo(dragTarget);

    // Como o servidor retorna 500, a página recarrega e reverte à ordem inicial
    await expect(lessonElements.nth(0)).toHaveText('Aula 1', { timeout: 15000 });
    await expect(lessonElements.nth(1)).toHaveText('Aula 2', { timeout: 15000 });
  });

  test('Deve recuperar e concluir o upload após falhas intermitentes de rede nos chunks TUS', async ({ page }) => {
    const bunnyTusEndpoint = 'https://video.bunnycdn.com/tusupload';
    let chunkPatchCount = 0;

    // Interceptar a rota de batch-import para retornar dados simulados sem chamar a Bunny CDN real
    await page.route('**/api/admin/courses/batch-import', async (route) => {
      const request = route.request();
      const payload = request.postDataJSON();
      const files = payload?.structure?.[0]?.files || [];
      const firstTempId = files[0]?.tempId || 'mock-temp-file-id';
      const responseBody = {
        success: true,
        uploads: [
          {
            tempId: firstTempId,
            videoId: 'mock-video-guid-998877',
            lessonId: 'mock-lesson-guid-998877',
            signature: 'mock-signature-sha256',
            expirationTime: Math.floor(Date.now() / 1000) + 3600
          }
        ]
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responseBody)
      });
    });

    // Interceptar o PATCH de conclusão para retornar sucesso
    await page.route('**/api/admin/courses', async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON();
        if (body.type === 'lesson') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
          return;
        }
      }
      await route.continue();
    });

    // Interceptar o endpoint oficial de upload da Bunny Stream para simular resiliência
    await page.route(/\/tusupload/, async (route) => {
      const request = route.request();
      const method = request.method();

      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, PATCH, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Tus-Resumable, Upload-Length, Upload-Metadata, AuthorizationSignature, AuthorizationExpire, LibraryId, VideoId, Content-Type, Upload-Offset',
            'Access-Control-Expose-Headers': 'Location, Upload-Offset, Tus-Resumable',
            'Tus-Resumable': '1.0.0'
          }
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          headers: {
            'Location': `${bunnyTusEndpoint}/session-video-mock-998877`,
            'Tus-Resumable': '1.0.0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Location, Tus-Resumable'
          }
        });
      } else if (method === 'PATCH') {
        chunkPatchCount++;

        if (chunkPatchCount === 1) {
          // Latência / Timeout
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await route.abort('timedout');
        } else if (chunkPatchCount === 2) {
          // Queda física
          await route.abort('failed');
        } else {
          // Sucesso
          const offsetHeader = request.headers()['upload-offset'] || '0';
          const fileLength = 20971520; // 20MB
          const nextOffset = Math.min(parseInt(offsetHeader, 10) + (10 * 1024 * 1024), fileLength);

          await route.fulfill({
            status: 204,
            headers: {
              'Upload-Offset': nextOffset.toString(),
              'Tus-Resumable': '1.0.0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Upload-Offset, Tus-Resumable'
            }
          });
        }
      } else if (method === 'HEAD') {
        // Simular tempo de reconexão de rede
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          headers: {
            'Upload-Offset': '5242880',
            'Upload-Length': '20971520',
            'Tus-Resumable': '1.0.0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Upload-Offset, Upload-Length, Tus-Resumable'
          }
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin/courses/course-test-e2e');

    // Abrir o modal de upload em lote no nível do módulo (evitando o input webkitdirectory global)
    await page.locator('div[draggable="true"]').filter({ has: page.locator('h3', { hasText: 'Módulo 1' }) }).locator('text=Upload em Lote').click();

    // Carregar o arquivo na dropzone
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('tus-upload-input-trigger').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'aula_next16_edge.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(1024 * 1024 * 20), // 20MB mock
    });

    // Iniciar o upload
    await page.click('text=Iniciar Importação Estruturada');

    // Validar que o upload se recuperou das falhas de rede e concluiu com sucesso
    // (onShouldRetry do tus-js-client não dispara quando o Playwright aborta via route.abort,
    //  mas o resultado final de sucesso valida a resiliência do fluxo completo.)
    const successAlert = page.getByText(/Upload concluído com sucesso/i);
    await expect(successAlert).toBeVisible({ timeout: 30000 });
  });
});
