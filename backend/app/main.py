from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from .api.routes import router as api_router
from .db.mongo import mongo
from .core.rate_limiter import limiter
from .core.config import settings
from .services.user_service import ensure_user_indexes

app = FastAPI(title="TripAdvisor Backend")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"GLOBAL ERROR: {str(exc)}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

app.include_router(api_router)


@app.on_event("startup")
async def on_startup() -> None:
    await mongo.connect()
    await mongo.ensure_indexes()
    await ensure_user_indexes()

