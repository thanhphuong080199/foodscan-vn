# FoodScan VN — PROGRESS

Cross-session tracker. **Read this first each session**, update it before ending.
See `SPEC.md` for the design. Decisions locked: v1 minimal (Capture→Result only),
Vietnamese-first UI, Gemini model-fallback chain, chay = Gemini + group-guard.
Project is on **Expo SDK 54** (RN 0.81, React 19) — earlier SDK 57 mentions were wrong.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## M0 — Planning
- [x] Inspect `/output/` data (526 foods, 92 cols, 14 groups — clean)
- [x] Confirm product decisions with user
- [x] Write `SPEC.md`
- [x] Write `PROGRESS.md`

## M1 — Project setup  ✅ DONE (boot not yet verified on device)
- [x] `create-expo-app` (TypeScript) — Expo SDK 57, RN 0.86, React 19; merged into repo root
- [x] Install deps: expo-camera, expo-image-picker, expo-sqlite,
      expo-constants, @react-navigation/native + native-stack,
      react-native-screens, react-native-safe-area-context
- [x] `src/` folder structure per SPEC §7 (data/, domain/, gemini/ created)
- [x] `.gitignore` (added `.env`, `.env.*`, `!.env.example`)
- [x] `.env.example` + `.env` (placeholder key) + `src/config.ts` (model chain from env)
- [x] `app.json` updated: name/slug/android package + camera & image-picker plugins
- [ ] App boots on device via `npx expo run:android`  ← NOT yet run

## M2 — Nutrition DB (CSV → SQLite)  ✅ CODE DONE (on-device verify pending)
- [x] `scripts/gen-seed.mjs`: `vtn_fct_wide.csv` → `assets/nutrition-seed.json`
      (526 foods, 984 KB; verified food 9001 matches report)
- [x] `scripts/gen-columns.mjs` → `src/data/nutrientColumns.ts` (87 nutrient cols, generated)
- [x] `src/data/types.ts`: FoodRow type + ANIMAL_GROUPS constants
- [x] `src/data/db.ts`: open DB, dynamic `foods` + `app_meta` schema, seed_version guard
- [x] `src/data/seed.ts`: first-launch bulk import (prepared stmt in a transaction)
- [x] `src/data/foodRepo.ts`: getByCode, getAllFoods, matchFood (token-overlap)
- [x] `src/domain/normalize.ts`: diacritic-fold + tokenize + tokenOverlapScore
- [ ] Verify on device: query 9001 Trứng gà returns correct numbers  ← pending

## M3 — Gemini integration  ✅ CODE DONE (end-to-end device test pending)
- [x] `src/data/gemini/schema.ts`: types + GEMINI_RESPONSE_SCHEMA (JSON mode)
- [x] `src/data/gemini/prompt.ts`: prompt-language DECIDED — English
      instruction scaffolding, Vietnamese output + VN domain terms (per SPEC §9
      recommendation). A/B on real photos still worth doing once running.
- [x] `src/data/gemini/client.ts`: fetch + model-fallback chain (429 → next model)
- [x] `src/domain/vegetarian.ts`: group-guard override
- [x] `src/domain/identifyFood.ts`: Gemini → local match → merge (source local/ai)
- [x] **Catalog grounding (approach A)**: inline the 526-row VTN catalog
      (food_code␉name_vn␉name_en TSV, ~21 KB / ~5–8k tokens) into the prompt so
      Gemini returns an exact `matched_food_code`. identifyFood prefers
      `getByCode(code)` (matchVia='code'); falls back to fuzzy `matchFood`
      (matchVia='fuzzy') when the code is "" or not a real row.
      Files: schema.ts (+matched_food_code), prompt.ts (buildIdentifyPrompt),
      foodRepo.ts (getFoodCatalogTsv, cached), client.ts (prompt is now a param).
- [ ] Test with a sample image end-to-end  ← needs real key + device

## M4 — Capture flow  ✅ CODE DONE (device verify pending)
- [x] `CaptureScreen`: camera preview (CameraView), shutter, gallery pick
- [x] Permissions handling (useCameraPermissions + media-library request)
- [x] Navigate to Result with image uri + base64 + mimeType

## M5 — Result UI  ✅ CODE DONE (device verify pending)
- [x] `src/domain/nutrientDisplay.ts` whitelist + labels (+ omega-3 EPA+DHA)
- [x] `src/domain/nutritionSelect.ts` curated + notably-present rule (local & AI)
- [x] `NutritionTable`, `SourceBadge` (local vs "Ước tính bởi AI"), `TagList`,
      `DishList`, `VegBadge`, `Section` + `src/theme.ts`
- [x] `ResultScreen`: identify → render all sections
- [x] Loading + error states (no net, bad key, models exhausted, bad response)
- [x] AI-estimate badge shown correctly when no local match
- [x] `App.tsx` wired: SafeAreaProvider + native-stack (Capture → Result),
      DB warmed on mount; `tsc --noEmit` passes (strict)

## M6 — Polish
- [ ] Empty/edge cases, basic styling pass
- [ ] Disclaimer line (not medical advice)
- [ ] README run instructions

## Later (post-v1)
- [x] Scan history (SQLite + HistoryScreen) — 2026-07-03
      `scan_history` table (id, created_at, image_uri, food_code, name_vn,
      source, result_json) in db.ts migrate; `src/data/historyRepo.ts`
      (saveScan/getHistory/getScan/deleteScan/clearHistory). ResultScreen saves
      each successful fresh scan and, given `historyId`, re-loads the saved
      IdentifyResult from SQLite instead of re-calling Gemini. `HistoryScreen`
      (FlatList, thumbnail w/ missing-file fallback, SourceBadge, VN time-ago,
      long-press delete, header "Xóa" clear-all, empty state). Capture screen
      has a "Lịch sử" button; History registered in App.tsx. tsc clean.
- [x] Food photos on FoodDetail (Wikimedia Commons) — 2026-07-09
      Was Pixabay (2026-07-06) but stock-photo relevance was poor for
      ingredient-level names. Switched to Wikimedia Commons: encyclopedic,
      correctly-labeled images, and no API key. `src/data/wikimedia/client.ts`
      queries the Commons MediaWiki API (`generator=search` over the File
      namespace, `iiurlwidth=480`), filters results to raster photos
      (jpeg/png/webp/gif — drops SVG diagrams and PDF book scans), and orders
      by search `index`. The query cleaner strips preparation/state qualifiers
      ("Under milled, home-pounded rice" → "rice") instead of naively cutting
      at the first comma, which fixed the worst mismatches. `imageRepo.ts` +
      `image_cache` SQLite table unchanged (24h TTL, empty cached, stale served
      offline); the key gate is gone. `FoodImageStrip` credit now "Ảnh minh
      họa từ Wikimedia Commons". Plain RN `Image`, JS-only → still OTA-shippable.
- [ ] Settings screen (API key + model chain editing)
- [ ] Full-detail nutrient expander (all 87 fields)
- [ ] Serving-size scaling, reference-intake thresholds, OFF/USDA

---

## Open questions / concerns
- **Prompt language** — RESOLVED 2026-07-03: went with English instruction
  scaffolding + Vietnamese output + VN domain terms (SPEC §9 recommendation).
  Still worth A/B-ing a couple of real photos once the app runs to confirm
  cleaner JSON / no Vietnamese quality regression; easily reverted in prompt.ts.

## Next session — START HERE
The whole v1 code path (M1–M5) is written and type-checks. Nothing has run on a
device yet. Remaining is verification + first real run:
1. Read this file + SPEC.md.
2. Put a REAL key in `.env` (`EXPO_PUBLIC_GEMINI_API_KEY=...`). Confirm the
   model names in config.ts are valid for the account (free-tier quotas vary).
3. First real run: `npx expo run:android` (needs Android SDK/emulator or device
   + custom dev client — camera + sqlite can't use Expo Go).
4. On-device verification checklist:
   - App boots (M1).
   - First launch seeds DB; query food 9001 "Trứng gà" returns correct numbers (M2).
   - Capture a photo AND pick from gallery → both reach Result.
   - End-to-end identify works; local-match shows "Dữ liệu địa phương" badge,
     no-match shows "Ước tính bởi AI" badge (M3/M5).
   - Error states: airplane mode (network), bad key, blurry photo.
5. Then A/B the prompt language on a couple of real photos (see above).
6. Nothing committed to git yet — commit once a device run looks good.

## Session log
- 2026-07-02: Inspected data, confirmed 4 product decisions, wrote SPEC.md +
  PROGRESS.md, generated seed. Next: M1 project setup.
- 2026-07-03: Completed M1 (Expo scaffold merged, deps, folders, config,
  gitignore/env, app.json plugins). Completed M2 code (seed gen, columns gen,
  db/seed/repo/normalize) — on-device verify still pending. M3 mostly done
  (schema, prompt, client with model-fallback, vegetarian guard); remaining:
  identifyFood.ts, then UI (M4/M5). Nothing committed to git yet.
  User flagged prompt-language concern (see above). Stopped to continue tomorrow.
- 2026-07-03 (cont.): Resolved prompt-language (English scaffolding + VN output).
  Wrote identifyFood.ts (M3), nutrientDisplay + nutritionSelect (M5), all UI
  components (Section/SourceBadge/NutritionTable/TagList/DishList/VegBadge) +
  theme.ts, CaptureScreen (M4), ResultScreen with loading/error/AI-badge (M5),
  and wired App.tsx navigation + DB warm-up. `tsc --noEmit` passes clean.
  M1–M5 code complete; all on-device verification still pending. Not committed.
- 2026-07-03 (cont. 2): Added catalog grounding (approach A) — Gemini now
  receives the full VTN catalog and returns matched_food_code; exact getByCode
  lookup with fuzzy matchFood as fallback. tsc clean. Still not run on device.
- 2026-07-03 (cont. 3): User verified the app runs on device (v1 Capture→Result
  works end-to-end). Implemented Scan History (first post-v1 feature): db
  migration + historyRepo, save-on-success + historyId re-view path in
  ResultScreen, HistoryScreen, Capture "Lịch sử" entry point, App.tsx route.
  tsc clean; not yet device-verified. Note: history thumbnails reuse the
  original camera/gallery uri (may 404 if OS clears cache — UI falls back to a
  placeholder; copying to persistent storage deferred). Not committed to git.
- 2026-07-03 (cont. 4): Nav restructured — added `HomeScreen` as the landing
  hub (initialRoute Home). Flow is now Home → {Capture → Result | History}.
  Home shows the brand mark (assets/icon.png), tagline, a primary "Quét món
  mới" card → Capture, and a "Lịch sử quét" card → History with a saved-count
  subtitle (getHistoryCount). Capture's top-bar history button replaced with a
  back button. Rationale: first launch no longer drops straight into an
  unexplained camera-permission prompt. tsc clean; device-verify pending.
- 2026-07-06: Pixabay food photos on FoodDetail (see "Later" entry above for
  file-level detail). Fixed AGENTS.md to point at Expo v54 docs (was v57;
  project is SDK 54). Verified the Pixabay key live (test query returned
  hits) and `tsc --noEmit` clean. EAS env configured via `eas env:create`:
  preview now has GEMINI+PIXABAY keys, production (previously empty) got both
  too. Feature is JS-only → ships via the OTA-on-main workflow; existing
  preview APKs pick it up without a rebuild. Device verify pending.
- 2026-07-09: Replaced Pixabay food photos with Wikimedia Commons (see "Later"
  entry above for detail). Reason: Pixabay stock relevance was unreliable for
  the VTN ingredient names. New `src/data/wikimedia/client.ts` (Commons
  MediaWiki search, no API key, raster-only filter, qualifier-stripping query
  cleaner); removed `src/data/pixabay/` and all `PIXABAY` config/env/key gates.
  Validated live against sample foods (glutinous rice, foxtail millet, water
  spinach, maize) — results on-topic. `tsc --noEmit` clean. JS-only → OTA-
  shippable; EAS PIXABAY env vars now unused (can be deleted later). Device
  verify pending.
