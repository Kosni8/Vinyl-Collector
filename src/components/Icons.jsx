const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const HomeIcon = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M12 2.5 1.5 12h3v9.5h6v-6h3v6h6V12h3z" /></svg>
)
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></svg>
)
export const ShelfIcon = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M3 3h3.2v18H3zM7.6 3h3.2v18H7.6zM12.2 3h3.2v18h-3.2z" /><path d="m16.4 3.9 3-.8 3.6 17-3 .8z" />
  </svg>
)
export const BarcodeIcon = (p) => (
  <svg {...base} {...p}><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7.5 8v8M10.5 8v8M13.5 8v8M16.5 8v8" /></svg>
)
export const GearIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
)
export const PersonIcon = (p) => (
  <svg {...base} {...p} fill="currentColor" stroke="none"><circle cx="12" cy="7.5" r="4.5" /><path d="M3 21c0-5 4-8 9-8s9 3 9 8z" /></svg>
)
export const DiscIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="3" /><path d="M12 5.5A6.5 6.5 0 0 0 5.5 12" /></svg>
)
export const NoteIcon = (p) => (
  <svg {...base} {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
)
export const BackIcon = (p) => (
  <svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>
)
export const SortIcon = ({ asc, ...p }) => (
  <svg {...base} {...p}>{asc ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}</svg>
)
export const CameraIcon = (p) => (
  <svg {...base} {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
)
export const FilterIcon = (p) => (
  <svg {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
)
export const RefreshIcon = (p) => (
  <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></svg>
)
export const CloseIcon = (p) => (
  <svg {...base} {...p} strokeWidth={2.6}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
