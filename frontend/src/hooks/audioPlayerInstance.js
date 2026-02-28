// Shared singleton outside of React
let _audioCtx = null
let _analyser = null
let _nextPlayTime = 0

export function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 })
        _analyser = _audioCtx.createAnalyser()
        _analyser.fftSize = 256
        _analyser.connect(_audioCtx.destination)
        _nextPlayTime = _audioCtx.currentTime
    }
    return { ctx: _audioCtx, analyser: _analyser }
}

export function getNextPlayTime() { return _nextPlayTime }
export function setNextPlayTime(t) { _nextPlayTime = t }
