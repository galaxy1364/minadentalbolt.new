import React, { useState, useMemo } from 'react';
import { 
  Send, Layers, Sparkles, CheckCircle2, 
  Smile, ChevronLeft, ChevronRight, Check,
  Zap, Clock, Radio, ArrowLeft
} from 'lucide-react';
import { LabOrder, LabStatus } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

export interface LabOrderStatusVisualizerProps {
  orders: LabOrder[];
  onUpdateStatus?: (orderId: string, status: LabStatus) => void;
  className?: string;
}

export interface LabStageDef {
  id: LabStatus;
  shortLabel: string;
  fullLabel: string;
  stepNumber: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  activeTextColor: string;
}

export const LAB_STAGES: LabStageDef[] = [
  {
    id: 'sent',
    shortLabel: 'ارسال',
    fullLabel: 'ارسال به لابراتوار',
    stepNumber: 1,
    icon: Send,
    color: '#0284c7', // Sky
    bgColor: 'bg-sky-500',
    borderColor: 'border-sky-400',
    activeTextColor: 'text-sky-800'
  },
  {
    id: 'fabrication',
    shortLabel: 'تراش',
    fullLabel: 'ساخت و تراش CAD/CAM',
    stepNumber: 2,
    icon: Layers,
    color: '#d97706', // Amber
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-400',
    activeTextColor: 'text-amber-800'
  },
  {
    id: 'frame_try_in',
    shortLabel: 'فریم',
    fullLabel: 'امتحان فریم در دهان',
    stepNumber: 3,
    icon: Sparkles,
    color: '#7c3aed', // Purple
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-400',
    activeTextColor: 'text-purple-800'
  },
  {
    id: 'ready_for_clinic',
    shortLabel: 'مطب',
    fullLabel: 'آماده تحویل در مطب',
    stepNumber: 4,
    icon: CheckCircle2,
    color: '#059669', // Emerald
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    activeTextColor: 'text-emerald-800'
  },
  {
    id: 'delivered_cemented',
    shortLabel: 'سمان',
    fullLabel: 'سمان و تحویل نهایی',
    stepNumber: 5,
    icon: Smile,
    color: '#db2777', // Pink
    bgColor: 'bg-pink-600',
    borderColor: 'border-pink-400',
    activeTextColor: 'text-pink-800'
  }
];

// Fallback order when list is empty
const FALLBACK_ORDER: LabOrder = {
  id: 'lab-demo-fallback',
  patientId: 'pat-1',
  patientName: 'علی مرادی',
  toothNumber: 'UR5',
  workType: 'روکش تمام زیرکونیا',
  labName: 'لابراتوار پیشرو',
  shade: 'A2',
  sendDate: '۱۴۰۳/۰۸/۰۱',
  deliveryDate: '۱۴۰۳/۰۸/۱۰',
  appointmentDate: '۱۴۰۳/۰۸/۱۲',
  status: 'fabrication',
  cost: 2400000,
  reminderNotice: 'در حال ساخت'
};

export const LabOrderStatusVisualizer: React.FC<LabOrderStatusVisualizerProps> = ({
  orders = [],
  onUpdateStatus,
  className = ''
}) => {
  const { impactLight, impactHeavy, success } = useHapticFeedback();
  const [fallbackStatus, setFallbackStatus] = useState<LabStatus>('fabrication');

  const effectiveOrders = useMemo(() => {
    if (orders.length > 0) return orders;
    return [{ ...FALLBACK_ORDER, status: fallbackStatus }];
  }, [orders, fallbackStatus]);

  // Pick first pending order by default, or the very first order
  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const active = effectiveOrders.find(o => o.status !== 'delivered_cemented');
    return active ? active.id : effectiveOrders[0]?.id || FALLBACK_ORDER.id;
  });

  // Track animation flash state on single tap
  const [lastTappedStage, setLastTappedStage] = useState<LabStatus | null>(null);

  // Active selected order
  const activeOrder = useMemo(() => {
    return effectiveOrders.find(o => o.id === selectedOrderId) || effectiveOrders[0] || FALLBACK_ORDER;
  }, [effectiveOrders, selectedOrderId]);

  const currentStageIndex = useMemo(() => {
    const idx = LAB_STAGES.findIndex(s => s.id === activeOrder.status);
    return idx >= 0 ? idx : 0;
  }, [activeOrder.status]);

  const currentStageDef = LAB_STAGES[currentStageIndex];

  // 1-Tap Single Status Update Handler
  const handleStageTap = (stageId: LabStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (stageId === activeOrder.status) return;

    impactHeavy();
    setLastTappedStage(stageId);
    setTimeout(() => setLastTappedStage(null), 700);

    if (orders.length > 0 && onUpdateStatus) {
      onUpdateStatus(activeOrder.id, stageId);
    } else {
      setFallbackStatus(stageId);
    }
  };

  // 1-Tap Quick Advance to Next Stage
  const handleQuickAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStageIndex < LAB_STAGES.length - 1) {
      const nextStage = LAB_STAGES[currentStageIndex + 1];
      handleStageTap(nextStage.id, e);
    } else {
      // Loop back to first stage for rapid test/reset cycle
      success();
      handleStageTap(LAB_STAGES[0].id, e);
    }
  };

  return (
    <div 
      className={`lab-order-status-visualizer w-full rounded-2xl bg-white/90 backdrop-blur-md p-2 sm:p-2.5 border border-purple-200/90 shadow-2xs text-slate-800 text-right select-none ${className}`}
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header: Active Order Identity & Real-Time Sync Indicator */}
      <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-purple-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-purple-500/15 text-purple-700 flex items-center justify-center shrink-0">
            <Radio className="w-3 h-3 animate-pulse text-purple-600" />
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1">
              <span className="text-[10.5px] font-black text-slate-900 truncate">
                {activeOrder.patientName}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                {activeOrder.toothNumber}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-medium truncate block leading-tight">
              {activeOrder.workType} · {activeOrder.labName}
            </span>
          </div>
        </div>

        {/* 1-Tap Quick Advance Action Button */}
        <button
          type="button"
          onClick={handleQuickAdvance}
          className="lab-advance-btn shrink-0 py-1 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[9.5px] font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
          title="یک‌تپ ارتقا به مرحله بعد (1-Tap Advance)"
        >
          <span>{currentStageIndex === LAB_STAGES.length - 1 ? 'بازنشانی' : 'مرحله بعد'}</span>
          <ArrowLeft className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>

      {/* Multi-Order Tabs Switcher (If multiple orders exist) */}
      {effectiveOrders.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-1.5 no-scrollbar">
          {effectiveOrders.map((ord, idx) => {
            const isSelected = ord.id === activeOrder.id;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  impactLight();
                  setSelectedOrderId(ord.id);
                }}
                className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50'
                }`}
              >
                <span>{ord.patientName.split(' ')[0]}</span>
                <span className="opacity-75 font-mono text-[8px] mr-1">({ord.toothNumber})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 
        Interactive 5-Stage Live Visualizer Stepper:
        - Each node is 1-tap interactive for direct technician updates.
        - Filled background bar connects the stages.
      */}
      <div className="relative pt-1 pb-1">
        {/* Background Connecting Bar */}
        <div className="absolute top-[17px] right-3 left-3 h-1 bg-slate-200/90 rounded-full -z-0">
          <div 
            className="h-full bg-gradient-to-l from-purple-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{
              width: `${(currentStageIndex / (LAB_STAGES.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* 5 Stage Touch Nodes */}
        <div className="relative z-10 flex items-center justify-between">
          {LAB_STAGES.map((stage, idx) => {
            const isDone = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const isJustTapped = lastTappedStage === stage.id;
            const StageIcon = stage.icon;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={(e) => handleStageTap(stage.id, e)}
                className={`lab-stage-node group relative flex flex-col items-center cursor-pointer transition-all active:scale-90 ${
                  isCurrent ? 'scale-105' : 'hover:scale-102'
                }`}
                title={`۱-تپ جهت تغییر وضعیت به: ${stage.fullLabel}`}
              >
                {/* Node Circle */}
                <div 
                  className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all border-2 shadow-xs ${
                    isCurrent
                      ? `${stage.bgColor} text-white ${stage.borderColor} ring-3 ring-purple-300/60 shadow-sm ${isJustTapped ? 'scale-125 animate-ping' : ''}`
                      : isDone
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : 'bg-white text-slate-400 border-slate-300 hover:border-purple-400 hover:text-purple-600'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isCurrent ? (
                    <StageIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="text-[9px] font-bold font-mono">
                      {toPersianDigits(stage.stepNumber)}
                    </span>
                  )}
                </div>

                {/* Stage Text Label */}
                <span 
                  className={`text-[8.5px] mt-1 font-bold whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-purple-900 font-black'
                      : isDone
                      ? 'text-emerald-700 font-semibold'
                      : 'text-slate-400 group-hover:text-purple-700'
                  }`}
                >
                  {stage.shortLabel}
                </span>

                {/* Pulsing indicator under current stage */}
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5 animate-bounce" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Live Feedback Bar: Current stage details & 1-tap hint */}
      <div className="flex items-center justify-between pt-1.5 mt-0.5 text-[9px] text-slate-500 border-t border-purple-50">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-700">
            مرحله فعلی: <strong className="text-purple-800 font-black">{currentStageDef.fullLabel}</strong>
          </span>
        </div>
        <span className="text-[8px] font-bold text-purple-600 bg-purple-50/80 px-1.5 py-0.2 rounded-md">
          تک‌تپ (Single-Tap)
        </span>
      </div>
    </div>
  );
};
