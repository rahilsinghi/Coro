import React, { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

/**
 * Shared drop-vote button used by both Guest and Host pages.
 *
 * Vote flow:
 *  1. Click → button locks, sends vote to server
 *  2. Server broadcasts drop_progress (count/3) to all clients
 *  3. On 3rd vote, server broadcasts drop_incoming {in_seconds} then waits,
 *     fires Lyria update, then broadcasts drop_triggered
 *  4. Frontend counts down from in_seconds (value comes from server, not hardcoded)
 *  5. drop_triggered → flash + reset
 *  6. drop_reset (5s expiry) → unlock buttons, try again
 */
export default function DropButton({ userId, roomId }) {
    const { send, addListener } = useWebSocket()

    // Per-user button lock state
    const [hasVoted, setHasVoted] = useState(false)
    const [voteCountdown, setVoteCountdown] = useState(0)     // 5s lock countdown
    const voteCountdownRef = useRef(null)

    // Shared room-wide vote progress
    const [dropProgress, setDropProgress] = useState(0)
    const [neededVotes, setNeededVotes] = useState(3)   // dynamic — set from server messages

    // Incoming drop countdown (server-sourced via drop_incoming.in_seconds)
    const [dropIncoming, setDropIncoming] = useState(false)
    const [dropIncomingSeconds, setDropIncomingSeconds] = useState(0)
    const dropIncomingRef = useRef(null)

    // Shockwave flash on click
    const [showShock, setShowShock] = useState(false)

    const resetState = () => {
        clearInterval(voteCountdownRef.current)
        clearInterval(dropIncomingRef.current)
        setHasVoted(false)
        setVoteCountdown(0)
        setDropProgress(0)
        setDropIncoming(false)
        setDropIncomingSeconds(0)
    }

    useEffect(() => {
        const cleanup = addListener((msg) => {
            if (msg.type === 'drop_progress') {
                setDropProgress(msg.count ?? 0)
                if (msg.needed) setNeededVotes(msg.needed)
            }

            if (msg.type === 'drop_incoming') {
                // All votes confirmed — show X/X, start countdown from server value
                setDropProgress(msg.needed ?? msg.count ?? neededVotes)
                if (msg.needed) setNeededVotes(msg.needed)
                setDropIncoming(true)
                let sec = msg.in_seconds ?? 3
                setDropIncomingSeconds(sec)
                clearInterval(dropIncomingRef.current)
                dropIncomingRef.current = setInterval(() => {
                    sec -= 1
                    setDropIncomingSeconds(sec)
                    if (sec <= 0) clearInterval(dropIncomingRef.current)
                }, 1000)
            }

            if (msg.type === 'drop_triggered') {
                document.body.classList.add('drop-flash')
                navigator.vibrate?.([200, 100, 200])
                setTimeout(() => document.body.classList.remove('drop-flash'), 1000)
                resetState()
            }

            if (msg.type === 'drop_reset') {
                if (msg.needed) setNeededVotes(msg.needed)
                resetState()
            }

            // Server-side duplicate guard
            if (msg.type === 'drop_already_voted') {
                if (msg.needed) setNeededVotes(msg.needed)
                setHasVoted(true)
            }
        })
        return cleanup
    }, [addListener])

    // Cleanup intervals on unmount
    useEffect(() => () => {
        clearInterval(voteCountdownRef.current)
        clearInterval(dropIncomingRef.current)
    }, [])

    const handleDrop = () => {
        if (hasVoted || dropIncoming) return

        send({ type: 'drop', user_id: userId, room_id: roomId })
        navigator.vibrate?.(100)

        setShowShock(true)
        setTimeout(() => setShowShock(false), 700)
        setHasVoted(true)

        // Local 5-second fallback unlock (in case server messages are lost)
        let remaining = 5
        setVoteCountdown(remaining)
        voteCountdownRef.current = setInterval(() => {
            remaining -= 1
            setVoteCountdown(remaining)
            if (remaining <= 0) {
                clearInterval(voteCountdownRef.current)
                setHasVoted(false)
            }
        }, 1000)
    }

    // ── Derived display state ──────────────────────────────────────────────

    const isLocked = hasVoted || dropIncoming

    const buttonLabel = dropIncoming
        ? '🔥 DROP'
        : hasVoted
            ? (
                <span className="flex items-center justify-center gap-3">
                    <span>VOTED</span>
                    {voteCountdown > 0 && <span className="text-base opacity-60">({voteCountdown}s)</span>}
                </span>
            )
            : 'DROP'

    const buttonStyle = dropIncoming
        ? {
            background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
            boxShadow: '0 0 52px rgba(239,68,68,0.90)',
            animation: 'pulse 0.6s infinite',
        }
        : hasVoted
            ? { background: 'linear-gradient(135deg, #3b0a0a 0%, #451a03 100%)', boxShadow: 'none', opacity: 0.65 }
            : { background: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)', boxShadow: '0 0 30px rgba(239,68,68,0.50)' }

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
                disabled={isLocked}
                className="w-full py-6 rounded-2xl text-white text-2xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed"
                style={buttonStyle}
                onMouseEnter={e => !isLocked && (e.currentTarget.style.boxShadow = '0 0 52px rgba(239,68,68,0.75)')}
                onMouseLeave={e => !isLocked && (e.currentTarget.style.boxShadow = '0 0 30px rgba(239,68,68,0.50)')}
            >
                {buttonLabel}
            </button>

            {/* Vote progress bar — shown during voting AND during countdown (X/X) */}
            {dropProgress > 0 && (
                <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-orange-400/80 px-0.5">
                        <span>Votes</span>
                        <span>{dropProgress} / {neededVotes}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${Math.min((dropProgress / neededVotes) * 100, 100)}%`,
                                background: 'linear-gradient(to right, #f97316, #ef4444)',
                                boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Incoming drop countdown — seconds value sourced from server */}
            {dropIncoming && (
                <div className="mt-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-400/80 mb-1">
                        Drop Incoming
                    </p>
                    <div
                        className="text-5xl font-black tabular-nums"
                        style={{
                            color: '#ef4444',
                            textShadow: '0 0 30px rgba(239,68,68,0.9)',
                            animation: 'pulse 0.5s infinite',
                        }}
                    >
                        {dropIncomingSeconds > 0 ? dropIncomingSeconds : '🔥'}
                    </div>
                </div>
            )}
        </div>
    )
}
