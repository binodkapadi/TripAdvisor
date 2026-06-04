from pydantic import BaseModel, Field


class ProfilePhotoRequest(BaseModel):
    imageBase64: str = Field(min_length=20)
    mimeType: str | None = None

