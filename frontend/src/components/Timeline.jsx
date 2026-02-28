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
        return <p className="text-cs-muted text-sm italic">Waiting for the session story to unfold...</p>
    }

    return (
        <div className="max-h-64 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {events.map((e, i) => {
                const emoji = e.emoji || EVENT_EMOJIS[e.source?.toLowerCase()] || EVENT_EMOJIS.default
                const timeStr = e.time ? new Date(e.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

                return (
                    <div key={i} className="flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <span className="text-xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{emoji}</span>
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-cs-accent font-black uppercase text-[10px] tracking-widest">{e.source}</span>
                                <span className="text-white/20 text-[9px] font-mono">
                                    {timeStr}
                                </span>
                            </div>
                            <p className="text-white/80 leading-relaxed font-medium">
                                {e.text}
                            </p>
                        </div>
                    </div>
                )
            })}
            <div ref={bottomRef} />
        </div>
    )
}
