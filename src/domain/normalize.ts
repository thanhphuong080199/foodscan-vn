// Vietnamese-aware text normalization for fuzzy food-name matching.

// Fold Vietnamese diacritics to ASCII so "Trứng gà" ~ "trung ga".
// đ/Đ handled explicitly (not covered by NFD combining-mark stripping).
export function foldDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .replace(/đ/g, 'd') // đ
    .replace(/Đ/g, 'D'); // Đ
}

// Lowercase, fold diacritics, drop punctuation, collapse whitespace.
export function normalize(input: string): string {
  return foldDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(input: string): string[] {
  const norm = normalize(input);
  return norm ? norm.split(' ') : [];
}

// Token-overlap score in [0,1]: shared tokens / tokens in the shorter name.
// Rewards short query names fully contained in a longer DB name.
export function tokenOverlapScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}
