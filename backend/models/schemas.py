from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from enum import Enum


class Role(str, Enum):
    DRUMMER = "drummer"
    VIBE_SETTER = "vibe_setter"
    GENRE_DJ = "genre_dj"
    INSTRUMENTALIST = "instrumentalist"
    ENERGY = "energy"


class MessageType(str, Enum):
    # Client → Server
    CREATE_ROOM = "create_room"
    JOIN_ROOM = "join_room"
    START_MUSIC = "start_music"
    STOP_MUSIC = "stop_music"
    INPUT_UPDATE = "input_update"

    # Server → Client
    ROOM_CREATED = "room_created"
    JOINED = "joined"
    STATE_UPDATE = "state_update"
    MUSIC_STARTED = "music_started"
    MUSIC_STOPPED = "music_stopped"
    ERROR = "error"


class InputPayload(BaseModel):
    # Drummer
    bpm: Optional[int] = None
    # Vibe Setter
    mood: Optional[str] = None
    # Genre DJ
    genre: Optional[str] = None
    # Instrumentalist
    instrument: Optional[str] = None
    # Energy
    density: Optional[float] = None
    brightness: Optional[float] = None


class InboundMessage(BaseModel):
    type: MessageType
    room_id: Optional[str] = None
    user_id: str
    role: Optional[Role] = None
    payload: Optional[InputPayload] = None


class WeightedPrompt(BaseModel):
    text: str
    weight: float


class ArbitrationResult(BaseModel):
    prompts: List[WeightedPrompt]
    bpm: int
    density: float
    brightness: float
    reasoning: str


class RoomState(BaseModel):
    room_id: str
    host_id: str
    is_playing: bool = False
    current_inputs: Dict[str, Any] = {}
    influence_weights: Dict[str, float] = {}
    active_prompts: List[WeightedPrompt] = []
    bpm: int = 100
    density: float = 0.5
    brightness: float = 0.5
