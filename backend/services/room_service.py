"""
Room Service — C (Chinmay)
Manages room state, input collection, and the 4-second arbitration tick loop.
"""
import asyncio
import uuid
import json
import time
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from models.schemas import RoomState, WeightedPrompt, Role


class RoomService:
    MAX_USERS_PER_ROOM = 10

    def __init__(self):
        # room_id → RoomState
        self.rooms: Dict[str, RoomState] = {}
        # room_id → set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}
        # room_id → user_id → WebSocket
        self.user_sockets: Dict[str, Dict[str, WebSocket]] = {}
        # room_id → user_id → Role
        self.user_roles: Dict[str, Dict[str, Role]] = {}
        # role assignment order for new joins
        self._role_queue = [Role.DRUMMER, Role.VIBE_SETTER, Role.GENRE_DJ, Role.INSTRUMENTALIST]
        # room_id → host device name (for lobby room listing)
        self._host_devices: Dict[str, str] = {}
        # room_id → asyncio task for tick loop
        self._tick_tasks: Dict[str, asyncio.Task] = {}
        # room_id → { user_id: timestamp } for the current drop vote window
        self._drop_votes: Dict[str, Dict[str, float]] = {}
        # room_id → timestamp when the current drop window started (None if no active window)
        self._drop_window_start: Dict[str, Optional[float]] = {}
        # room_id → custom room name
        self._room_names: Dict[str, str] = {}
        # room_id → user_id → display name
        self.user_display_names: Dict[str, Dict[str, str]] = {}
        # room_id → list of timeline events (capped at 50)
        self._timeline: Dict[str, list] = {}
        # room_id → role → last input timestamp (for recency-based influence)
        self._input_timestamps: Dict[str, Dict[str, float]] = {}

    def create_room(self, host_id: str, device_name: str = "Unknown", room_name: str = "") -> RoomState:
        room_id = str(uuid.uuid4())[:6].upper()
        room = RoomState(
            room_id=room_id,
            host_id=host_id,
            current_inputs={},
            influence_weights={},
            active_prompts=[WeightedPrompt(text="ambient electronic music", weight=1.0)],
            bpm=100,
            density=0.5,
            brightness=0.5,
        )
        self.rooms[room_id] = room
        self.connections[room_id] = set()
        self.user_sockets[room_id] = {}
        self.user_roles[room_id] = {}
        self._host_devices[room_id] = device_name
        self._room_names[room_id] = room_name
        self.user_display_names[room_id] = {}
        self._timeline[room_id] = []
        print(f"[Room] Created room {room_id} ({room_name or 'unnamed'}) — host={host_id}, device={device_name}")
        return room

    def get_room_name(self, room_id: str) -> str:
        return self._room_names.get(room_id, "")

    def get_rooms_list(self) -> list:
        """Return list of active rooms for the lobby."""
        rooms_list = []
        for room_id, room in self.rooms.items():
            room_roles = self.user_roles.get(room_id, {})
            rooms_list.append({
                "room_id": room_id,
                "room_name": self._room_names.get(room_id, ""),
                "member_count": len(room_roles),
                "is_playing": room.is_playing,
                "host_device": self._host_devices.get(room_id, "Unknown"),
                "roles_taken": [role.value for role in room_roles.values()],
            })
        return rooms_list

    def join_room(self, room_id: str, user_id: str, ws: WebSocket, display_name: str = "") -> Optional[Role]:
        if room_id not in self.rooms:
            return None

        room_roles = self.user_roles.get(room_id, {})

        # Allow reconnecting users through, but cap new joins
        if user_id not in room_roles and len(room_roles) >= self.MAX_USERS_PER_ROOM:
            print(f"[Room] Room {room_id} is full ({self.MAX_USERS_PER_ROOM} users) — rejecting {user_id}")
            return None

        self.connections[room_id].add(ws)
        self.user_sockets[room_id][user_id] = ws

        # Store display name (update on every join/reconnect if provided)
        if display_name:
            self.user_display_names.setdefault(room_id, {})[user_id] = display_name

        room_roles = self.user_roles.get(room_id, {})

        # If user already has a role in this room (reconnect), reuse it
        if user_id in room_roles:
            print(f"[Room] User {user_id} ({display_name or 'anon'}) reconnected with existing role {room_roles[user_id].value}")
            return room_roles[user_id]

        # Assign next available role
        taken_roles = set(room_roles.values())
        assigned_role = None
        for role in self._role_queue:
            if role not in taken_roles:
                assigned_role = role
                break

        if not assigned_role:
            assigned_role = Role.ENERGY

        self.user_roles.setdefault(room_id, {})[user_id] = assigned_role
        name_label = display_name or user_id[:8]
        self.log_event(room_id, "join", f"{name_label} joined as {assigned_role.value}")
        print(f"[Room] Assigned {assigned_role.value} to {name_label} in room {room_id}")
        return assigned_role

    def change_user_role(self, room_id: str, user_id: str, new_role: Role) -> Optional[str]:
        """Change a user's role. Returns old role value on success, None on failure.
        Returns None if the role is already taken by another user."""
        if room_id not in self.rooms:
            return None
        room_roles = self.user_roles.get(room_id, {})
        if user_id not in room_roles:
            return None
        # Reject if another user already has this role
        for uid, r in room_roles.items():
            if uid != user_id and r == new_role:
                return None
        old_role = room_roles[user_id]
        room_roles[user_id] = new_role
        display_name = self.user_display_names.get(room_id, {}).get(user_id, user_id[:8])
        self.log_event(room_id, "role_change", f"{display_name} switched from {old_role.value} to {new_role.value}")
        print(f"[Room] {display_name} switched from {old_role.value} to {new_role.value} in room {room_id}")
        return old_role.value

    def remove_connection(self, room_id: str, user_id: str, ws: WebSocket):
        """Remove explicit socket connection, but persist the role for transient disconnects."""
        if room_id in self.connections:
            self.connections[room_id].discard(ws)
        if room_id in self.user_sockets:
            self.user_sockets[room_id].pop(user_id, None)

    def remove_user(self, room_id: str, user_id: str):
        """Permenantly remove a user and their role (e.g. on explicit Leave Room)."""
        if room_id in self.user_roles:
            role = self.user_roles[room_id].pop(user_id, None)
            if role:
                display_name = self.user_display_names.get(room_id, {}).get(user_id, user_id[:8])
                self.log_event(room_id, "leave", f"{display_name} left the room")
        if room_id in self.user_display_names:
            self.user_display_names[room_id].pop(user_id, None)

    def get_drop_threshold(self, room_id: str) -> int:
        """Required votes = ceil(participants / 2), minimum 1."""
        import math
        total = len(self.user_roles.get(room_id, {}))
        return max(1, math.ceil(total / 2))

    def destroy_room(self, room_id: str):
        """Fully destroy a room — stop tick loop, purge all state."""
        self.stop_tick_loop(room_id)
        self.rooms.pop(room_id, None)
        self.connections.pop(room_id, None)
        self.user_sockets.pop(room_id, None)
        self.user_roles.pop(room_id, None)
        self._host_devices.pop(room_id, None)
        self._room_names.pop(room_id, None)
        self.user_display_names.pop(room_id, None)
        self._timeline.pop(room_id, None)
        self._drop_votes.pop(room_id, None)
        self._drop_window_start.pop(room_id, None)
        print(f"[Room] Destroyed room {room_id}")

    def record_drop(self, room_id: str, connection_id: str, user_id: str = None) -> str:
        """
        Record a drop vote, keyed by connection_id (one unique vote per WebSocket
        connection, not per user_id, to avoid collisions when multiple tabs share
        the same localStorage user_id during testing).

        Returns:
          "triggered"    — 3 unique connections voted in time; drop fires
          "registered"   — vote counted; not enough yet
          "already_voted"— this connection already voted in the active window
        """
        now = time.time()
        votes = self._drop_votes.setdefault(room_id, {})
        window_start = self._drop_window_start.get(room_id)

        # Stale window safety net
        if window_start and now - window_start > 5.5:
            votes.clear()
            self._drop_window_start[room_id] = None
            window_start = None

        # One vote per connection
        if connection_id in votes:
            return "already_voted"

        # Start window on first vote
        if not votes:
            self._drop_window_start[room_id] = now

        votes[connection_id] = now
        count = len(votes)
        needed = self.get_drop_threshold(room_id)

        # Resolve display name for timeline
        display = None
        if user_id:
            display = self.user_display_names.get(room_id, {}).get(user_id)
        display = display or (user_id[:8] if user_id else "anon")

        self.log_event(room_id, "drop", f"{display} voted drop ({count}/{needed})")
        print(f"[Room] DROP vote from {display} (conn={connection_id[:8]}) for {room_id}: {count}/{needed}")

        if count >= needed:
            votes.clear()
            self._drop_window_start[room_id] = None
            self.log_event(room_id, "drop", "🔥 DROP TRIGGERED!")
            print(f"[Room] 🔥 DROP TRIGGERED for {room_id}!")
            return "triggered"

        return "registered"

    def reset_drop_votes(self, room_id: str):
        """Reset drop votes after window expiry."""
        self._drop_votes.setdefault(room_id, {}).clear()
        self._drop_window_start[room_id] = None

    def get_drop_vote_count(self, room_id: str) -> int:
        return len(self._drop_votes.get(room_id, {}))

    def log_event(self, room_id: str, event_type: str, description: str):
        """Append a timestamped event to the room's timeline (capped at 50)."""
        if room_id not in self._timeline:
            self._timeline[room_id] = []
        event = {"time": time.time(), "source": event_type, "text": description}
        self._timeline[room_id].append(event)
        # Keep only the last 50 events
        if len(self._timeline[room_id]) > 50:
            self._timeline[room_id] = self._timeline[room_id][-50:]

    def _recalculate_influence(self, room_id: str):
        """Recency-weighted influence: recent inputs get more weight."""
        timestamps = self._input_timestamps.get(room_id, {})
        if not timestamps:
            return
        now = time.time()
        # Decay factor: inputs lose half their weight every 30 seconds
        raw = {}
        for role, ts in timestamps.items():
            age = now - ts
            raw[role] = max(0.05, 2 ** (-age / 30.0))
        total = sum(raw.values())
        if total > 0:
            self.rooms[room_id].influence_weights = {
                role: round(w / total, 2) for role, w in raw.items()
            }

    def update_input(self, room_id: str, role: Role, payload: Dict[str, Any]):
        if room_id not in self.rooms:
            return
        self.rooms[room_id].current_inputs[role.value] = payload
        # Track input timestamp for recency-based influence
        if room_id not in self._input_timestamps:
            self._input_timestamps[room_id] = {}
        self._input_timestamps[room_id][role.value] = time.time()
        self._recalculate_influence(room_id)
        # Log notable inputs to the timeline
        summary_parts = []
        for k, v in payload.items():
            if k == "custom_prompt":
                summary_parts.append(f'"{v}"')
            else:
                summary_parts.append(f"{k}: {v}")
        if summary_parts:
            self.log_event(room_id, "input", f"{role.value} → {', '.join(summary_parts)}")
        print(f"[Room] Input from {role.value}: {payload}")

    def update_after_arbitration(self, room_id: str, prompts, bpm: int, density: float, brightness: float):
        """Called by the tick loop after Gemini returns arbitration results."""
        if room_id not in self.rooms:
            return
        room = self.rooms[room_id]
        room.active_prompts = prompts
        room.bpm = bpm
        room.density = density
        room.brightness = brightness

        # Recalculate influence weights based on input recency
        self._recalculate_influence(room_id)

    def get_state_update_message(self, room_id: str) -> dict:
        room = self.rooms[room_id]
        room_roles = self.user_roles.get(room_id, {})
        display_names = self.user_display_names.get(room_id, {})
        participants = [
            {
                "user_id": uid,
                "role": role.value,
                "display_name": display_names.get(uid, ""),
                "is_host": uid == room.host_id,
            }
            for uid, role in room_roles.items()
        ]
        timeline = self._timeline.get(room_id, [])[-20:]
        return {
            "type": "state_update",
            "room_name": self._room_names.get(room_id, ""),
            "is_playing": room.is_playing,
            "active_prompts": [p.model_dump() for p in room.active_prompts],
            "bpm": room.bpm,
            "density": room.density,
            "brightness": room.brightness,
            "current_inputs": room.current_inputs,
            "influence_weights": room.influence_weights,
            "participants": participants,
            "timeline": timeline,
        }

    async def broadcast_json(self, room_id: str, message: dict):
        """Send JSON message to all clients in a room."""
        if room_id not in self.connections:
            return
        dead = set()
        for ws in self.connections[room_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.connections[room_id] -= dead

    async def broadcast_bytes(self, room_id: str, data: bytes):
        """Send raw audio bytes to all clients in a room."""
        if room_id not in self.connections:
            return
        dead = set()
        for ws in self.connections[room_id]:
            try:
                await ws.send_bytes(data)
            except Exception:
                dead.add(ws)
        self.connections[room_id] -= dead

    def start_tick_loop(self, room_id: str, callback):
        """Start the 4-second Gemini arbitration tick for a room."""
        task = asyncio.create_task(self._tick_loop(room_id, callback))
        self._tick_tasks[room_id] = task

    def stop_tick_loop(self, room_id: str):
        task = self._tick_tasks.pop(room_id, None)
        if task:
            task.cancel()

    async def _tick_loop(self, room_id: str, callback):
        """Fires callback every 4 seconds with current room state."""
        consecutive_errors = 0
        while True:
            await asyncio.sleep(4)
            if room_id not in self.rooms:
                break
            room = self.rooms[room_id]
            if not room.is_playing:
                continue

            # Apply energy controller inputs directly to room state
            energy_input = room.current_inputs.get("energy", {})
            if "density" in energy_input:
                room.density = float(energy_input["density"])
            if "brightness" in energy_input:
                room.brightness = float(energy_input["brightness"])

            print(f"[Room] Tick fired for room {room_id}, {len(room.current_inputs)} inputs")
            try:
                await callback(room_id, room.current_inputs, room.bpm, room.density, room.brightness)
                consecutive_errors = 0
            except Exception as e:
                consecutive_errors += 1
                print(f"[Room] Tick callback error #{consecutive_errors} for room {room_id}: {e}")
                if consecutive_errors >= 3:
                    print(f"[Room] Too many consecutive errors — notifying room {room_id}")
                    await self.broadcast_json(room_id, {
                        "type": "stream_error",
                        "message": "Music stream interrupted. Try restarting.",
                    })
                    consecutive_errors = 0
            # Clear consumed inputs so stale ones don't re-trigger Gemini
            room.current_inputs = {}


# Singleton
room_service = RoomService()
