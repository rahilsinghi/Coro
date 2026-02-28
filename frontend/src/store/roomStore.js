import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// Rehydrate room session from sessionStorage on load
const savedRoom = JSON.parse(sessionStorage.getItem('cs_room') || 'null')

// Ensure a stable userId exists — shared between store + Home.jsx
function getOrCreateUserId() {
  const fromRoom = savedRoom?.userId
  const fromStorage = localStorage.getItem('cs_user_id')
  if (fromRoom) return fromRoom
  if (fromStorage) return fromStorage
  const id = uuidv4()
  localStorage.setItem('cs_user_id', id)
  return id
}

export const useRoomStore = create((set) => ({
  // Connection
  roomId: savedRoom?.roomId || null,
  roomName: savedRoom?.roomName || '',
  userId: getOrCreateUserId(),
  role: savedRoom?.role || null,
  isHost: savedRoom?.isHost || false,
  isConnected: false,
  isPlaying: false,
  isAuthed: localStorage.getItem('isAuthed') === 'true',
  displayName: localStorage.getItem('cs_display_name') || '',
  hasEnteredCoro: sessionStorage.getItem('hasEnteredCoro') === 'true',

  setAuthed: (val, name) => {
    localStorage.setItem('isAuthed', val)
    if (name !== undefined) {
      localStorage.setItem('cs_display_name', name || '')
      set({ isAuthed: val, displayName: name || '' })
    } else {
      set({ isAuthed: val })
    }
  },

  // Music state (from server state_update)
  activePrompts: [],
  bpm: 100,
  density: 0.5,
  brightness: 0.5,
  currentInputs: {},
  influenceWeights: {},
  geminiReasoning: '',
  participants: [],
  timeline: [],
  applauseLevel: 0,
  dropProgress: 0,

  setEnteredCoro: (val) => {
    sessionStorage.setItem('hasEnteredCoro', val)
    set({ hasEnteredCoro: val })
  },
  setRoom: (roomId, userId, role, isHost, roomName) => {
    sessionStorage.setItem('cs_room', JSON.stringify({ roomId, userId, role, isHost, roomName: roomName || '' }))
    set({ roomId, userId, role, isHost, roomName: roomName || '' })
  },

  setConnected: (val) => set({ isConnected: val }),
  setPlaying: (val) => set({ isPlaying: val }),
  setApplauseLevel: (val) => set({ applauseLevel: val }),
  setDropProgress: (val) => set({ dropProgress: val }),
  setTimeline: (val) => set({ timeline: val }),

  applyStateUpdate: (msg) =>
    set((state) => ({
      activePrompts: msg.active_prompts || [],
      bpm: msg.bpm || 100,
      density: msg.density || 0.5,
      brightness: msg.brightness || 0.5,
      currentInputs: msg.current_inputs || {},
      influenceWeights: msg.influence_weights || {},
      geminiReasoning: msg.gemini_reasoning || '',
      participants: msg.participants || [],
      timeline: msg.timeline || [],
      roomName: msg.room_name || '',
      applauseLevel: msg.applause_level || 0,
      // Sync isPlaying from server — fixes stale state after reconnect
      ...(msg.is_playing !== undefined ? { isPlaying: msg.is_playing } : {}),
    })),

  reset: () => {
    sessionStorage.removeItem('cs_room')
    set({
      roomId: null,
      roomName: '',
      userId: null,
      role: null,
      isHost: false,
      isConnected: false,
      isPlaying: false,
      activePrompts: [],
      bpm: 100,
      currentInputs: {},
      influenceWeights: {},
      participants: [],
      timeline: [],
      applauseLevel: 0,
      dropProgress: 0,
    })
  },
  clearRoom: () => {
    sessionStorage.removeItem('cs_room')
    set({
      roomId: null,
      roomName: '',
      role: null,
      isHost: false,
      isPlaying: false,
      activePrompts: [],
      bpm: 100,
      density: 0.5,
      brightness: 0.5,
      currentInputs: {},
      influenceWeights: {},
      geminiReasoning: '',
      participants: [],
      timeline: [],
      applauseLevel: 0,
      dropProgress: 0,
    })
  },
}))
