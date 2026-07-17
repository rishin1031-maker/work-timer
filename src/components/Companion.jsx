import { useEffect, useRef } from 'react'

function usePagePointer() {
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return pointer
}

export function Companion({ mood = 'idle' }) {
  const pointer = usePagePointer()
  const faceRef = useRef(null)
  const leftEyeRef = useRef(null)
  const rightEyeRef = useRef(null)
  const mouthRef = useRef(null)

  useEffect(() => {
    let frame = 0
    let x = 0
    let y = 0

    const tick = () => {
      x += (pointer.current.x - x) * 0.14
      y += (pointer.current.y - y) * 0.14

      if (faceRef.current) {
        faceRef.current.style.transform = `translate(${x * 4}px, ${y * 3}px)`
      }

      const ex = Math.max(-5, Math.min(5, x * 5.5))
      const ey = Math.max(-4, Math.min(4, y * 4.5))
      leftEyeRef.current?.setAttribute('transform', `translate(${ex} ${ey})`)
      rightEyeRef.current?.setAttribute('transform', `translate(${ex} ${ey})`)

      if (mouthRef.current) {
        const curve =
          mood === 'done' ? 10 : mood === 'break' ? 4 : mood === 'working' ? 7 : 6
        mouthRef.current.setAttribute('d', `M36 58 Q50 ${58 + curve} 64 58`)
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [pointer, mood])

  return (
    <div className="companion companion-emoji" aria-hidden="true">
      <div className="emoji-face" ref={faceRef}>
        <svg viewBox="0 0 100 100" className="emoji-svg">
          <circle cx="50" cy="50" r="38" className="emoji-ring" />
          <g ref={leftEyeRef}>
            <circle cx="37" cy="43" r="4" className="emoji-dot" />
          </g>
          <g ref={rightEyeRef}>
            <circle cx="63" cy="43" r="4" className="emoji-dot" />
          </g>
          <path
            ref={mouthRef}
            className="emoji-mouth"
            d="M36 58 Q50 64 64 58"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}
