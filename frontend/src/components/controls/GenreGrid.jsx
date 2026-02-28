import React, { useState, useCallback } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { GENRES } from '../../lib/constants.js'

export default function GenreGrid() {
  const [selected, setSelected] = useState(null)
  const { userId, roomId } = useRoomStore()
  const { sendInput } = useWebSocket()

  const select = useCallback((genre) => {
    setSelected(genre)
    sendInput(userId, roomId, 'genre_dj', { genre })
  }, [userId, roomId, sendInput])

  return (
    <div className="card space-y-4">
      <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">
        Pick a genre <span className="text-cyan-400">(one at a time)</span>
      </p>

      <div className="grid grid-cols-3 gap-2">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => select(genre)}
            className={`tile text-center ${selected === genre ? 'tile-active border-cyan-400 text-cyan-400' : ''}`}
          >
            {genre}
          </button>
        ))}
      </div>

      {selected && (
        <p className="text-xs text-cs-muted">
          Playing: <span className="text-cyan-400 font-medium">{selected}</span>
        </p>
      )}
    </div>
  )
}
