import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface FramerTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  tooltipClassName?: string;
  showArrow?: boolean;
}

/**
 * Ultra-smooth Framer Motion Tooltip for MinaDental iOS 27 / Q-Bank Ergonomics
 * - Spring physics easing
 * - Glassmorphic obsidian backdrop with neon accent
 * - Safe z-index layering and collision margin
 * - Zero interference with child click events
 */
export const FramerTooltip: React.FC<FramerTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 120,
  className = '',
  tooltipClassName = '',
  showArrow = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position classes & motion variants
  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return {
          wrapper: 'top-full left-1/2 -translate-x-1/2 pt-2',
          arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-b-4 border-x-4 border-t-0',
          initial: { opacity: 0, y: -6, scale: 0.94 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -4, scale: 0.96 },
        };
      case 'left':
        return {
          wrapper: 'top-1/2 right-full -translate-y-1/2 pr-2',
          arrow: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-l-4 border-y-4 border-r-0',
          initial: { opacity: 0, x: 6, scale: 0.94 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 4, scale: 0.96 },
        };
      case 'right':
        return {
          wrapper: 'top-1/2 left-full -translate-y-1/2 pl-2',
          arrow: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-r-4 border-y-4 border-l-0',
          initial: { opacity: 0, x: -6, scale: 0.94 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -4, scale: 0.96 },
        };
      case 'top':
      default:
        return {
          wrapper: 'bottom-full left-1/2 -translate-x-1/2 pb-2',
          arrow: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-t-4 border-x-4 border-b-0',
          initial: { opacity: 0, y: 6, scale: 0.94 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 4, scale: 0.96 },
        };
    }
  };

  const pos = getPositionStyles();

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && content && (
          <div
            className={`absolute z-50 pointer-events-none select-none ${pos.wrapper}`}
            role="tooltip"
          >
            <motion.div
              initial={pos.initial}
              animate={pos.animate}
              exit={pos.exit}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 28,
                mass: 0.6,
              }}
              className={`relative px-2.5 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md text-white text-[10.5px] font-bold border border-slate-700/80 shadow-xl shadow-black/35 whitespace-nowrap flex items-center gap-1.5 ${tooltipClassName}`}
            >
              {/* Neon accent indicator dot */}
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_6px_#c8ff00] shrink-0" />

              {/* Tooltip Content Text */}
              <span className="leading-tight tracking-tight text-slate-100 font-medium">
                {content}
              </span>

              {/* Pointer Triangle Arrow */}
              {showArrow && (
                <span
                  className={`absolute w-0 h-0 pointer-events-none ${pos.arrow}`}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
