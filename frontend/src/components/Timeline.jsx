import React, { useRef, useEffect, useState } from 'react'

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

const SOURCE_COLORS = {
    bpm: '#f59e0b',
    mood: '#ec4899',
    genre: '#06b6d4',
    instrument: '#a855f7',
    energy: '#22c55e',
    drop: '#f87171',
    applause: '#facc15',
    prompt: '#00D1FF',
    gemini: '#00D1FF',
    default: 'rgba(255,255,255,0.4)',
}

export default function Timeline({ events = [] }) {
    const scrollRef = useRef(null)
    const [prevCount, setPrevCount] = useState(0)

    // Auto-scroll to the bottom (newest) on new events
    useEffect(() => {
        if (events.length > prevCount && scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            })
        }
        setPrevCount(events.length)
    }, [events.length])

    if (events.length === 0) {
        return <p className="text-cs-muted text-sm italic">Waiting for the session story to unfold...</p>
    }

    return (
        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
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
        </div>
    )
}
