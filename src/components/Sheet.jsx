import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CLOSE_DISTANCE = 110 // px pulled down that closes the sheet
const CLOSE_VELOCITY = 0.6 // px/ms flick speed that closes the sheet

/**
 * Follows the visible part of the screen. On iOS the keyboard does not shrink the
 * layout, so a sheet pinned to the bottom would end up behind the keyboard.
 */
function useVisualViewport(active) {
  const [vp, setVp] = useState(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return
    const update = () => setVp({ top: vv.offsetTop, height: vv.height })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])
  return vp
}

/** Bottom sheet modal. Close with the button, a tap outside or by pulling it down. */
export default function Sheet({ open, onClose, title, children, full }) {
  const sheet = useRef(null)
  const body = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const vp = useVisualViewport(open)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Pull down to close: from the header always, from the content when it is scrolled to the top.
  useEffect(() => {
    const el = sheet.current
    if (!open || !el) return
    let drag = null

    const setY = (y, animate) => {
      el.style.transition = animate ? 'transform 0.22s ease-out' : 'none'
      el.style.transform = y ? `translateY(${y}px)` : ''
    }
    const start = (e) => {
      if (e.touches.length !== 1) return (drag = null)
      const inHeader = e.target.closest('.sheet-header')
      const atTop = (body.current?.scrollTop ?? 0) <= 0
      if (!inHeader && !atTop) return (drag = null)
      if (e.target.closest('input[type="range"], [data-no-sheet-drag]')) return (drag = null)
      drag = { y0: e.touches[0].clientY, t0: e.timeStamp, dy: 0, active: false, dead: false }
    }
    const move = (e) => {
      if (!drag || drag.dead) return
      const dy = e.touches[0].clientY - drag.y0
      if (!drag.active) {
        if (dy < -4) return (drag.dead = true) // scrolling up: leave it to the content
        if (dy < 8) return
        drag.active = true
        document.activeElement?.blur?.()
      }
      e.preventDefault()
      drag.dy = Math.max(0, dy - 8)
      setY(drag.dy, false)
    }
    const end = (e) => {
      if (!drag?.active) return (drag = null)
      const speed = drag.dy / Math.max(1, e.timeStamp - drag.t0)
      if (drag.dy > CLOSE_DISTANCE || (speed > CLOSE_VELOCITY && drag.dy > 30)) {
        setY(el.offsetHeight, true)
        setTimeout(() => closeRef.current?.(), 200)
      } else {
        setY(0, true)
      }
      drag = null
    }

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [open])

  if (!open) return null
  const backdropStyle = vp ? { top: vp.top, height: vp.height, bottom: 'auto' } : undefined
  return createPortal(
    <div className="sheet-backdrop" style={backdropStyle} onClick={onClose}>
      <div ref={sheet} className={'sheet' + (full ? ' full' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="sheet-grip" />
          <h2>{title}</h2>
          <button className="link-btn" onClick={onClose}>Schließen</button>
        </div>
        <div ref={body} className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
