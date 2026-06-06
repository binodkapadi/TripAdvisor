from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from ..db.mongo import mongo
from .gemini_client import generate_text


def _tokenize(q: str) -> list[str]:
    q = q.lower()
    parts = re.split(r"[^a-z0-9]+", q)
    return [p for p in parts if len(p) >= 3][:40]


async def _build_rag_prompt(user_id: str, itinerary_id: str, question: str, history: list[dict[str, Any]] | None = None) -> str:
    await mongo.connect()
    print(f"Looking for itinerary with ID: {itinerary_id}")
    
    itinerary = await mongo.collection("itineraries").find_one({"itineraryId": itinerary_id})
    if not itinerary:
        print(f"Itinerary not found for ID: {itinerary_id}")
        raise RuntimeError("Itinerary not found")

    trip = await mongo.collection("trips").find_one({"itineraryId": itinerary_id})
    trip_form = trip.get("form", {}) if trip else {}
    origin = trip_form.get("origin", "Unknown")
    destination = trip_form.get("destination", "Unknown")
    budget = trip_form.get("budget", "Unknown")

    data = itinerary.get("data") or {}
    optimized = data.get("optimizedItinerary") or {}
    days: list[str] = optimized.get("days") or []
    
    tokens = _tokenize(question)
    
    scored: list[tuple[int, str]] = []
    for day in days:
        text = day.lower() if isinstance(day, str) else str(day).lower()
        score = sum(1 for t in tokens if t in text)
        scored.append((score, day))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_days = [d for _, d in scored[:3] if d][:3]

    context = "\n\n".join(top_days) if top_days else "\n".join(days[:2])
    
    history_str = ""
    if history:
        history_str = "\nConversation History:\n"
        for msg in history[-6:]:
            role = "User" if msg.get("type") == "user" else "Assistant"
            history_str += f"{role}: {msg.get('content')}\n"

    currency_keywords = ["usd", "npr", "inr", "eur", "gbp", "aud", "cad", "jpy", "cny", "sgd", "convert", "currency", "exchange", "rate", "cost", "price", "budget", "expensive", "cheap", "$", "€", "£", "¥", "₹", "cash"]
    
    currency_context = ""
    if any(kw in question.lower() for kw in currency_keywords):
        from .currency_service import get_exchange_rates
        rates = await get_exchange_rates("USD")
        if rates:
            popular = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "NPR", "SGD", "AED", "THB", "IDR", "MYR", "VND", "PHP", "KRW", "ZAR", "BRL", "MXN"]
            rates_str = "\n".join([f"1 USD = {rates.get(c)} {c}" for c in popular if c in rates])
            currency_context = f"""
[LIVE CURRENCY EXCHANGE RATES (Base: USD)]
{rates_str}

CURRENCY INSTRUCTIONS:
- You have real-time exchange rates above. Use them to accurately calculate and convert ANY currency requested by the user.
- If asked, convert transportation, total costs, hotel costs, or daily budget into the user's requested currency.
- Predict daily spending in their local currency based on the destination.
- Warn about expensive locations or suggest cheaper alternatives based on the budget.
- Recommend best exchange options (e.g. clearly advise that exchanging currency at the airport may cost 8-12% more than local forex exchanges).
"""

    cost_predictor = data.get("costPredictor", "Not available")
    transport_details = data.get("transportDetails", "Not available")
    hotels_info = "\n".join(f"- {h.get('name')} (${h.get('price')}): {h.get('location')}" for h in data.get("hotels", [])) if data.get("hotels") else "Not available"

    prompt = f"""
You are an advanced AI-powered Travel Assistant integrated inside a smart trip planning platform.
Your role is to help users before, during, and after trip itinerary generation using real-time data, reasoning, and context.

CORE RESPONSIBILITIES:
* Answer all travel-related questions intelligently
* Use conversational memory from the history provided
* Give concise yet informative answers (use emojis, bullet points, bold text)
* Prioritize actionable travel guidance (cost predictions, safety, weather, transport)
* Maintain a modern UI/UX format in your response—never robotic

RESTRICTIONS:
If the user asks a question completely unrelated to travel or their itinerary, politely decline to answer and guide them back to their trip.

UI/UX FORMATTING:
Your response will be rendered in a modern glassmorphism UI. Make it visually appealing with markdown.
Use short paragraphs, lists, and emojis appropriately.

ITINERARY CONTEXT:
The user is asking about their trip. Here is relevant context from their itinerary:
- Origin: {origin}
- Destination: {destination}
- Entered Budget: {budget} USD

[COST PREDICTOR & TOTAL ESTIMATES]
{cost_predictor}

[HOTELS SUGGESTED]
{hotels_info}

[TRANSPORT DETAILS]
{transport_details}

[RELEVANT ITINERARY DAYS]
{context}
{currency_context}
{history_str}
Current User Question:
{question}
"""
    return prompt

async def rag_answer(*, user_id: str, itinerary_id: str, question: str, history: list[dict[str, Any]] | None = None) -> str:
    prompt = await _build_rag_prompt(user_id, itinerary_id, question, history)
    
    print(f"Sending prompt to Gemini ({len(prompt)} characters) with web search enabled")
    
    try:
        from .gemini_client import generate_text
        answer = await generate_text(prompt, use_search=True)
        print(f"Gemini response length: {len(answer)}")
        
        await mongo.collection("chat_logs").insert_one(
            {
                "userId": user_id,
                "itineraryId": itinerary_id,
                "question": question,
                "answer": answer,
                "createdAt": datetime.now(timezone.utc),
            }
        )
        
        return answer
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise

async def rag_answer_stream(*, user_id: str, itinerary_id: str, question: str, history: list[dict[str, Any]] | None = None):
    prompt = await _build_rag_prompt(user_id, itinerary_id, question, history)
    
    from .gemini_client import async_stream_text
    
    full_answer = ""
    try:
        async for chunk in async_stream_text(prompt, use_search=True):
            full_answer += chunk
            yield chunk
            
        await mongo.collection("chat_logs").insert_one(
            {
                "userId": user_id,
                "itineraryId": itinerary_id,
                "question": question,
                "answer": full_answer,
                "createdAt": datetime.now(timezone.utc),
            }
        )
    except Exception as e:
        print(f"Error streaming response: {str(e)}")
        yield " Sorry, I had trouble connecting. Please try again in a moment! 🚧"


