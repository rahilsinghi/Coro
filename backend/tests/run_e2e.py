#!/usr/bin/env python3
"""
E2E test runner for Coro backend.
Run with backend server up: uvicorn main:app --reload (from backend/)
Usage: from backend/
  python tests/run_e2e.py           # all tests (full_flow needs GEMINI_API_KEY + Lyria)
  python tests/run_e2e.py --skip-full   # skip Lyria/full flow (for CI without API key)
"""
import sys
import subprocess

# Ensure we can import from backend
sys.path.insert(0, ".")
SKIP_FULL = "--skip-full" in sys.argv

def run(script_name, cwd=None):
    cmd = f"{sys.executable} {script_name}"
    r = subprocess.run(cmd, shell=True, cwd=cwd or ".")
    return r.returncode

def main():
    print("=" * 60)
    print("Coro Backend E2E Tests")
    print("=" * 60)

    failed = []

    # 1. Health
    print("\n[1/4] Health check (GET /health)")
    if run("tests/test_health.py") != 0:
        failed.append("test_health")
    else:
        print("[1/4] OK\n")

    # 2. WebSocket room lifecycle
    print("\n[2/4] WebSocket room lifecycle (create_room, join_room)")
    if run("tests/test_ws.py") != 0:
        failed.append("test_ws")
    else:
        print("[2/4] OK\n")

    # 3. Input update
    print("\n[3/4] Input update (input_update)")
    if run("tests/test_input_update.py") != 0:
        failed.append("test_input_update")
    else:
        print("[3/4] OK\n")

    # 4. Full flow (Lyria + Gemini — requires GEMINI_API_KEY)
    if SKIP_FULL:
        print("\n[4/4] Full flow SKIPPED (--skip-full)")
    else:
        print("\n[4/4] Full flow (start_music, audio chunks, state_update, stop_music)")
        if run("tests/test_full_flow.py") != 0:
            failed.append("test_full_flow")
        else:
            print("[4/4] OK\n")

    print("=" * 60)
    if failed:
        print("FAILED:", ", ".join(failed))
        sys.exit(1)
    print("All E2E tests passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
