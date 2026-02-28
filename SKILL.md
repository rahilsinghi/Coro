---
name: coro
description: Source of truth for the Coro real-time crowd-controlled music app. Use when writing or modifying code in this project — backend (FastAPI, Lyria, Gemini, WebSocket), frontend (React, Tailwind, Zustand), or when following team ownership, WebSocket protocol, or demo rules.
---

# CORO — Claude Agent Skill File

> Read this entire file before writing a single line of code.
> This is the source of truth for how code is written, structured, and shipped in this project.
> Every Claude session on every teammate's machine must follow these rules exactly.

---

## 0. Project Snapshot

**Coro** is a real-time crowd-controlled music app built in 8 hours at a hackathon.

- A room of people each control one dimension of a live AI-generated music stream
- **Lyria RealTime** (`lyria-realtime-exp`) generates continuous 48kHz stereo audio via WebSocket
- **Gemini 2.5 Flash** arbitrates all crowd inputs into weighted music prompts every 4 seconds
- Audio chunks stream from backend → all connected browser clients simultaneously

```
React + Tailwind (Vercel)
    ↕ WebSocket — JSON messages + raw binary audio
FastAPI + Python (Railway)
    ├── LyriaService   → manages Lyria WebSocket session per room
    ├── GeminiService  → arbitrates crowd inputs every 4s
    └── RoomService    → manages room state, connections, tick loop
```

**Stack:**
- Frontend: React 18, Vite, Tailwind CSS, Zustand, React Router v6
- Backend: Python 3.11, FastAPI, uvicorn, google-genai SDK, Pydantic v2
- Deploy: Vercel (frontend), Railway (backend)

---

## 1. Team & File Ownership

**Never edit a file that belongs to another teammate without telling them.**

| Owner | Files |
|-------|-------|
| **R — Rahil** | `backend/services/lyria_service.py` |
| **C — Chinmay** | `backend/services/gemini_service.py`, `backend/services/room_service.py` |
| **B — Bharath** | `backend/main.py`, `backend/routers/ws.py`, `backend/models/schemas.py`, all deploy config |
| **S — Sariya** | Everything under `frontend/src/` |

**Shared files** (coordinate before editing):
- `backend/models/schemas.py` — any schema change affects everyone
- `backend/requirements.txt` — add deps carefully, announce in chat
- `frontend/src/lib/constants.js` — shared constants, announce changes

---

## 2. The Golden Rules

These are non-negotiable. Every Claude session must follow them.

### 2.1 Never break the running demo
The most important constraint in a hackathon is that **main always works**.
- Do all experimental work on a feature branch
- Only merge to main when something is fully working end-to-end
- If you're not sure if a change breaks something, **don't push to main**

### 2.2 Fix the root cause, never patch symptoms
If a test is failing, find out why and fix it properly.
Do not add `try/except` to silence errors, do not skip assertions, do not add `time.sleep()` hacks.

### 2.3 One concern per function
Every function does exactly one thing. If you can't describe a function in one sentence, split it.

### 2.4 If you add a dependency, document why
Add a comment above every non-obvious import explaining what it does and why it's needed.

### 2.5 Leave the code cleaner than you found it
If you touch a file, fix any obvious issues you see even if they're not part of your task.

---

## 3. Python Backend — Rules

### 3.1 File structure
Every Python file must have a docstring at the top with:
- What the file does in one sentence
- Which teammate owns it
- Any critical notes for other teammates

```python
"""
Lyria Service — R (Rahil)
Manages the persistent WebSocket connection to Lyria RealTime.
Receives audio chunks and broadcasts them to all clients in a room.

NOTE for teammates: lyria_service is a singleton. Do not instantiate it.
Import and use: from services.lyria_service import lyria_service
"""
```

### 3.2 Async rules
- All service methods that touch the network MUST be `async def`
- Never use `asyncio.sleep()` as a workaround — only use it in tick loops
- Never block the event loop — no `time.sleep()`, no synchronous file I/O in async functions
- Use `asyncio.create_task()` for background work, always store the task reference

```python
# CORRECT
task = asyncio.create_task(self._tick_loop(room_id, callback))
self._tick_tasks[room_id] = task

# WRONG — fire and forget, can't cancel it
asyncio.create_task(self._tick_loop(room_id, callback))
```

### 3.3 Error handling
Every network call (Lyria, Gemini) must have explicit error handling with a **logged message and a sane fallback**.

```python
# CORRECT
try:
    result = await gemini_service.arbitrate(...)
    return result
except Exception as e:
    print(f"[GeminiService] arbitrate() failed: {e}")
    return self._last_results.get(room_id, DEFAULT_RESULT)  # always return something

# WRONG — bare except, no fallback
try:
    result = await gemini_service.arbitrate(...)
except:
    pass
```

### 3.4 Logging format
Use this exact prefix format so logs are scannable:

```
[ServiceName] action description — context
```

Examples:
```python
print(f"[Lyria] Starting session for room {room_id}")
print(f"[Lyria] Receive loop error for room {room_id}: {e}")
print(f"[Gemini] Room {room_id} → {result.reasoning}")
print(f"[WS] Client disconnected: user={user_id}, room={room_id}")
print(f"[Room] Tick fired for room {room_id}, {len(inputs)} inputs")
```

### 3.5 Pydantic models
- All WebSocket message types are defined in `models/schemas.py`
- Never pass raw dicts between services — always use the Pydantic models
- If you need a new message type, add it to `schemas.py` first, then implement it

### 3.6 Singletons
The three services (`lyria_service`, `gemini_service`, `room_service`) are **module-level singletons**.
Always import the instance, never instantiate the class:

```python
# CORRECT
from services.lyria_service import lyria_service
await lyria_service.start_session(room_id)

# WRONG
from services.lyria_service import LyriaService
service = LyriaService()  # creates a second instance, breaks everything
```

### 3.7 Environment variables
Never hardcode secrets or URLs. Always use `os.getenv()` with a clear error if missing:

```python
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not set — check backend/.env")
```

---

## 4. Frontend — Rules

### 4.1 Component structure
Every component file follows this exact order:
1. Imports (React first, then libraries, then local)
2. Any constants local to this component
3. The default export function
4. No other named exports in the same file

```jsx
// 1. Imports
import React, { useState, useCallback } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { GENRES } from '../../lib/constants.js'

// 2. Local constants (if any)
const MAX_SELECTIONS = 3

// 3. Default export
export default function GenreGrid() {
  // ...
}
```

### 4.2 State management rules
- **Global state** (room ID, role, music state, connection) → Zustand `roomStore`
- **Local UI state** (what's selected, hover states, form inputs) → `useState`
- Never put UI state in Zustand. Never put shared room state in `useState`.

```jsx
// CORRECT — role is shared, goes in Zustand
const role = useRoomStore((s) => s.role)

// CORRECT — which tile is highlighted is local UI, stays in useState
const [selected, setSelected] = useState(null)
```

### 4.3 WebSocket sends
Every control component sends input updates via `sendInput` from `useWebSocket`.
Always debounce slider/continuous inputs at **500ms minimum**:

```jsx
// For sliders — debounce
const handleChange = useCallback((e) => {
  const val = Number(e.target.value)
  setBpm(val)
  // Debounce: only send after user stops moving for 300ms
  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    sendInput(userId, roomId, 'drummer', { bpm: val })
  }, 300)
}, [userId, roomId, sendInput])

// For tile clicks — send immediately, no debounce needed
const handleSelect = useCallback((genre) => {
  setSelected(genre)
  sendInput(userId, roomId, 'genre_dj', { genre })
}, [userId, roomId, sendInput])
```

### 4.4 Tailwind class rules
- Use the custom `cs-*` color tokens defined in `tailwind.config.js`, not raw hex colors
- Use the `.card`, `.btn-primary`, `.btn-secondary`, `.tile`, `.tile-active` utility classes from `index.css`
- Never use inline `style={{ }}` except for dynamic values (like chart colors)
- Mobile-first: every component must look correct on a 375px wide screen

```jsx
// CORRECT — uses design tokens and utility classes
<div className="card">
  <button className="btn-primary w-full">Start</button>
</div>

// WRONG — raw colors, not mobile-first
<div style={{ background: '#12121a', padding: 20 }}>
  <button style={{ background: '#7c3aed' }}>Start</button>
</div>
```

### 4.5 Audio handling
- All audio playback goes through `useAudioPlayer` hook — never create `AudioContext` directly in components
- Always call `unlock()` from `useAudioPlayer` on the first user gesture (button click, touch)
- Audio chunks from WebSocket are binary (`ArrayBuffer`) — check `instanceof ArrayBuffer` before processing

### 4.6 Hooks rules
- Hooks live in `src/hooks/` — one hook per file
- Custom hooks must start with `use`
- Never call hooks conditionally — follow React's rules of hooks strictly

---

## 5. WebSocket Protocol — The Contract

This is the agreed message format between frontend and backend.
**Any change here requires both S (frontend) and B (backend) to update simultaneously.**

### Client → Server (JSON)

```jsonc
// Create a room (host only)
{ "type": "create_room", "user_id": "uuid" }

// Join an existing room
{ "type": "join_room", "room_id": "ABC123", "user_id": "uuid" }

// Start music (host only)
{ "type": "start_music", "room_id": "ABC123", "user_id": "uuid" }

// Stop music (host only)
{ "type": "stop_music", "room_id": "ABC123", "user_id": "uuid" }

// Send role input (any participant)
{
  "type": "input_update",
  "room_id": "ABC123",
  "user_id": "uuid",
  "role": "drummer",          // drummer | vibe_setter | genre_dj | instrumentalist | energy
  "payload": { "bpm": 120 }  // payload shape depends on role (see section 6)
}
```

### Server → Client (JSON)

```jsonc
// Room was created
{ "type": "room_created", "room_id": "ABC123", "join_url": "?room_id=ABC123", "role": "drummer" }

// Successfully joined
{ "type": "joined", "room_id": "ABC123", "role": "genre_dj", "user_id": "uuid" }

// Music started
{ "type": "music_started" }

// Music stopped
{ "type": "music_stopped" }

// State update (every 4s after Gemini tick)
{
  "type": "state_update",
  "active_prompts": [{ "text": "dark trap beat", "weight": 0.6 }, ...],
  "bpm": 120,
  "density": 0.7,
  "brightness": 0.4,
  "current_inputs": { "drummer": { "bpm": 120 }, ... },
  "influence_weights": { "drummer": 0.25, "genre_dj": 0.35, ... },
  "gemini_reasoning": "Blending trap with dark ambient..."
}

// Error
{ "type": "error", "message": "Room not found" }

// Heartbeat (ignore)
{ "type": "ping" }
```

### Server → Client (Binary)
Raw audio bytes — `Int16Array`, 48kHz, stereo, interleaved `[L, R, L, R, ...]`

---

## 6. Role Payload Shapes

These are the exact payload structures for each role's `input_update`.

```jsonc
// drummer
{ "bpm": 120 }                              // int, 60–200

// vibe_setter
{ "mood": "dark tense energetic" }          // space-separated words, max 3

// genre_dj
{ "genre": "trap" }                         // single string from GENRES constant

// instrumentalist
{ "instrument": "synth bass and piano" }    // max 2, joined with " and "

// energy
{ "density": 0.8, "brightness": 0.4 }      // both floats 0.0–1.0
```

---

## 7. Gemini Arbitration — Rules for C (Chinmay)

The arbitration prompt is the creative core of Coro. These rules govern how it should behave.

### What Gemini must always return
```json
{
  "prompts": [
    { "text": "descriptive musical phrase", "weight": 0.6 },
    { "text": "second musical phrase", "weight": 0.4 }
  ],
  "bpm": 120,
  "density": 0.6,
  "brightness": 0.5,
  "reasoning": "one sentence"
}
```

### Constraints
- 2–3 prompts max, never 1 and never 4+
- Weights must sum exactly to 1.0 — normalise after parsing if needed
- BPM from drummer input takes direct priority — don't let Gemini invent a different BPM
- Prompt text should be **evocative and specific**, not generic (bad: "upbeat music", good: "punchy trap beat with rolling 808s and crisp hi-hats")
- Maintain musical continuity — don't flip from jazz to metal in one tick

### Fallback chain
1. Gemini returns valid JSON → use it
2. Gemini returns malformed JSON → log error, use `_last_results[room_id]`
3. No previous result → use `DEFAULT_RESULT` (ambient electronic)

---

## 8. Lyria RealTime — Rules for R (Rahil)

### Critical behaviours
- One Lyria session per room — never open two sessions for the same room
- Always call `session.play()` before expecting audio chunks
- BPM changes require `reset_context()` — calling `set_music_generation_config` with a new BPM alone won't work
- `density` and `brightness` can be changed live without reset
- If the session drops, log it clearly and let the room stay without music rather than crashing

### Audio chunk format
Lyria outputs: `Int16`, 48kHz, 2 channels (stereo), interleaved
Frontend `useAudioPlayer.js` expects exactly this format — don't transform it

### Broadcast pattern
```python
# The only correct way to send audio to clients
await room_service.broadcast_bytes(room_id, chunk.data)
# Never send directly to individual WebSocket connections from LyriaService
```

---

## 9. Git Workflow

### Branch names
```
main              ← always demo-ready
backend           ← R, C, B work here
frontend          ← S works here
fix/short-name    ← quick fixes
feat/short-name   ← new features if time permits
test/e2e-scaffold ← initial E2E test branch
```

### Commit message format
```
type: short description

Types: feat | fix | chore | test | style | docs
```

Examples:
```
feat: add BPM slider debounce
fix: normalise Gemini prompt weights
chore: rename crowdsynth to coro
test: add full flow e2e test
```

### Merge rules
- Never force push to `main`
- Always pull before pushing: `git pull origin main`
- Resolve conflicts locally before pushing
- If you break main, fixing it is your top priority — announce immediately in team chat

---

## 10. Before Asking for Help

Run through this checklist before escalating to a teammate or Claude:

**Backend issue:**
- [ ] Is the venv active? (`source venv/bin/activate`)
- [ ] Are all deps installed? (`pip install -r requirements.txt`)
- [ ] Is `backend/.env` set with a valid `GEMINI_API_KEY`?
- [ ] What does the uvicorn log say exactly?
- [ ] Did you check the `[ServiceName]` log lines?

**Frontend issue:**
- [ ] Did `npm install` run without errors?
- [ ] Is `frontend/.env` set with `VITE_WS_URL=ws://localhost:8000/ws`?
- [ ] Is the backend running on port 8000?
- [ ] What does the browser console say?
- [ ] Is the WS connection green on the Home page?

**Lyria issue:**
- [ ] Did `test_lyria.py` pass before you started?
- [ ] Is the API key valid and has credits?
- [ ] Is the model name still `models/lyria-realtime-exp`? (check https://ai.google.dev/gemini-api/docs/models)

---

## 11. What NOT to Do

These are the most common ways to waste time in a hackathon. Avoid all of them.

| Don't | Do instead |
|-------|-----------|
| Refactor working code during the hackathon | Only refactor if it's blocking a feature |
| Add a new library without checking with the team | Ask first — deps can conflict |
| Silence errors with bare `except: pass` | Log the error and return a fallback |
| Copy-paste code between files | Extract a shared function |
| Use `console.log` everywhere and forget to remove | Use descriptive logs, clean up before demo |
| Hardcode room IDs or user IDs for testing | Use `uuid()` always |
| Skip mobile testing | Check on 375px width before every commit |
| Leave TODO comments in demo code | Either implement it or delete the comment |
| Use `any` types or skip Pydantic validation | Define the schema, validate everything |
| Open the Lyria session before confirming the API key works | Run `test_lyria.py` first |

---

## 12. Demo Day Checklist

Run through this before the judges arrive:

**Technical:**
- [ ] Backend deployed on Railway, `/health` returns 200
- [ ] Frontend deployed on Vercel, loads on mobile
- [ ] `GEMINI_API_KEY` set in Railway env vars
- [ ] `VITE_WS_URL` set to production Railway URL in Vercel
- [ ] QR code points to production URL (not localhost)
- [ ] Tested with 4 real devices on different networks

**Demo flow:**
- [ ] R: has device ready with Host view loaded
- [ ] C: has device ready, knows Gemini reasoning will show on screen
- [ ] B: has laptop with architecture diagram ready for Q&A
- [ ] S: has mobile with guest controls, knows which role to demonstrate

**Pitch:**
- [ ] Everyone has practiced the 3-minute flow at least once
- [ ] Judges are handed the join URL/QR within the first 30 seconds
- [ ] Bluetooth speaker is charged and connected
- [ ] Backup: localhost demo ready if internet is flaky

---

## 13. Quick Reference — Key Files

```
backend/
├── main.py                   # B: FastAPI app + CORS
├── routers/ws.py             # B: WebSocket endpoint, message routing, wiring
├── models/schemas.py         # B: All Pydantic message types
├── services/
│   ├── lyria_service.py      # R: Lyria WebSocket client + audio broadcast
│   ├── gemini_service.py     # C: Gemini arbitration
│   └── room_service.py       # C: Room state + 4s tick loop
│
frontend/src/
├── App.jsx                   # S: Router
├── pages/
│   ├── Home.jsx              # S: Create/join room
│   ├── Host.jsx              # S: Visualizer + QR + play button
│   └── Guest.jsx             # S: Role controls
├── components/
│   ├── AudioVisualizer.jsx   # S: Canvas waveform
│   ├── InfluenceMeter.jsx    # S: Recharts pie chart
│   ├── ActivePrompts.jsx     # S: Live prompt display
│   └── controls/             # S: BPMSlider, MoodInput, GenreGrid, InstrumentGrid
├── hooks/
│   ├── useWebSocket.js       # S: WS connection + message handler
│   └── useAudioPlayer.js     # S: Web Audio API buffer queue
├── store/roomStore.js        # S: Zustand global state
└── lib/constants.js          # S: GENRES, INSTRUMENTS, MOODS, ROLES
```
