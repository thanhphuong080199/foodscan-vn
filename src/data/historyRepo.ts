// Persists each successful scan so it can be re-viewed later without another
// Gemini call. We store the whole IdentifyResult as JSON (it re-renders the
// full Result screen offline) plus a few denormalized columns for a cheap list
// query. The image_uri points at the original camera/gallery file — durable
// enough for a personal single-user app, but the thumbnail may go missing if
// the OS clears its cache, which the UI handles gracefully.

import { getDb } from './db';
import type { IdentifyResult, NutritionSource } from '../domain/identifyFood';

// Lightweight row for the history list (no result_json payload).
export interface ScanHistoryEntry {
  id: number;
  created_at: number; // epoch ms
  image_uri: string | null;
  food_code: string | null;
  name_vn: string;
  source: NutritionSource;
}

export interface ScanHistoryRow extends ScanHistoryEntry {
  result_json: string;
}

export async function saveScan(input: {
  imageUri: string | null;
  foodCode: string | null;
  nameVn: string;
  source: NutritionSource;
  result: IdentifyResult;
}): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO scan_history
       (created_at, image_uri, food_code, name_vn, source, result_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    Date.now(),
    input.imageUri,
    input.foodCode,
    input.nameVn,
    input.source,
    JSON.stringify(input.result),
  );
  return res.lastInsertRowId;
}

export async function getHistory(limit = 200): Promise<ScanHistoryEntry[]> {
  const db = await getDb();
  return db.getAllAsync<ScanHistoryEntry>(
    `SELECT id, created_at, image_uri, food_code, name_vn, source
       FROM scan_history
      ORDER BY created_at DESC
      LIMIT ?`,
    limit,
  );
}

export async function getHistoryCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM scan_history',
  );
  return row?.n ?? 0;
}

export async function getScan(id: number): Promise<ScanHistoryRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ScanHistoryRow>(
    'SELECT * FROM scan_history WHERE id = ?',
    id,
  );
  return row ?? null;
}

export async function deleteScan(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scan_history WHERE id = ?', id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM scan_history');
}
