import React, { useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import RoleCard from '../components/RoleCard.jsx'
import BPMSlider from '../components/controls/BPMSlider.jsx'
import MoodInput from '../components/controls/MoodInput.jsx'
import GenreGrid from '../components/controls/GenreGrid.jsx'
import InstrumentGrid from '../components/controls/InstrumentGrid.jsx'
import EnergyControl from '../components/controls/EnergyControl.jsx'
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
        <p className="text-white/30 font-black uppercase text-[10px] tracking-[0.4em]">No active session found. <a href="/" className="text-[#00D1FF] underline ml-2">Return</a></p>
      </div>
    )
  }

  const roleInfo = ROLES[role]

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 max-w-md mx-auto pt-24 pb-12 pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xs font-black text-white/40 uppercase tracking-[0.5em]">
            CORO <span className="text-[#00D1FF]/60 text-[10px]">Studio Node</span>
          </h1>
          <p className="text-lg font-black text-white mt-1">
            Session <span className="text-[#00D1FF] font-mono tracking-widest">{roomId}</span>
          </p>
        </div>
        {isPlaying
          ? <div className="flex items-center gap-2 bg-[#00D1FF]/10 px-4 py-1.5 rounded-full border border-[#00D1FF]/20">
            <span className="text-[#00D1FF] text-[8px] font-black uppercase tracking-widest animate-pulse">Live</span>
          </div>
          : <span className="text-white/20 text-[8px] font-black uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full">Syncing...</span>
        }
      </div>

      {/* Role card */}
      <RoleCard role={roleInfo} />

      {/* Controls — render based on role */}
      <div className="mt-8 flex-1">
        {role === 'drummer' && <BPMSlider />}
        {role === 'vibe_setter' && <MoodInput />}
        {role === 'genre_dj' && <GenreGrid />}
        {role === 'instrumentalist' && <InstrumentGrid />}
        {role === 'energy' && <EnergyControl />}
      </div>

      {/* Active prompts mini display */}
      {activePrompts.length > 0 && (
        <div className="mt-8 glass-card p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00D1FF]/60 mb-4">Master Audio Stream</p>
          <div className="flex flex-wrap gap-2">
            {activePrompts.map((p, i) => (
              <span key={i} className="text-[10px] font-bold bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-white/70 uppercase tracking-wider">
                {p.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
