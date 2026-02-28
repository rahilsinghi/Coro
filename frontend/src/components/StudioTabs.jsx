import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatAIDrawer } from './QuickActions'

// ── Tab switcher pill ──────────────────────────────────────────────────────────
export function TabSwitcher({ active, onChange }) {
    const tabs = [
        { id: 'studio', label: 'Studio' },
        { id: 'quick-actions', label: 'Quick Actions' },
    ]
    return (
        <div
            className="inline-flex items-center gap-1 p-1 rounded-full mb-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
            {tabs.map(t => (
                <button
                    key={t.id}
                    onClick={() => onChange(t.id)}
                    className="relative px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300"
                    style={{
                        color: active === t.id ? '#000' : 'rgba(255,255,255,0.45)',
                    }}
                >
                    {active === t.id && (
                        <motion.div
                            layoutId="tab-pill"
                            className="absolute inset-0 rounded-full"
                            style={{ background: '#00D1FF', boxShadow: '0 0 20px rgba(0,209,255,0.35)' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10">{t.label}</span>
                </button>
            ))}
        </div>
    )
}

// ── Quick Actions panel ───────────────────────────────────────────────────────
const ACTIONS = [
    {
        id: 'chat', label: 'Chat AI', icon: '💬', accent: '#00D1FF',
        desc: 'Studio assistant',
    },
    {
        id: 'how', label: 'How It Works', icon: '❓', accent: '#2D6BFF',
        desc: 'Learn the flow',
        toast: 'CORO uses Gemini + Google Lyria to synthesise live music from crowd signals in real time.',
    },
    {
        id: 'demo', label: 'Demo', icon: '▶', accent: '#00D1FF',
        desc: 'Try it solo',
        toast: 'Demo mode coming soon — stay tuned!',
    },
    {
        id: 'create', label: 'Create Room', icon: '＋', accent: '#22c55e',
        desc: 'New session',
        nav: '/host',
    },
    {
        id: 'settings', label: 'Settings', icon: '⚙', accent: '#7C3AED',
        desc: 'Audio prefs',
        toast: 'Settings panel coming soon.',
    },
]

export function QuickActionsPanel() {
    const [chatOpen, setChatOpen] = useState(false)
    const [toast, setToast] = useState(null)
    const navigate = useNavigate()

    const handleAction = (action) => {
        if (action.id === 'chat') return setChatOpen(true)
        if (action.nav) return navigate(action.nav)
        if (action.toast) {
            setToast(action.toast)
            setTimeout(() => setToast(null), 4000)
        }
    }

    return (
        <div className="w-full">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                        className="mb-6 px-5 py-4 rounded-2xl text-sm font-medium"
                        style={{ background: 'rgba(0,209,255,0.10)', border: '1px solid rgba(0,209,255,0.20)', color: 'rgba(255,255,255,0.85)' }}
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Card */}
            <div
                className="w-full rounded-[2rem] p-8"
                style={{ background: 'rgba(0,12,30,0.65)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,209,255,0.14)' }}
            >
                <p className="text-[10px] font-black uppercase tracking-[0.45em] mb-8" style={{ color: 'rgba(0,209,255,0.70)' }}>
                    Quick Actions
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {ACTIONS.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action)}
                            className="group flex flex-col items-center gap-3 p-6 rounded-[1.5rem] transition-all duration-300 active:scale-95"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = action.accent + '55'
                                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                                e.currentTarget.style.boxShadow = `0 0 24px ${action.accent}22`
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        >
                            <span
                                className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                                style={{ background: 'rgba(0,0,0,0.35)', color: action.accent }}
                            >
                                {action.icon}
                            </span>
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.08em] text-center">{action.label}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.30)' }}>{action.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            <ChatAIDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
