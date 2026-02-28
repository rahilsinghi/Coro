import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
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
import { TabSwitcher, QuickActionsPanel } from '../components/StudioTabs.jsx'

// Role selection card —————————————————————————————————————————————————
function RoleSelectCard({ selected, onSelect }) {
  const roles = Object.values(ROLES)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {roles.map(r => {
        const isSelected = selected === r.id
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all duration-200 active:scale-95 text-center"
            style={{
              background: isSelected ? 'rgba(0,209,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: isSelected ? '1px solid rgba(0,209,255,0.45)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isSelected ? '0 0 20px rgba(0,209,255,0.15)' : 'none',
            }}
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className={`text-xs font-black uppercase tracking-wide ${isSelected ? 'text-[#00D1FF]' : 'text-white/70'}`}>
              {r.label}
            </span>
            <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider">{r.description}</span>
          </button>
        )
      })}
    </div>
  )
}

// Join CORO Room card (shown before joining) ——————————————————————————
function JoinCard() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId] = useState(() => localStorage.getItem('cs_user_id') || uuidv4())
  const { joinRoom } = useWebSocket()

  useEffect(() => {
    localStorage.setItem('cs_user_id', userId)
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid) setJoinCode(rid)
  }, [userId])

  const handleJoin = async () => {
    if (!joinCode.trim() || !selectedRole) return
    setLoading(true); setError('')
    try {
      const result = await joinRoom(joinCode.trim().toUpperCase(), userId, selectedRole)
      if (result?.error) {
        setError(result.error)
      } else {
        navigate('/guest')
      }
    } catch {
      setError('Failed to join room.')
    } finally {
      setLoading(false)
    }
  }

  const isFull = error.toLowerCase().includes('full')

  return (
    <div
      className="w-full max-w-lg mx-auto rounded-[2rem] p-7"
      style={{ background: 'rgba(0,12,30,0.70)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.16)' }}
    >
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/20">
          <span className="text-base">🎵</span>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(0,209,255,0.65)' }}>CORO Studio</p>
          <h2 className="text-lg font-black text-white tracking-tight">Join CORO Room</h2>
        </div>
      </div>

      {/* Room ID input */}
      <div className="mb-6">
        <input
          type="text"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="Enter room ID"
          maxLength={6}
          inputMode="text"
          autoCapitalize="characters"
          className="w-full font-mono tracking-[0.4em] text-center text-white outline-none text-sm uppercase"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: joinCode ? '1px solid rgba(0,209,255,0.40)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: '1rem',
            padding: '0.85rem 1.2rem',
          }}
          onFocus={e => e.target.style.borderColor = '#00D1FF'}
          onBlur={e => e.target.style.borderColor = joinCode ? 'rgba(0,209,255,0.40)' : 'rgba(255,255,255,0.12)'}
        />
      </div>

      {/* Role selection */}
      <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>
        Select Your Role
      </p>
      <RoleSelectCard selected={selectedRole} onSelect={setSelectedRole} />

      {/* Error */}
      {error && (
        <div className={`flex items-center gap-2 mt-4 rounded-xl px-4 py-3 text-sm font-black justify-center
                    ${isFull
            ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
            : 'bg-red-400/10 border border-red-400/20 text-red-400 animate-pulse'
          }`}
        >
          {isFull ? '🚫' : '⚠️'} {error}
        </div>
      )}

      {/* Join button */}
      <button
        onClick={handleJoin}
        disabled={!joinCode.trim() || !selectedRole || loading}
        className="mt-6 w-full py-4 rounded-2xl font-black text-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#00D1FF', boxShadow: '0 12px 36px rgba(0,209,255,0.28)' }}
      >
        {loading ? 'Joining...' : 'Join Session →'}
      </button>
    </div>
  )
}

// ─── Main Guest page ─────────────────────────────────────────────────────────
export default function Guest() {
  const { role, roomId, userId, isPlaying, activePrompts } = useRoomStore()
  const { unlock } = useAudioPlayer()
  const { sendInput } = useWebSocket()
  const [tab, setTab] = useState('studio')

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

  const inRoom = !!(role && roomId)
  const roleInfo = ROLES[role]

  return (
    <div className="min-h-screen flex flex-col px-4 sm:px-6 max-w-2xl mx-auto pt-20 pb-12 pointer-events-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-black text-white/35 uppercase tracking-[0.45em]">
            CORO <span className="text-[#00D1FF]/60">Studio Node</span>
          </p>
          {inRoom && (
            <p className="text-base font-black text-white mt-0.5">
              Session <span className="text-[#00D1FF] font-mono tracking-widest">{roomId}</span>
            </p>
          )}
        </div>
        {inRoom && (
          isPlaying
            ? <div className="flex items-center gap-2 bg-[#00D1FF]/10 px-4 py-1.5 rounded-full border border-[#00D1FF]/20">
              <span className="text-[#00D1FF] text-[8px] font-black uppercase tracking-widest animate-pulse">Live</span>
            </div>
            : <span className="text-white/20 text-[8px] font-black uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full">Syncing...</span>
        )}
      </div>

      {/* ── Tab Switcher ── */}
      <TabSwitcher active={tab} onChange={setTab} />

      {/* ── STUDIO TAB ── */}
      {tab === 'studio' && (
        <>
          {!inRoom ? (
            /* Join card — shown before entering a room */
            <JoinCard />
          ) : (
            /* In-room controls */
            <div className="flex flex-col gap-4">
              {/* Role card */}
              <RoleCard role={roleInfo} />

              {/* Waiting indicator */}
              {!isPlaying && (
                <div className="flex items-center justify-center gap-2 text-white/40 text-sm animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]" />
                  Waiting for host to start music...
                </div>
              )}

              {/* Role controls */}
              <div className="space-y-4">
                {role === 'drummer' && <BPMSlider />}
                {role === 'vibe_setter' && <MoodInput />}
                {role === 'genre_dj' && <GenreGrid />}
                {role === 'instrumentalist' && <InstrumentGrid />}
                {role === 'energy' && <EnergyControl />}

                {/* Free-text custom prompt */}
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
              </div>

              {/* Active prompts mini display */}
              {activePrompts.length > 0 && (
                <div className="glass-card p-6">
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
          )}
        </>
      )}

      {/* ── QUICK ACTIONS TAB ── */}
      {tab === 'quick-actions' && <QuickActionsPanel />}
    </div>
  )
}
