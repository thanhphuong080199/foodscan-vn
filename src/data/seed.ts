import type * as SQLite from 'expo-sqlite';
import { ALL_FOOD_COLUMNS } from './db';
// Bundled at build time by scripts/gen-seed.mjs. Metro inlines JSON as an object.
import seedData from '../../assets/nutrition-seed.json';

type SeedRow = Record<string, string | number | null>;

// Bulk-insert all 526 foods in one transaction with a single prepared statement.
export async function seedFoods(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = seedData as unknown as SeedRow[];
  const cols = ALL_FOOD_COLUMNS;
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO foods (${cols.join(', ')}) VALUES (${placeholders})`;

  await db.withTransactionAsync(async () => {
    // Clear any partial prior seed so a version bump fully replaces data.
    await db.execAsync('DELETE FROM foods');
    const stmt = await db.prepareAsync(sql);
    try {
      for (const row of rows) {
        const values = cols.map((c) => {
          const v = row[c];
          return v === undefined ? null : v;
        });
        await stmt.executeAsync(values);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}
