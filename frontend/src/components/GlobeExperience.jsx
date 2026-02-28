import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

// ─── Procedural planet surface texture ────────────────────────────────────────
function createProceduralTexture() {
    const size = 512
    const data = new Uint8Array(4 * size * size)

    const hash = (x, y) => {
        let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
        return n - Math.floor(n)
    }
    const noise = (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y)
        const fx = x - ix, fy = y - iy
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
        return (
            hash(ix, iy) * (1 - ux) * (1 - uy) +
            hash(ix + 1, iy) * ux * (1 - uy) +
            hash(ix, iy + 1) * (1 - ux) * uy +
            hash(ix + 1, iy + 1) * ux * uy
        )
    }
    const fbm = (x, y) =>
        noise(x * 4, y * 4) * 0.5 +
        noise(x * 8, y * 8) * 0.3 +
        noise(x * 16, y * 16) * 0.15 +
        noise(x * 32, y * 32) * 0.05

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const n = fbm(i / size, j / size)
            let r, g, b
            if (n < 0.28) {
                r = 0; g = 3; b = 16           // void navy
            } else if (n < 0.48) {
                const t = (n - 0.28) / 0.2
                r = Math.floor(t * 5); g = Math.floor(8 + t * 22); b = Math.floor(30 + t * 55)
            } else if (n < 0.68) {
                const t = (n - 0.48) / 0.2
                r = Math.floor(5 + t * 25); g = Math.floor(30 + t * 60); b = Math.floor(85 + t * 110)
            } else {
                const t = (n - 0.68) / 0.32   // cyan veins
                r = Math.floor(30 + t * 20); g = Math.floor(90 + t * 160); b = Math.floor(195 + t * 60)
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

// ─── Orbital Rings — 3D tilted, precessing, audio-reactive ───────────────────
const RING_COUNT = 22

function OrbitingRings({ analyser, isBackground }) {
    const ringsRef = useRef([])
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])

    // Static per-ring configuration — varied tilts + phases for orbital feel
    const ringParams = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => {
        const tier = i % 3
        return {
            baseScale: 5.0 + i * 0.32,
            // Each ring gets a unique tilt combo → elliptical / orbital silhouette
            tiltX: tier === 0 ? Math.PI * 0.1 : tier === 1 ? Math.PI * 0.3 : Math.PI * 0.55,
            tiltZ: (i * Math.PI * 1.3) / RING_COUNT,
            precession: (0.0008 + i * 0.00025) * (i % 2 === 0 ? 1 : -1),
            shimmerFreq: 0.7 + (i % 5) * 0.28,
            shimmerAmp: 0.018 + (i % 3) * 0.006,
            phaseOffset: (i / RING_COUNT) * Math.PI * 2.5,
            heatFreq: 1.4 + (i % 7) * 0.22,   // heat wave freq
            ringWidth: 1.010 - i * 0.00015,
            baseOpacity: 0.28 - i * 0.008,
            color: i % 6 === 0 ? '#7C3AED'
                : i % 3 === 0 ? '#2D6BFF'
                    : '#00D1FF',
        }
    }), [])

    useFrame((state) => {
        const t = state.clock.elapsedTime

        // Audio amplitude or time-fallback
        let amp = 0
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            amp = dataArray.reduce((s, v) => s + v, 0) / dataArray.length / 255
        } else {
            amp = 0.12 + Math.sin(t * 0.7) * 0.08 + Math.sin(t * 1.3) * 0.04
        }

        ringsRef.current.forEach((ring, i) => {
            if (!ring) return
            const p = ringParams[i]

            // ── Precession (orbital rotation around Y) ──────────────────────
            ring.rotation.y += p.precession

            // ── Heat shimmer: two-frequency sinusoidal scale deformation ────
            const heat1 = Math.sin(t * p.shimmerFreq + p.phaseOffset) * p.shimmerAmp
            const heat2 = Math.cos(t * p.heatFreq + p.phaseOffset * 1.3) * (p.shimmerAmp * 0.5)
            // Slightly different x/z to non-uniformly deform → shimmery feel
            const sX = p.baseScale * (1 + heat1 + amp * 0.07)
            const sZ = p.baseScale * (1 + heat2 + amp * 0.05)
            ring.scale.set(sX, p.baseScale, sZ)

            // ── Opacity pulse ────────────────────────────────────────────────
            const mat = ring.children[0]?.material
            if (mat) {
                mat.opacity = Math.max(0.005,
                    (isBackground ? 0.06 : p.baseOpacity) +
                    amp * 0.18 +
                    Math.sin(t * p.shimmerFreq * 0.5 + p.phaseOffset) * 0.04
                )
            }
        })
    })

    return (
        <group>
            {ringParams.map((p, i) => (
                <group
                    key={i}
                    ref={el => { ringsRef.current[i] = el }}
                    rotation={[p.tiltX, 0, p.tiltZ]}
                >
                    <mesh>
                        <ringGeometry args={[1, p.ringWidth, 128]} />
                        <meshBasicMaterial
                            color={p.color}
                            transparent
                            opacity={p.baseOpacity}
                            blending={THREE.AdditiveBlending}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    )
}

// ─── Audio vertical spikes ────────────────────────────────────────────────────
function LightSpike({ index, total, analyser }) {
    const meshRef = useRef()
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])
    const pos = useMemo(() => ({
        x: (Math.random() - 0.5) * 3.5,
        z: (Math.random() - 0.5) * 3.5,
        maxH: 0.8 + Math.random() * 2.5,
        thickness: 0.004 + Math.random() * 0.01,
        speed: 0.7 + Math.random() * 1.0,
    }), [])

    useFrame((state) => {
        if (!meshRef.current) return
        let intensity
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            intensity = dataArray[Math.floor((index / total) * dataArray.length * 0.4)] / 255
        } else {
            intensity = (Math.sin(state.clock.elapsedTime * pos.speed + index * 0.8) + 1) * 0.45
        }
        const scaleY = pos.maxH * (0.1 + intensity * 2.2)
        meshRef.current.scale.set(1, scaleY, 1)
        meshRef.current.position.y = scaleY / 2 - 0.8
        meshRef.current.material.opacity = 0.06 + intensity * 0.55
    })

    return (
        <mesh ref={meshRef} position={[pos.x, 0, pos.z]}>
            <boxGeometry args={[pos.thickness, 1, pos.thickness]} />
            <meshBasicMaterial color="#00D1FF" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    )
}

// ─── The Planet Globe — textured sphere + Fresnel rim layers ─────────────────
function Planet({ analyser, isBackground }) {
    const coreRef = useRef()
    const rimRef = useRef()
    const rim2Ref = useRef()
    const specRef = useRef()
    const surfaceTex = useMemo(() => createProceduralTexture(), [])
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])

    useFrame((state) => {
        const t = state.clock.elapsedTime

        let amp = 0
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            amp = dataArray.reduce((s, v) => s + v, 0) / dataArray.length / 255
        } else {
            amp = 0.12 + Math.sin(t * 0.6) * 0.07 + Math.sin(t * 1.7) * 0.03
        }

        // Slow Y-axis self-rotation (like a real planet)
        if (coreRef.current) {
            coreRef.current.rotation.y += 0.0018
            // Subtle breathing scale
            const breathe = 1 + Math.sin(t * 0.9) * 0.008 + amp * 0.025
            coreRef.current.scale.setScalar(breathe)
        }

        // Rim glow intensity pulses with audio
        if (rimRef.current) {
            rimRef.current.material.opacity = isBackground
                ? 0.08 + amp * 0.06
                : 0.22 + amp * 0.18 + Math.sin(t * 0.5) * 0.04
        }
        if (rim2Ref.current) {
            rim2Ref.current.material.opacity = isBackground
                ? 0.04
                : 0.08 + amp * 0.08
        }
        // Specular highlight shimmer
        if (specRef.current) {
            specRef.current.material.opacity = 0.12 + Math.sin(t * 1.1) * 0.06 + amp * 0.10
        }
    })

    return (
        <group>
            {/* ── Core planet with texture ── */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[4.5, 128, 128]} />
                <meshStandardMaterial
                    map={surfaceTex}
                    color="#020b1a"
                    emissive="#051830"
                    emissiveIntensity={0.5}
                    roughness={0.80}
                    metalness={0.35}
                />
            </mesh>

            {/* ── Atmosphere / rim: BackSide cyan, large → only edges visible ── */}
            <mesh ref={rimRef} scale={1.10}>
                <sphereGeometry args={[4.5, 64, 64]} />
                <meshBasicMaterial
                    color="#00D1FF"
                    transparent
                    opacity={0.22}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* ── Mid atmosphere: electric blue tint ── */}
            <mesh ref={rim2Ref} scale={1.055}>
                <sphereGeometry args={[4.5, 32, 32]} />
                <meshBasicMaterial
                    color="#2D6BFF"
                    transparent
                    opacity={0.08}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* ── Specular highlight bubble (top-left bright spot) ── */}
            <mesh ref={specRef} position={[-1.4, 2.2, 3.8]} scale={1.6}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color="#aaeeff"
                    transparent
                    opacity={0.12}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* ── Star sparkles ── */}
            <Sparkles count={35} scale={5.5} size={1.2} speed={0.3} color="#00D1FF" opacity={0.4} />
        </group>
    )
}

// ─── Scene root ───────────────────────────────────────────────────────────────
function Scene({ analyser, isBackground }) {
    const sceneRef = useRef()

    useFrame((state) => {
        // Very slow global tilt precession for extra depth feel
        if (sceneRef.current) {
            sceneRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.04
        }
    })

    return (
        <group ref={sceneRef}>
            <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.35}>
                <Planet analyser={analyser} isBackground={isBackground} />
                <OrbitingRings analyser={analyser} isBackground={isBackground} />
                {Array.from({ length: 45 }).map((_, i) => (
                    <LightSpike key={i} index={i} total={45} analyser={analyser} />
                ))}
            </Float>
        </group>
    )
}

// ─── GlobeExperience — exported component ────────────────────────────────────
export default function GlobeExperience({ analyser }) {
    const hasEnteredCoro = useRoomStore(s => s.hasEnteredCoro)
    const setEnteredCoro = useRoomStore(s => s.setEnteredCoro)

    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            {/* Deep space gradient base */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#000d20_0%,#000510_45%,#000000_100%)]" />

            {/* 3D Canvas — hero or background mode */}
            <div
                className="absolute inset-0 transition-all ease-in-out"
                style={{
                    transitionDuration: '1200ms',
                    opacity: hasEnteredCoro ? 0.22 : 1,
                    transform: hasEnteredCoro ? 'scale(1.12) translateY(5%)' : 'scale(1) translateY(0)',
                }}
            >
                <Canvas
                    camera={{ position: [0, 0, 20], fov: 40 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, alpha: false }}
                >
                    <color attach="background" args={['#000000']} />
                    <fog attach="fog" args={['#000000', 22, 60]} />

                    {/* ── Lights: controlled for depth, NOT overexposure ── */}
                    <ambientLight intensity={0.15} />
                    {/* Key light — top-left, slightly warm white */}
                    <directionalLight position={[8, 12, 10]} intensity={1.1} color="#c8eeff" />
                    {/* Rim / back fill — electric blue from the right */}
                    <pointLight position={[-20, 4, -5]} intensity={3.0} color="#2D6BFF" distance={60} decay={2} />
                    {/* Purple fill from below */}
                    <pointLight position={[4, -18, 6]} intensity={2.0} color="#7C3AED" distance={55} decay={2} />
                    {/* Soft cyan front — low intensity to avoid blow-out */}
                    <pointLight position={[0, 2, 24]} intensity={0.7} color="#00D1FF" distance={35} decay={2} />

                    <Scene analyser={analyser} isBackground={hasEnteredCoro} />
                    <Environment preset="night" />
                </Canvas>
            </div>

            {/* ── Hero Card ── */}
            <AnimatePresence>
                {!hasEnteredCoro && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
                    >
                        <div className="pointer-events-auto flex flex-col items-center text-center max-w-md w-full"
                            style={{
                                background: 'rgba(0, 12, 30, 0.58)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid rgba(0, 209, 255, 0.18)',
                                borderRadius: '2.5rem',
                                padding: 'clamp(2rem, 5vw, 3.5rem)',
                                boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 60px rgba(0,209,255,0.05)',
                            }}
                        >
                            {/* Label */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(0,209,255,0.4))' }} />
                                <span className="text-[10px] font-black uppercase tracking-[0.55em]" style={{ color: 'rgba(0,209,255,0.65)' }}>CORO</span>
                                <div className="w-10 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(0,209,255,0.4))' }} />
                            </div>

                            <h1 className="font-black text-white tracking-tighter leading-[1.08] mb-6"
                                style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                                Crowd Orchestrated<br />Realtime Output
                            </h1>

                            <p className="text-sm font-medium leading-relaxed mb-12"
                                style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px' }}>
                                Converge live crowd signals into a shared, evolving musical sphere.
                            </p>

                            <button
                                onClick={() => setEnteredCoro(true)}
                                className="group relative overflow-hidden flex items-center gap-3 font-black text-black rounded-full transition-transform active:scale-95"
                                style={{
                                    background: '#00D1FF',
                                    padding: '1.1rem 2.8rem',
                                    fontSize: '1.05rem',
                                    boxShadow: '0 14px 40px rgba(0,209,255,0.32)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#00E5FF'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,209,255,0.55)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#00D1FF'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(0,209,255,0.32)' }}
                            >
                                <div className="absolute inset-0 bg-white/25 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                <span className="relative z-10">Enter CORO Studio</span>
                                <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Vignette ── */}
            {!hasEnteredCoro && (
                <div
                    className="fixed inset-0 pointer-events-none z-10"
                    style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 25%, rgba(0,0,0,0.5) 100%)' }}
                />
            )}
        </div>
    )
}
