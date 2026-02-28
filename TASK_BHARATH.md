# Coro — Bharath's Tasks (Infra Lead — Deploy + Backend Structure)

> **Branch:** `backend` (infra work), then merge to `main` before deploy
> **Your files:** `backend/main.py`, `backend/routers/ws.py`, `backend/models/schemas.py`, deploy config
> **Time budget:** ~3 hours remaining

---

## Status: What the E2E Run Confirmed ✅

Backend is fully functional locally:
- FastAPI server starts, `/health` returns 200
- WebSocket handles create_room, join_room, start_music, stop_music, input_update
- Lyria + Gemini wired and tested end-to-end
- `google-genai` upgraded to 1.65.0 in `requirements.txt`

---

## Task 1 — Deploy to Railway (CRITICAL — do this first)

### Step 1: Set up Railway project

1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select the `Coro` repo
3. Set the **Root Directory** to `backend/`
4. Railway will auto-detect the `Dockerfile`

### Step 2: Set environment variables in Railway

In the Railway dashboard → Variables tab, add:
```
GEMINI_API_KEY=AIzaSyA9_M4ZQmq-0Nxr9DD7oN0Ir82IpnF79xU
FRONTEND_URL=https://your-vercel-app.vercel.app   ← update after Sariya deploys
PORT=8000
```

### Step 3: Verify Dockerfile is correct

Read `backend/Dockerfile`. It should use the right start command. If not, update:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### Step 4: Verify railway.toml

Check `backend/railway.toml` has the correct build and start commands.

### Step 5: Test the deployed backend

Once deployed, Railway gives you a URL like `https://coro-backend.railway.app`:
```bash
curl https://coro-backend.railway.app/health
# Should return: {"status":"ok","service":"crowdsynth-backend"}

# Test WebSocket with wscat:
npx wscat -c wss://coro-backend.railway.app/ws
# Send: {"type":"create_room","user_id":"test123"}
# Should get back: {"type":"room_created","room_id":"ABC123",...}
```

---

## Task 2 — Fix CORS for Production

**Problem:** `backend/main.py` currently has:
```python
allow_origins=[os.getenv("FRONTEND_URL", "*")]
```

This is correct, but `FRONTEND_URL` in `.env` is a placeholder. For local dev it falls back to `*` (fine). For Railway, you must set it to the Vercel URL.

**Additional fix:** Allow both prod URL and localhost for dev convenience:

```python
# In main.py, after load_dotenv():
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
ALLOWED_ORIGINS = [FRONTEND_URL]
if FRONTEND_URL != "*":
    ALLOWED_ORIGINS.append("http://localhost:3000")  # local dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Task 3 — Add Energy Role to Schemas

**Problem:** `backend/models/schemas.py` has `ENERGY = "energy"` in the `Role` enum, but `InputPayload` doesn't explicitly validate the energy role's fields (`density`, `brightness`).

Currently it works because `InputPayload` has optional `density: Optional[float]` and `brightness: Optional[float]`. This is correct — **no change needed** unless Pydantic is rejecting payloads. Just verify it works by running `test_ws.py` with an energy input.

---

## Task 4 — Add Reconnection Handling to WS

**Problem:** When a client disconnects and reconnects (e.g., phone screen turns off), they rejoin as a new connection but the `user_roles` dict in `room_service` still has their old role. This means they'd get the `ENERGY` fallback role on rejoin instead of their original role.

**Fix in `backend/services/room_service.py`:**

Store which user_id → role mapping persistently (not cleared on disconnect):

Currently:
```python
def remove_connection(self, room_id, user_id, ws):
    ...
    self.user_roles.pop(user_id, None)  ← this forgets their role
```

Change to preserve the role:
```python
def remove_connection(self, room_id, user_id, ws):
    if room_id in self.connections:
        self.connections[room_id].discard(ws)
    if room_id in self.user_sockets:
        self.user_sockets[room_id].pop(user_id, None)
    # DON'T remove from user_roles — let them rejoin with same role
```

And in `join_room()`, check if user already has a role:
```python
def join_room(self, room_id, user_id, ws):
    ...
    # If reconnecting, reuse existing role
    if user_id in self.user_roles:
        assigned_role = self.user_roles[user_id]
    else:
        # Assign new role
        taken_roles = set(self.user_roles.values())
        ...
```

---

## Task 5 — Record Demo Video

When both Railway and Vercel are deployed:

1. Open Loom (loom.com) and start recording your screen + webcam
2. Demo flow (3 minutes):
   - Show the homepage: "This is Coro — anyone in the room can control the music"
   - Click Host a Room → show QR code + room code
   - Open 3 other tabs/devices and join with the room code
   - Show each person's role card
   - Click Start Music → show the "● LIVE" indicator + audio visualizer
   - Each person changes their control → show the music description updating every 4 seconds
   - Show the Influence Meter showing who's contributing most
   - Explain Gemini arbitration in 1 sentence: "Every 4 seconds, Gemini synthesizes all inputs into music prompts"
3. End on the host screen showing all prompts + visualizer

Submit the Loom URL with the hackathon submission.

---

## Task 6 — Architecture Diagram for Q&A

Create a simple diagram (can be ASCII or draw.io) showing:
```
[4 Phones] → WebSocket → [FastAPI on Railway]
                              ├── RoomService (manages connections)
                              ├── GeminiService (arbitrates every 4s)
                              └── LyriaService → [Lyria RealTime API]
                                                     ↓
                              ← audio bytes ← ← ← [48kHz PCM]
[All Browsers] → Web Audio API → Speaker
```

Print this or have it on a second screen for when judges ask "how does this work?"

---

## Commit Format

```
chore: fix dockerfile for railway deploy
fix: cors allow both prod and localhost origins
fix: ws room reconnection preserves user role
```

Branch: `backend` → merge to `main` after local tests pass. Then trigger Railway redeploy.

---

## Key Files

- `backend/main.py` — CORS config (your file)
- `backend/routers/ws.py` — WebSocket handler (your file)
- `backend/models/schemas.py` — Pydantic models (your file)
- `backend/Dockerfile` — Docker config (your file)
- `backend/railway.toml` — Railway config (your file)
