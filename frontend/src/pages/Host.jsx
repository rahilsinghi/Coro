import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import AudioVisualizer from '../components/AudioVisualizer.jsx'
import InfluenceMeter from '../components/InfluenceMeter.jsx'
import ActivePrompts from '../components/ActivePrompts.jsx'

export default function Host() {
  const { roomId, userId, isPlaying, activePrompts, influenceWeights, bpm, geminiReasoning } = useRoomStore()
  const { startMusic, stopMusic } = useWebSocket()
  const { unlock } = useAudioPlayer()
  const [showQR, setShowQR] = useState(true)

  const joinUrl = `${window.location.origin}?room_id=${roomId}`

  const handlePlay = () => {
    unlock() // Unlock Web Audio API on user gesture
    startMusic(userId, roomId)
    setShowQR(false)
  }

  const handleStop = () => {
    stopMusic(userId, roomId)
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40 font-black tracking-widest uppercase text-sm">No room found. <a href="/" className="text-[#00D1FF] underline ml-2">Re-initialize</a></p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-6xl mx-auto pt-24 pb-12 pointer-events-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/20 shadow-[0_0_20px_rgba(0,209,255,0.1)]">
            <span className="text-[#00D1FF] text-lg">🎙️</span>
          </div>
          <div>
            <h1 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
              CORO <span className="text-[#00D1FF]/80">Studio Root</span>
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-base sm:text-xl font-bold mt-0.5 text-white">
              Room <span className="text-[#00D1FF] font-mono tracking-widest uppercase">{roomId}</span>
              {isPlaying && <span className="text-green-400 text-[10px] animate-pulse">● LIVE</span>}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowQR((v) => !v)}
          className="btn-secondary text-xs uppercase tracking-widest py-3 px-6 w-full sm:w-auto"
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Left panel */}
        <div className="flex-1 flex flex-col gap-8">
          {/* Visualizer */}
          <div className="glass-card flex-1 min-h-[300px] overflow-hidden relative group">
            <AudioVisualizer isPlaying={isPlaying} />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black">Waiting for stream start...</p>
              </div>
            )}
          </div>

          {/* Active prompts */}
          <div className="glass-card p-8">
            <p className="text-[10px] text-[#00D1FF]/60 font-black uppercase tracking-[0.3em] mb-4">
              AI Orchestration Status
            </p>
            <ActivePrompts prompts={activePrompts} />
            {geminiReasoning && (
              <p className="text-white/40 text-xs mt-6 italic bg-white/5 p-4 rounded-2xl">"{geminiReasoning}"</p>
            )}
            <div className="flex gap-8 mt-6 text-[10px] font-black uppercase tracking-widest text-white/30">
              <span>BPM: <span className="text-white">{bpm}</span></span>
              <span>Network: <span className="text-green-400">Stable</span></span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-80 flex flex-col gap-8">
          {/* QR Code */}
          {showQR && (
            <div className="glass-card p-8 flex flex-col items-center gap-4 group">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Broadcasting Join URL</p>
              <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                <QRCodeSVG
                  value={joinUrl}
                  size={160}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  includeMargin={false}
                />
              </div>
              <p className="font-mono text-2xl font-black text-[#00D1FF] tracking-[0.3em] uppercase">{roomId}</p>
              <button
                onClick={() => navigator.clipboard.writeText(joinUrl)}
                className="text-[10px] text-white/30 hover:text-white transition-colors underline break-all text-center uppercase font-bold"
              >
                Copy Session Link
              </button>
            </div>
          )}

          {/* Influence meter */}
          <div className="glass-card p-8 flex-1 flex flex-col">
            <p className="text-[10px] text-[#00D1FF]/60 font-black uppercase tracking-[0.3em] mb-6">
              Audience Influence
            </p>
            <div className="flex-1">
              <InfluenceMeter weights={influenceWeights} />
            </div>
          </div>

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`w-full py-6 rounded-[2rem] font-black text-lg transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 ${isPlaying
              ? 'bg-red-500/80 hover:bg-red-500 text-white shadow-red-500/20'
              : 'bg-[#00D1FF] hover:bg-[#00E5FF] text-black shadow-[#00D1FF]/20'
              }`}
          >
            {isPlaying ? '⏹ TERMINATE MUSIC' : '▶ START STUDIO STREAM'}
          </button>
        </div>
      </div>
    </div>
  )
}
