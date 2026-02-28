import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'

const PROMPTS = {
    short: "Anti-gravity club jam — weightless, floating groove, airy pads, shimmering arps, slow-motion risers, elastic bass, lots of space and reverb, soft but punchy drums, 'zero-G' whooshes.",
    medium: "Make it feel like zero gravity in a neon music studio: gliding synth pads, sparkling plucks, dreamy harmonic layers, bass that 'floats' then hits, drums in half-time with crisp hats, huge reverb tails, subtle sci-fi sweeps, build tension slowly then release into a clean drop.",
    long: "Anti-gravity soundtrack: weightless + cinematic + club. Start with spacious pads and thin shimmering textures, introduce a pulsing bass that feels like it’s suspended, drums come in gradually (half-time kick/snare, fast hats, occasional trap rolls), add micro-swells/risers and airy vocal-like synths, keep the mix wide, glossy, and breathable. Energy should 'lift' every 8 bars, then a smooth drop that still feels floating, not aggressive."
}

export default function PromptPanel() {
    const [prompt, setPrompt] = useState('')
    const { userId, roomId, role, isConnected } = useRoomStore()
    const { sendInput } = useWebSocket()
    const [flash, setFlash] = useState(false)

    const handleSend = () => {
        if (!prompt.trim() || !roomId) return
        sendInput(userId, roomId, role, { custom_prompt: prompt.trim() })
        setPrompt('')
        setFlash(true)
        setTimeout(() => setFlash(false), 500)
    }

    return (
        <div className="flex-1 max-w-2xl mx-auto py-12 px-6">
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#00D1FF]/10 flex items-center justify-center border border-[#00D1FF]/30 shadow-[0_0_20px_rgba(0,209,255,0.1)]">
                        <MessageSquare className="text-[#00D1FF]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Sonic Director</h2>
                        <p className="text-white/40 font-medium text-sm tracking-wide">Shape the collective evolution of the stream.</p>
                    </div>
                </div>

                <div className="glass-card p-8 space-y-6">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D1FF]/60">Presets</p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setPrompt(PROMPTS.short)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D1FF]/40 hover:bg-[#00D1FF]/5 text-white/60 hover:text-[#00D1FF] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                ✨ Zero-G (Short)
                            </button>
                            <button
                                onClick={() => setPrompt(PROMPTS.medium)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D1FF]/40 hover:bg-[#00D1FF]/5 text-white/60 hover:text-[#00D1FF] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                🌌 Floating (Medium)
                            </button>
                            <button
                                onClick={() => setPrompt(PROMPTS.long)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#00D1FF]/40 hover:bg-[#00D1FF]/5 text-white/60 hover:text-[#00D1FF] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                                🛸 Weightless (Long)
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D1FF]/60">Custom Direction</p>
                        <div className="relative group">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSend()
                                    }
                                }}
                                placeholder="Describe what you want to hear..."
                                className={`neon-input min-h-[120px] resize-none pt-4 pr-12 transition-all duration-300 ${flash ? 'ring-2 ring-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.3)]' : ''}`}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!prompt.trim() || !isConnected || !roomId}
                                className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-[#00D1FF] text-black hover:bg-[#00E5FF] disabled:bg-white/5 disabled:text-white/20 transition-all active:scale-90 shadow-lg"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                                {roomId ? `Connected to ${roomId}` : 'Join a room to prompt'}
                            </p>
                            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                                Press Enter to send
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-2">
                        <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest">Evolutionary AI</p>
                        <p className="text-xs text-white/40 leading-relaxed font-medium">
                            Gemini weaves your descriptors into the existing sonic fabric rather than a hard reset.
                        </p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-2">
                        <p className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest">Prompt Logic</p>
                        <p className="text-xs text-white/40 leading-relaxed font-medium">
                            Include genre, mood, instrumentation, and energy level for the best results.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
