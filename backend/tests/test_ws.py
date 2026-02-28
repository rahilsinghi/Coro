import asyncio
import json
import websockets
import uuid

WS_URL = "ws://localhost:8000/ws"

async def test_ws():
    print("Testing WebSocket room lifecycle...")
    host_id = str(uuid.uuid4())
    guest_id = str(uuid.uuid4())

    # ── Test create room ──────────────────────────────────────────
    async with websockets.connect(WS_URL) as host_ws:
        await host_ws.send(json.dumps({"type": "create_room", "user_id": host_id}))
        msg = json.loads(await host_ws.recv())
        print(f"  create_room response: {msg}")
        assert msg["type"] == "room_created", f"❌ Expected room_created, got {msg['type']}"
        assert "room_id" in msg, "❌ No room_id in response"
        room_id = msg["room_id"]
        print(f"  ✅ Room created: {room_id}")

        # ── Test join room ─────────────────────────────────────────
        async with websockets.connect(WS_URL) as guest_ws:
            await guest_ws.send(json.dumps({
                "type": "join_room",
                "room_id": room_id,
                "user_id": guest_id
            }))
            join_msg = json.loads(await guest_ws.recv())
            print(f"  join_room response: {join_msg}")
            assert join_msg["type"] == "joined", f"❌ Expected joined, got {join_msg['type']}"
            assert join_msg["room_id"] == room_id, "❌ Wrong room_id"
            assert join_msg["role"] is not None, "❌ No role assigned"
            print(f"  ✅ Guest joined with role: {join_msg['role']}")

        # ── Test bad room join ─────────────────────────────────────
        async with websockets.connect(WS_URL) as bad_ws:
            await bad_ws.send(json.dumps({
                "type": "join_room",
                "room_id": "BADROOM",
                "user_id": str(uuid.uuid4())
            }))
            err_msg = json.loads(await bad_ws.recv())
            assert err_msg["type"] == "error", f"❌ Expected error for bad room, got {err_msg['type']}"
            print(f"  ✅ Bad room correctly returns error: {err_msg['message']}")

    print("\n✅ WebSocket room lifecycle OK")

asyncio.run(test_ws())
