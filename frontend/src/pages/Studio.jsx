import React, { useState } from 'react'
import Host from './Host.jsx'
import Sidebar from '../components/Sidebar.jsx'
import PromptPanel from '../components/PromptPanel.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

/*
  Studio page — Main layout wrapper with sidebar and dynamic content panels.
*/
export default function Studio() {
    const [activeItem, setActiveItem] = useState('studio')
    const [sidebarExpanded, setSidebarExpanded] = useState(false)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const { isConnected } = useRoomStore()

    // Render the main content based on the sidebar selection
    const renderContent = () => {
        switch (activeItem) {
            case 'studio':
                return <Host />
            case 'prompt':
                return <PromptPanel />

            case 'how':
                return (
                    <div className="flex-1 p-6 max-w-4xl mx-auto py-12">
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-10">How It Works</h2>
                        <div className="grid gap-6">
                            {[
                                { title: '1. Connect Signals', desc: 'Join a room and choose your role. Your interactions provide the harmonic and rhythmic pulse.' },
                                { title: '2. Gemini Synthesis', desc: 'Google Gemini analyzes crowd signals in real-time to determine the next musical shift.' },
                                { title: '3. Lyria Audio', desc: 'The Google Lyria model generates high-fidelity, evolving audio streams based on collective input.' },
                                { title: '4. Dynamic Visuals', desc: 'Real-time visualizers respond to frequency data, creating a synced multi-sensory experience.' }
                            ].map((step, i) => (
                                <div key={i} className="glass-card p-8 flex gap-6 items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/30 shrink-0 font-black text-[#00D1FF]">
                                        {i + 1}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">{step.title}</h3>
                                        <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )



            case 'settings':
                return (
                    <div className="flex-1 p-6 max-w-3xl mx-auto py-12">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-8">Studio Settings</h2>
                        <div className="glass-card overflow-hidden divide-y divide-white/5">
                            {[
                                { label: 'High Fidelity Audio', desc: 'Enable 48kHz lossless streaming', active: true },
                                { label: 'Low Latency Mode', desc: 'Prioritize speed over visual quality', active: false },
                                { label: 'Spatial Visualization', desc: 'Enable 3D background rendering', active: true },
                                { label: 'Haptic Feedback', desc: 'Vibrate on intense rhythm changes', active: false }
                            ].map((pref, i) => (
                                <div key={i} className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-white uppercase tracking-wider">{pref.label}</p>
                                        <p className="text-xs text-white/30">{pref.desc}</p>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${pref.active ? 'bg-[#00D1FF]' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${pref.active ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            default:
                return <Host />
        }
    }

    return (
        <div className="min-h-screen flex bg-[#050814] text-white">
            {/* ── Left Sidebar ── */}
            <Sidebar
                activeItem={activeItem}
                onItemClick={setActiveItem}
                expanded={sidebarExpanded}
                setExpanded={setSidebarExpanded}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
            />

            {/* ── Main Content Area ── */}
            <main className={`flex-1 transition-all duration-300 ease-in-out pt-32 lg:pt-24 px-4 sm:px-8 
                ${sidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}
            `}>
                <div className="w-full max-w-7xl mx-auto">
                    {/* Header info */}
                    <div className="mb-4">
                        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00D1FF] mb-1">
                            Coro Studio Node
                        </h1>
                        <p className="text-2xl font-black text-white/90 uppercase tracking-tighter">
                            {activeItem === 'studio' ? 'Dashboard' : activeItem.replace('-', ' ')}
                        </p>
                    </div>

                    {/* Network Status indicator */}
                    <div className="fixed top-6 right-36 z-[120] hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#00D1FF] animate-pulse shadow-[0_0_8px_#00D1FF]' : 'bg-yellow-400'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                            {isConnected ? 'Network Connected' : 'Syncing...'}
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeItem}
                            initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="w-full"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    )
}
