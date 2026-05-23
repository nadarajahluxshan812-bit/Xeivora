const db = require("./server/db");

export type DatabaseClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
  release: () => void;
};

export const getPool = db.getPool as () => unknown | null;
export const isDatabaseConfigured = db.isDatabaseConfigured as () => boolean;
export const query = db.query as (text: string, params?: unknown[]) => Promise<unknown>;
export const resetPool = db.resetPool as () => Promise<void>;
export const withClient = db.withClient as <T>(callback: (client: DatabaseClient) => Promise<T>) => Promise<T>;
export const withTransaction = db.withTransaction as <T>(callback: (client: DatabaseClient) => Promise<T>) => Promise<T>;
