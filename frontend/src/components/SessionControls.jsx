import React, { useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useRoomStore } from '../store/roomStore'

export default function SessionControls() {
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { createRoom, joinRoom } = useWebSocket()
    const { isConnected, userId } = useRoomStore()

    const getDeviceName = () => {
        const ua = navigator.userAgent
        if (/iPhone/.test(ua)) return 'iPhone'
        if (/iPad/.test(ua)) return 'iPad'
        if (/Android/.test(ua)) return 'Android'
        if (/Mac/.test(ua)) return 'Mac'
        if (/Windows/.test(ua)) return 'Windows'
        return 'Web Device'
    }

    const handleCreate = async () => {
        setLoading(true)
        setError('')
        try {
            await createRoom(userId, getDeviceName())
        } catch (e) {
            setError('Failed to create room.')
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async () => {
        if (!joinCode.trim()) return
        setLoading(true)
        setError('')
        try {
            const result = await joinRoom(joinCode.trim().toUpperCase(), userId)
            if (result.error) setError(result.error)
        } catch (e) {
            setError('Failed to join room.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="w-full glass-card p-6 mb-8"
            style={{
                background: 'rgba(0,12,30,0.65)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(0,209,255,0.14)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
        >
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6">
                {/* Host Section */}
                <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-[#00D1FF]/60 uppercase tracking-[0.4em]">Initialize Session</p>
                    <button
                        onClick={handleCreate}
                        disabled={!isConnected || loading}
                        className="btn-primary w-full py-4 text-sm uppercase tracking-widest"
                    >
                        {loading ? 'Initializing...' : 'Host New Session'}
                    </button>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-16 bg-white/10" />
                <div className="md:hidden h-px w-full bg-white/10" />

                {/* Join Section */}
                <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-[#00D1FF]/60 uppercase tracking-[0.4em]">Join Existing</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            placeholder="ROOM ID"
                            maxLength={6}
                            className="neon-input flex-1 py-4 font-mono tracking-widest text-center uppercase text-sm"
                        />
                        <button
                            onClick={handleJoin}
                            disabled={!joinCode.trim() || !isConnected || loading}
                            className="btn-secondary px-6 font-black uppercase tracking-widest text-xs"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                    ⚠️ {error}
                </div>
            )}
        </div>
    )
}
