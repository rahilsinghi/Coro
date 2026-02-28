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
      const result = await createRoom(userId)
      navigate('/host')
    } catch (e) {
      setError('Failed to create room. Check your connection.')
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-5xl font-extrabold text-white mb-3">
          Co<span className="text-cs-accent">ro</span>
        </h1>
        <p className="text-cs-muted text-lg max-w-sm mx-auto">
          The crowd <em className="text-cs-text not-italic font-semibold">is</em> the music.
          Everyone plays. No skills required.
        </p>
      </div>

      {/* Connection indicator */}
      <div className="flex items-center gap-2 text-sm mb-10">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="text-cs-muted">{isConnected ? 'Connected' : 'Connecting...'}</span>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-4">
        {/* Create room */}
        <button
          onClick={handleCreate}
          disabled={!isConnected || loading}
          className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : '🎤 Host a Room'}
        </button>

        <div className="flex items-center gap-3 text-cs-muted text-sm">
          <div className="flex-1 h-px bg-cs-border" />
          or join with a code
          <div className="flex-1 h-px bg-cs-border" />
        </div>

        {/* Join room */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Room code (e.g. ABC123)"
            maxLength={6}
            className="flex-1 bg-cs-surface border border-cs-border rounded-xl px-4 py-3 text-white placeholder-cs-muted font-mono tracking-widest text-lg focus:outline-none focus:border-cs-accent"
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim() || !isConnected || loading}
            className="btn-secondary disabled:opacity-50"
          >
            Join
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Footer */}
      <p className="mt-16 text-cs-muted text-xs text-center">
        Powered by Google Lyria RealTime + Gemini 2.5 Flash
      </p>
    </div>
  )
}
