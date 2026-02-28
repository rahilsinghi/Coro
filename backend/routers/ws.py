"""
WebSocket Router — B (Bharath)
The main WS endpoint. Routes messages to appropriate services.
Wires Lyria audio broadcast → room broadcast.
Wires Gemini tick → Lyria prompt update → state broadcast.
"""
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types as genai_types

from services.room_service import room_service
from services.lyria_service import lyria_service
from services.gemini_service import gemini_service

router = APIRouter()


# ─── Wire Lyria audio → room broadcast ───────────────────────────────────────

async def _audio_broadcast_callback(room_id: str, audio_bytes: bytes):
    """Called by LyriaService for every audio chunk. Forwards to all room clients."""
    await room_service.broadcast_bytes(room_id, audio_bytes)

lyria_service.broadcast_callback = _audio_broadcast_callback


# ─── Wire Gemini tick → Lyria update → state broadcast ───────────────────────

async def _arbitration_tick(room_id: str, current_inputs, current_bpm, current_density, current_brightness):
    """
    Called every 4 seconds by RoomService tick loop.
    1. Call Gemini to arbitrate inputs
    2. Update Lyria with new prompts
    3. Update room state
    4. Broadcast new state to all clients
    """
    # 1. Gemini arbitration
    result = await gemini_service.arbitrate(
        room_id=room_id,
        current_inputs=current_inputs,
        current_bpm=current_bpm,
        current_density=current_density,
        current_brightness=current_brightness,
    )

    # 2. Update Lyria prompts (non-fatal — audio may continue with old prompts)
    try:
        lyria_prompts = [
            genai_types.WeightedPrompt(text=p.text, weight=p.weight)
            for p in result.prompts
        ]
        await lyria_service.update_prompts(
            room_id=room_id,
            prompts=lyria_prompts,
            bpm=result.bpm,
            density=result.density,
            brightness=result.brightness,
        )
    except Exception as e:
        print(f"[WS] Lyria prompt update failed (non-fatal): {e}")

    # 3. Update room state
    room_service.update_after_arbitration(
        room_id=room_id,
        prompts=result.prompts,
        bpm=result.bpm,
        density=result.density,
        brightness=result.brightness,
    )

    # 4. Broadcast to all clients
    state_msg = room_service.get_state_update_message(room_id)
    state_msg["gemini_reasoning"] = result.reasoning
    await room_service.broadcast_json(room_id, state_msg)


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    room_id = None
    user_id = None
    # Unique per-connection ID for drop vote deduplication (one vote per physical
    # browser tab/device regardless of shared localStorage user_id)
    connection_id = str(uuid.uuid4())

    # WS heartbeat to keep Railway connection alive
    import asyncio
    async def heartbeat():
        while True:
            await asyncio.sleep(30)
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break

    heartbeat_task = asyncio.create_task(heartbeat())

    try:
        while True:
            # Check connection state before receiving
            from fastapi.websockets import WebSocketState
            if websocket.client_state == WebSocketState.DISCONNECTED:
                break
            
            # Handle both text (JSON) and binary messages
            try:
                data = await websocket.receive()
            except RuntimeError:
                # This catches the "receive once a disconnect message has been received" error
                break

            # Handle WebSocket disconnect frame
            if data.get("type") == "websocket.disconnect":
                print(f"[WS] Disconnect frame received: user={user_id}, room={room_id}")
                break

            if "bytes" in data and data["bytes"]:
                # Binary from client — not expected but ignore gracefully
                continue

            if "text" not in data or not data["text"]:
                continue

            try:
                msg = json.loads(data["text"])
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")
            user_id = msg.get("user_id", user_id)

            # On reconnect, restore room_id from the message if we lost it
            if not room_id and msg.get("room_id"):
                room_id = msg["room_id"].upper()
                # Re-register this WebSocket so broadcasts reach this client
                if room_id in room_service.rooms and user_id:
                    room_service.connections.setdefault(room_id, set()).add(websocket)
                    room_service.user_sockets.setdefault(room_id, {})[user_id] = websocket
                    print(f"[WS] Reconnected user={user_id} to room={room_id}")

            # ── CREATE ROOM ──────────────────────────────────────────────────
            if msg_type == "create_room":
                device_name = msg.get("device_name", "Unknown")
                room_name = msg.get("room_name", "")
                display_name = msg.get("display_name", "")
                room = room_service.create_room(host_id=user_id, device_name=device_name, room_name=room_name)
                room_id = room.room_id
                role = room_service.join_room(room_id, user_id, websocket, display_name=display_name)
                join_url = f"?room_id={room_id}"
                await websocket.send_json({
                    "type": "room_created",
                    "room_id": room_id,
                    "room_name": room_name,
                    "join_url": join_url,
                    "role": role.value if role else None,
                })
                # Broadcast initial state so host sees participants immediately
                if room_id in room_service.rooms:
                    state_msg = room_service.get_state_update_message(room_id)
                    await room_service.broadcast_json(room_id, state_msg)

            # ── JOIN ROOM ────────────────────────────────────────────────────
            elif msg_type == "join_room":
                room_id = msg.get("room_id", "").upper()
                display_name = msg.get("display_name", "")
                if not room_id or room_id not in room_service.rooms:
                    await websocket.send_json({"type": "error", "message": f"Room {room_id} not found"})
                    continue
                role = room_service.join_room(room_id, user_id, websocket, display_name=display_name)
                if role is None:
                    await websocket.send_json({"type": "error", "message": "Room is full (max 10 players)"})
                    continue
                await websocket.send_json({
                    "type": "joined",
                    "room_id": room_id,
                    "role": role.value,
                    "user_id": user_id,
                })
                # Broadcast updated participants to all clients in the room
                if room_id in room_service.rooms:
                    state_msg = room_service.get_state_update_message(room_id)
                    await room_service.broadcast_json(room_id, state_msg)

            # ── START MUSIC ──────────────────────────────────────────────────
            elif msg_type == "start_music":
                if not room_id:
                    await websocket.send_json({"type": "error", "message": "Not in a room"})
                    continue
                room = room_service.rooms.get(room_id)
                if not room:
                    await websocket.send_json({"type": "error", "message": "Room not found"})
                    continue
                if room.host_id != user_id:
                    await websocket.send_json({"type": "error", "message": "Only host can start music"})
                    continue

                try:
                    room.is_playing = True
                    await lyria_service.start_session(room_id, initial_bpm=room.bpm)
                    room_service.start_tick_loop(room_id, _arbitration_tick)
                    await room_service.broadcast_json(room_id, {"type": "music_started"})
                except Exception as e:
                    room.is_playing = False
                    print(f"[WS] start_music failed for room {room_id}: {e}")
                    await websocket.send_json({"type": "error", "message": f"Failed to start music: {str(e)}"})

            # ── STOP MUSIC ───────────────────────────────────────────────────
            elif msg_type == "stop_music":
                if not room_id:
                    continue
                room = room_service.rooms.get(room_id)
                if room and room.host_id == user_id:
                    room.is_playing = False
                    room_service.stop_tick_loop(room_id)
                    await lyria_service.stop_session(room_id)
                    await room_service.broadcast_json(room_id, {"type": "music_stopped"})

            # ── CLOSE ROOM (host leaves) ─────────────────────────────────────
            elif msg_type == "close_room":
                if not room_id:
                    continue
                room = room_service.rooms.get(room_id)
                if not room or room.host_id != user_id:
                    await websocket.send_json({"type": "error", "message": "Only host can close the room"})
                    continue
                # Stop music if playing
                if room.is_playing:
                    room.is_playing = False
                    room_service.stop_tick_loop(room_id)
                    await lyria_service.stop_session(room_id)
                # Notify all clients the room is closing
                await room_service.broadcast_json(room_id, {
                    "type": "room_closed",
                    "message": "Host ended the session",
                })
                # Destroy all room state
                room_service.destroy_room(room_id)
                print(f"[WS] Room {room_id} closed by host {user_id}")
                room_id = None

            # ── INPUT UPDATE ─────────────────────────────────────────────────
            elif msg_type == "input_update":
                if not room_id:
                    continue
                role_str = msg.get("role")
                payload = msg.get("payload", {})
                if role_str and payload is not None:
                    from models.schemas import Role
                    try:
                        role = Role(role_str)
                        room_service.update_input(room_id, role, payload)
                    except ValueError:
                        pass  # Unknown role, ignore

            # ── APPLAUSE UPDATE ──────────────────────────────────────────────
            elif msg_type == "applause_update":
                if not room_id:
                    continue
                import math as _math
                raw_volume = max(0.0, min(1.0, float(msg.get("volume", 0.0))))
                clap_rate  = max(0.0, min(1.0, float(msg.get("clap_rate", 0.0))))
                room = room_service.rooms.get(room_id)
                if room:
                    # sqrt curve amplifies soft sounds (0.1 → 0.32, 0.5 → 0.71, 1.0 → 1.0)
                    vol_signal = _math.sqrt(raw_volume)

                    # Combined intensity: both dimensions are equally weighted.
                    # Loud + fast = high intensity. Soft + slow = low intensity.
                    intensity = round((vol_signal * 0.5 + clap_rate * 0.5), 3)

                    # ── Zone thresholds ──────────────────────────────────────
                    # HIGH  (intensity > 0.55): crowd is energised — amplify music
                    # LOW   (intensity < 0.25): crowd is quiet/slow — calm music down
                    # MID   (0.25–0.55): gentle nudge toward intensity

                    if intensity > 0.55:
                        # Step density and brightness UP noticeably every tick (200 ms)
                        new_density    = round(min(room.density    + 0.10 + intensity * 0.10, 1.0), 2)
                        new_brightness = round(min(room.brightness + 0.06 + intensity * 0.06, 1.0), 2)
                        zone = "HIGH"
                    elif intensity < 0.25:
                        # Step density and brightness DOWN — music calms
                        new_density    = round(max(room.density    - 0.07, 0.05), 2)
                        new_brightness = round(max(room.brightness - 0.04, 0.05), 2)
                        zone = "LOW"
                    else:
                        # Gentle blend toward intensity level
                        new_density    = round(room.density    * 0.85 + intensity * 0.15, 2)
                        new_brightness = round(room.brightness * 0.90 + intensity * 0.10, 2)
                        zone = "MID"

                    room.density    = new_density
                    room.brightness = new_brightness
                    room.current_inputs["crowd_energy"] = {
                        "applause_volume": round(raw_volume, 2),
                        "clap_rate":       round(clap_rate, 2),
                        "intensity":       intensity,
                        "zone":            zone,
                        "density":         new_density,
                        "brightness":      new_brightness,
                    }

                    # Immediate Lyria push with zone-specific prompts so the music
                    # CHARACTER changes, not just density/brightness numbers
                    if room.is_playing:
                        session_data = lyria_service._sessions.get(room_id)
                        if session_data:
                            base = session_data.get("last_prompts") or [
                                genai_types.WeightedPrompt(text="ambient electronic music", weight=1.0)
                            ]
                            if zone == "HIGH":
                                overlay = [genai_types.WeightedPrompt(
                                    text="energetic crowd energy, intense build-up, driving beat, amplified bass, maximum energy, euphoric",
                                    weight=round(min(intensity * 1.1, 1.0), 2)
                                )]
                            elif zone == "LOW":
                                overlay = [genai_types.WeightedPrompt(
                                    text="calm ambient fade, gentle reduction, soft texture, peaceful, quiet, minimal",
                                    weight=round(max(1.0 - intensity * 1.5, 0.4), 2)
                                )]
                            else:
                                overlay = []

                            lyria_prompts = (overlay + base[:1]) if overlay else base
                            await lyria_service.update_prompts(
                                room_id=room_id,
                                prompts=lyria_prompts,
                                bpm=session_data.get("bpm", room.bpm),
                                density=new_density,
                                brightness=new_brightness,
                            )

                    print(
                        f"[WS] Applause [{zone}] room={room_id} vol={raw_volume:.2f} "
                        f"rate={clap_rate:.2f} intensity={intensity:.2f} "
                        f"density={new_density:.2f} brightness={new_brightness:.2f}"
                    )
                    await room_service.broadcast_json(room_id, {
                        "type":         "applause_level",
                        "volume":       round(raw_volume, 2),
                        "clap_rate":    round(clap_rate, 2),
                        "intensity":    intensity,
                        "density":      new_density,
                        "zone":         zone,
                        "loud":         zone == "HIGH",
                    })

            # ── DROP ────────────────────────────────────────────────────────
            elif msg_type == "drop":
                if not room_id:
                    continue
                result = room_service.record_drop(room_id, connection_id, user_id)
                needed = room_service.get_drop_threshold(room_id)

                if result == "already_voted":
                    await websocket.send_json({
                        "type": "drop_already_voted",
                        "count": room_service.get_drop_vote_count(room_id),
                        "needed": needed,
                    })

                elif result == "triggered":
                    # Frontend reads in_seconds from this message — not hardcoded there.
                    DROP_DELAY = 3
                    # Always broadcast drop_incoming unconditionally so all clients
                    # see the countdown even if room lookup fails for Lyria step.
                    await room_service.broadcast_json(room_id, {
                        "type": "drop_incoming",
                        "in_seconds": DROP_DELAY,
                        "count": needed,
                        "needed": needed,
                    })
                    # Schedule Lyria update + drop_triggered after countdown.
                    # drop_triggered is ALWAYS sent after the delay regardless of
                    # whether the Lyria call succeeds (separate try/except).
                    room = room_service.rooms.get(room_id)
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
                    async def _fire_drop(rid=room_id, r=room, dp=drop_prompts, delay=DROP_DELAY):
                        await asyncio.sleep(delay)
                        if r:
                            try:
                                await lyria_service.update_prompts(
                                    room_id=rid,
                                    prompts=dp,
                                    bpm=min(r.bpm + 20, 160),
                                    density=1.0,
                                    brightness=0.3,
                                )
                            except Exception as e:
                                print(f"[WS] Drop Lyria update failed (non-fatal): {e}")
                        # Always broadcast drop_triggered so UI resets
                        await room_service.broadcast_json(rid, {
                            "type": "drop_triggered",
                            "message": "🔥 DROP!"
                        })
                    asyncio.create_task(_fire_drop())

                elif result == "registered":
                    count = room_service.get_drop_vote_count(room_id)
                    await room_service.broadcast_json(room_id, {
                        "type": "drop_progress",
                        "count": count,
                        "needed": needed,
                    })
                    # On first vote, start 10-second expiry window
                    if count == 1:
                        async def _expire_drop(rid=room_id):
                            await asyncio.sleep(10.0)
                            if room_service.get_drop_vote_count(rid) > 0:
                                room_service.reset_drop_votes(rid)
                                n = room_service.get_drop_threshold(rid)
                                await room_service.broadcast_json(rid, {
                                    "type": "drop_reset",
                                    "needed": n,
                                    "message": "Not enough votes — try again",
                                })
                        asyncio.create_task(_expire_drop())

            # ── LEAVE ROOM ──────────────────────────────────────────────────
            elif msg_type == "leave_room":
                if room_id and user_id:
                    room_service.remove_user(room_id, user_id)
                    # Broadcast updated participants
                    if room_id in room_service.rooms:
                        state_msg = room_service.get_state_update_message(room_id)
                        await room_service.broadcast_json(room_id, state_msg)

            # ── END STREAM ──────────────────────────────────────────────────
            elif msg_type == "end_stream":
                if room_id:
                    room = room_service.rooms.get(room_id)
                    if room and room.host_id == user_id:
                        await room_service.broadcast_json(room_id, {"type": "room_ended"})
                        await lyria_service.stop_session(room_id)
                        room_service.destroy_room(room_id)


    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: user={user_id}, room={room_id}")
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
    finally:
        heartbeat_task.cancel()
        if room_id and user_id:
            room_service.remove_connection(room_id, user_id, websocket)
