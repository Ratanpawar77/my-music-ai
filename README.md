# My Music AI — Personal Music Studio

A mobile-first, installable browser music workspace for personal song ideas.

## Current features
- Marathi, Hindi and English lyric starter drafts with editable lyrics
- Song idea, mood, genre, key and tempo controls
- Procedurally synthesized instrumental sketches using the browser Web Audio API
- WAV export for generated instrumental sketches
- Local project library and JSON backup export
- Lyrics copy and TXT export
- Free ACE-Step 1.5 song-generation handoff, with prompt and lyrics copying
- PWA manifest and offline app-shell caching
- No account or third-party analytics required

## Open the app
GitHub Pages URL: https://ratanpawar77.github.io/my-music-ai/
Enable GitHub Pages in Settings → Pages → Deploy from a branch → main → /(root) if it is not already enabled.

## Important scope and limitations
This app provides local lyric and instrumental tools plus a handoff to the hosted ACE-Step 1.5 generator. It does not run a neural music model inside GitHub Pages. Full AI songs are generated on ACE Music, then imported into this app.

AI song generation is performed by ACE Music, not by this app's static front end. The app uses the provider's normal website rather than an undocumented API or proxy.

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


## Free full-song workflow

My Music AI uses ACE Music's hosted ACE-Step 1.5 experience for free AI song generation. Open https://acemusic.ai/ace-step/ from section 04 in the app, sign in with a free account, select ACE-Step v1.5 XL, paste the song prompt and lyrics, generate, and download the supported MP3. Return to My Music AI and import the file into the local audio library.

ACE-Step 1.5 generation on ACE Music does not consume generation credits. Supported MP3 downloads are free. Other models and features on ACE Music may use credits or require a paid plan. See the provider's live pricing and terms before use.

The app does not call an undocumented ACE Music API or proxy. The generated song is transferred into the app by the user's normal MP3 download and file import. Imported tracks are stored in this browser's IndexedDB on this device; they are not cloud-synced. Browser storage can be cleared by the user or operating system, so keep separate copies of important MP3 files.

The open-source ACE-Step project also provides a REST API, but it is designed for a self-hosted ACE-Step server. It requires suitable compute hardware. A free Google Colab runtime is not a suitable always-on backend for this app: Colab documents dynamic, non-guaranteed GPU availability and disallows using free managed runtimes primarily as a web service.
