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
        <linearGradient id="minadent-bg" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2dd4bf" />
          <stop offset="0.45" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0f4c47" />
        </linearGradient>
        <radialGradient id="minadent-glow" cx="0.32" cy="0.22" r="0.85">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="minadent-tooth" x1="16" y1="9" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef8f6" />
        </linearGradient>
        <filter id="minadent-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" floodColor="#04302b" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect width="48" height="48" rx="13.5" fill="url(#minadent-bg)" />
      <rect width="48" height="48" rx="13.5" fill="url(#minadent-glow)" />
      <rect x="1" y="1" width="46" height="46" rx="12.5" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />

      <g filter="url(#minadent-shadow)">
        <path
          d="M24 9.2
             C20.6 9.2 17.9 10.1 16.6 12.6
             C15.4 14.9 15.2 18 15.7 21.3
             C16.2 24.7 17.1 29 18.3 33.6
             C18.9 35.9 19.5 37.6 20 38.6
             C20.5 39.6 21.2 40.2 22 39.6
             C22.7 39.1 23.1 37.6 23.5 35.7
             C23.7 34.7 23.9 33.6 24 32.6
             C24.1 33.6 24.3 34.7 24.5 35.7
             C24.9 37.6 25.3 39.1 26 39.6
             C26.8 40.2 27.5 39.6 28 38.6
             C28.5 37.6 29.1 35.9 29.7 33.6
             C30.9 29 31.8 24.7 32.3 21.3
             C32.8 18 32.6 14.9 31.4 12.6
             C30.1 10.1 27.4 9.2 24 9.2 Z"
          fill="url(#minadent-tooth)"
        />
        <path d="M24 13.5 C24 20 23.6 27 23.3 32" stroke="#cfe9e5" strokeWidth="0.9" strokeLinecap="round" opacity="0.65" />
      </g>

      <ellipse cx="20" cy="15.5" rx="3.1" ry="5.4" fill="#ffffff" opacity="0.55" transform="rotate(-18 20 15.5)" />
      <ellipse cx="20.6" cy="14.4" rx="1.3" ry="2.4" fill="#ffffff" opacity="0.75" transform="rotate(-18 20.6 14.4)" />
    </svg>
  )
}

export function MinadentLogoMonochrome({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="مینادنت">
      <path
        d="M24 9.2 C20.6 9.2 17.9 10.1 16.6 12.6 C15.4 14.9 15.2 18 15.7 21.3 C16.2 24.7 17.1 29 18.3 33.6 C18.9 35.9 19.5 37.6 20 38.6 C20.5 39.6 21.2 40.2 22 39.6 C22.7 39.1 23.1 37.6 23.5 35.7 C23.7 34.7 23.9 33.6 24 32.6 C24.1 33.6 24.3 34.7 24.5 35.7 C24.9 37.6 25.3 39.1 26 39.6 C26.8 40.2 27.5 39.6 28 38.6 C28.5 37.6 29.1 35.9 29.7 33.6 C30.9 29 31.8 24.7 32.3 21.3 C32.8 18 32.6 14.9 31.4 12.6 C30.1 10.1 27.4 9.2 24 9.2 Z"
        fill="currentColor"
      />
    </svg>
  )
}
