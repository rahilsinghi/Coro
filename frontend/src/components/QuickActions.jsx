import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, HelpCircle, Play, PlusCircle, Settings, FileText, X, Send } from 'lucide-react'
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
                <div className="fixed inset-0 z-50 flex justify-end">
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
                        className="relative w-full max-w-md bg-cs-surface border-l border-cs-border h-full flex flex-col shadow-2xl"
                    >
                        <div className="p-6 border-b border-cs-border flex justify-between items-center bg-cs-bg/50">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="text-cs-accent" /> Chat AI
                                </h2>
                                <p className="text-xs text-cs-muted mt-1">Ask CORO for help choosing roles, vibe, and prompts.</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-cs-border rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl ${m.role === 'user'
                                        ? 'bg-cs-accent text-white rounded-tr-none'
                                        : 'bg-cs-bg border border-cs-border text-cs-text rounded-tl-none'
                                        }`}>
                                        <p className="text-sm leading-relaxed">{m.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="p-6 border-t border-cs-border bg-cs-bg/50">
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-cs-surface border border-cs-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cs-accent transition-all"
                                />
                                <button type="submit" className="p-3 bg-cs-accent hover:bg-purple-500 rounded-xl transition-colors shadow-lg shadow-cs-accent/20">
                                    <Send size={18} />
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
        { id: 'chat', label: 'Chat AI', icon: MessageSquare, color: 'text-cs-accent', desc: 'Get setup help', onClick: () => setChatOpen(true) },
        { id: 'how', label: 'How it works', icon: HelpCircle, color: 'text-blue-400', desc: 'View tutorial' },
        { id: 'demo', label: 'Demo Room', icon: Play, color: 'text-green-400', desc: 'Try it solo' },
        { id: 'settings', label: 'Settings', icon: Settings, color: 'text-cs-muted', desc: 'Audio & Profile' },
        { id: 'faq', label: 'FAQ', icon: FileText, color: 'text-amber-400', desc: 'Common questions' },
    ]

    return (
        <div className="w-full mt-12">
            <h3 className="text-cs-muted uppercase tracking-[0.2em] text-xs font-bold mb-6 text-center">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="group flex flex-col items-center p-6 bg-cs-surface/40 border border-cs-border rounded-2xl hover:border-cs-accent/50 hover:bg-cs-surface/60 transition-all active:scale-[0.98]"
                    >
                        <div className={`p-3 rounded-xl bg-cs-bg group-hover:bg-cs-bg/50 transition-colors mb-3 ${action.color}`}>
                            <action.icon size={24} />
                        </div>
                        <span className="text-sm font-bold text-white mb-1">{action.label}</span>
                        <span className="text-[10px] text-cs-muted uppercase tracking-wider">{action.desc}</span>
                    </button>
                ))}
            </div>

            <ChatAIDrawer isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    )
}
