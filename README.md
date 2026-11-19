# My Music AI — Personal Music Studio

A mobile-first, installable browser music workspace for personal song ideas.

## Current features
- Marathi, Hindi and English lyric starter drafts with editable lyrics
- Song idea, mood, genre, key and tempo controls
- Procedurally synthesized instrumental sketches using the browser Web Audio API
- WAV export for generated instrumental sketches
- Local project library and JSON backup export
- Lyrics copy and TXT export
- PWA manifest and offline app-shell caching
- No account or third-party analytics required

## Open the app
GitHub Pages URL: https://ratanpawar77.github.io/my-music-ai/
Enable GitHub Pages in Settings → Pages → Deploy from a branch → main → /(root) if it is not already enabled.

## Important scope and limitations
This version is a working local music-sketch studio, not yet a neural AI music generator. Lyric starters use editable local templates. Instrumentals are synthesized in the browser; they are not AI vocals or a commercially produced song.

Real AI full-song generation and singing vocals require a compatible generation provider and a secure server-side integration. Do not put API keys or provider secrets in app.js, HTML, or any public GitHub repository. A future backend should keep secrets server-side and provide rate limits, usage controls and clear provider licensing.

Projects are stored in this browser's local storage. They do not automatically sync between devices. Export the JSON backup regularly.

## Run locally
Serve this folder over localhost (for example, with VS Code Live Server). Service workers and PWA installation require HTTPS or localhost.

## Files
- index.html — application interface
- styles.css — responsive dark studio design
- app.js — lyric drafting, browser audio synthesis, WAV export and project storage
- manifest.json — installable PWA metadata
- service-worker.js — offline app shell
- icon.svg — app icon

## AI vocals upgrade (v2)

A Cloudflare Worker integration for MiniMax Music 2.6 is included in `cloudflare-worker/`. Follow `cloudflare-worker/README.md` to deploy it, add the Workers AI binding named `AI`, and create the private secret `STUDIO_ACCESS_KEY`. Then configure the Worker URL and access code in the app's AI Vocals Studio panel. Do not add service credentials to public files.

The AI music model generates billable tracks (currently listed at about US$0.15 each). Male/female/duet choices are prompt directions, not guaranteed voice identities; Marathi and Hindi pronunciation may vary.
