const { createClient } = require('@libsql/client');

// Cloudflare D1 Config
const cfAccountId = '5ac5e64f40ff9ab06d3ed64c951841b0';
const cfDatabaseId = '21bc1280-e5b2-4c71-824a-714ef977f166';
const cfApiToken = 'TDmqIO4-lXh2te9V01ej9GtQliHwjSV8lhd6D_k2';

// Turso Config
const tursoUrl = 'libsql://forroflix-acssjr.aws-us-east-1.turso.io';
const tursoToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODIxNTIxMDEsImlkIjoiMDE5ZWYwOGEtZDcwMS03NjZlLWFhOWItNGM4MGY1OGY0Y2IxIiwicmlkIjoiMjhlYjA3NjUtNGMyZC00Y2JkLTgzYTktOTVkNTVhYjc0NmY5In0.ZbtGwhIDVC7BWp_pAAm4_SFtLHN9X9g8uKalBMC7lJ5HSxFtXEjEU9683zkouXi8x0265uKDc1PbRx4-0wODAA';

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
      const rows = await queryD1(`SELECT * FROM ${tableName}`);
      console.log(`Found ${rows.length} rows.`);

      if (rows.length > 0) {
        // Obter colunas
        const columns = Object.keys(rows[0]);
        const columnsStr = columns.map(c => `"${c}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${tableName} (${columnsStr}) VALUES (${placeholders})`;

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
