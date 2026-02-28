# TASK: All 3 Feature UIs — Sariya

> **Features**: Drop Button, Applause Meter, Musical Timeline
> **Time budget**: 2.5 hours
> **Files**: `Guest.jsx`, `Host.jsx`, new component files

## IMPORTANT: `git pull origin main` first!
Rahil pushed smooth transitions, room cap, and Gemini continuity. Pull before starting.

---

## Feature 1: Drop Button (Guest.jsx)

### What to build
A big pulsing "DROP" button at the bottom of every guest's screen. When pressed:
1. Send `{type: "drop", user_id, room_id}` via WebSocket
2. Show a shockwave animation on press
3. Listen for `drop_progress` → show "2/3 ready..." counter
4. Listen for `drop_triggered` → full-screen flash + haptic vibration

### Code for Guest.jsx
Add below the role controls:
```jsx
{/* DROP BUTTON — always visible when playing */}
{isPlaying && (
  <div className="mt-6">
    <button
      onClick={() => {
        send({ type: 'drop', user_id: userId, room_id: roomId })
        // Haptic feedback on mobile
        navigator.vibrate?.(100)
      }}
      className="w-full py-6 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500
        text-white text-2xl font-black uppercase tracking-widest
        shadow-[0_0_30px_rgba(239,68,68,0.5)]
        active:scale-95 transition-transform
        animate-pulse hover:animate-none hover:shadow-[0_0_50px_rgba(239,68,68,0.8)]"
    >
      💥 DROP
    </button>
    {dropProgress > 0 && (
      <p className="text-center text-orange-400 text-sm mt-2 font-bold animate-bounce">
        {dropProgress}/3 ready...
      </p>
    )}
  </div>
)}
```

### State to add in Guest.jsx or roomStore:
```jsx
const [dropProgress, setDropProgress] = useState(0)

// In handleMessage or useWebSocket:
case 'drop_progress':
  setDropProgress(msg.count)
  break
case 'drop_triggered':
  // Full screen flash effect
  document.body.classList.add('drop-flash')
  navigator.vibrate?.([200, 100, 200])
  setTimeout(() => document.body.classList.remove('drop-flash'), 1000)
  setDropProgress(0)
  break
```

### CSS for the flash (index.css):
```css
.drop-flash {
  animation: dropFlash 0.5s ease-out;
}
@keyframes dropFlash {
  0% { filter: brightness(3) saturate(2); }
  100% { filter: brightness(1) saturate(1); }
}
```

---

## Feature 2: Applause Meter (Guest.jsx + Host.jsx)

### Guest side — Microphone capture
Add a "Enable Mic" toggle button. When enabled, capture mic volume and send every 500ms:

```jsx
const [micEnabled, setMicEnabled] = useState(false)
const micStreamRef = useRef(null)

const toggleMic = async () => {
  if (micEnabled) {
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    setMicEnabled(false)
    return
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  micStreamRef.current = stream
  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  const source = ctx.createMediaStreamSource(stream)
  source.connect(analyser)
  analyser.fftSize = 256
  const data = new Uint8Array(analyser.frequencyBinCount)

  setMicEnabled(true)

  const interval = setInterval(() => {
    analyser.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
    send({ type: 'applause_update', user_id: userId, room_id: roomId, volume: avg })
  }, 500)

  // Cleanup when mic is disabled
  micStreamRef.current._interval = interval
}
```

### Host side — Applause level display (Host.jsx)
Add a new component or inline meter that listens for `applause_level` broadcasts:
```jsx
{/* Applause Meter */}
<div className="card">
  <p className="text-xs text-cs-muted font-medium uppercase tracking-wider mb-2">
    👏 Crowd Energy
  </p>
  <div className="w-full bg-cs-bg rounded-full h-4 overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-300"
      style={{ width: `${applauseLevel * 100}%` }}
    />
  </div>
  <p className="text-xs text-cs-muted mt-1 text-right">{Math.round(applauseLevel * 100)}%</p>
</div>
```

Store `applauseLevel` in roomStore and update on `applause_level` messages.

---

## Feature 3: Musical Timeline (Host.jsx)

### What to build
A scrolling feed on the host screen showing the story of the session.

### New component: `Timeline.jsx`
```jsx
import React, { useRef, useEffect } from 'react'

export default function Timeline({ events = [] }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  if (events.length === 0) {
    return <p className="text-cs-muted text-sm">Waiting for inputs...</p>
  }

  return (
    <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="text-lg">{e.emoji}</span>
          <div className="flex-1">
            <span className="text-cs-muted text-xs">
              {new Date(e.time * 1000).toLocaleTimeString()}
            </span>
            <p className="text-white">
              <span className="text-cs-accent font-medium capitalize">{e.source}</span>{' '}
              {e.text}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

### Add to Host.jsx:
```jsx
import Timeline from '../components/Timeline.jsx'

// In the right panel, add:
<div className="card">
  <p className="text-xs text-cs-muted font-medium uppercase tracking-wider mb-3">
    📜 Session Story
  </p>
  <Timeline events={timeline} />
</div>
```

`timeline` should come from `roomStore`, populated from the `state_update.timeline` field.

### Add to roomStore.js:
```js
timeline: [],

// In applyStateUpdate:
if (msg.timeline) set({ timeline: msg.timeline })
```

---

## Priority Order
1. **Drop Button** (30 min) — highest demo impact
2. **Timeline** (45 min) — shows the collaborative story
3. **Applause Meter** (45 min) — requires mic permissions

## Git
```bash
git pull origin main
git checkout -b feat/v2-ui
# work...
git add . && git commit -m "feat: drop button, applause meter, timeline UI"
git push origin feat/v2-ui
# Create PR → merge
```
