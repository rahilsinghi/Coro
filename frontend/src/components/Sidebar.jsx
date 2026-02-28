import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, MessageSquare, ChevronLeft, ChevronRight, Menu } from 'lucide-react'

const SIDEBAR_ITEMS = [
    { id: 'studio', label: 'Studio', icon: LayoutDashboard },
    { id: 'prompt', label: 'Prompt', icon: MessageSquare },
]

export default function Sidebar({ activeItem, onItemClick, expanded, setExpanded, mobileOpen, setMobileOpen }) {
    return (
        <>
            {/* Mobile Menu Button - only visible on small screens */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-5 left-6 z-[120] p-2 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-white"
                aria-label="Toggle Menu"
            >
                <Menu size={20} />
            </button>

            {/* Backdrop for mobile */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[115]"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar container */}
            <aside
                className={`fixed top-0 left-0 h-screen z-[116] flex flex-col transition-all duration-300 ease-in-out border-r border-white/5
                    ${expanded ? 'w-64' : 'w-20'}
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    bg-[#050814]/80 backdrop-blur-xl
                `}
            >
                {/* Logo Area (Internal to sidebar) */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                    <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                        <span className="text-xl font-black tracking-tighter text-white">CORO</span>
                        <div className="h-1 w-4 bg-[#00D1FF] shadow-[0_0_10px_#00D1FF]" />
                    </div>
                    {!expanded && (
                        <div className="mx-auto flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setExpanded(true)}>
                            <div className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full shadow-[0_0_8px_#00D1FF]" />
                            <div className="w-1.5 h-1.5 bg-[#00D1FF]/40 rounded-full" />
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-none">
                    {SIDEBAR_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isActive = activeItem === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onItemClick(item.id)
                                    if (window.innerWidth < 1024) setMobileOpen(false)
                                }}
                                className={`group relative w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-[#00D1FF]/10 text-white ring-1 ring-[#00D1FF]/40'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                    }
                                `}
                                aria-label={item.label}
                            >
                                <div className={`min-w-[24px] flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    <Icon
                                        size={22}
                                        className={isActive ? 'text-[#00D1FF] drop-shadow-[0_0_8px_rgba(0,209,255,0.6)]' : ''}
                                    />
                                </div>

                                <span className={`font-black transition-all duration-300 whitespace-nowrap uppercase tracking-[0.2em] text-[10px]
                                    ${expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'}
                                    ${isActive ? 'text-white' : ''}
                                `}>
                                    {item.label}
                                </span>

                                {/* Glow ring when active */}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 rounded-xl bg-[#00D1FF]/5 pointer-events-none"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Toggle Collapse Button (at bottom) */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`hidden lg:flex w-full items-center justify-center p-3 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all duration-200`}
                    >
                        {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>
            </aside>
        </>
    )
}
