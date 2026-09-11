import { getDatabase, type DatabaseConnection } from '@netlify/database';

type QueryResult = { rows:Record<string, unknown>[]; rowCount:number | null };

function toPostgresSql(sql:string) {
  let parameter = 0;
  const quotedAliases = sql.replace(/\bAS\s+([a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, 'AS "$1"');
  return quotedAliases.replace(/\?/g, () => `$${++parameter}`);
}

class PreparedQuery {
  constructor(private readonly database:DatabaseConnection, private readonly sql:string, private readonly values:unknown[] = []) {}

  bind(...values:unknown[]) {
    return new PreparedQuery(this.database, this.sql, values);
  }

  async execute():Promise<QueryResult> {
    return this.database.pool.query(toPostgresSql(this.sql), this.values) as Promise<QueryResult>;
  }

  async first<T>() {
    const result = await this.execute();
    return (result.rows[0] as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const result = await this.execute();
    return { results:result.rows as T[] };
  }

  async run() {
    const result = await this.execute();
    return { rowsAffected:result.rowCount ?? 0 };
  }

  get text() { return toPostgresSql(this.sql); }
  get args() { return this.values; }
}

class NetlifyDatabase {
  constructor(private readonly database:DatabaseConnection) {}

  prepare(sql:string) {
    return new PreparedQuery(this.database, sql);
  }

  async batch(statements:PreparedQuery[]) {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const statement of statements) results.push(await client.query(statement.text, statement.args));
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

let database:NetlifyDatabase | null = null;
let connected = false;

export function rawDb() {
  database ??= new NetlifyDatabase(getDatabase());
  return database;
}

export async function ensureDatabase() {
  if (connected) return;
  await rawDb().prepare('SELECT 1').run();
  connected = true;
}
