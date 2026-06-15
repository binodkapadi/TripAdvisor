from __future__ import annotations

import json
import re
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import settings

GENERATION_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro"
]

LIVE_SEARCH_SYNTHESIS_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-2.0-flash",
]

FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
]

def _get_models(use_search: bool = False) -> list[str]:
    models = LIVE_SEARCH_SYNTHESIS_MODELS if use_search else GENERATION_MODELS
    # Avoid duplicates if a model is in both lists
    final_models = []
    for m in models + FALLBACK_MODELS:
        if m not in final_models:
            final_models.append(m)
    return final_models


def _extract_json(text: str) -> dict[str, Any]:
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    return json.loads(stripped)


@retry(wait=wait_exponential(min=2, max=20), stop=stop_after_attempt(3))
async def _generate_once(model: str, prompt: str) -> str:
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

    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(url, params=params, json=payload)
        r.raise_for_status()
        data = r.json()

    return data["candidates"][0]["content"]["parts"][0]["text"]


async def generate_json(prompt: str) -> dict[str, Any]:
    last_err: Exception | None = None
    for model in _get_models(use_search=False):
        try:
            text = await _generate_once(model, prompt)
            return _extract_json(text)
        except Exception as e:
            if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
                raise RuntimeError(f"Your API limit exceeded for this model: {model}") from e
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini generation failed for all models")


async def generate_text(prompt: str, use_search: bool = False) -> str:
    last_err: Exception | None = None
    for model in _get_models(use_search=use_search):
        try:
            text = await _generate_once(model, prompt)
            if not text:
                raise RuntimeError(f"Model {model} yielded no content.")
            return str(text).strip()
        except Exception as e:
            if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
                raise RuntimeError(f"Your API limit exceeded for this model: {model}") from e
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini generation failed for all models")


async def _stream_generate_once(model: str, prompt: str):
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is missing in environment")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse"
    params = {"key": settings.GEMINI_API_KEY}

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.9,
            "maxOutputTokens": 2048,
        },
    }

    import asyncio
    max_retries = 3
    base_delay = 2

    async with httpx.AsyncClient(timeout=180.0) as client:
        for attempt in range(max_retries):
            try:
                async with client.stream("POST", url, params=params, json=payload) as r:
                    if r.status_code == 429:
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt)
                            print(f"Gemini API 429 Too Many Requests - Retrying in {delay}s...")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            r.raise_for_status()
                    r.raise_for_status()
                    
                    async for line in r.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                continue
                            try:
                                data = json.loads(data_str)
                                if "candidates" in data and len(data["candidates"]) > 0:
                                    content = data["candidates"][0].get("content", {})
                                    parts = content.get("parts", [])
                                    if parts:
                                        yield parts[0].get("text", "")
                            except Exception as e:
                                print(f"Error parsing SSE chunk: {e}")
                    
                    return
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"Gemini API 429 HTTPStatusError - Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                raise


async def async_stream_text(prompt: str, use_search: bool = False):
    last_err: Exception | None = None
    for model in _get_models(use_search=use_search):
        try:
            yielded_any = False
            async for chunk in _stream_generate_once(model, prompt):
                yielded_any = True
                yield chunk
            if not yielded_any:
                raise RuntimeError(f"Model {model} yielded no content.")
            return
        except Exception as e:
            if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
                raise RuntimeError(f"Your API limit exceeded for this model: {model}") from e
            print(f"Model {model} failed: {str(e)}")
            last_err = e
            continue
    raise last_err or RuntimeError("Gemini streaming failed for all models")
