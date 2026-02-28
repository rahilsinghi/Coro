# Coro — Rahil's Tasks (Backend Lead — Lyria RealTime)

> **Branch:** `backend`
> **Your files:** `backend/services/lyria_service.py`
> **Time budget:** ~3 hours remaining

---

## Status: What the E2E Run Confirmed ✅

The full stack is working end-to-end:
- Lyria RealTime connects and streams 384KB audio chunks correctly
- Audio chunks broadcast over WebSocket to all room clients (tested)
- `test_full_flow.py` passes: room → start music → audio received → state_update received
- Gemini arbitration works (fixed thinking tokens + JSON parsing)

---

## Task 1 — Fix BPM Changes (CRITICAL — do this first)

**Problem:** `skill.md` section 8 says:
> BPM changes require `reset_context()` — calling `set_music_generation_config` with a new BPM alone won't work.

Right now in `lyria_service.py`, `update_prompts()` calls `set_music_generation_config(bpm=bpm, ...)` but never calls `reset_context()`. This means when the Drummer changes BPM, Lyria ignores it.

**Fix in `backend/services/lyria_service.py`:**

In `update_prompts()`, before calling `set_music_generation_config`, check if BPM has changed from the last known value. If it has, call `await session.reset_context()` first:

```python
async def update_prompts(self, room_id, prompts, bpm, density, brightness):
    session_data = self._sessions.get(room_id)
    if not session_data:
        return

    session = session_data["session"]
    last_bpm = session_data.get("bpm", None)

    try:
        # BPM change requires a context reset
        if last_bpm is not None and last_bpm != bpm:
            await session.reset_context()
            print(f"[Lyria] BPM changed {last_bpm}→{bpm} for room {room_id}, reset_context called")

        await session.set_music_generation_config(
            config=types.LiveMusicGenerationConfig(
                bpm=bpm,
                density=density,
                brightness=brightness,
                temperature=1.0,
            )
        )
        session_data["bpm"] = bpm

        await session.set_weighted_prompts(prompts=prompts)
        print(f"[Lyria] Updated prompts for room {room_id}: {[p.text for p in prompts]}")

    except Exception as e:
        print(f"[Lyria] Failed to update prompts for room {room_id}: {e}")
```

Also store initial bpm in `start_session()`:
```python
self._sessions[room_id] = {"session": session, "ctx": session_ctx, "bpm": initial_bpm}
```

**Test it:** Start music, wait for it to play, then verify BPM change in test_full_flow.py sends a different BPM and the music audibly changes speed.

---

## Task 2 — Improve Audio Pre-buffer

**Problem:** The current pre-buffer is 0.05s in `useAudioPlayer.js`:
```js
const startTime = Math.max(now + 0.05, nextPlayTimeRef.current)
```

This can cause choppy playback if chunks arrive slightly late. The `skill.md` test guide says: increase to `0.15` if choppy.

**Fix in `frontend/src/hooks/useAudioPlayer.js`:**
Change `now + 0.05` to `now + 0.15`.

> Note: This is in Sariya's file domain. Coordinate with her.

---

## Task 3 — Graceful Session Recovery

**Problem:** If the Lyria session drops mid-stream (network hiccup, quota error), the receive loop exits but the room still thinks it's playing. Clients stop getting audio silently.

**Fix in `backend/services/lyria_service.py`:**

In `_receive_audio_loop()`, if a non-CancelledError exception occurs and there's a `broadcast_callback`, send an error notification so the room can reset:

```python
except Exception as e:
    print(f"[Lyria] Receive loop error for room {room_id}: {e}")
    # Clean up session so host can restart
    self._sessions.pop(room_id, None)
    self._receive_tasks.pop(room_id, None)
```

---

## Task 4 — Run Multi-Device Integration Test

With the backend running locally, test from 2 real devices on the same WiFi:

1. Run uvicorn with `--host 0.0.0.0`:
   ```bash
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
2. Find your machine's local IP: `ipconfig getifaddr en0`
3. On your phone, open `http://[LOCAL_IP]:8000/health` — should return OK
4. Update `frontend/.env` temporarily to `VITE_WS_URL=ws://[LOCAL_IP]:8000/ws`
5. Restart the vite dev server
6. Open the frontend on both devices
7. Host on one, join on the other, verify audio plays on both

Document any issues found.

---

## Task 5 — Help with Railway Deploy (coordinate with Bharath)

Check the Railway config is ready:
- `backend/Dockerfile` — verify it copies `.env.example`, not `.env`
- `backend/railway.toml` — verify the start command
- Confirm `PORT` env var is used: in `main.py`, if needed, change uvicorn to read `PORT`:

```python
# In Dockerfile or railway.toml start command:
# uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## Commit Format

```
fix: lyria reset_context on BPM change
fix: lyria session recovery on receive loop error
```

Branch: `backend` → merge to `main` when working.

---

## Key Files

- `backend/services/lyria_service.py` — your file
- `backend/tests/test_lyria.py` — run this to verify Lyria still connects
- `backend/tests/test_full_flow.py` — run to verify end-to-end audio
