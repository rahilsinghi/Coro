import React from 'react'
import Host from './Host.jsx'
import { useRoomStore } from '../store/roomStore'

/*
  Studio page — renders the Host dashboard directly.
  Sidebar items (How It Works, Settings, Prompt) have been moved to navbar modals.
*/
export default function Studio() {
    const { isConnected } = useRoomStore()

    return (
        <div className="min-h-screen bg-[#050814] text-white">
            <main className="pt-24 px-4 sm:px-8">
                <div className="w-full max-w-7xl mx-auto">
                    {/* Header info */}
                    <div className="mb-4">
                        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00D1FF] mb-1">
                            Coro Studio Node
                        </h1>
                        <p className="text-2xl font-black text-white/90 uppercase tracking-tighter">
                            Dashboard
                        </p>
                    </div>

                    {/* Network Status indicator */}
                    <div className="fixed top-6 right-36 z-[120] hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00D1FF] animate-pulse shadow-[0_0_8px_#00D1FF]' : 'bg-yellow-400'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            {isConnected ? 'Network Connected' : 'Syncing...'}
                        </span>
                    </div>

                    <Host />
                </div>
            </main>
        </div>
    )
}
