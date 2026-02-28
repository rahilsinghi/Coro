import React, { useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useWebSocket } from '../hooks/useWebSocket'
import RoleCard from '../components/RoleCard.jsx'
import BPMSlider from '../components/controls/BPMSlider.jsx'
import MoodInput from '../components/controls/MoodInput.jsx'
import GenreGrid from '../components/controls/GenreGrid.jsx'
import InstrumentGrid from '../components/controls/InstrumentGrid.jsx'
import EnergyControl from '../components/controls/EnergyControl.jsx'
import { ROLES, PROMPT_HINTS } from '../lib/constants.js'

export default function Guest() {
  const { role, roomId, userId, isPlaying, activePrompts, dropProgress } = useRoomStore()
  const { unlock } = useAudioPlayer()
  const { sendInput, send } = useWebSocket()
  const [micEnabled, setMicEnabled] = React.useState(false)
  const micStreamRef = React.useRef(null)
  const micIntervalRef = React.useRef(null)

  const toggleMic = async () => {
    if (micEnabled) {
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      if (micIntervalRef.current) clearInterval(micIntervalRef.current)
      setMicEnabled(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      const data = new Uint8Array(analyser.frequencyBinCount)

      setMicEnabled(true)

      micIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
        send({ type: 'applause_update', user_id: userId, room_id: roomId, volume: avg })
      }, 500)
    } catch (err) {
      console.error('Failed to access microphone:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      if (micIntervalRef.current) clearInterval(micIntervalRef.current)
    }
  }, [])

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
      <div className="mt-6 flex-1 space-y-4">
        {role === 'drummer' && <BPMSlider />}
        {role === 'vibe_setter' && <MoodInput />}
        {role === 'genre_dj' && <GenreGrid />}
        {role === 'instrumentalist' && <InstrumentGrid />}
        {role === 'energy' && <EnergyControl />}

        {/* Free-text prompt — available for all roles */}
        {role && (
          <div
            className="flex flex-col gap-3"
            style={{
              background: 'rgba(0,12,30,0.55)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0,209,255,0.14)',
              borderRadius: '1.25rem',
              padding: '1rem 1.25rem',
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: 'rgba(0,209,255,0.65)' }}>
              ✨ Describe what you want to hear
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={PROMPT_HINTS[role]}
                className="flex-1 text-sm text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '0.75rem',
                  padding: '0.6rem 0.9rem',
                  color: '#fff',
                }}
                onFocus={e => e.target.style.borderColor = '#00D1FF'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    sendInput(userId, roomId, role, { custom_prompt: e.target.value.trim() })
                    e.target.value = ''
                  }
                }}
              />
              <button
                className="font-black text-black text-xs rounded-xl px-4 active:scale-95 transition-transform"
                style={{ background: '#00D1FF', boxShadow: '0 0 14px rgba(0,209,255,0.30)' }}
                onClick={(e) => {
                  const input = e.currentTarget.previousSibling
                  if (input.value.trim()) {
                    sendInput(userId, roomId, role, { custom_prompt: input.value.trim() })
                    input.value = ''
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {!isPlaying && (
        <div className="mt-8 flex flex-col items-center gap-4 py-8 glass-card border-dashed">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15]" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Waiting for host to start music...</p>
        </div>
      )}

      {/* DROP BUTTON — always visible when playing */}
      {isPlaying && (
        <div className="mt-8">
          <button
            onClick={() => {
              send({ type: 'drop', user_id: userId, room_id: roomId })
              navigator.vibrate?.(100)
            }}
            className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-red-600 to-orange-500
              text-white text-2xl font-black uppercase tracking-[0.2em]
              shadow-[0_20px_40px_rgba(239,68,68,0.4)]
              active:scale-95 transition-all duration-300
              animate-pulse hover:animate-none hover:shadow-[0_25px_50px_rgba(239,68,68,0.6)]"
          >
            💥 DROP
          </button>
          {dropProgress > 0 && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
                {dropProgress}/3 COLLABORATORS READY
              </p>
              <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${(dropProgress / 3) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mic toggle */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={toggleMic}
          className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-300 ${micEnabled
              ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60'
            }`}
        >
          <span className="text-lg">{micEnabled ? '🎙️' : '🔇'}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">
            {micEnabled ? 'Mic Active (Applause Mode)' : 'Enable Mic for Applause'}
          </span>
        </button>
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
