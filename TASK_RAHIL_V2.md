# TASK: Drop Button — Rahil

> **Feature**: When 3+ users press "DROP" within 2 seconds, the music does a coordinated bass drop.
> **Time budget**: 1.5 hours

## Why this is demo-gold
The audience physically coordinates pressing a button together and the music reacts. Judges see crowd agency in real time.

## Architecture

```
Guest presses DROP → input_update {type: "drop"} → room_service collects drops
→ 3+ drops in 2s window? → override Gemini with DROP prompt → Lyria blasts it
```

## Implementation (2 files)

### 1. `backend/services/room_service.py` — Drop coordination

Add a drop tracker to `__init__`:
```python
# room_id → list of timestamps
self._drop_presses: Dict[str, list] = {}
```

Add a method to record a drop and check if threshold is met:
```python
import time

def record_drop(self, room_id: str) -> bool:
    """Record a drop press. Returns True if 3+ drops within 2 seconds."""
    now = time.time()
    presses = self._drop_presses.setdefault(room_id, [])
    presses.append(now)
    # Remove presses older than 2 seconds
    self._drop_presses[room_id] = [t for t in presses if now - t <= 2.0]
    count = len(self._drop_presses[room_id])
    print(f"[Room] DROP press for {room_id}: {count} in window")
    if count >= 3:
        self._drop_presses[room_id] = []  # Reset after triggering
        print(f"[Room] 🔥 DROP TRIGGERED for {room_id}!")
        return True
    return False
```

### 2. `backend/routers/ws.py` — Route drop messages

Add a new handler in the message loop (after `input_update`):
```python
# ── DROP ─────────────────────────────────────────────────────
elif msg_type == "drop":
    if not room_id:
        continue
    triggered = room_service.record_drop(room_id)
    if triggered:
        # Override Gemini — force a drop prompt directly to Lyria
        from google.genai import types as drop_types
        drop_prompts = [
            drop_types.WeightedPrompt(
                text="massive bass drop with thundering sub-bass, distorted 808 kick, building tension release, crowd energy explosion",
                weight=0.7
            ),
            drop_types.WeightedPrompt(
                text="intense electronic drop with rapid-fire hi-hats, aggressive synth stabs, maximum energy peak moment",
                weight=0.3
            ),
        ]
        room = room_service.rooms.get(room_id)
        if room:
            await lyria_service.update_prompts(
                room_id=room_id,
                prompts=drop_prompts,
                bpm=min(room.bpm + 20, 160),  # Spike BPM
                density=1.0,   # Max density
                brightness=0.3, # Dark and heavy
            )
            await room_service.broadcast_json(room_id, {
                "type": "drop_triggered",
                "message": "🔥 DROP!"
            })
    else:
        # Broadcast drop count so UI can show building pressure
        count = len(room_service._drop_presses.get(room_id, []))
        await room_service.broadcast_json(room_id, {
            "type": "drop_progress",
            "count": count,
            "needed": 3,
        })
```

### 3. Tell Sariya (see TASK_SARIYA_V2.md for her UI specs)

## Testing
1. Open 3 browser tabs to localhost
2. Create room in tab 1, join in tabs 2 and 3
3. Start music
4. In browser console of each tab, quickly send:
   ```js
   // Paste in each tab's console within 2 seconds:
   document.querySelector('[data-ws]')?.__ws?.send(JSON.stringify({type:"drop",user_id:"test",room_id:"ROOMID"}))
   ```
5. Verify server logs show `🔥 DROP TRIGGERED` and `drop_triggered` broadcast

## Commit
```bash
git add backend/services/room_service.py backend/routers/ws.py
git commit -m "feat: coordinated drop button — 3+ presses in 2s triggers bass drop"
git push origin main
```
