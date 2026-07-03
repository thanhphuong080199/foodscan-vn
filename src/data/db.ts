import * as SQLite from 'expo-sqlite';
import { META_COLUMNS, NUTRIENT_COLUMNS } from './nutrientColumns';
import { seedFoods } from './seed';

const DB_NAME = 'foodscan.db';
const SEED_VERSION = '1';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// All foods columns: metadata (TEXT, except discard_pct REAL) + 87 nutrient REALs.
function foodsColumnDefs(): string {
  const defs: string[] = [
    'food_code TEXT PRIMARY KEY NOT NULL',
    'food_name_vn TEXT',
    'food_name_en TEXT',
    'food_group TEXT',
    'discard_pct REAL',
  ];
  for (const col of NUTRIENT_COLUMNS) defs.push(`${col} REAL`);
  return defs.join(',\n  ');
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS foods (
      ${foodsColumnDefs()}
    );
    CREATE INDEX IF NOT EXISTS idx_foods_name_vn ON foods(food_name_vn);
  `);
}

async function getMeta(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

async function setMeta(db: SQLite.SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

// Open once, migrate, and seed on first launch (or when SEED_VERSION bumps).
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      const current = await getMeta(db, 'seed_version');
      if (current !== SEED_VERSION) {
        await seedFoods(db);
        await setMeta(db, 'seed_version', SEED_VERSION);
      }
      return db;
    })();
  }
  return dbPromise;
}

// Exposed for seed.ts so it inserts exactly the columns the table declares.
export const ALL_FOOD_COLUMNS: readonly string[] = [
  ...META_COLUMNS,
  ...NUTRIENT_COLUMNS,
];
