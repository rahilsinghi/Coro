import React, { useState, useEffect, useRef } from 'react'
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

// Role selection card
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

// Join CORO Room card (shown before joining)
function JoinCard() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId] = useState(() => localStorage.getItem('cs_user_id') || uuidv4())
  const { joinRoom } = useWebSocket()
  const displayName = useRoomStore((s) => s.displayName)

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
      const result = await joinRoom(joinCode.trim().toUpperCase(), userId, { displayName })
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
          {isFull ? '' : ''} {error}
        </div>
      )}

      {/* Join button */}
      <button
        onClick={handleJoin}
        disabled={!joinCode.trim() || !selectedRole || loading}
        className="mt-6 w-full py-4 rounded-2xl font-black text-black text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#00D1FF', boxShadow: '0 12px 36px rgba(0,209,255,0.28)' }}
      >
        {loading ? 'Joining...' : 'Join Session'}
      </button>
    </div>
  )
}

function formatInputSummary(inputs) {
  if (!inputs || typeof inputs !== 'object') return ''
  return Object.entries(inputs)
    .filter(([k]) => k !== 'custom_prompt')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

// ─── Main Guest page
export default function Guest() {
  const { role, roomId, userId, isPlaying, activePrompts, participants, currentInputs, dropProgress } = useRoomStore()
  const { unlock } = useAudioPlayer()
  const { send, sendInput, addListener } = useWebSocket()
  const [tab, setTab] = useState('studio')

  // UI state
  const [showShock, setShowShock] = useState(false)

  // Applause / mic state
  const [micEnabled, setMicEnabled] = useState(false)
  const micStreamRef = useRef(null)

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

  // Cleanup mic stream on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop())
        if (micStreamRef.current._interval) clearInterval(micStreamRef.current._interval)
      }
    }
  }, [])

  const handleDrop = () => {
    send({ type: 'drop', user_id: userId, room_id: roomId })
    navigator.vibrate?.(100)
    setShowShock(true)
    setTimeout(() => setShowShock(false), 700)
  }

  const toggleMic = async () => {
    if (micEnabled) {
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      if (micStreamRef.current?._interval) clearInterval(micStreamRef.current._interval)
      micStreamRef.current = null
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
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
        send({ type: 'applause_update', user_id: userId, room_id: roomId, volume: avg })
      }, 500)
      micStreamRef.current._interval = interval
    } catch (e) {
      console.warn('[Mic] Permission denied or unavailable:', e)
      alert("Microphone access is required for the applause feature.")
    }
  }

  const inRoom = !!(role && roomId)
  const roleInfo = ROLES[role]

  // Other participants (exclude self)
  const otherParticipants = participants.filter(p => p.user_id !== userId)

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
                    Describe what you want to hear
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

              {/* Band Activity — what other roles are doing */}
              {otherParticipants.length > 0 && (
                <div
                  className="rounded-[1.25rem] p-5"
                  style={{ background: 'rgba(0,12,30,0.55)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,209,255,0.14)' }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00D1FF]/60 mb-3">Band Activity</p>
                  <div className="space-y-2">
                    {otherParticipants.map((p) => {
                      const pRoleInfo = ROLES[p.role]
                      const inputSummary = formatInputSummary(currentInputs[p.role])
                      return (
                        <div key={p.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                          <span className="text-base">{pRoleInfo?.emoji || '🎵'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white/70">
                              {p.display_name || p.user_id.slice(0, 8)}
                              <span className="text-white/30 font-normal ml-2">{pRoleInfo?.label || p.role}</span>
                            </p>
                            {inputSummary && (
                              <p className="text-[10px] text-white/40 truncate">{inputSummary}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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

              {/* ── APPLAUSE MIC TOGGLE ── */}
              <div
                className="flex items-center justify-between px-5 py-4 rounded-2xl"
                style={{ background: 'rgba(0,12,30,0.55)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.40)' }}>Crowd Energy</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>Share your mic to energise the room</p>
                </div>
                <button
                  onClick={toggleMic}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                  style={micEnabled
                    ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }
                    : { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80' }
                  }
                >
                  {micEnabled ? 'Stop' : 'Enable'}
                </button>
              </div>

              {/* ── DROP BUTTON ── */}
              {isPlaying && (
                <div className="relative mt-2">
                  {/* Shockwave ring */}
                  {showShock && (
                    <div
                      className="shockwave absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)' }}
                    />
                  )}
                  <button
                    onClick={handleDrop}
                    className="w-full py-6 rounded-2xl text-white text-2xl font-black uppercase tracking-widest transition-transform active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
                      boxShadow: '0 0 30px rgba(239,68,68,0.50)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 52px rgba(239,68,68,0.75)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(239,68,68,0.50)'}
                  >
                    DROP
                  </button>
                  {dropProgress > 0 && (
                    <p className="text-center text-orange-400 text-sm mt-2 font-bold animate-bounce">
                      {dropProgress}/3 ready...
                    </p>
                  )}
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
