# Domshop

A mobile-first personal app hub: https://defeldx14.github.io/domshop/

## Publishing
GitHub Pages deploys from **main / (root)**. No build tools or dependencies.

## App links
- Parola and Italian Practice: https://defeldx14.github.io/italian-practice/ (currently branded Parole).
- Flip 7: https://defeldx14.github.io/flip7-scorekeeper/
- Storie / Italian Story: URL and repository not yet supplied.
- Atlante Italia: URL and repository not yet supplied.

Edit cards in index.html when the missing URLs are known. Replace pending articles with anchors only after verifying the destination. Existing app repositories remain separate.

## PWA
Relative manifest paths support /domshop/. Service worker scope is limited to this hub. After an online visit the hub shell works offline; linked apps manage their own offline support. Increment the domshop cache version in sw.js when changing shell assets. PNG icons include 180px Apple touch, 192px, 512px, and a maskable 512px version.
