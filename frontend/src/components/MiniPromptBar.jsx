import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'

const PRESETS = [
    { label: 'Drop It', emoji: '💥', text: 'Build tension and hit a massive bass drop' },
    { label: 'Chill Vibes', emoji: '🌊', text: 'Slow it down, smooth pads, lo-fi chill' },
    { label: 'Go Hard', emoji: '🔥', text: 'Max energy, heavy drums, fast tempo, hype it up' },
    { label: 'Switch Up', emoji: '🔀', text: 'Flip the genre, surprise the crowd, try something new' },
]

export default function MiniPromptBar() {
    const [prompt, setPrompt] = useState('')
    const { userId, roomId, role, isConnected } = useRoomStore()
    const { sendInput } = useWebSocket()
    const [flash, setFlash] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [sentPreset, setSentPreset] = useState(null)

    const sendRole = role || 'energy'

    const handleSend = () => {
        if (!prompt.trim() || !roomId) return
        sendInput(userId, roomId, sendRole, { custom_prompt: prompt.trim() })
        setPrompt('')
        setFlash(true)
        setTimeout(() => setFlash(false), 500)
    }

    const handlePreset = (preset) => {
        if (!roomId || !isConnected) return
        setPrompt(preset.text)
        setSentPreset(preset.label)
        setTimeout(() => setSentPreset(null), 600)
    }

    if (!roomId) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-auto">
            {/* Preset cards */}
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 mb-2 justify-center flex-wrap"
            >
                {PRESETS.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => handlePreset(p)}
                        disabled={!isConnected}
                        className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 ${
                            sentPreset === p.label
                                ? 'bg-[#00D1FF]/20 scale-105'
                                : 'bg-black/50 hover:bg-black/70'
                        }`}
                        style={{
                            backdropFilter: 'blur(20px)',
                            border: sentPreset === p.label
                                ? '1px solid rgba(0,209,255,0.5)'
                                : '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <span className="text-sm">{p.emoji}</span>
                        <span className="text-[11px] font-bold text-white/70 group-hover:text-white">{p.label}</span>
                    </button>
                ))}
            </motion.div>

            {/* Input bar */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 backdrop-blur-3xl border transition-all duration-500 shadow-2xl ${flash ? 'border-[#00D1FF] shadow-[0_0_25px_rgba(0,209,255,0.4)] scale-105' : 'border-white/10'
                    } ${isHovered ? 'border-white/20' : ''}`}
            >
                <div className="flex items-center gap-3 flex-1 pl-4">
                    <MessageSquare size={16} className="text-[#00D1FF]/60" />
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Push creative direction..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/20 py-2"
                    />
                </div>

                <button
                    onClick={handleSend}
                    disabled={!prompt.trim() || !isConnected}
                    className={`flex items-center justify-center p-2.5 rounded-xl transition-all active:scale-90 ${prompt.trim() && isConnected
                        ? 'bg-[#00D1FF] text-black shadow-[0_0_15px_rgba(0,209,255,0.3)]'
                        : 'bg-white/5 text-white/20'
                        }`}
                >
                    <Send size={18} />
                </button>

                {/* Subtle success pulse background */}
                <AnimatePresence>
                    {flash && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: 1.2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 rounded-2xl bg-[#00D1FF]/20 pointer-events-none"
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
