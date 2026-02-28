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

    useEffect(() => {
        if (events.length > prevCount) {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
        setPrevCount(events.length)
    }, [events.length])

    if (events.length === 0) {
        return (
            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Waiting for inputs...
            </p>
        )
    }

    const reversed = [...events].reverse()

    return (
        <div
            ref={scrollRef}
            className="timeline-scroll max-h-64 overflow-y-auto relative"
        >
            <style>{`
                .timeline-scroll::-webkit-scrollbar { display: none; }
                .timeline-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                @keyframes tl-fade-in {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes tl-glow-pulse {
                    0%, 100% { box-shadow: 0 0 4px 2px var(--node-color); }
                    50% { box-shadow: 0 0 12px 4px var(--node-color); }
                }
                .tl-entry { animation: tl-fade-in 0.3s ease-out both; }
                .tl-node-glow { animation: tl-glow-pulse 2s ease-in-out infinite; }
            `}</style>

            {/* Spine line */}
            <div
                className="absolute top-0 bottom-0"
                style={{
                    left: '62px',
                    width: '2px',
                    background: 'rgba(0,209,255,0.15)',
                }}
            />

            {reversed.map((e, i) => {
                const src = e.source?.toLowerCase() || 'default'
                const emoji = EVENT_EMOJIS[src] || EVENT_EMOJIS.default
                const color = SOURCE_COLORS[src] || SOURCE_COLORS.default
                const time = e.time
                    ? new Date(e.time * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                      })
                    : ''
                const isSpecial = src === 'drop' || src === 'prompt' || src === 'gemini'

                return (
                    <div
                        key={`${e.time}-${i}`}
                        className="tl-entry flex items-center"
                        style={{
                            animationDelay: `${i * 0.03}s`,
                            padding: '7px 0',
                        }}
                    >
                        {/* Timestamp */}
                        <div
                            className="shrink-0 text-right"
                            style={{
                                width: '54px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                color: 'rgba(255,255,255,0.3)',
                                letterSpacing: '0.02em',
                                paddingRight: '8px',
                            }}
                        >
                            {time}
                        </div>

                        {/* Node on spine */}
                        <div
                            className={`shrink-0 rounded-full z-10 ${isSpecial ? 'tl-node-glow' : ''}`}
                            style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: color,
                                '--node-color': `${color}88`,
                                border: `2px solid ${color}`,
                                boxShadow: isSpecial ? undefined : `0 0 6px ${color}30`,
                            }}
                        />

                        {/* Event content */}
                        <div className="flex items-center gap-1.5 pl-3 min-w-0 flex-1">
                            <span className="text-sm shrink-0">{emoji}</span>
                            <span
                                className="text-sm truncate leading-snug"
                                style={{
                                    color: isSpecial ? color : 'rgba(255,255,255,0.75)',
                                }}
                            >
                                {e.text}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
