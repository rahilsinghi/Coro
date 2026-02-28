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
        <p className="text-cs-muted">No room found. <a href="/" className="text-cs-accent underline">Go back</a></p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            🎵 Crowd<span className="text-cs-accent">Synth</span>
          </h1>
          <p className="text-cs-muted text-sm mt-0.5">
            Room <span className="font-mono text-white">{roomId}</span>
            {isPlaying && <span className="ml-2 text-green-400 animate-pulse">● LIVE</span>}
          </p>
        </div>
        <button
          onClick={() => setShowQR((v) => !v)}
          className="btn-secondary text-sm"
        >
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
      </div>

      <div className="flex gap-6 flex-1">
        {/* Left panel */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Visualizer */}
          <div className="card flex-1 min-h-48">
            <AudioVisualizer isPlaying={isPlaying} />
          </div>

          {/* Active prompts */}
          <div className="card">
            <p className="text-xs text-cs-muted font-medium uppercase tracking-wider mb-3">
              🤖 Gemini is playing
            </p>
            <ActivePrompts prompts={activePrompts} />
            {geminiReasoning && (
              <p className="text-cs-muted text-xs mt-3 italic">"{geminiReasoning}"</p>
            )}
            <div className="flex gap-4 mt-3 text-sm text-cs-muted">
              <span>BPM: <span className="text-white font-mono">{bpm}</span></span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 flex flex-col gap-5">
          {/* QR Code */}
          {showQR && (
            <div className="card flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-cs-muted">Scan to join</p>
              <QRCodeSVG
                value={joinUrl}
                size={160}
                bgColor="#12121a"
                fgColor="#e2e8f0"
                includeMargin
              />
              <p className="font-mono text-xl font-bold text-cs-accent tracking-widest">{roomId}</p>
              <p className="text-xs text-cs-muted break-all text-center">{joinUrl}</p>
            </div>
          )}

          {/* Influence meter */}
          <div className="card flex-1">
            <p className="text-xs text-cs-muted font-medium uppercase tracking-wider mb-3">
              Crowd Influence
            </p>
            <InfluenceMeter weights={influenceWeights} />
          </div>

          {/* Play / Stop */}
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-cs-accent hover:bg-purple-500 text-white animate-glow'
            }`}
          >
            {isPlaying ? '⏹ Stop Music' : '▶ Start Music'}
          </button>
        </div>
      </div>
    </div>
  )
}
