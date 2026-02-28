# CrowdSynth — Technical Deep Dive

A line-by-line technical analysis of the entire codebase: architecture, data flow, and implementation details.

---

## 1. Project Overview

**CrowdSynth** is a real-time, crowd-controlled generative music app. Multiple users join a room; each gets a **role** (Drummer, Vibe Setter, Genre DJ, Instrumentalist, or Energy). The **host** starts a single Lyria RealTime stream; every **4 seconds** the backend runs **Gemini** to arbitrate all role inputs into 2–3 Lyria weighted prompts. The music morphs live; the host sees a visualizer and influence meter.

- **Frontend:** React 18, Vite, Tailwind, Zustand, WebSocket, Web Audio API  
- **Backend:** FastAPI, WebSockets, Google Lyria RealTime (WebSocket), Gemini 2.5 Flash (REST)  
- **Deploy:** Frontend → Vercel; Backend → Railway (per PRD)

---

## 2. Repository Layout (Source Only)

```
Coro/
├── PRD.md                          # Product requirements, protocol, build plan
├── backend/
│   ├── main.py                     # FastAPI app, CORS, health, router
│   ├── requirements.txt            # Python deps
│   ├── .env                        # GEMINI_API_KEY, FRONTEND_URL, PORT
│   ├── Dockerfile                  # Python 3.11, uvicorn
│   ├── routers/
│   │   └── ws.py                   # WebSocket /ws, message routing, Lyria/Gemini wiring
│   ├── services/
│   │   ├── room_service.py         # Rooms, connections, inputs, 4s tick, broadcast
│   │   ├── lyria_service.py        # Lyria RealTime client, audio receive, prompt updates
│   │   └── gemini_service.py       # Gemini arbitration → prompts + bpm/density/brightness
│   └── models/
│       └── schemas.py              # Pydantic: Role, messages, WeightedPrompt, ArbitrationResult
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env                        # VITE_WS_URL, VITE_API_URL
    └── src/
        ├── main.jsx                # React root
        ├── App.jsx                 # React Router: /, /host, /guest
        ├── index.css               # Tailwind + component classes
        ├── lib/
        │   └── constants.js         # GENRES, INSTRUMENTS, MOODS, ROLES, ROLE_COLORS
        ├── store/
        │   └── roomStore.js         # Zustand: room, user, role, playing, state_update state
        ├── hooks/
        │   ├── useWebSocket.js      # WS connect, reconnect, send, createRoom, joinRoom, start/stop, sendInput
        │   └── useAudioPlayer.js   # AudioContext 48kHz, buffer queue, analyser, unlock
        ├── pages/
        │   ├── Home.jsx            # Create room / join by code, connection status
        │   ├── Host.jsx            # QR, visualizer, influence meter, play/stop
        │   └── Guest.jsx           # Role card + role-specific controls
        └── components/
            ├── RoleCard.jsx
            ├── AudioVisualizer.jsx # Canvas FFT bars from analyser
            ├── InfluenceMeter.jsx  # Recharts pie by role weight
            ├── ActivePrompts.jsx   # Weighted prompt tags
            └── controls/
                ├── BPMSlider.jsx   # Drummer: 60–160 BPM
                ├── MoodInput.jsx   # Vibe Setter: moods + custom
                ├── GenreGrid.jsx   # Genre DJ: single genre
                └── InstrumentGrid.jsx # Instrumentalist: up to 2 instruments
```

---

## 3. Backend — File-by-File

### 3.1 `backend/main.py`

- **Dotenv:** `load_dotenv()` loads `.env` (GEMINI_API_KEY, FRONTEND_URL, PORT).
- **FastAPI app:** Title `CrowdSynth API`, version `1.0.0`.
- **CORS:** `allow_origins=[os.getenv("FRONTEND_URL", "*")]`, credentials/methods/headers allowed.
- **Router:** `ws_router` mounted (all WebSocket and room logic live under that router).
- **Health:** `GET /health` returns `{"status": "ok", "service": "crowdsynth-backend"}`.

So the app is a thin shell: CORS + health + single WebSocket router.

---

### 3.2 `backend/models/schemas.py`

- **Role (Enum):** `drummer`, `vibe_setter`, `genre_dj`, `instrumentalist`, `energy`.
- **MessageType (Enum):** client → server: `create_room`, `join_room`, `start_music`, `stop_music`, `input_update`; server → client: `room_created`, `joined`, `state_update`, `music_started`, `music_stopped`, `error`.
- **InputPayload:** Optional fields: `bpm`, `mood`, `genre`, `instrument`, `density`, `brightness` (covers all roles).
- **InboundMessage:** `type`, `room_id?`, `user_id`, `role?`, `payload?`.
- **WeightedPrompt:** `text`, `weight` (for Lyria and state).
- **ArbitrationResult:** `prompts: List[WeightedPrompt]`, `bpm`, `density`, `brightness`, `reasoning`.
- **RoomState:** `room_id`, `host_id`, `is_playing`, `current_inputs`, `influence_weights`, `active_prompts`, `bpm`, `density`, `brightness`.

These models define the WebSocket contract and in-memory room state; they are used across routers and services.

---

### 3.3 `backend/services/room_service.py`

**Singleton:** `room_service = RoomService()`.

**State:**
- `rooms: room_id → RoomState`
- `connections: room_id → set(WebSocket)`
- `user_sockets: room_id → user_id → WebSocket`
- `user_roles: user_id → Role` (global; in multi-room setup this would need to be keyed by room)
- `_role_queue`: fixed order for assigning roles: Drummer → Vibe Setter → Genre DJ → Instrumentalist (then Energy if more than 4).
- `_tick_tasks: room_id → asyncio.Task` for the 4s loop.

**create_room(host_id):**  
Generates 6-char uppercase `room_id`, creates `RoomState` with default prompt `"ambient electronic music"` (weight 1.0), BPM 100, density/brightness 0.5; initializes `connections[room_id]` and `user_sockets[room_id]`. Returns the new room.

**join_room(room_id, user_id, ws):**  
Adds `ws` to `connections[room_id]`, maps `user_sockets[room_id][user_id] = ws`. Assigns the next role from `_role_queue` not already in `user_roles`; if all four are taken, assigns `ENERGY`. Sets `user_roles[user_id]` and returns that role.

**remove_connection(room_id, user_id, ws):**  
Removes `ws` from the room’s connection set, removes `user_sockets[room_id][user_id]`, and deletes `user_roles[user_id]`.

**update_input(room_id, role, payload):**  
Sets `rooms[room_id].current_inputs[role.value] = payload`.

**update_after_arbitration(room_id, prompts, bpm, density, brightness):**  
Updates the room’s `active_prompts`, `bpm`, `density`, `brightness`. Then sets `influence_weights` to equal weight across all roles that have an entry in `current_inputs` (e.g. 4 roles → 0.25 each).

**get_state_update_message(room_id):**  
Builds the JSON object for `state_update`: `active_prompts` (via `model_dump()` for Pydantic v2), `bpm`, `density`, `brightness`, `current_inputs`, `influence_weights`.

**broadcast_json(room_id, message):**  
Sends the dict as JSON to every WebSocket in `connections[room_id]`; removes any that raise on send.

**broadcast_bytes(room_id, data):**  
Same but sends raw bytes (used for Lyria audio chunks).

**start_tick_loop(room_id, callback):**  
Creates an asyncio task running `_tick_loop(room_id, callback)` and stores it in `_tick_tasks`.

**stop_tick_loop(room_id):**  
Cancels and removes the task for that room.

**_tick_loop(room_id, callback):**  
Infinite loop: `await asyncio.sleep(4)`, then if room still exists and `room.is_playing`, calls `callback(room_id, room.current_inputs, room.bpm, room.density, room.brightness)`. So every 4 seconds the arbitration callback runs with current state.

---

### 3.4 `backend/services/lyria_service.py`

**Singleton:** `lyria_service = LyriaService()`.

**Init:**  
Reads `GEMINI_API_KEY`; builds `genai.Client(api_key=..., http_options={"api_version": "v1alpha"})`. Holds `_sessions` (room_id → session data), `_receive_tasks` (room_id → receive task), and `broadcast_callback` (injected from `ws.py`: `(room_id, audio_bytes) -> None`).

**start_session(room_id, initial_bpm=100):**  
If session already exists, returns. Otherwise: `client.aio.live.music.connect(model="models/lyria-realtime-exp")`, enters context, stores session and ctx. Sets `LiveMusicGenerationConfig(bpm=initial_bpm, temperature=1.0)` and default weighted prompt `"ambient electronic music with soft synth pads"` (weight 1.0), then `session.play()`. Starts `_receive_audio_loop(room_id, session)` as a background task and stores it in `_receive_tasks`.

**stop_session(room_id):**  
Cancels receive task, pops session, calls `session.stop()` and context `__aexit__`.

**update_prompts(room_id, prompts, bpm, density, brightness):**  
Gets session for room; calls `set_music_generation_config` with `bpm`, `density`, `brightness`, `temperature=1.0`, then `set_weighted_prompts(prompts)`. This is what makes the music change after each Gemini tick.

**_receive_audio_loop(room_id, session):**  
`async for message in session.receive()`: if `server_content` has `audio_chunks`, for each chunk with data calls `broadcast_callback(room_id, chunk.data)`. Also logs `filtered_prompt` if present (safety filter). Handles `CancelledError` and other exceptions.

**is_playing(room_id):**  
Returns whether the room has an active session.

---

### 3.5 `backend/services/gemini_service.py`

**Singleton:** `gemini_service = GeminiService()`.

**Init:**  
Uses `GEMINI_API_KEY`, creates `genai.Client`, model name `gemini-2.5-flash`. `_last_results: room_id → ArbitrationResult` for fallback.

**ARBITRATION_SYSTEM_PROMPT:**  
Instructs the model to act as a music director: take crowd inputs every few seconds and output 2–3 Lyria weighted prompts that honor preferences, blend conflicts, and keep energy continuity. Output must be **only** JSON: `prompts` (array of `{text, weight}`), `bpm` (60–160), `density`, `brightness` (0–1), `reasoning` (one sentence). Weights sum to 1.0, prompts descriptive (genre, instruments, mood, energy).

**DEFAULT_RESULT:**  
Single prompt `"ambient electronic music with soft synth pads"`, BPM 100, density/brightness 0.5, reasoning `"Default fallback"`.

**arbitrate(room_id, current_inputs, current_bpm, current_density, current_brightness):**  
If `current_inputs` is empty, returns `_last_results.get(room_id, DEFAULT_RESULT)`. Otherwise builds a text summary via `_format_inputs` (lists each role’s payload and current BPM/density/brightness). Calls `client.models.generate_content` with system instruction = ARBITRATION_SYSTEM_PROMPT, temperature 0.7, max_output_tokens 300. Parses response: strips markdown code fences if present, `json.loads`, builds `ArbitrationResult` (prompts as `WeightedPrompt(**p)`), stores in `_last_results`, returns. On any exception, returns last good or DEFAULT_RESULT.

**_format_inputs(inputs, bpm, density, brightness):**  
Produces a short text: “Current crowd inputs:” plus one line per role/payload, then “Current music state: BPM=…”, then “Synthesize these into 2-3 Lyria weighted prompts.”

---

### 3.6 `backend/routers/ws.py`

**Wiring (module load):**
- `lyria_service.broadcast_callback = _audio_broadcast_callback`  
  So whenever Lyria pushes audio, `_audio_broadcast_callback(room_id, audio_bytes)` runs and calls `room_service.broadcast_bytes(room_id, audio_bytes)`.
- The 4s tick is passed `_arbitration_tick` when the host starts music (see below).

**_audio_broadcast_callback(room_id, audio_bytes):**  
Forwards to `room_service.broadcast_bytes(room_id, audio_bytes)`.

**_arbitration_tick(room_id, current_inputs, current_bpm, current_density, current_brightness):**  
1. Calls `gemini_service.arbitrate(...)` to get `ArbitrationResult`.  
2. Converts `result.prompts` to `genai.types.WeightedPrompt` and calls `lyria_service.update_prompts(room_id, prompts, result.bpm, result.density, result.brightness)`.  
3. Calls `room_service.update_after_arbitration(...)`.  
4. Builds state message with `room_service.get_state_update_message(room_id)`, adds `gemini_reasoning`, then `room_service.broadcast_json(room_id, state_msg)`.

**websocket_endpoint(websocket):**  
- Accepts connection; keeps `room_id` and `user_id` in closure.  
- Starts a **heartbeat** task: every 30s sends `{"type": "ping"}` to keep Railway WS alive.  
- Main loop: `receive()`; ignore binary from client; parse text as JSON.  
- **create_room:** Creates room, joins host to it, sends `room_created` with `room_id`, `join_url` (query `?room_id=...`), `role`.  
- **join_room:** Validates `room_id`, joins, sends `joined` with `room_id`, `role`, `user_id`.  
- **start_music:** Requires host; sets `room.is_playing = True`, calls `lyria_service.start_session(room_id, initial_bpm=room.bpm)`, `room_service.start_tick_loop(room_id, _arbitration_tick)`, then broadcasts `music_started`.  
- **stop_music:** Host only; sets `is_playing = False`, stops tick loop, stops Lyria session, broadcasts `music_stopped`.  
- **input_update:** Parses `role` and `payload`, maps string to `Role` enum, calls `room_service.update_input(room_id, role, payload)`.  
- On disconnect or error: cancel heartbeat, call `room_service.remove_connection(room_id, user_id, websocket)`.

So the WebSocket router is the only HTTP/WS surface; it ties together room lifecycle, Lyria audio broadcast, and the 4s Gemini → Lyria → state broadcast pipeline.

---

## 4. Frontend — File-by-File

### 4.1 Entry and routing

- **main.jsx:** Renders `<App />` into `#root` with StrictMode; imports `index.css`.
- **App.jsx:** `BrowserRouter` with routes: `/` → Home, `/host` → Host, `/guest` → Guest.
- **index.html:** Root div, Inter + JetBrains Mono fonts, script `src="/src/main.jsx"`.
- **index.css:** Tailwind layers; `btn-primary`, `btn-secondary`, `card`, `tile`, `tile-active` component classes.
- **tailwind.config.js:** Custom theme: `cs` colors (bg, surface, border, accent, text, muted), font families, glow animation.
- **vite.config.js:** React plugin, dev server port 3000.

---

### 4.2 `frontend/src/lib/constants.js`

- **GENRES:** 15 labels (Trap, Lo-Fi, Afrobeat, Jazz, …).  
- **INSTRUMENTS:** 15 (Synth Bass, Piano, …).  
- **MOODS:** 12 (Dark, Euphoric, …).  
- **ROLES:** Object keyed by role id with `emoji`, `label`, `description`, `color`, `borderColor`, `bgColor` for UI.  
- **ROLE_COLORS:** role → hex (used by InfluenceMeter and list styling).

---

### 4.3 `frontend/src/store/roomStore.js` (Zustand)

Single store with:
- **Connection/identity:** `roomId`, `userId`, `role`, `isHost`, `isConnected`, `isPlaying`.
- **Music state (from state_update):** `activePrompts`, `bpm`, `density`, `brightness`, `currentInputs`, `influenceWeights`, `geminiReasoning`.

Actions:
- **setRoom(roomId, userId, role, isHost)**  
- **setConnected(val)**, **setPlaying(val)**  
- **applyStateUpdate(msg):** Maps server keys (`active_prompts`, `bpm`, etc.) to store (e.g. `gemini_reasoning` → `geminiReasoning`).  
- **reset():** Clears room/connection/playing and derived state.

---

### 4.4 `frontend/src/hooks/useWebSocket.js`

- **WS_URL:** `import.meta.env.VITE_WS_URL` or `ws://localhost:8000/ws`.  
- **connect():** Creates `WebSocket`, `binaryType = 'arraybuffer'`. On open: `setConnected(true)`. On close: `setConnected(false)`, schedule `connect` in 2s. On message: if `ArrayBuffer` → `enqueueAudio(event.data)`; else parse JSON and `handleMessage(msg)`.  
- **handleMessage:**  
  - `room_created` / `joined`: no store update here (handled in page when creating/joining).  
  - `state_update`: `applyStateUpdate(msg)`.  
  - `music_started`: `setPlaying(true)`.  
  - `music_stopped`: `setPlaying(false)`.  
  - `ping`: ignore.  
  - `error`: log.  
- **send(message):** `JSON.stringify` and send if OPEN.  
- **createRoom(userId):** Promise that sends `create_room`, then waits for one `room_created` message; on receipt calls `setRoom(msg.room_id, userId, msg.role, true)` and resolves.  
- **joinRoom(roomId, userId):** Sends `join_room`; resolves on `joined` (after `setRoom(..., false)`) or on `error` with `{ error: msg.message }`.  
- **startMusic(userId, roomId) / stopMusic(userId, roomId):** Send corresponding JSON.  
- **sendInput(userId, roomId, role, payload):** Sends `input_update` with `user_id`, `room_id`, `role`, `payload`.  
- **useEffect:** On mount calls `connect()`; on unmount clears reconnect timer and closes socket.

So the hook owns a single global WebSocket, reconnects on close, and routes binary to the audio player and JSON to the store or to promise resolvers for create/join.

---

### 4.5 `frontend/src/hooks/useAudioPlayer.js`

- **AudioContext:** Created at 48 kHz to match Lyria; one **AnalyserNode** (fftSize 256) connected to destination; `nextPlayTimeRef` for gapless scheduling.  
- **unlock():** Resumes context if suspended (required after user gesture).  
- **enqueueAudio(arrayBuffer):** Treats buffer as 16-bit stereo interleaved PCM at 48 kHz. Converts to Float32 per channel, creates `AudioBuffer`, creates `BufferSource`, connects to analyser, schedules at `Math.max(now + 0.05, nextPlayTimeRef.current)`, advances `nextPlayTimeRef` by buffer duration. So chunks are played back-to-back.  
- **getAnalyser():** Returns the analyser for the visualizer.  
- **useEffect cleanup:** Closes AudioContext on unmount.

---

### 4.6 `frontend/src/pages/Home.jsx`

- **userId:** From `localStorage` key `cs_user_id` or new UUID (stored).  
- **joinCode:** Can be pre-filled from query `room_id`.  
- **createRoom:** Calls `createRoom(userId)` from hook, then `navigate('/host')` on success; on error sets error state.  
- **joinRoom:** Calls `joinRoom(joinCode.trim().toUpperCase(), userId)`; on success navigates to `/guest`, on error sets error message.  
- UI: Title, connection status (green dot when connected), “Host a Room” button, “or join with a code”, input + Join button, error text, footer.

---

### 4.7 `frontend/src/pages/Host.jsx`

- Reads from store: `roomId`, `userId`, `isPlaying`, `activePrompts`, `influenceWeights`, `bpm`, `geminiReasoning`.  
- **joinUrl:** `window.location.origin + '?room_id=' + roomId`.  
- **Play:** Calls `unlock()` (user gesture), then `startMusic(userId, roomId)`, hides QR.  
- **Stop:** `stopMusic(userId, roomId)`.  
- If no `roomId`, shows “No room found” with link to `/`.  
- Layout: Header (title, room code, LIVE indicator), toggle “Show QR” / “Hide QR”. Left: AudioVisualizer (card), ActivePrompts + Gemini reasoning + BPM. Right: QR (when shown), InfluenceMeter, Play/Stop button.  
- **AudioVisualizer** and **InfluenceMeter** only make sense when music is running; they still render when not playing (idle state).

---

### 4.8 `frontend/src/pages/Guest.jsx`

- Store: `role`, `roomId`, `isPlaying`, `activePrompts`.  
- **useEffect:** One-time unlock on first `touchstart` or `click`.  
- If no `role` or `roomId`, shows “Not in a room” with link to `/`.  
- **roleInfo = ROLES[role]:** Drummer → BPMSlider; Vibe Setter → MoodInput; Genre DJ → GenreGrid; Instrumentalist → InstrumentGrid; Energy → placeholder “Energy controls coming soon”.  
- Bottom: small “Currently playing” card listing `activePrompts[].text`.

---

### 4.9 `frontend/src/components/RoleCard.jsx`

Receives `role` (from ROLES). Renders a card with `role.emoji`, `role.label`, `role.description` and role-specific border/background classes.

---

### 4.10 `frontend/src/components/AudioVisualizer.jsx`

Uses `useAudioPlayer().getAnalyser()`. In a `requestAnimationFrame` loop: if no analyser or not playing, draws a flat line; else gets `getByteFrequencyData`, draws vertical bars with a purple→cyan gradient. Canvas 600×160, full width/height in layout.

---

### 4.11 `frontend/src/components/InfluenceMeter.jsx`

Takes `weights` (role → 0–1). Builds Recharts pie data: each role → label (from ROLES), value = round(weight*100). Renders `PieChart` with `Pie` (innerRadius 40, outerRadius 65), `Cell` fill from ROLE_COLORS; tooltip and a small legend list with role name and percentage.

---

### 4.12 `frontend/src/components/ActivePrompts.jsx`

Receives `prompts` (array of `{ text, weight }`). Renders a list of pill-shaped items: small dot (opacity from weight), prompt text, and weight as percentage. If empty, shows “No active prompts yet.”

---

### 4.13 `frontend/src/components/controls/BPMSlider.jsx`

Local state `bpm` (default 100). Range input 60–160; on change updates local state and `sendInput(userId, roomId, 'drummer', { bpm })`. Preset buttons 70, 90, 110, 128, 145 do the same. No debounce (every change sends immediately).

---

### 4.14 `frontend/src/components/controls/MoodInput.jsx`

- **selected:** array of up to 3 moods (from MOODS or custom).  
- **toggle(mood):** Add/remove from selected, cap at 3, then `sendInput(..., 'vibe_setter', { mood: selected.join(' ') })`.  
- **submitCustom:** Append custom text to selected (cap 3), clear input, send same payload.  
- UI: mood tiles, custom text input + Add, “Active” tags.

---

### 4.15 `frontend/src/components/controls/GenreGrid.jsx`

**selected:** single genre or null. **select(genre):** sets selected and `sendInput(..., 'genre_dj', { genre })`. Grid of GENRES; “Playing: …” when selected.

---

### 4.16 `frontend/src/components/controls/InstrumentGrid.jsx`

**selected:** array, max 2. **toggle(instrument):** add/remove, then `sendInput(..., 'instrumentalist', { instrument: selected.join(' and ') })`. Grid of INSTRUMENTS; “Active: …” when non-empty.

---

## 5. End-to-End Data Flow

1. **Host:** Home → “Host a Room” → WS `create_room` → server creates room, host joins, gets role → store `setRoom(..., true)` → navigate to Host.  
2. **Guests:** Open join URL or enter code → WS `join_room` → server assigns role → store `setRoom(..., false)` → navigate to Guest.  
3. **Host:** “Start Music” → WS `start_music` → server sets `is_playing`, starts Lyria session and 4s tick → broadcasts `music_started` → store `isPlaying = true`.  
4. **Lyria:** Backend receives audio chunks → `broadcast_callback` → `room_service.broadcast_bytes` → every client gets binary → `useWebSocket` passes to `enqueueAudio` → `useAudioPlayer` decodes and schedules → same audio on all devices.  
5. **Guests:** Change BPM/mood/genre/instrument → WS `input_update` → `room_service.update_input(room_id, role, payload)`.  
6. **Every 4s:** Tick runs → `gemini_service.arbitrate(current_inputs, …)` → Lyria `update_prompts` + config → `room_service.update_after_arbitration` → `broadcast_json(state_update)` → clients `applyStateUpdate` → UI (InfluenceMeter, ActivePrompts, BPM, etc.) updates.  
7. **Host:** “Stop Music” → `stop_music` → tick cancelled, Lyria stopped, `music_stopped` broadcast → `isPlaying = false`.

---

## 6. Environment and Deployment

- **Backend .env:** `GEMINI_API_KEY`, `FRONTEND_URL` (for CORS), `PORT` (8000).  
- **Frontend .env:** `VITE_WS_URL` (e.g. `wss://...` on Railway), `VITE_API_URL`.  
- **Dockerfile:** Python 3.11-slim, install deps, copy app, expose 8000, `uvicorn main:app --host 0.0.0.0 --port 8000`. Run from `backend/` so `main:app` and imports resolve.

---

## 7. Bug Fix Applied

- **room_service.py:** `get_state_update_message` was using `p.dict()` for Pydantic models. The project uses **Pydantic v2** (2.9.2); in v2 the correct method is `model_dump()`. This was changed to `[p.model_dump() for p in room.active_prompts]` so state_update JSON is built without AttributeError.

---

## 8. Summary Table

| Layer        | Responsibility |
|-------------|-----------------|
| **main.py** | App, CORS, health, mount WS router. |
| **ws.py**   | Accept WS, route messages, wire Lyria broadcast and 4s tick (Gemini → Lyria → state broadcast). |
| **room_service** | Rooms, join/leave, role assignment, input storage, 4s tick loop, broadcast JSON/bytes. |
| **lyria_service** | Lyria RealTime session, play/stop, receive audio → callback, update prompts/config. |
| **gemini_service** | Arbitrate inputs → 2–3 weighted prompts + BPM/density/brightness; fallback on failure. |
| **schemas** | Enums and Pydantic models for roles, messages, prompts, room state. |
| **Frontend** | React app: Home (create/join), Host (QR, visualizer, influence, play/stop), Guest (role + controls). Single WS, Zustand state, Web Audio queue + analyser; controls send `input_update` on change. |

This is the full technical picture of the CrowdSynth codebase and how each file contributes to the product.
