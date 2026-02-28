import React from 'react'

/*
  Minimalist ribbon soundwave background.
  – 4 ribbon groups: cyan, magenta, gold, violet
  – Each ribbon = several parallel sine-curve paths forming a "wire mesh" ribbon
  – Gentle CSS keyframe animation (drift + oscillation, 14–18s cycles)
  – Honors prefers-reduced-motion
  – pointer-events: none; z-index: 0 — never blocks clicks
*/

// Generate a smooth sine-based SVG path string
function ribbonPath(width, height, centerY, amplitude, frequency, phaseX) {
    const points = []
    const steps = 120
    for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = t * width
        const y =
            centerY +
            amplitude * Math.sin(t * Math.PI * frequency + phaseX) +
            amplitude * 0.35 * Math.sin(t * Math.PI * frequency * 2.1 + phaseX * 0.7) +
            amplitude * 0.18 * Math.cos(t * Math.PI * frequency * 0.6 + phaseX * 1.4)
        points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return points.join(' ')
}

const RIBBON_GROUPS = [
    {
        color: '#35D7FF',
        lines: 12,
        centerY: 0.48,
        amplitude: 90,
        frequency: 3.2,
        phaseX: 0,
        spread: 100,
        maxOpacity: 0.38,
        animClass: 'ribbon-drift-1',
    },
    {
        color: '#FF4FD8',
        lines: 10,
        centerY: 0.52,
        amplitude: 75,
        frequency: 2.8,
        phaseX: 2.1,
        spread: 85,
        maxOpacity: 0.30,
        animClass: 'ribbon-drift-2',
    },
    {
        color: '#FFC45A',
        lines: 8,
        centerY: 0.50,
        amplitude: 65,
        frequency: 3.8,
        phaseX: 4.2,
        spread: 70,
        maxOpacity: 0.24,
        animClass: 'ribbon-drift-3',
    },
    {
        color: '#9B7CFF',
        lines: 6,
        centerY: 0.46,
        amplitude: 55,
        frequency: 2.4,
        phaseX: 1.0,
        spread: 60,
        maxOpacity: 0.16,
        animClass: 'ribbon-drift-4',
    },
]

const W = 1920
const H = 1080

export default function RibbonWavesBackground() {
    return (
        <div
            className="fixed inset-0 z-0 overflow-hidden"
            style={{ pointerEvents: 'none' }}
            aria-hidden="true"
        >
            {/* Deep navy gradient base */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, #050814 0%, #070B1E 50%, #050A18 100%)',
                }}
            />

            {/* SVG ribbon groups */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 w-full h-full"
                style={{ opacity: 1 }}
            >
                {RIBBON_GROUPS.map((group, gi) => {
                    const paths = []
                    for (let i = 0; i < group.lines; i++) {
                        const t = (i / (group.lines - 1)) - 0.5 // -0.5 → +0.5
                        const offsetY = t * group.spread
                        const distFromCenter = Math.abs(t)
                        const opacity = Math.max(0, group.maxOpacity * (1 - distFromCenter * 1.6))
                        if (opacity < 0.01) continue
                        const centerPx = group.centerY * H + offsetY
                        const phaseShift = group.phaseX + i * 0.18
                        const d = ribbonPath(W, H, centerPx, group.amplitude, group.frequency, phaseShift)
                        paths.push(
                            <path
                                key={`${gi}-${i}`}
                                d={d}
                                fill="none"
                                stroke={group.color}
                                strokeWidth={0.8 + (1 - distFromCenter) * 0.6}
                                strokeOpacity={opacity}
                                strokeLinecap="round"
                            />
                        )
                    }
                    return (
                        <g key={gi} className={group.animClass}>
                            {paths}
                        </g>
                    )
                })}
            </svg>

            {/* Soft center vignette for text readability */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse 70% 65% at 50% 50%, transparent 20%, rgba(5,8,20,0.65) 100%)',
                }}
            />
        </div>
    )
}
