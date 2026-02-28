import React from 'react'

export default function RoleCard({ role }) {
  if (!role) return null
  return (
    <div className={`glass-card p-10 text-center relative overflow-hidden group border-[#00D1FF]/20`}>
      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00D1FF]/40 to-transparent" />

      {/* Role icon in corner */}
      <div className="absolute top-6 right-6 text-2xl opacity-80 z-10 filter drop-shadow-[0_0_8px_rgba(0,209,255,0.4)]">
        {role.emoji}
      </div>

      <h2 className={`text-3xl font-black text-white mb-2 tracking-tighter uppercase`}>
        {role.label}
      </h2>

      <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">
        {role.description}
      </p>

      {/* Subtle scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-20" />
    </div>
  )
}
