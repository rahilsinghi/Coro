import { useRef, useCallback, useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from './useAudioPlayer'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const { enqueueAudio } = useAudioPlayer()

  const {
    setConnected,
    setPlaying,
    applyStateUpdate,
    setRoom,
  } = useRoomStore()

  // --- handleMessage (keep existing logic) ---
  const handleMessage = useCallback((msg) => {
    console.log('[WS] ←', msg.type, msg)
    switch (msg.type) {
      case 'room_created':
      case 'joined':
        // Handled inline in pages — don't store here
        break
      case 'state_update':
        applyStateUpdate(msg)
        break
      case 'music_started':
        setPlaying(true)
        break
      case 'music_stopped':
        setPlaying(false)
        break
      case 'ping':
        // Heartbeat from server — ignore
        break
      case 'error':
        console.error('[WS] Server error:', msg.message)
        break
      default:
        break
    }
  }, [applyStateUpdate, setPlaying])

  // --- Refs for callbacks so connect() stays stable ---
  const handleMessageRef = useRef(handleMessage)
  useEffect(() => { handleMessageRef.current = handleMessage }, [handleMessage])

  const enqueueAudioRef = useRef(enqueueAudio)
  useEffect(() => { enqueueAudioRef.current = enqueueAudio }, [enqueueAudio])

  // --- connect: stable (empty deps), uses refs for callbacks ---
  const connect = useCallback(() => {
    // Guard: don't open if already open or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return

    const ws = new WebSocket(WS_URL)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
      setConnected(true)
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 2s...')
      setConnected(false)
      reconnectTimerRef.current = setTimeout(connect, 2000)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        enqueueAudioRef.current(event.data)
        return
      }
      try {
        const msg = JSON.parse(event.data)
        handleMessageRef.current(msg)
      } catch (e) {
        console.warn('[WS] Could not parse message:', event.data)
      }
    }
  }, [])  // Empty deps — stable reference

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WS] Cannot send — not connected')
    }
  }, [])

  // Actions
  const createRoom = useCallback((userId) => {
    return new Promise((resolve) => {
      const ws = wsRef.current
      if (!ws) return

      const handler = (event) => {
        if (event.data instanceof ArrayBuffer) return
        const msg = JSON.parse(event.data)
        if (msg.type === 'room_created') {
          ws.removeEventListener('message', handler)
          setRoom(msg.room_id, userId, msg.role, true)
          resolve(msg)
        }
      }
      ws.addEventListener('message', handler)
      send({ type: 'create_room', user_id: userId })
    })
  }, [send, setRoom])

  const joinRoom = useCallback((roomId, userId) => {
    return new Promise((resolve) => {
      const ws = wsRef.current
      if (!ws) return

      const handler = (event) => {
        if (event.data instanceof ArrayBuffer) return
        const msg = JSON.parse(event.data)
        if (msg.type === 'joined') {
          ws.removeEventListener('message', handler)
          setRoom(msg.room_id, msg.user_id, msg.role, false)
          resolve(msg)
        }
        if (msg.type === 'error') {
          ws.removeEventListener('message', handler)
          resolve({ error: msg.message })
        }
      }
      ws.addEventListener('message', handler)
      send({ type: 'join_room', room_id: roomId.toUpperCase(), user_id: userId })
    })
  }, [send, setRoom])

  const startMusic = useCallback((userId, roomId) => {
    send({ type: 'start_music', user_id: userId, room_id: roomId })
  }, [send])

  const stopMusic = useCallback((userId, roomId) => {
    send({ type: 'stop_music', user_id: userId, room_id: roomId })
  }, [send])

  const sendInput = useCallback((userId, roomId, role, payload) => {
    send({
      type: 'input_update',
      user_id: userId,
      room_id: roomId,
      role,
      payload,
    })
  }, [send])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { send, createRoom, joinRoom, startMusic, stopMusic, sendInput }
}
