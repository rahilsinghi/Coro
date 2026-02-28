import React, { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

/**
 * Shared drop-vote button used by both Guest and Host pages.
 *
 * Behaviour:
 *  - One vote per user per 5-second window (enforced server-side too)
 *  - After clicking: button locks and shows a countdown
 *  - Unlocks on drop_triggered, drop_reset, or when the local countdown hits 0
 *  - Shows live vote progress (e.g. 2/3)
 */
export default function DropButton({ userId, roomId }) {
    const { send, addListener } = useWebSocket()

    const [hasVoted, setHasVoted] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const [dropProgress, setDropProgress] = useState(0)
    const [showShock, setShowShock] = useState(false)
    const countdownRef = useRef(null)

    const resetState = () => {
        clearInterval(countdownRef.current)
        setHasVoted(false)
        setCountdown(0)
        setDropProgress(0)
    }

    // Listen for server-driven state changes
    useEffect(() => {
        const cleanup = addListener((msg) => {
            if (msg.type === 'drop_progress') {
                setDropProgress(msg.count ?? 0)
            }
            if (msg.type === 'drop_triggered') {
                document.body.classList.add('drop-flash')
                navigator.vibrate?.([200, 100, 200])
                setTimeout(() => document.body.classList.remove('drop-flash'), 1000)
                resetState()
            }
            if (msg.type === 'drop_reset') {
                resetState()
            }
            // Server-side double-click guard — keep button locked
            if (msg.type === 'drop_already_voted') {
                setHasVoted(true)
            }
        })
        return cleanup
    }, [addListener])

    // Cleanup interval on unmount
    useEffect(() => () => clearInterval(countdownRef.current), [])

    const handleDrop = () => {
        if (hasVoted) return

        send({ type: 'drop', user_id: userId, room_id: roomId })
        navigator.vibrate?.(100)

        setShowShock(true)
        setTimeout(() => setShowShock(false), 700)
        setHasVoted(true)

        // Local 5-second countdown as fallback unlock
        let remaining = 5
        setCountdown(remaining)
        countdownRef.current = setInterval(() => {
            remaining -= 1
            setCountdown(remaining)
            if (remaining <= 0) {
                clearInterval(countdownRef.current)
                setHasVoted(false)
            }
        }, 1000)
    }

    return (
        <div className="relative mt-2">
            {/* Shockwave ring on click */}
            {showShock && (
                <div
                    className="shockwave absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)' }}
                />
            )}

            <button
                onClick={handleDrop}
                disabled={hasVoted}
                className="w-full py-6 rounded-2xl text-white text-2xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed"
                style={hasVoted ? {
                    background: 'linear-gradient(135deg, #3b0a0a 0%, #451a03 100%)',
                    boxShadow: 'none',
                    opacity: 0.65,
                } : {
                    background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
                    boxShadow: '0 0 30px rgba(239,68,68,0.50)',
                }}
                onMouseEnter={e => !hasVoted && (e.currentTarget.style.boxShadow = '0 0 52px rgba(239,68,68,0.75)')}
                onMouseLeave={e => !hasVoted && (e.currentTarget.style.boxShadow = '0 0 30px rgba(239,68,68,0.50)')}
            >
                {hasVoted ? (
                    <span className="flex items-center justify-center gap-3">
                        <span>VOTED</span>
                        {countdown > 0 && (
                            <span className="text-base opacity-60">({countdown}s)</span>
                        )}
                    </span>
                ) : 'DROP'}
            </button>

            {/* Vote progress bar */}
            {dropProgress > 0 && (
                <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-400/80 px-0.5">
                        <span>Votes</span>
                        <span>{dropProgress} / 3</span>
                    </div>
                    <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${(dropProgress / 3) * 100}%`,
                                background: 'linear-gradient(to right, #f97316, #ef4444)',
                                boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
