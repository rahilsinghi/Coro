# TASK: Applause Meter — Bharath

> **Feature**: Phone microphone detects crowd noise → louder = more intense music.
> **Time budget**: 1 hour
> **Files**: `backend/routers/ws.py`, `backend/main.py`

## Why this is demo-gold
The audience doesn't even need to join the app. They just clap or cheer, and the music reacts. The phone acts as a noise sensor.

## How it works
1. Frontend (Sariya) uses Web Audio API to get microphone volume level (0.0–1.0)
2. Frontend sends `applause_update` messages every 500ms with the volume level
3. Backend receives it and stores it as a room-level "crowd energy" signal
4. This feeds into the existing energy/density inputs that Gemini already reads

## Implementation

### 1. `backend/routers/ws.py` — Route applause messages

Add a new handler in the message loop (after `input_update`):
```python
# ── APPLAUSE UPDATE ──────────────────────────────────────────
elif msg_type == "applause_update":
    if not room_id:
        continue
    volume = msg.get("volume", 0.0)
    volume = max(0.0, min(1.0, float(volume)))
    room = room_service.rooms.get(room_id)
    if room:
        # Store applause as a synthetic energy input
        # Blend with existing density: higher cheering = higher density
        current_density = room.density
        # Smooth blend: 30% mic input, 70% existing state
        blended_density = round(current_density * 0.7 + volume * 0.3, 2)
        room.current_inputs["crowd_energy"] = {
            "applause_volume": round(volume, 2),
            "blended_density": blended_density,
        }
        # Broadcast the applause level so host UI can show a meter
        await room_service.broadcast_json(room_id, {
            "type": "applause_level",
            "volume": round(volume, 2),
        })
```

### 2. `backend/main.py` — No changes needed
The existing CORS and WebSocket setup already handle this.

### 3. Tell Sariya (see TASK_SARIYA_V2.md for her UI specs)

## Key Design Decisions
- **30/70 blend** prevents the mic from dominating — it's an additive influence
- **500ms throttle** on the frontend prevents flooding the WebSocket
- We reuse the `current_inputs` dict with key `"crowd_energy"` so Gemini sees it naturally
- Volume is clamped to [0.0, 1.0] server-side for safety

## Testing
1. Start music in a room
2. In browser console, simulate applause:
   ```js
   // Simulate loud applause
   ws.send(JSON.stringify({type:"applause_update", user_id:"test", room_id:"ROOMID", volume: 0.9}))
   ```
3. Verify server logs show the crowd_energy input
4. Verify `applause_level` broadcast is sent to all clients

## Commit
```bash
git add backend/routers/ws.py
git commit -m "feat: applause meter — mic volume feeds crowd energy into music"
git push origin main
```
