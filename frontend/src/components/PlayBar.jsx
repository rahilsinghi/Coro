import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'

export default function PlayBar() {
    const { userId, roomId, role, currentInputs } = useRoomStore()
    const { sendInput } = useWebSocket()
    const [intensity, setIntensity] = useState(0.5)
    const [ripples, setRipples] = useState([])
    const [isVibrating, setIsVibrating] = useState(false)

    // Only show if user is an Instrumentalist and has selected Guitar
    const instrumentInput = currentInputs['instrumentalist'] || {}
    const isGuitar = instrumentInput.instrument?.toLowerCase().includes('guitar')

    if (role !== 'instrumentalist' || !isGuitar) return null

    const handleStrum = () => {
        const id = Date.now()
        setRipples(prev => [...prev, id])
        setTimeout(() => setRipples(prev => prev.filter(r => r !== id)), 600)

        setIsVibrating(true)
        setTimeout(() => setIsVibrating(false), 300)

        sendInput(userId, roomId, role, {
            instrument: "guitar",
            action: "strum",
            intensity: parseFloat(intensity)
        })

        if (navigator.vibrate) navigator.vibrate(50)
    }

    const handleIntensityChange = (val) => {
        setIntensity(val)
        sendInput(userId, roomId, role, {
            instrument: "guitar",
            intensity: parseFloat(val)
        })
    }

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4 pointer-events-auto">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-card p-6 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10"
            >
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00D1FF]">Guitar Play Bar</p>
                    <div className="flex gap-1">
                        {[0, 1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={isVibrating ? {
                                    x: [0, -1, 1, -1, 0],
                                    opacity: [0.2, 0.5, 0.2]
                                } : {}}
                                transition={{ repeat: Infinity, duration: 0.1 }}
                                className="w-16 h-[1px] bg-[#00D1FF]/30"
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Strum Pad */}
                    <div className="relative">
                        <button
                            onMouseDown={handleStrum}
                            className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#00D1FF] to-[#0080FF] text-black flex items-center justify-center shadow-[0_0_30px_rgba(0,209,255,0.3)] active:scale-90 transition-all z-10 overflow-hidden"
                        >
                            <span className="font-black text-xs uppercase tracking-widest">Strum</span>

                            {/* Inner ripple */}
                            <AnimatePresence>
                                {ripples.map(id => (
                                    <motion.span
                                        key={id}
                                        initial={{ scale: 0, opacity: 1 }}
                                        animate={{ scale: 4, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white/40 rounded-full"
                                    />
                                ))}
                            </AnimatePresence>
                        </button>

                        {/* Outer Glow */}
                        <motion.div
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -inset-2 bg-[#00D1FF] blur-xl rounded-full opacity-20 -z-10"
                        />
                    </div>

                    {/* Intensity Slider */}
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Intensity</span>
                            <span className="text-[9px] font-black text-[#00D1FF] uppercase tracking-widest">{Math.round(intensity * 100)}%</span>
                        </div>
                        <div className="relative h-10 flex items-center">
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={intensity}
                                onChange={(e) => handleIntensityChange(e.target.value)}
                                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#00D1FF] transition-all"
                            />
                            {/* Visual Track Fill */}
                            <div
                                className="absolute left-0 top-[19px] h-1.5 bg-[#00D1FF] rounded-full pointer-events-none shadow-[0_0_10px_rgba(0,209,255,0.5)]"
                                style={{ width: `${intensity * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
