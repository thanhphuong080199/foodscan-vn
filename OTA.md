# Over-the-air updates (EAS Update)

FoodScan VN ships JS/asset changes over the air with [EAS Update](https://docs.expo.dev/eas-update/introduction/).
Once a build that includes `expo-updates` is installed, JS-only changes (new
screens, styling, bug fixes — like the food-search feature) reach users without
a store submission.

## What is / isn't OTA-able

- **OTA (no rebuild):** JavaScript/TypeScript, React components, styles, bundled
  assets (images, JSON like `nutrition-seed.json`).
- **Needs a new native build (`eas build`):** adding/removing/upgrading native
  modules (anything under `expo install`), permissions, app icon/splash,
  `app.json` native config, SDK upgrades. Adding `expo-updates` itself was such
  a change, so the **first** build after this commit must go through `eas build`.
- OTA does **not** work in Expo Go. Use a dev build or the production APK.

## Configuration (already committed)

- `expo-updates` is in `package.json`.
- `app.json` → `expo.updates.url` points at this project's EAS endpoint, and
  `expo.runtimeVersion.policy = "fingerprint"`.
  - **fingerprint** means the runtime version is derived from the native
    project's fingerprint. An update only installs on a build whose native
    fingerprint matches — so a JS change ships OTA, but any native change
    produces a new fingerprint and old builds correctly ignore the update
    instead of crashing.
- `eas.json` already defines `preview` and `production` **channels**. A build's
  channel selects which stream of updates it listens to.

`android/` and `ios/` are gitignored; EAS Build runs a fresh prebuild and wires
up `expo-updates` automatically. (If you build locally with `expo run:android`,
run `npx expo prebuild --clean` first so the stale native folder picks up
`expo-updates`.)

## One-time: build with updates enabled

```bash
# Shareable internal-distribution APK (channel "preview") — this is the build
# the CI OTA workflow updates. Prefer the manual "build-apk.yml" workflow, or:
eas build --platform android --profile preview

# (Later, for a store build on the "production" channel)
# eas build --platform android --profile production
```

Install that build on a device. It now checks the update server on launch.

## CI (EAS Workflows)

Two workflows live in `.eas/workflows/`:

- **`ota-on-main.yml`** — on every push to `main`, publishes an OTA update to the
  **`preview`** channel (`type: update`). This is the automatic path: merge JS
  changes → users on the shared APK get them on next launch.
- **`build-apk.yml`** — **manual only** (`workflow_dispatch`). Builds an
  internal-distribution APK on the `preview` profile. Run it whenever a change
  is native (can't ship OTA), then hand out the new APK.

Run the manual build from the Expo dashboard, or:

```bash
eas workflow:run build-apk.yml
```

## Shipping an OTA update manually

CI handles this on merge to `main`, but to publish by hand:

```bash
# Preview channel = the shareable APKs built by build-apk.yml
eas update --channel preview --message "Add food search screen"
```

The next time an installed build launches (default `checkOnLaunch: ON_LOAD`),
it downloads the update and applies it on the following launch.

## Verifying / rolling back

```bash
eas update:list --branch production   # see what's published
eas update:republish                  # re-point a channel at an older update (rollback)
```

## Notes

- `runtimeVersion: fingerprint` → after **any native change** you must run a new
  `eas build`; `eas update` alone won't reach the old builds (by design).
- Publishing runs against the EAS project `0f177c7c-…` under owner
  `thanhphuong080199`; you need to be logged in (`eas login`) with access.
