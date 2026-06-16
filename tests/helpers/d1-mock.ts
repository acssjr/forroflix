import Database from 'better-sqlite3';

export class D1DatabaseEmulator {
  private internalDb: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.internalDb = new Database(dbPath);
  }

  prepare(sql: string) {
    const stmt = this.internalDb.prepare(sql);
    let boundParams: any[] = [];

    const preparedStatement = {
      bind(...params: any[]) {
        boundParams = params.map(v => typeof v === 'boolean' ? (v ? 1 : 0) : v);
        return preparedStatement;
      },
      async run() {
        const result = stmt.run(...boundParams);
        return {
          results: [],
          success: true,
          meta: { changes: result.changes, last_row_id: result.lastInsertRowid }
        };
      },
      async all() {
        const results = stmt.all(...boundParams);
        return { results: results || [], success: true, meta: {} };
      },
      async first(colName?: string) {
        const row = stmt.get(...boundParams) as any;
        if (!row) return null;
        return colName ? row[colName] : row;
      },
      // Para execução em lote (D1 batch), precisamos acessar o statement e parâmetros internos
      _internal: {
        stmt,
        getParams: () => boundParams
      }
    };

    return preparedStatement;
  }

  async batch(statements: any[]): Promise<any[]> {
    const results: any[] = [];
    const executeInTransaction = this.internalDb.transaction((stmts: any[]) => {
      for (const s of stmts) {
        const internal = s._internal || s;
        const info = internal.stmt.run(...internal.getParams());
        results.push({
          success: true,
          meta: { changes: info.changes, last_row_id: info.lastInsertRowid }
        });
      }
      return results;
    });

    try {
      return executeInTransaction(statements);
    } catch (error) {
      throw new Error(`D1_BATCH_ROLLBACK_EMULATED: Transação de lote abortada. Erro: ${error}`);
    }
  }

  async exec(sql: string): Promise<any> {
    this.internalDb.exec(sql);
    return { count: 0, duration: 0 };
  }
}
