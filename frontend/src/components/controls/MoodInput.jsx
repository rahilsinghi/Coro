import React, { useState, useCallback } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { MOODS } from '../../lib/constants.js'

export default function MoodInput() {
  const [selected, setSelected] = useState([])
  const [custom, setCustom] = useState('')
  const { userId, roomId } = useRoomStore()
  const { sendInput } = useWebSocket()

  const toggle = useCallback((mood) => {
    setSelected((prev) => {
      const next = prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : [...prev, mood].slice(-3) // max 3
      sendInput(userId, roomId, 'vibe_setter', { mood: next.join(' ') })
      return next
    })
  }, [userId, roomId, sendInput])

  const submitCustom = () => {
    if (!custom.trim()) return
    const next = [...selected, custom.trim()].slice(-3)
    setSelected(next)
    setCustom('')
    sendInput(userId, roomId, 'vibe_setter', { mood: next.join(' ') })
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">
        Set the vibe <span className="text-pink-400">(pick up to 3)</span>
      </p>

      <div className="flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood}
            onClick={() => toggle(mood)}
            className={`tile ${selected.includes(mood) ? 'tile-active border-pink-400 text-pink-400' : ''}`}
          >
            {mood}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
          placeholder="Type your own vibe..."
          className="flex-1 bg-cs-bg border border-cs-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-cs-muted focus:outline-none focus:border-pink-400"
        />
        <button onClick={submitCustom} className="btn-secondary text-sm px-4">Add</button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-cs-muted">Active:</span>
          {selected.map((m) => (
            <span key={m} className="text-xs text-pink-400 bg-pink-950/30 border border-pink-900 rounded-full px-3 py-1">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
