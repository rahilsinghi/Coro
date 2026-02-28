import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import RibbonWavesBackground from './RibbonWavesBackground.jsx'
import AuthModals from './AuthModals.jsx'

// ─── GlobeExperience → Landing Hero ──────────────────────────────────────────
export default function GlobeExperience() {
    const hasEnteredCoro = useRoomStore(s => s.hasEnteredCoro)
    const setEnteredCoro = useRoomStore(s => s.setEnteredCoro)
    const isAuthed = useRoomStore(s => s.isAuthed)
    const navigate = useNavigate()
    const location = useLocation()
    const isLanding = location.pathname === '/'
    const showHero = !hasEnteredCoro && isLanding
    const [showNameModal, setShowNameModal] = useState(false)
    // Track where to navigate after auth completes
    const pendingDest = useRef('/studio')

    const proceedTo = (dest) => {
        setEnteredCoro(true)
        navigate(dest)
    }

    const handleAction = (dest) => {
        pendingDest.current = dest
        if (!isAuthed) {
            setShowNameModal(true)
            return
        }
        proceedTo(dest)
    }

    const handleNameModalClose = () => {
        setShowNameModal(false)
        const name = localStorage.getItem('cs_display_name')
        if (name) proceedTo(pendingDest.current)
    }

    return (
        <>
            {/* ── Layer 1: Ribbon Waves Background (fixed, z-0) ── */}
            <div
                className="fixed inset-0 z-0 pointer-events-none transition-all ease-in-out"
                style={{
                    transitionDuration: '1200ms',
                    opacity: hasEnteredCoro ? 0.18 : 1,
                    transform: hasEnteredCoro ? 'scale(1.04)' : 'scale(1)',
                }}
            >
                <RibbonWavesBackground />
            </div>

            {/* ── Layer 2: Vignette (z-[5]) — only on landing ── */}
            {showHero && (
                <div
                    className="fixed inset-0 z-[5] pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 25%, rgba(0,0,0,0.52) 100%)',
                    }}
                />
            )}

            {/* ── Layer 3: Hero card (z-[200]) ── */}
            <AnimatePresence>
                {showHero && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Card */}
                        <div
                            className="flex flex-col items-center text-center w-full"
                            style={{
                                maxWidth: '520px',
                                pointerEvents: 'auto',
                                background: 'rgba(5, 10, 28, 0.62)',
                                backdropFilter: 'blur(22px)',
                                WebkitBackdropFilter: 'blur(22px)',
                                border: '1px solid rgba(0, 209, 255, 0.16)',
                                borderRadius: '1.5rem',
                                padding: 'clamp(1.6rem, 4vw, 2.2rem)',
                                boxShadow:
                                    '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,209,255,0.04)',
                            }}
                        >
                            {/* ── CORO label ── */}
                            <div className="flex items-center gap-3 mb-5">
                                <div
                                    className="w-8 h-px"
                                    style={{
                                        background:
                                            'linear-gradient(to right, transparent, rgba(0,209,255,0.5))',
                                    }}
                                />
                                <span
                                    className="font-black uppercase tracking-[0.55em]"
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'rgba(0,209,255,0.80)',
                                        letterSpacing: '0.5em',
                                    }}
                                >
                                    CORO
                                </span>
                                <div
                                    className="w-8 h-px"
                                    style={{
                                        background:
                                            'linear-gradient(to left, transparent, rgba(0,209,255,0.5))',
                                    }}
                                />
                            </div>

                            {/* ── Line 1 ── */}
                            <p
                                className="font-display font-semibold text-white leading-tight tracking-tight whitespace-nowrap"
                                style={{
                                    fontSize: 'clamp(0.82rem, 2vw, 1rem)',
                                    opacity: 0.85,
                                }}
                            >
                                The Room Decides The Rhythm
                            </p>

                            {/* ── Line 2 ── */}
                            <p
                                className="font-display font-bold text-white leading-tight tracking-tighter whitespace-nowrap mb-5"
                                style={{
                                    fontSize: 'clamp(1.15rem, 3.2vw, 1.55rem)',
                                    marginTop: '0.35rem',
                                }}
                            >
                                Music, Made By Everyone
                            </p>

                            {/* ── Description ── */}
                            <p
                                className="font-medium whitespace-nowrap mb-7"
                                style={{
                                    fontSize: 'clamp(0.65rem, 1.4vw, 0.78rem)',
                                    color: 'rgba(255,255,255,0.45)',
                                }}
                            >
                                Converge live crowd signals into a shared, evolving
                                musical sphere.
                            </p>

                            {/* ── Two CTA Buttons ── */}
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                {/* Create Room — primary */}
                                <button
                                    onClick={() => handleAction('/studio')}
                                    className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2 font-black text-black rounded-full transition-transform active:scale-95"
                                    style={{
                                        background: '#00D1FF',
                                        padding: '0.85rem 1.6rem',
                                        fontSize: '0.88rem',
                                        boxShadow: '0 12px 36px rgba(0,209,255,0.30)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#00E5FF'
                                        e.currentTarget.style.boxShadow = '0 18px 55px rgba(0,209,255,0.52)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#00D1FF'
                                        e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,209,255,0.30)'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                    <span className="relative z-10">Create Room</span>
                                    <svg
                                        className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>

                                {/* Join Session — secondary / outline */}
                                <button
                                    onClick={() => handleAction('/guest')}
                                    className="group relative overflow-hidden flex-1 flex items-center justify-center gap-2 font-black rounded-full transition-all active:scale-95"
                                    style={{
                                        background: 'transparent',
                                        padding: '0.85rem 1.6rem',
                                        fontSize: '0.88rem',
                                        border: '1.5px solid rgba(0,209,255,0.45)',
                                        color: '#00D1FF',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0,209,255,0.08)'
                                        e.currentTarget.style.borderColor = 'rgba(0,209,255,0.7)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent'
                                        e.currentTarget.style.borderColor = 'rgba(0,209,255,0.45)'
                                    }}
                                >
                                    <span className="relative z-10">Join Session</span>
                                    <svg
                                        className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Name entry modal */}
            <AuthModals isOpen={showNameModal} onClose={handleNameModalClose} />
        </>
    )
}
