import React, { useRef, useEffect } from 'react'

const EVENT_EMOJIS = {
    bpm: '🥁',
    mood: '🎨',
    genre: '🌍',
    instrument: '🎹',
    energy: '⚡',
    drop: '💥',
    applause: '👏',
    prompt: '✨',
    default: '🎵',
}

export default function Timeline({ events = [] }) {
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [events.length])

    if (events.length === 0) {
        return (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Waiting for inputs...
            </p>
        )
    }

    return (
        <div className="max-h-64 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,209,255,0.2) transparent' }}>
            {events.map((e, i) => {
                const emoji = EVENT_EMOJIS[e.source?.toLowerCase()] || EVENT_EMOJIS.default
                const time = e.time ? new Date(e.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
                return (
                    <div key={i} className="flex items-start gap-3">
                        {/* Icon bubble */}
                        <div
                            className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-sm"
                            style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.14)' }}
                        >
                            {emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
                                {time}
                                {e.source && <span className="ml-2" style={{ color: '#00D1FF' }}>{e.source}</span>}
                            </p>
                            <p className="text-sm text-white/80 leading-snug truncate">{e.text}</p>
                        </div>
                    </div>
                )
            })}
            <div ref={bottomRef} />
        </div>
    )
}
