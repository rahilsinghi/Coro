import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'
import AuthModals from './AuthModals'

const SETTINGS_PREFS = [
    { label: 'High Fidelity Audio', desc: 'Enable 48kHz lossless streaming', key: 'hifi' },
    { label: 'Low Latency Mode', desc: 'Prioritize speed over visual quality', key: 'lowLatency' },
    { label: 'Spatial Visualization', desc: 'Enable 3D background rendering', key: 'spatial' },
    { label: 'Haptic Feedback', desc: 'Vibrate on intense rhythm changes', key: 'haptic' },
]

const HOW_STEPS = [
    { title: 'Connect Signals', desc: 'Join a room and choose your role. Your interactions provide the harmonic and rhythmic pulse.' },
    { title: 'Gemini Synthesis', desc: 'Google Gemini analyzes crowd signals in real-time to determine the next musical shift.' },
    { title: 'Lyria Audio', desc: 'The Google Lyria model generates high-fidelity, evolving audio streams based on collective input.' },
    { title: 'Dynamic Visuals', desc: 'Real-time visualizers respond to frequency data, creating a synced multi-sensory experience.' },
]

function HowItWorksModal({ isOpen, onClose }) {
    useEffect(() => {
        if (!isOpen) return
        const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#000c1e] border border-[#00D1FF]/25 rounded-[2rem] p-8 shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_40px_rgba(0,209,255,0.08)]">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1 flex flex-col items-center text-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                        <span className="text-[#00D1FF]/65 text-[10px] uppercase tracking-[0.45em] font-black">CORO</span>
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">How It Works</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 shrink-0 flex items-start justify-end text-white/30 hover:text-white transition-colors pt-0.5"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Steps */}
                            <div className="space-y-4">
                                {HOW_STEPS.map((step, i) => (
                                    <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                        <div className="w-10 h-10 rounded-xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/30 shrink-0 font-black text-[#00D1FF] text-sm">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{step.title}</h3>
                                            <p className="text-white/40 text-xs leading-relaxed mt-1">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

function SettingsModal({ isOpen, onClose }) {
    const [prefs, setPrefs] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('coro_settings') || '{}')
        return { hifi: true, lowLatency: false, spatial: true, haptic: false, ...saved }
    })

    const toggle = (key) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: !prev[key] }
            localStorage.setItem('coro_settings', JSON.stringify(next))
            return next
        })
    }

    useEffect(() => {
        if (!isOpen) return
        const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-md z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#000c1e] border border-[#00D1FF]/25 rounded-[2rem] p-8 shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_40px_rgba(0,209,255,0.08)]">
                            <div className="flex items-start justify-between mb-8">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1 flex flex-col items-center text-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                        <span className="text-[#00D1FF]/65 text-[10px] uppercase tracking-[0.45em] font-black">CORO</span>
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">Settings</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 shrink-0 flex items-start justify-end text-white/30 hover:text-white transition-colors pt-0.5"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="divide-y divide-white/5">
                                {SETTINGS_PREFS.map((pref) => (
                                    <div key={pref.key} className="py-4 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-white uppercase tracking-wider">{pref.label}</p>
                                            <p className="text-xs text-white/30">{pref.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => toggle(pref.key)}
                                            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${prefs[pref.key] ? 'bg-[#00D1FF]' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${prefs[pref.key] ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

const PROMPT_PRESETS = [
    { label: 'Zero-G (Short)', emoji: '✨', text: "Anti-gravity club jam — weightless, floating groove, airy pads, shimmering arps, slow-motion risers, elastic bass, lots of space and reverb, soft but punchy drums, 'zero-G' whooshes." },
    { label: 'Floating (Medium)', emoji: '🌌', text: "Make it feel like zero gravity in a neon music studio: gliding synth pads, sparkling plucks, dreamy harmonic layers, bass that 'floats' then hits, drums in half-time with crisp hats, huge reverb tails, subtle sci-fi sweeps, build tension slowly then release into a clean drop." },
    { label: 'Weightless (Long)', emoji: '🛸', text: "Anti-gravity soundtrack: weightless + cinematic + club. Start with spacious pads and thin shimmering textures, introduce a pulsing bass that feels like it's suspended, drums come in gradually (half-time kick/snare, fast hats, occasional trap rolls), add micro-swells/risers and airy vocal-like synths, keep the mix wide, glossy, and breathable. Energy should 'lift' every 8 bars, then a smooth drop that still feels floating, not aggressive." },
]

function PromptModal({ isOpen, onClose }) {
    const [prompt, setPrompt] = useState('')
    const { userId, roomId, role, isConnected } = useRoomStore()
    const { sendInput } = useWebSocket()
    const [flash, setFlash] = useState(false)

    const handleSend = () => {
        if (!prompt.trim() || !roomId) return
        sendInput(userId, roomId, role, { custom_prompt: prompt.trim() })
        setPrompt('')
        setFlash(true)
        setTimeout(() => setFlash(false), 500)
    }

    useEffect(() => {
        if (!isOpen) return
        const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handleEsc)
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-modal="true" role="dialog">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#000c1e] border border-[#00D1FF]/25 rounded-[2rem] p-8 shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_40px_rgba(0,209,255,0.08)]">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1 flex flex-col items-center text-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                        <span className="text-[#00D1FF]/65 text-[10px] uppercase tracking-[0.45em] font-black">CORO</span>
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">Sonic Director</h2>
                                    <p className="text-white/40 text-xs">Shape the collective evolution of the stream.</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 shrink-0 flex items-start justify-end text-white/30 hover:text-white transition-colors pt-0.5"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Presets */}
                            <div className="mb-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D1FF]/60 mb-3">Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {PROMPT_PRESETS.map((p) => (
                                        <button
                                            key={p.label}
                                            onClick={() => setPrompt(p.text)}
                                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D1FF]/40 hover:bg-[#00D1FF]/5 text-white/60 hover:text-[#00D1FF] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                        >
                                            {p.emoji} {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Textarea */}
                            <div className="mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D1FF]/60 mb-3">Custom Direction</p>
                                <div className="relative">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleSend()
                                            }
                                        }}
                                        placeholder="Describe what you want to hear..."
                                        className={`w-full min-h-[100px] resize-none bg-white/[0.04] border rounded-2xl px-5 py-4 pr-12 text-white text-sm placeholder-white/20 outline-none transition-all ${flash ? 'border-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.3)]' : 'border-white/10 focus:border-[#00D1FF]'}`}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!prompt.trim() || !isConnected || !roomId}
                                        className="absolute bottom-4 right-4 p-2 rounded-xl bg-[#00D1FF] text-black hover:bg-[#00E5FF] disabled:bg-white/5 disabled:text-white/20 transition-all active:scale-90"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-2 px-1">
                                    {roomId ? `Connected to ${roomId} · Press Enter to send` : 'Join a room first'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

export default function Navbar() {
    const { isAuthed, displayName, setAuthed, setEnteredCoro, roomId, userId } = useRoomStore()
    const { updateDisplayName } = useWebSocket()
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showHowModal, setShowHowModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showPromptModal, setShowPromptModal] = useState(false)
    const navigate = useNavigate()

    const handleLogoClick = (e) => {
        e.preventDefault()
        setEnteredCoro(false)
        navigate('/')
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-[110] flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/10 border-b border-white/5">
            {/* Wordmark — click returns to landing */}
            <a
                href="/"
                onClick={handleLogoClick}
                className="group flex items-center gap-2 cursor-pointer relative z-[120]"
                aria-label="Coro Home"
            >
                <span className="text-2xl font-black tracking-tighter text-white group-hover:text-[#00D1FF] transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(0,209,255,0.6)]">
                    CORO
                </span>
                <div className="h-1 w-4 bg-[#00D1FF] shadow-[0_0_10px_#00D1FF] group-hover:w-8 transition-all duration-300" />
            </a>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* How It Works icon */}
                <button
                    onClick={() => setShowHowModal(true)}
                    className="text-white/40 hover:text-[#00D1FF] transition-colors p-2 rounded-full hover:bg-white/5"
                    aria-label="How It Works"
                    title="How It Works"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </button>

                {/* Sonic Director (prompt) icon */}
                <button
                    onClick={() => setShowPromptModal(true)}
                    className="text-white/40 hover:text-[#00D1FF] transition-colors p-2 rounded-full hover:bg-white/5"
                    aria-label="Sonic Director"
                    title="Sonic Director"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>

                {/* Settings icon */}
                <button
                    onClick={() => setShowSettingsModal(true)}
                    className="text-white/40 hover:text-[#00D1FF] transition-colors p-2 rounded-full hover:bg-white/5"
                    aria-label="Settings"
                    title="Settings"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>

                {isAuthed ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="text-white/70 hover:text-[#00D1FF] text-sm font-bold transition-colors cursor-pointer"
                            title="Click to change name"
                        >
                            {displayName || 'Set Name'}
                        </button>
                        <button
                            onClick={() => setAuthed(false, '')}
                            className="text-white/40 hover:text-white/70 transition-colors text-xs font-medium"
                        >
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="bg-[#00D1FF] hover:bg-[#00E5FF] text-black px-6 py-2 rounded-full text-sm font-black transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)] hover:shadow-[0_0_30px_rgba(0,209,255,0.6)] active:scale-95"
                    >
                        Enter
                    </button>
                )}
            </div>

            <AuthModals
                isOpen={showAuthModal}
                onClose={() => {
                    setShowAuthModal(false)
                    // Push updated name to backend if already in a room
                    const updatedName = localStorage.getItem('cs_display_name') || ''
                    if (roomId && userId && updatedName) {
                        updateDisplayName(userId, roomId, updatedName)
                    }
                }}
            />
            <HowItWorksModal
                isOpen={showHowModal}
                onClose={() => setShowHowModal(false)}
            />
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />
            <PromptModal
                isOpen={showPromptModal}
                onClose={() => setShowPromptModal(false)}
            />
        </nav>
    )
}
