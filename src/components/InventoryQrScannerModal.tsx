import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Flashlight, RefreshCw, CheckCircle2, 
  AlertTriangle, Package, Plus, Minus, Search, ArrowRight,
  Sparkles, Layers, QrCode, ScanLine, Check
} from 'lucide-react';
import { InventoryItem } from '../types/dental';
import { toPersianDigits, formatToman } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface InventoryQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onUpdateStock: (itemId: string, newStock: number) => void;
  onShowToast: (message: string) => void;
}

export const InventoryQrScannerModal: React.FC<InventoryQrScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateStock,
  onShowToast
}) => {
  const { selection, impactMedium, success, warning, error } = useHapticFeedback();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  
  // Scanned item state
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [scannerActive, setScannerActive] = useState<boolean>(true);

  // Play scanner beep audio with Web Audio API
  const playBeepSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch crisp POS beep (A6)
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio might be blocked until user gesture, safely ignore
    }
  };

  // Start Camera Stream
  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setHasCameraPermission(true);

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setHasCameraPermission(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setIsTorchOn(false);
  };

  // Toggle Flashlight/Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
        selection();
      } catch (err) {
        console.warn('Could not toggle flashlight:', err);
      }
    }
  };

  // Switch between front and back camera
  const toggleCameraFacing = () => {
    selection();
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Look up item in inventory by code
  const handleDetectCode = (rawCode: string) => {
    if (!rawCode || !scannerActive) return;
    const clean = rawCode.trim().toLowerCase();

    const matched = inventory.find(item => {
      const qrMatch = item.qrCode && item.qrCode.toLowerCase() === clean;
      const barMatch = item.barcode && item.barcode.toLowerCase() === clean;
      const idMatch = item.id.toLowerCase() === clean;
      const nameMatch = item.name.toLowerCase().includes(clean) || clean.includes(item.name.toLowerCase());
      return qrMatch || barMatch || idMatch || nameMatch;
    });

    if (matched) {
      playBeepSound();
      success();
      setLastScannedCode(rawCode);
      setScannedItem(matched);
      setAdjustedStock(matched.stock);
      setScannerActive(false); // Pause scanning while user reviews item
    } else {
      warning();
      onShowToast(`بارکد "${rawCode}" در فهرست انبار کلینیک یافت نشد.`);
    }
  };

  // Barcode Detection Loop
  useEffect(() => {
    if (!isOpen) return;

    startCamera(facingMode);

    // Setup BarcodeDetector if natively supported
    let barcodeDetector: any = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'data_matrix']
        });
      } catch (e) {
        console.warn('BarcodeDetector initialization skipped:', e);
      }
    }

    // Scanning ticker every 400ms
    scanIntervalRef.current = window.setInterval(async () => {
      if (!scannerActive || !videoRef.current || !barcodeDetector) return;
      if (videoRef.current.readyState < 2) return;

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const first = barcodes[0].rawValue;
          if (first) {
            handleDetectCode(first);
          }
        }
      } catch {
        // Frame drop or busy, ignore
      }
    }, 450);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, scannerActive]);

  if (!isOpen) return null;

  // Save stock update
  const handleSaveStock = (delta?: number) => {
    if (!scannedItem) return;
    const finalStock = delta !== undefined ? Math.max(0, scannedItem.stock + delta) : Math.max(0, adjustedStock);
    
    onUpdateStock(scannedItem.id, finalStock);
    impactMedium();
    onShowToast(`موجودی ${scannedItem.name} به ${toPersianDigits(finalStock)} ${scannedItem.unit} به‌روزرسانی شد.`);
    
    // Update local state and resume scanning
    setScannedItem(null);
    setScannerActive(true);
  };

  // Continue scanning next item
  const handleScanNext = () => {
    selection();
    setScannedItem(null);
    setScannerActive(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200" dir="rtl">
      {/* Top Header Bar */}
      <div className="p-4 pt-6 flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">اسکنر بارکد و QR انبار</h3>
            <span className="text-[10px] text-slate-300">ثبت آنی ورود/مصرف متریال دندانپزشکی</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isTorchOn ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="فلاش دوربین"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleCameraFacing}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            title="تغییر دوربین (جلو/عقب)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Viewfinder or Scanned Item Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {scannedItem ? (
          /* Scanned Item Detail & Stock Adjustment Card */
          <div className="w-full max-w-sm bg-gradient-to-b from-white via-slate-50 to-emerald-50/40 rounded-[28px] p-5 border border-emerald-300/80 shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold inline-block mb-1">
                  {scannedItem.category}
                </span>
                <h4 className="text-sm font-black text-slate-900 leading-snug">{scannedItem.name}</h4>
                {scannedItem.location && (
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                    محل نگهداری: {scannedItem.location}
                  </span>
                )}
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-100/80 p-2.5 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[9px] text-slate-500 block">موجودی فعلی</span>
                <span className="font-mono font-black text-sm text-slate-800">
                  {toPersianDigits(scannedItem.stock)} {scannedItem.unit}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">حداقل هشدار</span>
                <span className="font-mono font-black text-xs text-amber-600">
                  {toPersianDigits(scannedItem.minAlert)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">انقضا</span>
                <span className="font-mono font-black text-[11px] text-slate-700">
                  {toPersianDigits(scannedItem.expiryDate)}
                </span>
              </div>
            </div>

            {/* Stock Adjustment Controls */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-black text-slate-700 block text-center">
                تغییر موجودی در انبار:
              </label>

              {/* Incremental / Decremental Quick Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    impactMedium();
                    setAdjustedStock(prev => Math.max(0, prev - 1));
                  }}
                  className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-xs"
                  title="مصرف ۱ عدد"
                >
                  <Minus className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 min-w-[90px] text-center shadow-xs">
                  <span className="font-mono font-black text-lg text-emerald-700">
                    {toPersianDigits(adjustedStock)}
                  </span>
                  <span className="text-[10px] text-slate-400 block -mt-1">{scannedItem.unit}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    impactMedium();
                    setAdjustedStock(prev => prev + 1);
                  }}
                  className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-xs"
                  title="ورود ۱ عدد"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Fast presets (+5, -1, +10) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    impactMedium();
                    setAdjustedStock(prev => Math.max(0, prev - 1));
                  }}
                  className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] text-center transition-colors"
                >
                  مصرف بالینی (-۱)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    impactMedium();
                    setAdjustedStock(prev => prev + 5);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] text-center transition-colors"
                >
                  بسته جدید (+۵)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    impactMedium();
                    setAdjustedStock(prev => prev + 10);
                  }}
                  className="py-1.5 px-2 rounded-xl bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] text-center transition-colors"
                >
                  کارتن خرید (+۱۰)
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanNext}
                className="w-1/3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
              >
                انصراف / لغو
              </button>
              <button
                type="button"
                onClick={() => handleSaveStock()}
                className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>ثبت موجودی و ادامه</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Camera Viewfinder Overlay */
          <div className="relative w-full max-w-xs aspect-square rounded-[36px] overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-slate-900 flex items-center justify-center">
            {/* Real video feed */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Corner Framing Brackets */}
            <div className="absolute inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
            </div>

            {/* Scanning Laser Line Animation */}
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none" />

            {/* Camera Permission Alert if not granted */}
            {hasCameraPermission === false && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center text-white">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs font-bold mb-1">دسترسی به دوربین در این مرورگر مجاز نیست</p>
                <p className="text-[10px] text-slate-400">می‌توانید از بارکدهای شبیه‌سازی شده زیر استفاده کنید.</p>
              </div>
            )}

            <div className="absolute bottom-3 text-center px-4 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-emerald-300 font-bold pointer-events-none">
              بارکد یا QR کالا را در کادر قرار دهید
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Manual Input & Fast Simulation Buttons */}
      <div className="p-4 bg-slate-950/80 backdrop-blur-md border-t border-white/10 space-y-3 z-20">
        {/* Manual Barcode Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="وارد کردن دستی بارکد یا کد کالا..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode) {
                  handleDetectCode(manualCode);
                  setManualCode('');
                }
              }}
              className="w-full bg-white/10 border border-white/15 rounded-2xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (manualCode) {
                handleDetectCode(manualCode);
                setManualCode('');
              }
            }}
            className="py-2 px-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs active:scale-95 transition-all shadow-md"
          >
            جستجو
          </button>
        </div>

        {/* Quick Simulation Chips for immediate testing */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold mb-1.5 px-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              تست فوری اسکن متریال‌های مطب:
            </span>
            <span className="text-[10px] text-slate-400">یک کلیک برای تست</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {inventory.slice(0, 6).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleDetectCode(item.barcode || item.qrCode || item.id);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold whitespace-nowrap border border-white/10 active:scale-95 transition-all flex items-center gap-1"
              >
                <Package className="w-3 h-3 text-emerald-400" />
                <span>{item.name.slice(0, 22)}...</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
