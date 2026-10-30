import React, { useState } from 'react';
import { 
  X, Check, FlaskConical, Send, Clock, 
  CheckCircle2, Share2, Smartphone, FileText, 
  Sparkles, Layers, MessageSquare, ArrowUpRight,
  Package, ChevronRight
} from 'lucide-react';
import { LabOrder, Patient, LabStatus } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { triggerHaptic } from '../utils/haptics';

interface DigitalLabPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onUpdateOrderStatus?: (orderId: string, status: LabStatus) => void;
}

export const DigitalLabPortalModal: React.FC<DigitalLabPortalModalProps> = ({
  isOpen,
  onClose,
  patients,
  onUpdateOrderStatus
}) => {
  const [selectedLab, setSelectedLab] = useState<string>('همه');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract all lab orders
  const allOrders: LabOrder[] = patients.flatMap(p => p.labOrders || []);

  const labNames = ['همه', 'لابراتوار تخصصی آریا', 'لابراتوار دیجیتال کادکام پارس', 'لابراتوار پروتز ثامن'];

  const filteredOrders = allOrders.filter(o => 
    selectedLab === 'همه' || o.labName.includes(selectedLab)
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusChange = (orderId: string, newStatus: LabStatus) => {
    triggerHaptic('medium');
    onUpdateOrderStatus?.(orderId, newStatus);
    showToast(`وضعیت سفارش در پورتال لابراتوار به «${newStatus}» تغییر یافت.`);
  };

  const handleShareWhatsApp = (order: LabOrder) => {
    triggerHaptic('selection');
    const text = encodeURIComponent(
      `سلام همکار گرامی، برگه دیجیتال سفارش کلینیک مینادنتال:\n` +
      `بیمار: ${order.patientName}\n` +
      `دندان: ${order.toothNumber}\n` +
      `نوع کار: ${order.workType}\n` +
      `رنگ شید: ${order.shade}\n` +
      `موعد تحویل به مطب: ${order.deliveryDate}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-white text-slate-900 rounded-t-[32px] sm:rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">پورتال دیجیتال همکاری با لابراتوارها</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-[#c8ff00] font-bold">
                  Lab Partner
                </span>
              </div>
              <p className="text-[11px] text-purple-100 font-medium">مشاهده، تایید و به‌روزرسانی زنده مراحل ساخت پروتز توسط تکنسین</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mx-4 mt-3 bg-purple-900 text-white p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in border border-purple-400">
            <Check className="w-4 h-4 text-[#c8ff00] stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Lab Selector Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap pl-1">لابراتوار همکار:</span>
          {labNames.map(name => (
            <button
              key={name}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedLab(name);
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                selectedLab === name 
                  ? 'bg-purple-600 text-white shadow-2xs' 
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="p-4 overflow-y-auto space-y-3 no-scrollbar flex-1 bg-slate-50/50">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              سفارش فعالی برای این لابراتوار یافت نشد.
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{order.patientName}</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 font-mono px-2 py-0.5 rounded-md font-bold">
                        {order.toothNumber}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 font-bold mt-0.5 block">{order.workType}</span>
                  </div>

                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                    order.status === 'ready_for_clinic' ? 'bg-[#c8ff00] text-black shadow-2xs' :
                    order.status === 'delivered_cemented' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'fabrication' ? 'bg-cyan-100 text-cyan-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status === 'ready_for_clinic' ? 'آماده در کلینیک' :
                     order.status === 'delivered_cemented' ? 'تحویل و سمان شد' :
                     order.status === 'fabrication' ? 'در حال ساخت در لابراتوار' : 'ارسال‌شده به لابراتوار'}
                  </span>
                </div>

                {/* Technical Specifications: Shade, Margin, Stump */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">رنگ شید دندان:</span>
                    <span className="font-mono font-black text-purple-900">{order.shade || 'A2 Vita'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">مارجین تراش:</span>
                    <span className="font-bold text-slate-800">{order.marginType || 'Chamfer 0.8mm'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">تاریخ تحویل:</span>
                    <span className="font-mono font-bold text-slate-800">{order.deliveryDate}</span>
                  </div>
                </div>

                {/* Technician Action Buttons: Fast Status Update */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => handleShareWhatsApp(order)}
                    className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10.5px] flex items-center gap-1 border border-emerald-200"
                    title="ارسال فیش و عکس به واتساپ تکنسین"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>ارسال به واتساپ تکنسین</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {order.status !== 'fabrication' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'fabrication')}
                        className="py-1 px-2.5 rounded-lg bg-cyan-600 text-white font-bold text-[10px]"
                      >
                        شروع ساخت (CAD/CAM)
                      </button>
                    )}

                    {order.status !== 'ready_for_clinic' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready_for_clinic')}
                        className="py-1 px-2.5 rounded-lg bg-purple-600 text-white font-bold text-[10px]"
                      >
                        ارسال به مطب با پیک
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
          >
            بستن پورتال
          </button>
        </div>

      </div>
    </div>
  );
};
