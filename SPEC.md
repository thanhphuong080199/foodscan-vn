# FoodScan VN — SPEC

Personal-use Android app (Expo / React Native + TypeScript). Point the camera
at a food item → AI identifies it → app shows what it is, whether it's
vegetarian (chay, incl. ngũ vị tân awareness), curated nutrition (local
Vietnamese database first), benefits, risks, and suggested Vietnamese dishes.

Not a production/team app. Keep it pragmatic and flat. Single device, no
backend, no auth, no cloud sync.

---

## 1. Data source

Local nutrition DB comes from the Vietnamese National Institute of Nutrition
Food Composition Table (VTN_FCT_2007), already extracted to `/output/`:

- `vtn_fct_wide.csv` — **primary source for the app**. 526 foods × 92 columns
  (5 metadata + 87 nutrients). One row per food. UTF-8 with BOM.
- `vtn_fct_long.csv` — long format (food × nutrient), not needed by the app.
- `extraction_report.md` — data-quality notes. Values read from the PDF text
  layer (not OCR), spot-checked exact. Vietnamese names decoded via TCVN3 map.

### Metadata columns
`food_code` (stable id, e.g. `1001`), `food_name_vn`, `food_name_en`,
`food_group` (one of 14 Vietnamese group names), `discard_pct` (inedible %).

### Nutrient columns (87) — fill rates (of 526)
Near-complete: `energy_kcal` (526), `carbohydrate_g` (526), `protein_g` (525),
`fiber_g` (506), `calcium_mg` (479). Partial (this is why nutrition display is
conditional): `fat_g` (451), `cholesterol_mg` (427/77 non-zero),
`vitamin_c_mg` (426), `iron_mg` (427), `vitamin_a_ug` (373),
`saturated_fat_g` (233), `dha/epa` (231), `sodium_mg` (249),
`potassium_mg` (249), `sugar_g` (211), `vitamin_d_ug` (39). Blank = not
reported in the source (treat as unknown, not zero).

### 14 food groups (for the vegetarian group-guard)
Animal groups (→ non-veg guard): `Thịt và sản phẩm chế biến` (meat),
`Thủy sản và sản phẩm chế biến` (aquatic/fish), `Trứng và sản phẩm chế biến`
(egg), `Sữa và sản phẩm chế biến` (dairy — lacto ok, flagged separately).
Others: cereals, tubers, protein/fat seeds, vegetables, ripe fruit,
oils/fats/butter, canned, sweets, condiments, beverages.

---

## 2. Data lookup priority

1. **Local CSV/SQLite** (primary, authoritative for VN foods). Numbers shown
   verified — no "estimated" label.
2. **Gemini AI estimate** (fallback) when no local match. Nutrition values in
   this case **must be visually badged "ước tính bởi AI" (estimated by AI)**.

If a scan matches a local food, the CSV's nutrition numbers always win over
any nutrition numbers Gemini returns. Gemini still supplies the qualitative
fields (vegetarian, benefits, risks, dishes) in both cases.

---

## 3. Feature list

### v1 — must have (this build)
- [ ] Capture screen: take photo (expo-camera) or pick from gallery
  (expo-image-picker).
- [ ] Send image to Gemini → structured JSON identification.
- [ ] **Model-fallback chain**: try models in order, advance to next on
  rate-limit (HTTP 429) / quota error. Default order:
  `gemini-3.5-flash` → `gemini-2.5-flash` → `gemini-3.1-flash-lite`
  (configurable list; names easy to edit since free-tier quotas vary).
- [ ] Match identified food to a local SQLite entry (by name).
- [ ] Result screen (Vietnamese-first UI):
  - Food name (VN primary, EN secondary) + category.
  - Vegetarian status: Gemini `is_vegetarian` + `vegetarian_notes`
    (ngũ vị tân), **overridden to non-veg if matched food is in an animal
    group** (meat/fish/egg).
  - Curated nutrition (§5) from local data, or AI-estimate with badge.
  - Benefits (list), Risks (list, VN-relevant conditions), Suggested VN
    dishes (name + brief desc).
  - Source indicator: "Dữ liệu địa phương (Viện Dinh dưỡng)" vs
    "Ước tính bởi AI".
- [ ] Loading / error states (no network, bad key, all models exhausted,
    food not identified).
- [ ] SQLite seeded from bundled JSON on first launch (§4).
- [ ] Gemini API key from `.env` / `EXPO_PUBLIC_*` (gitignored). No commit.

### Later — nice to have
- [ ] Scan history (local SQLite list, tap to re-view).
- [ ] Settings screen (paste/store API key in-app, edit model chain).
- [ ] Full-detail expander ("chi tiết đầy đủ") — all 87 nutrient fields.
- [ ] "Notably present" threshold via %-reference-intake (v1 uses simple
    non-null/non-zero rule).
- [ ] OpenFoodFacts / USDA integration.
- [ ] Portion/serving-size scaling (data is per 100g edible portion).

---

## 4. Data model

### 4.1 SQLite (expo-sqlite)

`foods` — one row per CSV food; stores the **full** 87 nutrients so the
later full-detail view needs no re-seed.
```
food_code      TEXT PRIMARY KEY
food_name_vn   TEXT
food_name_en   TEXT
food_group     TEXT
discard_pct    REAL
-- 87 nutrient columns, REAL NULL (NULL = not reported)
energy_kcal REAL, protein_g REAL, fat_g REAL, ... (full wide-CSV schema)
```
Index: `food_name_vn` (normalized, diacritic-folded — see matching).

`app_meta` — seed/version bookkeeping.
```
key TEXT PRIMARY KEY, value TEXT   -- e.g. seed_version = "1"
```

`scan_history` (later): `id, created_at, image_uri, food_code (nullable),
result_json, source ('local'|'ai')`.

### 4.2 Seed strategy (chosen: bundled JSON)
Build-time Node script `scripts/gen-seed.mjs` converts `vtn_fct_wide.csv` →
`assets/nutrition-seed.json` (array of typed rows, numbers parsed, blanks →
null). Committed to repo. On first launch, if `app_meta.seed_version` !=
current, bulk-insert inside one transaction, then set the version. Simpler and
more reliable than shipping a prebuilt `.db` or parsing CSV on-device.

### 4.3 Gemini response schema (structured JSON the app parses)
```ts
interface GeminiFoodResult {
  food_name_vn: string;
  food_name_en: string;
  category: string;              // free text VN category / group guess
  is_vegetarian: boolean;        // pre group-guard
  vegetarian_notes: string;      // mentions ngũ vị tân if relevant
  benefits: string[];
  risks: string[];               // note VN-common conditions (gout, HA...)
  suggested_dishes: { name: string; brief_description: string }[];
  confidence_note: string;       // how sure it is / caveats
  // nutrition_estimate: only used when NO local match, then badged AI
  nutrition_estimate?: {
    energy_kcal?: number; protein_g?: number; fat_g?: number;
    carbohydrate_g?: number; fiber_g?: number; sodium_mg?: number;
    // curated subset only; per 100g
  };
}
```
Request uses Gemini `responseMimeType: application/json` + a response schema so
output is parseable, not free text. Prompt is Vietnamese-output, instructs
ngũ vị tân awareness and VN-relevant risks.

### 4.4 Food matching (Gemini → local)
1. Normalize both sides: lowercase, strip diacritics, collapse spaces.
2. Exact normalized match on `food_name_vn` → win.
3. Else substring / token-overlap best match above a threshold; also try
   `food_name_en`.
4. No confident match → AI-estimate path (badged).

---

## 5. Nutrition display — curated subset

Store all 87 fields; **display only the curated set**. Whitelist + VN label +
unit lives in `src/domain/nutrientDisplay.ts`.

**Always show (per 100g), when the value is present:**
| field | VN label | unit |
|---|---|---|
| energy_kcal | Năng lượng | kcal |
| protein_g | Chất đạm (Protein) | g |
| fat_g | Chất béo tổng | g |
| saturated_fat_g | Chất béo bão hòa | g |
| carbohydrate_g | Carbohydrate | g |
| sugar_g | Đường | g |
| fiber_g | Chất xơ | g |
| sodium_mg | Natri | mg |
| cholesterol_mg | Cholesterol | mg |

**Show only if notably present** (non-null AND non-zero in v1):
Vitamin A (`vitamin_a_ug`), Vitamin C (`vitamin_c_mg`),
Vitamin D (`vitamin_d_ug`), Canxi (`calcium_mg`), Sắt (`iron_mg`),
Kali (`potassium_mg`), Omega-3 (`dha_c22_6n3_g` + `epa_c20_5n3_g`, for fish).

**Full detail (later):** everything else (amino acids, individual fatty
acids/sugars, trace minerals, purine, etc.) behind "chi tiết đầy đủ".

Rule for v1 "notably present": value is not null and not 0. (Threshold-by-
reference-intake deferred.)

---

## 6. Screens

- **CaptureScreen** — camera preview + shutter, "Chọn từ thư viện" button.
  Entry screen.
- **ResultScreen** — receives image; runs identify → match → render. Shows
  source badge, curated nutrition, veg status, benefits/risks/dishes,
  loading & error states.
- (later) **HistoryScreen**, **SettingsScreen**.

Navigation: React Navigation native-stack (Capture → Result).

---

## 7. Architecture / folders

```
src/
  data/
    db.ts               # expo-sqlite open, schema, seed-on-first-launch
    seed.ts             # import assets/nutrition-seed.json into SQLite
    foodRepo.ts         # queries: getByCode, searchByName, matchFood
    gemini/
      client.ts         # fetch + model-fallback chain, 429 handling
      schema.ts         # request/response types, response JSON schema
      prompt.ts         # Vietnamese identification prompt
  domain/
    identifyFood.ts     # orchestrate: Gemini -> local match -> merge
    nutritionSelect.ts  # apply curated whitelist + notably-present rule
    nutrientDisplay.ts  # field -> {label_vn, unit, group}
    vegetarian.ts       # group-guard override logic
    normalize.ts        # diacritic-fold, tokenize for matching
  screens/
    CaptureScreen.tsx
    ResultScreen.tsx
  components/           # shared UI (NutritionTable, SourceBadge, TagList...)
  config.ts             # model chain, API key from env, thresholds
assets/nutrition-seed.json
scripts/gen-seed.mjs
```
State: local component state; add Zustand only if a real cross-screen need
appears. No Redux.

---

## 8. Config & secrets
- Gemini key via `EXPO_PUBLIC_GEMINI_API_KEY` in `.env` (gitignored). Read
  through `expo-constants` / `process.env`.
- `.gitignore`: `.env`, `.env.*`, key files, `node_modules`, Expo/Android
  build dirs.
- Model chain default in `config.ts`, overridable via env.
- Build/run: `npx expo run:android` (custom dev client — camera + sqlite need
  it, not Expo Go). EAS Build later for a shareable APK.

---

## 9. Assumptions & open questions

Assumptions made (flag if wrong):
- **All data is per 100g edible portion**; no serving-size scaling in v1.
- Blank CSV cell = "not reported" → shown as unknown / hidden, never as 0.
- Model names in the fallback chain are taken from your list as-is; if a name
  isn't a valid Gemini model at runtime the chain just advances — trivially
  editable in `config.ts`.
- Dairy group is technically lacto-vegetarian; the group-guard only forces
  **non-veg** for meat/fish/egg, and surfaces a note for dairy rather than
  hard-failing chay.
- Gemini receives the image only (no location/user profile). Risks are
  general + VN-common-condition flavored, not personalized medical advice
  (a disclaimer line is shown).
- Personal single-user app → the API key living in the client bundle is
  acceptable (documented as a personal-use tradeoff, not production-safe).

Open (answer anytime, non-blocking):
- Should very-low but non-zero micronutrient values still show, or apply a
  small floor? (v1: show any non-zero.)
- Preferred confidence threshold for accepting a fuzzy local-name match
  before falling back to AI estimate? (v1: conservative; err toward AI badge.)
- **Prompt language — English vs Vietnamese instructions?** (raised 2026-07-03)
  Current `prompt.ts` uses Vietnamese instructions. Recommendation to test:
  write the *instruction scaffolding* in English (schema rules, "only JSON",
  step-by-step constraints tend to be followed slightly more reliably in
  English by current Gemini models), but **explicitly require Vietnamese
  output** and keep all domain terms in Vietnamese — the ngũ vị tân list,
  the 14 food-group names, and "Vietnamese dish" style — so output quality
  and cultural accuracy don't regress. It's low-stakes and reversible: once
  the app runs, A/B a few real photos both ways and keep whichever gives
  cleaner JSON + better Vietnamese. Not blocking any other work.
