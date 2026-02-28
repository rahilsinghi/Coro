import React, { useState, useEffect, useRef } from 'react'
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
      await createRoom(userId, getDeviceName())
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
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 pt-32 transition-all duration-1000 pointer-events-auto ${hasEnteredCoro ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black justify-center
                ${error.toLowerCase().includes('full')
                  ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400'
                  : 'bg-red-400/10 border border-red-400/20 text-red-400 animate-pulse'
                }`}
              >
                {error.toLowerCase().includes('full') ? '🚫' : '⚠️'} {error}
              </div>
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

        <p className="mt-16 text-white/20 text-[10px] uppercase tracking-[0.4em] font-black">
          Powered by Gemini 2.5 + Google Lyria
        </p>
      </div>
    </div>
  )
}
