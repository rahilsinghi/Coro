import React, { useRef, useEffect } from 'react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

export default function AudioVisualizer({ isPlaying }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const { getAnalyser } = useAudioPlayer()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      const analyser = getAnalyser()

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      if (!analyser || !isPlaying) {
        // Idle flat line
        ctx.strokeStyle = '#1e1e2e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, H / 2)
        ctx.lineTo(W, H / 2)
        ctx.stroke()
        return
      }

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteFrequencyData(dataArray)

      // Bar visualizer
      const barWidth = (W / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * H * 0.85

        // Gradient from purple to cyan
        const r = Math.round(124 + (6 - 124) * (i / bufferLength))
        const g = Math.round(58 + (182 - 58) * (i / bufferLength))
        const b = Math.round(237 + (212 - 237) * (i / bufferLength))

        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(x, H - barHeight, barWidth - 1, barHeight)

        x += barWidth
      }
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, getAnalyser])

  return (
    <div className="w-full h-full min-h-40 flex items-center justify-center">
      {!isPlaying && (
        <p className="text-cs-muted text-sm absolute">Waiting for music to start...</p>
      )}
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        className="w-full h-full rounded-xl"
      />
    </div>
  )
}
