import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const hints = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  [DecodeHintType.TRY_HARDER, true],
])

/** Full-screen camera overlay that reports the first barcode it reads. */
export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    let controls
    let done = false
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, (result, _err, c) => {
        if (result && !done) {
          done = true
          c.stop()
          navigator.vibrate?.(50)
          onResult(result.getText())
        }
      })
      .then((c) => {
        controls = c
        if (done) c.stop()
      })
      .catch((e) => {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Kein Kamerazugriff. Bitte in den iPhone-Einstellungen erlauben.'
            : 'Kamera konnte nicht gestartet werden.',
        )
      })
    return () => controls?.stop()
  }, [onResult])

  return createPortal(
    <div className="scanner">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className="scanner-frame" />
      <div className="scanner-top">
        <button className="btn light" onClick={onClose}>Abbrechen</button>
      </div>
      <div className="scanner-bottom">
        {error ? <p>{error}</p> : <p>Barcode auf der Rückseite in den Rahmen halten</p>}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) onResult(manual.trim())
          }}
        >
          <input inputMode="numeric" placeholder="oder Nummer eintippen" value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="btn light">Los</button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
