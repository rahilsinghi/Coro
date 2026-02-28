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

    // Auto-scroll to the right (newest) on new events
    useEffect(() => {
        if (events.length > prevCount && scrollRef.current) {
            scrollRef.current.scrollTo({
                left: scrollRef.current.scrollWidth,
                behavior: 'smooth',
            })
        }
        setPrevCount(events.length)
    }, [events.length])

    if (events.length === 0) {
        return (
            <div className="flex items-center justify-center py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.20)' }}>
                    Waiting for inputs...
                </p>
            </div>
        )
    }

    return (
        <div className="relative">
            <style>{`
                .htl-scroll::-webkit-scrollbar { display: none; }
                .htl-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                @keyframes htl-enter {
                    from { opacity: 0; transform: translateX(12px) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes htl-glow {
                    0%, 100% { box-shadow: 0 0 4px 2px var(--node-color); }
                    50%      { box-shadow: 0 0 10px 3px var(--node-color); }
                }
                .htl-event { animation: htl-enter 0.3s ease-out both; }
                .htl-glow  { animation: htl-glow 2s ease-in-out infinite; }
            `}</style>

            {/* Horizontal scroll container */}
            <div
                ref={scrollRef}
                className="htl-scroll flex items-stretch gap-0 overflow-x-auto relative"
                style={{ paddingBottom: '4px' }}
            >
                {/* Horizontal spine line */}
                <div
                    className="absolute left-0 right-0"
                    style={{
                        top: '9px',
                        height: '2px',
                        background: 'rgba(0,209,255,0.15)',
                    }}
                />

                {events.map((e, i) => {
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
                            className="htl-event flex flex-col items-center shrink-0 relative"
                            style={{
                                animationDelay: `${Math.max(0, i - (events.length - 5)) * 0.06}s`,
                                width: '72px',
                                paddingTop: '0',
                            }}
                        >
                            {/* Node on spine */}
                            <div
                                className={`shrink-0 rounded-full z-10 ${isSpecial ? 'htl-glow' : ''}`}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    marginTop: '4px',
                                    backgroundColor: color,
                                    '--node-color': `${color}88`,
                                    border: `2px solid ${color}`,
                                    boxShadow: isSpecial ? undefined : `0 0 6px ${color}30`,
                                }}
                            />

                            {/* Connector line to content */}
                            <div style={{ width: '1px', height: '6px', background: `${color}40` }} />

                            {/* Event pill */}
                            <div
                                className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg w-full"
                                style={{
                                    background: isSpecial ? `${color}12` : 'rgba(255,255,255,0.03)',
                                    border: isSpecial ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <span className="text-sm leading-none">{emoji}</span>
                                <span
                                    className="text-[9px] font-bold leading-tight text-center w-full truncate px-0.5"
                                    style={{ color: isSpecial ? color : 'rgba(255,255,255,0.60)' }}
                                >
                                    {e.text}
                                </span>
                                <span
                                    className="text-[7px] font-mono leading-none"
                                    style={{ color: 'rgba(255,255,255,0.20)' }}
                                >
                                    {time}
                                </span>
                            </div>
                        </div>
                    )
                })}

                {/* Spacer so last item isn't flush with edge */}
                <div className="shrink-0 w-2" />
            </div>
        </div>
    )
}
