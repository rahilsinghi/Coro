# CORO v2 — Smooth Transitions, Free-Text Prompts & Room Polish

> Updated: Feb 28, 2025 — Rahil's changes (Lyria + Gemini) are in progress. Bharath + Sariya: please start your tasks below.

## What Changed

Music was changing too abruptly on each tick. We're fixing this with:
1. **BPM clamping** (±10/tick) — so tempo ramps gradually instead of jumping
2. **Stronger Gemini continuity** — prompts must share ≥60% content with previous; only add/remove one element per tick
3. **Free-text prompt input** — every role gets a text box to describe what they want to hear
4. **Room cap** — max 10 users per room
5. **Stale input clearing** — inputs consumed after each tick

---

## Task Assignment

### ✅ Rahil (IN PROGRESS — do NOT touch these files)
- `backend/services/lyria_service.py` — BPM clamping ±10/tick ✅
- `backend/services/gemini_service.py` — Continuity prompt + custom_prompt passthrough ✅
- `backend/services/room_service.py` — Room cap + stale input clearing

### 🔧 Bharath — `backend/routers/ws.py`
**Handle room-full rejection** — when `join_room` returns `None`, send error instead of crashing:
```python
# In the join_room handler (after line: role = room_service.join_room(...)):
if role is None:
    await websocket.send_json({"type": "error", "message": "Room is full (max 10 players)"})
    continue
```
That's it — one change, ~3 lines.

### 🎨 Sariya — Frontend (3 files)

**1. `frontend/src/pages/Guest.jsx`** — Add free-text prompt input below each role's controls:
```jsx
{/* Add after the role controls section (line ~64) */}
<div className="mt-4 card">
  <p className="text-xs text-cs-muted mb-2">✨ Describe what you want to hear</p>
  <div className="flex gap-2">
    <input
      type="text"
      placeholder={PROMPT_HINTS[role]}
      className="flex-1 bg-cs-bg border border-cs-border rounded-lg px-3 py-2 text-sm text-white placeholder-cs-muted/50"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          sendInput(userId, roomId, role, { custom_prompt: e.target.value.trim() })
          e.target.value = ''
        }
      }}
    />
  </div>
</div>
```
Import `PROMPT_HINTS` from `../lib/constants.js` and `sendInput` from `useWebSocket`.

**2. `frontend/src/lib/constants.js`** — Add prompt hints:
```js
export const PROMPT_HINTS = {
  drummer: 'e.g. "fast hi-hats with trap rolls"',
  vibe_setter: 'e.g. "make it feel like a sunset drive"',
  genre_dj: 'e.g. "blend afrobeat with lo-fi"',
  instrumentalist: 'e.g. "add a dreamy harp melody"',
  energy: 'e.g. "build up slowly then drop"',
}
```

**3. `frontend/src/pages/Home.jsx`** — Show "Room Full" when join returns error with that message.

---

## Git Workflow
```bash
git pull origin main          # get latest (Rahil's changes)
git checkout -b your-branch   # e.g. fix/room-full or feat/free-text-prompt
# make changes
git add . && git commit -m "your message"
git push origin your-branch
# create PR → merge to main
```
