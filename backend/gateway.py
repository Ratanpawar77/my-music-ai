from __future__ import annotations

import json
import os
import re
import secrets
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

ACE_STEP_BASE_URL = os.getenv("ACESTEP_BASE_URL", "http://127.0.0.1:8001").rstrip("/")
ACE_STEP_API_KEY = os.getenv("ACESTEP_API_KEY", "")
GATEWAY_KEY = os.getenv("MYMUSIC_GATEWAY_KEY", "")
DEFAULT_ORIGINS = "https://ratanpawar77.github.io,http://localhost:5500,http://127.0.0.1:5500"
ALLOWED_ORIGINS = [v.strip() for v in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",") if v.strip()]

app = FastAPI(title="My Music AI Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-App-Key"],
)

# The native ACE-Step API stores task results in memory. This gateway keeps only
# the generated file path for jobs requested during this gateway process.
job_audio_paths: dict[str, str] = {}


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    lyrics: str = Field(default="", max_length=16000)
    language: str = Field(default="en", pattern="^(mr|hi|en)$")
    voice: str = Field(default="female", pattern="^(male|female|duet|instrumental)$")
    duration: int = Field(default=60, ge=10, le=180)
    bpm: int = Field(default=90, ge=30, le=300)
    key_scale: str = Field(default="", max_length=40)


def require_app_key(x_app_key: str = Header(default="")) -> None:
    if not GATEWAY_KEY:
        raise HTTPException(status_code=503, detail="Gateway is not configured. Set MYMUSIC_GATEWAY_KEY on the server.")
    if not x_app_key or not secrets.compare_digest(x_app_key, GATEWAY_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing gateway access key.")


def upstream_headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if ACE_STEP_API_KEY:
        headers["Authorization"] = f"Bearer {ACE_STEP_API_KEY}"
    return headers


def unpack_data(payload: dict[str, Any]) -> Any:
    if payload.get("error"):
        raise HTTPException(status_code=502, detail=str(payload["error"]))
    if payload.get("code", 200) != 200:
        raise HTTPException(status_code=502, detail=f"ACE-Step returned code {payload.get('code')}.")
    return payload.get("data")


@app.get("/api/health")
async def health() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(f"{ACE_STEP_BASE_URL}/health", headers=upstream_headers())
            response.raise_for_status()
            upstream = response.json()
        data = unpack_data(upstream) or {}
        return {"ok": True, "model_server": data.get("service", "ACE-Step API"), "status": data.get("status", "ok")}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"ACE-Step server is not reachable: {exc}") from exc




@app.get("/api/ready", dependencies=[Depends(require_app_key)])
async def ready() -> dict[str, bool]:
    return {"ok": True}

@app.post("/api/generate", dependencies=[Depends(require_app_key)])
async def generate(request: GenerateRequest) -> dict[str, Any]:
    voice_text = {
        "male": "male lead singing vocals",
        "female": "female lead singing vocals",
        "duet": "male and female duet vocals",
        "instrumental": "instrumental music, no singing or vocals",
    }[request.voice]
    prompt = f"{request.prompt.strip()}, {voice_text}"
    lyrics = request.lyrics.strip()
    if request.voice == "instrumental":
        lyrics = "[inst]"
    payload = {
        "prompt": prompt,
        "lyrics": lyrics,
        "vocal_language": request.language,
        "audio_duration": request.duration,
        "bpm": request.bpm,
        "key_scale": request.key_scale,
        "audio_format": "mp3",
        "thinking": False,
        "inference_steps": 8,
        "batch_size": 1,
        "use_random_seed": True,
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
            response = await client.post(
                f"{ACE_STEP_BASE_URL}/release_task",
                json=payload,
                headers=upstream_headers(),
            )
            response.raise_for_status()
            data = unpack_data(response.json()) or {}
        task_id = data.get("task_id")
        if not task_id:
            raise HTTPException(status_code=502, detail="ACE-Step did not return a task ID.")
        return {"job_id": str(task_id), "status": "queued"}
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"ACE-Step rejected the request: {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not submit generation: {exc}") from exc


def extract_audio_path(file_value: str) -> str:
    parsed = urlparse(file_value)
    if parsed.path.endswith("/v1/audio"):
        values = parse_qs(parsed.query)
        return values.get("path", [""])[0]
    return file_value


@app.get("/api/jobs/{job_id}", dependencies=[Depends(require_app_key)])
async def job_status(job_id: str) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,80}", job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID.")
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                f"{ACE_STEP_BASE_URL}/query_result",
                json={"task_id_list": [job_id]},
                headers=upstream_headers(),
            )
            response.raise_for_status()
            data = unpack_data(response.json()) or []
        row = next((item for item in data if str(item.get("task_id")) == job_id), None)
        if not row:
            return {"status": "processing", "message": "Waiting for the model queue."}
        status = int(row.get("status", 0))
        if status == 2:
            raise HTTPException(status_code=500, detail="ACE-Step generation failed. Try a shorter song or another prompt.")
        if status != 1:
            return {"status": "processing", "message": "The model is creating your song."}

        result = row.get("result", "[]")
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                result = []
        item = result[0] if isinstance(result, list) and result else {}
        path = extract_audio_path(str(item.get("file") or item.get("url") or ""))
        if not path:
            raise HTTPException(status_code=502, detail="The model finished but did not provide an audio file.")
        job_audio_paths[job_id] = path
        return {"status": "completed", "audio_url": f"/api/jobs/{job_id}/audio", "filename": f"my-music-ai-{job_id[:8]}.mp3"}
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Could not check the generation job: {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not check the generation job: {exc}") from exc


@app.get("/api/jobs/{job_id}/audio", dependencies=[Depends(require_app_key)])
async def job_audio(job_id: str) -> Response:
    path = job_audio_paths.get(job_id)
    if not path:
        raise HTTPException(status_code=404, detail="Audio is not ready. Check the job status first.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0)) as client:
            response = await client.get(
                f"{ACE_STEP_BASE_URL}/v1/audio",
                params={"path": path},
                headers=upstream_headers(),
            )
            response.raise_for_status()
        media_type = response.headers.get("content-type", "audio/mpeg")
        return Response(
            content=response.content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="my-music-ai-{job_id[:8]}.mp3"'},
        )
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Could not download generated audio: {detail}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not download generated audio: {exc}") from exc
