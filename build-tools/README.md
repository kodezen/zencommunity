# Cross-platform release build

One command produces a shippable GemCRM zip on **Linux, macOS, and Windows** —
replaces the old `build-zip.sh` (bash-only) with a Node orchestrator.

```bash
npm i -D archiver ignore   # one-time (already committed)
npm run dist               # full release: JS → composer (no-dev + Strauss) → POT → zip

npm run dist:zip           # only repackage the current tree (~1s)
npm run dist:dev           # keep dev dependencies
node build-tools/build.mjs --only=js|composer|pot|zip
node build-tools/build.mjs --strict-vendor   # abort if vendor looks like a dev build
```

The release zip is written to the **parent plugins folder**
(`../gemcrm.<version>.zip`) and overwrites any existing same-name file.

## Pipeline

| # | Step | How |
|---|------|-----|
| 1 | Production JS | `wp-scripts build` (install auto-skips when `node_modules` exists) |
| 2 | Composer + Strauss | delegates to `composer run build` (`--no-dev` + Strauss via `post-install-cmd`) |
| 3 | POT | `wp i18n make-pot` → `i18n/languages/gemcrm.pot` |
| 4 | Zip | built in Node from `.distignore` — never drops `vendor/autoload.php`, needs no system `zip` |

## Notes for GemCRM

- **Version comes from the plugin header** (`gemcrm.php` `Version:`), set via
  `"versionFrom": "header"` in `build.config.json`. That's the canonical source
  here — `webpack.config.js` and `assets.php` enqueue the header version, so the
  zip name and asset filenames stay in lockstep with it.
- The `composer.json` `prefix-namespaces` script is already cross-platform
  (all `@php`, downloads Strauss to the local `bin/`), so nothing to port.
- The fast `dist:zip` warns (or aborts under `--strict-vendor`) if `vendor/`
  still has dev deps — run the full `npm run dist` for a production zip.
