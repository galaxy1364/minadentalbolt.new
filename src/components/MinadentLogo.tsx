export function MinadentLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`} role="img" aria-label="مینادنتال" style={{ filter: 'drop-shadow(0 3px 1px rgba(20,61,70,.36)) drop-shadow(0 7px 6px rgba(12,99,105,.25))' }}>
      <defs>
        <linearGradient id="mina-tooth" x1="9" y1="5" x2="36" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf5"/><stop offset=".49" stopColor="#d9f8f4"/><stop offset="1" stopColor="#6ac7bd"/></linearGradient>
        <linearGradient id="mina-inlay" x1="19" y1="16" x2="35" y2="39" gradientUnits="userSpaceOnUse"><stop stopColor="#35d3bc"/><stop offset=".55" stopColor="#0b827e"/><stop offset="1" stopColor="#28459b"/></linearGradient>
      </defs>
      <path d="M24 7.4c-4.8-2.7-11.8-2.2-15 2.5-4.1 6.2-.9 13.6 1.2 20.1 1.6 5.2 2.6 11.6 6.5 11.6 4.7 0 3.4-13.4 7.3-13.4s2.6 13.4 7.3 13.4c3.9 0 4.9-6.4 6.5-11.6 2.1-6.5 5.3-13.9 1.2-20.1C35.8 5.2 28.8 4.7 24 7.4Z" fill="url(#mina-tooth)" stroke="#116b75" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M14 10.5c3.3-2.4 6.8-1.8 10-.1 3.2-1.7 6.7-2.3 10 .1" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12.6 23.7c1.4 6.7 2.7 12.4 4.2 14.2M35.4 23.7c-1.4 6.7-2.7 12.4-4.2 14.2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".8"/>
      <path d="M18 17c4.1 3.6 7 4 12 1.2 2.2-1.2 4.2-2.1 6.4-2.1-1.4 5.7-5.8 8-8.6 9.2-2.7 1.2-5.9 2.5-7.7 7.3-.8 2.1-1.2 4.4-1.5 7.1-1-8.5-2.3-11-8.8-16.7Z" fill="url(#mina-inlay)" stroke="#076a74" strokeWidth=".8" strokeLinejoin="round"/>
      <path d="M22 18.7c4.5 2.8 8.7-.7 12-1" stroke="#a7fff0" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

export function MinadentLogoMonochrome({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-label="مینادنتال">
      <path
        d="M24 9.2 C20.6 9.2 17.9 10.1 16.6 12.6 C15.4 14.9 15.2 18 15.7 21.3 C16.2 24.7 17.1 29 18.3 33.6 C18.9 35.9 19.5 37.6 20 38.6 C20.5 39.6 21.2 40.2 22 39.6 C22.7 39.1 23.1 37.6 23.5 35.7 C23.7 34.7 23.9 33.6 24 32.6 C24.1 33.6 24.3 34.7 24.5 35.7 C24.9 37.6 25.3 39.1 26 39.6 C26.8 40.2 27.5 39.6 28 38.6 C28.5 37.6 29.1 35.9 29.7 33.6 C30.9 29 31.8 24.7 32.3 21.3 C32.8 18 32.6 14.9 31.4 12.6 C30.1 10.1 27.4 9.2 24 9.2 Z"
        fill="currentColor"
      />
    </svg>
  )
}
