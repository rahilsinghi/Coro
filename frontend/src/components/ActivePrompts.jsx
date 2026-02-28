import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ActivePrompts({ prompts = [] }) {
  const [displayed, setDisplayed] = useState([])

  useEffect(() => {
    setDisplayed(prompts)
  }, [prompts])

  if (!displayed.length) return <p className="text-cs-muted text-sm italic">Waiting for the sonic landscape to populate...</p>

  return (
    <div className="flex flex-wrap gap-3">
      <AnimatePresence mode="popLayout">
        {displayed.map((p, i) => (
          <motion.div
            layout
            key={p.text}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.4 + p.weight * 0.6, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, duration: 0.5 }}
            className="flex items-center gap-2.5 bg-[#00D1FF]/5 backdrop-blur-xl border border-[#00D1FF]/10 rounded-full px-4 py-2 hover:border-[#00D1FF]/40 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(0,209,255,0.15)] hover:-translate-y-0.5"
          >
            <div
              className="w-2 h-2 rounded-full bg-[#00D1FF] shadow-[0_0_10px_#00D1FF] group-hover:scale-125 transition-transform"
            />
            <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors tracking-tight">{p.text}</span>
            <span className="text-[10px] text-[#00D1FF] font-black uppercase tracking-tighter bg-[#00D1FF]/10 px-2 py-0.5 rounded-lg">
              {Math.round(p.weight * 100)}%
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div >
  )
}
