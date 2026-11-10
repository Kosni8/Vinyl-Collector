import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MAX_ZOOM = 5

/**
 * Full-screen cropper: move the picture with one finger, zoom with two fingers or
 * the slider. Resolves with a JPEG blob of the framed area.
 *
 * aspect: width / height of the frame. round: shows a circle (profile picture).
 */
export default function ImageCropper({ file, aspect = 1, round = false, maxSize = 1600, title, onCancel, onDone }) {
  const stage = useRef(null)
  const [img, setImg] = useState(null) // { el, w, h, url }
  const [frame, setFrame] = useState({ w: 300, h: 300 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 }) // zoom relative to "just covers the frame"
  const pointers = useRef(new Map())
  const gesture = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight, url })
    el.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  useLayoutEffect(() => {
    const measure = () => {
      const box = stage.current.getBoundingClientRect()
      let w = Math.min(box.width - 32, 600)
      let h = w / aspect
      if (h > box.height - 32) {
        h = box.height - 32
        w = h * aspect
      }
      setFrame({ w, h })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [aspect])

  const baseScale = img ? Math.max(frame.w / img.w, frame.h / img.h) : 1

  // Keeps the picture covering the whole frame.
  const clamp = ({ zoom, x, y }) => {
    zoom = Math.min(MAX_ZOOM, Math.max(1, zoom))
    if (!img) return { zoom, x, y }
    const s = baseScale * zoom
    const maxX = Math.max(0, (img.w * s - frame.w) / 2)
    const maxY = Math.max(0, (img.h * s - frame.h) / 2)
    return { zoom, x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }

  // Re-clamp when the frame size changes (rotation).
  useEffect(() => {
    setView((v) => clamp(v))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.w, frame.h, img])

  const startGesture = () => {
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      gesture.current = { type: 'pan', x0: pts[0].x, y0: pts[0].y, view: view }
    } else if (pts.length >= 2) {
      const [a, b] = pts
      gesture.current = {
        type: 'pinch',
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        view: view,
      }
    } else {
      gesture.current = null
    }
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    startGesture()
  }
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const pts = [...pointers.current.values()]
    if (g.type === 'pan' && pts.length === 1) {
      setView(clamp({ zoom: g.view.zoom, x: g.view.x + pts[0].x - g.x0, y: g.view.y + pts[0].y - g.y0 }))
    } else if (g.type === 'pinch' && pts.length >= 2) {
      const [a, b] = pts
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / g.dist
      const zoom = Math.min(MAX_ZOOM, Math.max(1, g.view.zoom * ratio))
      const k = zoom / g.view.zoom
      // zoom around the point between the fingers, follow the fingers when they move
      const box = stage.current.getBoundingClientRect()
      const cx = g.mx - (box.left + box.width / 2)
      const cy = g.my - (box.top + box.height / 2)
      const mx = (a.x + b.x) / 2 - g.mx
      const my = (a.y + b.y) / 2 - g.my
      setView(clamp({ zoom, x: cx + (g.view.x - cx) * k + mx, y: cy + (g.view.y - cy) * k + my }))
    }
  }
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId)
    startGesture()
  }

  const save = () => {
    const s = baseScale * view.zoom
    const sw = frame.w / s
    const sh = frame.h / s
    const sx = img.w / 2 - view.x / s - sw / 2
    const sy = img.h / 2 - view.y / s - sh / 2
    // longest side at most maxSize, never upscaled
    const outW = Math.round(Math.min(sw, aspect >= 1 ? maxSize : maxSize * aspect))
    const outH = Math.round(outW / aspect)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    canvas.getContext('2d').drawImage(img.el, sx, sy, sw, sh, 0, 0, outW, outH)
    canvas.toBlob((blob) => onDone(blob), 'image/jpeg', 0.88)
  }

  const s = baseScale * view.zoom
  return createPortal(
    <div className="cropper">
      <div className="cropper-top">
        <button className="link-btn light" onClick={onCancel}>Abbrechen</button>
        <strong>{title}</strong>
        <button className="link-btn light" disabled={!img} onClick={save}>Fertig</button>
      </div>
      <div
        ref={stage}
        className="cropper-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {img && (
          <img
            src={img.url}
            alt=""
            draggable={false}
            style={{
              width: img.w * s,
              height: img.h * s,
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px)`,
            }}
          />
        )}
        <div className={'cropper-frame' + (round ? ' round' : '')} style={{ width: frame.w, height: frame.h }} />
      </div>
      <div className="cropper-bottom">
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => {
            const zoom = Number(e.target.value)
            const k = zoom / view.zoom
            setView(clamp({ zoom, x: view.x * k, y: view.y * k }))
          }}
          aria-label="Zoom"
        />
        <p>Mit einem Finger verschieben, mit zwei Fingern oder dem Regler zoomen.</p>
      </div>
    </div>,
    document.body,
  )
}
