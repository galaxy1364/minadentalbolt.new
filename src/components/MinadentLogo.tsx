// MinadentLogo — uses the real branded artwork the user provided
// (public/logo-256.png), not a hand-drawn approximation. Rounded
// corners applied via CSS so it scales correctly at any `size`,
// matching the same rounding used for the generated PWA/home-screen
// icons built from the same source image.
export function MinadentLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo-256.png"
      width={size}
      height={size}
      alt="مینادنت"
      className={`inline-block rounded-[22%] shadow-sm ${className}`}
      style={{ width: size, height: size }}
    />
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
