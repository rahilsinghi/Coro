import React, { useState } from 'react'
import { ROLES } from '../lib/constants'
import { useRoomStore } from '../store/roomStore'
import { useWebSocket } from '../hooks/useWebSocket'

const allRoles = Object.values(ROLES)

export default function RoleCard({ role }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { changeRole } = useWebSocket()
  const { userId, roomId, participants } = useRoomStore()

  if (!role) return null

  const takenRoles = new Set(
    (participants || []).filter((p) => p.user_id !== userId).map((p) => p.role)
  )

  const handleSwitch = (newRoleId) => {
    if (newRoleId === role.id || takenRoles.has(newRoleId)) return
    changeRole(userId, roomId, newRoleId)
    setPickerOpen(false)
  }

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

      {/* Switch Role button */}
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        className="mt-4 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white border border-white/10 hover:border-[#00D1FF]/40 rounded-full transition-all duration-200 hover:bg-white/5"
      >
        {pickerOpen ? 'Cancel' : 'Switch Role'}
      </button>

      {/* Role picker dropdown */}
      {pickerOpen && (
        <div className="mt-4 space-y-2">
          {allRoles.map((r) => {
            const isCurrent = r.id === role.id
            const isTaken = takenRoles.has(r.id)
            const disabled = isCurrent || isTaken
            return (
              <button
                key={r.id}
                onClick={() => handleSwitch(r.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-150 ${
                  disabled
                    ? 'bg-white/5 opacity-50 cursor-default'
                    : 'bg-white/[0.03] hover:bg-white/10 hover:border-[#00D1FF]/30 cursor-pointer'
                } border border-white/5`}
              >
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white uppercase tracking-wide">
                    {r.label}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-bold text-[#00D1FF]/60 bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    {isTaken && !isCurrent && (
                      <span className="ml-2 text-[10px] font-bold text-red-400/60 bg-red-400/10 px-2 py-0.5 rounded-full">
                        Taken
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/30 uppercase tracking-wider">{r.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Subtle scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-20" />
    </div>
  )
}
