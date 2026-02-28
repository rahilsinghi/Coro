"""
Gemini Service — C (Chinmay)
Takes the current room inputs and arbitrates them into Lyria weighted prompts.
"""
import json
import os
from typing import Dict, Any, List
from google import genai
from models.schemas import WeightedPrompt, ArbitrationResult

ARBITRATION_SYSTEM_PROMPT = """
You are a real-time music director for a crowd-controlled generative music system.
Every few seconds you receive inputs from multiple people each controlling a different 
dimension of the music. Your job is to synthesize their inputs into 2-3 Lyria 
weighted prompts that:
1. Honor the dominant crowd preference
2. Blend conflicting inputs musically coherently  
3. Maintain energy continuity — don't flip completely from one style to another in one step
4. Keep prompts descriptive: include genre, instruments, mood, and energy level

Always return ONLY valid JSON — no markdown, no backticks, no explanation outside JSON.
Exact format:
{
  "prompts": [
    { "text": "...", "weight": 0.6 },
    { "text": "...", "weight": 0.4 }
  ],
  "bpm": 100,
  "density": 0.5,
  "brightness": 0.5,
  "reasoning": "one sentence"
}

Rules:
- 2 or 3 prompts max
- Weights must sum exactly to 1.0
- bpm must be integer between 60 and 160
- density and brightness must be floats between 0.0 and 1.0
- Prompt text should be evocative and musical (e.g. "dark trap beat with heavy 808s and eerie synths")
"""

# Fallback prompts used when Gemini fails
DEFAULT_RESULT = ArbitrationResult(
    prompts=[WeightedPrompt(text="ambient electronic music with soft synth pads", weight=1.0)],
    bpm=100,
    density=0.5,
    brightness=0.5,
    reasoning="Default fallback",
)


class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"
        # Keep track of previous result for smooth transitions
        self._last_results: Dict[str, ArbitrationResult] = {}

    async def arbitrate(
        self,
        room_id: str,
        current_inputs: Dict[str, Any],
        current_bpm: int,
        current_density: float,
        current_brightness: float,
    ) -> ArbitrationResult:
        """
        Takes all current role inputs and returns arbitrated Lyria prompts.
        Falls back to previous result if Gemini fails.
        """
        if not current_inputs:
            return self._last_results.get(room_id, DEFAULT_RESULT)

        user_input_summary = self._format_inputs(current_inputs, current_bpm, current_density, current_brightness)

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=user_input_summary,
                config={
                    "system_instruction": ARBITRATION_SYSTEM_PROMPT,
                    "temperature": 0.7,
                    "max_output_tokens": 300,
                }
            )

            raw_text = response.text.strip()
            # Strip any accidental markdown fences
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]

            data = json.loads(raw_text)
            result = ArbitrationResult(
                prompts=[WeightedPrompt(**p) for p in data["prompts"]],
                bpm=int(data["bpm"]),
                density=float(data["density"]),
                brightness=float(data["brightness"]),
                reasoning=data.get("reasoning", ""),
            )
            self._last_results[room_id] = result
            print(f"[Gemini] Room {room_id} → {result.reasoning}")
            return result

        except Exception as e:
            print(f"[Gemini] Arbitration failed for room {room_id}: {e}")
            # Return last known good result, or default
            return self._last_results.get(room_id, DEFAULT_RESULT)

    def _format_inputs(
        self,
        inputs: Dict[str, Any],
        bpm: int,
        density: float,
        brightness: float,
    ) -> str:
        lines = ["Current crowd inputs:"]
        for role, payload in inputs.items():
            lines.append(f"  - {role}: {payload}")
        lines.append(f"\nCurrent music state: BPM={bpm}, density={density}, brightness={brightness}")
        lines.append("\nSynthesize these into 2-3 Lyria weighted prompts.")
        return "\n".join(lines)


# Singleton
gemini_service = GeminiService()
