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
            className="flex items-center gap-2.5 bg-cs-bg/10 backdrop-blur-md border border-cs-border rounded-full px-4 py-2 hover:border-cs-accent transition-colors"
          >
            <div
              className="w-2 h-2 rounded-full bg-cs-accent shadow-[0_0_8px_#00c3ff]"
            />
            <span className="text-sm font-medium text-cs-text">{p.text}</span>
            <span className="text-[10px] text-cs-muted font-mono uppercase tracking-tighter bg-cs-border/30 px-1.5 py-0.5 rounded">
              {Math.round(p.weight * 100)}%
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
