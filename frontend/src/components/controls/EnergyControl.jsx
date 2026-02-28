import React, { useState, useCallback, useRef } from 'react'
import { useRoomStore } from '../../store/roomStore'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function EnergyControl() {
    const [density, setDensity] = useState(0.5)
    const [brightness, setBrightness] = useState(0.5)
    const { userId, roomId } = useRoomStore()
    const { sendInput } = useWebSocket()
    const debounceRef = useRef(null)

    const send = (d, b) => {
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            sendInput(userId, roomId, 'energy', { density: d, brightness: b })
        }, 300)
    }

    return (
        <div className="card space-y-6">
            <p className="text-sm font-medium text-cs-muted uppercase tracking-wider">
                Energy Control
            </p>

            {/* Density */}
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-cs-muted">Density</span>
                    <span className="text-green-400 font-mono">{Math.round(density * 100)}%</span>
                </div>
                <input
                    type="range" min={0} max={1} step={0.01} value={density}
                    onChange={(e) => { const v = Number(e.target.value); setDensity(v); send(v, brightness) }}
                    className="w-full h-3 rounded-full accent-green-400 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-cs-muted mt-1">
                    <span>Sparse</span><span>Dense</span>
                </div>
            </div>

            {/* Brightness */}
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm text-cs-muted">Brightness</span>
                    <span className="text-green-400 font-mono">{Math.round(brightness * 100)}%</span>
                </div>
                <input
                    type="range" min={0} max={1} step={0.01} value={brightness}
                    onChange={(e) => { const v = Number(e.target.value); setBrightness(v); send(density, v) }}
                    className="w-full h-3 rounded-full accent-green-400 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-cs-muted mt-1">
                    <span>Dark</span><span>Bright</span>
                </div>
            </div>
        </div>
    )
}
