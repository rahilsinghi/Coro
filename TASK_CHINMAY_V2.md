# TASK: Musical Timeline — Chinmay

> **Feature**: Host screen shows a scrolling timeline of every input and Gemini decision.
> **Time budget**: 1.5 hours
> **Files**: `room_service.py`, `gemini_service.py`

## What it looks like
A scrolling feed on the host's screen showing:
```
12:30:05  🥁 Drummer set BPM to 140
12:30:08  🎸 Vibe Setter chose "Euphoric"
12:30:12  🤖 Gemini: "Blending euphoric mood with faster tempo..."
12:30:16  🌍 Genre DJ switched to "Techno"
12:30:20  🤖 Gemini: "Adding techno elements while maintaining euphoria..."
12:30:24  🔥 DROP TRIGGERED!
```

## Implementation

### 1. `backend/services/room_service.py` — Event log

Add an event log list to `__init__`:
```python
# room_id → list of timeline events
self._timeline: Dict[str, list] = {}
```

Add a method to log events:
```python
import time

def log_event(self, room_id: str, emoji: str, source: str, text: str):
    """Add a timestamped event to the room's timeline."""
    events = self._timeline.setdefault(room_id, [])
    events.append({
        "time": time.time(),
        "emoji": emoji,
        "source": source,
        "text": text,
    })
    # Keep only last 50 events
    if len(events) > 50:
        self._timeline[room_id] = events[-50:]
```

Call it from `update_input`:
```python
def update_input(self, room_id: str, role: Role, payload: Dict[str, Any]):
    if room_id not in self.rooms:
        return
    self.rooms[room_id].current_inputs[role.value] = payload
    print(f"[Room] Input from {role.value}: {payload}")

    # Log to timeline
    ROLE_EMOJIS = {"drummer": "🥁", "vibe_setter": "🎸", "genre_dj": "🌍",
                   "instrumentalist": "🎹", "energy": "🔊"}
    emoji = ROLE_EMOJIS.get(role.value, "🎵")
    # Build human-readable summary
    parts = []
    for k, v in payload.items():
        if k == "custom_prompt":
            parts.append(f'said "{v}"')
        elif k == "bpm":
            parts.append(f"set BPM to {v}")
        elif k == "mood":
            parts.append(f'set mood to "{v}"')
        elif k == "genre":
            parts.append(f'picked {v}')
        elif k == "instrument":
            parts.append(f'added {v}')
        else:
            parts.append(f"{k}={v}")
    self.log_event(room_id, emoji, role.value, ", ".join(parts))
```

### 2. `backend/services/gemini_service.py` — Log Gemini reasoning

After `self._last_results[room_id] = result` in the `arbitrate` method, add:
```python
from services.room_service import room_service
room_service.log_event(room_id, "🤖", "gemini", result.reasoning)
```

### 3. Include timeline in state broadcasts

In `get_state_update_message`, add the timeline:
```python
"timeline": self._timeline.get(room_id, [])[-20:],  # Last 20 events
```

### 4. Tell Sariya (see TASK_SARIYA_V2.md for her UI specs)

## Testing
1. Start music, send a few inputs from different roles
2. Check that `state_update` messages include a `timeline` array
3. Each event should have `time`, `emoji`, `source`, `text`

## Commit
```bash
git add backend/services/room_service.py backend/services/gemini_service.py
git commit -m "feat: musical timeline — log all inputs and Gemini decisions"
git push origin main
```
