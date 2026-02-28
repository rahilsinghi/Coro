import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Environment, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '../store/roomStore'

// ─── Procedural planet texture (fbm noise → navy/cyan bands) ─────────────────
function createProceduralTexture() {
    const size = 512
    const data = new Uint8Array(4 * size * size)
    const h = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }
    const v = (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
        return h(ix, iy) * (1 - ux) * (1 - uy) + h(ix + 1, iy) * ux * (1 - uy) + h(ix, iy + 1) * (1 - ux) * uy + h(ix + 1, iy + 1) * ux * uy
    }
    const fbm = (x, y) => v(x * 4, y * 4) * 0.5 + v(x * 8, y * 8) * 0.28 + v(x * 16, y * 16) * 0.14 + v(x * 32, y * 32) * 0.08

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const n = fbm(i / size, j / size)
            let r, g, b
            if (n < 0.28) { r = 0; g = 3; b = 16 }
            else if (n < 0.48) { const t = (n - 0.28) / 0.2; r = Math.floor(t * 5); g = Math.floor(8 + t * 22); b = Math.floor(30 + t * 55) }
            else if (n < 0.68) { const t = (n - 0.48) / 0.2; r = Math.floor(5 + t * 25); g = Math.floor(30 + t * 60); b = Math.floor(85 + t * 110) }
            else { const t = (n - 0.68) / 0.32; r = Math.floor(30 + t * 20); g = Math.floor(90 + t * 160); b = Math.floor(195 + t * 60) }
            const idx = (i * size + j) * 4
            data[idx] = Math.min(255, r); data[idx + 1] = Math.min(255, g); data[idx + 2] = Math.min(255, b); data[idx + 3] = 255
        }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
}


// ─── Orbital rings — tilted 3D orbits, extended scale, vibrant neon ───────────
const ORBIT_COUNT = 28
function OrbitingRings({ analyser, isBackground }) {
    const ringsRef = useRef([])
    const glowRefs = useRef([])
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])

    const params = useMemo(() => Array.from({ length: ORBIT_COUNT }, (_, i) => {
        const tier = i % 4
        // All rings are strongly tilted (min 0.4 rad ≈ 23°) so NONE appear as a flat horizontal strip
        return {
            scale: 5.5 + i * 0.60,           // extends from 5.5 → 22 world units
            tiltX: tier === 0 ? 0.45 : tier === 1 ? 0.95 : tier === 2 ? 1.45 : 1.85,
            tiltZ: (i * Math.PI * 1.618) / ORBIT_COUNT,  // golden-ratio spread
            prec: (0.0008 + i * 0.00025) * (i % 2 === 0 ? 1 : -1),
            shimFreq: 0.5 + (i % 6) * 0.22,
            shimAmp: 0.020 + (i % 4) * 0.008,
            heatFreq: 1.2 + (i % 7) * 0.2,
            phase: (i / ORBIT_COUNT) * Math.PI * 3,
            baseOp: 0.35 - i * 0.007,          // boosted base opacity
            glowOp: 0.18 - i * 0.004,          // glow twin opacity
            color: i % 5 === 0 ? '#7C3AED' : i % 3 === 0 ? '#2D6BFF' : '#00D1FF',
        }
    }), [])

    useFrame((state) => {
        const t = state.clock.elapsedTime
        let amp = analyser && dataArray
            ? (analyser.getByteFrequencyData(dataArray), dataArray.reduce((s, v) => s + v, 0) / dataArray.length / 255)
            : 0.12 + Math.sin(t * 0.6) * 0.08 + Math.sin(t * 1.3) * 0.04

        ringsRef.current.forEach((ring, i) => {
            if (!ring) return
            const p = params[i]
            ring.rotation.y += p.prec
            const h1 = Math.sin(t * p.shimFreq + p.phase) * p.shimAmp
            const h2 = Math.cos(t * p.heatFreq + p.phase * 1.3) * (p.shimAmp * 0.5)
            const sX = p.scale * (1 + h1 + amp * 0.08)
            const sZ = p.scale * (1 + h2 + amp * 0.06)
            ring.scale.set(sX, p.scale, sZ)
            const mat = ring.children[0]?.material
            if (mat) mat.opacity = Math.max(0.01, (isBackground ? 0.04 : p.baseOp) + amp * 0.22 + Math.sin(t * p.shimFreq * 0.5) * 0.04)
        })

        glowRefs.current.forEach((ring, i) => {
            if (!ring) return
            const p = params[i]
            const mat = ring.children[0]?.material
            if (mat) mat.opacity = Math.max(0, (isBackground ? 0.02 : p.glowOp) + amp * 0.10)
        })
    })

    return (
        <group>
            {params.map((p, i) => (
                <group key={i}>
                    {/* Crisp core ring */}
                    <group ref={el => { ringsRef.current[i] = el }} rotation={[p.tiltX, 0, p.tiltZ]}>
                        <mesh>
                            <ringGeometry args={[1, 1.010, 128]} />
                            <meshBasicMaterial color={p.color} transparent opacity={p.baseOp}
                                blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                    {/* Soft glow twin — wider, lower opacity, same tilt */}
                    <group ref={el => { glowRefs.current[i] = el }} rotation={[p.tiltX, 0, p.tiltZ]} scale={p.scale * 1.018}>
                        <mesh>
                            <ringGeometry args={[1, 1.032, 128]} />
                            <meshBasicMaterial color={p.color} transparent opacity={p.glowOp}
                                blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
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
        x: (Math.random() - 0.5) * 3.5, z: (Math.random() - 0.5) * 3.5,
        maxH: 0.8 + Math.random() * 2.5, thick: 0.003 + Math.random() * 0.009, spd: 0.6 + Math.random() * 1.0
    }), [])

    useFrame((state) => {
        if (!meshRef.current) return
        const intensity = analyser && dataArray
            ? (analyser.getByteFrequencyData(dataArray), dataArray[Math.floor((index / total) * dataArray.length * 0.4)] / 255)
            : (Math.sin(state.clock.elapsedTime * pos.spd + index * 0.8) + 1) * 0.45
        const sY = pos.maxH * (0.1 + intensity * 2.2)
        meshRef.current.scale.set(1, sY, 1)
        meshRef.current.position.y = sY / 2 - 0.8
        meshRef.current.material.opacity = 0.05 + intensity * 0.5
    })

    return (
        <mesh ref={meshRef} position={[pos.x, 0, pos.z]}>
            <boxGeometry args={[pos.thick, 1, pos.thick]} />
            <meshBasicMaterial color="#00D1FF" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
    )
}

// ─── Planet — textured sphere + Fresnel atmosphere layers ────────────────────
function Planet({ analyser, isBackground }) {
    const coreRef = useRef(), rimRef = useRef(), rim2Ref = useRef(), specRef = useRef()
    const tex = useMemo(() => createProceduralTexture(), [])
    const dataArray = useMemo(() => analyser ? new Uint8Array(analyser.frequencyBinCount) : null, [analyser])

    useFrame((state) => {
        const t = state.clock.elapsedTime
        let amp = analyser && dataArray
            ? (analyser.getByteFrequencyData(dataArray), dataArray.reduce((s, v) => s + v, 0) / dataArray.length / 255)
            : 0.12 + Math.sin(t * 0.6) * 0.07 + Math.sin(t * 1.7) * 0.03

        if (coreRef.current) {
            coreRef.current.rotation.y += 0.0018
            const breathe = 1 + Math.sin(t * 0.9) * 0.008 + amp * 0.025
            coreRef.current.scale.setScalar(breathe)
        }
        if (rimRef.current) rimRef.current.material.opacity = isBackground ? 0.06 + amp * 0.04 : 0.24 + amp * 0.20 + Math.sin(t * 0.5) * 0.04
        if (rim2Ref.current) rim2Ref.current.material.opacity = isBackground ? 0.03 : 0.09 + amp * 0.09
        if (specRef.current) specRef.current.material.opacity = 0.10 + Math.sin(t * 1.1) * 0.05 + amp * 0.09
    })

    return (
        <group>
            <mesh ref={coreRef}>
                <sphereGeometry args={[4.5, 128, 128]} />
                <meshStandardMaterial map={tex} color="#020b1a" emissive="#051830" emissiveIntensity={0.5} roughness={0.80} metalness={0.35} />
            </mesh>
            {/* Cyan atmosphere rim */}
            <mesh ref={rimRef} scale={1.10}>
                <sphereGeometry args={[4.5, 64, 64]} />
                <meshBasicMaterial color="#00D1FF" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
            </mesh>
            {/* Electric blue mid-layer */}
            <mesh ref={rim2Ref} scale={1.055}>
                <sphereGeometry args={[4.5, 32, 32]} />
                <meshBasicMaterial color="#2D6BFF" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
            </mesh>
            {/* Specular hot spot */}
            <mesh ref={specRef} position={[-1.4, 2.2, 3.8]} scale={1.55}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial color="#b8e8ff" transparent opacity={0.11} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <Sparkles count={30} scale={5.5} size={1.0} speed={0.3} color="#00D1FF" opacity={0.35} />
        </group>
    )
}

// ─── Scene root — NO global tilt (would create edge-on strip illusion) ────────
function Scene({ analyser, isBackground }) {
    return (
        <group>
            {/* Orbital rings first (background layer) */}
            <OrbitingRings analyser={analyser} isBackground={isBackground} />
            <Float speed={1.2} rotationIntensity={0.18} floatIntensity={0.28}>
                <Planet analyser={analyser} isBackground={isBackground} />
                {Array.from({ length: 35 }).map((_, i) => (
                    <LightSpike key={i} index={i} total={35} analyser={analyser} />
                ))}
            </Float>
        </group>
    )
}

// ─── GlobeExperience ─────────────────────────────────────────────────────────
export default function GlobeExperience({ analyser }) {
    const hasEnteredCoro = useRoomStore(s => s.hasEnteredCoro)
    const setEnteredCoro = useRoomStore(s => s.setEnteredCoro)

    return (
        <>
            {/* ── Layer 1: 3D Canvas (always fixed, z-0) ── */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#000d20_0%,#000510_45%,#000000_100%)]" />
                <div
                    className="absolute inset-0 transition-all ease-in-out"
                    style={{
                        transitionDuration: '1200ms',
                        opacity: hasEnteredCoro ? 0.20 : 1,
                        transform: hasEnteredCoro ? 'scale(1.1) translateY(4%)' : 'scale(1) translateY(0)',
                    }}
                >
                    <Canvas camera={{ position: [0, 0, 20], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
                        <color attach="background" args={['#000000']} />
                        <fog attach="fog" args={['#000000', 22, 60]} />
                        <ambientLight intensity={0.15} />
                        <directionalLight position={[8, 12, 10]} intensity={1.1} color="#c8eeff" />
                        <pointLight position={[-20, 4, -5]} intensity={3.0} color="#2D6BFF" distance={60} decay={2} />
                        <pointLight position={[4, -18, 6]} intensity={2.0} color="#7C3AED" distance={55} decay={2} />
                        <pointLight position={[0, 2, 24]} intensity={0.7} color="#00D1FF" distance={35} decay={2} />
                        <Scene analyser={analyser} isBackground={hasEnteredCoro} />
                        <Environment preset="night" />
                    </Canvas>
                </div>
            </div>

            {/* ── Layer 2: Vignette (z-[5]) ── */}
            {!hasEnteredCoro && (
                <div
                    className="fixed inset-0 z-[5] pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 25%, rgba(0,0,0,0.52) 100%)' }}
                />
            )}

            {/* ── Layer 3: Hero card (z-[200], fully above <main z-10>) ── */}
            <AnimatePresence>
                {!hasEnteredCoro && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Card — pointer-events-auto so all children are clickable */}
                        <div
                            className="flex flex-col items-center text-center w-full"
                            style={{
                                maxWidth: '420px',
                                pointerEvents: 'auto',
                                background: 'rgba(0, 12, 30, 0.60)',
                                backdropFilter: 'blur(22px)',
                                WebkitBackdropFilter: 'blur(22px)',
                                border: '1px solid rgba(0, 209, 255, 0.18)',
                                borderRadius: '2rem',
                                padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                                boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,209,255,0.04)',
                            }}
                        >
                            {/* ── CORO label — bigger, stronger ── */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(0,209,255,0.5))' }} />
                                <span
                                    className="font-black uppercase tracking-[0.55em]"
                                    style={{ fontSize: '0.8rem', color: 'rgba(0,209,255,0.80)', letterSpacing: '0.5em' }}
                                >
                                    CORO
                                </span>
                                <div className="w-8 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(0,209,255,0.5))' }} />
                            </div>

                            {/* ── Line 2: smaller ── */}
                            <p
                                className="font-semibold text-white leading-tight tracking-tight whitespace-nowrap"
                                style={{ fontSize: 'clamp(0.78rem, 2vw, 0.95rem)', opacity: 0.85 }}
                            >
                                The Room Decides The Rhythm
                            </p>
                            {/* ── Line 3: bigger, bolder ── */}
                            <p
                                className="font-black text-white leading-tight tracking-tighter whitespace-nowrap mb-5"
                                style={{ fontSize: 'clamp(1.1rem, 3vw, 1.45rem)', marginTop: '0.3rem' }}
                            >
                                Music, Made By Everyone
                            </p>

                            {/* ── Line 4: description, nowrap ── */}
                            <p
                                className="font-medium whitespace-nowrap mb-7"
                                style={{ fontSize: 'clamp(0.65rem, 1.4vw, 0.78rem)', color: 'rgba(255,255,255,0.42)' }}
                            >
                                Converge live crowd signals into a shared, evolving musical sphere.
                            </p>

                            <button
                                onClick={() => setEnteredCoro(true)}
                                className="group relative overflow-hidden flex items-center gap-3 font-black text-black rounded-full transition-transform active:scale-95"
                                style={{
                                    background: '#00D1FF',
                                    padding: '0.95rem 2.4rem',
                                    fontSize: '1rem',
                                    boxShadow: '0 12px 36px rgba(0,209,255,0.30)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#00E5FF'; e.currentTarget.style.boxShadow = '0 18px 55px rgba(0,209,255,0.52)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#00D1FF'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,209,255,0.30)' }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                                <span className="relative z-10">Enter CORO Studio</span>
                                <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
