import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Studio from './pages/Studio.jsx'
import Host from './pages/Host.jsx'
import Guest from './pages/Guest.jsx'
import GlobeExperience from './components/GlobeExperience.jsx'
import Navbar from './components/Navbar.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="relative min-h-screen">
        <Navbar />
        <GlobeExperience />
        <main className="relative z-10 min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/host" element={<Host />} />
            <Route path="/guest" element={<Guest />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
