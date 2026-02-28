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

export default function Navbar() {
    const { isAuthed, displayName, setAuthed, setEnteredCoro, roomId, userId } = useRoomStore()
    const { updateDisplayName } = useWebSocket()
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showHowModal, setShowHowModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
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
        </nav>
    )
}
