/**
 * Spinning record shown while something loads. The same drawing is inlined in
 * index.html, so it already turns before the app's JavaScript has arrived.
 */
export function SpinningVinyl({ size = 96 }) {
  return (
    <svg className="loader-vinyl" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="49" fill="#1d1b19" />
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx="50" cy="50" r={22 + i * 3} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="0.6" />
      ))}
      <path d="M50 50L12 18L22 9Z" fill="#fff" opacity="0.12" />
      <path d="M50 50L88 82L78 91Z" fill="#fff" opacity="0.08" />
      <circle cx="50" cy="50" r="17" fill="#d9565f" />
      <circle cx="50" cy="50" r="11" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="2.4" fill="#fff8ef" />
    </svg>
  )
}

/** Centred spinning record with an optional line of text below. */
export default function Loader({ text = 'Lädt …', size = 96, full = false }) {
  return (
    <div className={full ? 'splash loader' : 'loader'} role="status">
      <SpinningVinyl size={size} />
      {text && <p className="muted small">{text}</p>}
    </div>
  )
}
