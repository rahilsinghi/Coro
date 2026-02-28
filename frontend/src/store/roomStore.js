import { create } from 'zustand'

// Rehydrate room session from sessionStorage on load
const savedRoom = JSON.parse(sessionStorage.getItem('cs_room') || 'null')

export const useRoomStore = create((set) => ({
  // Connection
  roomId: savedRoom?.roomId || null,
  userId: savedRoom?.userId || null,
  role: savedRoom?.role || null,
  isHost: savedRoom?.isHost || false,
  isConnected: false,
  isPlaying: false,
  isAuthed: sessionStorage.getItem('isAuthed') === 'true',
  hasEnteredCoro: sessionStorage.getItem('hasEnteredCoro') === 'true',

  setAuthed: (val) => {
    sessionStorage.setItem('isAuthed', val)
    set({ isAuthed: val })
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

  setEnteredCoro: (val) => {
    sessionStorage.setItem('hasEnteredCoro', val)
    set({ hasEnteredCoro: val })
  },
  setRoom: (roomId, userId, role, isHost) => {
    sessionStorage.setItem('cs_room', JSON.stringify({ roomId, userId, role, isHost }))
    set({ roomId, userId, role, isHost })
  },

  setConnected: (val) => set({ isConnected: val }),
  setPlaying: (val) => set({ isPlaying: val }),

  applyStateUpdate: (msg) =>
    set({
      activePrompts: msg.active_prompts || [],
      bpm: msg.bpm || 100,
      density: msg.density || 0.5,
      brightness: msg.brightness || 0.5,
      currentInputs: msg.current_inputs || {},
      influenceWeights: msg.influence_weights || {},
      geminiReasoning: msg.gemini_reasoning || '',
      participants: msg.participants || [],
    }),

  reset: () => {
    sessionStorage.removeItem('cs_room')
    set({
      roomId: null,
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
    })
  },
}))
