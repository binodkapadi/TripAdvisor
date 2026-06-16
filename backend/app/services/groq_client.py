from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import settings

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b",
    "groq/compound-mini",
]

@retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3))
async def _generate_once(model: str, prompt: str) -> str:
    print(f"[GROQ API] Generating with model: {model} | Prompt length: {len(prompt)}")
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is missing in environment")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 0.9,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()

    return data["choices"][0]["message"]["content"]


async def generate_text(prompt: str) -> str:
    last_err: Exception | None = None
    for model in GROQ_MODELS:
        try:
            text = await _generate_once(model, prompt)
            if not text:
                raise RuntimeError(f"Model {model} yielded no content.")
            return str(text).strip()
        except Exception as e:
            print(f"[GROQ API] Model {model} failed: {type(e).__name__} - {str(e)}")
            last_err = e
            continue
    raise last_err or RuntimeError("Groq generation failed for all models")

async def _stream_generate_once(model: str, prompt: str) -> AsyncGenerator[str, None]:
    print(f"[GROQ STREAM] Generating with model: {model} | Prompt length: {len(prompt)}")
    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is missing in environment")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 0.9,
        "stream": True
    }

    import asyncio
    max_retries = 2
    base_delay = 2

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(max_retries):
            try:
                async with client.stream("POST", url, headers=headers, json=payload) as r:
                    r.raise_for_status()
                    async for line in r.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                continue
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except Exception as e:
                                pass # ignore json parse errors for incomplete chunks
                    return
            except httpx.HTTPStatusError as e:
                print(f"Groq HTTPStatusError {e.response.status_code}: {e.response.text}")
                if e.response.status_code == 429 and attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"Groq API 429 HTTPStatusError - Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                raise

async def async_stream_text(prompt: str) -> AsyncGenerator[str, None]:
    last_err: Exception | None = None
    for model in GROQ_MODELS:
        try:
            yielded_any = False
            async for chunk in _stream_generate_once(model, prompt):
                yielded_any = True
                yield chunk
            if not yielded_any:
                raise RuntimeError(f"Model {model} yielded no content.")
            return
        except Exception as e:
            print(f"[GROQ STREAM] Model {model} failed: {type(e).__name__} - {str(e)}")
            last_err = e
            continue
    raise last_err or RuntimeError("Groq streaming failed for all models")
