import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

// ----- Procedural vertex-shader-like noise via CPU texture -----
function createProceduralTexture() {
    const size = 512
    const data = new Uint8Array(4 * size * size)

    // Simple layered noise for planet-like surface
    function noise(x, y, freq) {
        const s = Math.sin(x * freq * 3.14159 + y * freq * 2.718)
        const c = Math.cos(x * freq * 1.618 - y * freq * 3.14159)
        return (s * c + 1) * 0.5
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const px = i / size
            const py = j / size

            // Layered octave noise
            const n1 = noise(px, py, 4)
            const n2 = noise(px + 0.5, py + 0.3, 8) * 0.5
            const n3 = noise(px - 0.2, py + 0.7, 16) * 0.25
            const nTotal = (n1 + n2 + n3) / 1.75

            // Color mapping: deep navy base + cyan veins + electric blue patches
            let r, g, b
            if (nTotal < 0.3) {
                // Deep void — near black navy
                r = 0; g = 4; b = 18
            } else if (nTotal < 0.5) {
                // Navy base
                const t = (nTotal - 0.3) / 0.2
                r = Math.floor(t * 4)
                g = Math.floor(8 + t * 20)
                b = Math.floor(30 + t * 50)
            } else if (nTotal < 0.7) {
                // Blue mid
                const t = (nTotal - 0.5) / 0.2
                r = Math.floor(4 + t * 20)
                g = Math.floor(28 + t * 50)
                b = Math.floor(80 + t * 100)
            } else {
                // Cyan highlight veins
                const t = (nTotal - 0.7) / 0.3
                r = Math.floor(24 + t * 30)
                g = Math.floor(78 + t * 150)
                b = Math.floor(180 + t * 75)
            }

            const idx = (i * size + j) * 4
            data[idx] = Math.min(255, r)
            data[idx + 1] = Math.min(255, g)
            data[idx + 2] = Math.min(255, b)
            data[idx + 3] = 255
        }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
}

// Vertical audio spikes
function LightSpike({ index, total, analyser }) {
    const meshRef = useRef()
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])
    const pos = useMemo(() => ({
        x: (Math.random() - 0.5) * 3.5,
        z: (Math.random() - 0.5) * 3.5,
        maxH: 1 + Math.random() * 3,
        thickness: 0.004 + Math.random() * 0.012,
        speed: 0.8 + Math.random() * 1.2
    }), [])

    useFrame((state) => {
        if (!meshRef.current) return
        let intensity = analyser && dataArray
            ? (analyser.getByteFrequencyData(dataArray), dataArray[Math.floor((index / total) * dataArray.length * 0.4)] / 255)
            : (Math.sin(state.clock.elapsedTime * pos.speed + index) + 1) * 0.5
        const scaleY = pos.maxH * (0.15 + intensity * 2.2)
        meshRef.current.scale.set(1, scaleY, 1)
        meshRef.current.position.y = scaleY / 2 - 1
        meshRef.current.material.opacity = 0.08 + intensity * 0.6
    })

    return (
        <mesh ref={meshRef} position={[pos.x, 0, pos.z]}>
            <boxGeometry args={[pos.thickness, 1, pos.thickness]} />
            <meshBasicMaterial color="#00D1FF" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    )
}

function Globe({ isBackground }) {
    const groupRef = useRef()
    const innerRef = useRef()
    const atmosRef = useRef()

    // Generate procedural texture once
    const surfaceTexture = useMemo(() => createProceduralTexture(), [])

    useFrame((state) => {
        if (groupRef.current) {
            // Slow Y-axis rotation
            groupRef.current.rotation.y += 0.0025
        }
        if (innerRef.current) {
            // Very subtle breathing
            const s = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.01
            innerRef.current.scale.set(s, s, s)
        }
        if (atmosRef.current) {
            // Atmosphere glow pulses
            const a = 0.18 + Math.sin(state.clock.elapsedTime * 0.5) * 0.04
            atmosRef.current.material.opacity = isBackground ? a * 0.5 : a
        }
    })

    return (
        <group ref={groupRef}>
            {/* Core textured sphere */}
            <mesh ref={innerRef}>
                <sphereGeometry args={[4.5, 128, 128]} />
                <meshStandardMaterial
                    map={surfaceTexture}
                    color="#030d1f"
                    emissive="#0a2a4a"
                    emissiveIntensity={0.6}
                    roughness={0.75}
                    metalness={0.4}
                />
            </mesh>

            {/* Rim glow / atmosphere — outer sphere, slightly larger, additive */}
            <mesh ref={atmosRef} scale={1.08}>
                <sphereGeometry args={[4.5, 64, 64]} />
                <meshBasicMaterial
                    color="#00D1FF"
                    transparent
                    opacity={0.18}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Subtle mid-layer glow (electric blue tint) */}
            <mesh scale={1.04}>
                <sphereGeometry args={[4.5, 32, 32]} />
                <meshBasicMaterial
                    color="#2D6BFF"
                    transparent
                    opacity={0.06}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>
        </group>
    )
}

function PortalCore({ analyser, isBackground }) {
    const groupRef = useRef()

    useFrame(() => {
        // Slight wobble on the rings group only
        if (groupRef.current) groupRef.current.rotation.z += 0.0005
    })

    return (
        <group ref={groupRef}>
            <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
                {/* The planet */}
                <Globe isBackground={isBackground} />

                {/* Dense Radial Soundwaves - Facing Camera (z-plane rings) */}
                {Array.from({ length: 24 }).map((_, i) => (
                    <mesh key={i} scale={5 + i * 0.3}>
                        <ringGeometry args={[1, 1.007, 128]} />
                        <meshBasicMaterial
                            color={i % 6 === 0 ? "#7C3AED" : (i % 3 === 0 ? "#2D6BFF" : "#00D1FF")}
                            transparent
                            opacity={(isBackground ? 0.04 : 0.13) - (i * 0.004)}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                ))}

                {/* Vertical Spikes */}
                {Array.from({ length: 50 }).map((_, i) => (
                    <LightSpike key={i} index={i} total={50} analyser={analyser} />
                ))}

                {/* Sparkles */}
                <Sparkles count={40} scale={5} size={1.5} speed={0.4} color="#00D1FF" opacity={0.5} />
            </Float>
        </group>
    )
}

export default function GlobeExperience({ analyser }) {
    const hasEnteredCoro = useRoomStore(s => s.hasEnteredCoro)
    const setEnteredCoro = useRoomStore(s => s.setEnteredCoro)

    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            {/* Deep navy gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#000510] via-[#000c1e] to-black" />

            {/* 3D Canvas */}
            <div className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${hasEnteredCoro ? 'opacity-25 scale-110 translate-y-16' : 'opacity-100 scale-100 translate-y-0'}`}>
                <Canvas camera={{ position: [0, 0, 20], fov: 42 }} dpr={[1, 2]}>
                    <color attach="background" args={['#000000']} />
                    <fog attach="fog" args={['#000000', 20, 55]} />

                    {/* Controlled lighting for depth — NOT overexposed */}
                    <ambientLight intensity={0.2} />
                    {/* Key light — top-left white for specular highlight */}
                    <directionalLight position={[8, 12, 10]} intensity={1.2} color="#c8e8ff" />
                    {/* Rim light — electric blue from the right */}
                    <pointLight position={[-18, 5, 5]} intensity={2.5} color="#2D6BFF" distance={50} />
                    {/* Fill light — subtle purple from below */}
                    <pointLight position={[5, -15, 8]} intensity={1.5} color="#7C3AED" distance={50} />
                    {/* Cyan front glow — very controlled */}
                    <pointLight position={[0, 0, 22]} intensity={0.8} color="#00D1FF" distance={30} />

                    <PortalCore analyser={analyser} isBackground={hasEnteredCoro} />
                    <Environment preset="night" />
                </Canvas>
            </div>

            {/* Hero card overlay */}
            <AnimatePresence>
                {!hasEnteredCoro && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none px-4"
                    >
                        <div className="bg-[#000c1e]/60 backdrop-blur-xl border border-[#00D1FF]/20 p-8 sm:p-12 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.7)] flex flex-col items-center max-w-lg mx-auto text-center pointer-events-auto">
                            <div className="flex items-center gap-4 mb-6">
                                <span className="w-10 h-px bg-gradient-to-r from-transparent to-[#00D1FF]/40" />
                                <span className="text-[#00D1FF]/70 text-[10px] uppercase tracking-[0.5em] font-black">CORO</span>
                                <span className="w-10 h-px bg-gradient-to-l from-transparent to-[#00D1FF]/40" />
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tighter">
                                Crowd Orchestrated<br />Realtime Output
                            </h1>

                            <p className="text-white/55 text-sm md:text-base max-w-[300px] mb-12 leading-relaxed font-medium">
                                Converge live crowd signals into a shared, evolving musical sphere.
                            </p>

                            <button
                                onClick={() => setEnteredCoro(true)}
                                className="relative bg-[#00D1FF] hover:bg-[#00E5FF] text-black font-black px-12 py-5 rounded-full text-lg transition-all active:scale-95 group overflow-hidden"
                                style={{ boxShadow: '0 15px 40px rgba(0,209,255,0.3)' }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,209,255,0.5)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,209,255,0.3)'}
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Enter CORO Studio
                                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Vignette */}
            {!hasEnteredCoro && (
                <div
                    className="fixed inset-0 pointer-events-none z-10"
                    style={{ background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.55) 100%)' }}
                />
            )}
        </div>
    )
}
