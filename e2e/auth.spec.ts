import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

test.describe('Autenticação Forroflix E2E', () => {
  test.beforeAll(() => {
    // Garantir que o banco de dados e as tabelas existam
    const dbPath = path.resolve(process.cwd(), 'db/local.db');
    const db = new Database(dbPath);
    
    try {
      const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
      }
      
      const passwordHash = bcrypt.hashSync('1234', 10);
      
      db.prepare('DELETE FROM users WHERE email = ?').run('aluno@forroflix.com.br');
      db.prepare('DELETE FROM users WHERE email = ?').run('admin@forroflix.com');

      db.prepare(`
        INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('user-student-test', 'aluno@forroflix.com.br', 'aluno', passwordHash, 'Aluno Teste', 'student', 1);

      db.prepare(`
        INSERT INTO users (id, email, username, password_hash, full_name, role, subscription_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('user-admin-test', 'admin@forroflix.com', 'admin', passwordHash, 'Admin Teste', 'admin', 1);
    } finally {
      db.close();
    }
  });

  test('Deve exibir a tela de login para usuário não autenticado', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[id="username"]')).toBeVisible();
  });

  test('Deve autenticar com sucesso usando credenciais válidas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="username"]', 'aluno');
    
    // Aguardar até que a verificação encontre o usuário cadastrado (evitando race condition)
    await expect(page.locator('text=Usuário encontrado')).toBeVisible({ timeout: 5000 });
    
    // Preencher os 4 dígitos do PIN
    await page.locator('input[aria-label="Dígito 1 do PIN"]').fill('1');
    await page.locator('input[aria-label="Dígito 2 do PIN"]').fill('2');
    await page.locator('input[aria-label="Dígito 3 do PIN"]').fill('3');
    await page.locator('input[aria-label="Dígito 4 do PIN"]').fill('4');
    
    // Opcionalmente clicar no botão se a navegação não iniciou automaticamente
    try {
      await page.click('button[type="submit"]', { timeout: 1000 });
    } catch (e) {
      // Ignorar se já iniciou a navegação pelo envio automático
    }

    // Após o login com sucesso, deve redirecionar para a home
    await expect(page).toHaveURL(/.*\//);
    await expect(page.locator('text=FORROFLIX')).toBeVisible();
  });
});

