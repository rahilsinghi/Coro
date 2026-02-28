import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useWebSocket } from '../hooks/useWebSocket'
import { useRoomStore } from '../store/roomStore'

export default function Home() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId] = useState(() => localStorage.getItem('cs_user_id') || (() => {
    const id = uuidv4()
    localStorage.setItem('cs_user_id', id)
    return id
  })())

  const { createRoom, joinRoom } = useWebSocket()
  const isConnected = useRoomStore((s) => s.isConnected)
  const hasEnteredCoro = useRoomStore((s) => s.hasEnteredCoro)

  // Check if joining via QR link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid) setJoinCode(rid)
  }, [])

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await createRoom(userId)
      navigate('/host')
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
      if (result.error) {
        setError(result.error)
      } else {
        navigate('/guest')
      }
    } catch (e) {
      setError('Failed to join room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-1000 ${hasEnteredCoro ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Connection Indicator */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2 rounded-full mb-12 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00D1FF] shadow-[0_0_10px_#00D1FF]' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-black">
            {isConnected ? 'Studio Network Online' : 'Connecting to Network...'}
          </span>
        </div>

        {/* Dashboard Card */}
        <div className="w-full max-w-xl glass-card p-10 md:p-14 space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Coro <span className="text-[#00D1FF]">Studio</span>
            </h1>
            <p className="text-white/50 font-medium">Create a new session or join an existing session.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleCreate}
              disabled={!isConnected || loading}
              className="btn-primary w-full text-lg py-5 group"
            >
              {loading ? 'Initializing...' : 'Host New Session'}
            </button>

            <div className="flex items-center gap-4 text-white/10">
              <div className="flex-1 h-px bg-current" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-black">OR join by code</span>
              <div className="flex-1 h-px bg-current" />
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="EX: ABCDEF"
                maxLength={6}
                className="neon-input flex-1 font-mono tracking-widest text-center uppercase"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || !isConnected || loading}
                className="btn-secondary px-8 font-black"
              >
                Join
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-black text-center animate-pulse">{error}</p>
            )}
          </div>
        </div>

        <p className="mt-16 text-white/20 text-[10px] uppercase tracking-[0.4em] font-black">
          Powered by Gemini 2.5 + Google Lyria
        </p>
      </div>
    </div>
  )
}
