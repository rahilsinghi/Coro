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
                opacity={0.6}
                blending={THREE.AdditiveBlending}
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
                emissiveIntensity={0.6}
                transparent
                opacity={isBackground ? 0.2 : 0.8}
                distort={0.6}
                speed={reducedMotion ? 0.1 : 1.5}
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
                {/* Central Glowing Orb */}
                <mesh ref={coreRef}>
                    <sphereGeometry args={[1, 64, 64]} />
                    <MeshDistortMaterial
                        color="#000d1a"
                        emissive="#00c3ff"
                        emissiveIntensity={3}
                        distort={0.35}
                        speed={3}
                        roughness={0}
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

                {/* Background Concentric Rings (Flat) */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <mesh key={i} rotation={[Math.PI / 2, 0, 0]} scale={2 + i * 0.4}>
                        <ringGeometry args={[1, 1.01, 128]} />
                        <meshBasicMaterial color="#00c3ff" transparent opacity={0.1 - i * 0.006} blending={THREE.AdditiveBlending} />
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
                <Canvas camera={{ position: [0, 4, 10], fov: 40 }} dpr={[1, 2]} antialias>
                    <color attach="background" args={['#000000']} />
                    <fog attach="fog" args={['#000000', 8, 25]} />
                    <ambientLight intensity={0.1} />

                    {/* Atmospheric Lights */}
                    <pointLight position={[10, 10, 10]} intensity={2.5} color="#00c3ff" />
                    <pointLight position={[-10, -5, -5]} intensity={1.5} color="#004080" />

                    {/* The Cinematic Amber Glow Hit from Image 1 */}
                    <pointLight position={[0, -0.5, 0]} intensity={15} distance={10} color="#f59e0b" decay={2} />
                    <pointLight position={[0, 0.5, 0]} intensity={8} distance={8} color="#00c3ff" decay={2} />

                    <PortalCore analyser={analyser} isBackground={hasEnteredCoro} />
                    <EnergyField isBackground={hasEnteredCoro} />

                    <ContactShadows position={[0, -0.8, 0]} opacity={0.7} scale={25} blur={3.5} far={5} />
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
                        <div className="bg-[#000d1a]/85 backdrop-blur-[60px] border border-white/5 p-14 md:p-24 rounded-[4rem] shadow-[0_0_150px_rgba(0,195,255,0.25)] flex flex-col items-center max-w-4xl mx-auto text-center pointer-events-auto mt-80">
                            <div className="flex items-center gap-6 mb-6">
                                <span className="w-16 h-[2px] bg-[#00c3ff]/20" />
                                <h2 className="text-[#00c3ff] text-base uppercase tracking-[1em] font-black drop-shadow-[0_0_10px_rgba(0,195,255,0.5)]">CORO</h2>
                                <span className="w-16 h-[2px] bg-[#00c3ff]/20" />
                            </div>

                            <h1 className="text-6xl md:text-8xl font-black text-white mb-10 leading-[1.05] tracking-tighter drop-shadow-2xl">
                                Crowd Orchestrated<br />Realtime Output
                            </h1>

                            <p className="text-cs-muted text-lg md:text-xl max-w-xl mb-14 leading-relaxed font-semibold opacity-80 italic tracking-tight">
                                Live crowd signals converging into one<br />evolving musical sphere.
                            </p>

                            <button
                                onClick={handleEnter}
                                className="relative bg-[#00c3ff] hover:bg-[#00e5ff] text-black font-black px-20 py-7 rounded-[2rem] text-2xl transition-all shadow-[0_25px_80px_rgba(0,195,255,0.5)] hover:shadow-[0_30px_100px_rgba(0,195,255,0.7)] active:scale-95 group overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-4">
                                    Enter CORO Studio
                                    <svg className="w-8 h-8 transform group-hover:translate-x-3 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
