const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env manualmente se dotenv não estiver disponível em scripts soltos,
// ou simplesmente requerendo dotenv caso exista
let accountId, apiToken, databaseId;
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });

  accountId = env.CLOUDFLARE_ACCOUNT_ID;
  apiToken = env.CLOUDFLARE_API_TOKEN;
  databaseId = env.CLOUDFLARE_DATABASE_ID || '21bc1280-e5b2-4c71-824a-714ef977f166';
} catch (err) {
  console.error('Erro ao carregar o arquivo .env:', err.message);
  process.exit(1);
}

if (!accountId || !apiToken) {
  console.error("Faltam as variáveis de ambiente CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN no .env.");
  process.exit(1);
}

async function executeQuery(sql) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params: [] }),
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Erro de comunicação com a REST API do Cloudflare D1.');
  }
  const resultObj = data.result?.[0];
  if (!resultObj || !resultObj.success) {
    throw new Error(resultObj?.error || 'Erro ao executar query no D1.');
  }
  return resultObj;
}

async function runMigration() {
  console.log('Iniciando migrações na D1 remota...');
  
  const queries = [
    // 1. Criar tabelas extras de favoritos
    {
      name: "Tabela favorite_folders",
      sql: `CREATE TABLE IF NOT EXISTS favorite_folders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        course_id TEXT,
        is_global INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    },
    {
      name: "Tabela favorite_folder_lessons",
      sql: `CREATE TABLE IF NOT EXISTS favorite_folder_lessons (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        folder_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, folder_id, lesson_id)
      );`
    },
    // 2. Criar índices
    {
      name: "Índice idx_lessons_module_position",
      sql: `CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);`
    },
    {
      name: "Índice idx_modules_course_position",
      sql: `CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules(course_id, position);`
    },
    // 3. Adicionar novas colunas em courses
    { name: "courses.cover_vertical", sql: `ALTER TABLE courses ADD COLUMN cover_vertical TEXT;` },
    { name: "courses.cover_horizontal", sql: `ALTER TABLE courses ADD COLUMN cover_horizontal TEXT;` },
    { name: "courses.is_featured", sql: `ALTER TABLE courses ADD COLUMN is_featured INTEGER DEFAULT 0;` },
    { name: "courses.cover_vertical_position", sql: `ALTER TABLE courses ADD COLUMN cover_vertical_position TEXT DEFAULT '50% 50%';` },
    { name: "courses.cover_horizontal_position", sql: `ALTER TABLE courses ADD COLUMN cover_horizontal_position TEXT DEFAULT '50% 50%';` },
    { name: "courses.hide_title", sql: `ALTER TABLE courses ADD COLUMN hide_title INTEGER DEFAULT 0;` },
    { name: "courses.cover_background", sql: `ALTER TABLE courses ADD COLUMN cover_background TEXT;` },
    { name: "courses.cover_background_position", sql: `ALTER TABLE courses ADD COLUMN cover_background_position TEXT DEFAULT '50% 50%';` },
    // 4. Adicionar novas colunas em modules
    { name: "modules.cover_vertical", sql: `ALTER TABLE modules ADD COLUMN cover_vertical TEXT;` },
    { name: "modules.cover_vertical_position", sql: `ALTER TABLE modules ADD COLUMN cover_vertical_position TEXT DEFAULT '50% 50%';` },
    // 5. Adicionar nova coluna username em users
    { name: "users.username", sql: `ALTER TABLE users ADD COLUMN username TEXT;` },
    { name: "users.idx_users_username", sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);` },
    // 6. Migrar dados nulos de username de forma retroativa
    { name: "users.username_migration_email", sql: `UPDATE users SET username = LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) WHERE username IS NULL AND email LIKE '%@%';` },
    { name: "users.username_migration_id", sql: `UPDATE users SET username = LOWER(id) WHERE username IS NULL;` }
  ];

  for (const q of queries) {
    try {
      await executeQuery(q.sql);
      console.log(`[SUCESSO] ${q.name} aplicada com sucesso.`);
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (
        msg.includes('duplicate column name') || 
        msg.includes('already exists') || 
        msg.includes('already an index') || 
        msg.includes('already exists')
      ) {
        console.log(`[INFO] ${q.name} já existente/aplicada. Pulando.`);
      } else {
        console.error(`[ERRO] Falha ao aplicar ${q.name}: ${e.message}`);
      }
    }
  }

  console.log('Migrações na D1 concluídas!');
}

runMigration().catch(err => {
  console.error('Erro fatal nas migrações:', err);
});
