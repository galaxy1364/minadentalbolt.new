import React from 'react';

interface Logo3DProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * 3D Embossed Multi-Color Dashboard / Clinic Home Logo
 */
export const Logo3DHome: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(16,185,129,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="homeRoofGrad" x1="24" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="homeWallGrad" x1="10" y1="20" x2="38" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="homeDoorGrad" x1="24" y1="28" x2="24" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
      <radialGradient id="homeBevel" cx="24" cy="12" r="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <filter id="homeEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* Base Shadow */}
    <ellipse cx="24" cy="44" rx="18" ry="3" fill="#0f172a" fillOpacity="0.2" />
    {/* 3D Clinic Building Body */}
    <path
      d="M10 22L24 10L38 22V41C38 42.6569 36.6569 44 35 44H13C11.3431 44 10 42.6569 10 41V22Z"
      fill="url(#homeWallGrad)"
      stroke="#94a3b8"
      strokeWidth="1.2"
      filter="url(#homeEmboss)"
    />
    {/* 3D Roof with Depth & Bevel */}
    <path
      d="M7 23L24 7L41 23H35L24 12L13 23H7Z"
      fill="url(#homeRoofGrad)"
      stroke="#10b981"
      strokeWidth="0.8"
    />
    <path d="M24 7L38 20H32L24 12V7Z" fill="#ffffff" fillOpacity="0.35" />
    {/* Medical Cross on Gable */}
    <rect x="22" y="15" width="4" height="9" rx="1.5" fill="#ffffff" />
    <rect x="19.5" y="17.5" width="9" height="4" rx="1.5" fill="#ffffff" />
    <rect x="22.5" y="15.5" width="3" height="8" rx="1" fill="#10b981" />
    <rect x="20" y="18" width="8" height="3" rx="1" fill="#10b981" />
    {/* 3D Glass Door with Specular Sheen */}
    <rect x="19" y="29" width="10" height="15" rx="3" fill="url(#homeDoorGrad)" stroke="#0e7490" strokeWidth="1" />
    <path d="M20 30L27 30L22 43H20V30Z" fill="#ffffff" fillOpacity="0.4" />
    {/* Golden Clinic Knob */}
    <circle cx="21.5" cy="37" r="1.3" fill="#f59e0b" stroke="#d97706" strokeWidth="0.6" />
    {/* Left & Right Clinic Windows */}
    <rect x="13" y="27" width="4.5" height="5.5" rx="1.2" fill="#38bdf8" fillOpacity="0.85" stroke="#0284c7" strokeWidth="0.8" />
    <rect x="30.5" y="27" width="4.5" height="5.5" rx="1.2" fill="#38bdf8" fillOpacity="0.85" stroke="#0284c7" strokeWidth="0.8" />
    {/* Specular Highlight */}
    <path d="M10 22L24 10L27 12L13 24H10V22Z" fill="url(#homeBevel)" />
  </svg>
);

/**
 * 3D Embossed Multi-Color Patients & Medical Records Logo
 */
export const Logo3DPatients: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(2,132,199,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="folderGrad" x1="6" y1="12" x2="38" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="toothPearlGrad" x1="28" y1="14" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <radialGradient id="toothGlint" cx="30" cy="18" r="8" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <filter id="patientEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* Background Patient EMR Folder */}
    <path
      d="M6 14C6 11.7909 7.79086 10 10 10H18L22 14H36C38.2091 14 40 15.7909 40 18V38C40 40.2091 38.2091 42 36 42H10C7.79086 42 6 40.2091 6 38V14Z"
      fill="url(#folderGrad)"
      stroke="#bae6fd"
      strokeWidth="1"
      filter="url(#patientEmboss)"
    />
    <path d="M6 18H40V38C40 40.2091 38.2091 42 36 42H10C7.79086 42 6 40.2091 6 38V18Z" fill="#0284c7" fillOpacity="0.5" />
    {/* Embossed Medical Stethoscope Heart */}
    <path
      d="M14 26C14 23.7909 15.7909 22 18 22C19.5 22 20.8 22.8 21.5 24C22.2 22.8 23.5 22 25 22C27.2091 22 29 23.7909 29 26C29 29.5 21.5 35 21.5 35C21.5 35 14 29.5 14 26Z"
      fill="#ef4444"
      stroke="#b91c1c"
      strokeWidth="0.8"
    />
    {/* Prominent 3D Anatomical Tooth Overlay */}
    <g filter="url(#patientEmboss)">
      <path
        d="M26 18C26 14.5 29.5 13 33 13C36.5 13 40 14.5 40 18C40 21.5 39 26 38 31C37.2 35 36.2 39 34.5 39C33.5 39 33.2 34 33 32C32.8 34 32.5 39 31.5 39C29.8 39 28.8 35 28 31C27 26 26 21.5 26 18Z"
        fill="url(#toothPearlGrad)"
        stroke="#94a3b8"
        strokeWidth="1"
      />
      {/* Specular Dental Highlight */}
      <ellipse cx="31" cy="18" rx="2.5" ry="4" fill="url(#toothGlint)" transform="rotate(-15 31 18)" />
      {/* Cyan Dental Seal Accent */}
      <circle cx="33" cy="22" r="2.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.8" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Treatments & Palmer Chart Logo
 */
export const Logo3DTreatments: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(20,184,166,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="crownGrad" x1="12" y1="8" x2="36" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="45%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="endoPulpGrad" x1="24" y1="14" x2="24" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="60%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#9f1239" />
      </linearGradient>
      <linearGradient id="gridBarGrad" x1="6" y1="24" x2="42" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0d9488" />
        <stop offset="50%" stopColor="#14b8a6" />
        <stop offset="100%" stopColor="#2dd4bf" />
      </linearGradient>
      <radialGradient id="laserGlint" cx="24" cy="14" r="6" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c8ff00" />
        <stop offset="60%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
      </radialGradient>
      <filter id="treatEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.28" />
      </filter>
    </defs>
    {/* 3D Palmer Grid Axis Background */}
    <rect x="22.5" y="4" width="3" height="40" rx="1.5" fill="url(#gridBarGrad)" opacity="0.85" />
    <rect x="4" y="22.5" width="40" height="3" rx="1.5" fill="url(#gridBarGrad)" opacity="0.85" />
    <circle cx="24" cy="24" r="3.5" fill="#042f2e" stroke="#2dd4bf" strokeWidth="1" />
    {/* 3D Anatomical Crown with Dual Roots */}
    <g filter="url(#treatEmboss)">
      <path
        d="M13 15C13 10 18 8 24 8C30 8 35 10 35 15C35 20 33 26 31 33C29.5 38 28.5 42 27 42C25.8 42 25.5 35 24 33C22.5 35 22.2 42 21 42C19.5 42 18.5 38 17 33C15 26 13 20 13 15Z"
        fill="url(#crownGrad)"
        stroke="#94a3b8"
        strokeWidth="1.2"
      />
      {/* 3D Root Canal / Endo Pulp Chamber in Glowing Crimson */}
      <path
        d="M21 16C21 14 23 13 24 13C25 13 27 14 27 16C27 19 26 23 25.5 28C25 32 25.2 37 24.8 37C24.5 37 24.2 32 24 28C23.8 32 23.5 37 23.2 37C22.8 37 23 32 22.5 28C22 23 21 19 21 16Z"
        fill="url(#endoPulpGrad)"
      />
      {/* Golden Composite Filling Island on Occlusal Surface */}
      <ellipse cx="24" cy="12" rx="5" ry="2.2" fill="#f59e0b" stroke="#d97706" strokeWidth="0.8" />
      {/* Specular Dental Sparkle */}
      <circle cx="18" cy="14" r="2.5" fill="url(#laserGlint)" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Financial & Sayad Checks Logo
 */
export const Logo3DFinancial: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(217,119,6,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="goldBarGrad" x1="6" y1="12" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#f59e0b" />
        <stop offset="70%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="sayadCardGrad" x1="10" y1="8" x2="38" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="50%" stopColor="#db2777" />
        <stop offset="100%" stopColor="#9d174d" />
      </linearGradient>
      <radialGradient id="coinBevel" cx="18" cy="16" r="10" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <filter id="finEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* 3D Bank Sayad Card in Background */}
    <rect
      x="8"
      y="10"
      width="32"
      height="22"
      rx="4"
      fill="url(#sayadCardGrad)"
      stroke="#fbcfe8"
      strokeWidth="1"
      filter="url(#finEmboss)"
      transform="rotate(-8 24 21)"
    />
    {/* Holographic Chip on Card */}
    <rect x="12" y="15" width="6" height="5" rx="1" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" transform="rotate(-8 15 17.5)" />
    {/* 3D Golden Bullion / Coin in Foreground */}
    <g filter="url(#finEmboss)">
      <circle cx="28" cy="29" r="13" fill="url(#goldBarGrad)" stroke="#fef08a" strokeWidth="1.2" />
      <circle cx="28" cy="29" r="10.5" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
      {/* Persian Rial/Toman Currency Symbol Emboss */}
      <path
        d="M24 25C24 23.5 25.5 22 28 22C30.5 22 32 23.5 32 25C32 27 29.5 28 28 29V32M28 35V35.5"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="22" r="6" fill="url(#coinBevel)" />
      {/* Emerald Verification Stamp */}
      <circle cx="36" cy="36" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
      <path d="M34 36L35.5 37.5L38.5 34.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Appointments & Jalali Calendar Logo
 */
export const Logo3DAppointments: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(37,99,235,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="calBodyGrad" x1="8" y1="12" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="calHeaderGrad" x1="8" y1="8" x2="40" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="clockGrad" x1="24" y1="22" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c8ff00" />
        <stop offset="100%" stopColor="#84cc16" />
      </linearGradient>
      <filter id="calEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* 3D Calendar Body */}
    <rect x="7" y="10" width="34" height="32" rx="6" fill="url(#calBodyGrad)" stroke="#94a3b8" strokeWidth="1" filter="url(#calEmboss)" />
    {/* Crimson Top Ribbon */}
    <path d="M7 16C7 12.6863 9.68629 10 13 10H35C38.3137 10 41 12.6863 41 16V18H7V16Z" fill="url(#calHeaderGrad)" />
    {/* Spiral Binding Rings */}
    <rect x="13" y="6" width="3" height="7" rx="1.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
    <rect x="22.5" y="6" width="3" height="7" rx="1.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
    <rect x="32" y="6" width="3" height="7" rx="1.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.8" />
    {/* Grid Day Indicators */}
    <circle cx="14" cy="24" r="1.5" fill="#94a3b8" />
    <circle cx="20" cy="24" r="1.5" fill="#94a3b8" />
    <circle cx="14" cy="30" r="1.5" fill="#94a3b8" />
    <circle cx="20" cy="30" r="1.5" fill="#94a3b8" />
    <circle cx="14" cy="36" r="1.5" fill="#94a3b8" />
    {/* 3D Analog Clock Dial Overlay in Neon Lime / Emerald */}
    <g filter="url(#calEmboss)">
      <circle cx="31" cy="31" r="9.5" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.2" />
      <circle cx="31" cy="31" r="8" fill="url(#clockGrad)" />
      {/* Clock Hands */}
      <line x1="31" y1="31" x2="31" y2="26" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="31" y1="31" x2="35" y2="31" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="31" cy="31" r="1.2" fill="#dc2626" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Services Menu (Grid Launcher) Logo
 */
export const Logo3DGridServices: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_8px_rgba(139,92,246,0.35)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="cubeG1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="cubeG2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a7f3d0" /><stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="cubeG3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde047" /><stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="cubeG4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f472b6" /><stop offset="100%" stopColor="#db2777" />
      </linearGradient>
      <filter id="gridCubeEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.25" />
      </filter>
    </defs>
    {/* 4 Multi-Color 3D Faceted App Cubes */}
    <rect x="8" y="8" width="13" height="13" rx="4" fill="url(#cubeG1)" filter="url(#gridCubeEmboss)" />
    <path d="M9 9L18 9L12 17H9V9Z" fill="#ffffff" fillOpacity="0.4" />

    <rect x="27" y="8" width="13" height="13" rx="4" fill="url(#cubeG2)" filter="url(#gridCubeEmboss)" />
    <path d="M28 9L37 9L31 17H28V9Z" fill="#ffffff" fillOpacity="0.4" />

    <rect x="8" y="27" width="13" height="13" rx="4" fill="url(#cubeG3)" filter="url(#gridCubeEmboss)" />
    <path d="M9 28L18 28L12 36H9V28Z" fill="#ffffff" fillOpacity="0.4" />

    <rect x="27" y="27" width="13" height="13" rx="4" fill="url(#cubeG4)" filter="url(#gridCubeEmboss)" />
    <path d="M28 28L37 28L31 36H28V28Z" fill="#ffffff" fillOpacity="0.4" />
    
    {/* Central 3D Sparkle Star */}
    <circle cx="24" cy="24" r="3.5" fill="#c8ff00" stroke="#0f172a" strokeWidth="1" />
  </svg>
);

/**
 * 3D Embossed Multi-Color Thumb Zone (Zap Fast Actions) Logo
 */
export const Logo3DThumbZap: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_4px_10px_rgba(200,255,0,0.5)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="zapGoldGrad" x1="28" y1="4" x2="16" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#c8ff00" />
        <stop offset="70%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="zapEmboss" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* 3D Multi-faceted Lightning Bolt with Bevel */}
    <g filter="url(#zapEmboss)">
      <path
        d="M28 4L12 24H24L18 44L36 20H24L28 4Z"
        fill="url(#zapGoldGrad)"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Specular Bevel Cut */}
      <path d="M28 4L24 16H20L12 24L28 4Z" fill="#ffffff" fillOpacity="0.6" />
      <path d="M24 20L36 20L18 44L24 28V20Z" fill="#a16207" fillOpacity="0.4" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Titanium Implant Fixture Logo
 */
export const Logo3DImplant: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(14,165,233,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="impCrown" x1="16" y1="4" x2="38" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <linearGradient id="impAbutment" x1="20" y1="18" x2="34" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="impFixture" x1="18" y1="24" x2="36" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="40%" stopColor="#64748b" />
        <stop offset="75%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <filter id="imp3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    {/* Glowing Osseointegration Bio-Halo */}
    <ellipse cx="27" cy="38" rx="16" ry="7" fill="#0284c7" fillOpacity="0.2" />
    {/* Monolithic Zirconia Crown */}
    <path
      d="M17 12C17 7 21 4 27 4C33 4 37 7 37 12C37 16 35 19 32 20H22C19 19 17 16 17 12Z"
      fill="url(#impCrown)"
      stroke="#94a3b8"
      strokeWidth="1.2"
      filter="url(#imp3d)"
    />
    <ellipse cx="24" cy="9" rx="3.5" ry="1.5" fill="#ffffff" fillOpacity="0.8" />
    {/* Gold Transmucosal Abutment */}
    <path
      d="M21 19H33L31 24H23L21 19Z"
      fill="url(#impAbutment)"
      stroke="#b45309"
      strokeWidth="0.8"
      filter="url(#imp3d)"
    />
    {/* 3D Titanium Fixture Threads */}
    <g filter="url(#imp3d)">
      <path
        d="M23 24H31L30 28H24L23 24ZM23.5 29H30.5L29.5 33H24.5L23.5 29ZM24 34H30L29 38H25L24 34ZM24.5 39H29.5L28.5 43H25.5L24.5 39ZM25 44H29L27 49L25 44Z"
        fill="url(#impFixture)"
        stroke="#475569"
        strokeWidth="0.8"
      />
      {/* Thread Highlights in Neon Cyan */}
      <line x1="24" y1="28" x2="30" y2="28" stroke="#38bdf8" strokeWidth="1" />
      <line x1="24.5" y1="33" x2="29.5" y2="33" stroke="#38bdf8" strokeWidth="1" />
      <line x1="25" y1="38" x2="29" y2="38" stroke="#38bdf8" strokeWidth="1" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Dental Prosthetics Lab Logo
 */
export const Logo3DLab: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(168,85,247,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="labFlaskGrad" x1="14" y1="10" x2="40" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#e9d5ff" />
        <stop offset="45%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7e22ce" />
      </linearGradient>
      <linearGradient id="bridgeGrad" x1="10" y1="28" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f3e8ff" />
        <stop offset="100%" stopColor="#d8b4fe" />
      </linearGradient>
      <filter id="lab3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    {/* Background Lab Flask with Ceramic Porcelain Liquid */}
    <path
      d="M23 6H31V14L41 34C43 38 41 44 36 46C31 48 23 48 18 46C13 44 11 38 13 34L23 14V6Z"
      fill="url(#labFlaskGrad)"
      stroke="#d8b4fe"
      strokeWidth="1.2"
      filter="url(#lab3d)"
    />
    <path d="M15 36C18 34 36 34 39 36C40 38 39 44 36 45C31 47 23 47 18 45C15 44 14 38 15 36Z" fill="#a855f7" />
    <circle cx="27" cy="40" r="2.5" fill="#facc15" />
    <circle cx="22" cy="35" r="1.5" fill="#facc15" />
    <circle cx="32" cy="37" r="1.8" fill="#facc15" />
    {/* 3D Zirconia 3-Unit Bridge Overlay */}
    <g filter="url(#lab3d)">
      <path
        d="M12 28C12 24 16 22 20 23C22 23 23 25 27 25C31 25 32 23 34 23C38 22 42 24 42 28C42 33 40 37 38 39H16C14 37 12 33 12 28Z"
        fill="url(#bridgeGrad)"
        stroke="#9333ea"
        strokeWidth="1"
      />
      {/* Occlusal Anatomical Carvings */}
      <circle cx="18" cy="28" r="2" fill="#c084fc" />
      <circle cx="27" cy="29" r="2.2" fill="#c084fc" />
      <circle cx="36" cy="28" r="2" fill="#c084fc" />
      {/* Specular Highlight */}
      <path d="M14 26C14 24 16 23 19 24L17 29H14V26Z" fill="#ffffff" fillOpacity="0.7" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Sayad Check Certificate Logo
 */
export const Logo3DSayadCheck: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(244,63,94,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="checkPaper" x1="6" y1="10" x2="48" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fff1f2" />
        <stop offset="50%" stopColor="#fce7f3" />
        <stop offset="100%" stopColor="#fbcfe8" />
      </linearGradient>
      <linearGradient id="checkGoldSeal" x1="32" y1="26" x2="48" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="check3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* 3D Bank Sayad Check Body */}
    <rect
      x="6"
      y="12"
      width="42"
      height="28"
      rx="5"
      fill="url(#checkPaper)"
      stroke="#f43f5e"
      strokeWidth="1.2"
      filter="url(#check3d)"
    />
    {/* Top Bank Header Strip in Deep Rose */}
    <path d="M6 17C6 14.2386 8.23858 12 11 12H43C45.7614 12 48 14.2386 48 17V20H6V17Z" fill="#e11d48" />
    <rect x="10" y="14.5" width="14" height="2.5" rx="1.2" fill="#ffffff" />
    {/* 16-Digit Sayad Unique ID Guideline */}
    <rect x="10" y="24" width="22" height="2" rx="1" fill="#be123c" />
    <rect x="10" y="28" width="18" height="2" rx="1" fill="#9f1239" opacity="0.6" />
    <rect x="10" y="32" width="14" height="2" rx="1" fill="#9f1239" opacity="0.4" />
    {/* 3D Central Bank Holographic Security Seal */}
    <g filter="url(#check3d)">
      <circle cx="38" cy="31" r="7.5" fill="url(#checkGoldSeal)" stroke="#ffffff" strokeWidth="1" />
      <circle cx="38" cy="31" r="5.5" fill="#047857" stroke="#fef08a" strokeWidth="0.8" />
      {/* Checkmark of Authenticity */}
      <path d="M35.5 31L37.2 32.8L40.8 29.2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Installments & Vault Logo
 */
export const Logo3DInstallments: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(217,119,6,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="vaultDoor" x1="8" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="45%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="goldCoins" x1="12" y1="20" x2="36" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <filter id="inst3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    {/* 3D Bank Vault Safe Box */}
    <rect x="8" y="10" width="38" height="34" rx="8" fill="url(#vaultDoor)" stroke="#b45309" strokeWidth="1.2" filter="url(#inst3d)" />
    {/* Inner Safe Vault Bevel */}
    <rect x="12" y="14" width="30" height="26" rx="5" fill="#78350f" fillOpacity="0.25" stroke="#fef3c7" strokeWidth="0.8" />
    {/* 3D Golden Stack of Coins */}
    <g filter="url(#inst3d)">
      <ellipse cx="22" cy="33" rx="8" ry="3.5" fill="url(#goldCoins)" stroke="#fef08a" strokeWidth="0.8" />
      <ellipse cx="22" cy="29" rx="8" ry="3.5" fill="url(#goldCoins)" stroke="#fef08a" strokeWidth="0.8" />
      <ellipse cx="22" cy="25" rx="8" ry="3.5" fill="url(#goldCoins)" stroke="#fef08a" strokeWidth="0.8" />
      <ellipse cx="22" cy="21" rx="8" ry="3.5" fill="url(#goldCoins)" stroke="#ffffff" strokeWidth="1" />
    </g>
    {/* Upward Growth Trend Arrow in Emerald */}
    <g filter="url(#inst3d)">
      <circle cx="35" cy="23" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
      <path d="M31 25L35 21L39 25M35 21V27" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Gemini AI Assistant Logo
 */
export const Logo3DAiGemini: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_16px_rgba(168,85,247,0.5)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="geminiSparkle" x1="8" y1="8" x2="46" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="35%" stopColor="#818cf8" />
        <stop offset="70%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
      <radialGradient id="geminiCore" cx="27" cy="27" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#c8ff00" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </radialGradient>
      <filter id="ai3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* Ambient Astral Aura */}
    <circle cx="27" cy="27" r="20" fill="url(#geminiCore)" opacity="0.6" />
    {/* 3D Curvilinear Gemini Star Crystal */}
    <path
      d="M27 4C27 16.5 16.5 27 4 27C16.5 27 27 37.5 27 50C27 37.5 37.5 27 50 27C37.5 27 27 16.5 27 4Z"
      fill="url(#geminiSparkle)"
      stroke="#ffffff"
      strokeWidth="1.2"
      filter="url(#ai3d)"
    />
    {/* Internal Facet Reflections */}
    <path d="M27 10C27 19 19 27 10 27C19 27 27 35 27 44V10Z" fill="#ffffff" fillOpacity="0.4" />
    <circle cx="27" cy="27" r="4.5" fill="#ffffff" stroke="#c8ff00" strokeWidth="1" />
  </svg>
);

/**
 * 3D Embossed Multi-Color Inventory & Materials Logo
 */
export const Logo3DInventory: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(16,185,129,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="crateGrad" x1="10" y1="12" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#065f46" />
      </linearGradient>
      <filter id="inv3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* 3D Isometric Medical Supply Crate */}
    <path
      d="M27 8L44 18V36L27 46L10 36V18L27 8Z"
      fill="url(#crateGrad)"
      stroke="#6ee7b7"
      strokeWidth="1.2"
      filter="url(#inv3d)"
    />
    {/* Crate Top Face */}
    <path d="M27 8L44 18L27 28L10 18L27 8Z" fill="#10b981" />
    <path d="M27 8L44 18L27 28V8Z" fill="#ffffff" fillOpacity="0.25" />
    {/* Front Left Face */}
    <path d="M10 18L27 28V46L10 36V18Z" fill="#059669" />
    {/* Front Right Face */}
    <path d="M27 28L44 18V36L27 46V28Z" fill="#047857" />
    {/* Dental Composite Syringe / Sterile Symbol on Crate */}
    <circle cx="27" cy="34" r="5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
    <path d="M24.5 34H29.5M27 31.5V36.5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * 3D Embossed Multi-Color SMS & Reminders Bell Logo
 */
export const Logo3DReminders: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(244,63,94,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="bellGoldGrad" x1="16" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="35%" stopColor="#f59e0b" />
        <stop offset="70%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
      <linearGradient id="bubbleGrad" x1="28" y1="2" x2="48" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <filter id="bell3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    {/* Realistic 3D Brass Bell Body */}
    <g filter="url(#bell3d)">
      <path
        d="M27 8C20 8 16 14 16 22C16 30 11 34 11 36H43C43 34 38 30 38 22C38 14 34 8 27 8Z"
        fill="url(#bellGoldGrad)"
        stroke="#fef08a"
        strokeWidth="1.2"
      />
      {/* Top Bell Loop */}
      <circle cx="27" cy="8" r="3" fill="#d97706" stroke="#fde047" strokeWidth="1" />
      {/* Specular Glint */}
      <path d="M21 12C23 10 26 9 27 9V34H21V12Z" fill="#ffffff" fillOpacity="0.4" />
      {/* Clapper / Pendulum Ball */}
      <circle cx="27" cy="40" r="4.5" fill="#b45309" stroke="#fef08a" strokeWidth="1" />
    </g>
    {/* 3D Coral SMS Speech Bubble Overlay */}
    <g filter="url(#bell3d)">
      <rect x="30" y="6" width="16" height="12" rx="4" fill="url(#bubbleGrad)" stroke="#ffffff" strokeWidth="1" />
      <path d="M34 18L32 21L37 18H34Z" fill="#e11d48" />
      <line x1="33" y1="10" x2="43" y2="10" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="33" y1="13.5" x2="39" y2="13.5" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Radiology & RVG / OPG Logo
 */
export const Logo3DXRay: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(20,184,166,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="xraySensor" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <linearGradient id="beamGrad" x1="27" y1="12" x2="27" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
      <filter id="xray3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
      </filter>
    </defs>
    {/* Digital RVG Sensor Screen */}
    <rect x="8" y="10" width="38" height="34" rx="6" fill="url(#xraySensor)" stroke="#2dd4bf" strokeWidth="1.2" filter="url(#xray3d)" />
    {/* Sensor Active Grid Overlay */}
    <rect x="11" y="13" width="32" height="28" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
    {/* Glowing Negative Dental X-Ray Outline */}
    <path
      d="M20 22C20 18 23 16 27 16C31 16 34 18 34 22C34 26 33 30 31.5 35C30.5 38 29.8 41 28.5 41C27.5 41 27.2 36 27 34C26.8 36 26.5 41 25.5 41C24.2 41 23.5 38 22.5 35C21 30 20 26 20 22Z"
      fill="#ffffff"
      fillOpacity="0.85"
      filter="url(#xray3d)"
    />
    <path
      d="M25 24C25 22 26.5 21 27 21C27.5 21 29 22 29 24C29 27 28 30 27 34C26 30 25 27 25 24Z"
      fill="#0f766e"
    />
    {/* Neon Laser Crosshairs */}
    <line x1="27" y1="13" x2="27" y2="41" stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="2 2" />
    <line x1="11" y1="27" x2="43" y2="27" stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="2 2" />
  </svg>
);

/**
 * 3D Embossed Multi-Color Marketing & Campaigns Megaphone Logo
 */
export const Logo3DMarketing: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(236,72,153,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="megaConeGrad" x1="12" y1="14" x2="44" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="50%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>
      <linearGradient id="megaGoldRim" x1="36" y1="10" x2="44" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="mktg3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    {/* 3D Hot Pink Megaphone Cone */}
    <g filter="url(#mktg3d)">
      <path
        d="M16 20L38 12V36L16 28V20Z"
        fill="url(#megaConeGrad)"
        stroke="#fda4af"
        strokeWidth="1.2"
      />
      {/* Golden Front Speaker Rim */}
      <ellipse cx="38" cy="24" rx="4.5" ry="12" fill="url(#megaGoldRim)" stroke="#ffffff" strokeWidth="1" />
      {/* Back Handle / Grip */}
      <rect x="8" y="21" width="8" height="6" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
      <path d="M14 27L12 37H16L18 27H14Z" fill="#ec4899" stroke="#9d174d" strokeWidth="0.8" />
      {/* Festive Golden Stars Burst */}
      <circle cx="44" cy="14" r="2.5" fill="#facc15" />
      <circle cx="47" cy="24" r="3" fill="#c8ff00" />
      <circle cx="44" cy="34" r="2.2" fill="#38bdf8" />
    </g>
  </svg>
);

/**
 * 3D Embossed Palmer Dental Chart Logo (4 Quadrants & Anatomical Tooth)
 */
export const Logo3DPalmerChart: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(20,184,166,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="palmerCrossGrad" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="50%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#115e59" />
      </linearGradient>
      <linearGradient id="palmerToothGrad" x1="28" y1="12" x2="44" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#e0f2fe" />
        <stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
      <filter id="palmer3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
      </filter>
    </defs>
    <g filter="url(#palmer3d)">
      {/* 3D Quadrant Plate */}
      <rect x="8" y="8" width="38" height="38" rx="8" fill="#0f172a" stroke="url(#palmerCrossGrad)" strokeWidth="1.5" />
      {/* Palmer Axis Lines */}
      <line x1="27" y1="11" x2="27" y2="43" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="27" x2="43" y2="27" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" />
      {/* Quadrant Markers: UR, UL, LL, LR */}
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#0d9488" fillOpacity="0.5" />
      <rect x="32" y="13" width="9" height="9" rx="2" fill="#0d9488" fillOpacity="0.8" />
      <rect x="13" y="32" width="9" height="9" rx="2" fill="#0d9488" fillOpacity="0.3" />
      <rect x="32" y="32" width="9" height="9" rx="2" fill="#0d9488" fillOpacity="0.6" />
      {/* 3D Anatomical Molar Overlay in Quadrant 1 */}
      <path
        d="M33 15C31 15 30 17 30 20C30 23 31.5 25 33 25C34 25 34.5 22 35.5 22C36.5 22 37 25 38 25C39.5 25 41 23 41 20C41 17 40 15 38 15C37 15 36.5 16 35.5 16C34.5 16 34 15 33 15Z"
        fill="url(#palmerToothGrad)"
        stroke="#ffffff"
        strokeWidth="0.8"
      />
      {/* Golden Quadrant Indicator "8" */}
      <circle cx="17.5" cy="17.5" r="2.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.6" />
    </g>
  </svg>
);

/**
 * 3D Embossed Guarantee Bank Check Logo
 */
export const Logo3DGuaranteeCheck: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(244,63,94,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="guarVaultGrad" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#9f1239" />
      </linearGradient>
      <linearGradient id="guarGoldSeal" x1="26" y1="20" x2="42" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <filter id="guar3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#guar3d)">
      {/* 3D Slanted Guarantee Check Base */}
      <rect x="8" y="14" width="38" height="26" rx="4" fill="url(#guarVaultGrad)" stroke="#fda4af" strokeWidth="1.2" />
      {/* Guilloche Security Pattern Lines */}
      <line x1="12" y1="20" x2="28" y2="20" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="25" x2="32" y2="25" stroke="#ffe4e6" strokeOpacity="0.6" strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="30" x2="24" y2="30" stroke="#ffe4e6" strokeOpacity="0.6" strokeWidth="1" strokeLinecap="round" />
      {/* Bank Guarantee Hologram Seal */}
      <circle cx="37" cy="27" r="7.5" fill="url(#guarGoldSeal)" stroke="#ffffff" strokeWidth="1" />
      <path d="M37 22L39 26H35L37 22Z" fill="#713f12" />
      <rect x="34.5" y="27" width="5" height="4" rx="1" fill="#713f12" />
      {/* Red Ribbon Bookmark */}
      <path d="M12 11V18L15 15L18 18V11H12Z" fill="#ffffff" />
    </g>
  </svg>
);

/**
 * 3D Embossed Smart POS Terminal Logo
 */
export const Logo3DPosTerminal: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(101,163,13,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="posBodyGrad" x1="12" y1="8" x2="42" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#475569" />
        <stop offset="50%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="posScreenGrad" x1="16" y1="12" x2="38" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#84cc16" />
        <stop offset="100%" stopColor="#4d7c0f" />
      </linearGradient>
      <filter id="pos3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#pos3d)">
      {/* Paper Receipt Slot at Top */}
      <rect x="18" y="6" width="18" height="6" rx="1.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      <line x1="21" y1="9" x2="33" y2="9" stroke="#64748b" strokeWidth="1" strokeDasharray="1.5 1.5" />
      {/* 3D POS Device Body */}
      <rect x="13" y="10" width="28" height="38" rx="5" fill="url(#posBodyGrad)" stroke="#64748b" strokeWidth="1.2" />
      {/* Color LCD Screen */}
      <rect x="16" y="14" width="22" height="15" rx="2.5" fill="url(#posScreenGrad)" stroke="#a3e635" strokeWidth="0.8" />
      <text x="27" y="24" fontSize="7" fontWeight="bold" fill="#ffffff" textAnchor="middle">POS</text>
      {/* Keypad Buttons (3x3) */}
      <circle cx="19" cy="33" r="1.8" fill="#94a3b8" />
      <circle cx="27" cy="33" r="1.8" fill="#94a3b8" />
      <circle cx="35" cy="33" r="1.8" fill="#22c55e" />
      <circle cx="19" cy="38" r="1.8" fill="#94a3b8" />
      <circle cx="27" cy="38" r="1.8" fill="#94a3b8" />
      <circle cx="35" cy="38" r="1.8" fill="#ef4444" />
      <circle cx="19" cy="43" r="1.8" fill="#94a3b8" />
      <circle cx="27" cy="43" r="1.8" fill="#94a3b8" />
      <circle cx="35" cy="43" r="1.8" fill="#eab308" />
      {/* Gold Card Chip Slot Indicator */}
      <rect x="23" y="45.5" width="8" height="1.5" rx="0.75" fill="#facc15" />
    </g>
  </svg>
);

/**
 * 3D Embossed Comprehensive Treatment Plans Logo
 */
export const Logo3DTreatmentPlans: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(217,70,239,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="planGrad" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f0abfc" />
        <stop offset="50%" stopColor="#d946ef" />
        <stop offset="100%" stopColor="#86198f" />
      </linearGradient>
      <filter id="plan3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#plan3d)">
      {/* 3D Clinical Treatment Plan Board */}
      <rect x="10" y="8" width="34" height="38" rx="6" fill="#ffffff" stroke="url(#planGrad)" strokeWidth="1.5" />
      {/* Header Clip in Magenta Gold */}
      <rect x="20" y="6" width="14" height="4" rx="1.5" fill="#c026d3" stroke="#fdf4ff" strokeWidth="0.8" />
      {/* Milestone Check 1: Extraction & Hygiene */}
      <circle cx="17" cy="18" r="3" fill="#22c55e" />
      <path d="M15.5 18L16.8 19.3L18.8 16.8" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      <rect x="23" y="16.5" width="17" height="3" rx="1.5" fill="#cbd5e1" />
      {/* Milestone Check 2: Implant & Crown */}
      <circle cx="17" cy="27" r="3" fill="#d946ef" />
      <path d="M15.5 27L16.8 28.3L18.8 25.8" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
      <rect x="23" y="25.5" width="14" height="3" rx="1.5" fill="#f0abfc" />
      {/* Milestone Check 3: Final Delivery */}
      <circle cx="17" cy="36" r="3" fill="#38bdf8" />
      <rect x="23" y="34.5" width="12" height="3" rx="1.5" fill="#94a3b8" />
    </g>
  </svg>
);

/**
 * 3D Embossed Clinical Analytics & Reports Logo
 */
export const Logo3DReports: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(147,51,234,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="repCol1" x1="14" y1="28" x2="20" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="repCol2" x1="24" y1="18" x2="30" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7e22ce" />
      </linearGradient>
      <linearGradient id="repCol3" x1="34" y1="10" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="rep3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#rep3d)">
      {/* Base Platform */}
      <ellipse cx="27" cy="44" rx="20" ry="4" fill="#0f172a" fillOpacity="0.25" />
      {/* 3D Column 1 (Sky) */}
      <rect x="13" y="28" width="7" height="15" rx="2" fill="url(#repCol1)" stroke="#ffffff" strokeWidth="0.8" />
      {/* 3D Column 2 (Purple) */}
      <rect x="23.5" y="18" width="7" height="25" rx="2" fill="url(#repCol2)" stroke="#ffffff" strokeWidth="0.8" />
      {/* 3D Column 3 (Emerald) */}
      <rect x="34" y="11" width="7" height="32" rx="2" fill="url(#repCol3)" stroke="#ffffff" strokeWidth="0.8" />
      {/* Growth Trend Arrow in Radiant Gold */}
      <path
        d="M14 26L24 16L32 20L41 8"
        stroke="#facc15"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="41,8 37,8 41,12" fill="#facc15" />
    </g>
  </svg>
);

/**
 * 3D Embossed Clinic Settings & Tariff Gear Logo
 */
export const Logo3DSettings: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(100,116,139,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="setGearGrad" x1="12" y1="12" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="setGoldCenter" x1="20" y1="20" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <filter id="set3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#set3d)">
      {/* 3D Precision Titanium Gear */}
      <path
        d="M24 10H30L31 14C32.5 14.5 34 15.3 35.2 16.3L39 14.5L43 18.5L41.2 22.3C42.2 23.5 43 25 43.5 26.5L47.5 27.5V33.5L43.5 34.5C43 36 42.2 37.5 41.2 38.7L43 42.5L39 46.5L35.2 44.7C34 45.7 32.5 46.5 31 47L30 51H24L23 47C21.5 46.5 20 45.7 18.8 44.7L15 46.5L11 42.5L12.8 38.7C11.8 37.5 11 36 10.5 34.5L6.5 33.5V27.5L10.5 26.5C11 25 11.8 23.5 12.8 22.3L11 18.5L15 14.5L18.8 16.3C20 15.3 21.5 14.5 23 14L24 10Z"
        fill="url(#setGearGrad)"
        stroke="#cbd5e1"
        strokeWidth="1.2"
      />
      {/* Golden Clinic Core */}
      <circle cx="27" cy="30.5" r="9" fill="url(#setGoldCenter)" stroke="#ffffff" strokeWidth="1" />
      {/* Medical Cross Center */}
      <rect x="25" y="26.5" width="4" height="8" rx="1" fill="#ffffff" />
      <rect x="23" y="28.5" width="8" height="4" rx="1" fill="#ffffff" />
    </g>
  </svg>
);

/**
 * 3D Embossed Doctor Commissions Medal Logo
 */
export const Logo3DCommissions: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(16,185,129,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="commRibbon" x1="16" y1="24" x2="38" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="commMedal" x1="16" y1="8" x2="38" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <filter id="comm3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#comm3d)">
      {/* Emerald Satin Ribbon Tails */}
      <path d="M22 25L14 46L22 41L26 46L24 25H22Z" fill="url(#commRibbon)" stroke="#065f46" strokeWidth="0.8" />
      <path d="M32 25L40 46L32 41L28 46L30 25H32Z" fill="url(#commRibbon)" stroke="#065f46" strokeWidth="0.8" />
      {/* 3D Gold Medal Circle */}
      <circle cx="27" cy="20" r="13" fill="url(#commMedal)" stroke="#ffffff" strokeWidth="1.2" />
      {/* Laurel Wreath Engraving */}
      <circle cx="27" cy="20" r="9.5" fill="none" stroke="#78350f" strokeWidth="0.8" strokeDasharray="3 2" />
      {/* Doctor Stethoscope Silhouette */}
      <path
        d="M23 16V20C23 22.2 24.8 24 27 24C29.2 24 31 22.2 31 20V16"
        stroke="#78350f"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="25" r="1.5" fill="#78350f" />
    </g>
  </svg>
);

/**
 * 3D Embossed Patient Caller ID Hologram Logo
 */
export const Logo3DCallerId: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(2,132,199,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="callHandset" x1="12" y1="14" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
      <filter id="call3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#call3d)">
      {/* Glowing Radar Rings */}
      <circle cx="36" cy="18" r="8" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="3 2" />
      <circle cx="36" cy="18" r="13" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 3" />
      {/* 3D Phone Handset in Cyan Blue */}
      <path
        d="M15 15C15 12 18 10 21 12L24 16C25.5 18 24.5 20.5 23 21.5C25 25 28 28 31.5 30C32.5 28.5 35 27.5 37 29L41 32C43 35 41 38 38 38C26 38 15 27 15 15Z"
        fill="url(#callHandset)"
        stroke="#ffffff"
        strokeWidth="1.2"
      />
      {/* Green Incoming Call Pulse Indicator */}
      <circle cx="37" cy="17" r="4.5" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
      <path d="M35 17L36.5 18.5L39 15.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Health Insurance & Complementary Claim Logo
 */
export const Logo3DInsurance: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(37,99,235,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="insShieldGrad" x1="12" y1="8" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
      <linearGradient id="insGoldRibbon" x1="20" y1="18" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="ins3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#ins3d)">
      {/* 3D Royal Blue Insurance Shield */}
      <path
        d="M27 9L13 15V27C13 36.5 19 44.5 27 47C35 44.5 41 36.5 41 27V15L27 9Z"
        fill="url(#insShieldGrad)"
        stroke="#93c5fd"
        strokeWidth="1.5"
      />
      {/* Specular Highlight Shield Surface */}
      <path d="M27 10L14 16V27C14 31 16 35 18 38L27 10Z" fill="#ffffff" fillOpacity="0.25" />
      {/* Medical Cross on Shield */}
      <rect x="25" y="19" width="4" height="14" rx="1.5" fill="#ffffff" />
      <rect x="20" y="24" width="14" height="4" rx="1.5" fill="#ffffff" />
      {/* Golden Approved Verification Stamp */}
      <circle cx="34" cy="34" r="5" fill="url(#insGoldRibbon)" stroke="#ffffff" strokeWidth="0.8" />
      <path d="M32 34L33.5 35.5L36 32.5" stroke="#713f12" strokeWidth="1" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Medical Autoclave & Sterilization Logo
 */
export const Logo3DSterilization: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(20,184,166,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="sterBodyGrad" x1="12" y1="12" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="50%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#134e4a" />
      </linearGradient>
      <filter id="ster3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#ster3d)">
      {/* Autoclave Pressure Drum */}
      <circle cx="27" cy="27" r="17" fill="url(#sterBodyGrad)" stroke="#ccfbf1" strokeWidth="1.5" />
      {/* Chamber Window with Steam Vapor Halo */}
      <circle cx="27" cy="27" r="11" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1" />
      {/* Pressure Gauge Hand */}
      <line x1="27" y1="27" x2="31" y2="21" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="27" cy="27" r="2" fill="#ffffff" />
      {/* Bio-Clean Sterile Sparkles */}
      <path d="M17 17L18 19L20 20L18 21L17 23L16 21L14 20L16 19L17 17Z" fill="#38bdf8" />
      <circle cx="36" cy="18" r="2" fill="#facc15" />
      {/* Class B Sterile Stamp */}
      <rect x="21" y="33" width="12" height="4" rx="1.5" fill="#22c55e" stroke="#ffffff" strokeWidth="0.6" />
      <text x="27" y="36.2" fontSize="3" fontWeight="bold" fill="#ffffff" textAnchor="middle">134°C</text>
    </g>
  </svg>
);

/**
 * 3D Embossed Online Patient Booking Portal Logo
 */
export const Logo3DOnlineBooking: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(16,185,129,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="bookPhone" x1="14" y1="8" x2="40" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
      <filter id="book3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#book3d)">
      {/* Smartphone Shell */}
      <rect x="14" y="8" width="26" height="40" rx="5" fill="url(#bookPhone)" stroke="#a7f3d0" strokeWidth="1.2" />
      {/* Screen Area */}
      <rect x="16.5" y="12" width="21" height="30" rx="3" fill="#ffffff" />
      {/* Calendar Grid on Screen */}
      <rect x="19" y="15" width="16" height="4" rx="1" fill="#059669" />
      <circle cx="22" cy="23" r="1.5" fill="#cbd5e1" />
      <circle cx="27" cy="23" r="1.5" fill="#cbd5e1" />
      <circle cx="32" cy="23" r="1.5" fill="#f43f5e" />
      <circle cx="22" cy="28" r="1.5" fill="#cbd5e1" />
      <circle cx="27" cy="28" r="2" fill="#10b981" />
      {/* Golden Touch Finger / Checkmark */}
      <circle cx="27" cy="35" r="4.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
      <path d="M25 35L26.5 36.5L29 33.5" stroke="#713f12" strokeWidth="1" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Digital CAD/CAM Lab Portal Logo
 */
export const Logo3DDigitalLabPortal: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(168,85,247,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="cadMilling" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="50%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#581c87" />
      </linearGradient>
      <filter id="cad3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#cad3d)">
      {/* 3D Zirconia Milling Disc */}
      <circle cx="27" cy="27" r="17" fill="url(#cadMilling)" stroke="#e9d5ff" strokeWidth="1.5" />
      <circle cx="27" cy="27" r="13" fill="#ffffff" stroke="#c084fc" strokeWidth="1" />
      {/* High-Precision 3D Zirconia Crown in Center */}
      <path
        d="M23 23C21 23 20 25 20 28C20 31 22 33 24 33C25 33 25.5 30 27 30C28.5 30 29 33 30 33C32 33 34 31 34 28C34 25 33 23 31 23C30 23 29.5 24 27 24C24.5 24 24 23 23 23Z"
        fill="#9333ea"
        stroke="#581c87"
        strokeWidth="0.8"
      />
      {/* Wireless High-Speed Sync Wave */}
      <path d="M38 12C41 15 42 19 42 23" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="43" cy="27" r="2" fill="#22c55e" />
    </g>
  </svg>
);

/**
 * 3D Embossed SMS Gateway & Telecommunications Tower Logo
 */
export const Logo3DSmsGateway: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(2,132,199,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="smsTower" x1="14" y1="12" x2="40" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <filter id="sms3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#sms3d)">
      {/* Telecom Mast Tower Legs */}
      <path d="M27 12L15 44H20L27 24L34 44H39L27 12Z" fill="url(#smsTower)" stroke="#bae6fd" strokeWidth="1" />
      <line x1="20" y1="36" x2="34" y2="36" stroke="#ffffff" strokeWidth="1.5" />
      <line x1="23" y1="28" x2="31" y2="28" stroke="#ffffff" strokeWidth="1.5" />
      {/* Antenna Emitter Sphere */}
      <circle cx="27" cy="11" r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
      {/* 3D Outgoing Green SMS Envelope */}
      <rect x="29" y="16" width="17" height="12" rx="2" fill="#22c55e" stroke="#ffffff" strokeWidth="0.8" />
      <path d="M29 17L37.5 23L46 17" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * 3D Embossed Clinical Audit Suite Quality Logo
 */
export const Logo3DClinicalAudit: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(147,51,234,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="auditShield" x1="12" y1="8" x2="42" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="50%" stopColor="#7e22ce" />
        <stop offset="100%" stopColor="#4c1d95" />
      </linearGradient>
      <filter id="audit3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#audit3d)">
      {/* Medical Quality Shield */}
      <path
        d="M27 8L12 14V27C12 36.5 18 44.5 27 47C36 44.5 42 36.5 42 27V14L27 8Z"
        fill="url(#auditShield)"
        stroke="#e9d5ff"
        strokeWidth="1.5"
      />
      {/* 100% Quality Badge Star */}
      <circle cx="27" cy="27" r="10.5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
      {/* Checkmark in Gold Badge */}
      <path
        d="M22 27L25.5 30.5L32 23.5"
        stroke="#581c87"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Audit Rating Dots */}
      <circle cx="21" cy="40" r="1.5" fill="#4ade80" />
      <circle cx="27" cy="41" r="1.8" fill="#4ade80" />
      <circle cx="33" cy="40" r="1.5" fill="#4ade80" />
    </g>
  </svg>
);

/**
 * 3D Embossed Real-Time Doctor/Receptionist Live Sync Simulator Logo
 */
export const Logo3DLiveSync: React.FC<Logo3DProps> = ({ size = 44, className = '', glow = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 54 54"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(234,179,8,0.4)]' : ''} ${className}`}
  >
    <defs>
      <linearGradient id="syncRing1" x1="10" y1="10" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="syncRing2" x1="14" y1="14" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <filter id="sync3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.32" />
      </filter>
    </defs>
    <g filter="url(#sync3d)">
      {/* Outer Orbit Ring */}
      <circle cx="27" cy="27" r="17" fill="none" stroke="url(#syncRing1)" strokeWidth="3" strokeDasharray="30 8" />
      {/* Dual Real-Time Sync Arrows */}
      <path d="M42 20L44 26L38 27" fill="#eab308" stroke="#ffffff" strokeWidth="0.8" />
      <path d="M12 34L10 28L16 27" fill="#eab308" stroke="#ffffff" strokeWidth="0.8" />
      {/* Doctor Device (Tablet) */}
      <rect x="18" y="19" width="9" height="13" rx="1.5" fill="url(#syncRing2)" stroke="#ffffff" strokeWidth="0.8" />
      {/* Receptionist Device (Desktop) */}
      <rect x="29" y="21" width="11" height="9" rx="1.5" fill="#10b981" stroke="#ffffff" strokeWidth="0.8" />
      <rect x="33" y="30" width="3" height="3" fill="#64748b" />
      {/* Instant Sync Pulse Dot */}
      <circle cx="27" cy="25" r="2" fill="#ef4444" />
    </g>
  </svg>
);

/**
 * 3D Embossed Multi-Color Main Dental Tooth Logo (for Add-to-Home, Header & Brand)
 * Features the authentic sculpted 3D tooth with iridescent multi-color gradient (violet, magenta, cyan, amber).
 */
export const Logo3DMainDentalTooth: React.FC<Logo3DProps> = ({ size = 32, className = '', glow = true }) => {
  const [hasError, setHasError] = React.useState(false);

  if (!hasError) {
    return (
      <img
        src="/logo.png"
        alt="مینادنتال"
        width={size}
        height={size}
        onError={() => setHasError(true)}
        className={`shrink-0 rounded-[28%] object-cover select-none pointer-events-none transition-transform ${glow ? 'drop-shadow-[0_4px_12px_rgba(168,85,247,0.45)]' : ''} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${glow ? 'drop-shadow-[0_6px_14px_rgba(147,51,234,0.45)]' : ''} ${className}`}
    >
      <defs>
        <linearGradient id="multiColorBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="25%" stopColor="#ec4899" />
          <stop offset="55%" stopColor="#06b6d4" />
          <stop offset="80%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="mainToothPearl" x1="16" y1="12" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#faf5ff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <filter id="mainTooth3d" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#3b0764" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#multiColorBg)" />
      <g filter="url(#mainTooth3d)">
        <path
          d="M24 8.5C18.5 8.5 14.5 12 13.6 17.5C12.8 23 15.2 28.5 18.4 33.8C19.8 36 21.2 37.2 22 36.4C22.8 35.4 23.2 32.8 24 31.4C24.8 32.8 25.2 35.4 26 36.4C26.8 37.2 28.2 36 29.6 33.8C32.8 28.5 35.2 23 34.4 17.5C33.5 12 29.5 8.5 24 8.5Z"
          fill="url(#mainToothPearl)"
        />
        <path
          d="M19 10C15 11.5 13.5 14.8 13.5 18.5C13.5 21.5 14.8 25 16.5 28.5C15.5 24.5 15.2 20.8 16 17C16.6 14.2 18.2 12.2 20.5 11.4C19.8 11.2 19.3 11 19 10Z"
          fill="#ffffff"
          fillOpacity="0.85"
        />
      </g>
    </svg>
  );
};


