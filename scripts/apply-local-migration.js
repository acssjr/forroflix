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

  // 4. Adicionar novas colunas em courses se não existirem (para retrocompatibilidade)
  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_vertical TEXT;`);
    console.log('Coluna cover_vertical adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_horizontal TEXT;`);
    console.log('Coluna cover_horizontal adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN is_featured INTEGER DEFAULT 0;`);
    console.log('Coluna is_featured adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_vertical_position TEXT DEFAULT '50% 50%';`);
    console.log('Coluna cover_vertical_position adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_horizontal_position TEXT DEFAULT '50% 50%';`);
    console.log('Coluna cover_horizontal_position adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN hide_title INTEGER DEFAULT 0;`);
    console.log('Coluna hide_title adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_background TEXT;`);
    console.log('Coluna cover_background adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE courses ADD COLUMN cover_background_position TEXT DEFAULT '50% 50%';`);
    console.log('Coluna cover_background_position adicionada ao SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE modules ADD COLUMN cover_vertical TEXT;`);
    console.log('Coluna cover_vertical adicionada à tabela modules no SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  try {
    db.exec(`ALTER TABLE modules ADD COLUMN cover_vertical_position TEXT DEFAULT '50% 50%';`);
    console.log('Coluna cover_vertical_position adicionada à tabela modules no SQLite local.');
  } catch (e) {
    // A coluna já existe
  }

  db.close();
  console.log('Migrações locais concluídas.');
} catch (err) {
  console.error('Erro durante as migrações:', err.message);
  process.exit(1);
}
