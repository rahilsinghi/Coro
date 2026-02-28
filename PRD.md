# 🎵 CrowdSynth — Product Requirements Document

> **Hackathon:** 8 Hours | **Date:** February 28, 2026  
> **Track:** Audio / Gemini and Music  
> **Stack:** React + Tailwind (Vercel) · FastAPI + WebSocket (Railway) · Lyria RealTime · Gemini 2.5 Flash

---

## 1. One-Line Pitch

> CrowdSynth turns every person in a room into a musician — one shared, never-stopping AI-generated music stream steered collectively in real time by the crowd's votes.

---

## 2. Problem Statement Alignment

**Track 1 — Gemini and Music:**  
*"Use Gemini to build real-time, personalized music experiences that evolve based on listener input."*

CrowdSynth satisfies this with:
- **Real-time** → Lyria RealTime WebSocket stream, music never stops
- **Personalized** → Each user's role contributes a unique dimension to the music
- **Evolves based on listener input** → Gemini arbitrates crowd inputs every 4 seconds into coherent Lyria prompts

---

## 3. Team & Ownership

| Person | Role | Domain |
|--------|------|--------|
| **R — Rahil** | Backend Lead | Lyria RealTime WebSocket client, audio chunking + broadcasting |
| **C — Chinmay** | AI Lead | Gemini arbitration engine, room state logic, input aggregation |
| **B — Bharath** | Infra Lead | FastAPI server skeleton, WebSocket room manager, Railway + Vercel deploy |
| **S — Sariya** | Frontend Lead | All React UI — role cards, audio player, visualizer, mobile layout |

---

## 4. User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Host opens crowdsynth.app → Creates Room → Gets QR Code   │
│                                                             │
│  Guests scan QR → Land on mobile page → Pick/get a Role    │
│                                                             │
│  Host presses PLAY → Lyria stream starts → Music plays     │
│  to EVERYONE (host screen + all guest phones)              │
│                                                             │
│  Guests interact with their role controls                   │
│  Every 4s: server collects inputs → Gemini arbitrates      │
│  → Lyria weighted prompts update → Music morphs LIVE       │
│                                                             │
│  Host screen shows: Visualizer + Live Influence Meter      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. The 5 Roles

Each participant is assigned one role. With 4 team members demoing, all 4 roles are covered.

| Role | Control | Maps To |
|------|---------|---------|
| 🥁 **The Drummer** | BPM Slider (60–160) | `bpm` in `LiveMusicGenerationConfig` |
| 🎸 **The Vibe Setter** | Text input — mood words | Weighted prompt text |
| 🎹 **The Instrumentalist** | Instrument tile grid | Weighted prompt text |
| 🌍 **The Genre DJ** | Genre tile grid | Weighted prompt text |
| 🔊 **The Energy Controller** | Density + Brightness sliders | `density`, `brightness` in config |

> **For 4-person demo:** Drummer, Vibe Setter, Genre DJ, Instrumentalist. Energy Controller can be merged into Genre DJ.

---

## 6. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vercel)                         │
│  React App                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Role Card│  │ Controls │  │Visualizer│  │InfluenceMeter  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│         │ WebSocket (wss://)                       ↑            │
└─────────┼────────────────────────────────────────┼─────────────┘
          │                                         │ audio chunks (binary)
          │ user inputs (JSON)                      │ + state updates (JSON)
          ▼                                         │
┌──────────────────────────────────────────────────────────────────┐
│                       BACKEND (Railway)                          │
│                                                                  │
│  FastAPI App                                                     │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │  WS Room Manager│    │  Lyria Service   │◄──── Lyria API     │
│  │  (B - Bharath)  │    │  (R - Rahil)     │      WebSocket     │
│  └────────┬────────┘    └──────┬───────────┘                    │
│           │ every 4s           │ audio chunks                   │
│           ▼                    ▼                                 │
│  ┌─────────────────┐    ┌──────────────────┐                    │
│  │ Gemini Service  │───►│  Prompt Updater  │                    │
│  │  (C - Chinmay)  │    │  (R - Rahil)     │                    │
│  └─────────────────┘    └──────────────────┘                    │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
   Google AI APIs
   ├── Lyria RealTime (lyria-realtime-exp) — WebSocket
   └── Gemini 2.5 Flash — REST/SDK
```

---

## 7. WebSocket Message Protocol

All messages are JSON except audio chunks which are binary (bytes).

### Client → Server

```jsonc
// User sends their current role input (sent on every control change)
{
  "type": "input_update",
  "room_id": "ROOM_ABC",
  "user_id": "uuid-xxx",
  "role": "genre_dj",          // drummer | vibe_setter | genre_dj | instrumentalist | energy
  "payload": {
    "genre": "trap",           // for genre_dj
    // OR
    "bpm": 112,                // for drummer
    // OR
    "mood": "dark tense",      // for vibe_setter
    // OR
    "instrument": "synth bass" // for instrumentalist
    // OR
    "density": 0.8,            // for energy
    "brightness": 0.4
  }
}

// Host creates room
{ "type": "create_room", "user_id": "uuid-host" }

// Guest joins
{ "type": "join_room", "room_id": "ROOM_ABC", "user_id": "uuid-xxx" }

// Host starts music
{ "type": "start_music", "room_id": "ROOM_ABC" }

// Host stops music
{ "type": "stop_music", "room_id": "ROOM_ABC" }
```

### Server → Client

```jsonc
// Room created confirmation
{ "type": "room_created", "room_id": "ROOM_ABC", "join_url": "https://..." }

// Joined confirmation + role assignment
{ "type": "joined", "room_id": "ROOM_ABC", "role": "genre_dj", "user_id": "uuid-xxx" }

// State update broadcast to all clients (every 4s after Gemini runs)
{
  "type": "state_update",
  "active_prompts": [
    { "text": "dark trap beat with synth bass", "weight": 0.6 },
    { "text": "tense orchestral strings", "weight": 0.3 }
  ],
  "bpm": 112,
  "current_inputs": {
    "drummer": { "bpm": 112 },
    "genre_dj": { "genre": "trap" },
    "vibe_setter": { "mood": "dark tense" },
    "instrumentalist": { "instrument": "synth bass" }
  },
  "influence_weights": {
    "drummer": 0.20,
    "genre_dj": 0.35,
    "vibe_setter": 0.25,
    "instrumentalist": 0.20
  }
}

// Error
{ "type": "error", "message": "Room not found" }

// Audio chunks → sent as raw binary (bytes), NOT JSON
// Frontend uses Web Audio API to queue and play
```

---

## 8. Gemini Arbitration Prompt (C — Chinmay owns this)

```python
ARBITRATION_SYSTEM_PROMPT = """
You are a real-time music director for a crowd-controlled generative music system.
Every few seconds you receive inputs from multiple people each controlling a different 
dimension of the music. Your job is to synthesize their inputs into 2-3 Lyria 
weighted prompts that:
1. Honor the dominant crowd preference
2. Blend conflicting inputs musically coherently
3. Maintain energy continuity (don't flip completely in one step)

Always return ONLY valid JSON in this exact format:
{
  "prompts": [
    { "text": "...", "weight": 0.0-1.0 },
    { "text": "...", "weight": 0.0-1.0 }
  ],
  "bpm": 60-160,
  "density": 0.0-1.0,
  "brightness": 0.0-1.0,
  "reasoning": "one sentence explanation"
}

Weights must sum to 1.0. Maximum 3 prompts. Be musically creative.
"""
```

---

## 9. Repository Structure

```
crowdsynth/
├── backend/
│   ├── main.py                    # B: FastAPI app, CORS, router registration
│   ├── routers/
│   │   └── ws.py                  # B: WebSocket endpoint + room routing
│   ├── services/
│   │   ├── lyria_service.py       # R: Lyria WebSocket client + audio broadcast
│   │   ├── gemini_service.py      # C: Gemini arbitration call
│   │   └── room_service.py        # C: Room state, input collection, 4s tick
│   ├── models/
│   │   └── schemas.py             # B: Pydantic models for all message types
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── railway.toml
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx               # S: React entry
│   │   ├── App.jsx                # S: Router setup
│   │   ├── pages/
│   │   │   ├── Home.jsx           # S: Create room / landing
│   │   │   ├── Host.jsx           # S: Host view — visualizer + QR
│   │   │   └── Guest.jsx          # S: Guest view — role controls
│   │   ├── components/
│   │   │   ├── RoleCard.jsx       # S: Role display + assignment
│   │   │   ├── AudioPlayer.jsx    # S: Web Audio API player (hook)
│   │   │   ├── AudioVisualizer.jsx# S: Canvas waveform visualizer
│   │   │   ├── InfluenceMeter.jsx # S: Pie/radial chart of live influence
│   │   │   ├── ActivePrompts.jsx  # S: Floating prompt word cloud
│   │   │   ├── controls/
│   │   │   │   ├── BPMSlider.jsx       # S: Drummer control
│   │   │   │   ├── MoodInput.jsx       # S: Vibe setter control
│   │   │   │   ├── GenreGrid.jsx       # S: Genre DJ tile grid
│   │   │   │   └── InstrumentGrid.jsx  # S: Instrumentalist tile grid
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js    # S: WS connection, message handler
│   │   │   └── useAudioPlayer.js  # S: Web Audio API buffer queue
│   │   ├── store/
│   │   │   └── roomStore.js       # S: Zustand global state
│   │   └── lib/
│   │       └── constants.js       # S: Genre list, instrument list, role defs
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
└── README.md
```

---

## 10. Environment Variables

### Backend (`backend/.env`)
```
GEMINI_API_KEY=your_google_ai_studio_key_here
FRONTEND_URL=https://your-app.vercel.app
PORT=8000
```

### Frontend (`frontend/.env`)
```
VITE_WS_URL=wss://your-backend.railway.app
VITE_API_URL=https://your-backend.railway.app
```

---

## 11. Hour-by-Hour Build Plan

### Hour 0–1 | Foundation (ALL)
| Person | Task |
|--------|------|
| **B** | Init repo, set up FastAPI skeleton, WebSocket endpoint stub, push to GitHub |
| **R** | Spike Lyria RealTime: confirm WebSocket connects, audio flows, log chunks |
| **C** | Spike Gemini call: confirm arbitration prompt returns valid JSON |
| **S** | Init Vite + React + Tailwind, set up router (Home/Host/Guest pages), push skeleton |

**End of Hour 1 checkpoint:** Lyria plays audio locally. Gemini returns JSON. FastAPI has a `/ws` endpoint. React app renders 3 pages.

---

### Hour 1–2 | Core Plumbing (R + C + B)
| Person | Task |
|--------|------|
| **B** | Build `RoomService` skeleton: create_room, join_room, store inputs per role. Wire up WS message routing |
| **R** | Build `LyriaService`: connect to Lyria WS, receive audio chunks, stub broadcast method |
| **C** | Build `GeminiService`: takes room state dict → returns arbitrated prompts JSON |
| **S** | Build `useWebSocket` hook, connect to backend WS, log all messages to console |

**End of Hour 2 checkpoint:** Backend can create/join rooms. Lyria is streaming audio on the backend. Gemini can arbitrate a hardcoded test input.

---

### Hour 2–4 | Integration Sprint (R + C + B)
| Person | Task |
|--------|------|
| **B** | Add 4-second tick loop in `RoomService` that calls Gemini → updates Lyria prompts → broadcasts state_update to all clients |
| **R** | Implement audio broadcast: chunk bytes → send binary to all WS clients in room |
| **C** | Wire `GeminiService` into the tick loop. Handle edge cases (empty inputs, bad JSON response) |
| **S** | Build `useAudioPlayer` hook: receive binary WS messages → Web Audio API buffer queue → continuous playback |

**End of Hour 4 checkpoint:** Full loop working — frontend receives audio chunks and plays them. State updates broadcast to all clients. Music changes when backend inputs change.

---

### Hour 4–5 | Role Controls UI (S, with B helping on API contract)
| Person | Task |
|--------|------|
| **S** | Build all 4 role control components. Each fires `input_update` WS message on change |
| **B** | Ensure backend correctly parses all 4 input types, stores in room state |
| **R** | Test full loop: change a role input → Gemini runs → Lyria updates → audio changes |
| **C** | Tune Gemini prompt for musical coherence. Add input history for smoother transitions |

**End of Hour 5 checkpoint:** All 4 roles functional end-to-end. Music audibly changes when controls move.

---

### Hour 5–6 | Visual Layer (S) + Stability (R + C + B)
| Person | Task |
|--------|------|
| **S** | Build AudioVisualizer (canvas waveform), InfluenceMeter (radial chart), ActivePrompts word cloud |
| **B** | Add reconnection logic to WS. Handle dropped clients gracefully |
| **R** | Add audio buffering/smoothing to prevent glitches between chunks |
| **C** | Add fallback: if Gemini fails, keep previous prompts. Add logging |

---

### Hour 6–7 | Deploy + End-to-End Test
| Person | Task |
|--------|------|
| **B** | Deploy backend to Railway. Set env vars. Test WS over internet |
| **S** | Deploy frontend to Vercel. Point to Railway WS URL. Test on mobile |
| **R** | Full integration test: 4 devices in room, all roles active, music playing |
| **C** | QR code generation for join URL. Polish room creation flow |

---

### Hour 7–8 | Polish + Demo Video
| Person | Task |
|--------|------|
| **ALL** | Rehearse 3-minute demo. Each person on their role device |
| **S** | Final UI polish — dark theme, animations, ensure mobile looks great |
| **B** | Record demo video (Loom). Submit to hackathon form |
| **R/C** | Prepare Q&A answers. Have architecture diagram ready |

---

## 12. MVP Definition (What MUST work for demo)

✅ Create a room → get QR code  
✅ 2+ devices join the room on their phones  
✅ Host presses Play → music streams to all devices  
✅ Changing any role control audibly changes the music within ~6 seconds  
✅ Influence meter updates live on host screen  
✅ Works over the internet (not just localhost)  

**Nice to have (if time permits):**  
⬜ Animated word cloud of active prompts  
⬜ Per-role visual feedback (pulse when your input is "winning")  
⬜ Room history — replay the session's musical journey  
⬜ Share button for the generated audio clip  

---

## 13. Risk Register & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Lyria RealTime audio latency too high | Medium | Pre-buffer 3–4 chunks before playback starts |
| Gemini returns malformed JSON | Medium | `try/except` with fallback to last valid prompts |
| Web Audio API cross-browser issues | Low | Test on Chrome first; it's the most reliable |
| Railway WebSocket drops on free tier | Medium | Add WS heartbeat ping/pong every 30s |
| Too many WS messages from fast UI changes | Medium | Debounce all control inputs by 500ms on frontend |
| CORS issues between Vercel and Railway | Low | Set `allow_origins` in FastAPI CORS middleware |

---

## 14. APIs & Keys Needed

1. **Google AI Studio API Key** → https://aistudio.google.com/apikey  
   - Used for both Lyria RealTime (`lyria-realtime-exp`) and Gemini 2.5 Flash  
   - Free tier is sufficient for the hackathon  
   - Add as `GEMINI_API_KEY` in Railway env vars

2. **No other external APIs needed.** QR code generation can be done client-side with a library (`qrcode.react`).

---

## 15. Key Dependencies

### Backend `requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
websockets==13.0
google-genai==1.0.0
python-dotenv==1.0.0
asyncio
pydantic==2.0.0
```

### Frontend `package.json` key deps
```json
{
  "react": "^18.3.0",
  "react-router-dom": "^6.26.0",
  "zustand": "^4.5.0",
  "qrcode.react": "^3.1.0",
  "recharts": "^2.12.0"
}
```
