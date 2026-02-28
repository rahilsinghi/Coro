"""
Room Service — C (Chinmay)
Manages room state, input collection, and the 4-second arbitration tick loop.
"""
import asyncio
import uuid
import json
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from models.schemas import RoomState, WeightedPrompt, Role


class RoomService:
    def __init__(self):
        # room_id → RoomState
        self.rooms: Dict[str, RoomState] = {}
        # room_id → set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}
        # room_id → user_id → WebSocket
        self.user_sockets: Dict[str, Dict[str, WebSocket]] = {}
        # user_id → role
        self.user_roles: Dict[str, Role] = {}
        # role assignment order for new joins
        self._role_queue = [Role.DRUMMER, Role.VIBE_SETTER, Role.GENRE_DJ, Role.INSTRUMENTALIST]
        # room_id → asyncio task for tick loop
        self._tick_tasks: Dict[str, asyncio.Task] = {}

    def create_room(self, host_id: str) -> RoomState:
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
        return room

    def join_room(self, room_id: str, user_id: str, ws: WebSocket) -> Optional[Role]:
        if room_id not in self.rooms:
            return None

        self.connections[room_id].add(ws)
        self.user_sockets[room_id][user_id] = ws

        # Assign next available role
        taken_roles = set(self.user_roles.values())
        assigned_role = None
        for role in self._role_queue:
            if role not in taken_roles:
                assigned_role = role
                break

        if not assigned_role:
            assigned_role = Role.ENERGY

        self.user_roles[user_id] = assigned_role
        return assigned_role

    def remove_connection(self, room_id: str, user_id: str, ws: WebSocket):
        if room_id in self.connections:
            self.connections[room_id].discard(ws)
        if room_id in self.user_sockets:
            self.user_sockets[room_id].pop(user_id, None)
        self.user_roles.pop(user_id, None)

    def update_input(self, room_id: str, role: Role, payload: Dict[str, Any]):
        if room_id not in self.rooms:
            return
        self.rooms[room_id].current_inputs[role.value] = payload
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
        return {
            "type": "state_update",
            "active_prompts": [p.dict() for p in room.active_prompts],
            "bpm": room.bpm,
            "density": room.density,
            "brightness": room.brightness,
            "current_inputs": room.current_inputs,
            "influence_weights": room.influence_weights,
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


# Singleton
room_service = RoomService()
