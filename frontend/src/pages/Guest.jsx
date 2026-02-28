import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useWebSocket } from '../hooks/useWebSocket'
import RoleCard from '../components/RoleCard.jsx'
import BPMSlider from '../components/controls/BPMSlider.jsx'
import MoodInput from '../components/controls/MoodInput.jsx'
import GenreGrid from '../components/controls/GenreGrid.jsx'
import InstrumentGrid from '../components/controls/InstrumentGrid.jsx'
import EnergyControl from '../components/controls/EnergyControl.jsx'
import DropButton from '../components/DropButton.jsx'
import { ROLES, PROMPT_HINTS } from '../lib/constants.js'
import MiniPromptBar from '../components/MiniPromptBar.jsx'
import PlayBar from '../components/PlayBar.jsx'
import AudioVisualizer from '../components/AudioVisualizer.jsx'
import BandStage from '../components/BandStage.jsx'
import InfluenceMeter from '../components/InfluenceMeter.jsx'
import ActivePrompts from '../components/ActivePrompts.jsx'
import Timeline from '../components/Timeline.jsx'

// ─── Join Lobby (join by code + live rooms) ──────────────────────────────────
function JoinLobby() {
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { joinRoom } = useWebSocket()
  const { isConnected, userId, displayName } = useRoomStore()
  const [availableRooms, setAvailableRooms] = useState([])

  // Auto-fill room code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid) setJoinCode(rid)
  }, [])

  // Auto-join when arriving via ?room_id= link
  const autoJoinAttempted = useRef(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid && isConnected && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      ;(async () => {
        setLoading(true)
        try {
          const result = await joinRoom(rid.toUpperCase(), userId, { displayName })
          if (result?.error) setError(result.error)
        } catch {
          setError('Failed to auto-join room.')
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [isConnected, joinRoom, userId, displayName])

  // Fetch live rooms periodically
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const apiBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws')
          .replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '')
        const res = await fetch(`${apiBase}/rooms`)
        const data = await res.json()
        setAvailableRooms(data.rooms || [])
      } catch {
        // Silently fail
      }
    }
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleJoin = async () => {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    try {
      const result = await joinRoom(joinCode.trim().toUpperCase(), userId, { displayName })
      if (result?.error) setError(result.error)
    } catch {
      setError('Failed to join room.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async (roomId) => {
    setLoading(true); setError('')
    try {
      const result = await joinRoom(roomId, userId, { displayName })
      if (result?.error) setError(result.error)
    } catch {
      setError('Failed to join room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Connection indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00D1FF] shadow-[0_0_10px_#00D1FF]' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
            {isConnected ? 'Online' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Join Card */}
      <div
        className="rounded-[2rem] p-8 space-y-6"
        style={{
          background: 'rgba(0,12,30,0.70)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0,209,255,0.16)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Join <span className="text-[#00D1FF]">Session</span>
          </h1>
          <p className="text-white/40 text-sm">Enter a room code or pick a live room below.</p>
        </div>

        {/* Join by code */}
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="ROOM CODE"
            maxLength={6}
            className="flex-1 font-mono tracking-widest text-center uppercase text-sm text-white outline-none rounded-xl py-3.5 px-4 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: joinCode ? '1px solid rgba(0,209,255,0.40)' : '1px solid rgba(255,255,255,0.10)',
            }}
            onFocus={e => e.target.style.borderColor = '#00D1FF'}
            onBlur={e => e.target.style.borderColor = joinCode ? 'rgba(0,209,255,0.40)' : 'rgba(255,255,255,0.10)'}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim() || !isConnected || loading}
            className="px-7 rounded-xl font-black text-black text-sm transition-all active:scale-95 disabled:opacity-30"
            style={{ background: '#00D1FF', boxShadow: '0 8px 24px rgba(0,209,255,0.25)' }}
          >
            Join
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`rounded-xl px-4 py-3 text-sm font-black text-center
            ${error.toLowerCase().includes('full')
              ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
              : 'bg-red-400/10 border border-red-400/20 text-red-400 animate-pulse'
            }`}
          >
            {error}
          </div>
        )}

        {/* Live Rooms */}
        {availableRooms.length > 0 && (
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-3">Live Rooms</p>
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <button
                  key={room.room_id}
                  onClick={() => handleJoinRoom(room.room_id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all text-left group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,209,255,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-[#00D1FF]">{room.room_id}</span>
                    <div>
                      <p className="text-sm text-white font-medium">
                        {room.room_name || 'Unnamed Session'}
                        {room.is_playing && <span className="ml-2 text-green-400 text-[10px] font-black uppercase tracking-widest">LIVE</span>}
                      </p>
                      <p className="text-xs text-white/30">
                        {room.member_count} player{room.member_count !== 1 ? 's' : ''} &middot; {room.host_device}
                      </p>
                    </div>
                  </div>
                  <span className="text-white/20 group-hover:text-[#00D1FF] transition-colors text-xs font-black uppercase tracking-widest">
                    JOIN
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatInputSummary(inputs) {
  if (!inputs || typeof inputs !== 'object') return ''
  return Object.entries(inputs)
    .filter(([k]) => k !== 'custom_prompt')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

// ─── Main Guest page ─────────────────────────────────────────────────────────

export default function Guest() {
  const { role, roomId, roomName, userId, isPlaying, isConnected, activePrompts, influenceWeights, bpm, geminiReasoning, participants, timeline, applauseLevel, currentInputs } = useRoomStore()
  const { unlock } = useAudioPlayer()
  const { send, sendInput, leaveRoom } = useWebSocket()
  const clearRoom = useRoomStore((s) => s.clearRoom)
  const navigate = useNavigate()
  const timelineEndRef = useRef(null)

  const [micEnabled, setMicEnabled] = useState(false)
  const micStreamRef = useRef(null)

  // Auto-scroll timeline
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline])

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

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop())
        if (micStreamRef.current._interval) clearInterval(micStreamRef.current._interval)
      }
    }
  }, [])

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

      let smoothedAvg = 0
      const clapTimestamps = []

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(data)
        const instant = data.reduce((a, b) => a + b, 0) / data.length / 255
        const now = Date.now()
        if (instant - smoothedAvg > 0.20 && instant > 0.15) {
          if (!clapTimestamps.length || now - clapTimestamps[clapTimestamps.length - 1] > 200) {
            clapTimestamps.push(now)
          }
        }
        smoothedAvg = smoothedAvg * 0.7 + instant * 0.3
        const cutoff = now - 3000
        while (clapTimestamps.length && clapTimestamps[0] < cutoff) clapTimestamps.shift()
        const recentClaps = clapTimestamps.filter(t => t > now - 2000).length
        const clap_rate = Math.min(recentClaps / 4, 1.0)
        const gatedVolume = instant > 0.12 ? instant : 0
        send({ type: 'applause_update', user_id: userId, room_id: roomId, volume: gatedVolume, clap_rate })
      }, 200)
      micStreamRef.current._interval = interval
    } catch (e) {
      console.warn('[Mic] Permission denied or unavailable:', e)
      alert("Microphone access is required for the applause feature.")
    }
  }

  const handleLeaveRoom = () => {
    if (window.confirm("Leave this session?")) {
      leaveRoom(userId, roomId)
    }
  }

  const inRoom = !!(role && roomId)
  const roleInfo = ROLES[role]

  // ─── Not in a room → show join lobby ───
  if (!inRoom) {
    return (
      <div className="min-h-screen flex flex-col px-4 sm:px-6 max-w-2xl mx-auto pt-24 pb-12 pointer-events-auto">
        <div className="flex items-center justify-center mb-6">
          <p className="text-[10px] font-black text-white/35 uppercase tracking-[0.45em]">
            CORO <span className="text-[#00D1FF]/60">Guest</span>
          </p>
        </div>
        <JoinLobby />
      </div>
    )
  }

  // ─── In a room → full dashboard ───
  return (
    <div className="flex flex-col p-4 sm:p-6 max-w-7xl mx-auto pb-12 pointer-events-auto">

      {/* ── Dashboard Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 mt-16">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/30">
            <span className="text-[#00D1FF]">{roleInfo?.emoji || '🎵'}</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-[0.45em] drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]">
              {roleInfo?.label || 'Guest'} — In Session
            </p>
            <p className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-bold text-white mt-0.5">
              {roomName ? (
                <>
                  {roomName} <span className="text-white/30 text-sm font-mono">({roomId})</span>
                </>
              ) : (
                <>Room <span className="text-[#00D1FF] font-mono tracking-widest uppercase">{roomId}</span></>
              )}
              {isPlaying && <span className="text-green-400 text-[9px] animate-pulse font-black tracking-widest">LIVE</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
            style={isConnected
              ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }
              : { background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            {isConnected ? 'Connected' : 'Connecting'}
          </span>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 py-2.5 px-5 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Leave
          </button>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1">

        {/* LEFT — Stage + Visualizer + Timeline (2/3 width) */}
        <div className="flex-1 flex flex-col gap-6 lg:w-2/3">

          {/* Band Stage — animated SVG characters */}
          <BandStage participants={participants} isPlaying={isPlaying} currentInputs={currentInputs} />

          {/* Session Timeline */}
          <div
            className="rounded-[2rem] px-5 py-4"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-3 text-[#00D1FF]">
              Session Story
            </p>
            <Timeline events={timeline} />
          </div>

          {/* Live Audio Visualizer */}
          <div
            className="flex flex-col rounded-[2rem] overflow-hidden"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                Live Audio Visualizer
              </p>
              <span
                className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ background: 'rgba(0,209,255,0.10)', border: '1px solid rgba(0,209,255,0.20)', color: '#00D1FF' }}
              >
                Lyria Realtime
              </span>
            </div>
            <div className="relative min-h-[240px] mx-4 mb-4 rounded-[1.25rem] overflow-hidden bg-black/30">
              <AudioVisualizer isPlaying={isPlaying} />
              {!isPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <span className="text-white/20 text-3xl">🎵</span>
                  <p className="text-white/25 text-[10px] uppercase tracking-[0.3em] font-black">
                    Waiting for stream start...
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 px-6 pb-5 border-t border-white/5 pt-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">
                BPM: <span className="text-white">{bpm}</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">
                Network: <span className="text-green-400">Stable</span>
              </span>
            </div>
          </div>

          {/* Influence Meter */}
          <div
            className="rounded-[2rem] p-6 max-w-md"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-5 text-[#00D1FF]">
              Influence Meter
            </p>
            <InfluenceMeter weights={influenceWeights} />
          </div>
        </div>

        {/* RIGHT — Role controls + prompts + crowd (1/3 width) */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-6 shrink-0">

          {/* Your Role */}
          <RoleCard role={roleInfo} />

          {/* Role-specific controls */}
          <div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-5 text-[#00D1FF]">
              Your Controls
            </p>
            <div className="space-y-4">
              {role === 'drummer' && <BPMSlider />}
              {role === 'vibe_setter' && <MoodInput />}
              {role === 'genre_dj' && <GenreGrid />}
              {role === 'instrumentalist' && <InstrumentGrid />}
              {role === 'energy' && <EnergyControl />}

              {/* Custom prompt input */}
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00D1FF]/65">
                  Describe what you want to hear
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={PROMPT_HINTS[role]}
                    className="flex-1 text-sm text-white outline-none rounded-lg py-2.5 px-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
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
                    style={{ background: '#00D1FF' }}
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
          </div>

          {/* Active Prompt Cloud */}
          <div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                Active Prompt Cloud
              </p>
              <span className="flex items-center gap-2 text-[9px] text-white/30 font-bold uppercase tracking-widest">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                </motion.span>
                Refreshes every 4s
              </span>
            </div>
            <ActivePrompts prompts={activePrompts} />
            {geminiReasoning && (
              <p className="text-white/35 text-xs mt-5 italic bg-white/5 p-4 rounded-2xl leading-relaxed">"{geminiReasoning}"</p>
            )}
          </div>

          {/* Crowd Energy — meter + mic toggle */}
          <div
            className="rounded-[2rem] px-6 py-5"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                Crowd Energy
              </p>
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                {Math.round(applauseLevel * 100)}%
              </span>
            </div>
            <div className="w-full rounded-full h-3 overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.round(applauseLevel * 100)}%`,
                  background: 'linear-gradient(to right, #22c55e, #facc15, #ef4444)',
                  boxShadow: applauseLevel > 0.6 ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-white/22">Share your mic to energise the room</p>
              <button
                onClick={toggleMic}
                className="px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                style={micEnabled
                  ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }
                  : { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#4ade80' }
                }
              >
                {micEnabled ? 'Stop Mic' : 'Enable Mic'}
              </button>
            </div>
          </div>

          {/* Drop Button */}
          {isPlaying && (
            <div
              className="rounded-[2rem] p-6"
              style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(220,38,38,0.20)' }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-4 text-red-400">
                Crowd Drop
              </p>
              <DropButton userId={userId} roomId={roomId} />
            </div>
          )}

          {/* Band Members */}
          <div
            className="rounded-[2rem] p-6"
            style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-4 text-[#00D1FF]">
              Band Members
            </p>
            {participants.length === 0 ? (
              <p className="text-white/25 text-sm italic">Waiting for players...</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => {
                  const r = ROLES[p.role]
                  const inputSummary = formatInputSummary(currentInputs[p.role])
                  const isSelf = p.user_id === userId
                  return (
                    <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${r?.bgColor || ''} border ${r?.borderColor || 'border-white/10'}`}>
                      <span className="text-lg">{r?.emoji || '🎵'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${r?.color || 'text-white'}`}>
                          {p.display_name || p.user_id.slice(0, 8)}
                          {isSelf && <span className="ml-1 text-[8px] text-[#00D1FF] opacity-60">(YOU)</span>}
                        </p>
                        <p className="text-xs text-white/35">{r?.label || p.role}</p>
                        {inputSummary && (
                          <p className="text-[10px] text-white/30 truncate mt-0.5">{inputSummary}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <MiniPromptBar />
      <PlayBar />
    </div>
  )
}
