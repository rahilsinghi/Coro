import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoomStore } from '../store/roomStore'
import AuthModals from './AuthModals'

export default function Navbar() {
    const { isAuthed, setAuthed } = useRoomStore()
    const [modalType, setModalType] = useState(null) // 'login' | 'signup' | null

    return (
        <nav className="fixed top-0 left-0 right-0 z-[110] flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/10 border-b border-white/5">
            {/* Wordmark */}
            <Link to="/" className="group flex items-center gap-2">
                <span className="text-2xl font-black tracking-tighter text-white">
                    CORO
                </span>
                <div className="h-1 w-4 bg-[#00D1FF] shadow-[0_0_10px_#00D1FF] group-hover:w-8 transition-all duration-300" />
            </Link>

            {/* Auth Actions */}
            <div className="flex items-center gap-6">
                {isAuthed ? (
                    <button
                        onClick={() => setAuthed(false)}
                        className="text-white/60 hover:text-[#00D1FF] transition-colors text-sm font-medium"
                    >
                        Log Out
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => setModalType('login')}
                            className="text-white/60 hover:text-white hover:drop-shadow-[0_0_8px_rgba(0,209,255,0.6)] transition-all text-sm font-semibold"
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => setModalType('signup')}
                            className="bg-[#00D1FF] hover:bg-[#00E5FF] text-black px-6 py-2 rounded-full text-sm font-black transition-all shadow-[0_0_20px_rgba(0,209,255,0.4)] hover:shadow-[0_0_30px_rgba(0,209,255,0.6)] active:scale-95"
                        >
                            Sign up
                        </button>
                    </>
                )}
            </div>

            <AuthModals
                isOpen={!!modalType}
                type={modalType}
                onClose={() => setModalType(null)}
            />
        </nav>
    )
}
