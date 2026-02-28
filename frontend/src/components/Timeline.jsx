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

// Vary drop heights so events don't all sit at the same level
const DROP_HEIGHTS = [48, 80, 112, 64, 96, 56, 88, 72, 104, 60]

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
        return <p className="text-white/25 text-sm italic text-center py-4">Waiting for the session story to unfold...</p>
    }

    return (
        <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden pb-2"
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
        >
            <style>{`
                .timeline-scroll::-webkit-scrollbar { display: none; }
                @keyframes tl-node-in {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tl-node { animation: tl-node-in 0.4s ease-out both; }
            `}</style>

            <div
                className="timeline-scroll relative"
                style={{
                    minWidth: `${Math.max(events.length * 120, 300)}px`,
                    height: '180px',
                }}
            >
                {/* Golden horizontal spine */}
                <div
                    className="absolute left-0 right-0"
                    style={{
                        top: '16px',
                        height: '3px',
                        background: 'linear-gradient(90deg, #f59e0b, #facc15, #f59e0b)',
                        borderRadius: '2px',
                        boxShadow: '0 0 12px rgba(250,204,21,0.3)',
                    }}
                />

                {/* Event nodes */}
                {events.map((e, i) => {
                    const emoji = e.emoji || EVENT_EMOJIS[e.source?.toLowerCase()] || EVENT_EMOJIS.default
                    const color = SOURCE_COLORS[e.source?.toLowerCase()] || SOURCE_COLORS.default
                    const timeStr = e.time ? new Date(e.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
                    const dropH = DROP_HEIGHTS[i % DROP_HEIGHTS.length]
                    const isDrop = e.source?.toLowerCase() === 'drop'

                    return (
                        <div
                            key={i}
                            className="tl-node absolute"
                            style={{
                                left: `${i * 120 + 20}px`,
                                top: '6px',
                                animationDelay: `${i * 0.05}s`,
                            }}
                        >
                            {/* Node circle on spine */}
                            <div
                                className="relative z-10 w-[11px] h-[11px] rounded-full border-2 bg-[#0a0a18]"
                                style={{
                                    borderColor: color,
                                    boxShadow: isDrop ? `0 0 10px ${color}` : `0 0 6px ${color}55`,
                                }}
                            />

                            {/* Vertical drop line */}
                            <div
                                className="absolute left-[5px] top-[11px]"
                                style={{
                                    width: '1px',
                                    height: `${dropH}px`,
                                    background: `linear-gradient(180deg, ${color}88, ${color}22)`,
                                }}
                            />

                            {/* Bottom node circle */}
                            <div
                                className="absolute left-[1px] w-[9px] h-[9px] rounded-full border-[1.5px] bg-[#0a0a18]"
                                style={{
                                    top: `${11 + dropH}px`,
                                    borderColor: `${color}88`,
                                }}
                            />

                            {/* Event label below */}
                            <div
                                className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                                style={{
                                    top: `${11 + dropH + 14}px`,
                                    maxWidth: '110px',
                                }}
                            >
                                <p className="text-[10px] font-black truncate" style={{ color }}>
                                    {emoji} {e.source?.toUpperCase()}
                                </p>
                                <p className="text-[9px] text-white/50 font-medium truncate mt-0.5" style={{ maxWidth: '100px' }}>
                                    {e.text}
                                </p>
                                {timeStr && (
                                    <p className="text-[8px] text-white/20 font-mono mt-0.5">{timeStr}</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
