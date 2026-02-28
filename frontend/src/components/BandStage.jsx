import React, { useState, useEffect, useRef } from 'react'
import { ROLES, ROLE_COLORS } from '../lib/constants.js'

function Face({ x, y, skin = '#F7B58D', hair = '#2A2140', smile = '#2A2140' }) {
    return (
        <g>
            <circle cx={x} cy={y} r="15" fill={skin} />
            <path d={`M ${x - 8} ${y - 11} C ${x - 2} ${y - 20}, ${x + 8} ${y - 20}, ${x + 12} ${y - 9}`} fill={hair} />
            <circle cx={x - 5} cy={y - 1} r="1.2" fill="#1F1D2B" />
            <circle cx={x + 5} cy={y - 1} r="1.2" fill="#1F1D2B" />
            <path d={`M ${x - 4} ${y + 5} Q ${x} ${y + 8} ${x + 4} ${y + 5}`} fill="none" stroke={smile} strokeWidth="1.3" strokeLinecap="round" />
        </g>
    )
}

function DrummerSVG({ color, playing }) {
    return (
        <g>
            <g className={playing ? 'anim-bob' : ''}>
                <Face x={110} y={40} skin="#F6C099" hair="#3A2A56" />
                <rect x="92" y="56" width="36" height="48" rx="10" fill="#6A4BFF33" stroke="#BBA4FFAA" />
                <path d="M94 70 L82 84" stroke="#D9D2FF" strokeWidth="4" strokeLinecap="round" />
                <path d="M126 70 L138 84" stroke="#D9D2FF" strokeWidth="4" strokeLinecap="round" />
            </g>

            <g className={playing ? 'anim-drum-left' : ''}>
                <line x1="84" y1="84" x2="62" y2="96" stroke="#FFF2CC" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className={playing ? 'anim-drum-right' : ''}>
                <line x1="136" y1="84" x2="158" y2="96" stroke="#FFF2CC" strokeWidth="3" strokeLinecap="round" />
            </g>

            <ellipse cx="80" cy="116" rx="24" ry="12" fill="#130C2A" stroke="#A97EFF99" />
            <ellipse cx="140" cy="116" rx="24" ry="12" fill="#130C2A" stroke="#A97EFF99" />
            <ellipse cx="110" cy="138" rx="44" ry="22" fill="#1B113A" stroke="#C59BFFAA" />
            <circle cx="110" cy="138" r="13" fill="#2A1B4F" stroke="#F2D3FF66" />

            <line x1="60" y1="90" x2="48" y2="76" stroke="#D6CCFF77" />
            <ellipse cx="45" cy="74" rx="12" ry="5" fill={`${color}44`} stroke={`${color}AA`} />
            <line x1="160" y1="90" x2="172" y2="76" stroke="#D6CCFF77" />
            <ellipse cx="175" cy="74" rx="12" ry="5" fill={`${color}44`} stroke={`${color}AA`} />
        </g>
    )
}

function BassistSVG({ color, playing }) {
    return (
        <g>
            <g className={playing ? 'anim-bob' : ''}>
                <Face x={112} y={40} skin="#DDA680" hair="#1C334A" />
                <rect x="94" y="56" width="36" height="50" rx="10" fill="#2BE88722" stroke="#9BFFD1AA" />
                <path d="M98 72 L82 90" stroke="#CBFFE8" strokeWidth="4" strokeLinecap="round" />
                <g className={playing ? 'anim-pluck' : ''}>
                    <path d="M126 74 L141 92" stroke="#CBFFE8" strokeWidth="4" strokeLinecap="round" />
                </g>
            </g>

            <g transform="rotate(-26 104 108)">
                <rect x="58" y="104" width="88" height="9" rx="4" fill="#13322A" stroke="#63FFC3AA" />
                <ellipse cx="58" cy="108" rx="18" ry="14" fill="#1A4A3B" stroke="#79FFD0CC" />
                <ellipse cx="70" cy="110" rx="11" ry="9" fill="#0D2B23" stroke="#88FFD955" />
                <circle cx="52" cy="104" r="3" fill="#D8FFF0" />
                <line x1="74" y1="106" x2="140" y2="106" stroke="#AAFFE566" />
                <line x1="74" y1="108" x2="140" y2="108" stroke="#AAFFE566" />
            </g>

            <g className={playing ? 'anim-step' : ''}>
                <path d="M104 106 L90 136" stroke="#DDFEF2" strokeWidth="4" strokeLinecap="round" />
                <path d="M122 106 L132 136" stroke="#DDFEF2" strokeWidth="4" strokeLinecap="round" />
            </g>
            <ellipse cx="92" cy="142" rx="11" ry="4" fill="#49F3B366" />
            <ellipse cx="132" cy="142" rx="11" ry="4" fill="#49F3B366" />
        </g>
    )
}

function KeyboardistSVG({ color, playing }) {
    return (
        <g>
            <g className={playing ? 'anim-bob' : ''}>
                <Face x={110} y={38} skin="#F2B58B" hair="#1E4D8B" />
                <rect x="92" y="54" width="36" height="46" rx="10" fill="#1CC7FF22" stroke="#A7EEFFAA" />
            </g>

            <g>
                <rect x="52" y="102" width="116" height="28" rx="10" fill="#10233A" stroke="#59C9FFAA" />
                <rect x="62" y="108" width="96" height="16" rx="5" fill="#0B1829" stroke="#4BA8D4AA" />
                {Array.from({ length: 8 }, (_, i) => (
                    <rect
                        key={i}
                        x={66 + i * 11}
                        y="110"
                        width="8"
                        height="12"
                        rx="2"
                        fill="#D6EEFF"
                        opacity={0.85}
                    />
                ))}
                <g className={playing ? 'anim-keys-left' : ''}>
                    <circle cx="96" cy="102" r="4" fill="#D6EEFF" />
                </g>
                <g className={playing ? 'anim-keys-right' : ''}>
                    <circle cx="126" cy="102" r="4" fill="#D6EEFF" />
                </g>
            </g>

            <line x1="74" y1="130" x2="66" y2="146" stroke="#9BE2FFAA" strokeWidth="3" />
            <line x1="146" y1="130" x2="154" y2="146" stroke="#9BE2FFAA" strokeWidth="3" />
            <ellipse cx="64" cy="148" rx="7" ry="3" fill={`${color}66`} />
            <ellipse cx="156" cy="148" rx="7" ry="3" fill={`${color}66`} />
        </g>
    )
}

function VocalistSVG({ color, playing }) {
    return (
        <g>
            <g className={playing ? 'anim-bob' : ''}>
                <Face x={96} y={40} skin="#F3B38E" hair="#B63148" smile="#5A2132" />
                <rect x="78" y="56" width="36" height="50" rx="10" fill="#FF5C7A22" stroke="#FFC0CEAA" />
                <path d="M80 72 L66 90" stroke="#FFD6DF" strokeWidth="4" strokeLinecap="round" />
                <g className={playing ? 'anim-wave-arm' : ''}>
                    <path d="M112 72 L130 56" stroke="#FFD6DF" strokeWidth="4" strokeLinecap="round" />
                </g>
            </g>

            <g className={playing ? 'anim-mic' : ''}>
                <rect x="128" y="66" width="6" height="72" rx="3" fill="#D9DFEF55" stroke="#E7ECFF99" />
                <rect x="118" y="64" width="24" height="7" rx="3" fill="#D9DFEF44" stroke="#E7ECFF99" />
                <rect x="117" y="50" width="26" height="14" rx="7" fill={`${color}44`} stroke={`${color}CC`} />
            </g>

            <g className={playing ? 'anim-step' : ''}>
                <path d="M88 106 L76 136" stroke="#FFD6DF" strokeWidth="4" strokeLinecap="round" />
                <path d="M106 106 L116 136" stroke="#FFD6DF" strokeWidth="4" strokeLinecap="round" />
                <ellipse cx="74" cy="142" rx="10" ry="4" fill={`${color}55`} />
                <ellipse cx="118" cy="142" rx="10" ry="4" fill={`${color}55`} />
            </g>

            <g className={playing ? 'anim-vocal-waves' : ''} opacity="0.9">
                <path d="M42 102 C32 94, 32 82, 42 74" fill="none" stroke={`${color}AA`} strokeWidth="3" strokeLinecap="round" />
                <path d="M52 108 C40 94, 40 78, 52 64" fill="none" stroke={`${color}88`} strokeWidth="3" strokeLinecap="round" />
            </g>
        </g>
    )
}

function GuitaristSVG({ color, playing }) {
    return (
        <g>
            <g className={playing ? 'anim-bob' : ''}>
                <Face x={110} y={40} skin="#CB956E" hair="#6A3D29" smile="#3B261B" />
                <rect x="92" y="56" width="36" height="50" rx="10" fill="#F39C3D22" stroke="#FFD9A8AA" />
                <path d="M96 72 L80 90" stroke="#FEE8CA" strokeWidth="4" strokeLinecap="round" />
                <g className={playing ? 'anim-strum' : ''}>
                    <path d="M124 72 L140 90" stroke="#FEE8CA" strokeWidth="4" strokeLinecap="round" />
                </g>
            </g>

            <g transform="rotate(-21 114 110)">
                <rect x="86" y="96" width="80" height="8" rx="4" fill="#3A260F" stroke="#FFCD7AAA" />
                <ellipse cx="74" cy="100" rx="20" ry="15" fill="#5A3A1A" stroke="#FFC975CC" />
                <ellipse cx="84" cy="102" rx="11" ry="9" fill="#2A1B0B" stroke="#FFDD9D55" />
                <line x1="88" y1="98" x2="158" y2="98" stroke="#FFE5B466" />
                <line x1="88" y1="100" x2="158" y2="100" stroke="#FFE5B466" />
            </g>

            <g className={playing ? 'anim-step' : ''}>
                <path d="M104 106 L90 136" stroke="#FEE8CA" strokeWidth="4" strokeLinecap="round" />
                <path d="M122 106 L132 136" stroke="#FEE8CA" strokeWidth="4" strokeLinecap="round" />
            </g>
            <ellipse cx="90" cy="142" rx="10" ry="4" fill={`${color}55`} />
            <ellipse cx="132" cy="142" rx="10" ry="4" fill={`${color}55`} />
        </g>
    )
}

const ROLE_SVG = {
    drummer: DrummerSVG,
    vibe_setter: BassistSVG,
    instrumentalist: KeyboardistSVG,
    energy: VocalistSVG,
    genre_dj: GuitaristSVG,
}

export default function BandStage({ participants = [], isPlaying = false, currentInputs = {} }) {
    // ── Comic chat bubbles ──
    const [bubbles, setBubbles] = useState({})
    const prevInputsRef = useRef({})

    useEffect(() => {
        const prev = prevInputsRef.current
        const fresh = {}
        let changed = false

        participants.forEach(p => {
            const text = formatInputBrief(p.role, currentInputs[p.role])
            const prevText = formatInputBrief(p.role, prev[p.role])
            if (text && text !== prevText) {
                fresh[p.role] = { text, ts: Date.now() }
                changed = true
            }
        })

        if (changed) {
            setBubbles(b => ({ ...b, ...fresh }))
            const roles = Object.keys(fresh)
            const stamps = { ...fresh }
            const timer = setTimeout(() => {
                setBubbles(b => {
                    const next = { ...b }
                    roles.forEach(r => {
                        if (next[r]?.ts === stamps[r].ts) delete next[r]
                    })
                    return next
                })
            }, 4000)
            return () => clearTimeout(timer)
        }

        prevInputsRef.current = { ...currentInputs }
    }, [currentInputs, participants])

    return (
        <div
            className="relative rounded-[2rem] overflow-hidden select-none"
            style={{
                background: 'linear-gradient(180deg, #0a0a18 0%, #0e1028 40%, #151a30 100%)',
                border: '1px solid rgba(0,209,255,0.14)',
                minHeight: '340px',
            }}
        >
            <style>{`
                @keyframes bs-bob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-4px)} }
                @keyframes bs-step { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-2px)} }
                @keyframes bs-drum-left { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(-16deg) translate(-2px, 2px)} }
                @keyframes bs-drum-right { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(16deg) translate(2px, 2px)} }
                @keyframes bs-pluck { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(12deg)} }
                @keyframes bs-strum { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(10deg)} }
                @keyframes bs-keys-left { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(4px)} }
                @keyframes bs-keys-right { 0%,100%{ transform: translateY(3px) } 50%{ transform: translateY(0)} }
                @keyframes bs-mic { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(-3deg)} }
                @keyframes bs-wave-arm { 0%,100%{ transform: rotate(0deg) } 50%{ transform: rotate(-14deg) translate(1px, -1px)} }
                @keyframes bs-vocal-waves { 0%,100%{ opacity: 0.6 } 50%{ opacity: 1 } }
                @keyframes bs-spotlight { 0%,100%{ opacity: 0.5 } 50%{ opacity: 0.9 } }
                @keyframes bs-enter { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }

                .anim-bob { transform-origin:center; animation: bs-bob 0.9s ease-in-out infinite; }
                .anim-step { transform-origin:center; animation: bs-step 0.52s ease-in-out infinite; }
                .anim-drum-left { transform-origin: 84px 84px; animation: bs-drum-left 0.34s ease-in-out infinite; }
                .anim-drum-right { transform-origin: 136px 84px; animation: bs-drum-right 0.34s ease-in-out infinite; }
                .anim-pluck { transform-origin: 126px 74px; animation: bs-pluck 0.3s ease-in-out infinite; }
                .anim-strum { transform-origin: 124px 72px; animation: bs-strum 0.28s ease-in-out infinite; }
                .anim-keys-left { transform-origin:center; animation: bs-keys-left 0.25s ease-in-out infinite; }
                .anim-keys-right { transform-origin:center; animation: bs-keys-right 0.25s ease-in-out infinite; }
                .anim-mic  { transform-origin: 130px 102px; animation: bs-mic 0.5s ease-in-out infinite; }
                .anim-wave-arm { transform-origin: 112px 72px; animation: bs-wave-arm 0.45s ease-in-out infinite; }
                .anim-vocal-waves { animation: bs-vocal-waves 0.5s ease-in-out infinite; }

                .bs-paused .anim-bob,
                .bs-paused .anim-step,
                .bs-paused .anim-drum-left,
                .bs-paused .anim-drum-right,
                .bs-paused .anim-pluck,
                .bs-paused .anim-strum,
                .bs-paused .anim-keys-left,
                .bs-paused .anim-keys-right,
                .bs-paused .anim-mic,
                .bs-paused .anim-wave-arm,
                .bs-paused .anim-vocal-waves {
                    animation-play-state: paused;
                }

                .bs-char { animation: bs-enter 0.5s ease-out both; }

                @keyframes bs-bubble-in {
                    from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.85); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }
                @keyframes bs-bubble-out {
                    0%   { opacity: 1; }
                    75%  { opacity: 1; }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
                }
                .bs-bubble {
                    animation: bs-bubble-in 0.25s ease-out both;
                }
            `}</style>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {participants.map((p, i) => {
                    const color = ROLE_COLORS[p.role] || '#00D1FF'
                    const xPct = participants.length === 1
                        ? 50
                        : 15 + (i * 70) / Math.max(participants.length - 1, 1)
                    return (
                        <div
                            key={`spot-${p.user_id}`}
                            className="absolute top-0"
                            style={{
                                left: `${xPct}%`,
                                transform: 'translateX(-50%)',
                                width: '200px',
                                height: '100%',
                                background: `radial-gradient(ellipse 200px 400px at 50% -10%, ${color}25, transparent 70%)`,
                                animation: isPlaying ? 'bs-spotlight 3s ease-in-out infinite' : undefined,
                                animationDelay: `${i * 0.4}s`,
                            }}
                        />
                    )
                })}
            </div>

            <svg className="absolute bottom-0 left-0 w-full" height="120" preserveAspectRatio="none" style={{ opacity: 0.25 }}>
                {Array.from({ length: 8 }, (_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 18} x2="100%" y2={i * 18} stroke="#334" strokeWidth="1" />
                ))}
                {Array.from({ length: 16 }, (_, i) => (
                    <line key={`v${i}`} x1={`${(i / 15) * 100}%`} y1="0" x2={`${(i / 15) * 100}%`} y2="120" stroke="#334" strokeWidth="1" />
                ))}
            </svg>

            <div
                className="absolute left-0 right-0 bottom-0 pointer-events-none"
                style={{ height: '35%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.4))' }}
            />

            <div className="relative flex items-center justify-between px-6 pt-5 pb-2 z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.40em] text-[#00D1FF]">
                    Band Stage
                </p>
                <span
                    className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: 'rgba(0,209,255,0.10)', border: '1px solid rgba(0,209,255,0.20)', color: '#00D1FF' }}
                >
                    {participants.length} {participants.length === 1 ? 'player' : 'players'}
                </span>
            </div>

            <div className={`relative z-10 flex items-end justify-center gap-2 px-4 pb-6 pt-2 ${!isPlaying ? 'bs-paused' : ''}`}
                style={{ minHeight: '260px' }}
            >
                {participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 w-full">
                        <span className="text-4xl opacity-20">🎤</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.30em] text-white/20">
                            Stage is empty - waiting for players
                        </p>
                    </div>
                ) : (
                    participants.map((p, i) => {
                        const role = p.role
                        const color = ROLE_COLORS[role] || '#888'
                        const roleInfo = ROLES[role]
                        const CharSVG = ROLE_SVG[role]
                        const inputSummary = formatInputBrief(role, currentInputs[role])

                        const bubble = bubbles[role]

                        return (
                            <div
                                key={p.user_id}
                                className="bs-char flex flex-col items-center relative"
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    flex: '1 1 0',
                                    maxWidth: '200px',
                                    minWidth: '100px',
                                }}
                            >
                                {/* Comic chat bubble */}
                                {bubble && (
                                    <div
                                        key={bubble.ts}
                                        className="bs-bubble absolute z-20 left-1/2 whitespace-nowrap"
                                        style={{
                                            top: '-8px',
                                            transform: 'translateX(-50%)',
                                            background: 'rgba(0,0,0,0.75)',
                                            backdropFilter: 'blur(8px)',
                                            border: `1px solid ${color}55`,
                                            borderRadius: '10px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            color: color,
                                            maxWidth: '160px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {bubble.text}
                                        {/* Tail */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                bottom: '-5px',
                                                left: '50%',
                                                transform: 'translateX(-50%) rotate(45deg)',
                                                width: '8px',
                                                height: '8px',
                                                background: 'rgba(0,0,0,0.75)',
                                                borderRight: `1px solid ${color}55`,
                                                borderBottom: `1px solid ${color}55`,
                                            }}
                                        />
                                    </div>
                                )}

                                <svg viewBox="0 0 220 180" className="w-full" style={{ maxHeight: '160px' }}>
                                    {CharSVG && <CharSVG color={color} playing={isPlaying} />}
                                </svg>

                                <div className="text-center mt-1 w-full px-1">
                                    <p
                                        className="text-xs font-black uppercase tracking-wider truncate"
                                        style={{
                                            color,
                                            textShadow: `0 0 12px ${color}60`,
                                        }}
                                    >
                                        {p.display_name || p.user_id?.slice(0, 8)}
                                    </p>
                                    <p className="text-[9px] text-white/30 font-bold tracking-wide truncate">
                                        {roleInfo?.label || role}
                                    </p>
                                    {inputSummary && (
                                        <p
                                            className="text-[8px] mt-0.5 truncate font-medium"
                                            style={{ color: `${color}90` }}
                                        >
                                            {inputSummary}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

function formatInputBrief(role, inputs) {
    if (!inputs || typeof inputs !== 'object') return ''
    // Custom prompt takes priority — show what the player typed
    if (inputs.custom_prompt) return inputs.custom_prompt
    switch (role) {
        case 'drummer': return inputs.bpm ? `${inputs.bpm} BPM` : ''
        case 'vibe_setter': return inputs.mood || ''
        case 'genre_dj': return inputs.genre || ''
        case 'instrumentalist': return inputs.instrument || ''
        case 'energy': {
            if (inputs.density != null) return `Energy ${Math.round(inputs.density * 100)}%`
            return ''
        }
        default: return ''
    }
}
