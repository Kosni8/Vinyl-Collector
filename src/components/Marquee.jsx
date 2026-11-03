import { useLayoutEffect, useRef, useState } from 'react'

const GAP = 32
const SPEED = 30 // px per second

/** Shows text normally; if it is too wide it scrolls slowly like a ticker. */
export default function Marquee({ text, className = '', vertical = false, speed = SPEED }) {
  const box = useRef(null)
  const measure = useRef(null)
  const track = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const check = () => {
      // in vertical writing mode the text runs along the height
      const len = vertical ? measure.current.scrollHeight : measure.current.scrollWidth
      const room = vertical ? box.current.clientHeight : box.current.clientWidth
      setWidth(len > room + 1 ? len : 0)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(box.current)
    document.fonts?.ready.then(check)
    return () => ro.disconnect()
  }, [text, vertical])

  // Web Animations API instead of CSS keyframes: works reliably in iOS Safari.
  useLayoutEffect(() => {
    if (!width || !track.current?.animate) return
    const distance = width + GAP
    const anim = track.current.animate(
      vertical
        ? [{ transform: 'translateY(0)' }, { transform: `translateY(-${distance}px)` }]
        : [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: (distance / speed) * 1000, iterations: Infinity, delay: 1500 },
    )
    return () => anim.cancel()
  }, [width, vertical, speed])

  return (
    <span ref={box} className={'marquee ' + (vertical ? 'vertical ' : '') + className}>
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
