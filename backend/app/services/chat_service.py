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
            rates_str = "\n".join([f"1 USD = {v} {k}" for k, v in rates.items() if v])
            currency_context = f"""
[LIVE CURRENCY EXCHANGE RATES (Base: USD)]
{rates_str}

CURRENCY INSTRUCTIONS:
- You have real-time exchange rates above (Base: USD). Use them to calculate conversions entirely in the background.
- ALWAYS calculate the exact mathematical value using the formula: (Amount / Source_Rate) * Target_Rate. Do NOT guess or hallucinate the numbers.
- NEVER show the calculation steps, reasoning, or a multi-step conversion chain. Only show the final values.
- Present the currency conversion clearly and beautifully using appropriate formatting (e.g., bullet points, bold text). Do not use a forced template, but keep it highly readable.
- If relevant to the user's trip, warn about expensive locations or suggest cheaper alternatives based on their budget.
- Recommend the best exchange options (e.g., clearly advise that exchanging currency at the airport may cost 8-12% more than local forex exchanges).
- Ensure the converted value is mathematically accurate based on the provided rates.
- ALWAYS append this exact disclaimer on a NEW, SEPARATE LINE at the very end of your response:
"⚠️ Exchange rates fluctuate daily, so please check a live currency converter or banking rate."
"""

    cost_predictor = data.get("costPredictor", "Not available")
    transport_details = data.get("transportDetails", "Not available")
    weather_insights = data.get("weatherInsights", "Not available")
    hotels_info = "\n".join(f"- {h.get('name')} (${h.get('price')}): {h.get('location')}" for h in data.get("hotels", [])) if data.get("hotels") else "Not available"

    prompt = f"""
You are an advanced AI-powered Travel Assistant integrated inside a smart trip planning platform.
Your role is to help users before, during, and after trip itinerary generation using real-time data, reasoning, and context.

CORE RESPONSIBILITIES:
- If the user asks identity questions ("who are you", "tell me about yourself"), respond EXACTLY: "Hi! I'm TripMate, your AI-powered travel planning assistant. I can help you discover destinations, create personalized itineraries, recommend attractions, estimate travel expenses, and answer travel-related questions to help you plan your journey from origin to destination."
- For ALL other questions: Answer ONLY the asked question. Do NOT repeat identity or intro text. Do NOT add unnecessary explanation. Do NOT add extra suggestions unless asked. Add necessary explanations in a short and sweet way.
- Answer travel-related queries including destinations, itineraries, transport, food, stay, safety, and currency intelligently.
- Use conversation history for personalization.
- Give concise yet informative answers (use emojis, bullet points, bold text)
- Maintain a modern UI/UX format in your response—never robotic
- Provide structured, actionable answers (3-5 sentences max unless requested).
- Prioritize real-world travel guidance (costs, routes, weather, safety, visa basics).
- For visa/immigration: provide general information only + always include disclaimer that rules change and users must verify from official sources.

DOMAIN HANDLING:
- If a question is clearly unrelated to travel or currency (e.g., coding, politics): Respond: "I can only help with travel-related questions. Please ask something related to your trip."
- Assume any general questions about places, activities, museums, or food (e.g., "is there any museum?") are implicitly about the user's trip destination. Treat them as travel-related and answer them!
- Always use the provided live currency exchange rates to ensure there is no error during calculation for each and every currency available. Your answer must be short, sweet, and concise.

UI/UX STYLE:
- Keep responses short, clear, and highly readable.
- Use formatting only when it improves readability. Avoid forced styling.
- Use minimal emojis (avoid emojis in legal/visa content).
- Maintain modern assistant tone (not robotic).

RAG BEHAVIOR:
- Prefer RAG itinerary data and the provided [LIVE WEB SEARCH RESULTS] to intelligently and properly answer trip-related queries.
- If RAG or live search data is missing, say you don't have enough information and suggest checking official sources.
- Do not hallucinate specific facts (especially visa, pricing, schedules).

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

[WEATHER INSIGHTS]
{weather_insights}

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
    
    from .serpapi_client import search_web
    search_results = await search_web(question)
    if search_results:
        prompt += f"\n\n[LIVE WEB SEARCH RESULTS FOR '{question}']\n{search_results}\n"
    
    print(f"Sending prompt to Gemini ({len(prompt)} characters) with manual web search")
    
    try:
        from ..core.config import settings
        # Save user message first
        await mongo.collection("chat_logs").insert_one(
            {
                "userId": user_id,
                "itineraryId": itinerary_id,
                "role": "user",
                "message": question,
                "createdAt": datetime.now(timezone.utc),
            }
        )

        answer = None
        if settings.GROQ_API_KEY:
            try:
                from .groq_client import generate_text as groq_generate
                answer = await groq_generate(prompt)
                print(f"Groq response length: {len(answer)}")
            except Exception as e:
                print(f"Groq generation failed: {e}. Falling back to Gemini...")
        
        if not answer:
            from .gemini_client import generate_text
            answer = await generate_text(prompt, use_search=True)
            print(f"Gemini response length: {len(answer)}")
        
        await mongo.collection("chat_logs").insert_one(
            {
                "userId": user_id,
                "itineraryId": itinerary_id,
                "role": "assistant",
                "message": answer,
                "createdAt": datetime.now(timezone.utc),
            }
        )
        
        return answer
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        raise

async def prepare_rag_stream(*, user_id: str, itinerary_id: str, question: str, history: list[dict[str, Any]] | None = None):
    prompt = await _build_rag_prompt(user_id, itinerary_id, question, history)
    
    from .serpapi_client import search_web
    search_results = await search_web(question)
    if search_results and "unavailable" not in search_results:
        prompt += f"\n\n[LIVE WEB SEARCH RESULTS FOR '{question}']\n{search_results}\n"
    
    from ..core.config import settings
    
    # Save user message first
    await mongo.connect()
    await mongo.collection("chat_logs").insert_one(
        {
            "userId": user_id,
            "itineraryId": itinerary_id,
            "role": "user",
            "message": question,
            "createdAt": datetime.now(timezone.utc),
        }
    )

    async def stream_generator():
        full_answer = ""
        try:
            used_groq = False
            if settings.GROQ_API_KEY:
                try:
                    from .groq_client import async_stream_text as groq_stream
                    async for chunk in groq_stream(prompt):
                        full_answer += chunk
                        yield chunk
                    used_groq = True
                except Exception as e:
                    print(f"Groq streaming failed: {e}. Falling back to Gemini...", flush=True)
            
            if not used_groq:
                from .gemini_client import async_stream_text
                async for chunk in async_stream_text(prompt, use_search=True):
                    full_answer += chunk
                    yield chunk
                
            if full_answer:
                await mongo.collection("chat_logs").insert_one(
                    {
                        "userId": user_id,
                        "itineraryId": itinerary_id,
                        "role": "assistant",
                        "message": full_answer,
                        "createdAt": datetime.now(timezone.utc),
                    }
                )
        except Exception as e:
            print(f"Error streaming response: {str(e)}", flush=True)
            error_msg = "The AI service is temporarily busy (Backend Generation Error). Please try again in a few moments."
            yield error_msg
            
            await mongo.collection("chat_logs").insert_one(
                {
                    "userId": user_id,
                    "itineraryId": itinerary_id,
                    "role": "assistant",
                    "message": error_msg,
                    "createdAt": datetime.now(timezone.utc),
                }
            )

    return stream_generator()


