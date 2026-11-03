import { useState } from 'react'

/** Swipeable image gallery (CSS scroll-snap). */
export default function Gallery({ images }) {
  const [index, setIndex] = useState(0)
  if (!images.length) return <div className="gallery empty">Keine Bilder</div>
  return (
    <div className="gallery-wrap">
      <div
        className="gallery"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {images.map((src, i) => (
          <div className="gallery-slide" key={src + i}>
            <img src={src} alt="" loading={i > 1 ? 'lazy' : 'eager'} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="gallery-dots">
          {images.map((_, i) => (
            <span key={i} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}
