import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { ROLES } from '../lib/constants.js'
import AudioVisualizer from '../components/AudioVisualizer.jsx'
import InfluenceMeter from '../components/InfluenceMeter.jsx'
import ActivePrompts from '../components/ActivePrompts.jsx'
import Timeline from '../components/Timeline.jsx'
import SessionControls from '../components/SessionControls.jsx'

export default function Host() {
  const { roomId, userId, isPlaying, isConnected, activePrompts, influenceWeights, bpm, geminiReasoning, participants, timeline, applauseLevel } = useRoomStore()
  const { startMusic, stopMusic } = useWebSocket()
  const { unlock } = useAudioPlayer()
  const [showQR, setShowQR] = useState(true)

  const joinUrl = `${window.location.origin}/?room_id=${roomId}`

  const handlePlay = () => {
    unlock()
    startMusic(userId, roomId)
    setShowQR(false)
  }

  const handleStop = () => stopMusic(userId, roomId)

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
                  Room <span className="text-[#00D1FF] font-mono tracking-widest uppercase">{roomId}</span>
                  {isPlaying && <span className="text-green-400 text-[9px] animate-pulse font-black tracking-widest">● LIVE</span>}
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
                {isPlaying ? '⏹ Stop' : '▶ Start Stream'}
              </button>
            </div>
          </div>

          {/* ── MAIN GRID ── */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1">

            {/* LEFT — Visualizer (2/3 width) */}
            <div className="flex-1 flex flex-col gap-6 lg:w-2/3">

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

              {/* Influence Meter — full width bottom of left col */}
              <div
                className="rounded-[2rem] p-6"
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
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Refreshes every 4s</span>
                </div>
                <ActivePrompts prompts={activePrompts} />
                {geminiReasoning && (
                  <p className="text-white/35 text-xs mt-5 italic bg-white/5 p-4 rounded-2xl leading-relaxed">"{geminiReasoning}"</p>
                )}
              </div>

              {/* 👏 Applause Meter */}
              <div
                className="rounded-[2rem] px-6 py-5"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                    👏 Crowd Energy
                  </p>
                  <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                    {Math.round(applauseLevel * 100)}%
                  </span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.round(applauseLevel * 100)}%`,
                      background: 'linear-gradient(to right, #22c55e, #facc15, #ef4444)',
                      boxShadow: applauseLevel > 0.6 ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
                    }}
                  />
                </div>
              </div>

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

              {/* 📜 Session Story — Timeline */}
              <div
                className="rounded-[2rem] p-6"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.40em] mb-4 text-[#00D1FF]">
                  📜 Session Story
                </p>
                <Timeline events={timeline} />
              </div>

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
                      return (
                        <div key={p.user_id} className={`flex items-center gap-3 p-3 rounded-xl ${r?.bgColor || ''} border ${r?.borderColor || 'border-white/10'}`}>
                          <span className="text-lg">{r?.emoji || '🎵'}</span>
                          <div>
                            <p className={`text-sm font-bold ${r?.color || 'text-white'}`}>{r?.label || p.role}</p>
                            <p className="text-xs text-white/35">{r?.description || ''}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <span className="text-3xl">🎹</span>
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-white/40">No Active Session</p>
          <p className="text-xs text-white/20 mt-2 text-center">Initialize a session above to start the studio.</p>
        </div>
      )}
    </div>
  )
}
