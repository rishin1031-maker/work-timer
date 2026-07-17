import { useLayoutEffect, useRef } from 'react'

/** Positions a sliding thumb under the active `[data-pill]` child. */
export function usePillThumb(activeKey, deps = []) {
  const trackRef = useRef(null)
  const thumbRef = useRef(null)

  useLayoutEffect(() => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb) return

    function place() {
      const active = activeKey
        ? track.querySelector(`[data-pill="${activeKey}"]`)
        : null

      if (!active) {
        thumb.style.opacity = '0'
        return
      }

      thumb.style.opacity = '1'
      thumb.style.width = `${active.offsetWidth}px`
      thumb.style.height = `${active.offsetHeight}px`
      thumb.style.transform = `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`
    }

    place()

    const ro = new ResizeObserver(place)
    ro.observe(track)
    window.addEventListener('resize', place)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', place)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, ...deps])

  return { trackRef, thumbRef }
}
