import React, { useRef, useState, useEffect, useId, useCallback } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { FramerTooltip } from './FramerTooltip';

export type CardTheme = 
  | 'cyan'      // آبی آسمانی (کاشت ایمپلنت)
  | 'purple'    // بنفش رویایی (لابراتوار پروتز)
  | 'pink'      // صورتی متالیک (چک صیادی)
  | 'amber'     // طلایی / کهربایی (اقساط)
  | 'gemini'    // هاله نیلگون جمنای (هوش مصنوعی)
  | 'emerald'   // سبز زمردی (انبار و متریال)
  | 'rose'      // رز و مرجانی (پیامک و یادآوری)
  | 'teal';     // فیروزه‌ای نئونی (رادیولوژی)

interface FolderCardProps {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeAlert?: boolean;
  alertDot?: boolean;
  onClick: () => void;
  theme?: CardTheme;
  subtitle?: string;
  className?: string;
  summaryWidget?: React.ReactNode;
  extraAction?: React.ReactNode;
  actionTooltip?: string;
  children?: React.ReactNode;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  title,
  icon,
  badge,
  badgeAlert = false,
  alertDot,
  onClick,
  theme = 'cyan',
  subtitle,
  className = '',
  summaryWidget,
  extraAction,
  actionTooltip,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 180, height: 94 });
  const [isPressing, setIsPressing] = useState(false);
  const lastHapticTime = useRef<number>(0);
  const uniqueId = useId().replace(/:/g, '_');
  const { impactLight } = useHapticFeedback();

  // Subtle haptic vibration trigger for touch-first dental terminals
  const triggerSubtleHaptic = useCallback(() => {
    const now = performance.now();
    if (now - lastHapticTime.current > 100) {
      lastHapticTime.current = now;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          // ignore silently
        }
      }
      impactLight();
    }
  }, [impactLight]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsPressing(true);
    triggerSubtleHaptic();
  };

  const handlePointerUp = () => {
    setIsPressing(false);
  };

  const handlePointerCancel = () => {
    setIsPressing(false);
  };

  const handlePointerLeave = () => {
    setIsPressing(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const newW = Math.round(rect.width);
          const newH = Math.round(rect.height);
          setDims(prev => {
            if (prev.width === newW && prev.height === newH) return prev;
            return { width: newW, height: newH };
          });
        }
      }
    };

    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Theme color accents: Distinct fluid ambient tints and neon accents
  const getThemeStyles = () => {
    switch (theme) {
      case 'purple':
        return {
          gradStart: '#ffffff',
          gradMid: '#fdfbfe',
          gradEnd: '#fbf7ff',
          borderColor: 'rgba(216, 180, 254, 0.75)',
          fluidGlow: 'bg-radial from-purple-400/20 via-violet-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-purple-100 text-purple-900 border-purple-300',
        };
      case 'pink':
        return {
          gradStart: '#ffffff',
          gradMid: '#fffbfa',
          gradEnd: '#fff5f7',
          borderColor: 'rgba(251, 207, 232, 0.75)',
          fluidGlow: 'bg-radial from-pink-400/20 via-rose-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-pink-100 text-pink-900 border-pink-300',
        };
      case 'amber':
        return {
          gradStart: '#ffffff',
          gradMid: '#fffef9',
          gradEnd: '#fffbf0',
          borderColor: 'rgba(253, 230, 138, 0.75)',
          fluidGlow: 'bg-radial from-amber-400/20 via-yellow-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'emerald':
        return {
          gradStart: '#ffffff',
          gradMid: '#fcfdfb',
          gradEnd: '#f4fbf6',
          borderColor: 'rgba(167, 243, 208, 0.75)',
          fluidGlow: 'bg-radial from-emerald-400/20 via-teal-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'gemini':
        return {
          gradStart: '#ffffff',
          gradMid: '#fcfdff',
          gradEnd: '#f0f9ff',
          borderColor: 'rgba(165, 243, 252, 0.75)',
          fluidGlow: 'bg-radial from-cyan-400/20 via-blue-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-cyan-100 text-cyan-900 border-cyan-300',
        };
      case 'rose':
        return {
          gradStart: '#ffffff',
          gradMid: '#fffafb',
          gradEnd: '#fff1f2',
          borderColor: 'rgba(254, 205, 211, 0.75)',
          fluidGlow: 'bg-radial from-rose-400/20 via-orange-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-rose-100 text-rose-900 border-rose-300',
        };
      case 'teal':
        return {
          gradStart: '#ffffff',
          gradMid: '#fbfdfd',
          gradEnd: '#f0fdfa',
          borderColor: 'rgba(153, 246, 228, 0.75)',
          fluidGlow: 'bg-radial from-teal-400/20 via-emerald-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-teal-100 text-teal-900 border-teal-300',
        };
      case 'cyan':
      default:
        return {
          gradStart: '#ffffff',
          gradMid: '#fbfdff',
          gradEnd: '#f0f9ff',
          borderColor: 'rgba(186, 230, 253, 0.75)',
          fluidGlow: 'bg-radial from-sky-400/20 via-cyan-300/10 to-transparent',
          neonColor: 'text-[#c8ff00]',
          badgeStyle: 'bg-sky-100 text-sky-900 border-sky-300',
        };
    }
  };

  const style = getThemeStyles();

  // 100% Authentic Q-Bank Stepped Geometry (Matching Screenshot_20261018_010546_Gallery.jpg):
  // - Top edge runs full width with R=22 rounded corners.
  // - Right edge descends to H_shelf with rounded bottom-right corner.
  // - Shelf runs horizontally toward tabW + curveW.
  // - Smooth S-curve (fillet) descends into the lower left tab at y = H.
  // - Left tab extends to y = H with rounded bottom-left corner and houses the circular button.
  const W = Math.max(dims.width, 140);
  const H = Math.max(dims.height, 92);
  const R = 22; // outer corner radius
  const tabW = Math.min(Math.max(Math.round(W * 0.28), 54), 72);
  const stepH = 22;
  const H_shelf = H - stepH;
  const curveW = 18;

  const svgPath = `
    M 0 ${R}
    A ${R} ${R} 0 0 1 ${R} 0
    L ${W - R} 0
    A ${R} ${R} 0 0 1 ${W} ${R}
    L ${W} ${H_shelf - R}
    A ${R} ${R} 0 0 1 ${W - R} ${H_shelf}
    L ${tabW + curveW} ${H_shelf}
    C ${tabW + 6} ${H_shelf}, ${tabW} ${H}, ${tabW - 10} ${H}
    L ${R} ${H}
    A ${R} ${R} 0 0 1 0 ${H - R}
    Z
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onClick={() => {
        triggerSubtleHaptic();
        onClick();
      }}
      className={`tile active-press relative cursor-pointer group select-none w-full ${isPressing ? 'is-pressing' : ''} ${className}`}
      style={{ filter: 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.07))' }}
    >
      {/* 
        High-Precision Vector Chassis (Exact Q-Bank Stepped Contour from Screenshot):
      */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`grad_${uniqueId}`} x1="0" y1="0" x2={W} y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={style.gradStart} />
            <stop offset="60%" stopColor={style.gradMid} />
            <stop offset="100%" stopColor={style.gradEnd} />
          </linearGradient>
        </defs>
        <path
          d={svgPath}
          fill={`url(#grad_${uniqueId})`}
          stroke={style.borderColor}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Card Contents Container */}
      <div className={`tile-contents relative z-10 p-3 flex flex-col justify-between ${summaryWidget ? 'min-h-[136px] sm:min-h-[142px]' : extraAction ? 'min-h-[120px] sm:min-h-[126px]' : 'min-h-[104px] sm:min-h-[110px]'}`}>
        {/* Subtle Fluid Ambient Glow */}
        <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full blur-xl pointer-events-none opacity-50 ${style.fluidGlow}`} />

        {/* 
          Top Row: 
          - Left: Title + Subtitle in a dedicated column with flex-1 min-w-0
          - Right: 2x Larger 3D Embossed Multi-Color Logo Container (w-13 h-13 to w-14.5 h-14.5)
        */}
        <div className="relative z-10 flex items-start justify-between gap-2.5">
          {/* Title & Subtitle column */}
          <div className="tile-title-group flex flex-col text-right flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5">
              {(alertDot ?? badgeAlert) && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
              )}
              <span className="text-[13.5px] sm:text-[14.5px] font-black text-slate-900 tracking-tight leading-snug group-hover:text-black truncate">
                {title}
              </span>
            </div>
            {subtitle && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold leading-tight mt-0.5 line-clamp-2">
                {subtitle}
              </span>
            )}
          </div>

          {/* 2X LARGER 3D EMBOSSED MULTI-COLOR LOGO SQUIRCLE */}
          <div className="tile-icon-box relative w-13 h-13 sm:w-14.5 sm:h-14.5 rounded-[18px] sm:rounded-[20px] bg-gradient-to-br from-slate-900 via-[#16181f] to-black border-2 border-slate-800/90 flex items-center justify-center shrink-0 shadow-md shadow-black/25 group-hover:scale-108 transition-all p-1">
            {icon}
            {/* Visual pulsing low-stock red warning indicator */}
            {(alertDot ?? badgeAlert) && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20" title="هشدار کسری موجودی / وضعیت نیازمند توجه">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white items-center justify-center text-[7.5px] font-black text-white shadow-xs">
                  !
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Optional Embedded Summary Widget */}
        {summaryWidget && (
          <div className="relative z-10 my-1 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {summaryWidget}
          </div>
        )}

        {/* 
          Bottom Row / Right Shelf: 
          - Left: clearance for the lower tab button + extraAction
          - Right: Status Badge cleanly positioned on the higher shelf
        */}
        <div className="tile-shelf relative z-10 flex items-center justify-between mt-auto pl-12 pr-0.5 gap-1.5">
          <div className="shrink-0 flex items-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {extraAction}
          </div>
          {badge && (
            <span className={`text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-2xs leading-none flex items-center gap-1 shrink-0 ${
              badgeAlert 
                ? 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/30 animate-pulse font-black' 
                : style.badgeStyle
            }`}>
              {badgeAlert && <AlertTriangle className="w-2.5 h-2.5 text-white stroke-[3]" />}
              <span>{badge}</span>
            </span>
          )}
        </div>

        {children}
      </div>

      {/* 
        Circular Action Button with Framer Motion Tooltip:
        Nestled with precision in the extended lower tab at bottom-left corner.
        Depresses smoothly like a keyboard key and reveals animated tooltip on hover.
      */}
      <div className="absolute bottom-2 left-2 z-20">
        <FramerTooltip 
          content={actionTooltip || `ورود به بخش ${title}`} 
          position="top"
        >
          <div 
            className="tile-action-button w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all duration-200 ease-out shadow-2xs border border-slate-200/90 group-hover:bg-[#c8ff00] group-hover:text-black group-hover:border-[#b8f000] group-hover:scale-110"
            aria-label={actionTooltip || `ورود به بخش ${title}`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </div>
        </FramerTooltip>
      </div>
    </div>
  );
};
