"""E2E: GET /health returns 200 and expected body."""
import urllib.request
import json

API_BASE = "http://localhost:8000"


def test_health():
    print("Testing GET /health...")
    req = urllib.request.Request(f"{API_BASE}/health")
    with urllib.request.urlopen(req, timeout=5) as resp:
        assert resp.status == 200, f"❌ Expected 200, got {resp.status}"
        data = json.loads(resp.read().decode())
        assert data.get("status") == "ok", f"❌ Expected status=ok, got {data}"
        assert "crowdsynth" in data.get("service", "").lower(), "❌ Expected service name"
        print(f"  ✅ /health: {data}")
    print("\n✅ Health check OK\n")


if __name__ == "__main__":
    test_health()
