import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ROLES, ROLE_COLORS } from '../lib/constants.js'

export default function InfluenceMeter({ weights }) {
  const data = Object.entries(weights || {}).map(([role, weight]) => ({
    name: ROLES[role]?.label || role,
    value: Math.round(weight * 100),
    role,
  }))

  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center">
        <p className="text-cs-muted text-sm">Waiting for participants...</p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={65}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.role} fill={ROLE_COLORS[entry.role] || '#7c3aed'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 8 }}
            formatter={(v) => [`${v}%`, 'Influence']}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.role} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: ROLE_COLORS[d.role] }}
              />
              <span className="text-cs-muted">{d.name}</span>
            </div>
            <span className="text-white font-mono">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
