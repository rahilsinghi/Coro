import { useRef, useCallback, useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from './useAudioPlayer'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

/**
 * Singleton WebSocket Manager
 * Prevents "WebSocket Connection Storm" where every component creates its own connection.
 */
class WebSocketManager {
  constructor() {
    this.ws = null
    this.reconnectTimer = null
    this.store = null
    this.enqueueAudio = null
    this.onMessageCallbacks = new Set()
  }

  init(store, enqueueAudio) {
    this.store = store
    this.enqueueAudio = enqueueAudio
    this.connect()
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return

    console.log('[WS] Initializing Singleton Connection...')
    const ws = new WebSocket(WS_URL)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = () => {
      console.log('[WS] Connected')
      this.store?.setConnected(true)

      // Auto-rejoin room if we have a persisted session (e.g. page refresh)
      const saved = JSON.parse(sessionStorage.getItem('cs_room') || 'null')
      if (saved?.roomId && saved?.userId) {
        const displayName = localStorage.getItem('cs_display_name') || ''
        console.log('[WS] Rejoining room', saved.roomId, 'as', saved.userId, displayName)
        this.send({ type: 'join_room', room_id: saved.roomId, user_id: saved.userId, display_name: displayName })
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 2s...')
      this.store?.setConnected(false)
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
      this.reconnectTimer = setTimeout(() => this.connect(), 2000)
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.enqueueAudio?.(event.data)
        return
      }

      try {
        const msg = JSON.parse(event.data)
        this.handleMessage(msg)
        // Notify any active listeners (like createRoom/joinRoom promises)
        this.onMessageCallbacks.forEach(cb => cb(msg))
      } catch (e) {
        console.warn('[WS] Could not parse message:', event.data)
      }
    }
  }

  handleMessage(msg) {
    if (msg.type !== 'ping') {
      console.log('[WS] ←', msg.type, msg)
    }

    switch (msg.type) {
      case 'state_update':
        this.store?.applyStateUpdate(msg)
        break
      case 'music_started':
        this.store?.setPlaying(true)
        break
      case 'music_stopped':
        this.store?.setPlaying(false)
        break
      case 'applause_level':
        this.store?.setApplauseLevel(msg.volume ?? 0)
        break
      case 'drop_progress':
        this.store?.setDropProgress(msg.count)
        break
      case 'drop_triggered':
        this.store?.setDropProgress(0)
        // Trigger visual/haptic effects
        document.body.classList.add('drop-flash')
        navigator.vibrate?.([200, 100, 200])
        setTimeout(() => document.body.classList.remove('drop-flash'), 1000)
        break
      case 'room_ended':
        this.store?.clearRoom()
        window.location.href = '/studio'
        break
      case 'error':
        console.error('[WS] Server error:', msg.message)
        break
      default:
        break
    }
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[WS] Cannot send — not connected')
    }
  }

  addListener(callback) {
    this.onMessageCallbacks.add(callback)
    return () => this.onMessageCallbacks.delete(callback)
  }
}

const manager = new WebSocketManager()

export function useWebSocket() {
  const { enqueueAudio } = useAudioPlayer()
  const store = useRoomStore()

  // Initialize singleton on first hook call
  useEffect(() => {
    manager.init(store, enqueueAudio)
  }, [store, enqueueAudio])

  const send = useCallback((message) => manager.send(message), [])

  const createRoom = useCallback((userId, deviceName = 'Unknown', { roomName = '', displayName = '' } = {}) => {
    return new Promise((resolve) => {
      const cleanup = manager.addListener((msg) => {
        if (msg.type === 'room_created') {
          cleanup()
          store.setRoom(msg.room_id, userId, msg.role, true, msg.room_name || roomName)
          resolve(msg)
        }
      })
      send({ type: 'create_room', user_id: userId, device_name: deviceName, room_name: roomName, display_name: displayName })
    })
  }, [send, store])

  const joinRoom = useCallback((roomId, userId, { displayName = '' } = {}) => {
    return new Promise((resolve) => {
      const cleanup = manager.addListener((msg) => {
        if (msg.type === 'joined') {
          cleanup()
          store.setRoom(msg.room_id, msg.user_id, msg.role, false)
          resolve(msg)
        }
        if (msg.type === 'error') {
          cleanup()
          resolve({ error: msg.message })
        }
      })
      send({ type: 'join_room', room_id: roomId.toUpperCase(), user_id: userId, display_name: displayName })
    })
  }, [send, store])

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

  const leaveRoom = useCallback((userId, roomId) => {
    send({ type: 'leave_room', user_id: userId, room_id: roomId })
    store.clearRoom()
  }, [send, store])

  const endStream = useCallback((userId, roomId) => {
    send({ type: 'end_stream', user_id: userId, room_id: roomId })
    store.clearRoom()
  }, [send, store])

  return { send, createRoom, joinRoom, startMusic, stopMusic, sendInput, leaveRoom, endStream, addListener: (cb) => manager.addListener(cb) }
}
