from __future__ import annotations

import json
import re
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import settings


def _models() -> list[str]:
    if isinstance(settings.GEMINI_MODELS, list):
        models = [m.strip() for m in settings.GEMINI_MODELS if m.strip()]
    else:
        models = [m.strip() for m in (settings.GEMINI_MODELS or "").split(",") if m.strip()]
    if not models:
        models = ["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.0-flash", "gemini-2.5-flash-lite"]
    return models


def _extract_json(text: str) -> dict[str, Any]:
    # Strip code fences if the model returns ```json ... ```
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    return json.loads(stripped)


@retry(wait=wait_exponential(min=2, max=20), stop=stop_after_attempt(3))
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

    async with httpx.AsyncClient(timeout=180.0) as client:
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
            if not text:
                raise RuntimeError(f"Model {model} yielded no content.")
            return str(text).strip()
        except Exception as e:
            last_err = e
            if use_search:
                try:
                    text = await _generate_once(model, prompt, use_search=False)
                    if text:
                        return str(text).strip()
                except Exception as e2:
                    last_err = e2
            continue
    raise last_err or RuntimeError("Gemini generation failed for all models")


async def _stream_generate_once(model: str, prompt: str, use_search: bool = False):
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

    if use_search:
        payload["tools"] = [{"googleSearch": {}}]

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
                    
                    # Successfully streamed, break out of the retry loop
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
    for model in _models():
        try:
            yielded_any = False
            async for chunk in _stream_generate_once(model, prompt, use_search=use_search):
                yielded_any = True
                yield chunk
            if not yielded_any:
                raise RuntimeError(f"Model {model} yielded no content.")
            return
        except Exception as e:
            last_err = e
            if use_search:
                try:
                    yielded_any = False
                    async for chunk in _stream_generate_once(model, prompt, use_search=False):
                        yielded_any = True
                        yield chunk
                    if not yielded_any:
                        raise RuntimeError(f"Model {model} yielded no content with use_search=False.")
                    return
                except Exception as e2:
                    last_err = e2
            continue
    raise last_err or RuntimeError("Gemini streaming failed for all models")
