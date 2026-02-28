"""
Gemini Service — C (Chinmay)
Takes the current room inputs and arbitrates them into Lyria weighted prompts.
"""
import json
import os
import re
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types as genai_types
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
- bpm must be an integer between 60 and 160
- density must be a decimal float between 0.0 and 1.0 (e.g. 0.7, not "High")
- brightness must be a decimal float between 0.0 and 1.0 (e.g. 0.3, not "Low")
- Prompt text should be evocative and musical (e.g. "dark trap beat with heavy 808s and eerie synths")

Good prompts (evocative, sensory, specific):
  - "pulsing trap beat with rolling chrome 808s, glassy hi-hats, and a dark cavernous reverb"
  - "warm lo-fi groove with dusty vinyl crackle, lazy jazz piano chords, and a sleepy bass line"
  - "euphoric trance build with sweeping synth pads, driving four-on-the-floor kick, and shimmering arpeggios"

Bad prompts (too generic or too literal):
  - "upbeat electronic music at 128 BPM" — too literal
  - "dark music" — too vague
  - "trap" — just a genre label, no texture
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

        user_input_summary = self._format_inputs(
            current_inputs, current_bpm, current_density, current_brightness,
            previous=self._last_results.get(room_id),
        )

        for attempt in range(2):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=user_input_summary,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=ARBITRATION_SYSTEM_PROMPT,
                        temperature=0.7,
                        max_output_tokens=2000,
                        thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
                    ),
                )

                raw_text = (response.text or "").strip()
                # Strip markdown fences if present
                match = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw_text)
                if match:
                    raw_text = match.group(1).strip()

                data = json.loads(raw_text)
                prompts = [WeightedPrompt(**p) for p in data["prompts"]]
                # Normalise weights so they always sum to exactly 1.0
                total = sum(p.weight for p in prompts)
                if total > 0:
                    for p in prompts:
                        p.weight = round(p.weight / total, 3)
                # Clamp density and brightness to [0.0, 1.0]
                density = max(0.0, min(1.0, float(data["density"])))
                brightness = max(0.0, min(1.0, float(data["brightness"])))
                result = ArbitrationResult(
                    prompts=prompts,
                    bpm=max(60, min(200, int(data["bpm"]))),
                    density=density,
                    brightness=brightness,
                    reasoning=data.get("reasoning", ""),
                )

                # Honour drummer BPM directly — drummer input takes priority
                drummer_input = current_inputs.get("drummer", {})
                if "bpm" in drummer_input:
                    result = result.model_copy(update={"bpm": int(drummer_input["bpm"])})
                    print(f"[Gemini] BPM locked to drummer's {result.bpm}")

                self._last_results[room_id] = result
                print(f"[Gemini] Room {room_id} → {result.reasoning}")
                return result

            except json.JSONDecodeError as e:
                if attempt == 0:
                    print(f"[Gemini] JSON parse error on attempt 1 for room {room_id}: {e}, retrying...")
                    continue
                print(f"[Gemini] JSON parse error on attempt 2 for room {room_id}: {e}, using fallback")
                return self._last_results.get(room_id, DEFAULT_RESULT)

            except Exception as e:
                print(f"[Gemini] Arbitration failed for room {room_id}: {e}")
                return self._last_results.get(room_id, DEFAULT_RESULT)

    def _format_inputs(
        self,
        inputs: Dict[str, Any],
        bpm: int,
        density: float,
        brightness: float,
        previous: Optional[ArbitrationResult] = None,
    ) -> str:
        lines = ["Current crowd inputs:"]
        for role, payload in inputs.items():
            lines.append(f"  - {role}: {payload}")
        lines.append(f"\nCurrent music state: BPM={bpm}, density={density:.2f}, brightness={brightness:.2f}")
        if previous:
            prev_texts = [f'"{p.text}" (weight {p.weight:.2f})' for p in previous.prompts]
            lines.append(f"\nPrevious prompts (maintain continuity from these):")
            for t in prev_texts:
                lines.append(f"  - {t}")
        lines.append("\nSynthesize 2-3 new Lyria weighted prompts that smoothly evolve from the previous ones.")
        return "\n".join(lines)


# Singleton
gemini_service = GeminiService()
