import React from 'react'

export default function RoleCard({ role }) {
  if (!role) return null
  return (
    <div className={`card border-2 ${role.borderColor} ${role.bgColor} text-center py-8`}>
      <div className="text-5xl mb-3">{role.emoji}</div>
      <h2 className={`text-2xl font-bold ${role.color} mb-1`}>{role.label}</h2>
      <p className="text-cs-muted text-sm">{role.description}</p>
    </div>
  )
}
