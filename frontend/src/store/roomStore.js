import { create } from 'zustand'

export const useRoomStore = create((set) => ({
  // Connection
  roomId: null,
  userId: null,
  role: null,
  isHost: false,
  isConnected: false,
  isPlaying: false,
  hasEnteredCoro: sessionStorage.getItem('hasEnteredCoro') === 'true',

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
  setRoom: (roomId, userId, role, isHost) =>
    set({ roomId, userId, role, isHost }),

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

  reset: () =>
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
    }),
}))
