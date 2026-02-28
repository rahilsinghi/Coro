import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useWebSocket } from '../hooks/useWebSocket'
import { useRoomStore } from '../store/roomStore'
import QuickActions from '../components/QuickActions'

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

  const [availableRooms, setAvailableRooms] = useState([])

  // Check if joining via QR link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid) setJoinCode(rid)
  }, [])

  // Auto-join when arriving via a ?room_id= link and WS is ready
  const autoJoinAttempted = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rid = params.get('room_id')
    if (rid && isConnected && !autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      const doAutoJoin = async () => {
        setLoading(true)
        try {
          const result = await joinRoom(rid.toUpperCase(), userId)
          if (result.error) {
            setError(result.error)
          } else {
            navigate('/guest')
          }
        } catch (e) {
          setError('Failed to auto-join room.')
        } finally {
          setLoading(false)
        }
      }
      doAutoJoin()
    }
  }, [isConnected, joinRoom, userId, navigate])

  // Fetch available rooms periodically
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const apiBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws').replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '')
        const res = await fetch(`${apiBase}/rooms`)
        const data = await res.json()
        setAvailableRooms(data.rooms || [])
      } catch (e) {
        // Silently fail — rooms card is optional
      }
    }
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  // Parse a friendly device name from user agent
  const getDeviceName = () => {
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) return 'iPhone'
    if (/iPad/.test(ua)) return 'iPad'
    if (/Android/.test(ua)) return 'Android'
    if (/Mac/.test(ua)) return 'Mac'
    if (/Windows/.test(ua)) return 'Windows'
    if (/Linux/.test(ua)) return 'Linux'
    return 'Device'
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await createRoom(userId, getDeviceName())
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

  const hasEnteredCoro = useRoomStore((s) => s.hasEnteredCoro)

  return (
    <div className="min-h-screen bg-cs-bg flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className={`w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col items-center transition-all duration-1000 ${hasEnteredCoro ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4 animate-bounce">🎵</div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">
            CORO<span className="text-cs-accent drop-shadow-[0_0_15px_rgba(0,195,255,0.5)]"></span>
          </h1>
          <p className="text-cs-muted text-xl max-w-2xl mx-auto leading-relaxed">
            CORO <em className="text-cs-text not-italic font-semibold border-b-2 border-cs-accent/30">is</em> the music.
            Everyone plays. No skills required.
          </p>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-2.5 text-sm mb-12 bg-cs-surface/50 px-4 py-2 rounded-full border border-cs-border">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-cs-muted font-medium">{isConnected ? 'Connected to Network' : 'Connecting to Network...'}</span>
        </div>

        {/* Main Panel */}
        <div className="w-full max-w-2xl bg-cs-surface/30 backdrop-blur-xl border border-cs-border p-8 md:p-12 rounded-3xl shadow-2xl space-y-8">
          {/* Create room */}
          <button
            onClick={handleCreate}
            disabled={!isConnected || loading}
            className="btn-primary w-full text-xl py-5 shadow-lg shadow-cs-accent/30 hover:shadow-cs-accent/50 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="group-hover:scale-110 transition-transform">🎤</span> Host a Global Room
              </span>
            )}
          </button>

          <div className="flex items-center gap-4 text-cs-muted text-sm px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cs-border to-transparent" />
            <span className="uppercase tracking-widest font-semibold opacity-60 text-xs">or join existing</span>
            <div className="flex-1 h-px bg-gradient-to-r from-cs-border via-cs-border to-transparent" />
          </div>

          {/* Join room */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ENTER ROOM CODE"
                maxLength={6}
                className="flex-1 bg-cs-bg/50 border border-cs-border rounded-2xl px-6 py-4 text-white placeholder-cs-muted/50 font-mono tracking-[0.2em] text-xl focus:outline-none focus:border-cs-accent focus:ring-1 focus:ring-cs-accent transition-all"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || !isConnected || loading}
                className="btn-secondary px-8 text-lg font-bold disabled:opacity-50 hover:bg-cs-surface"
              >
                JOIN
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm md:text-base font-medium flex items-center justify-center gap-2">
                <span className="w-1 h-1 bg-red-400 rounded-full animate-ping" />
                {error}
              </p>
            )}
          </div>

          {/* Available Rooms */}
          {availableRooms.length > 0 && (
            <div className="mt-2 pt-6 border-t border-cs-border">
              <p className="text-xs text-cs-muted font-medium uppercase tracking-wider mb-3">Live Rooms</p>
              <div className="space-y-2">
                {availableRooms.map((room) => (
                  <button
                    key={room.room_id}
                    onClick={async () => {
                      setLoading(true)
                      setError('')
                      try {
                        const result = await joinRoom(room.room_id, userId)
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
                    }}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-3 bg-cs-bg/50 border border-cs-border rounded-xl hover:border-cs-accent/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-cs-accent">{room.room_id}</span>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {room.member_count} player{room.member_count !== 1 ? 's' : ''}
                          {room.is_playing && <span className="ml-2 text-green-400 text-xs">● LIVE</span>}
                        </p>
                        <p className="text-xs text-cs-muted">{room.host_device}</p>
                      </div>
                    </div>
                    <span className="text-cs-muted group-hover:text-cs-accent transition-colors text-sm font-bold">JOIN →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Task B: Quick Actions */}
        <QuickActions />

        {/* Footer */}
        <p className="mt-20 mb-12 text-cs-muted text-sm font-medium tracking-wide flex items-center gap-3">
          <span className="w-8 h-px bg-cs-border" />
          Powered by Google Lyria + Gemini 2.5
          <span className="w-8 h-px bg-cs-border" />
        </p>
      </div>
    </div>
  )
}
