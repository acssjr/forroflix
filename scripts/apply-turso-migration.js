const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env.local ou .env
let url, token;
try {
  let envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '..', '.env');
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
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

  url = env.TURSO_DATABASE_URL;
  token = env.TURSO_AUTH_TOKEN;
} catch (err) {
  console.error('Erro ao carregar o arquivo .env:', err.message);
  process.exit(1);
}

if (!url || !token) {
  console.error('Erro: Faltam as variáveis TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN no .env.');
  process.exit(1);
}

const client = createClient({ url, authToken: token });

async function run() {
  console.log('Iniciando migração no Turso remoto...');
  try {
    // Adicionar avatar_url em users
    await client.execute(`ALTER TABLE users ADD COLUMN avatar_url TEXT;`);
    console.log('[SUCESSO] Coluna avatar_url adicionada à tabela users no Turso.');
  } catch (err) {
    if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
      console.log('[INFO] Coluna avatar_url já existe no Turso.');
    } else {
      console.error('[ERRO] Falha ao adicionar avatar_url:', err.message);
    }
  } finally {
    client.close();
  }
}

run();
