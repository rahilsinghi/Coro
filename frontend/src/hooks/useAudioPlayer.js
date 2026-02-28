import { useRef, useCallback, useEffect } from 'react'

/**
 * Manages a Web Audio API buffer queue for playing streaming PCM audio from Lyria.
 * Lyria RealTime outputs 48kHz stereo PCM audio chunks.
 * We queue them and play them back-to-back for gapless playback.
 */
export function useAudioPlayer() {
  const audioCtxRef = useRef(null)
  const nextPlayTimeRef = useRef(0)
  const analyserRef = useRef(null)

  const getContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000, // Match Lyria's 48kHz output
      })
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      nextPlayTimeRef.current = ctx.currentTime
    }
    return audioCtxRef.current
  }, [])

  // Call this once on user interaction to unlock audio context
  const unlock = useCallback(() => {
    const ctx = getContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  }, [getContext])

  const enqueueAudio = useCallback((arrayBuffer) => {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    // Lyria sends raw 16-bit signed PCM, stereo, 48kHz
    // Convert ArrayBuffer → Float32 → AudioBuffer
    try {
      const int16 = new Int16Array(arrayBuffer)
      const numChannels = 2
      const numSamples = int16.length / numChannels
      const audioBuffer = ctx.createBuffer(numChannels, numSamples, 48000)

      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch)
        for (let i = 0; i < numSamples; i++) {
          // Interleaved: [L, R, L, R, ...]
          channelData[i] = int16[i * numChannels + ch] / 32768.0
        }
      }

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyserRef.current)

      // Schedule back-to-back — no gaps
      const now = ctx.currentTime
      const startTime = Math.max(now + 0.05, nextPlayTimeRef.current)
      source.start(startTime)
      nextPlayTimeRef.current = startTime + audioBuffer.duration

    } catch (err) {
      console.error('[AudioPlayer] Failed to decode chunk:', err)
    }
  }, [getContext])

  // Expose analyser for visualizer
  const getAnalyser = useCallback(() => analyserRef.current, [])

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close()
    }
  }, [])

  return { enqueueAudio, unlock, getAnalyser }
}
