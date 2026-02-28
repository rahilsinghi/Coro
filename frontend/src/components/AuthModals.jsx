import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

export default function AuthModals({ isOpen, onClose }) {
    const { setAuthed } = useRoomStore()
    const [name, setName] = useState('')

    // Escape closes modal + scroll lock
    useEffect(() => {
        if (!isOpen) return

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        document.body.style.overflow = 'hidden'

        return () => {
            window.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim()) return
        setAuthed(true, name.trim())
        onClose()
    }

    // Render via portal to document.body to escape any overflow/z-index parent context
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    aria-modal="true"
                    role="dialog"
                >
                    {/* Backdrop — click to close */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative w-full max-w-md z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#000c1e] border border-[#00D1FF]/25 rounded-[2rem] p-10 shadow-[0_0_120px_rgba(0,0,0,0.9),0_0_40px_rgba(0,209,255,0.08)]">
                            {/* 3-column header: spacer | centered label | close button */}
                            <div className="flex items-start justify-between mb-8">
                                {/* Left spacer — same width as X button */}
                                <div className="w-8 shrink-0" />

                                {/* Centered label block */}
                                <div className="flex-1 flex flex-col items-center text-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                        <span className="text-[#00D1FF]/65 text-[10px] uppercase tracking-[0.45em] font-black whitespace-nowrap">
                                            CORO Studio
                                        </span>
                                        <div className="w-6 h-px bg-[#00D1FF]/35" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">
                                        What's your name?
                                    </h2>
                                    <p className="text-white/40 text-sm font-medium">
                                        This is how other players will see you.
                                    </p>
                                </div>

                                {/* Close button — right side */}
                                <button
                                    onClick={onClose}
                                    className="w-8 shrink-0 flex items-start justify-end text-white/30 hover:text-white transition-colors pt-0.5"
                                    aria-label="Close modal"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-[0.3em] text-[#00D1FF]/50 font-black mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        autoFocus
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. DJ Nova"
                                        maxLength={24}
                                        className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none transition-all"
                                        style={{ '--tw-ring-color': '#00D1FF' }}
                                        onFocus={e => e.target.style.borderColor = '#00D1FF'}
                                        onBlur={e => e.target.style.borderColor = ''}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!name.trim()}
                                    className="w-full text-black font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 mt-2"
                                    style={{
                                        background: '#00D1FF',
                                        boxShadow: '0 15px 40px rgba(0,209,255,0.25)',
                                    }}
                                    onMouseEnter={e => e.target.style.background = '#00E5FF'}
                                    onMouseLeave={e => e.target.style.background = '#00D1FF'}
                                >
                                    Enter Studio
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
