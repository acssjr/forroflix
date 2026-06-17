// Script para rodar localmente e aplicar a indexação no SQLite de desenvolvimento
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'db', 'local.db');
const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');

try {
  // Garantir que a pasta db existe
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  console.log('Conectado ao banco SQLite local.');

  // 1. Inicializar o esquema principal a partir do schema.sql
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('Esquema principal db/schema.sql aplicado com sucesso.');
  } else {
    console.warn('Aviso: db/schema.sql não encontrado. Pulando inicialização principal.');
  }

  // 2. Criar índices adicionais
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
    CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules(course_id, position);
  `);
  console.log('Índices idx_lessons_module_position e idx_modules_course_position criados ou já existentes no SQLite local.');

  // 3. Criar as tabelas extras de favoritos caso não existam no SQLite local
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorite_folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      course_id TEXT,
      is_global INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Tabela favorite_folders criada ou já existente.');

  db.exec(`
    CREATE TABLE IF NOT EXISTS favorite_folder_lessons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, folder_id, lesson_id)
    );
  `);
  console.log('Tabela favorite_folder_lessons criada ou já existente.');

  db.close();
  console.log('Migrações locais concluídas.');
} catch (err) {
  console.error('Erro durante as migrações:', err.message);
  process.exit(1);
}
