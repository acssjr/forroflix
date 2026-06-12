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

// Obter a instância do banco D1
export function getDB(): D1Database {
  // Em produção ou local dev rodando com wrangler pages dev / next-on-pages:
  // process.env.DB é injetado pelo Cloudflare
  const db = (process.env as any).DB as D1Database;

  if (!db) {
    console.warn(
      "[D1] Banco de dados D1 não detectado na variável process.env.DB. " +
      "Certifique-se de executar com 'npx wrangler pages dev' ou configurar o binding no wrangler.json."
    );
    
    // Retornar um mock para evitar travamento imediato em build estático
    return {
      prepare(query: string) {
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

  return db;
}
