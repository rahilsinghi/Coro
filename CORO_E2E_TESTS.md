# Coro — Agent E2E Test & Fix Guide

> **For:** Claude Code agent running on Rahil's machine  
> **Branch:** `test/e2e-scaffold`  
> **Goal:** Verify every layer of the scaffold works, fix any issues found, and confirm the full data flow from WebSocket → Gemini → Lyria → audio chunks is live.

---

## Pre-flight

```bash
# Create and switch to test branch
git checkout -b test/e2e-scaffold
```

Make sure these two files exist with real values before starting:

```
backend/.env        ← must have GEMINI_API_KEY=...
frontend/.env       ← must have VITE_WS_URL=ws://localhost:8000/ws
```

---

## Test 1 — Python dependencies install cleanly

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Pass:** No errors.  
**Fix if fail:** Check Python version is 3.11+. Run `python --version`.

---

## Test 2 — Backend server starts

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

In a second terminal:

```bash
curl http://localhost:8000/health
```

**Pass:** Returns `{"status":"ok","service":"crowdsynth-backend"}`  
**Fix if fail:** Check for import errors in the uvicorn startup log. Most likely a missing package — run `pip install -r requirements.txt` again.

---

## Test 3 — Lyria RealTime API connection

Create this file at `backend/tests/test_lyria.py`:

```python
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
```

Run it:

```bash
cd backend
source venv/bin/activate
python tests/test_lyria.py
```

**Pass:** Prints 5 chunk lines and `🎵 Lyria OK`.  
**Fix if fail — API key error:** Double-check `GEMINI_API_KEY` in `backend/.env` is valid and has no quotes or spaces.  
**Fix if fail — model not found:** The model string may have changed. Try `models/lyria-realtime-exp` → check https://ai.google.dev/gemini-api/docs/models for the latest name and update `lyria_service.py`.  
**Fix if fail — quota exceeded:** You've hit the free tier limit. Wait 60 seconds and retry, or confirm the $20 credits are active on this key.

---

## Test 4 — Gemini arbitration returns valid JSON

Create `backend/tests/test_gemini.py`:

```python
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
```

Run it:

```bash
cd backend
source venv/bin/activate
python tests/test_gemini.py
```

**Pass:** Prints prompts with weights and `✅ Gemini arbitration OK`.  
**Fix if fail — JSON parse error:** The Gemini response has markdown fences. The `gemini_service.py` already strips them, but if it's still failing, add a `print(raw_text)` line before the `json.loads()` call in `gemini_service.py` to see what's coming back, then fix the stripping logic.  
**Fix if fail — weight sum assertion:** Gemini occasionally returns weights that don't sum to exactly 1.0. Add a normalisation step in `gemini_service.py` after parsing:

```python
total = sum(p.weight for p in result.prompts)
for p in result.prompts:
    p.weight = round(p.weight / total, 3)
```

---

## Test 5 — WebSocket room lifecycle (backend only)

Create `backend/tests/test_ws.py`:

```python
import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_ws():
    print("Testing WebSocket room lifecycle...")
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())

    # ── Test create room ──────────────────────────────────────────
    async with websockets.connect(WS_URL) as host_ws:
        await host_ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        msg = json.loads(await host_ws.recv())
        print(f"  create_room response: {msg}")
        assert msg["type"] == "room_created", f"❌ Expected room_created, got {msg['type']}"
        assert "room_id" in msg, "❌ No room_id in response"
        room_id = msg["room_id"]
        print(f"  ✅ Room created: {room_id}")

        # ── Test join room ─────────────────────────────────────────
        async with websockets.connect(WS_URL) as guest_ws:
            await guest_ws.send(json.dumps({
                "type": "join_room",
                "room_id": room_id,
                "user_id": guest_id
            }))
            join_msg = json.loads(await guest_ws.recv())
            print(f"  join_room response: {join_msg}")
            assert join_msg["type"] == "joined", f"❌ Expected joined, got {join_msg['type']}"
            assert join_msg["room_id"] == room_id, "❌ Wrong room_id"
            assert join_msg["role"] is not None, "❌ No role assigned"
            print(f"  ✅ Guest joined with role: {join_msg['role']}")

        # ── Test bad room join ─────────────────────────────────────
        async with websockets.connect(WS_URL) as bad_ws:
            await bad_ws.send(json.dumps({
                "type": "join_room",
                "room_id": "BADROOM",
                "user_id": str(uuid.uuid4())
            }))
            err_msg = json.loads(await bad_ws.recv())
            assert err_msg["type"] == "error", f"❌ Expected error for bad room, got {err_msg['type']}"
            print(f"  ✅ Bad room correctly returns error: {err_msg['message']}")

    print("\n✅ WebSocket room lifecycle OK")

asyncio.run(test_ws())
```

Run it (backend must still be running from Test 2):

```bash
cd backend
source venv/bin/activate
pip install websockets  # if not already installed
python tests/test_ws.py
```

**Pass:** All three assertions pass and prints `✅ WebSocket room lifecycle OK`.  
**Fix if fail — connection refused:** Backend isn't running. Start it first: `uvicorn main:app --reload --port 8000`.  
**Fix if fail — role is None:** The role assignment in `room_service.py` has a bug. Check `join_room()` — the host creates the room AND joins it, so their role is assigned in `create_room`. The guest role assignment loop may be hitting `taken_roles` incorrectly. Debug by printing `taken_roles` inside the loop.

---

## Test 6 — Input update flows through to room state

Add this to `backend/tests/test_ws.py` or run separately:

```python
import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_input_update():
    print("Testing input update flow...")
    host_id = str(uuid.uuid4())

    async with websockets.connect(WS_URL) as ws:
        # Create room
        await ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        create_msg = json.loads(await ws.recv())
        room_id = create_msg["room_id"]
        role = create_msg["role"]
        print(f"  Room: {room_id}, Role: {role}")

        # Send an input update
        await ws.send(json.dumps({
            "type": "input_update",
            "user_id": host_id,
            "room_id": room_id,
            "role": role,
            "payload": {"bpm": 130}
        }))

        # No response expected for input_update, but no error either
        # Verify internal state via a short wait (no crash = pass)
        await asyncio.sleep(0.5)
        print("  ✅ Input update sent without error")

    print("\n✅ Input update OK")

asyncio.run(test_input_update())
```

---

## Test 7 — Full integration: start music, receive audio via WebSocket

This is the big one — it starts music and confirms audio bytes actually arrive over WebSocket.

Create `backend/tests/test_full_flow.py`:

```python
import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_full_flow():
    print("Testing full flow: create room → start music → receive audio bytes...")
    host_id = str(uuid.uuid4())

    async with websockets.connect(WS_URL) as ws:
        ws.max_size = 10 * 1024 * 1024  # 10MB for audio

        # 1. Create room
        await ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        create_msg = json.loads(await ws.recv())
        room_id = create_msg["room_id"]
        print(f"  ✅ Room created: {room_id}")

        # 2. Send some inputs
        await ws.send(json.dumps({
            "type": "input_update",
            "user_id": host_id,
            "room_id": room_id,
            "role": "genre_dj",
            "payload": {"genre": "lo-fi"}
        }))

        # 3. Start music
        await ws.send(json.dumps({
            "type": "start_music",
            "user_id": host_id,
            "room_id": room_id
        }))

        # 4. Wait for music_started confirmation
        music_started = False
        audio_chunk_count = 0
        state_update_received = False

        print("  Waiting for music_started + audio chunks...")

        async def collect():
            nonlocal music_started, audio_chunk_count, state_update_received
            async for message in ws:
                if isinstance(message, bytes):
                    audio_chunk_count += 1
                    print(f"    🎵 Audio chunk #{audio_chunk_count} — {len(message)} bytes")
                    if audio_chunk_count >= 3:
                        break
                else:
                    msg = json.loads(message)
                    if msg["type"] == "music_started":
                        music_started = True
                        print(f"    ✅ music_started received")
                    elif msg["type"] == "state_update":
                        state_update_received = True
                        print(f"    ✅ state_update received: {msg.get('active_prompts', [])}")

        try:
            await asyncio.wait_for(collect(), timeout=20.0)
        except asyncio.TimeoutError:
            print("  ⚠️  Timed out waiting — partial results:")

        # 5. Stop music
        await ws.send(json.dumps({
            "type": "stop_music",
            "user_id": host_id,
            "room_id": room_id
        }))

        print(f"\n  music_started: {music_started}")
        print(f"  audio chunks received: {audio_chunk_count}")
        print(f"  state_update received: {state_update_received}")

        assert music_started, "❌ music_started was never received"
        assert audio_chunk_count >= 1, "❌ No audio chunks received over WebSocket"

        print("\n✅ Full flow OK — audio is streaming end-to-end!")

asyncio.run(test_full_flow())
```

Run it (backend still running):

```bash
cd backend
source venv/bin/activate
python tests/test_full_flow.py
```

**Pass:** Receives `music_started`, then audio chunk bytes, prints `✅ Full flow OK`.  
**Fix if fail — no audio chunks:** The `broadcast_bytes` callback between `lyria_service` and `room_service` isn't wired. Check `routers/ws.py` — confirm `lyria_service.broadcast_callback = _audio_broadcast_callback` is set at module level (it should be).  
**Fix if fail — timeout before music_started:** Lyria is taking too long to start. Increase `timeout=20.0` to `timeout=40.0`. If still failing, check Lyria session errors in the uvicorn log.  
**Fix if fail — state_update not received:** The 4-second tick loop isn't firing. Check `room_service.start_tick_loop()` is being called in `ws.py` after `start_music`. Also confirm `room.is_playing = True` is set before the tick loop starts.

---

## Test 8 — Frontend renders without errors

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in browser.

**Pass:** Home page renders with "Coro" heading, "Host a Room" button, join code input, and a green/yellow connection dot.

**Fix if fail — Tailwind not working (unstyled page):** Run `npx tailwindcss init` and confirm `postcss.config.js` exists.  
**Fix if fail — blank page:** Open browser console. Most likely a missing import. Check each `import` in `App.jsx` — all page files must exist.  
**Fix if fail — WS connection never goes green:** Backend isn't running or `VITE_WS_URL` is wrong in `frontend/.env`. Confirm it reads `ws://localhost:8000/ws` exactly.

---

## Test 9 — Frontend ↔ Backend WebSocket handshake in browser

With both backend (`port 8000`) and frontend (`port 3000`) running:

1. Open http://localhost:3000
2. Connection dot should turn **green** within 2 seconds
3. Click **"Host a Room"**
4. You should be navigated to `/host` with a room code and QR code visible

**Pass:** Room code appears (e.g. `A3F7B2`), QR code renders, Influence Meter shows "Waiting for participants...".

**Fix if fail — stays on Home / no navigation:** Open browser DevTools → Network → WS tab. Check if the WebSocket connection shows messages. If `room_created` message is received but navigation doesn't happen, the promise in `createRoom()` in `useWebSocket.js` isn't resolving — add a `console.log` inside the message handler to debug.

---

## Test 10 — Guest joins on same machine (two tabs)

1. Tab 1: http://localhost:3000 → Host a Room → note the room code
2. Tab 2: http://localhost:3000 → type the room code → Join

**Pass:** Tab 2 navigates to `/guest` and shows a role card (e.g. "🎹 The Instrumentalist").  
**Fix if fail:** Same WebSocket debugging as Test 9. Check `join_room` handler in `ws.py` isn't returning `error` instead of `joined`.

---

## Test 11 — End-to-end audio in browser

With both tabs open from Test 10:

1. Tab 1 (Host): Click **"▶ Start Music"**
2. Tab 2 (Guest): Tap the screen once (to unlock Web Audio API)
3. Tab 2 (Guest): Change a control (e.g. pick a genre, move BPM slider)
4. Wait ~5 seconds

**Pass:** 
- Tab 1 shows `● LIVE` indicator
- Audio visualizer bars animate
- Tab 2 shows active prompts updating every ~4 seconds
- Influence Meter pie chart shows segments

**Fix if fail — no audio in browser:** Web Audio API needs a user gesture to unlock. Confirm `unlock()` is called in `useAudioPlayer.js` on button click. Also check browser console for `AudioContext` errors.  
**Fix if fail — audio plays but very choppy:** The buffer queue in `useAudioPlayer.js` needs tuning. Increase the pre-buffer delay: change `Math.max(now + 0.05, ...)` to `Math.max(now + 0.15, ...)`.  
**Fix if fail — music never changes after input:** The 4-second tick loop is running but Gemini is failing silently and falling back to default prompts. Check uvicorn logs for `[Gemini]` lines.

---

## All Tests Pass — Commit

```bash
cd ..   # back to repo root
git add .
git commit -m "test: e2e scaffold verified — all 11 tests pass"
git push origin test/e2e-scaffold
```

Then open a PR from `test/e2e-scaffold` → `main` and merge. Everyone pulls main and starts their Hour 1 tasks from the PRD.

---

## Quick Reference — What Each Log Line Means

| Log line | Means |
|----------|-------|
| `[Lyria] Starting session for room ABC` | Lyria WS session opening |
| `[Lyria] Audio receive loop started for room ABC` | Lyria streaming has begun |
| `[Lyria] Updated prompts for room ABC` | Gemini tick fired, prompts changed |
| `[Gemini] Room ABC → reasoning text` | Arbitration succeeded |
| `[Gemini] Arbitration failed for room ABC: ...` | Gemini error — check API key / quota |
| `[WS] Client disconnected: user=... room=...` | Normal disconnect on tab close |
| `🎵 Audio chunk #N — XXXX bytes` | (test script only) Lyria is streaming |

---

## If Something Is Badly Broken

Post the exact error + which test number failed. The most likely issues in order of probability:

1. **`GEMINI_API_KEY` not loaded** — dotenv path is wrong. Try hardcoding the key temporarily to confirm.
2. **`lyria-realtime-exp` model name changed** — Check https://ai.google.dev/gemini-api/docs/models for current experimental model name.
3. **`v1alpha` API version rejected** — Try `v1beta` in `lyria_service.py`.
4. **WebSocket binary frames not arriving in browser** — Chrome handles this fine; Safari may need `ws.binaryType = 'arraybuffer'` explicitly set in `useWebSocket.js`.
5. **Railway/Vercel deploy specific issues** — Only relevant after local tests pass. Cross that bridge when you get there.