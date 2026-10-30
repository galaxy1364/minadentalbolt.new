import React from 'react';
import { SyncEvent } from '../types/dental';
import { Sparkles, ArrowLeft, CheckCircle2, DollarSign, Calendar, Layers, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface SyncNotificationToastProps {
  event: SyncEvent | null;
  onDismiss: () => void;
  onActionClick?: (event: SyncEvent) => void;
}

export const SyncNotificationToast: React.FC<SyncNotificationToastProps> = ({
  event,
  onDismiss,
  onActionClick
}) => {
  React.useEffect(() => {
    if (event) {
      triggerHaptic('success');
    }
  }, [event?.id]);

  if (!event) return null;

  const getIcon = () => {
    switch (event.type) {
      case 'TREATMENT_REGISTERED':
        return <DollarSign className="w-5 h-5 text-emerald-600" />;
      case 'APPOINTMENT_SCHEDULED':
        return <Calendar className="w-5 h-5 text-sky-600" />;
      case 'PAYMENT_COLLECTED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed top-12 inset-x-3 z-50 flex justify-center pointer-events-none animate-in slide-in-from-top-4 duration-300">
      <div className="pointer-events-auto max-w-lg w-full bg-white/95 backdrop-blur-xl border border-emerald-200/90 rounded-[22px] p-3.5 text-slate-800 shadow-[0_12px_40px_rgba(5,150,105,0.18)] flex items-start gap-3 relative">
        
        {/* Glow indicator */}
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 pr-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-md shadow-2xs">
                سینک زنده ⚡
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {event.platform} · {event.timestamp}
              </span>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onDismiss();
              }}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
            {event.title}
          </h4>

          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
            {event.description}
          </p>

          {event.actionRequired && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700">
                {event.actionRequired}
              </span>

              {onActionClick && (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    onActionClick(event);
                  }}
                  className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                >
                  <span>اقدام سریع</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
