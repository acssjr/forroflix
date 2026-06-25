const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Cloudflare D1 Config
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfDatabaseId = process.env.CLOUDFLARE_DATABASE_ID || '21bc1280-e5b2-4c71-824a-714ef977f166';
const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

// Turso Config
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!cfAccountId || !cfApiToken || !tursoUrl || !tursoToken) {
  console.error('Error: Missing required environment variables CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, TURSO_DATABASE_URL, or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const tursoClient = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

async function queryD1(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database/${cfDatabaseId}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfApiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params }),
    cache: 'no-store'
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'D1 REST communication error.');
  }

  const resultObj = data.result?.[0];
  if (!resultObj || !resultObj.success) {
    throw new Error(resultObj?.error || 'D1 query execution error.');
  }

  return resultObj.results || [];
}

async function runMigration() {
  console.log('🚀 Starting D1 to Turso migration...');

  try {
    // 1. Obter tabelas e índices
    console.log('Fetching database schema from D1...');
    // Excluir explicitamente tabelas de sistema da Cloudflare (_cf_KV, etc) e do sqlite (sqlite_%)
    const schemas = await queryD1("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
    
    const tables = schemas.filter(s => s.type === 'table');
    const indexes = schemas.filter(s => s.type === 'index');

    console.log(`Found ${tables.length} tables and ${indexes.length} indexes.`);

    // 2. Migrar cada tabela (estrutura e dados)
    for (const table of tables) {
      const tableName = table.name;
      console.log(`\n----------------------------------------`);
      console.log(`📦 Migrating table: ${tableName}`);

      // Criar a tabela no Turso
      console.log(`Creating table structure on Turso...`);
      await tursoClient.execute(table.sql);

      // Buscar todos os registros do D1
      console.log(`Fetching rows from D1 for ${tableName}...`);
      const rows = await queryD1(`SELECT * FROM "${tableName}"`);
      console.log(`Found ${rows.length} rows.`);

      if (rows.length > 0) {
        // Obter colunas
        const columns = Object.keys(rows[0]);
        const columnsStr = columns.map(c => `"${c}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${columnsStr}) VALUES (${placeholders})`;

        console.log(`Inserting ${rows.length} rows into Turso...`);
        
        // Fazer lote de inserções (inserir em lotes de 100 para evitar overflow)
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const chunk = rows.slice(i, i + batchSize);
          const stmts = chunk.map(row => {
            const args = columns.map(col => {
              const val = row[col];
              // Converter booleanos para 0 ou 1 se necessário
              return typeof val === 'boolean' ? (val ? 1 : 0) : val;
            });
            return {
              sql: insertSql,
              args
            };
          });
          await tursoClient.batch(stmts);
        }
        console.log(`Successfully migrated data for table: ${tableName}`);
      }
    }

    // 3. Criar os índices no Turso
    console.log(`\n----------------------------------------`);
    console.log('⚡ Creating indexes on Turso...');
    for (const idx of indexes) {
      console.log(`Creating index: ${idx.name}`);
      try {
        await tursoClient.execute(idx.sql);
      } catch (idxErr) {
        console.warn(`Warning: Could not create index ${idx.name}. It might already exist.`, idxErr.message);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    tursoClient.close();
  }
}

runMigration();
