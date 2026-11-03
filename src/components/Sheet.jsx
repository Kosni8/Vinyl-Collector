import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Bottom sheet modal. */
export default function Sheet({ open, onClose, title, children, full }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={'sheet' + (full ? ' full' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="sheet-grip" />
          <h2>{title}</h2>
          <button className="link-btn" onClick={onClose}>Schließen</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
