import asyncio
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

async def test_lyria():
    api_key = os.getenv("GEMINI_API_KEY")
    assert api_key, "❌ GEMINI_API_KEY not set in backend/.env"

    print("Connecting to Lyria RealTime...")
    client = genai.Client(
        api_key=api_key,
        http_options={"api_version": "v1alpha"}
    )

    chunk_count = 0
    total_bytes = 0

    async with client.aio.live.music.connect(model="models/lyria-realtime-exp") as session:
        await session.set_weighted_prompts(
            prompts=[types.WeightedPrompt(text="upbeat electronic music", weight=1.0)]
        )
        await session.set_music_generation_config(
            config=types.LiveMusicGenerationConfig(bpm=120, temperature=1.0)
        )
        await session.play()

        async for message in session.receive():
            if message.server_content and message.server_content.audio_chunks:
                for chunk in message.server_content.audio_chunks:
                    chunk_count += 1
                    total_bytes += len(chunk.data)
                    print(f"  ✅ Chunk #{chunk_count} — {len(chunk.data)} bytes")
            if chunk_count >= 5:
                break

    assert chunk_count >= 5, f"❌ Only got {chunk_count} chunks, expected 5"
    print(f"\n🎵 Lyria OK — {chunk_count} chunks, {total_bytes} bytes total")

asyncio.run(test_lyria())
