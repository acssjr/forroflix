// Script para rodar localmente e aplicar a indexação no SQLite de desenvolvimento
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'local.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco local:', err.message);
    process.exit(1);
  }
  console.log('Conectado ao banco SQLite local.');
});

db.serialize(() => {
  // Criar índices adicionais
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
  `, (err) => {
    if (err) {
      console.error('Erro ao criar o índice idx_lessons_module_position:', err.message);
    } else {
      console.log('Índice idx_lessons_module_position criado ou já existente no SQLite local.');
    }
  });

  // Criar as tabelas extras de favoritos caso não existam no SQLite local
  db.run(`
    CREATE TABLE IF NOT EXISTS favorite_folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      course_id TEXT,
      is_global INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('Erro ao criar favorite_folders:', err.message);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS favorite_folder_lessons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, folder_id, lesson_id)
    );
  `, (err) => {
    if (err) console.error('Erro ao criar favorite_folder_lessons:', err.message);
  });
});

db.close((err) => {
  if (err) {
    console.error('Erro ao fechar o banco:', err.message);
  }
  console.log('Migrações locais concluídas.');
});
