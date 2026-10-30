import React from 'react';
import { X, Printer, QrCode, Sparkles, Tag, Check, Copy } from 'lucide-react';
import { InventoryItem } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface InventoryBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onShowToast: (msg: string) => void;
}

export const InventoryBarcodeModal: React.FC<InventoryBarcodeModalProps> = ({
  isOpen,
  onClose,
  item,
  onShowToast
}) => {
  const { impactLight, success } = useHapticFeedback();

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    impactLight();
    window.print();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success();
    onShowToast(`کد ${code} در کلیپ‌بورد کپی شد.`);
  };

  const barcodeValue = item.barcode || '626012345000';
  const qrValue = item.qrCode || `MINA-INV-${item.id}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-[28px] border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-900 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">لیبل بارکد و QR کالا</h3>
              <span className="text-[10px] text-slate-400">چاپ برچسب قفسه و انبار مطب</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Label Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white border-2 border-dashed border-emerald-300 text-center space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-b border-slate-100 pb-1.5">
            <span>کلینیک دندانپزشکی مینادنتال</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{item.category}</span>
          </div>

          <h4 className="text-sm font-black text-slate-900">{item.name}</h4>

          {/* SVG QR Code Simulation */}
          <div className="flex items-center justify-center py-1">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
              <svg width="120" height="120" viewBox="0 0 100 100" className="mx-auto">
                <rect width="100" height="100" fill="#ffffff" />
                {/* 3 Position Corners */}
                <rect x="5" y="5" width="26" height="26" fill="#047857" rx="4" />
                <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="13" y="13" width="10" height="10" fill="#047857" rx="1" />

                <rect x="69" y="5" width="26" height="26" fill="#047857" rx="4" />
                <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="77" y="13" width="10" height="10" fill="#047857" rx="1" />

                <rect x="5" y="69" width="26" height="26" fill="#047857" rx="4" />
                <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="13" y="77" width="10" height="10" fill="#047857" rx="1" />

                {/* Data Matrix Dots */}
                <rect x="36" y="8" width="6" height="6" fill="#1e293b" />
                <rect x="46" y="8" width="6" height="6" fill="#1e293b" />
                <rect x="56" y="8" width="6" height="6" fill="#1e293b" />
                <rect x="36" y="18" width="6" height="6" fill="#1e293b" />
                <rect x="48" y="22" width="6" height="6" fill="#1e293b" />
                <rect x="36" y="36" width="28" height="6" fill="#1e293b" />
                <rect x="10" y="36" width="16" height="6" fill="#1e293b" />
                <rect x="74" y="36" width="16" height="6" fill="#1e293b" />
                <rect x="36" y="48" width="6" height="24" fill="#1e293b" />
                <rect x="48" y="48" width="12" height="12" fill="#1e293b" />
                <rect x="64" y="48" width="12" height="6" fill="#1e293b" />
                <rect x="48" y="66" width="24" height="6" fill="#1e293b" />
                <rect x="76" y="60" width="14" height="28" fill="#1e293b" />
                <rect x="36" y="78" width="18" height="14" fill="#1e293b" />
                <rect x="60" y="78" width="10" height="14" fill="#1e293b" />
              </svg>
            </div>
          </div>

          {/* Barcode Strip */}
          <div className="space-y-1">
            <div className="h-9 flex items-center justify-center gap-0.5 px-4">
              {[2,1,3,1,2,3,1,2,1,3,2,1,1,3,2,1,2,3,1,1,2,3,2,1,3,1].map((w, idx) => (
                <div
                  key={idx}
                  className={`h-full bg-slate-900 rounded-[1px]`}
                  style={{ width: `${w * 2}px` }}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 font-mono text-xs font-black text-slate-700">
              <span>{barcodeValue}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(barcodeValue)}
                className="text-slate-400 hover:text-slate-600"
                title="کپی بارکد"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
            <span>کد QR: <code className="font-mono font-bold text-emerald-700">{qrValue}</code></span>
            <span>انقضا: <strong className="font-mono text-slate-800">{toPersianDigits(item.expiryDate)}</strong></span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
          >
            بستن
          </button>
          <button
            onClick={handlePrint}
            className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ برچسب لیبل</span>
          </button>
        </div>
      </div>
    </div>
  );
};
