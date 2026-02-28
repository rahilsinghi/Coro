import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { ROLES } from '../lib/constants.js'
import AudioVisualizer from '../components/AudioVisualizer.jsx'
import BandStage from '../components/BandStage.jsx'
import InfluenceMeter from '../components/InfluenceMeter.jsx'
import ActivePrompts from '../components/ActivePrompts.jsx'
import Timeline from '../components/Timeline.jsx'
import SessionControls from '../components/SessionControls.jsx'
import MiniPromptBar from '../components/MiniPromptBar.jsx'
import PlayBar from '../components/PlayBar.jsx'
import DropButton from '../components/DropButton.jsx'

function formatInputSummary(inputs) {
  if (!inputs || typeof inputs !== 'object') return ''
  return Object.entries(inputs)
    .filter(([k]) => k !== 'custom_prompt')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

export default function Host() {
  const { roomId, roomName, userId, isPlaying, isConnected, activePrompts, influenceWeights, bpm, geminiReasoning, participants, timeline, applauseLevel, currentInputs } = useRoomStore()
  const { send, startMusic, stopMusic, endStream, closeRoom } = useWebSocket()
  const clearRoom = useRoomStore((s) => s.clearRoom)
  const { unlock } = useAudioPlayer()
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(true)
  const timelineEndRef = useRef(null)
  const [micEnabled, setMicEnabled] = useState(false)
  const micStreamRef = useRef(null)

  const joinUrl = `${window.location.origin}/?room_id=${roomId}`

  // Auto-scroll timeline to bottom
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [timeline])

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

  const handlePlay = () => {
    unlock()
    startMusic(userId, roomId)
    setShowQR(false)
  }

  const handleStop = () => stopMusic(userId, roomId)

  const handleEndStream = () => {
    if (window.confirm("End session for everyone?")) {
      endStream(userId, roomId)
    }
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 max-w-7xl mx-auto pb-12 pointer-events-auto">

      {/* ── TOP SECTION: Session Management ── */}
      <SessionControls />

      {roomId ? (
        <>
          {/* ── Dashboard Header ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/30">
                <span className="text-[#00D1FF]">🎙️</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-[0.45em] drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]">Active Studio Session</p>
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
              <button
                onClick={() => setShowQR(v => !v)}
                className="btn-secondary text-xs uppercase tracking-widest py-2.5 px-5 w-full sm:w-auto"
              >
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
              <button
                onClick={isPlaying ? handleStop : handlePlay}
                className={`py-2.5 px-6 rounded-full font-black text-sm transition-all active:scale-95 ${isPlaying
                  ? 'bg-red-500/80 hover:bg-red-500 text-white'
                  : 'bg-[#00D1FF] hover:bg-[#00E5FF] text-black shadow-[0_0_20px_rgba(0,209,255,0.35)]'
                  }`}
              >
                {isPlaying ? 'Stop' : 'Start Stream'}
              </button>
              <button
                onClick={handleEndStream}
                className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all active:scale-90"
                title="End Stream"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
              </button>
            </div>
          </div>

          {/* ── MAIN GRID ── */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1">

            {/* LEFT — Stage + Visualizer (2/3 width) */}
            <div className="flex-1 flex flex-col gap-6 lg:w-2/3">

              {/* Band Stage — animated SVG characters */}
              <BandStage participants={participants} isPlaying={isPlaying} currentInputs={currentInputs} />

              {/* Session Timeline — horizontal scroll under stage */}
              <div
                className="rounded-[2rem] px-5 py-4"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-3 text-[#00D1FF]">
                  Session Story
                </p>
                <Timeline events={timeline} />
              </div>

              {/* Live Audio Visualizer card */}
              <div
                className="flex flex-col rounded-[2rem] overflow-hidden"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                      Live Audio Visualizer
                    </p>
                  </div>
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: 'rgba(0,209,255,0.10)', border: '1px solid rgba(0,209,255,0.20)', color: '#00D1FF' }}
                  >
                    Lyria Realtime
                  </span>
                </div>

                {/* Visualizer body */}
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

                {/* BPM / status footer inside visualizer card */}
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

            {/* RIGHT — status + prompts + QR + members (1/3 width) */}
            <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-6 shrink-0">

              {/* WebSocket Status */}
              <div
                className="rounded-[2rem] px-6 py-5"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                    WebSocket Status
                  </p>
                  <span
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={isConnected
                      ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }
                      : { background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                    {isConnected ? 'Connected' : 'Connecting'}
                  </span>
                </div>
              </div>

              {/* Active Prompt Cloud */}
              <div
                className="rounded-[2rem] p-6 flex-1"
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

              {/* Applause Meter */}
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

              {/* QR Code */}
              {showQR && (
                <div
                  className="rounded-[2rem] p-6 flex flex-col items-center gap-4"
                  style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Broadcasting Join URL</p>
                  <div className="p-3 bg-white rounded-2xl">
                    <QRCodeSVG value={joinUrl} size={140} bgColor="#FFFFFF" fgColor="#000000" />
                  </div>
                  <p className="font-mono text-xl font-black text-[#00D1FF] tracking-[0.3em] uppercase">{roomId}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(joinUrl)}
                    className="text-[9px] text-white/25 hover:text-white transition-colors underline font-bold uppercase tracking-widest"
                  >
                    Copy Session Link
                  </button>
                </div>
              )}

              {/* Band Members — with display names + current inputs */}
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
                      return (
                        <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${r?.bgColor || ''} border ${r?.borderColor || 'border-white/10'}`}>
                          <span className="text-lg">{r?.emoji || '🎵'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${r?.color || 'text-white'}`}>
                              {p.display_name || p.user_id.slice(0, 8)}
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

              {/* Leave Room */}
              <button
                onClick={() => {
                  closeRoom(userId, roomId)
                  clearRoom()
                  navigate('/')
                }}
                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.20)',
                  color: '#f87171',
                }}
              >
                End Session
              </button>
            </div>
          </div>
          <MiniPromptBar />
          <PlayBar />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-10">
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-[#00D1FF] blur-[60px] rounded-full"
            />
            <div className="relative w-28 h-28 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-2xl shadow-2xl">
              <span className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">🎹</span>
            </div>
          </div>
          <div className="text-center space-y-3 max-w-sm px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00D1FF] drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]">Studio Standby</p>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Ready for Genesis</h2>
            <p className="text-sm text-white/30 leading-relaxed font-medium">
              Initialize a session using the controls above to start your collective sonic journey powered by Lyria & Gemini.
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-[#00D1FF]/20"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
