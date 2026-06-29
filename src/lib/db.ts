export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run<T = any>(): Promise<D1Result<T>>;
  all<T = any>(): Promise<D1Result<T>>;
}

export interface D1Result<T = any> {
  results: T[];
  success: boolean;
  error?: string;
  meta: any;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Implementação do D1 via REST API para a Vercel
class D1RESTPreparedStatement implements D1PreparedStatement {
  private params: any[] = [];
  constructor(private db: D1RESTDatabase, private query: string) {}

  bind(...values: any[]): D1PreparedStatement {
    this.params = values;
    return this;
  }

  async first<T = any>(colName?: string): Promise<T | null> {
    const res = await this.db.executeQuery<T>(this.query, this.params);
    if (res.results && res.results.length > 0) {
      return colName ? (res.results[0] as any)[colName] : res.results[0];
    }
    return null;
  }

  async run<T = any>(): Promise<D1Result<T>> {
    return this.db.executeQuery<T>(this.query, this.params);
  }

  async all<T = any>(): Promise<D1Result<T>> {
    return this.db.executeQuery<T>(this.query, this.params);
  }
}

class D1RESTDatabase implements D1Database {
  private accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  private apiToken = process.env.CLOUDFLARE_API_TOKEN;
  private databaseId = process.env.CLOUDFLARE_DATABASE_ID || '21bc1280-e5b2-4c71-824a-714ef977f166';

  prepare(query: string): D1PreparedStatement {
    return new D1RESTPreparedStatement(this, query);
  }

  async batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      results.push(await stmt.all<T>());
    }
    return results;
  }

  async exec(query: string): Promise<D1ExecResult> {
    const res = await this.executeQuery(query, []);
    return { count: res.results.length, duration: 0 };
  }

  async executeQuery<T = any>(sql: string, params: any[]): Promise<D1Result<T>> {
    if (!this.accountId || !this.apiToken) {
      throw new Error(
        "Faltam as variáveis de ambiente CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN para acessar o D1."
      );
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params }),
      cache: 'no-store'
    });

    const data = await response.json() as any;

    if (!data.success) {
      throw new Error(
        data.errors?.[0]?.message || 'Erro de comunicação com a REST API do Cloudflare D1.'
      );
    }

    const resultObj = data.result?.[0];
    if (!resultObj || !resultObj.success) {
      throw new Error(resultObj?.error || 'Erro ao executar query no D1.');
    }

    return {
      results: resultObj.results || [],
      success: resultObj.success,
      meta: resultObj.meta || {}
    };
  }
}

// Implementação do D1 via Turso (libsql)
class TursoPreparedStatement implements D1PreparedStatement {
  private params: any[] = [];
  constructor(private client: any, private query: string) {}

  bind(...values: any[]): D1PreparedStatement {
    // Normalizar booleanos como inteiros 0/1 para compatibilidade SQLite
    this.params = values.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
    return this;
  }

  async first<T = any>(colName?: string): Promise<T | null> {
    const res = await this.client.execute({ sql: this.query, args: this.params });
    if (res.rows && res.rows.length > 0) {
      const firstRow = { ...res.rows[0] } as any;
      return colName ? firstRow[colName] : firstRow;
    }
    return null;
  }

  async run<T = any>(): Promise<D1Result<T>> {
    const res = await this.client.execute({ sql: this.query, args: this.params });
    return {
      results: (res.rows || []).map((r: any) => ({ ...r })) as T[],
      success: true,
      meta: { changes: res.rowsAffected }
    };
  }

  async all<T = any>(): Promise<D1Result<T>> {
    const res = await this.client.execute({ sql: this.query, args: this.params });
    return {
      results: (res.rows || []).map((r: any) => ({ ...r })) as T[],
      success: true,
      meta: { changes: res.rowsAffected }
    };
  }

  get _internal() {
    return {
      query: this.query,
      getParams: () => this.params
    };
  }
}

class TursoDatabase implements D1Database {
  private client: any;
  constructor(url: string, token: string) {
    const { createClient } = require('@libsql/client');
    this.client = createClient({ url, authToken: token });
  }

  prepare(query: string): D1PreparedStatement {
    return new TursoPreparedStatement(this.client, query);
  }

  async batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const stmts = statements.map(s => {
      const internal = (s as any)._internal;
      return {
        sql: internal.query,
        args: internal.getParams()
      };
    });
    const hasWrite = stmts.some(s => {
      const sqlUpper = s.sql.trim().toUpperCase();
      return sqlUpper.startsWith('INSERT') || 
             sqlUpper.startsWith('UPDATE') || 
             sqlUpper.startsWith('DELETE') || 
             sqlUpper.startsWith('ALTER') || 
             sqlUpper.startsWith('CREATE') || 
             sqlUpper.startsWith('DROP');
    });
    const mode = hasWrite ? 'write' : 'read';
    const res = await this.client.batch(stmts, mode);
    return res.map((r: any) => ({
      results: (r.rows || []).map((row: any) => ({ ...row })) as T[],
      success: true,
      meta: { changes: r.rowsAffected }
    }));
  }

  async exec(query: string): Promise<D1ExecResult> {
    const res = await this.client.execute(query);
    return { count: res.rowsAffected, duration: 0 };
  }
}

let localDbInstance: any = null;
let tursoDbInstance: any = null;

// Obter a instância do banco D1 (Binding nativo, Turso, SQLite local ou D1 REST)
export function getDB(): D1Database {
  // 1. Se estiver rodando localmente com SQLite (E2E ou Dev Local Offline)
  if (process.env.USE_LOCAL_SQLITE === 'true') {
    if (!localDbInstance) {
      try {
        const Database = require('better-sqlite3');
        const path = require('path');
        const dbPath = path.resolve(process.cwd(), 'db/local.db');
        const sqliteDb = new Database(dbPath);
        sqliteDb.pragma('journal_mode = WAL');
        localDbInstance = {
          prepare(sql: string) {
            const stmt = sqliteDb.prepare(sql);
            let boundParams: any[] = [];
            const prepared = {
              bind(...params: any[]) {
                boundParams = params.map((v: any) => typeof v === 'boolean' ? (v ? 1 : 0) : v);
                return prepared;
              },
              async run() {
                const res = stmt.run(...boundParams);
                return { success: true, results: [], meta: { changes: res.changes, last_row_id: res.lastInsertRowid } };
              },
              async all() {
                const res = stmt.all(...boundParams);
                return { success: true, results: res || [], meta: {} };
              },
              async first(colName?: string) {
                const row = stmt.get(...boundParams) as any;
                if (!row) return null;
                return colName ? row[colName] : row;
              },
              _internal: {
                stmt,
                getParams: () => boundParams,
                query: sql
              }
            };
            return prepared;
          },
          async batch(statements: any[]) {
            const results: any[] = [];
            const executeInTransaction = sqliteDb.transaction((stmts: any[]) => {
              for (const s of stmts) {
                const internal = s._internal || s;
                const isReader = internal.stmt.reader;
                if (isReader) {
                  const rows = internal.stmt.all(...internal.getParams());
                  results.push({
                    success: true,
                    results: (rows || []).map((row: any) => ({ ...row })),
                    meta: {}
                  });
                } else {
                  const info = internal.stmt.run(...internal.getParams());
                  results.push({
                    success: true,
                    results: [],
                    meta: { changes: info.changes, last_row_id: info.lastInsertRowid }
                  });
                }
              }
              return results;
            });
            try {
              return executeInTransaction(statements);
            } catch (error) {
              throw new Error(`D1_BATCH_ROLLBACK_EMULATED: Transação de lote abortada. Erro: ${error}`);
            }
          },
          async exec(sql: string) {
            sqliteDb.exec(sql);
            return { count: 0, duration: 0 };
          }
        };
      } catch (err) {
        console.error('[D1] Erro ao carregar better-sqlite3 local:', err);
      }
    }
    if (localDbInstance) return localDbInstance;
  }

  // 2. Se estiver rodando com credenciais do Turso (SQLite Serverless Edge)
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    if (!tursoDbInstance) {
      tursoDbInstance = new TursoDatabase(tursoUrl, tursoToken);
    }
    return tursoDbInstance;
  }

  // 3. Se estiver rodando na Cloudflare (Pages/Workers) com o binding nativo de D1:
  const db = (process.env as any).DB as D1Database;
  if (db) {
    return db;
  }

  // 4. Se estiver rodando na Vercel com fallback de API REST do D1:
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return new D1RESTDatabase();
  }

  // 5. Fallback básico para desenvolvimento estático offline
  console.warn(
    "[D1] D1 não detectado via process.env.DB, REST API ou Turso. Usando mock local temporário."
  );
  
  return {
    prepare(_query: string) {
      return {
        bind() { return this; },
        async first() { return null; },
        async run() { return { results: [], success: true, meta: {} }; },
        async all() { return { results: [], success: true, meta: {} }; }
      } as any;
    },
    async batch() { return []; },
    async exec() { return { count: 0, duration: 0 }; }
  };
}
