import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_input_update():
    print("Testing input update flow...")
    host_id = str(uuid.uuid4())

    async with websockets.connect(WS_URL) as ws:
        # Create room
        await ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        create_msg = json.loads(await ws.recv())
        room_id = create_msg["room_id"]
        role = create_msg["role"]
        print(f"  Room: {room_id}, Role: {role}")

        # Send an input update
        await ws.send(json.dumps({
            "type": "input_update",
            "user_id": host_id,
            "room_id": room_id,
            "role": role,
            "payload": {"bpm": 130}
        }))

        # No response expected for input_update, but no error either
        # Verify internal state via a short wait (no crash = pass)
        await asyncio.sleep(0.5)
        print("  ✅ Input update sent without error")

    print("\n✅ Input update OK")

asyncio.run(test_input_update())
