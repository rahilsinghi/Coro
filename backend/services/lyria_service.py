"""
Lyria Service — R (Rahil)
Manages the persistent WebSocket connection to Lyria RealTime.
Receives audio chunks from Lyria and broadcasts them to all room clients.
Also handles updating weighted prompts when Gemini arbitration fires.
"""
import asyncio
import os
from typing import Optional, List, Callable
from google import genai
from google.genai import types

# Broadcast callback type: (room_id, audio_bytes) → None
BroadcastCallback = Callable[[str, bytes], None]


class LyriaService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        self.client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        # room_id → active session
        self._sessions: dict = {}
        # room_id → receive task
        self._receive_tasks: dict = {}
        # Injected from ws.py so Lyria can broadcast audio bytes to clients
        self.broadcast_callback: Optional[BroadcastCallback] = None

    async def start_session(self, room_id: str, initial_bpm: int = 100):
        """
        Opens a Lyria RealTime session for a room and starts streaming audio.
        Call this when host presses Play.
        """
        if room_id in self._sessions:
            print(f"[Lyria] Session already exists for room {room_id}")
            return

        print(f"[Lyria] Starting session for room {room_id}")

        try:
            session_ctx = self.client.aio.live.music.connect(model="models/lyria-realtime-exp")
            session = await session_ctx.__aenter__()
            self._sessions[room_id] = {"session": session, "ctx": session_ctx, "bpm": initial_bpm}

            # Set initial config
            await session.set_music_generation_config(
                config=types.LiveMusicGenerationConfig(
                    bpm=initial_bpm,
                    temperature=1.0,
                )
            )

            # Set default starting prompt
            await session.set_weighted_prompts(
                prompts=[types.WeightedPrompt(text="ambient electronic music with soft synth pads", weight=1.0)]
            )

            # Start playback
            await session.play()

            # Kick off receive loop in background
            task = asyncio.create_task(self._receive_audio_loop(room_id, session))
            self._receive_tasks[room_id] = task

            print(f"[Lyria] Session started for room {room_id}")

        except Exception as e:
            print(f"[Lyria] Failed to start session for room {room_id}: {e}")
            raise

    async def stop_session(self, room_id: str):
        """Stop Lyria session for a room."""
        task = self._receive_tasks.pop(room_id, None)
        if task:
            task.cancel()

        session_data = self._sessions.pop(room_id, None)
        if session_data:
            try:
                await session_data["session"].stop()
                await session_data["ctx"].__aexit__(None, None, None)
                print(f"[Lyria] Session stopped for room {room_id}")
            except Exception as e:
                print(f"[Lyria] Error stopping session for room {room_id}: {e}")

    # Max BPM change per tick — prevents jarring reset_context() jumps
    MAX_BPM_DELTA = 10

    async def update_prompts(
        self,
        room_id: str,
        prompts: List[types.WeightedPrompt],
        bpm: int,
        density: float,
        brightness: float,
    ):
        """
        Called by the arbitration tick to update Lyria with new prompts.
        This is the key method that makes the music change.
        BPM is clamped to ±5 per tick for smooth transitions.
        """
        session_data = self._sessions.get(room_id)
        if not session_data:
            print(f"[Lyria] No session found for room {room_id}, skipping prompt update")
            return

        session = session_data["session"]
        try:
            # Store Gemini's desired BPM as the target
            session_data["target_bpm"] = bpm

            # Clamp actual BPM change to ±MAX_BPM_DELTA per tick
            last_bpm = session_data.get("bpm", bpm)
            delta = bpm - last_bpm
            if abs(delta) > self.MAX_BPM_DELTA:
                bpm = last_bpm + self.MAX_BPM_DELTA * (1 if delta > 0 else -1)

            # BPM changes require reset_context() per skill.md
            if bpm != last_bpm:
                print(f"[Lyria] BPM {last_bpm} → {bpm} (target {session_data['target_bpm']}) for room {room_id} — resetting context")
                await session.reset_context()

            await session.set_music_generation_config(
                config=types.LiveMusicGenerationConfig(
                    bpm=bpm,
                    density=density,
                    brightness=brightness,
                    temperature=1.0,
                )
            )
            session_data["bpm"] = bpm

            # Update weighted prompts — this is what makes the music morph
            await session.set_weighted_prompts(prompts=prompts)

            print(f"[Lyria] Updated prompts for room {room_id}: {[p.text for p in prompts]}")

        except Exception as e:
            print(f"[Lyria] Failed to update prompts for room {room_id}: {e}")

    async def _receive_audio_loop(self, room_id: str, session):
        """
        Continuously receives audio chunks from Lyria and broadcasts to room clients.
        Runs as a background task for the lifetime of the session.
        """
        print(f"[Lyria] Audio receive loop started for room {room_id}")
        try:
            async for message in session.receive():
                if not message.server_content:
                    continue

                # Extract audio data from chunks
                if hasattr(message.server_content, "audio_chunks") and message.server_content.audio_chunks:
                    for chunk in message.server_content.audio_chunks:
                        if chunk.data and self.broadcast_callback:
                            await self.broadcast_callback(room_id, chunk.data)

                # Handle filtered prompts (safety filter triggered)
                if hasattr(message.server_content, "filtered_prompt") and message.server_content.filtered_prompt:
                    print(f"[Lyria] Prompt filtered for room {room_id}: {message.server_content.filtered_prompt}")

        except asyncio.CancelledError:
            print(f"[Lyria] Receive loop cancelled for room {room_id}")
        except Exception as e:
            print(f"[Lyria] Receive loop error for room {room_id}: {e}")
            self._sessions.pop(room_id, None)
            self._receive_tasks.pop(room_id, None)

    def is_playing(self, room_id: str) -> bool:
        return room_id in self._sessions


# Singleton
lyria_service = LyriaService()
