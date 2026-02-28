import React from 'react'

export default function ActivePrompts({ prompts = [] }) {
  if (!prompts.length) return <p className="text-cs-muted text-sm">No active prompts yet.</p>

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-cs-bg border border-cs-border rounded-full px-3 py-1.5"
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-cs-accent"
            style={{ opacity: 0.4 + p.weight * 0.6 }}
          />
          <span className="text-sm text-cs-text">{p.text}</span>
          <span className="text-xs text-cs-muted font-mono">{Math.round(p.weight * 100)}%</span>
        </div>
      ))}
    </div>
  )
}
