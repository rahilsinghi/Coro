import { useRef, useCallback, useEffect } from 'react'
import { useRoomStore } from '../store/roomStore'
import { useAudioPlayer } from './useAudioPlayer'
import { triggerTransition } from './audioPlayerInstance'

const getStoreState = () => useRoomStore.getState()

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
      case 'state_update': {
        // Detect significant music changes and trigger audio crossfade
        const prevBpm = getStoreState().bpm
        if (prevBpm && msg.bpm && Math.abs(msg.bpm - prevBpm) >= 5) {
          triggerTransition(250, 400, 80)
        }
        this.store?.applyStateUpdate(msg)
        break
      }
      case 'music_started':
        this.store?.setPlaying(true)
        break
      case 'music_stopped':
        this.store?.setPlaying(false)
        break
      case 'stream_error':
        console.error('[WS] Stream error:', msg.message)
        this.store?.setPlaying(false)
        break
      case 'stream_recovered':
        console.log('[WS] Stream recovered:', msg.message)
        triggerTransition(0, 800, 0) // Gentle fade in from silence
        this.store?.setPlaying(true)
        break
      case 'applause_level':
        this.store?.setApplauseLevel(msg.volume ?? 0)
        break
      case 'room_closed':
        console.log('[WS] Room closed by host:', msg.message)
        this.store?.clearRoom()
        break
      case 'drop_progress':
        this.store?.setDropProgress(msg.count)
        break
      case 'drop_incoming':
      case 'drop_triggered':
        this.store?.setDropProgress(0)
        // Audio crossfade for the drop — dramatic fade
        triggerTransition(400, 600, 150)
        // Trigger visual/haptic effects
        document.body.classList.add('drop-flash')
        navigator.vibrate?.([200, 100, 200])
        setTimeout(() => document.body.classList.remove('drop-flash'), 1000)
        // Also forwarded to per-component listeners via onMessageCallbacks
        break
      case 'drop_reset':
      case 'drop_already_voted':
        // Forwarded to per-component listeners via onMessageCallbacks
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
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Room creation timed out — check your connection'))
      }, 10000)

      const cleanup = manager.addListener((msg) => {
        if (msg.type === 'room_created') {
          clearTimeout(timeout)
          cleanup()
          store.setRoom(msg.room_id, userId, msg.role, true, msg.room_name || roomName)
          resolve(msg)
        }
      })
      send({ type: 'create_room', user_id: userId, device_name: deviceName, room_name: roomName, display_name: displayName })
    })
  }, [send, store])

  const joinRoom = useCallback((roomId, userId, { displayName = '' } = {}) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Join timed out — check your connection'))
      }, 10000)

      const cleanup = manager.addListener((msg) => {
        if (msg.type === 'joined') {
          clearTimeout(timeout)
          cleanup()
          store.setRoom(msg.room_id, msg.user_id, msg.role, false)
          resolve(msg)
        }
        if (msg.type === 'error') {
          clearTimeout(timeout)
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

  const closeRoom = useCallback((userId, roomId) => {
    send({ type: 'close_room', user_id: userId, room_id: roomId })
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

  const updateDisplayName = useCallback((userId, roomId, displayName) => {
    send({ type: 'update_display_name', user_id: userId, room_id: roomId, display_name: displayName })
  }, [send])

  const addListener = useCallback((cb) => manager.addListener(cb), [])

  return { send, createRoom, joinRoom, startMusic, stopMusic, closeRoom, sendInput, leaveRoom, endStream, updateDisplayName, addListener }
}
