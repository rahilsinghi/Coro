import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'

const PRESETS = [
    { label: 'Zero-G', tag: 'Short', emoji: '✨', text: "Anti-gravity club jam — weightless, floating groove, airy pads, shimmering arps, slow-motion risers, elastic bass, lots of space and reverb, soft but punchy drums, 'zero-G' whooshes." },
    { label: 'Floating', tag: 'Medium', emoji: '🌌', text: "Make it feel like zero gravity in a neon music studio: gliding synth pads, sparkling plucks, dreamy harmonic layers, bass that 'floats' then hits, drums in half-time with crisp hats, huge reverb tails, subtle sci-fi sweeps, build tension slowly then release into a clean drop." },
    { label: 'Weightless', tag: 'Long', emoji: '🛸', text: "Anti-gravity soundtrack: weightless + cinematic + club. Start with spacious pads and thin shimmering textures, introduce a pulsing bass that feels like it's suspended, drums come in gradually (half-time kick/snare, fast hats, occasional trap rolls), add micro-swells/risers and airy vocal-like synths, keep the mix wide, glossy, and breathable. Energy should 'lift' every 8 bars, then a smooth drop that still feels floating, not aggressive." },
]

export default function MiniPromptBar() {
    const [prompt, setPrompt] = useState('')
    const { userId, roomId, role, isConnected } = useRoomStore()
    const { sendInput } = useWebSocket()
    const [flash, setFlash] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [sentPreset, setSentPreset] = useState(null)

    const handleSend = () => {
        if (!prompt.trim() || !roomId) return
        sendInput(userId, roomId, role, { custom_prompt: prompt.trim() })
        setPrompt('')
        setFlash(true)
        setTimeout(() => setFlash(false), 500)
    }

    const handlePreset = (preset) => {
        if (!roomId || !isConnected) return
        sendInput(userId, roomId, role, { custom_prompt: preset.text })
        setSentPreset(preset.label)
        setFlash(true)
        setTimeout(() => { setFlash(false); setSentPreset(null) }, 800)
    }

    if (!roomId) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-auto">
            {/* Preset cards */}
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-2 mb-2 justify-center"
            >
                {PRESETS.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => handlePreset(p)}
                        disabled={!isConnected}
                        className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-30 ${
                            sentPreset === p.label
                                ? 'bg-[#00D1FF]/20 border-[#00D1FF]/50 scale-105'
                                : 'bg-black/50 hover:bg-black/70 border-white/8 hover:border-[#00D1FF]/30'
                        }`}
                        style={{
                            backdropFilter: 'blur(20px)',
                            border: sentPreset === p.label
                                ? '1px solid rgba(0,209,255,0.5)'
                                : '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <span className="text-base">{p.emoji}</span>
                        <div className="text-left">
                            <p className="text-[11px] font-black text-white/80 group-hover:text-white leading-tight">{p.label}</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{p.tag}</p>
                        </div>
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
