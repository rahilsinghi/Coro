import React, { useState, useCallback } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { INSTRUMENTS } from '../../lib/constants.js'

export default function InstrumentGrid() {
  const [selected, setSelected] = useState([])
  const { userId, roomId } = useRoomStore()
  const { sendInput } = useWebSocket()

  const toggle = useCallback((instrument) => {
    setSelected((prev) => {
      const next = prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument].slice(-2) // max 2
      sendInput(userId, roomId, 'instrumentalist', { instrument: next.join(' and ') })
      return next
    })
  }, [userId, roomId, sendInput])

  return (
    <div className="card space-y-4">
      <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">
        Pick instruments <span className="text-purple-400">(up to 2)</span>
      </p>

      <div className="grid grid-cols-3 gap-2">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst}
            onClick={() => toggle(inst)}
            className={`tile text-center text-xs ${selected.includes(inst) ? 'tile-active border-purple-400 text-purple-400' : ''}`}
          >
            {inst}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-cs-muted">
          Active: <span className="text-purple-400 font-medium">{selected.join(' + ')}</span>
        </p>
      )}
    </div>
  )
}
