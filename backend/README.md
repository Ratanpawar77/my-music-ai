# My Music AI — GPU gateway

This is the small, secured web gateway that connects the GitHub Pages app to a self-hosted ACE-Step 1.5 API. It does **not** contain the music model or provide GPU compute. The ACE-Step model server and this gateway must run on the same GPU machine (or on a network where the gateway can reach it).

## 1. Start ACE-Step 1.5

Follow the official installation guide: https://github.com/ace-step/ACE-Step-1.5

ACE-Step currently documents Python 3.11–3.12 and starts its REST API with:

```bash
uv run acestep-api
```

By default the API listens on `http://127.0.0.1:8001`. Configure an upstream API key on the model server when possible and keep it private.

## 2. Start this gateway

From this `backend` folder:

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set environment variables before starting:

```bash
export ACESTEP_BASE_URL=http://127.0.0.1:8001
export ACESTEP_API_KEY=your_ace_step_server_key
export MYMUSIC_GATEWAY_KEY=make-a-long-random-private-key
export ALLOWED_ORIGINS=https://ratanpawar77.github.io
uvicorn gateway:app --host 0.0.0.0 --port 8080 --workers 1
```

On Windows PowerShell use `$env:NAME="value"` for each variable.

Open `https://YOUR-GATEWAY-HOST/api/health` to check connectivity. The public URL must use HTTPS. In the My Music AI app, enter that base URL and the same `MYMUSIC_GATEWAY_KEY`, then tap **Test server**.

## 3. What the app calls

- `GET /api/health` — checks the upstream ACE-Step server
- `POST /api/generate` — submits a text-to-music job
- `GET /api/jobs/{job_id}` — checks progress
- `GET /api/jobs/{job_id}/audio` — streams the completed MP3

The gateway keeps the ACE-Step key server-side, restricts browser origins, requires a separate app key for generation/audio, and only serves audio paths returned for jobs submitted through this gateway. Use one worker because ACE-Step's task queue is in memory.

## Free-use and hosting note

The code and model are open source, and this gateway has no paid API dependency. **A running GPU is still required for real song generation.** Free GPU capacity is not guaranteed, so this repository does not claim that generation is live until you connect a running server. Google Colab's official FAQ prohibits using managed runtimes for file hosting, media serving, or other web-service offerings unrelated to interactive compute, and says GPU availability and limits vary. Do not use a free Colab runtime as a public always-on backend or proxy: https://research.google.com/colaboratory/faq.html

Do not commit API keys, gateway secrets, model weights, or generated audio to this public repository. Do not expose the ACE-Step server directly to the public internet.
