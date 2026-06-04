from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    # Mongo
    MONGODB_URI: str
    MONGODB_DBNAME: str

    # Base URL for OAuth redirects
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    # Brevo
    BREVO_API_KEY: str | None = None

    # SerpAPI
    SERPAPI_KEY: str | None = None

    # OpenWeather
    OPENWEATHER_API_KEY: str | None = None

    # Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_MODELS: str = (
        "gemini-2.5-flash,"
        "gemini-2.0-flash,"
        "gemini-flash-latest,"
        "gemini-3.1-flash-lite,"
        "gemini-2.0-flash-lite,"
        "gemini-flash-lite-latest,"
        "gemini-2.5-flash-lite-preview-09-2025,"
        "gemini-2.5-flash-lite,"
        "gemini-2.5-flash-preview-09-2025"
    )

    # Email (SMTP)
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAIL_FROM: str | None = None
    SENDER_EMAIL: str | None = None
    SENDER_NAME: str = "TripAdvisor"
    NOTIFY_EMAIL: str = "binoddattkapadi@gmail.com"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"

    # OAuth
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    LINKEDIN_CLIENT_ID: str | None = None
    LINKEDIN_CLIENT_SECRET: str | None = None

    # Security / rate limiting
    RATE_LIMIT_DEFAULT: str = "60/minute"


settings = Settings()

