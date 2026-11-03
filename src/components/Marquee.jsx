import { useLayoutEffect, useRef, useState } from 'react'

const GAP = 32
const SPEED = 30 // px per second

/** Shows text normally; if it is too wide it scrolls slowly like a ticker. */
export default function Marquee({ text, className = '' }) {
  const box = useRef(null)
  const measure = useRef(null)
  const track = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const check = () => {
      const overflow = measure.current.scrollWidth > box.current.clientWidth + 1
      setWidth(overflow ? measure.current.scrollWidth : 0)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(box.current)
    document.fonts?.ready.then(check)
    return () => ro.disconnect()
  }, [text])

  // Web Animations API instead of CSS keyframes: works reliably in iOS Safari.
  useLayoutEffect(() => {
    if (!width || !track.current?.animate) return
    const distance = width + GAP
    const anim = track.current.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: (distance / SPEED) * 1000, iterations: Infinity, delay: 1500 },
    )
    return () => anim.cancel()
  }, [width])

  return (
    <span ref={box} className={'marquee ' + className}>
      <span ref={measure} className="marquee-measure" aria-hidden="true">{text}</span>
      {width ? (
        <span ref={track} className="marquee-track" style={{ gap: GAP }} aria-label={text}>
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </span>
      ) : (
        <span>{text}</span>
      )}
    </span>
  )
}
