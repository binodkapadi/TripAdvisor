from __future__ import annotations

import json
import re
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import settings


def _models() -> list[str]:
  return [m.strip() for m in (settings.GEMINI_MODELS or "").split(",") if m.strip()]


def _extract_json(text: str) -> dict[str, Any]:
    # Strip code fences if the model returns ```json ... ```
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    return json.loads(stripped)


@retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(2))
async def _generate_once(model: str, prompt: str, use_search: bool = False) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing in environment")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    params = {"key": settings.GEMINI_API_KEY}

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.9,
            "maxOutputTokens": 2048,
        },
    }

    if use_search:
        payload["tools"] = [{"googleSearch": {}}]

    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, params=params, json=payload)
        r.raise_for_status()
        data = r.json()

    # Expected response shape:
    # data.candidates[0].content.parts[0].text
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def generate_json(prompt: str) -> dict[str, Any]:
    last_err: Exception | None = None
    for model in _models():
        try:
            text = await _generate_once(model, prompt)
            return _extract_json(text)
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini generation failed for all models")


async def generate_text(prompt: str, use_search: bool = False) -> str:
    last_err: Exception | None = None
    for model in _models():
        try:
            text = await _generate_once(model, prompt, use_search=use_search)
            return str(text).strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini generation failed for all models")

