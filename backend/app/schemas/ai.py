from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class GeneratePlanRequest(BaseModel):
    fullName: str = Field(min_length=1, max_length=200)
    email: EmailStr
    origin: str = Field(min_length=2, max_length=500)
    destination: str = Field(min_length=2, max_length=500)
    startDate: str
    endDate: str
    budget: float = Field(ge=0)
    transportMode: Literal['Flight', 'Train', 'Bus', 'Car']
    travelType: Literal['Solo', 'Couple', 'Family', 'Group/Friends']
    numberOfPeople: int = Field(ge=1, le=50)
    preferences: str = Field(default='', max_length=2000)


class HotelModel(BaseModel):
    name: str | None = None
    price: float | None = None
    rating: float | None = None
    location: str
    mapsLink: str | None = None


class GeneratePlanResponse(BaseModel):
    itineraryId: str
    weatherInsights: str
    transportDetails: str
    hotels: list[HotelModel]
    costPredictor: str
    aiRecommendations: str
    optimizedItinerary: dict[str, Any]
    emailSent: bool


class ChatMessage(BaseModel):
    type: Literal['user', 'assistant']
    content: str


class ChatRequest(BaseModel):
    itineraryId: str
    question: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] | None = None


class ChatResponse(BaseModel):
    answer: str

