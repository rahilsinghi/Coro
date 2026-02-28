import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import AuthModals from './AuthModals'

export default function Navbar() {
    const { isAuthed, displayName, setAuthed, setEnteredCoro } = useRoomStore()
    const [showModal, setShowModal] = useState(false)
    const navigate = useNavigate()

    const handleLogoClick = (e) => {
        e.preventDefault()
        setEnteredCoro(false)   // restore hero / landing screen
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

            {/* Auth Actions */}
            <div className="flex items-center gap-6">
                {isAuthed ? (
                    <div className="flex items-center gap-4">
                        <span className="text-white/70 text-sm font-bold">{displayName}</span>
                        <button
                            onClick={() => setAuthed(false, '')}
                            className="text-white/40 hover:text-white/70 transition-colors text-xs font-medium"
                        >
                            Log Out
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-[#00D1FF] hover:bg-[#00E5FF] text-black px-6 py-2 rounded-full text-sm font-black transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)] hover:shadow-[0_0_30px_rgba(0,209,255,0.6)] active:scale-95"
                    >
                        Enter
                    </button>
                )}
            </div>

            <AuthModals
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </nav>
    )
}
