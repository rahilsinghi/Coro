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
        # room_id → list of drop press timestamps
        self._drop_presses: Dict[str, list] = {}
        # room_id → custom room name
        self._room_names: Dict[str, str] = {}
        # room_id → user_id → display name
        self.user_display_names: Dict[str, Dict[str, str]] = {}
        # room_id → list of timeline events (capped at 50)
        self._timeline: Dict[str, list] = {}

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

    def remove_connection(self, room_id: str, user_id: str, ws: WebSocket):
        """Remove explicit socket connection, but persist the role for transient disconnects."""
        if room_id in self.connections:
            self.connections[room_id].discard(ws)
        if room_id in self.user_sockets:
            self.user_sockets[room_id].pop(user_id, None)
        # NOTE: Do NOT pop user_roles here — role persists across reconnects
        # Roles are only cleaned up when the room is destroyed

    def record_drop(self, room_id: str) -> bool:
        """Record a drop press. Returns True if 3+ drops within 2 seconds."""
        now = time.time()
        presses = self._drop_presses.setdefault(room_id, [])
        presses.append(now)
        # Remove presses older than 2 seconds
        self._drop_presses[room_id] = [t for t in presses if now - t <= 2.0]
        count = len(self._drop_presses[room_id])
        print(f"[Room] DROP press for {room_id}: {count}/3 in window")
        if count >= 3:
            self._drop_presses[room_id] = []  # Reset after triggering
            print(f"[Room] 🔥 DROP TRIGGERED for {room_id}!")
            return True
        return False

    def log_event(self, room_id: str, event_type: str, description: str):
        """Append a timestamped event to the room's timeline (capped at 50)."""
        if room_id not in self._timeline:
            self._timeline[room_id] = []
        event = {"time": time.time(), "source": event_type, "text": description}
        self._timeline[room_id].append(event)
        # Keep only the last 50 events
        if len(self._timeline[room_id]) > 50:
            self._timeline[room_id] = self._timeline[room_id][-50:]

    def update_input(self, room_id: str, role: Role, payload: Dict[str, Any]):
        if room_id not in self.rooms:
            return
        self.rooms[room_id].current_inputs[role.value] = payload
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
        # Simple equal weighting for now — C can make this smarter
        roles_with_input = list(room.current_inputs.keys())
        if roles_with_input:
            weight = round(1.0 / len(roles_with_input), 2)
            room.influence_weights = {role: weight for role in roles_with_input}

    def get_state_update_message(self, room_id: str) -> dict:
        room = self.rooms[room_id]
        room_roles = self.user_roles.get(room_id, {})
        display_names = self.user_display_names.get(room_id, {})
        participants = [
            {
                "user_id": uid,
                "role": role.value,
                "display_name": display_names.get(uid, ""),
            }
            for uid, role in room_roles.items()
        ]
        timeline = self._timeline.get(room_id, [])[-20:]
        return {
            "type": "state_update",
            "room_name": self._room_names.get(room_id, ""),
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
            await callback(room_id, room.current_inputs, room.bpm, room.density, room.brightness)
            # Clear consumed inputs so stale ones don't re-trigger Gemini
            room.current_inputs = {}


# Singleton
room_service = RoomService()
