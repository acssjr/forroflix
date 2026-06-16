import { beforeAll, beforeEach, vi } from 'vitest';
import { D1DatabaseEmulator } from './helpers/d1-mock';
import fs from 'fs';
import path from 'path';

let testDb: D1DatabaseEmulator;

// Mockar getDB do lib/db para retornar nossa instância de teste emulado
vi.mock('@/lib/db', () => ({
  getDB: () => testDb
}));

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'forroflix-secret-key-2026-auth-token-129847';
});

beforeEach(async () => {
  // Inicializa um banco síncrono limpo em memória para cada teste
  testDb = new D1DatabaseEmulator(':memory:');
  
  // 1. Carrega e aplica o esquema básico da D1
  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await testDb.exec(schemaSql);
  }
  
  // 2. Aplica as tabelas adicionais e índices locais
  await testDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
    CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules(course_id, position);
    
    CREATE TABLE IF NOT EXISTS favorite_folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      course_id TEXT,
      is_global INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS favorite_folder_lessons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, folder_id, lesson_id)
    );
  `);
});

export { testDb };
