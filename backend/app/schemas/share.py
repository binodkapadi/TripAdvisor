from pydantic import BaseModel, HttpUrl, Field


class ShareVideoRequest(BaseModel):
    videoUrl: str = Field(min_length=5, max_length=800)

