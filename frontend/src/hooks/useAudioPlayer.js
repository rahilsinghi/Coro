import { useCallback } from 'react'
import { getAudioCtx, getNextPlayTime, setNextPlayTime } from './audioPlayerInstance'

export function useAudioPlayer() {
  const getContext = useCallback(() => {
    return getAudioCtx().ctx
  }, [])

  const getAnalyser = useCallback(() => {
    return getAudioCtx().analyser
  }, [])

  // Call this once on user interaction to unlock audio context
  const unlock = useCallback(() => {
    const ctx = getContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }
  }, [getContext])

  const enqueueAudio = useCallback((arrayBuffer) => {
    const { ctx, analyser } = getAudioCtx()
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
      source.connect(analyser)

      // Schedule back-to-back — no gaps
      const now = ctx.currentTime
      const nextPlayTime = getNextPlayTime()
      const startTime = Math.max(now + 0.05, nextPlayTime)
      source.start(startTime)
      setNextPlayTime(startTime + audioBuffer.duration)

    } catch (err) {
      console.error('[AudioPlayer] Failed to decode chunk:', err)
    }
  }, [])

  return { enqueueAudio, unlock, getAnalyser }
}
