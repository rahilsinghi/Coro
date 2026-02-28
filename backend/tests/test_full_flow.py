import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_full_flow():
    print("Testing full flow: create room → start music → receive audio bytes...")
    host_id = str(uuid.uuid4())

    async with websockets.connect(WS_URL) as ws:
        ws.max_size = 10 * 1024 * 1024  # 10MB for audio

        # 1. Create room
        await ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        create_msg = json.loads(await ws.recv())
        room_id = create_msg["room_id"]
        print(f"  ✅ Room created: {room_id}")

        # 2. Send some inputs
        await ws.send(json.dumps({
            "type": "input_update",
            "user_id": host_id,
            "room_id": room_id,
            "role": "genre_dj",
            "payload": {"genre": "lo-fi"}
        }))

        # 3. Start music
        await ws.send(json.dumps({
            "type": "start_music",
            "user_id": host_id,
            "room_id": room_id
        }))

        # 4. Wait for music_started confirmation
        music_started = False
        audio_chunk_count = 0
        state_update_received = False

        print("  Waiting for music_started + audio chunks...")

        async def collect():
            nonlocal music_started, audio_chunk_count, state_update_received
            async for message in ws:
                if isinstance(message, bytes):
                    audio_chunk_count += 1
                    print(f"    🎵 Audio chunk #{audio_chunk_count} — {len(message)} bytes")
                    if audio_chunk_count >= 3:
                        break
                else:
                    msg = json.loads(message)
                    if msg["type"] == "music_started":
                        music_started = True
                        print(f"    ✅ music_started received")
                    elif msg["type"] == "state_update":
                        state_update_received = True
                        print(f"    ✅ state_update received: {msg.get('active_prompts', [])}")

        try:
            await asyncio.wait_for(collect(), timeout=40.0)
        except asyncio.TimeoutError:
            print("  ⚠️  Timed out waiting — partial results:")

        # 5. Stop music
        await ws.send(json.dumps({
            "type": "stop_music",
            "user_id": host_id,
            "room_id": room_id
        }))

        print(f"\n  music_started: {music_started}")
        print(f"  audio chunks received: {audio_chunk_count}")
        print(f"  state_update received: {state_update_received}")

        assert music_started, "❌ music_started was never received"
        assert audio_chunk_count >= 1, "❌ No audio chunks received over WebSocket"

        print("\n✅ Full flow OK — audio is streaming end-to-end!")

asyncio.run(test_full_flow())
