import React, { useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import RoleCard from '../components/RoleCard.jsx'
import BPMSlider from '../components/controls/BPMSlider.jsx'
import MoodInput from '../components/controls/MoodInput.jsx'
import GenreGrid from '../components/controls/GenreGrid.jsx'
import InstrumentGrid from '../components/controls/InstrumentGrid.jsx'
import { ROLES } from '../lib/constants.js'

export default function Guest() {
  const { role, roomId, isPlaying, activePrompts } = useRoomStore()
  const { unlock } = useAudioPlayer()

  // Unlock audio on first interaction
  useEffect(() => {
    const handler = () => unlock()
    window.addEventListener('touchstart', handler, { once: true })
    window.addEventListener('click', handler, { once: true })
    return () => {
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('click', handler)
    }
  }, [unlock])

  if (!role || !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-cs-muted">Not in a room. <a href="/" className="text-cs-accent underline">Go back</a></p>
      </div>
    )
  }

  const roleInfo = ROLES[role]

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            Co<span className="text-cs-accent">ro</span>
          </h1>
          <p className="text-cs-muted text-sm">
            Room <span className="font-mono text-white">{roomId}</span>
          </p>
        </div>
        {isPlaying
          ? <span className="text-green-400 text-sm font-medium animate-pulse">● LIVE</span>
          : <span className="text-cs-muted text-sm">Waiting for host...</span>
        }
      </div>

      {/* Role card */}
      <RoleCard role={roleInfo} />

      {/* Controls — render based on role */}
      <div className="mt-6 flex-1">
        {role === 'drummer' && <BPMSlider />}
        {role === 'vibe_setter' && <MoodInput />}
        {role === 'genre_dj' && <GenreGrid />}
        {role === 'instrumentalist' && <InstrumentGrid />}
        {role === 'energy' && (
          <div className="card text-cs-muted text-sm">
            Energy controls coming soon — use the sliders!
          </div>
        )}
      </div>

      {/* Active prompts mini display */}
      {activePrompts.length > 0 && (
        <div className="mt-6 card">
          <p className="text-xs text-cs-muted mb-2">Currently playing</p>
          <div className="flex flex-wrap gap-2">
            {activePrompts.map((p, i) => (
              <span key={i} className="text-xs bg-cs-bg border border-cs-border rounded-full px-3 py-1 text-cs-text">
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
