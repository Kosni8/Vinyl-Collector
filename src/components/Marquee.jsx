import { useLayoutEffect, useRef, useState } from 'react'

/** Shows text normally; if it is too wide it scrolls slowly like a ticker. */
export default function Marquee({ text, className = '' }) {
  const box = useRef(null)
  const measure = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const check = () => {
      const overflow = measure.current.scrollWidth > box.current.clientWidth + 1
      setWidth(overflow ? measure.current.scrollWidth : 0)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [text])

  const gap = 32
  return (
    <span ref={box} className={'marquee ' + className}>
      <span ref={measure} className="marquee-measure" aria-hidden="true">{text}</span>
      {width ? (
        <span
          className="marquee-track"
          style={{ '--shift': `-${width + gap}px`, animationDuration: `${(width + gap) / 30}s`, gap }}
          aria-label={text}
        >
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </span>
      ) : (
        <span>{text}</span>
      )}
    </span>
  )
}
