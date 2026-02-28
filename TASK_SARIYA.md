# Coro — Sariya's Tasks (Frontend Lead — All React UI)

> **Branch:** `frontend`
> **Your files:** Everything under `frontend/src/`
> **Time budget:** ~3 hours remaining

---

## Status: What the E2E Run Confirmed ✅

Frontend is fully built and compiles cleanly:
- All pages: Home, Host, Guest — exist and import correctly
- All components: AudioVisualizer, InfluenceMeter, ActivePrompts, RoleCard
- All controls: BPMSlider, MoodInput, GenreGrid, InstrumentGrid
- Hooks: useWebSocket (WS connection, room lifecycle), useAudioPlayer (Web Audio API)
- Store: Zustand roomStore with all state + actions
- Branding updated: "CrowdSynth" → "Coro" throughout
- `frontend/.env` set to `VITE_WS_URL=ws://localhost:8000/ws`

---

## Task 1 — Add BPM Debounce (MISSING — do this first)

**Problem:** `BPMSlider.jsx` sends an `input_update` message on EVERY slider movement — no debounce. This floods the backend with messages and makes Gemini fire prematurely.

`skill.md` rule 4.3 says: debounce sliders at **300ms minimum**.

**Fix in `frontend/src/components/controls/BPMSlider.jsx`:**

```jsx
import React, { useState, useCallback, useRef } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function BPMSlider() {
  const [bpm, setBpm] = useState(100)
  const { userId, roomId } = useRoomStore()
  const { sendInput } = useWebSocket()
  const debounceRef = useRef(null)

  const handleChange = useCallback((e) => {
    const val = Number(e.target.value)
    setBpm(val)
    // Debounce: only send after user stops moving for 300ms
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sendInput(userId, roomId, 'drummer', { bpm: val })
    }, 300)
  }, [userId, roomId, sendInput])

  // ... rest of component unchanged
```

Do the same for any other slider that might be added (e.g., energy controller density/brightness sliders).

---

## Task 2 — Build Energy Controller UI

**Problem:** `Guest.jsx` renders "Energy controls coming soon — use the sliders!" for the `energy` role. This role needs a real UI: two sliders for density (0.0–1.0) and brightness (0.0–1.0).

**Create `frontend/src/components/controls/EnergyControl.jsx`:**

```jsx
import React, { useState, useCallback, useRef } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function EnergyControl() {
  const [density, setDensity] = useState(0.5)
  const [brightness, setBrightness] = useState(0.5)
  const { userId, roomId } = useRoomStore()
  const { sendInput } = useWebSocket()
  const debounceRef = useRef(null)

  const send = (d, b) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sendInput(userId, roomId, 'energy', { density: d, brightness: b })
    }, 300)
  }

  return (
    <div className="card space-y-6">
      <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">
        Energy Control
      </p>

      {/* Density */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-cs-muted">Density</span>
          <span className="text-green-400 font-mono">{Math.round(density * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={density}
          onChange={(e) => { const v = Number(e.target.value); setDensity(v); send(v, brightness) }}
          className="w-full h-3 rounded-full accent-green-400 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-cs-muted mt-1">
          <span>Sparse</span><span>Dense</span>
        </div>
      </div>

      {/* Brightness */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-cs-muted">Brightness</span>
          <span className="text-green-400 font-mono">{Math.round(brightness * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={brightness}
          onChange={(e) => { const v = Number(e.target.value); setBrightness(v); send(density, v) }}
          className="w-full h-3 rounded-full accent-green-400 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-cs-muted mt-1">
          <span>Dark</span><span>Bright</span>
        </div>
      </div>
    </div>
  )
}
```

**Update `frontend/src/pages/Guest.jsx`:**

```jsx
import EnergyControl from '../components/controls/EnergyControl.jsx'

// In the render:
{role === 'energy' && <EnergyControl />}
// Replace the "coming soon" div
```

---

## Task 3 — Fix AudioVisualizer Hook Instance

**Problem:** `AudioVisualizer.jsx` calls `const { getAnalyser } = useAudioPlayer()`. But `useAudioPlayer()` might create a NEW AudioContext instance each time it's called (in Host.jsx it's also called via `const { unlock } = useAudioPlayer()`).

The analyser must be the SAME instance that receives audio. Check `useAudioPlayer.js` — it uses `useRef` which is per-component-instance. If called in 2 different components, they get 2 different refs.

**Fix:** Move the audio player state to Zustand or a React Context so both Host and AudioVisualizer share the same instance.

Simplest fix: Create `frontend/src/hooks/audioPlayerInstance.js`:

```js
// Shared singleton outside of React
let _audioCtx = null
let _analyser = null
let _nextPlayTime = 0

export function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 })
    _analyser = _audioCtx.createAnalyser()
    _analyser.fftSize = 256
    _analyser.connect(_audioCtx.destination)
    _nextPlayTime = _audioCtx.currentTime
  }
  return { ctx: _audioCtx, analyser: _analyser }
}

export function getNextPlayTime() { return _nextPlayTime }
export function setNextPlayTime(t) { _nextPlayTime = t }
```

Then update `useAudioPlayer.js` to import from this singleton instead of creating refs.

---

## Task 4 — Add Smooth Prompt Transitions (Visual)

**Problem:** When `state_update` arrives, the `ActivePrompts` component immediately replaces all prompts. This looks jarring — prompts just swap.

**Fix in `frontend/src/components/ActivePrompts.jsx`:**

Add a fade-in animation by tracking previous prompts and using CSS transitions:

```jsx
import React, { useState, useEffect } from 'react'

export default function ActivePrompts({ prompts = [] }) {
  const [displayed, setDisplayed] = useState([])

  useEffect(() => {
    setDisplayed(prompts)
  }, [prompts])

  if (!displayed.length) return <p className="text-cs-muted text-sm">No active prompts yet.</p>

  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((p, i) => (
        <div
          key={p.text}
          className="flex items-center gap-2 bg-cs-bg border border-cs-border rounded-full px-3 py-1.5 transition-all duration-500"
          style={{ opacity: 0.4 + p.weight * 0.6 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cs-accent" />
          <span className="text-sm text-cs-text">{p.text}</span>
          <span className="text-xs text-cs-muted font-mono">{Math.round(p.weight * 100)}%</span>
        </div>
      ))}
    </div>
  )
}
```

---

## Task 5 — Deploy to Vercel

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set **Root Directory** to `frontend/`
3. Set **Framework** to Vite
4. Add environment variable:
   ```
   VITE_WS_URL=wss://[your-railway-url].railway.app/ws
   ```
   (Get this URL from Bharath after Railway deploy)
5. Deploy
6. Verify on mobile: open the Vercel URL on your phone, confirm:
   - Page loads
   - Connection dot goes GREEN (backend must be running on Railway)
   - "Host a Room" button works
7. Update `frontend/.env.example` with the Vercel URL for docs

---

## Task 6 — Mobile Polish

Test on actual mobile (375px width) and fix any issues:

**Checklist:**
- [ ] Home page: "Host a Room" button fills width, no overflow
- [ ] Guest page: role card fits screen, controls scroll smoothly
- [ ] GenreGrid: 3-column grid doesn't overflow on small screens
- [ ] InstrumentGrid: same
- [ ] BPMSlider: large enough to tap accurately
- [ ] MoodInput: custom text input has correct mobile keyboard behavior
- [ ] Host page: QR code visible, "● LIVE" and room code visible together

**Quick tip:** Open Chrome DevTools → Device Toolbar → set to iPhone 12 Mini (375×812)

---

## Task 7 — Add "Waiting for host..." State on Guest

**Problem:** After joining, the guest sees their role card and controls, but there's no clear indication that music hasn't started yet. The "Waiting for host..." text is there but could be more prominent.

**Enhancement in `frontend/src/pages/Guest.jsx`:**

When `!isPlaying`, show a subtle pulsing indicator below the role card:

```jsx
{!isPlaying && (
  <div className="mt-4 flex items-center justify-center gap-2 text-cs-muted text-sm animate-pulse">
    <div className="w-2 h-2 rounded-full bg-yellow-400" />
    Waiting for host to start music...
  </div>
)}
```

---

## Commit Format

```
fix: add bpm slider debounce 300ms
feat: energy controller ui with density and brightness sliders
fix: audio player shared singleton for analyser
feat: active prompts fade-in transition
style: mobile layout polish pass
```

Branch: `frontend` → merge to `main` before Vercel deploy.

---

## Key Files

All under `frontend/src/`:
- `components/controls/BPMSlider.jsx` — add debounce
- `components/controls/EnergyControl.jsx` — create new
- `pages/Guest.jsx` — add EnergyControl, waiting state
- `components/ActivePrompts.jsx` — smooth transitions
- `hooks/useAudioPlayer.js` — fix shared instance
- `components/AudioVisualizer.jsx` — verify analyser works
