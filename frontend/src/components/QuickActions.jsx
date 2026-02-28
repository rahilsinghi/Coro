import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, HelpCircle, Play, Settings, FileText, X, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ChatAIDrawer({ isOpen, onClose }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I\'m CORO. I can help you choose roles, vibes, and prompts for your session. What\'s on your mind?' }
    ])
    const [input, setInput] = useState('')
    const scrollRef = useRef(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    const handleSend = (e) => {
        e.preventDefault()
        if (!input.trim()) return

        const userMsg = { role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')

        // Simulate assistant reply
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `That sounds like a great idea! For a ${input.includes('vibe') ? 'better vibe' : 'creative session'}, try focusing on electronic textures with high brightness.`
            }])
        }, 600)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md bg-[#000816]/90 backdrop-blur-2xl border-l border-white/10 h-full flex flex-col shadow-2xl"
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-black text-white flex items-center gap-3">
                                    <MessageSquare className="text-[#00D1FF]" /> Chat AI
                                </h2>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 font-bold">Studio Assistant</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40">
                                <X size={24} />
                            </button>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-5 rounded-[1.5rem] ${m.role === 'user'
                                        ? 'bg-[#00D1FF] text-black font-bold rounded-tr-none'
                                        : 'bg-white/5 border border-white/10 text-white rounded-tl-none font-medium'
                                        }`}>
                                        <p className="text-sm leading-relaxed">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="p-8 border-t border-white/5 bg-white/5">
                            <div className="flex gap-3">
                                <input
                                    autoFocus
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[#00D1FF] transition-all text-white placeholder-white/20"
                                />
                                <button type="submit" className="p-4 bg-[#00D1FF] hover:bg-[#00E5FF] text-black rounded-2xl transition-all shadow-lg shadow-[#00D1FF]/20 active:scale-95">
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default function QuickActions() {
    const [chatOpen, setChatOpen] = useState(false)

    const actions = [
        { id: 'chat', label: 'Chat AI', icon: MessageSquare, accent: '#00D1FF', desc: 'Setup help', onClick: () => setChatOpen(true) },
        { id: 'how', label: 'Tutorial', icon: HelpCircle, accent: '#2D6BFF', desc: 'How it works' },
        { id: 'demo', label: 'Demo', icon: Play, accent: '#00D1FF', desc: 'Try it solo' },
        { id: 'settings', label: 'Nodes', icon: Settings, accent: '#7C3AED', desc: 'Audio settings' },
        { id: 'faq', label: 'FAQ', icon: FileText, accent: '#2D6BFF', desc: 'Help center' },
    ]

    return (
        <div className="w-full mt-16 max-w-5xl">
            <h3 className="text-white/20 uppercase tracking-[0.4em] text-[10px] font-black mb-8 text-center">Studio Quick Access</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="group flex flex-col items-center p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:border-[#00D1FF]/40 hover:bg-white/[0.08] transition-all duration-500 active:scale-[0.96] shadow-xl"
                    >
                        <div
                            className="p-4 rounded-[1.5rem] bg-black/40 group-hover:scale-110 transition-transform duration-500 mb-4 shadow-inner"
                            style={{ color: action.accent }}
                        >
                            <action.icon size={28} />
                        </div>
                        <span className="text-xs font-black text-white mb-1 uppercase tracking-widest">{action.label}</span>
                        <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{action.desc}</span>
                    </button>
                ))}
            </div>

            <ChatAIDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
