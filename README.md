# 🎵 CrowdSynth

> The crowd IS the music. Everyone plays. No skills required.

Built in 8 hours at a hackathon using **Google Lyria RealTime** + **Gemini 2.5 Flash**.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Google AI Studio API key → https://aistudio.google.com/apikey

---

### Backend (R, C, B)

```bash
cd backend
cp .env.example .env
# → Edit .env and add your GEMINI_API_KEY

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Test it: http://localhost:8000/health → `{"status":"ok"}`

---

### Frontend (S, and everyone for testing)

```bash
cd frontend
cp .env.example .env
# → Edit .env: VITE_WS_URL=ws://localhost:8000/ws

npm install
npm run dev
```

Open: http://localhost:3000

---

## Team Responsibilities

| Person | Files to own |
|--------|-------------|
| **R — Rahil** | `backend/services/lyria_service.py` |
| **C — Chinmay** | `backend/services/gemini_service.py`, `backend/services/room_service.py` |
| **B — Bharath** | `backend/main.py`, `backend/routers/ws.py`, `backend/models/schemas.py`, deployment |
| **S — Sariya** | Everything in `frontend/src/` |

---

## Architecture

```
React Frontend (Vercel)
    ↕ WebSocket (JSON + binary audio)
FastAPI Backend (Railway)
    ├── Lyria RealTime WebSocket → streams 48kHz stereo audio
    └── Gemini 2.5 Flash → arbitrates crowd inputs every 4s
```

---

## Deploy

### Backend → Railway
1. Push to GitHub
2. Create new Railway project → "Deploy from GitHub repo"
3. Set root directory: `backend`
4. Add env var: `GEMINI_API_KEY=...` and `FRONTEND_URL=https://your-app.vercel.app`
5. Railway auto-detects `railway.toml` and deploys

### Frontend → Vercel
1. Create new Vercel project → import from GitHub
2. Set root directory: `frontend`
3. Add env var: `VITE_WS_URL=wss://your-backend.railway.app/ws`
4. Deploy

---

## License
MIT — Built for CrowdSynth Hackathon 2026
