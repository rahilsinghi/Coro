import asyncio
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

from services.gemini_service import gemini_service

async def test_gemini():
    print("Testing Gemini arbitration...")

    result = await gemini_service.arbitrate(
        room_id="TEST",
        current_inputs={
            "drummer": {"bpm": 120},
            "genre_dj": {"genre": "trap"},
            "vibe_setter": {"mood": "dark energetic"},
            "instrumentalist": {"instrument": "synth bass"}
        },
        current_bpm=100,
        current_density=0.5,
        current_brightness=0.5,
    )

    print(f"\n  Prompts returned: {len(result.prompts)}")
    for p in result.prompts:
        print(f"    - [{p.weight:.2f}] {p.text}")
    print(f"  BPM: {result.bpm}")
    print(f"  Density: {result.density}")
    print(f"  Brightness: {result.brightness}")
    print(f"  Reasoning: {result.reasoning}")

    assert len(result.prompts) >= 1, "❌ No prompts returned"
    assert 0.99 <= sum(p.weight for p in result.prompts) <= 1.01, "❌ Weights don't sum to 1.0"
    assert 60 <= result.bpm <= 200, f"❌ BPM {result.bpm} out of range"
    assert 0.0 <= result.density <= 1.0, "❌ Density out of range"
    assert 0.0 <= result.brightness <= 1.0, "❌ Brightness out of range"

    print("\n✅ Gemini arbitration OK")

asyncio.run(test_gemini())
