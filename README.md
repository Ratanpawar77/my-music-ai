# My Music AI — Personal Music Studio

A mobile-first, installable music workspace with an integration path for a self-hosted ACE-Step 1.5 AI music server.

## Current features
- Marathi, Hindi and English lyric starter drafts with editable lyrics
- Song idea, mood, genre, key and tempo controls
- Procedurally synthesized instrumental sketches using the browser Web Audio API
- WAV export for generated instrumental sketches
- Local project library and JSON backup export
- Lyrics copy and TXT export
- In-app ACE-Step 1.5 gateway connector with job polling and MP3 playback/download (requires a running GPU model server)
- Optional manual import of audio created elsewhere
- PWA manifest and offline app-shell caching
- No account or third-party analytics required

## Open the app
GitHub Pages URL: https://ratanpawar77.github.io/my-music-ai/
Enable GitHub Pages in Settings → Pages → Deploy from a branch → main → /(root) if it is not already enabled.

## Important scope and limitations
This app's GitHub Pages frontend does not run the neural music model. Real AI song generation is connected through the secured FastAPI gateway in the backend/ folder to a self-hosted ACE-Step 1.5 server. The gateway keeps the model API key server-side, checks app access, and streams completed MP3 files back to this app. It must be deployed beside a running model server before the in-app generator can work.

Projects are stored in this browser's local storage. They do not automatically sync between devices. Export the JSON backup regularly.

## Run locally
Serve this folder over localhost (for example, with VS Code Live Server). Service workers and PWA installation require HTTPS or localhost.

## Files
- index.html — application interface
- styles.css — responsive dark studio design
- app.js — lyric drafting, browser audio synthesis, WAV export and project storage
- ai-generator.js — secure gateway connection, generation job polling and MP3 playback
- manifest.json — installable PWA metadata
- service-worker.js — offline app shell
- backend/gateway.py — secured ACE-Step API gateway
- backend/README.md — setup guide for the model server and gateway
- icon.svg — app icon


## Real AI generation setup

See [backend/README.md](backend/README.md) for the gateway and ACE-Step setup. The frontend is ready to connect, but this public GitHub Pages repository does not include a running GPU server. A real complete song with vocals requires ACE-Step running on suitable hardware. Do not commit access keys or generated audio to this repository.

Free-only is the target. Open-source code/model usage does not guarantee free GPU availability or 24/7 uptime. Google's official Colab FAQ prohibits file hosting, media serving, and unrelated web-service offerings on managed runtimes; it also says free GPU resources and limits vary. Do not use a free Colab runtime as this app's public backend: https://research.google.com/colaboratory/faq.html

