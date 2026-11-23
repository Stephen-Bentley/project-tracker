declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string });
    query<T = any>(
      text: string,
      values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>;
    connect(): Promise<{
      query<T = any>(
        text: string,
        values?: unknown[]
      ): Promise<{ rows: T[]; rowCount: number | null }>;
      release(): void;
    }>;
    end(): Promise<void>;
  }
}
