import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { CameraIcon } from './Icons.jsx'

// Load the ZXing-C++ WebAssembly decoder from our own site (no CDN).
prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']
let detector
const getDetector = () => (detector ??= new BarcodeDetector({ formats: FORMATS }))

/** Reads the first EAN/UPC code from an image, video frame or bitmap. */
export async function detectBarcode(source) {
  const codes = await getDetector().detect(source)
  return codes.find((c) => c.rawValue)?.rawValue ?? null
}

/** Full-screen camera overlay that reports the first barcode it reads. */
export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const done = useRef(false)

  const finish = (code) => {
    if (done.current) return
    done.current = true
    navigator.vibrate?.(50)
    onResult(code)
  }

  useEffect(() => {
    let stream
    let timer
    let stopped = false

    const scan = async () => {
      if (stopped || done.current) return
      const video = videoRef.current
      if (video && video.readyState >= 2 && video.videoWidth) {
        try {
          const code = await detectBarcode(video)
          if (code) return finish(code)
        } catch (e) {
          console.warn(e)
        }
      }
      timer = setTimeout(scan, 150)
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const track = s.getVideoTracks()[0]
        // continuous autofocus where the browser supports it
        track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
        const video = videoRef.current
        video.srcObject = s
        await video.play().catch(() => {})
        scan()
      })
      .catch((e) => {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Kein Kamerazugriff. Bitte in den iPhone-Einstellungen erlauben.'
            : 'Kamera konnte nicht gestartet werden.',
        )
      })

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fromPhoto = async (file) => {
    setBusy(true)
    setError(null)
    try {
      const bitmap = await createImageBitmap(file)
      const code = await detectBarcode(bitmap)
      if (code) finish(code)
      else setError('Auf dem Foto wurde kein Barcode erkannt. Versuch es näher und gerade von vorne.')
    } catch {
      setError('Foto konnte nicht gelesen werden.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="scanner">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className="scanner-frame" />
      <div className="scanner-top">
        <button className="btn light" onClick={onClose}>Abbrechen</button>
      </div>
      <div className="scanner-bottom">
        <p>{error ?? (busy ? 'Foto wird gelesen …' : 'Barcode auf der Rückseite in den Rahmen halten')}</p>
        <label className="btn light block">
          <CameraIcon width={18} height={18} /> Stattdessen Foto vom Barcode machen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) fromPhoto(f)
            }}
          />
        </label>
        <form
          className="row"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (manual.trim()) finish(manual.trim())
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
