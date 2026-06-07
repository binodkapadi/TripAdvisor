import asyncio
from app.services.gemini_client import async_stream_text

async def main():
    print("Starting stream...")
    try:
        async for chunk in async_stream_text("Tell me about the Weather of destination?", use_search=True):
            print("CHUNK:", chunk)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
