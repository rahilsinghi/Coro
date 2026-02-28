import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Host from './pages/Host.jsx'
import Guest from './pages/Guest.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/guest" element={<Guest />} />
      </Routes>
    </BrowserRouter>
  )
}
