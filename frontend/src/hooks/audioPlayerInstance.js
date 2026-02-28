// Shared singleton outside of React
let _audioCtx = null
let _analyser = null
let _gainNode = null
let _nextPlayTime = 0

export function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 })
        _analyser = _audioCtx.createAnalyser()
        _analyser.fftSize = 256
        // Insert a GainNode for crossfade transitions
        _gainNode = _audioCtx.createGain()
        _gainNode.gain.value = 1.0
        _gainNode.connect(_analyser)
        _analyser.connect(_audioCtx.destination)
        _nextPlayTime = _audioCtx.currentTime
    }
    return { ctx: _audioCtx, analyser: _analyser, gainNode: _gainNode }
}

export function getNextPlayTime() { return _nextPlayTime }
export function setNextPlayTime(t) { _nextPlayTime = t }

/**
 * Trigger a smooth fade-out → fade-in transition.
 * Used when drops, BPM changes, or prompt updates cause audible shifts.
 * @param {number} fadeOutMs - fade out duration in ms (default 300)
 * @param {number} fadeInMs  - fade in duration in ms (default 500)
 * @param {number} holdMs    - how long to hold at low volume (default 100)
 */
export function triggerTransition(fadeOutMs = 300, fadeInMs = 500, holdMs = 100) {
    if (!_gainNode || !_audioCtx) return
    const now = _audioCtx.currentTime
    const fadeOut = fadeOutMs / 1000
    const hold = holdMs / 1000
    const fadeIn = fadeInMs / 1000

    _gainNode.gain.cancelScheduledValues(now)
    _gainNode.gain.setValueAtTime(_gainNode.gain.value, now)
    // Fade out
    _gainNode.gain.linearRampToValueAtTime(0.15, now + fadeOut)
    // Hold low
    _gainNode.gain.setValueAtTime(0.15, now + fadeOut + hold)
    // Fade back in
    _gainNode.gain.linearRampToValueAtTime(1.0, now + fadeOut + hold + fadeIn)
}
