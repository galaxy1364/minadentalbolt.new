import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface FloatingNotificationBadgeProps {
  unreadCount?: number;
  onClick: () => void;
}

export const FloatingNotificationBadge: React.FC<FloatingNotificationBadgeProps> = ({
  unreadCount = 0,
  onClick
}) => {
  // 1. Vertical position state with localStorage persistence
  const [topPos, setTopPos] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('minadental_notif_badge_top');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val > 60 && val < window.innerHeight - 80) {
          return val;
        }
      }
    } catch {
      // fallback
    }
    return Math.max(100, Math.floor(window.innerHeight * 0.25));
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartY = useRef<number>(0);
  const initialTopY = useRef<number>(topPos);
  const hasMoved = useRef<boolean>(false);

  // Bounds clamp helper
  const clampTop = (val: number) => {
    const minTop = 60; // Below top status bar / header
    const maxTop = Math.max(minTop + 40, window.innerHeight - 100); // Above bottom dock
    return Math.min(Math.max(val, minTop), maxTop);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    initialTopY.current = topPos;
    hasMoved.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    if (Math.abs(deltaY) > 4) {
      hasMoved.current = true;
    }
    const newTop = clampTop(initialTopY.current + deltaY);
    setTopPos(newTop);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    try {
      localStorage.setItem('minadental_notif_badge_top', topPos.toString());
    } catch {
      // ignore
    }
    if (!hasMoved.current) {
      onClick();
    }
  };

  // Mouse drag handlers for desktop/web preview
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
    initialTopY.current = topPos;
    hasMoved.current = false;
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      if (Math.abs(deltaY) > 4) {
        hasMoved.current = true;
      }
      setTopPos(clampTop(initialTopY.current + deltaY));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      try {
        localStorage.setItem('minadental_notif_badge_top', topPos.toString());
      } catch {
        // ignore
      }
      if (!hasMoved.current) {
        onClick();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Listen to window resize to ensure it doesn't get pushed off-screen
  useEffect(() => {
    const onResize = () => {
      setTopPos((prev) => clampTop(prev));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Only render when there is an active unread notification
  if (!unreadCount || unreadCount <= 0) {
    return null;
  }

  return (
    <aside
      aria-label="نشانگر یادآوری‌ها و اعلانات"
      style={{ top: `${topPos}px` }}
      className={`fixed right-0 z-40 select-none touch-none transition-shadow ${
        isDragging ? 'scale-105 opacity-95 cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* 
        iOS 27 Half-Pill Floating Edge Tab:
        - Width increased by 1/3: w-7 (28px, hugs right screen border)
        - Height exactly doubled: h-16 (64px) for premium ergonomics and visibility
        - Tactile grip ridges & ringing swinging bell
        - Smooth vertical drag & drop with touch or mouse
        - Tap opens the slide-out drawer
      */}
      <div
        onTouchStart={(e) => {
          triggerHaptic('light');
          handleTouchStart(e);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {
          if (!hasMoved.current) triggerHaptic('medium');
          handleTouchEnd();
        }}
        onMouseDown={handleMouseDown}
        className="relative flex flex-col items-center justify-between bg-emerald-600/95 hover:bg-emerald-700 border-y border-l border-emerald-400 rounded-l-2xl shadow-[-3px_4px_16px_rgba(5,150,105,0.45)] backdrop-blur-md w-7 h-16 py-2 group active:scale-95 transition-all cursor-pointer"
        title="بکشید تا بالا و پایین جابجا شود · لمس کنید تا باز شود"
      >
        {/* Subtle glow on edge */}
        <div className="absolute inset-0 bg-white/20 rounded-l-2xl blur-[1px] pointer-events-none group-hover:bg-white/30 transition-colors" />

        {/* Top Mini Drag Ridge Indicator */}
        <div className="flex flex-col gap-0.5 items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
          <span className="w-2.5 h-0.5 rounded-full bg-white/70" />
          <span className="w-1.5 h-0.5 rounded-full bg-white/50" />
        </div>

        {/* Realistic Ringing Bell Icon */}
        <div className="relative flex items-center justify-center z-10 pl-0.5 my-auto">
          <Bell className="w-4 h-4 text-white stroke-[2.4] animate-bell-ring drop-shadow-xs" />

          {/* Pulsing Unread Counter Dot Badge */}
          <span className="absolute -top-2.5 -left-2.5 flex items-center justify-center min-w-[15px] h-[15px] px-1 bg-red-500 border border-white text-[8.5px] font-black text-white rounded-full shadow-xs font-mono leading-none">
            {toPersianDigits(unreadCount)}
          </span>
        </div>

        {/* Bottom Mini Grip Dot */}
        <div className="w-1 h-1 rounded-full bg-white/60 group-hover:bg-white transition-colors" />
      </div>
    </aside>
  );
};
