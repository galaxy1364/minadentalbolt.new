export function MinadentLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="مینادنت"
    >
      <defs>
        <linearGradient id="minadent-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" />
          <stop offset="0.5" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="minadent-tooth" x1="14" y1="10" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ccfbf1" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="48" height="48" rx="13" fill="url(#minadent-grad)" />
      {/* Decorative arc — smile curve */}
      <path d="M10 30 Q24 42 38 30" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Tooth shape — stylized molar */}
      <path
        d="M24 10 C20 10 17 12 16 15 C15 18 15 22 16 26 C17 30 18 35 19 38 C19.5 39.5 20.5 40 21.5 39 C22.5 38 23 35 24 33 C25 35 25.5 38 26.5 39 C27.5 40 28.5 39.5 29 38 C30 35 31 30 32 26 C33 22 33 18 32 15 C31 12 28 10 24 10 Z"
        fill="url(#minadent-tooth)"
      />
      {/* Highlight gleam */}
      <ellipse cx="20.5" cy="16" rx="1.8" ry="3" fill="rgba(255,255,255,0.6)" transform="rotate(-15 20.5 16)" />
      {/* Small dot — molar center groove */}
      <circle cx="24" cy="22" r="1.2" fill="rgba(13,148,136,0.3)" />
    </svg>
  )
}

export function MinadentLogoMonochrome({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="مینادنت">
      <path
        d="M24 10 C20 10 17 12 16 15 C15 18 15 22 16 26 C17 30 18 35 19 38 C19.5 39.5 20.5 40 21.5 39 C22.5 38 23 35 24 33 C25 35 25.5 38 26.5 39 C27.5 40 28.5 39.5 29 38 C30 35 31 30 32 26 C33 22 33 18 32 15 C31 12 28 10 24 10 Z"
        fill="currentColor"
      />
    </svg>
  )
}
