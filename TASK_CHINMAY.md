# Coro — Chinmay's Tasks (AI Lead — Gemini + Room Service)

> **Branch:** `backend`
> **Your files:** `backend/services/gemini_service.py`, `backend/services/room_service.py`
> **Time budget:** ~3 hours remaining

---

## Status: What the E2E Run Confirmed ✅

Gemini arbitration is working after these fixes applied during e2e:
- Upgraded `google-genai` 1.14.0 → 1.65.0
- Disabled thinking tokens (`ThinkingConfig(thinking_budget=0)`) to prevent token budget exhaustion
- Increased `max_output_tokens` to 2000 (was 300, causing truncation)
- Robust markdown fence stripping with regex
- Weight normalisation after parsing
- Float clamping for density/brightness

The model (`gemini-2.5-flash`) returns valid JSON with 2-3 prompts, correct weights, and good musical reasoning.

---

## Task 1 — Add Input History for Smooth Transitions (HIGHEST IMPACT)

**Problem:** Gemini gets current inputs but has no memory of what was playing before. This means it might make jarring transitions (e.g., jazz → death metal in one tick).

**Fix in `backend/services/gemini_service.py`:**

The `_last_results` dict already stores previous results. Thread this into the prompt:

```python
def _format_inputs(self, inputs, bpm, density, brightness) -> str:
    lines = ["Current crowd inputs:"]
    for role, payload in inputs.items():
        lines.append(f"  - {role}: {payload}")
    lines.append(f"\nCurrent music state: BPM={bpm}, density={density}, brightness={brightness}")
    lines.append("\nSynthesize these into 2-3 Lyria weighted prompts.")
    return "\n".join(lines)
```

Update to pass the previous result too:

```python
async def arbitrate(self, room_id, current_inputs, current_bpm, current_density, current_brightness):
    ...
    user_input_summary = self._format_inputs(
        current_inputs, current_bpm, current_density, current_brightness,
        previous=self._last_results.get(room_id)
    )

def _format_inputs(self, inputs, bpm, density, brightness, previous=None) -> str:
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
```

---

## Task 2 — Honour Drummer BPM Directly

**Problem:** The arbitration prompt says "BPM from drummer input takes direct priority" but Gemini still generates a BPM value from scratch. If the Drummer sets 140, Gemini might return 110.

**Fix in `backend/services/gemini_service.py`:**

After parsing the JSON, override BPM if the drummer has explicitly set one:

```python
# In arbitrate(), after building `result`:
drummer_input = current_inputs.get("drummer", {})
if "bpm" in drummer_input:
    result = result.model_copy(update={"bpm": int(drummer_input["bpm"])})
    print(f"[Gemini] BPM locked to drummer's {result.bpm}")
```

---

## Task 3 — Wire Energy Controller Role

**Problem:** The `energy` role sends `{ "density": 0.8, "brightness": 0.4 }` but `room_service.py` stores it as raw dict. Gemini's prompt says "Current music state: density=..., brightness=..." — but it uses the stored room state, not the energy controller's input.

**Fix in `backend/services/room_service.py`:**

In `_tick_loop()`, before calling the callback, extract energy inputs to update room state:

```python
async def _tick_loop(self, room_id, callback):
    while True:
        await asyncio.sleep(4)
        if room_id not in self.rooms:
            break
        room = self.rooms[room_id]
        if not room.is_playing:
            continue

        # Apply energy controller inputs directly to room state
        energy_input = room.current_inputs.get("energy", {})
        if "density" in energy_input:
            room.density = float(energy_input["density"])
        if "brightness" in energy_input:
            room.brightness = float(energy_input["brightness"])

        print(f"[Room] Tick fired for room {room_id}, {len(room.current_inputs)} inputs")
        await callback(room_id, room.current_inputs, room.bpm, room.density, room.brightness)
```

Also add a log in `update_input()`:
```python
def update_input(self, room_id, role, payload):
    if room_id not in self.rooms:
        return
    self.rooms[room_id].current_inputs[role.value] = payload
    print(f"[Room] Input from {role.value}: {payload}")
```

---

## Task 4 — Tune Gemini for Lyria's Strengths

**Problem:** Gemini sometimes generates prompts that are too generic ("upbeat electronic music") or too literal ("120 BPM trap beat"). Lyria responds much better to evocative, sensory-rich descriptions.

**Update the system prompt in `backend/services/gemini_service.py`:**

Add a `Good/Bad prompt examples` section:

```
GOOD prompts (evocative, sensory, specific):
  - "pulsing trap beat with rolling chrome 808s, glassy hi-hats, and a dark cavernous reverb"
  - "warm lo-fi groove with dusty vinyl crackle, lazy jazz piano chords, and a sleepy bass line"
  - "euphoric trance build with sweeping synth pads, driving four-on-the-floor kick, and shimmering arpeggios"

BAD prompts (too generic or too literal):
  - "upbeat electronic music at 128 BPM" ← too literal
  - "dark music" ← too vague
  - "trap" ← just a genre label, no texture
```

---

## Task 5 — Add Gemini Retry on Parse Failure

**Problem:** If Gemini returns malformed JSON, we immediately fall back to the last result. But a single retry often succeeds.

**Fix in `backend/services/gemini_service.py`:**

Wrap the generate_content call with a single retry:

```python
for attempt in range(2):
    try:
        response = self.client.models.generate_content(...)
        # ... parse ...
        break  # success, stop retrying
    except json.JSONDecodeError as e:
        if attempt == 0:
            print(f"[Gemini] JSON parse error on attempt 1 for room {room_id}: {e}, retrying...")
            continue
        print(f"[Gemini] JSON parse error on attempt 2 for room {room_id}: {e}, using fallback")
        return self._last_results.get(room_id, DEFAULT_RESULT)
    except Exception as e:
        print(f"[Gemini] Arbitration failed for room {room_id}: {e}")
        return self._last_results.get(room_id, DEFAULT_RESULT)
```

---

## Running Your Tests

```bash
cd backend
source venv/bin/activate
python tests/test_gemini.py     # Gemini arbitration
python tests/test_full_flow.py  # Full pipeline (backend must be running)
```

After each fix, verify `test_gemini.py` still prints `✅ Gemini arbitration OK` with real Gemini-generated prompts (not the fallback default ones).

---

## Commit Format

```
feat: gemini input history for smooth transitions
fix: gemini honours drummer BPM directly
feat: energy controller role wired to room state
feat: gemini evocative prompt examples in system prompt
fix: gemini single retry on json parse failure
```

Branch: `backend` → merge to `main` when all tests pass.
