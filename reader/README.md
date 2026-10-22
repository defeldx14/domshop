# Lettore

Buildless, mobile-first EPUB reader at `/domshop/reader/`. Keep the directory inside Domshop and deploy the repository root with the existing GitHub Pages configuration. All runtime dependencies are vendored; npm is only needed for development and tests. The hub contains a matching Lettore card.

## Reading

Open an unprotected EPUB with **Open EPUB**. Books are stored in IndexedDB on this device; the original EPUB is never uploaded. EPUB 2 NCX and EPUB 3 navigation, spine order, embedded raster images, Unicode text, chapter navigation, search, scroll reading, bookmarks, highlights, typography controls and offline reloads are supported. Direct links use `#book=SHA256&chapter=N`, so refreshes work on GitHub Pages without a server rewrite. A linked book must already have been imported on that device.

Tap a word or select a phrase and choose **Look up selection**. Italian pronunciation uses the device's Italian speech voice. Translation uses the same public Google endpoint as Parola, with a persistent local cache, timeout, retry and editable fallback. It requires network access for uncached text and can be rate-limited. Only the selected text or its sentence is sent for translation. Wiktionary provides POS and lemma/infinitive information when available; gender is shown only if returned in its definitions. The dictionary link remains available when the endpoint has no result. No grammar information is guessed.

**Reveal sentence translation** keeps English hidden until requested. **Save to Parola** commits the word and Italian sentence immediately, then fills missing English translations in the background. A slow translation service cannot block the local save. Confirmation identifies the local or Google collection, and save errors appear inside the lookup dialog. The entry is editable in Parola. **Copy import row** and **Export saved words** use:

```text
Italian | English | Italian sentence | English sentence
```

Literal pipes inside fields are replaced with `¦` for compatibility with Parola's existing pipe-delimited importer.

## Parola and cross-device storage

The files in `shared/` originate from `defeldx14/italian-practice`. `core.js`, `store.js`, `drive.js`, `drive-sync.js`, `google-account.js`, `sync-core.js` and `bulk.js` retain Parola's actual event format and storage keys. Guest storage is `italian-hover-vocabulary`; Google profiles are `italian-hover-vocabulary.google.<sub>`. Exact NFC-normalized word + sentence duplicates and previously deleted records follow Parola's existing capture behavior. The same word in a different sentence is a separate entry.

GitHub Pages serves Domshop and Parola under the same `https://defeldx14.github.io` origin. Saves therefore enter Parola's actual IndexedDB collection, without an export/import step. The companion Parola change adds a BroadcastChannel notification and immediate library refresh, making saves visible while both apps are open. The reader works without that change too; older Parola tabs update on focus.

In **Aa → Google account**, connect the same Google account used by Parola. The public OAuth client ID and `italian-hover-v1` Drive journal are reused. Accounts have separate local profiles; guest words are not silently imported into a Google profile. Google's existing reconnect behavior applies. Reading positions and marks have their own mergeable `domshop-reader-v1` Drive journal and account-specific local state. EPUB files and reading preferences remain device-local. Import the exact same EPUB on the other device to match its content hash and recover its position and marks. Reading state also has JSON backup/merge controls.

On a different origin (including localhost), the browser has separate storage. Use the production Pages origin for immediate sharing with the existing Parola installation. iOS standalone apps and Safari can have separate storage containers; connecting the same Google account and syncing provides the bridge between those containers.

The Chrome extension also has its own `chrome-extension://` storage. Website saves appear in the extension after connecting both to the same Google account and syncing; a website cannot write directly into an extension's IndexedDB. In the extension's Sync settings, connect Google Drive and use Sync. The reader now follows Parola account changes made in another website tab. **Aa → Saved from this reader** lists the active collection's entries. If reader entries were previously saved as a guest and are missing from the selected account, **Earlier reader saves** previews those words and offers an explicit merge into that account. Original local entries are preserved, and duplicates/tombstones are respected.

The Google client already authorizes the production Pages origin. Local OAuth requires adding the local origin to Google's authorized JavaScript origins; no API secret belongs in this repository.

## Development and validation

From `reader/`:

```text
npm ci
npm run preview
```

Preview serves `http://127.0.0.1:4173/domshop/reader/` and maps the sibling `parola/` checkout to `/italian-practice/` for integration tests. The local preview server binds only to loopback. Tests use installed Microsoft Edge plus Playwright WebKit:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.browsers"
npx playwright install webkit
npm test
```

Set `TEST_EPUB` to the private Volume 2 file, or the test looks for the matching filename in Downloads. If absent, only that test is skipped. The book, screenshots, browser downloads and dependencies are excluded from version control. The real book has 114 spine documents and 15 NCX entries. Tests also use a synthetic EPUB 3 for Unicode, punctuation, phrase selection, hostile markup, duplicates, local persistence, search, appearance settings, Parola live updates, mocked account isolation and two-device journal transfers. A separate test verifies offline shell and book navigation with service workers enabled. Functional tests block service workers so request interception is deterministic in WebKit.

Live Google authorization, actual iPhone hardware and spoken voice quality require a manual device check. Mocked sync tests do not establish that an account has completed OAuth consent.

## Import boundaries

40 MB maximum file and expanded archive size, 4,000 ZIP entries, 12 MB per expanded file. Scripts, forms, embedded browsing contexts, book CSS and external images are not rendered; content is rebuilt with text nodes and safe block types. Raster images are stored as bytes for IndexedDB compatibility and rendered through temporary Blob URLs. DRM content is rejected; embedded font obfuscation does not prevent text reading. Complex textbook tables, fixed-layout books and publisher typography are flattened into readable text blocks rather than reproduced exactly.

`vendor/fflate.js` is fflate 0.8.3 (MIT); license included. Keep the matching vendored library when updating the npm dependency. Increment the `lettore-` cache version in `sw.js` when releasing shell changes. The hub service worker excludes reader assets, so the nested app owns its cache.
