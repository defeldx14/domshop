# Storie — Domshop Italian immersion
Buildless HTML/CSS/JavaScript, added to the existing Domshop GitHub Pages repository.

## Integration
The existing Domshop root card points to `./storie/`. Deploy main / root through the existing GitHub Pages setup. App URL: https://defeldx14.github.io/domshop/storie/
No npm install, compilation, backend, database, or secret is needed for included lessons. All paths are relative. Direct links use hashes, e.g. `storie/#lesson/preventivo/scene/0`, so page refresh needs no server rewrite. Return link: `../`. To move it elsewhere, copy the storie directory and adjust parent icon paths and the return link. Icons currently reuse Domshop's existing PNGs.

## Included
Seven authored lessons, each four original SVG illustrated scenes, five quiz questions, free production practice, and a follow-up task.
- Bologna: changing plans after a difficult day
- Napoli: clarifying a repair estimate, formal Lei, mano d'opera
- Torino: differing opinions about a fictional film, exposure to B2 forms
- Firenze/Bologna: a delayed connection and unclear announcements
- Napoli: a condominium access and storage dispute
- Bari: a missing delivery mystery
- Adriatic: a verified news adaptation, dated October 20, 2026

All fiction is marked. The Adriatic lesson uses explicitly labeled educational diagrams, not fake documentary images. No publisher photograph is copied. Source: ANSA, Elisa Buson, published October 20, 2026 at 08:38:
https://www.ansa.it/canale_scienza/notizie/terra_poli/2026/10/20/dai-suoni-sottomarini-il-battito-che-rivela-la-salute-del-mare_43416cd7-0403-4be5-a863-e1b13027cbb5.html
This is a dated collection, not a live news feed. Broader history/geography has only limited introductory coverage in the initial news lesson; add dedicated lessons to data.js to expand it.

## What works locally
- Lesson category and reading-level filters; separate A2/B1/B2 production setting
- Four-scene reader, previous/next fixed dock, direct links, resume, individual English sentence reveals
- Five context annotations per scene; whole phrases including mano d'opera
- Selected-phrase inspection; unannotated phrases require a user-entered meaning (no general dictionary service)
- Saved context, review scheduling, local quiz/mistake tracking, recommendations based on recorded quiz gaps, lesson completion and recently practiced categories
- Multiple choice, true/false, fill-in, word ordering, inference and intent exercises
- Italian speech synthesis, replay/stop/speed, optional hidden transcript, text-only fallback
- Free-response drafts, limited local grammar checks, model comparison, a saved short follow-up
- Keyboard Space/Enter advances when focus is outside interactive controls
- App-scoped service worker for bundled lessons after first successful online load
- Storie backup import/export and Italian Hover / Parola v1 vocabulary import/export

## Honest limitations
No cross-device sync. localStorage is private to this browser/origin; iOS can evict it. Export a full Storie backup and import on the other device. No login or cloud storage.
No unrestricted AI conversation, comprehensive offline correction, automatic news updates, recorded human audio or microphone transcription.
Local correction checks only a handful of specific patterns; unknown writing remains explicitly ungraded. It does not certify grammar or estimate CEFR advancement. The reading filter selects authored passages, rather than dynamically rewriting them. The production setting changes target response length and is sent to the optional server.
The follow-up in local mode is authored and does not pretend to respond intelligently to free text. Dynamic follow-ups work only with the endpoint configured.
Audio uses browser/OS it-IT speech synthesis. Voices, quality, and offline availability depend on the device. Install an Italian voice if necessary. Audio controls remain independent of transcript and translation.
The Parola export format was inspected from defeldx14/italian-practice/shared/core.js: format italian-hover, version 1, event records with SHA-256 word/sentence IDs. It is a manual vocabulary transfer, not shared progress or sync. Review scheduling in Storie is separate. Resolve Parola conflicts before importing; deleted records are omitted.

## Optional secure AI connection
The existing GitHub Pages site cannot execute server code. Supply a backend or reverse proxy on the SAME HTTPS origin, then set `STORIE_CONFIG.aiEndpoint` in config.js to e.g. `/domshop/storie/api/correct`. A path alone is not an implementation; leave it empty until a real server is deployed. The app defaults to an empty endpoint and does not send any learner data externally.

The endpoint receives POST JSON:
```json
{"lessonId":"preventivo","task":"Italian task","text":"Learner reply","level":"A2","context":["Scene text"],"mistakes":["preposizioni"]}
```
Respond with:
```json
{"corrections":[{"original":"Learner sentence","corrected":"Corrected Italian","status":"grammar","explanation":"One brief explanation","tags":["preposizioni"]}],"refresh":"One short reminder of the actual mistake","followup":"One short Italian task responding to the learner's reply"}
```
Allowed status: correct, grammar, naturalness. Accept valid alternative answers. Use naturalness for valid but unnatural wording. Return at most three high-value corrections. The app formats originals, corrected text, numbered feedback, tags, refresh and follow-up; malformed or failed responses leave the draft intact.
On the SERVER: authenticate/rate-limit requests, validate origin and input sizes, keep provider API keys in server environment secrets, cap cost/output, and use a suitable provider API. Never add a provider secret to config.js, a repository or browser code. A configured request sends the response text, task, lesson context and mistake labels; no request is sent until submission. The app excludes its API path from offline caching and uses a 25-second timeout.

## Updating content
Add lesson objects to data.js following the existing shape. Four to six scenes, five to eight annotated expressions each, four to six questions, task/hint/model/follow. Update news source and publication/check dates individually. The initial art.js contains original scene compositions keyed by lesson theme and scene art identifier; add matching compositions for new scenes rather than reusing an unrelated drawing.
Increment the Storie service-worker cache version after asset changes. Root sw.js is updated to domshop-v5 and delegates nested app navigations, preventing nested HTML from overwriting the hub's cached index.

## Verification
JavaScript syntax parsed for app, artwork, data, configuration and service worker. Focused checks passed for 28 accessible SVG renders, scene/question/vocabulary counts, whole-phrase matching, word boundaries, HTML escaping, targeted local correction and ungraded unknown writing.
No local execution environment or browser was available during authoring. Full mobile/browser flow, real OS voices, offline installation and actual Parola UI import require browser verification. GitHub Pages deployment status is checked separately.
