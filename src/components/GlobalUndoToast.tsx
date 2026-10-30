import React, { useEffect, useState } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { undoManager, UndoAction } from '../utils/undoManager';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

import { toPersianDigits } from '../utils/jalali';

export const GlobalUndoToast: React.FC = () => {
  const [action, setAction] = useState<UndoAction | null>(null);
  const [stackCount, setStackCount] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const [undoSuccess, setUndoSuccess] = useState<boolean>(false);
  const { impactLight, success: hapticSuccess } = useHapticFeedback();

  useEffect(() => {
    return undoManager.subscribe((newAction, count) => {
      setAction(newAction);
      setStackCount(count || 0);
      setProgress(100);
      setUndoSuccess(false);
    });
  }, []);

  useEffect(() => {
    if (!action) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - action.timestamp;
      const remaining = Math.max(0, 6500 - elapsed);
      const pct = (remaining / 6500) * 100;
      setProgress(pct);
      if (remaining <= 0) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [action]);

  if (!action) return null;

  const handleUndo = async () => {
    impactLight();
    const ok = await undoManager.executeUndo();
    if (ok) {
      hapticSuccess();
      setUndoSuccess(true);
      setTimeout(() => {
        undoManager.dismiss();
      }, 1400);
    }
  };

  return (
    <div 
      className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto max-w-md w-full bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex flex-col gap-2 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
              {undoSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-100 truncate">
                  {undoSuccess ? 'اقدام با موفقیت بازگردانی شد' : action.title}
                </span>
                {!undoSuccess && stackCount > 1 && (
                  <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded-full">
                    {toPersianDigits(stackCount)} در صف
                  </span>
                )}
              </div>
              <span className="text-[10.5px] text-slate-400 font-medium truncate">
                {undoSuccess ? 'اطلاعات قبلی بازنشانی گردید' : action.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!undoSuccess && (
              <button
                onClick={handleUndo}
                className="py-1 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>واگرد</span>
              </button>
            )}
            <button
              onClick={() => undoManager.dismiss()}
              className="w-7 h-7 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              aria-label="بستن"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Countdown progress bar */}
        {!undoSuccess && (
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
