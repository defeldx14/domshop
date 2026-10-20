# Google Drive sync

Use Impostazioni → Google Drive sync. Check the intended-account box, Connect Google Drive, then Sync now. Repeat using the same account on each device. Sync before and after switching devices. Reconnect after reopening the page or when authorization expires. Tokens are held in page memory only.

Google Cloud → Google Auth Platform → Clients → the existing Web OAuth client must authorize https://defeldx14.github.io. Atlante additionally needs https://atlante-italia-dom.airy-bison-8343.chatgpt.site. Origins have no path or trailing slash. Keep the Drive API enabled and drive.appdata scope configured in the same project as Parola.

Private Drive files use appProperties app=domshop-storie-v1. Parola files are not changed. Storie stores lesson attempts, drafts, saved words, review schedules, mistakes, settings, and history. Word deletions propagate; the latest edit wins for concurrent changes to the same lesson. Unchanging records retain their timestamps. Immutable batches preserve race recovery and earlier versions. Validation completes before any upload or replacement. Failed uploads do not replace local progress. New edits during an upload stay local until the next sync.

Vocabulary exchange with Parola remains via the existing Import/Export controls. This release does not automatically share vocabulary across the apps. Export full backups periodically.
