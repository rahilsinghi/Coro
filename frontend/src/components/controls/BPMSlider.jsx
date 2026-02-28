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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">Tempo</p>
        <span className="text-4xl font-bold font-mono text-amber-400">{bpm}</span>
      </div>

      <input
        type="range"
        min={60}
        max={160}
        value={bpm}
        onChange={handleChange}
        className="w-full h-3 rounded-full accent-amber-400 cursor-pointer"
      />

      <div className="flex justify-between text-xs text-cs-muted mt-2">
        <span>60 BPM</span>
        <span>Slow · Medium · Fast</span>
        <span>160 BPM</span>
      </div>

      {/* BPM presets */}
      <div className="flex gap-2 mt-5 flex-wrap">
        {[70, 90, 110, 128, 145].map((v) => (
          <button
            key={v}
            onClick={() => {
              setBpm(v)
              sendInput(userId, roomId, 'drummer', { bpm: v })
            }}
            className={`tile flex-1 text-center ${bpm === v ? 'tile-active' : ''}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
