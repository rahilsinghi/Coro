import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Host from './pages/Host.jsx'
import Guest from './pages/Guest.jsx'
import GlobeExperience from './components/GlobeExperience.jsx'
import Navbar from './components/Navbar.jsx'
import { useAudioPlayer } from './hooks/useAudioPlayer'

export default function App() {
  const { getAnalyser } = useAudioPlayer()

  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <Navbar />
        <GlobeExperience analyser={getAnalyser()} />
        <main className="relative z-10 overflow-x-hidden pt-20 pointer-events-none">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host" element={<Host />} />
            <Route path="/guest" element={<Guest />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
