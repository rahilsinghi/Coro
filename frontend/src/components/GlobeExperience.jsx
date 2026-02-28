import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial, Float, Environment, ContactShadows, Torus, MeshWobbleMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

// Needle-like vertical light beams
function LightSpike({ index, total, analyser }) {
    const meshRef = useRef()
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])
    const randomPos = useMemo(() => ({
        x: (Math.random() - 0.5) * 2.5,
        z: (Math.random() - 0.5) * 2.5,
        maxH: 2 + Math.random() * 4,
        thickness: 0.003 + Math.random() * 0.012,
        speed: 1.5 + Math.random() * 2
    }), [])

    useFrame((state) => {
        if (!meshRef.current) return
        let intensity = 0
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            const bin = Math.floor((index / total) * dataArray.length * 0.35)
            intensity = dataArray[bin] / 255
        } else {
            intensity = (Math.sin(state.clock.elapsedTime * randomPos.speed + index) + 1) * 0.4
        }

        const scaleY = randomPos.maxH * (0.3 + intensity * 2.8)
        meshRef.current.scale.set(1, scaleY, 1)
        meshRef.current.position.y = scaleY / 2 - 0.8
        meshRef.current.material.opacity = 0.15 + intensity * 0.85
    })

    return (
        <mesh ref={meshRef} position={[randomPos.x, 0, randomPos.z]}>
            <boxGeometry args={[randomPos.thickness, 1, randomPos.thickness]} />
            <meshBasicMaterial
                color="#00c3ff"
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    )
}

// Rippled energy field at the base - more wavy like Image 1
function EnergyField({ isBackground }) {
    const meshRef = useRef()
    const [reducedMotion, setReducedMotion] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReducedMotion(mediaQuery.matches)
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return
        meshRef.current.rotation.z += 0.0005
        if (!reducedMotion) {
            meshRef.current.material.distort = 0.6 + Math.sin(state.clock.elapsedTime * 0.4) * 0.15
        }
    })

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
            <planeGeometry args={[25, 25, 128, 128]} />
            <MeshDistortMaterial
                color="#001a33"
                emissive="#00c3ff"
                emissiveIntensity={1.2}
                transparent
                opacity={isBackground ? 0.15 : 0.4}
                distort={0.4}
                speed={reducedMotion ? 0.05 : 0.8}
                roughness={0}
                metalness={1}
                wireframe={false}
            />
        </mesh>
    )
}

function PortalCore({ analyser, isBackground }) {
    const groupRef = useRef()
    const coreRef = useRef()

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.004
            groupRef.current.rotation.z += 0.001
        }
        if (coreRef.current) {
            const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.03
            coreRef.current.scale.set(scale, scale, scale)
        }
    })

    return (
        <group ref={groupRef} position={[0, 0.5, 0]}>
            <Float speed={reducedMotion ? 0.2 : 2.5} rotationIntensity={1} floatIntensity={0.8}>
                {/* Central Glowing Orb - MASSIVE SCALE */}
                <mesh ref={coreRef} scale={1.8}>
                    <sphereGeometry args={[4, 64, 64]} />
                    <MeshDistortMaterial
                        color="#000d1a"
                        emissive="#00c3ff"
                        emissiveIntensity={5}
                        distort={0.4}
                        speed={1.5}
                        roughness={0}
                        metalness={1}
                    />
                </mesh>

                {/* Torus Rings like Image 1 - Rotating at different axes */}
                <group rotation={[Math.PI / 3, Math.PI / 6, 0]}>
                    <Torus args={[1.4, 0.05, 16, 100]}>
                        <meshBasicMaterial color="#00c3ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} />
                    </Torus>
                </group>

                <group rotation={[-Math.PI / 4, Math.PI / 1.5, Math.PI / 8]}>
                    <Torus args={[1.7, 0.03, 16, 100]}>
                        <meshBasicMaterial color="#00c3ff" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
                    </Torus>
                </group>

                {/* High Density Soundwaves / Extra Rings */}
                {Array.from({ length: 80 }).map((_, i) => (
                    <mesh key={i} rotation={[Math.PI / 2, 0, 0]} scale={4 + i * 0.12}>
                        <ringGeometry args={[1, 1.002, 128]} />
                        <meshBasicMaterial
                            color={i % 10 === 0 ? "#7c3aed" : (i % 4 === 0 ? "#06b6d4" : "#00c3ff")}
                            transparent
                            opacity={0.025 - (i * 0.0003)}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                        />
                    </mesh>
                ))}

                {/* Vertical Spikes */}
                {Array.from({ length: 80 }).map((_, i) => (
                    <LightSpike key={i} index={i} total={80} analyser={analyser} />
                ))}

                {/* Inner Core Sparkle */}
                <Sparkles count={80} scale={2.5} size={3} speed={0.8} color="#00c3ff" />
            </Float>
        </group>
    )
}

const reducedMotion = false; // Internal helper

export default function GlobeExperience({ analyser }) {
    const hasEnteredCoro = useRoomStore(s => s.hasEnteredCoro)
    const setEnteredCoro = useRoomStore(s => s.setEnteredCoro)

    const handleEnter = () => {
        setEnteredCoro(true)
    }

    return (
        <div className={`fixed inset-0 pointer-events-none transition-all duration-1000 ${hasEnteredCoro ? 'z-0' : 'z-[100]'}`}>
            <div
                className={`absolute inset-0 bg-[#000d1a] transition-opacity duration-1500 ${hasEnteredCoro ? 'opacity-40' : 'opacity-100'}`}
            />

            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-2000 ${hasEnteredCoro ? 'scale-[2.5] opacity-0 blur-3xl translate-y-80' : 'scale-100 opacity-100'}`}>
                <Canvas camera={{ position: [0, 0, 20], fov: 50 }} dpr={[1, 2]} antialias>
                    <color attach="background" args={['#000000']} />
                    <fog attach="fog" args={['#000000', 15, 40]} />
                    <ambientLight intensity={0.25} />

                    {/* Atmospheric Lights */}
                    <pointLight position={[20, 20, 20]} intensity={4} color="#00c3ff" />
                    <pointLight position={[-20, -10, -10]} intensity={3} color="#7c3aed" />

                    {/* The Cinematic Amber Glow Hit from Image 1 */}
                    <pointLight position={[0, -5, 0]} intensity={35} distance={30} color="#f59e0b" decay={2} />
                    <pointLight position={[0, 5, 0]} intensity={20} distance={20} color="#00c3ff" decay={2} />

                    <PortalCore analyser={analyser} isBackground={hasEnteredCoro} />
                    <EnergyField isBackground={hasEnteredCoro} />

                    <ContactShadows position={[0, -2, 0]} opacity={0.6} scale={50} blur={5} far={10} />
                    <Environment preset="night" />
                </Canvas>
            </div>

            <AnimatePresence>
                {!hasEnteredCoro && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.15, filter: 'blur(30px)' }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
                    >
                        <div className="bg-[#000d1a]/60 backdrop-blur-md border border-white/10 p-10 sm:p-12 rounded-[2.5rem] shadow-[0_0_120px_rgba(0,195,255,0.1)] flex flex-col items-center max-w-lg mx-auto text-center pointer-events-auto">
                            <div className="flex items-center gap-6 mb-4">
                                <span className="w-10 h-px bg-[#00c3ff]/30" />
                                <h2 className="text-[#00c3ff]/80 text-[10px] uppercase tracking-[1.5em] font-black drop-shadow-[0_0_10px_rgba(0,195,255,0.4)]">CORO</h2>
                                <span className="w-10 h-px bg-[#00c3ff]/30" />
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight tracking-tighter drop-shadow-2xl">
                                Crowd Orchestrated<br />Realtime Output
                            </h1>

                            <p className="text-cs-muted text-xs md:text-sm max-w-xs mb-10 leading-relaxed font-semibold opacity-70 italic tracking-tight">
                                Live crowd signals converging into one<br />evolving musical sphere.
                            </p>

                            <button
                                onClick={handleEnter}
                                className="relative bg-[#00c3ff] hover:bg-[#00e5ff] text-black font-black px-12 py-4 rounded-xl text-lg transition-all shadow-[0_15px_40px_rgba(0,195,255,0.3)] hover:shadow-[0_20px_60px_rgba(0,195,255,0.5)] active:scale-95 group overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Enter CORO Studio
                                    <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
