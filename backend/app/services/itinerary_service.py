from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any

import urllib.parse

from ..db.mongo import mongo
from ..core.config import settings
from .gemini_client import generate_json
from .openweather_client import get_weather_insights
from .email_service import send_email, get_itinerary_email_html


def _cache_key(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _google_maps_link(location: str) -> str:
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(location)


def _days_from_dates(start_date: str, end_date: str) -> int:
    start = datetime.fromisoformat(start_date).date()
    end = datetime.fromisoformat(end_date).date()
    delta = (end - start).days
    return max(1, delta + 1)


def _build_generation_prompt(*, form: dict[str, Any], num_days: int, weather: str) -> str:
    return f"""
You are an advanced AI travel planner and tourism expert.
Generate a PREMIUM, REALISTIC, DETAILED, USER-FRIENDLY travel plan.

IMPORTANT:
- Return ONLY valid JSON.
- No markdown.
- No explanation outside JSON.
- No code fences.

JSON SCHEMA:
{{
  "weatherInsights": string,
  "transportDetails": string,
  "hotels": [
    {{
      "name": string,
      "price": number,
      "rating": number,
      "location": string,
      "mapsLink": string
    }}
  ],
  "costPredictor": string,
  "aiRecommendations": string,
  "optimizedItinerary": {{
    "days": [string]
  }}
}}

USER TRIP DETAILS:
- Origin: {form['origin']}
- Destination: {form['destination']}
- Travel Dates: {form['startDate']} to {form['endDate']}
- Number Of People: {form['numberOfPeople']}
- Travel Type: {form['travelType']}
- Budget: {form['budget']} USD
- Preferred Transport: {form['transportMode']}
- Preferences: {form.get('preferences', '')}

REAL-TIME WEATHER DATA:
{weather}

STRICT GENERATION RULES:

1. WEATHER INSIGHTS:
- Provide exact weather conditions for the destination during the specific travel dates {form['startDate']} to {form['endDate']}.
- Clearly tell:
  - whether the weather is suitable for travel or not.
  - temperature conditions (high/low during these dates).
  - rainfall/snowfall chances during travel period.
  - travel comfort level for the selected dates.
  - specific season characteristics at the destination during these dates.
- If the selected dates are not suitable:
  - recommend the BEST months/dates to visit instead.
- Mention specific clothing suggestions and safety tips for these dates.
- Generate professional tourism-style weather insights with specific date references.

2. TRANSPORT DETAILS:
- Generate REALISTIC transportation insights for {form['transportMode']} from {form['origin']} to {form['destination']}.
- Include:
  - Whether this transport mode is available for this route.
  - Specific operators/airline/train/bus/Car names (if available).
  - Approximate ticket prices (for {form['numberOfPeople']} people).
  - Typical travel duration.
  - Departure and arrival timing examples.
  - Booking recommendations and websites.
  - Comfort level and amenities for this transport mode.

IF TRANSPORT MODE = FLIGHT:
- Mention:
  - Major airlines operating this route
  - EXPLICITLY state "Average One-Way Price per person: $X" (USE STANDARD ECONOMY AVERAGE)
  - Flight duration
  - Example departure/arrival times
  - Best booking websites (Skyscanner, Google Flights, Booking.com, etc.)
  - EXPLICITLY state "Total One-Way Cost for {form['numberOfPeople']} person(s): $Y"

IF TRANSPORT MODE = TRAIN:
- Mention:
  - Train availability and frequency
  - Major train services/operators
  - EXPLICITLY state "Average One-Way Price per person: $X" (USE STANDARD ECONOMY AVERAGE)
  - Travel duration
  - Comfort classes available
  - Best booking methods
  - EXPLICITLY state "Total One-Way Cost for {form['numberOfPeople']} person(s): $Y"

IF TRANSPORT MODE = BUS:
- Mention:
  - Luxury/deluxe bus availability
  - EXPLICITLY state "Average One-Way Price per person: $X" (USE STANDARD AVERAGE)
  - Travel duration (including stops)
  - Day/night options
  - Popular bus operators
  - EXPLICITLY state "Total One-Way Cost for {form['numberOfPeople']} person(s): $Y"

IF SELECTED TRANSPORT IS NOT AVAILABLE:
- Clearly state: "Routes of {form['transportMode']} are not available for this route."
- Then recommend the BEST alternative transportation with explanation.

3. HOTELS:
Generate exactly 3 realistic hotels suitable for:
- destination
- travel type
- user budget for {form['numberOfPeople']} people

For each hotel provide:
- hotel name
- approximate NIGHTLY PRICE (per room, not per person)
- realistic rating out of 5
- hotel location/area name
- Google Maps search link

Hotels must:
- Match the travel type and preferences
- Focus purely on solid mid-range options (not luxury, but not very low budget)
- Have realistic nightly rates for the region
- Include both room capacity info and accessibility notes

CRITICAL: Provide realistic nightly prices for the destination (not inflated/reduced)

4. COST PREDICTOR:
Generate a detailed cost breakdown for {form['numberOfPeople']} person(s) for {num_days} days.
CRITICAL INSTRUCTION: ALWAYS apply average/standard economy pricing when calculating costs. Do NOT calculate based on luxury or comfort pricing unless the user's budget forces it. Always aim for the realistic average.

ACCOMMODATION CALCULATION:
- Use realistic mid-range hotel prices (avoid luxury or extremely low budget) for {form['destination']} region
- Per-room nightly cost × {num_days} nights
- Account for room sharing: Roughly 1 room per 2 people (adjust if needed)
- Provide TOTAL accommodation cost for entire group and stay duration
- Example format: "Accommodation ({num_days} nights): $X (averaging $Y per night)"

MEALS & FOOD CALCULATION:
- Per-person per-day rate based on preferences: {form.get('preferences', 'standard dining')}
- Total formula: per-person-per-day rate × {num_days} days × {form['numberOfPeople']} people
- Include: breakfast, lunch, dinner, snacks, beverages
- Example format: "Meals & Food ({num_days} days, {form['numberOfPeople']} people): $X"

LOCAL TRANSPORT CALCULATION:
- Daily rate for taxis/rideshare/public transport
- Total formula: per-day rate × {num_days} days × {form['numberOfPeople']} people
- Include: airport transfers, daily sightseeing transport
- Example format: "Local Transport ({num_days} days): $X"

SIGHTSEEING & ACTIVITIES CALCULATION:
- Per-person per-day activity cost based on preferences
- Total formula: per-person-per-day rate × {num_days} days × {form['numberOfPeople']} people
- Include: entrance fees, guided tours, adventure activities, experiences
- Example format: "Sightseeing & Activities ({num_days} days, {form['numberOfPeople']} people): $X"

ROUND TRIP TRAVEL ({form['transportMode']}) - {form['origin']} ↔ {form['destination']}:
- You MUST ALWAYS calculate the ROUND TRIP cost here based on AVERAGE ECONOMY pricing.
- Base Average One-Way Cost per person = $X
- If 1 person: Total Round Trip = $X * 2
- If multiple people: Total Round Trip = $X * 2 * {form['numberOfPeople']}
- Explicitly state exactly this: "Round Trip Travel ({form['numberOfPeople']} person(s)): $TOTAL"

TOTAL CALCULATION:
- Accommodation + Meals + Local Transport + Activities + Outbound + Return
- Clearly state: "Total Estimated Budget for {form['numberOfPeople']} Person(s): $TOTAL USD"
- This is the TOTAL for the entire group for the entire trip

BUDGET ASSESSMENT:
- Explain whether {form['budget']} USD is:
  - Sufficient (with buffer for activities/shopping)
  - Tight (minimal flexibility)
  - Luxury (room for premium experiences)
- Reference: ${form['budget'] / (form['numberOfPeople'] * num_days):.0f} per person per day

Use line-by-line bullet points, not paragraphs.

5. AI RECOMMENDATIONS:
Generate 4 to 6 maximum HIGH QUALITY recommendations specific to {form['destination']}.

STRICT FORMAT:
- Each recommendation MUST start with: "• "
- You MUST insert a literal newline character `\n` after every single recommendation.
- Do NOT output all recommendations on a single line. They MUST be separated by newlines.
- Include SPECIFIC activity names, locations, approximate costs

Recommendations should include:
- Local foods with typical prices ($X per meal)
- Safety tips specific to region and season
- Best local cafes/restaurants with price range
- Hidden gems (less touristy places) with cost estimates
- Local shopping spots with price info
- Best sunrise/sunset spots (free or paid)
- Cultural tips and etiquette
- Photography tips and good spots
- Activity costs should be per-person estimates that fit in the budget

IMPORTANT: Include realistic cost estimates for paid activities, entrance fees, or experiences

6. OPTIMIZED ITINERARY:
Generate EXACTLY {num_days} days.

STRICT FORMAT FOR EACH DAY:
Day X: Title

• 07:00 AM - Activity
• 09:00 AM - Activity
• 11:00 AM - Activity
• 01:00 PM - Activity
• 03:00 PM - Activity
• 06:00 PM - Activity
• 08:00 PM - Activity

RULES:
- Include realistic timings.
- Activities must match travel preferences.
- Activities should be geographically practical.
- Avoid impossible schedules.
- Include:
  - breakfast
  - sightseeing
  - relaxation
  - local exploration
  - dinner suggestions
- Mention famous attractions and hidden gems.
- Make itinerary feel premium and exciting.
- Do NOT repeat activities across days.
- Do NOT generate generic plans.
- Plans should feel personalized and intelligent.

VERY IMPORTANT:
- optimizedItinerary.days must contain EXACTLY {num_days} items.
- Every day string must already include proper formatting.
- Do NOT repeat Day headings multiple times.
- Keep response highly professional and tourism-quality.
"""


async def _upsert_user(user_id: str, email: str, full_name: str) -> None:
    await mongo.connect()
    email_norm = email.strip().lower()
    await mongo.collection("users").update_one(
        {"email": email_norm},
        {
            "$set": {
                "userId": user_id,
                "fullName": full_name,
                "updatedAt": datetime.now(timezone.utc),
            },
            "$setOnInsert": {"createdAt": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


def _summarize_preferences(preferences: str) -> str:
    if not preferences:
        return "your travel preferences"

    normalized = preferences.lower()
    phrases = []

    # Map user preference keywords to natural-sounding summary phrases.
    # Use general categories (e.g., 'sunrise', 'falls', 'caves') instead of specific place names.
    mapping = {
        'local culture': 'local cultural experiences',
        'culture': 'local cultural experiences',
        'lakeside': 'lakeside relaxation',
        'lake': 'lakeside experiences',
        'boating': 'boating and water activities',
        'view': 'scenic viewpoints',
        'sunrise': 'sunrise viewpoints',
        'caves': 'historic caves',
        'waterfall': 'waterfall excursions',
        'falls': 'waterfall excursions',
        'history': 'local history and heritage',
        'food': 'local cuisine and dining experiences',
        'adventure': 'adventure activities',
        'premium': 'premium travel comfort',
        'luxury': 'luxury experiences',
        'beach': 'beach relaxation and activities',
        'mountain': 'mountain scenery and trekking',
        'nature': 'nature and outdoor experiences',
        'wellness': 'spa and wellness retreats',
    }

    for keyword, phrase in mapping.items():
        if keyword in normalized and phrase not in phrases:
            phrases.append(phrase)

    if not phrases:
        return "your personalized travel interests"

    return ", ".join(phrases)


async def generate_plan(*, user_id: str, email: str, full_name: str, form: dict[str, Any]) -> dict[str, Any]:
    print(f"=== PLAN GENERATION START ===")
    print(f"User ID: {user_id}")
    print(f"Email: {email}")
    print(f"Full Name: {full_name}")
    print(f"Form: {form}")
    
    await mongo.connect()
    await _upsert_user(user_id, email, full_name)
    print("MongoDB connected and user upserted")

    cache_payload = {
        "origin": form["origin"],
        "destination": form["destination"],
        "startDate": form["startDate"],
        "endDate": form["endDate"],
        "budget": form["budget"],
        "transportMode": form["transportMode"],
        "travelType": form["travelType"],
        "numberOfPeople": form["numberOfPeople"],
        "preferences": form.get("preferences", ""),
    }
    key = _cache_key(cache_payload)

    cached = await mongo.collection("itineraries").find_one({"cacheKey": key})
    if cached and cached.get("data"):
        itinerary_id = cached.get("itineraryId") or str(uuid.uuid4())
        data = cached["data"]
    else:
        weather = await get_weather_insights(form["destination"], form["startDate"], form["endDate"])
        print(f"Weather insights: {weather[:100]}...")
        
        num_days = _days_from_dates(form["startDate"], form["endDate"])
        print(f"Number of days: {num_days}")

        prompt = _build_generation_prompt(form=form, num_days=num_days, weather=weather)
        print(f"Generated prompt ({len(prompt)} characters)")
        
        try:
            generation = await generate_json(prompt)
            print(f"AI generation successful")
            print(f"Generated keys: {list(generation.keys())}")
        except Exception as e:
            print(f"AI generation failed: {str(e)}")
            raise

        hotels = []
        for h in generation.get("hotels", [])[:10]:
            loc = h.get("location") or h.get("city") or ""
            hotels.append(
                {
                    "name": h.get("name"),
                    "price": h.get("price"),
                    "rating": h.get("rating"),
                    "location": loc,
                    "mapsLink": h.get("mapsLink")
                    or (_google_maps_link(loc) if loc else _google_maps_link(form["destination"])),
                }
            )

        optimized = generation.get("optimizedItinerary") or {}
        days = optimized.get("days") or []
        if isinstance(days, list):
            days = (days + [""])[:num_days]
        else:
            days = [""] * num_days

        itinerary_id = str(uuid.uuid4())
        data = {
            "itineraryId": itinerary_id,
            "weatherInsights": generation.get("weatherInsights") or weather,
            "transportDetails": generation.get("transportDetails") or "",
            "hotels": hotels,
            "costPredictor": generation.get("costPredictor") or "",
            "aiRecommendations": generation.get("aiRecommendations") or "",
            "optimizedItinerary": {"days": days},
        }

        await mongo.collection("itineraries").update_one(
            {"cacheKey": key},
            {
                "$set": {
                    "itineraryId": itinerary_id,
                    "cacheKey": key,
                    "userId": user_id,
                    "updatedAt": datetime.now(timezone.utc),
                    "data": data,
                }
            },
            upsert=True,
        )

    await mongo.collection("trips").insert_one(
        {
            "userId": user_id,
            "itineraryId": itinerary_id,
            "createdAt": datetime.now(timezone.utc),
            "form": {
                "origin": form["origin"],
                "destination": form["destination"],
                "startDate": form["startDate"],
                "endDate": form["endDate"],
                "budget": form["budget"],
                "transportMode": form["transportMode"],
                "travelType": form["travelType"],
                "numberOfPeople": form["numberOfPeople"],
                "preferences": form.get("preferences", ""),
            },
        }
    )

    days = data.get("optimizedItinerary", {}).get("days") or []
    # Clean up day text to avoid duplicate "Day X"
    formatted_days = []
    for i, d in enumerate(days):
        day_label = f"Day {i+1}:"
        content = d.strip()
        if content.lower().startswith(f"day {i+1}"):
            # If it already starts with "Day X:", just use it as is (normalizing colon if needed)
            formatted_days.append(content)
        else:
            formatted_days.append(f"{day_label} {content}")
    
    day_text = "\n\n".join(formatted_days)

    # Clean up recommendations to ensure bullet points
    raw_recs = data.get("aiRecommendations") or ""
    recs_list = [line.strip() for line in raw_recs.split('\n') if line.strip()]
    formatted_recs = ""
    for rec in recs_list:
        if rec.startswith(('•', '-', '*')):
            formatted_recs += f"• {rec[1:].strip()}\n"
        else:
            formatted_recs += f"• {rec}\n"

    subject = f"Your TripAdvisor itinerary ({form['destination']})"
    preferences_summary = _summarize_preferences(form.get('preferences', ''))
    body = (
        f"Hello {full_name},\n\n"
        f"Here is your personalized {len(days)}-day travel itinerary for your trip from {form['origin']} to {form['destination']}. This plan reflects {preferences_summary}, while staying aligned with your budget and travel details. The itinerary includes memorable local experiences, comfortable transportation, and premium sightseeing recommendations tailored for your trip.\n\n"
        f"{day_text}\n\n"
        f"We hope you have an amazing time exploring {form['destination']} and creating unforgettable memories.\n\n"
        f"If you capture beautiful moments during your trip, we would love to see them. Feel free to share your travel videos with us by uploading them to any social media platform and sending us the video link through the “Share Your Trip” section on our website.\n\n"
        f"Wishing you a safe, enjoyable, and wonderful journey. \n\n"
        f"Warm regards,\nTripAdvisor Team"
    )

    frontend_url = "https://tripwithbinod.netlify.app" if settings.is_production else settings.FRONTEND_URL
    trip_link = f"{frontend_url}/itinerary/{itinerary_id}"
    body_html = get_itinerary_email_html(form['destination'], body)

    email_sent = False
    try:
        print(f"Sending email to: {email}")
        await send_email(email, subject, body, body_html)
        email_sent = True
        print("Email sent successfully")
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        email_sent = False

    resp = data.copy()
    resp["itineraryId"] = itinerary_id
    resp["emailSent"] = email_sent
    resp["optimizedItinerary"] = data.get("optimizedItinerary", {})
    
    print(f"=== PLAN GENERATION COMPLETE ===")
    print(f"Response keys: {list(resp.keys())}")
    print(f"Itinerary ID: {itinerary_id}")
    print(f"Email sent: {email_sent}")
    
    return resp