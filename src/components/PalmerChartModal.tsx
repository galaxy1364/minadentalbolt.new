import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Layers, AlertCircle, Sparkles, ShieldCheck, 
  Info, Eye, Edit3, ArrowDown, Activity, Clock, DollarSign,
  PenTool, Eraser, RotateCcw, Trash2, Highlighter, Palette,
  Mic, MicOff, Volume2, Baby, User, Radio, Play, CheckCircle2
} from 'lucide-react';
import { ToothSurface, TreatmentType, ToothCondition, Patient } from '../types/dental';
import { formatToman, toPersianDigits } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface PalmerChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patient?: Patient | null;
  teethConditions?: Record<string, ToothCondition>;
  onSaveTreatment: (treatmentData: {
    quadrant: 'UR' | 'UL' | 'LL' | 'LR';
    toothNumber: number;
    surfaces: ToothSurface[];
    treatment: TreatmentType;
    cost: number;
    notes: string;
    annotations?: string;
  }) => void;
}

const TOOTH_NAMES: Record<number, { farsi: string; english: string }> = {
  1: { farsi: 'ثنایای مرکزی (سانترال)', english: 'Central Incisor' },
  2: { farsi: 'ثنایای جانبی (لترال)', english: 'Lateral Incisor' },
  3: { farsi: 'نیش (کانین)', english: 'Canine' },
  4: { farsi: 'آسیای کوچک اول (پرمولار ۱)', english: '1st Premolar' },
  5: { farsi: 'آسیای کوچک دوم (پرمولار ۲)', english: '2nd Premolar' },
  6: { farsi: 'آسیای بزرگ اول (مولار ۶)', english: '1st Molar' },
  7: { farsi: 'آسیای بزرگ دوم (مولار ۷)', english: '2nd Molar' },
  8: { farsi: 'دندان عقل (مولار ۸)', english: '3rd Molar' },
};

const PEDIATRIC_TOOTH_NAMES: Record<number, { farsi: string; letter: string; english: string }> = {
  1: { farsi: 'ثنایای مرکزی شیری (سانترال A)', letter: 'A', english: 'Primary Central Incisor' },
  2: { farsi: 'ثنایای جانبی شیری (لترال B)', letter: 'B', english: 'Primary Lateral Incisor' },
  3: { farsi: 'نیش شیری (کانین C)', letter: 'C', english: 'Primary Canine' },
  4: { farsi: 'آسیای اول شیری (پرمولار/مولار ۱ D)', letter: 'D', english: 'Primary 1st Molar' },
  5: { farsi: 'آسیای دوم شیری (مولار ۲ E)', letter: 'E', english: 'Primary 2nd Molar' },
};

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  composite: 'ترمیم کامپوزیت نانوهیبرید',
  amalgam: 'ترمیم آمالگام سیلور',
  endo: 'عصب‌کشی (درمان ریشه تخصصی)',
  crown_zirconia: 'روکش تمام زیرکونیا مولتی‌لیر',
  crown_pfm: 'روکش پرسلن متال PFM',
  laminate: 'لمینت سرامیکی ایمکس E-Max',
  implant: 'کاشت فیکسچر ایمپلنت',
  extraction: 'کشیدن دندان / جراحی',
  scaling: 'جرم‌گیری تخصصی فکین',
  bleaching: 'بلیچینگ مطب دو فک',
  pulpotomy: 'پالپوتومی اطفال (پالپوتومی تاجی)',
  pulpectomy: 'پالپکتومی کامل ریشه اطفال',
  ss_crown: 'روکش استیل فلزی اطفال (SS Crown)',
  fissure_sealant: 'فیشورسیلنت پیشگیرانه شیارها',
  fluoride: 'فلورایدتراپی موضعی وارنیش',
  space_maintainer: 'فضا نگهدارنده بند و لوپ اطفال'
};

const SURFACE_NAMES: Record<ToothSurface, string> = {
  occlusal: 'اوکلوزال (سطح جونده)',
  mesial: 'مزیال (سمت خط وسط)',
  distal: 'دیستال (دور از خط وسط)',
  buccal: 'باکال (سمت گونه/لب)',
  lingual: 'لینگوال (سمت زبان/کام)',
  rootCanal: 'کانال‌های ریشه (اندو)'
};

const EMPTY_CONDITIONS: Record<string, ToothCondition> = {};

export const PalmerChartModal: React.FC<PalmerChartModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patient,
  teethConditions = EMPTY_CONDITIONS,
  onSaveTreatment
}) => {
  const { selection, impactLight, impactHeavy, success } = useHapticFeedback();

  const [selectedQuadrant, setSelectedQuadrant] = useState<'UR' | 'UL' | 'LL' | 'LR'>('UR');
  const [selectedTooth, setSelectedTooth] = useState<number>(6);
  const [inspectedTooth, setInspectedTooth] = useState<{ quadrant: 'UR' | 'UL' | 'LL' | 'LR'; toothNumber: number } | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<ToothSurface[]>(['occlusal', 'mesial']);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentType>('composite');
  const [baseCost, setBaseCost] = useState<number>(2400000);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [treatmentCost, setTreatmentCost] = useState<number>(2400000);
  const [treatmentNotes, setTreatmentNotes] = useState<string>('ترمیم ۲ سطحی کامپوزیت خلفی همرنگ');

  const applyDiscount = (percent: number) => {
    selection();
    setDiscountPercent(percent);
    const discounted = Math.max(0, Math.round(baseCost * (1 - percent / 100)));
    setTreatmentCost(discounted);
  };

  // Canvas Freehand Annotation State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<string>('#ef4444'); // Default red for caries
  const [penWidth, setPenWidth] = useState<number>(3);
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [hasAnnotations, setHasAnnotations] = useState<boolean>(false);

  // Dentition Mode: Adult (1-8) vs Pediatric (A-E / 1-5)
  const [dentitionMode, setDentitionMode] = useState<'adult' | 'pediatric'>('adult');

  // Sterile Hands-Free Voice Dictation States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Stop listening on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const parseVoiceCommands = (text: string) => {
    const lower = text.toLowerCase();
    
    // Parse Quadrant
    if (lower.includes('بالا راست') || lower.includes('ur') || lower.includes('راست بالا')) {
      setSelectedQuadrant('UR');
    } else if (lower.includes('بالا چپ') || lower.includes('ul') || lower.includes('چپ بالا')) {
      setSelectedQuadrant('UL');
    } else if (lower.includes('پایین چپ') || lower.includes('ll') || lower.includes('چپ پایین')) {
      setSelectedQuadrant('LL');
    } else if (lower.includes('پایین راست') || lower.includes('lr') || lower.includes('راست پایین')) {
      setSelectedQuadrant('LR');
    }

    // Parse Tooth Number / Letter
    if (dentitionMode === 'adult') {
      if (lower.includes('سانترال') || lower.includes('مرکزی') || lower.includes(' یک ') || lower.includes(' 1 ') || lower.includes(' ۱ ')) {
        setSelectedTooth(1);
      } else if (lower.includes('لترال') || lower.includes('جانبی') || lower.includes(' دو ') || lower.includes(' 2 ') || lower.includes(' ۲ ')) {
        setSelectedTooth(2);
      } else if (lower.includes('نیش') || lower.includes('کانین') || lower.includes(' سه ') || lower.includes(' 3 ') || lower.includes(' ۳ ')) {
        setSelectedTooth(3);
      } else if (lower.includes('پرمولار یک') || lower.includes(' چهار ') || lower.includes(' 4 ') || lower.includes(' ۴ ')) {
        setSelectedTooth(4);
      } else if (lower.includes('پرمولار دو') || lower.includes(' پنج ') || lower.includes(' 5 ') || lower.includes(' ۵ ')) {
        setSelectedTooth(5);
      } else if (lower.includes('مولار شش') || lower.includes(' شش ') || lower.includes(' 6 ') || lower.includes(' ۶ ')) {
        setSelectedTooth(6);
      } else if (lower.includes('مولار هفت') || lower.includes(' هفت ') || lower.includes(' 7 ') || lower.includes(' ۷ ')) {
        setSelectedTooth(7);
      } else if (lower.includes('عقل') || lower.includes(' هشت ') || lower.includes(' 8 ') || lower.includes(' ۸ ')) {
        setSelectedTooth(8);
      }
    } else {
      if (lower.includes('a') || lower.includes('ای') || lower.includes('سانترال شیری') || lower.includes('یک')) setSelectedTooth(1);
      else if (lower.includes('b') || lower.includes('بی') || lower.includes('لترال شیری') || lower.includes('دو')) setSelectedTooth(2);
      else if (lower.includes('c') || lower.includes('سی') || lower.includes('نیش شیری') || lower.includes('سه')) setSelectedTooth(3);
      else if (lower.includes('d') || lower.includes('دی') || lower.includes('مولار اول شیری') || lower.includes('چهار')) setSelectedTooth(4);
      else if (lower.includes('e') || lower.includes('ای') || lower.includes('مولار دوم شیری') || lower.includes('پنج')) setSelectedTooth(5);
    }

    // Parse Surfaces
    const detectedSurfaces: ToothSurface[] = [];
    if (lower.includes('اوکلوزال') || lower.includes('جونده') || lower.includes('سطح o')) detectedSurfaces.push('occlusal');
    if (lower.includes('مزیال') || lower.includes('سطح m')) detectedSurfaces.push('mesial');
    if (lower.includes('دیستال') || lower.includes('سطح d')) detectedSurfaces.push('distal');
    if (lower.includes('باکال') || lower.includes('لب') || lower.includes('گونه') || lower.includes('سطح b')) detectedSurfaces.push('buccal');
    if (lower.includes('لینگوال') || lower.includes('زبان') || lower.includes('کام') || lower.includes('سطح l')) detectedSurfaces.push('lingual');
    if (lower.includes('کانال') || lower.includes('ریشه') || lower.includes('اندو')) detectedSurfaces.push('rootCanal');
    if (lower.includes('mod') || lower.includes('ام او دی')) {
      detectedSurfaces.push('mesial', 'occlusal', 'distal');
    }
    if (detectedSurfaces.length > 0) {
      setSelectedSurfaces(Array.from(new Set(detectedSurfaces)));
    }

    // Parse Treatments
    if (lower.includes('کامپوزیت')) {
      setSelectedTreatment('composite');
      setTreatmentCost(dentitionMode === 'pediatric' ? 1400000 : 2400000);
    } else if (lower.includes('آمالگام')) {
      setSelectedTreatment('amalgam');
      setTreatmentCost(1800000);
    } else if (lower.includes('عصب کشی') || lower.includes('درمان ریشه')) {
      setSelectedTreatment('endo');
      setTreatmentCost(3800000);
    } else if (lower.includes('پالپوتومی')) {
      setSelectedTreatment('pulpotomy');
      setTreatmentCost(1800000);
    } else if (lower.includes('پالپکتومی')) {
      setSelectedTreatment('pulpectomy');
      setTreatmentCost(2200000);
    } else if (lower.includes('روکش استیل') || lower.includes('ss crown') || lower.includes('اس اس')) {
      setSelectedTreatment('ss_crown');
      setTreatmentCost(2100000);
    } else if (lower.includes('فیشور') || lower.includes('سیلنت')) {
      setSelectedTreatment('fissure_sealant');
      setTreatmentCost(850000);
    } else if (lower.includes('فلوراید')) {
      setSelectedTreatment('fluoride');
      setTreatmentCost(650000);
    } else if (lower.includes('فضا نگهدارنده')) {
      setSelectedTreatment('space_maintainer');
      setTreatmentCost(2600000);
    } else if (lower.includes('زیرکونیا')) {
      setSelectedTreatment('crown_zirconia');
      setTreatmentCost(4800000);
    } else if (lower.includes('ایمپلنت')) {
      setSelectedTreatment('implant');
      setTreatmentCost(14500000);
    } else if (lower.includes('کشیدن')) {
      setSelectedTreatment('extraction');
      setTreatmentCost(dentitionMode === 'pediatric' ? 600000 : 950000);
    }

    setTreatmentNotes(`دیکته صوتی استریل پزشک: ${text}`);
    setVoiceFeedback(`درمان تنظیم شد: ${text}`);
  };

  const toggleVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceFeedback('تشخیص گفتار در مرورگر فعال نیست. برای آزمایش دست‌آزاد، گفتار شبیه‌سازی شد.');
      parseVoiceCommands('دندان ۶ بالا راست کامپوزیت اوکلوزال و مزیال');
      setTimeout(() => setVoiceFeedback(null), 3500);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceFeedback(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        impactLight();
        setVoiceFeedback('دیکته صوتی فعال شد - بگویید: مثلاً «دندان ۶ بالا راست، کامپوزیت MOD»');
      };

      recognition.onresult = (event: any) => {
        let fullStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          fullStr += event.results[i][0].transcript;
        }
        setVoiceTranscript(fullStr);
        parseVoiceCommands(fullStr);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Sync effective teeth conditions from patient if provided
  const activeConditions = patient?.teethConditions || teethConditions || EMPTY_CONDITIONS;

  // Pre-load existing condition data if tooth has one
  useEffect(() => {
    if (!isOpen) return;
    const key = `${selectedQuadrant}_${selectedTooth}`;
    const existing = activeConditions[key];
    if (existing) {
      if (existing.surfaces && existing.surfaces.length > 0) {
        setSelectedSurfaces(existing.surfaces);
      }
      if (existing.treatment) {
        setSelectedTreatment(existing.treatment);
      }
      if (existing.cost) {
        setTreatmentCost(existing.cost);
      }
      if (existing.notes) {
        setTreatmentNotes(existing.notes);
      }
    }
  }, [selectedQuadrant, selectedTooth, isOpen, patient?.id]);

  // Synchronize canvas drawing whenever selected tooth or modal changes
  useEffect(() => {
    if (!isOpen) return;
    const key = `${selectedQuadrant}_${selectedTooth}`;
    const existing = activeConditions[key];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHistory([]);

    if (existing?.annotations) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasAnnotations(true);
      };
      img.src = existing.annotations;
    } else {
      setHasAnnotations(false);
    }
  }, [selectedQuadrant, selectedTooth, isOpen, patient?.id, activeConditions[`${selectedQuadrant}_${selectedTooth}`]?.annotations]);

  // Canvas Drawing Handlers
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const checkHasAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let hasPixels = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) {
          hasPixels = true;
          break;
        }
      }
      setHasAnnotations(hasPixels);
    } catch {
      // fallback
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save snapshot for undo
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory(prev => [...prev.slice(-15), snapshot]);
    } catch {
      // ignore
    }

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = penWidth * 4;
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = penWidth * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = penWidth;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasAnnotations(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    checkHasAnnotations();
  };

  const handleUndo = () => {
    impactLight();
    const canvas = canvasRef.current;
    if (!canvas || canvasHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = canvasHistory[canvasHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setCanvasHistory(prev => prev.slice(0, -1));
    checkHasAnnotations();
  };

  const handleClear = () => {
    impactHeavy();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory(prev => [...prev.slice(-15), snapshot]);
    } catch {
      // ignore
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasAnnotations(false);
  };

  if (!isOpen) return null;

  const toggleSurface = (surface: ToothSurface) => {
    selection();
    if (selectedSurfaces.includes(surface)) {
      setSelectedSurfaces(selectedSurfaces.filter(s => s !== surface));
    } else {
      setSelectedSurfaces([...selectedSurfaces, surface]);
    }
  };

  const getDynamicTariffPrice = (treatmentKey: TreatmentType): number => {
    try {
      const saved = localStorage.getItem('minadental_tariffs_catalog_v2');
      if (saved) {
        const list: Array<{ code: string; name: string; price: number }> = JSON.parse(saved);
        const match = list.find(item => {
          if (treatmentKey === 'composite') return item.name.includes('کامپوزیت');
          if (treatmentKey === 'amalgam') return item.name.includes('آمالگام');
          if (treatmentKey === 'endo') return item.name.includes('عصب‌کشی') || item.name.includes('اندو');
          if (treatmentKey === 'crown_zirconia') return item.name.includes('زیرکونیا');
          if (treatmentKey === 'crown_pfm') return item.name.includes('PFM');
          if (treatmentKey === 'laminate') return item.name.includes('لمینت');
          if (treatmentKey === 'implant') return item.name.includes('ایمپلنت');
          if (treatmentKey === 'extraction') return item.name.includes('کشیدن') || item.name.includes('جراحی');
          if (treatmentKey === 'scaling') return item.name.includes('جرم‌گیری');
          if (treatmentKey === 'pulpotomy') return item.name.includes('پالپوتومی');
          if (treatmentKey === 'pulpectomy') return item.name.includes('پالپکتومی');
          if (treatmentKey === 'ss_crown') return item.name.includes('استیل') || item.name.includes('SS');
          if (treatmentKey === 'fissure_sealant') return item.name.includes('فیشور');
          if (treatmentKey === 'fluoride') return item.name.includes('فلوراید');
          return false;
        });
        if (match && match.price > 0) return match.price;
      }
    } catch {}
    return 0;
  };

  const handleTreatmentChange = (t: TreatmentType) => {
    selection();
    setSelectedTreatment(t);
    setDiscountPercent(0);
    const dynamicPrice = getDynamicTariffPrice(t);
    let defaultBase = 2400000;
    let defaultNote = '';

    switch (t) {
      case 'composite': defaultBase = 2400000; defaultNote = 'ترمیم کامپوزیت نانوهیبرید'; break;
      case 'amalgam': defaultBase = 1800000; defaultNote = 'ترمیم آمالگام سیلور'; break;
      case 'endo': defaultBase = 4200000; defaultNote = 'درمان ریشه (روت‌کانال ۳ کانال)'; break;
      case 'crown_zirconia': defaultBase = 4800000; defaultNote = 'روکش تمام زیرکونیا مولتی‌لیر'; break;
      case 'crown_pfm': defaultBase = 3200000; defaultNote = 'روکش پرسلن متال PFM'; break;
      case 'laminate': defaultBase = 5500000; defaultNote = 'لمینت سرامیکی ایمکس زیبایی'; break;
      case 'implant': defaultBase = 14500000; defaultNote = 'کاشت فیکسچر ایمپلنت کره‌ای'; break;
      case 'extraction': defaultBase = 1200000; defaultNote = 'کشیدن دندان / جراحی نسج نرم'; break;
      case 'scaling': defaultBase = 1200000; defaultNote = 'جرم‌گیری کامل ۲ فک'; break;
      case 'bleaching': defaultBase = 7000000; defaultNote = 'بلیچینگ آفیس دو فک'; break;
      case 'pulpotomy': defaultBase = 1800000; defaultNote = 'پالپوتومی تاجی اطفال با فرموکروزول و ZOE'; break;
      case 'pulpectomy': defaultBase = 2400000; defaultNote = 'پالپکتومی کامل ریشه دندان شیری و پرکردن با متاپکس'; break;
      case 'ss_crown': defaultBase = 2100000; defaultNote = 'روکش استیل فلزی اطفال (Stainless Steel Crown)'; break;
      case 'fissure_sealant': defaultBase = 850000; defaultNote = 'فیشورسیلنت رزینی پیشگیرانه شیارهای عمیق'; break;
      case 'fluoride': defaultBase = 650000; defaultNote = 'وارنیش فلورایدتراپی موضعی دو فک'; break;
      case 'space_maintainer': defaultBase = 2600000; defaultNote = 'فضا نگهدارنده ثابت دندان بند و لوپ'; break;
    }

    const finalBase = dynamicPrice > 0 ? dynamicPrice : defaultBase;
    setBaseCost(finalBase);
    setTreatmentCost(finalBase);
    setTreatmentNotes(defaultNote);
  };

  const handleToothClick = (quadrant: 'UR' | 'UL' | 'LL' | 'LR', toothNumber: number) => {
    impactLight();
    setSelectedQuadrant(quadrant);
    setSelectedTooth(toothNumber);
    setInspectedTooth({ quadrant, toothNumber });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    success();
    let annotationsData: string | undefined = undefined;
    const canvas = canvasRef.current;
    if (canvas && hasAnnotations) {
      annotationsData = canvas.toDataURL('image/png');
    }
    const finalNotes = discountPercent > 0 
      ? `${treatmentNotes} [با کسر ${toPersianDigits(discountPercent)}٪ تخفیف مصوب]`.trim()
      : treatmentNotes;
    onSaveTreatment({
      quadrant: selectedQuadrant,
      toothNumber: selectedTooth,
      surfaces: selectedSurfaces,
      treatment: selectedTreatment,
      cost: treatmentCost,
      notes: finalNotes,
      annotations: annotationsData
    });
    onClose();
  };

  const getQuadrantLabel = (q: 'UR' | 'UL' | 'LL' | 'LR') => {
    switch (q) {
      case 'UR': return 'فک بالا راست (UR ⏌)';
      case 'UL': return 'فک بالا چپ (⎿ UL)';
      case 'LL': return 'فک پایین چپ (⎾ LL)';
      case 'LR': return 'فک پایین راست (LR ⏋)';
    }
  };

  // Currently inspected tooth details
  const inspectedKey = inspectedTooth ? `${inspectedTooth.quadrant}_${inspectedTooth.toothNumber}` : null;
  const inspectedCondition = inspectedKey ? activeConditions[inspectedKey] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-t-[32px] sm:rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header - Sterile Clinical White Aesthetic */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-teal-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs border border-emerald-200">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">چارت پالمر بالینی</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Palmer Grid
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">پرونده: {patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
            title="بستن چارت"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 no-scrollbar bg-white">

          {/* DENTITION MODE & VOICE DICTATION COMMAND BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            {/* Dentition Mode Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  selection();
                  setDentitionMode('adult');
                  if (selectedTooth > 8) setSelectedTooth(6);
                }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dentitionMode === 'adult'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>دندان‌های دائمی (بزرگسال ۱-۸)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  selection();
                  setDentitionMode('pediatric');
                  if (selectedTooth > 5) setSelectedTooth(5);
                }}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dentitionMode === 'pediatric'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Baby className="w-3.5 h-3.5" />
                <span>دندان‌های شیری (اطفال A-E)</span>
              </button>
            </div>

            {/* Voice Dictation (Hands-free recording for sterile gloves) */}
            <button
              type="button"
              onClick={toggleVoiceDictation}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 animate-pulse shadow-rose-600/40'
                  : 'bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300'
              }`}
              title="دیکته صوتی بالینی دست‌آزاد پزشک بدون لمس صفحه"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 animate-bounce" />
                  <span>درحال ضبط گفتار پزشک...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-emerald-600" />
                  <span>دیکته صوتی استریل (دست‌آزاد)</span>
                </>
              )}
            </button>
          </div>

          {/* Voice Feedback Banner */}
          {voiceFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in">
              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">{voiceFeedback}</span>
                {voiceTranscript && (
                  <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                    متن دریافت شده: «{voiceTranscript}»
                  </span>
                )}
              </div>
            </div>
          )}

          {/* PALMER CHART CONTAINER (Clean Clinical White Screen - 2-ROW FACIAL VIEW) */}
          <div className="bg-slate-50/80 rounded-[26px] p-3 sm:p-4 border border-slate-200 shadow-xs relative">
            
            {/* Top Orientation Bar */}
            <div className="flex items-center justify-between text-[11px] font-black text-slate-700 mb-2 px-1">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>سمت راست بیمار (چپ تصویر)</span>
              </div>
              <div className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 font-mono text-[10px] flex items-center gap-1.5 shadow-2xs">
                <span>خط میانی صورت (Midline)</span>
                <span className="text-emerald-600 font-black">┼</span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-700">
                <span>سمت چپ بیمار (راست تصویر)</span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              </div>
            </div>

            {/* 2 Continuous Rows Layout - Scrollable without breaking at any screen zoom */}
            <div className="overflow-x-auto pb-1 scrollbar-none" dir="ltr">
              <div className="min-w-[420px] sm:min-w-full space-y-1.5 select-none">
                
                {/* Quadrants Top Subheader */}
                <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500">
                  <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-black">
                    UR ⏌ فک بالا راست
                  </span>
                  <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 font-black">
                    ⎿ UL فک بالا چپ
                  </span>
                </div>

                {/* LINE 1: MAXILLARY ARCH (فک بالا) */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
                  {/* Left Half (UR): 8 to 1 towards midline */}
                  <div className="flex-1 flex items-center justify-end gap-0.5 sm:gap-1">
                    {(dentitionMode === 'adult' ? [8, 7, 6, 5, 4, 3, 2, 1] : [5, 4, 3, 2, 1]).map(num => {
                      const isSelected = selectedQuadrant === 'UR' && selectedTooth === num;
                      const hasCondition = Boolean(activeConditions[`UR_${num}`]);
                      const cond = activeConditions[`UR_${num}`];
                      const label = dentitionMode === 'adult' ? num : PEDIATRIC_TOOTH_NAMES[num]?.letter;
                      return (
                        <button
                          key={`ur-${num}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToothClick('UR', num);
                          }}
                          className={`relative flex-1 min-w-[24px] max-w-[40px] h-9 sm:h-10 rounded-lg text-xs font-black transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400 scale-105 z-10'
                              : hasCondition
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                              : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                          }`}
                          title={dentitionMode === 'adult' ? `دندان ${num} بالا راست - ${TOOTH_NAMES[num]?.farsi}` : `دندان شیری ${label} - ${PEDIATRIC_TOOTH_NAMES[num]?.farsi}`}
                        >
                          <span className="font-mono">{label}</span>
                          {hasCondition && (
                            <span 
                              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white ${
                                cond?.status === 'completed' 
                                  ? 'bg-emerald-500' 
                                  : cond?.status === 'in_progress' 
                                  ? 'bg-amber-500' 
                                  : 'bg-sky-500'
                              }`}
                            />
                          )}
                          {cond?.annotations && (
                            <span 
                              className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-500 ring-1 ring-white shadow-xs" 
                              title="دارای ترسیم بالینی"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vertical Midline Separator */}
                  <div className="w-[3px] h-9 sm:h-10 bg-slate-300 rounded-full mx-1 shrink-0" title="خط میانی (Midline)" />

                  {/* Right Half (UL): 1 to 8 away from midline */}
                  <div className="flex-1 flex items-center justify-start gap-0.5 sm:gap-1">
                    {(dentitionMode === 'adult' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5]).map(num => {
                      const isSelected = selectedQuadrant === 'UL' && selectedTooth === num;
                      const hasCondition = Boolean(activeConditions[`UL_${num}`]);
                      const cond = activeConditions[`UL_${num}`];
                      const label = dentitionMode === 'adult' ? num : PEDIATRIC_TOOTH_NAMES[num]?.letter;
                      return (
                        <button
                          key={`ul-${num}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToothClick('UL', num);
                          }}
                          className={`relative flex-1 min-w-[24px] max-w-[40px] h-9 sm:h-10 rounded-lg text-xs font-black transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-400 scale-105 z-10'
                              : hasCondition
                              ? 'bg-sky-100 text-sky-900 border border-sky-400'
                              : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                          }`}
                          title={dentitionMode === 'adult' ? `دندان ${num} بالا چپ - ${TOOTH_NAMES[num]?.farsi}` : `دندان شیری ${label} - ${PEDIATRIC_TOOTH_NAMES[num]?.farsi}`}
                        >
                          <span className="font-mono">{label}</span>
                          {hasCondition && (
                            <span 
                              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white ${
                                cond?.status === 'completed' 
                                  ? 'bg-emerald-500' 
                                  : cond?.status === 'in_progress' 
                                  ? 'bg-amber-500' 
                                  : 'bg-sky-500'
                              }`}
                            />
                          )}
                          {cond?.annotations && (
                            <span 
                              className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-500 ring-1 ring-white shadow-xs" 
                              title="دارای ترسیم بالینی"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HORIZONTAL OCCLUSAL LINE (خط اکلوژن دندان‌ها) */}
                <div className="relative my-1 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-slate-300" />
                  </div>
                  <span className="relative px-3 py-0.5 bg-slate-50 text-slate-500 font-mono text-[9px] font-black rounded-full border border-slate-200 shadow-2xs">
                    ───┼─── خط اکلوژن و جدایش فک بالا و پایین ───┼───
                  </span>
                </div>

                {/* LINE 2: MANDIBULAR ARCH (فک پایین) */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
                  {/* Left Half (LR): 8 to 1 towards midline */}
                  <div className="flex-1 flex items-center justify-end gap-0.5 sm:gap-1">
                    {(dentitionMode === 'adult' ? [8, 7, 6, 5, 4, 3, 2, 1] : [5, 4, 3, 2, 1]).map(num => {
                      const isSelected = selectedQuadrant === 'LR' && selectedTooth === num;
                      const hasCondition = Boolean(activeConditions[`LR_${num}`]);
                      const cond = activeConditions[`LR_${num}`];
                      const label = dentitionMode === 'adult' ? num : PEDIATRIC_TOOTH_NAMES[num]?.letter;
                      return (
                        <button
                          key={`lr-${num}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToothClick('LR', num);
                          }}
                          className={`relative flex-1 min-w-[24px] max-w-[40px] h-9 sm:h-10 rounded-lg text-xs font-black transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400 scale-105 z-10'
                              : hasCondition
                              ? 'bg-amber-100 text-amber-900 border border-amber-400'
                              : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                          }`}
                          title={dentitionMode === 'adult' ? `دندان ${num} پایین راست - ${TOOTH_NAMES[num]?.farsi}` : `دندان شیری ${label} - ${PEDIATRIC_TOOTH_NAMES[num]?.farsi}`}
                        >
                          <span className="font-mono">{label}</span>
                          {hasCondition && (
                            <span 
                              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white ${
                                cond?.status === 'completed' 
                                  ? 'bg-emerald-500' 
                                  : cond?.status === 'in_progress' 
                                  ? 'bg-amber-500' 
                                  : 'bg-sky-500'
                              }`}
                            />
                          )}
                          {cond?.annotations && (
                            <span 
                              className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-500 ring-1 ring-white shadow-xs" 
                              title="دارای ترسیم بالینی"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vertical Midline Separator */}
                  <div className="w-[3px] h-9 sm:h-10 bg-slate-300 rounded-full mx-1 shrink-0" title="خط میانی (Midline)" />

                  {/* Right Half (LL): 1 to 8 away from midline */}
                  <div className="flex-1 flex items-center justify-start gap-0.5 sm:gap-1">
                    {(dentitionMode === 'adult' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5]).map(num => {
                      const isSelected = selectedQuadrant === 'LL' && selectedTooth === num;
                      const hasCondition = Boolean(activeConditions[`LL_${num}`]);
                      const cond = activeConditions[`LL_${num}`];
                      const label = dentitionMode === 'adult' ? num : PEDIATRIC_TOOTH_NAMES[num]?.letter;
                      return (
                        <button
                          key={`ll-${num}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToothClick('LL', num);
                          }}
                          className={`relative flex-1 min-w-[24px] max-w-[40px] h-9 sm:h-10 rounded-lg text-xs font-black transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400 scale-105 z-10'
                              : hasCondition
                              ? 'bg-purple-100 text-purple-900 border border-purple-400'
                              : 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                          }`}
                          title={dentitionMode === 'adult' ? `دندان ${num} پایین چپ - ${TOOTH_NAMES[num]?.farsi}` : `دندان شیری ${label} - ${PEDIATRIC_TOOTH_NAMES[num]?.farsi}`}
                        >
                          <span className="font-mono">{label}</span>
                          {hasCondition && (
                            <span 
                              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-1 ring-white ${
                                cond?.status === 'completed' 
                                  ? 'bg-emerald-500' 
                                  : cond?.status === 'in_progress' 
                                  ? 'bg-amber-500' 
                                  : 'bg-sky-500'
                              }`}
                            />
                          )}
                          {cond?.annotations && (
                            <span 
                              className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-purple-500 ring-1 ring-white shadow-xs" 
                              title="دارای ترسیم بالینی"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quadrants Bottom Subheader */}
                <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-500">
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-black">
                    LR ⏋ فک پایین راست
                  </span>
                  <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-black">
                    ⎾ LL فک پایین چپ
                  </span>
                </div>

              </div>
            </div>

            {/* Palmer Central Axes Overlay */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>شماره‌ها از خط میانی صورت (وسط) به سمت بیرون به ۸ می‌رسند.</span>
              </span>
              <span className="text-slate-400 font-mono text-[9px] hidden sm:inline">
                Facial Palmer Grid
              </span>
            </div>

          </div>

          {/* INTERACTIVE FLOATING TOOLTIP / TOOTH STATUS INSPECTOR */}
          {inspectedTooth && (
            <div className="bg-white rounded-[24px] p-3.5 border border-slate-200 shadow-md relative animate-in zoom-in-95 fade-in duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-md ${
                    inspectedTooth.quadrant === 'UR' 
                      ? 'bg-emerald-500 text-white' 
                      : inspectedTooth.quadrant === 'UL' 
                      ? 'bg-sky-500 text-white' 
                      : inspectedTooth.quadrant === 'LR' 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-purple-500 text-white'
                  }`}>
                    {inspectedTooth.quadrant}{inspectedTooth.toothNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900">
                        {dentitionMode === 'pediatric'
                          ? `دندان شیری ${PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.letter || inspectedTooth.toothNumber} ${getQuadrantLabel(inspectedTooth.quadrant)}`
                          : `دندان ${toPersianDigits(inspectedTooth.toothNumber)} ${getQuadrantLabel(inspectedTooth.quadrant)}`
                        }
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        ({dentitionMode === 'pediatric' 
                          ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.farsi 
                          : TOOTH_NAMES[inspectedTooth.toothNumber]?.farsi})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Palmer: {inspectedTooth.quadrant === 'UR' 
                        ? `⏌ ${dentitionMode === 'pediatric' ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.letter : inspectedTooth.toothNumber}` 
                        : inspectedTooth.quadrant === 'UL' 
                        ? `⎿ ${dentitionMode === 'pediatric' ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.letter : inspectedTooth.toothNumber}` 
                        : inspectedTooth.quadrant === 'LR' 
                        ? `LR ⏋ ${dentitionMode === 'pediatric' ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.letter : inspectedTooth.toothNumber}` 
                        : `⎾ ${dentitionMode === 'pediatric' ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.letter : inspectedTooth.toothNumber}`
                      } · {dentitionMode === 'pediatric' ? PEDIATRIC_TOOTH_NAMES[inspectedTooth.toothNumber]?.english : TOOTH_NAMES[inspectedTooth.toothNumber]?.english}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedTooth(null)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all"
                  title="بستن پنجره بازرسی"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Box */}
              <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {inspectedCondition ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span className="font-black text-xs text-emerald-700">
                          {TREATMENT_LABELS[inspectedCondition.treatment] || inspectedCondition.treatment}
                        </span>
                      </div>
                      
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        inspectedCondition.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : inspectedCondition.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        {inspectedCondition.status === 'completed' && '✓ تکمیل شده'}
                        {inspectedCondition.status === 'in_progress' && '⏳ در حال درمان'}
                        {inspectedCondition.status === 'planned' && '📋 طرح درمان پیشنهادی'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-600 font-bold">سطوح درگیر:</span>
                      {inspectedCondition.surfaces.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-300 font-bold text-[10px] shadow-xs">
                          {SURFACE_NAMES[s] || s}
                        </span>
                      ))}
                    </div>

                    {inspectedCondition.cost && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-600">هزینه ثبت شده:</span>
                        <span className="font-black text-emerald-700 font-mono">
                          {formatToman(inspectedCondition.cost)}
                        </span>
                      </div>
                    )}

                    {inspectedCondition.notes && (
                      <p className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-slate-200">
                        {inspectedCondition.notes}
                      </p>
                    )}

                    {inspectedCondition.annotations && (
                      <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2.5 shadow-xs">
                        <div className="w-12 h-12 rounded-lg bg-white border border-purple-300 overflow-hidden flex items-center justify-center p-0.5 relative shrink-0">
                          <img
                            src={inspectedCondition.annotations}
                            alt="ترسیم بالینی دندان"
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <span className="text-[11px] font-black text-purple-800 flex items-center gap-1">
                            <PenTool className="w-3 h-3 text-purple-600" />
                            دارای ترسیم و کروکی بالینی دندان
                          </span>
                          <span className="text-[10px] text-slate-600 block truncate mt-0.5">
                            علامت‌گذاری اختصاصی پزشک روی سطوح این دندان
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-emerald-800 block">دندان سالم / بدون درمان ثبت‌شده</span>
                      <span className="text-[10.5px] text-slate-600">در پرونده فعلی بیمار هیچ اقدامی برای این دندان ثبت نشده است.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Action Button */}
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    impactLight();
                    const el = document.getElementById('palmer-surface-selector');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-slate-300"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تنظیم یا ویرایش درمان این دندان</span>
                  <ArrowDown className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>
          )}

          {/* 3D / ISOMETRIC TOOTH SURFACE SELECTOR & FREEHAND CANVAS OVERLAY */}
          <div id="palmer-surface-selector" className="bg-white rounded-[26px] p-4 border border-slate-200 flex flex-col items-center shadow-sm relative">
            <div className="w-full flex items-center justify-between mb-2 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-black text-slate-900">
                  سطوح دندان ({getQuadrantLabel(selectedQuadrant)} دندان {toPersianDigits(selectedTooth)})
                </span>
              </div>

              {/* Mode Switcher Toggle */}
              <button
                type="button"
                onClick={() => {
                  impactLight();
                  setIsDrawingMode(!isDrawingMode);
                }}
                className={`py-1.5 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  isDrawingMode
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-purple-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isDrawingMode ? 'حالت ترسیم فعال است' : 'قلم و ترسیم آزاد بالینی'}</span>
              </button>
            </div>

            {/* CLINICAL DRAWING TOOLBAR (VISIBLE WHEN DRAWING MODE IS ON) */}
            {isDrawingMode && (
              <div className="w-full mb-2 p-2.5 rounded-2xl bg-slate-50 border border-purple-200 shadow-sm space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Tool Types: Pen, Highlighter, Eraser */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => { selection(); setActiveTool('pen'); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        activeTool === 'pen'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="قلم معمولی خطی"
                    >
                      <PenTool className="w-3 h-3" />
                      <span>قلم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { selection(); setActiveTool('highlighter'); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        activeTool === 'highlighter'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="ماژیک نیمه‌شفاف"
                    >
                      <Highlighter className="w-3 h-3" />
                      <span>هایلایتر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { selection(); setActiveTool('eraser'); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        activeTool === 'eraser'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="پاک‌کن"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>پاک‌کن</span>
                    </button>
                  </div>

                  {/* Pen Width Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[10px]">
                    {[
                      { width: 2, label: 'نازک' },
                      { width: 4, label: 'متوسط' },
                      { width: 7, label: 'ضخیم' }
                    ].map(w => (
                      <button
                        key={w.width}
                        type="button"
                        onClick={() => { selection(); setPenWidth(w.width); }}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                          penWidth === w.width
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  {/* Undo & Clear */}
                  <div className="flex items-center gap-1 mr-auto">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={canvasHistory.length === 0}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 shadow-xs"
                      title="بازگشت آخرین خط (Undo)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all active:scale-95 shadow-xs"
                      title="پاک‌کردن کامل ترسیم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Clinical Color Palette (Only when not erasing) */}
                {activeTool !== 'eraser' && (
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200">
                    <span className="text-[10px] text-slate-600 font-bold">رنگ بالینی:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { color: '#ef4444', label: 'پوسیدگی / کاریس (قرمز)' },
                        { color: '#0284c7', label: 'کامپوزیت (آبی)' },
                        { color: '#d97706', label: 'آمالگام (کهربایی)' },
                        { color: '#9333ea', label: 'شکستگی یا ترک (بنفش)' },
                        { color: '#059669', label: 'سالم یا درمان‌شده (سبز)' },
                        { color: '#db2777', label: 'اکسپوز پالپ / اندو (صورتی)' },
                        { color: '#0f172a', label: 'مارکر تیره بالینی' },
                      ].map(c => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => { selection(); setPenColor(c.color); }}
                          style={{ backgroundColor: c.color }}
                          className={`w-5 h-5 rounded-full transition-transform active:scale-90 border border-slate-300 ${
                            penColor === c.color ? 'ring-2 ring-slate-800 ring-offset-2 ring-offset-white scale-110 shadow-md' : 'opacity-85 hover:opacity-100'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instruction Banner */}
            <div className="w-full text-center mb-1">
              {isDrawingMode ? (
                <span className="text-[10px] text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full font-bold inline-block">
                  ✏️ حالت قلم فعال است؛ با قلم یا لمس دست، پوسیدگی و خطوط تراش را مستقیم روی دندان بکشید.
                </span>
              ) : (
                <span className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full font-bold inline-block">
                  برای انتخاب سطوح روی بخش‌های دندان کلیک کنید، یا برای ترسیم آزاد دکمه قلم را لمس کنید.
                </span>
              )}
            </div>

            {/* Isometric / Anatomical 3D Surface Interactive Map with Canvas Overlay */}
            <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center my-2 select-none">
              {/* Underlying SVG Tooth Anatomy Diagram */}
              <svg className="w-full h-full drop-shadow-sm absolute inset-0 pointer-events-auto" viewBox="0 0 200 200">
                {/* Background Tooth Outline */}
                <circle cx="100" cy="100" r="88" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" />

                {/* Buccal / Facial (Top Trapezoid) */}
                <polygon
                  points="35,35 165,35 135,65 65,65"
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSurfaces.includes('buccal')
                      ? 'fill-emerald-500 stroke-emerald-600 stroke-2'
                      : 'fill-slate-100 hover:fill-slate-200 stroke-slate-300'
                  }`}
                  onClick={() => !isDrawingMode && toggleSurface('buccal')}
                />
                <text x="100" y="52" textAnchor="middle" className={`text-[10px] font-bold pointer-events-none ${selectedSurfaces.includes('buccal') ? 'fill-white font-black' : 'fill-slate-700'}`}>
                  باکال (B)
                </text>

                {/* Lingual / Palatal (Bottom Trapezoid) */}
                <polygon
                  points="65,135 135,135 165,165 35,165"
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSurfaces.includes('lingual')
                      ? 'fill-emerald-500 stroke-emerald-600 stroke-2'
                      : 'fill-slate-100 hover:fill-slate-200 stroke-slate-300'
                  }`}
                  onClick={() => !isDrawingMode && toggleSurface('lingual')}
                />
                <text x="100" y="152" textAnchor="middle" className={`text-[10px] font-bold pointer-events-none ${selectedSurfaces.includes('lingual') ? 'fill-white font-black' : 'fill-slate-700'}`}>
                  لینگوال (L)
                </text>

                {/* Mesial (Left Trapezoid on tooth) */}
                <polygon
                  points="35,35 65,65 65,135 35,165"
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSurfaces.includes('mesial')
                      ? 'fill-emerald-500 stroke-emerald-600 stroke-2'
                      : 'fill-slate-100 hover:fill-slate-200 stroke-slate-300'
                  }`}
                  onClick={() => !isDrawingMode && toggleSurface('mesial')}
                />
                <text x="50" y="103" textAnchor="middle" className={`text-[10px] font-bold pointer-events-none ${selectedSurfaces.includes('mesial') ? 'fill-white font-black' : 'fill-slate-700'}`}>
                  مزیال (M)
                </text>

                {/* Distal (Right Trapezoid on tooth) */}
                <polygon
                  points="135,65 165,35 165,165 135,135"
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSurfaces.includes('distal')
                      ? 'fill-emerald-500 stroke-emerald-600 stroke-2'
                      : 'fill-slate-100 hover:fill-slate-200 stroke-slate-300'
                  }`}
                  onClick={() => !isDrawingMode && toggleSurface('distal')}
                />
                <text x="150" y="103" textAnchor="middle" className={`text-[10px] font-bold pointer-events-none ${selectedSurfaces.includes('distal') ? 'fill-white font-black' : 'fill-slate-700'}`}>
                  دیستال (D)
                </text>

                {/* Occlusal / Incisal (Center Square) */}
                <polygon
                  points="65,65 135,65 135,135 65,135"
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSurfaces.includes('occlusal')
                      ? 'fill-emerald-500 stroke-emerald-600 stroke-2'
                      : 'fill-slate-200 hover:fill-slate-300 stroke-slate-300'
                  }`}
                  onClick={() => !isDrawingMode && toggleSurface('occlusal')}
                />
                <text x="100" y="104" textAnchor="middle" className={`text-[11px] font-black pointer-events-none ${selectedSurfaces.includes('occlusal') ? 'fill-white' : 'fill-slate-800'}`}>
                  اوکلوزال (O)
                </text>
              </svg>

              {/* Freehand Canvas Drawing Overlay */}
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className={`absolute inset-0 w-full h-full rounded-full z-10 touch-none transition-all ${
                  isDrawingMode
                    ? 'cursor-crosshair pointer-events-auto ring-2 ring-purple-500 shadow-md bg-purple-500/5'
                    : 'pointer-events-none'
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

            {/* Root Canal Button */}
            <button
              onClick={() => toggleSurface('rootCanal')}
              className={`mt-2 py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                selectedSurfaces.includes('rootCanal')
                  ? 'bg-amber-100 text-amber-800 border-amber-400 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>درگیری کانال‌های ریشه و اندو (Root Canals)</span>
              {selectedSurfaces.includes('rootCanal') && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
            </button>

            {/* Active surfaces pill indicator */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center text-[11px]">
              <span className="text-slate-600 font-bold">سطوح فعال:</span>
              {selectedSurfaces.length === 0 ? (
                <span className="text-red-500 font-bold">هیچ سطحی انتخاب نشده</span>
              ) : (
                selectedSurfaces.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
                    {s.toUpperCase()}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* TREATMENT TYPE SELECTOR */}
          <div className="bg-white rounded-[26px] p-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800">
                {dentitionMode === 'adult' ? 'نوع اقدام و درمان درخواستی (بزرگسال)' : 'اقدامات تخصصی دندانپزشکی اطفال'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dentitionMode === 'pediatric' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                {dentitionMode === 'pediatric' ? 'Pediatric Care' : 'Adult Care'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(dentitionMode === 'adult' ? [
                { id: 'composite', label: 'ترمیم کامپوزیت' },
                { id: 'amalgam', label: 'ترمیم آمالگام' },
                { id: 'endo', label: 'عصب‌کشی (اندو)' },
                { id: 'crown_zirconia', label: 'روکش زیرکونیا' },
                { id: 'crown_pfm', label: 'روکش PFM' },
                { id: 'laminate', label: 'لمینت سرامیکی' },
                { id: 'implant', label: 'کاشت ایمپلنت' },
                { id: 'extraction', label: 'کشیدن دندان' },
                { id: 'scaling', label: 'جرم‌گیری' },
                { id: 'bleaching', label: 'بلیچینگ آفیس' }
              ] : [
                { id: 'pulpotomy', label: 'پالپوتومی اطفال' },
                { id: 'pulpectomy', label: 'پالپکتومی ریشه' },
                { id: 'ss_crown', label: 'روکش فلزی (SS)' },
                { id: 'fissure_sealant', label: 'فیشورسیلنت' },
                { id: 'fluoride', label: 'فلورایدتراپی' },
                { id: 'space_maintainer', label: 'فضا نگهدارنده' },
                { id: 'composite', label: 'کامپوزیت اطفال' },
                { id: 'extraction', label: 'کشیدن دندان شیری' }
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTreatmentChange(t.id as TreatmentType)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    selectedTreatment === t.id
                      ? dentitionMode === 'pediatric'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* COST & CLINICAL NOTES */}
          <div className="bg-white rounded-[26px] p-3.5 border border-slate-200 shadow-xs space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700">تعرفه و هزینه درمان (تومان)</label>
                <span className="text-[11px] text-emerald-700 font-bold font-mono">
                  {formatToman(treatmentCost)}
                </span>
              </div>
              <input
                type="number"
                value={treatmentCost}
                onChange={(e) => {
                  setDiscountPercent(0);
                  setTreatmentCost(Number(e.target.value));
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {/* Quick Discount Selector */}
              <div className="space-y-1.5 pt-2 mt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-slate-600">تخفیف و تعدیل قیمت در لحظه:</span>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      کسر {formatToman(baseCost - treatmentCost)} ({toPersianDigits(discountPercent)}٪ تخفیف)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'اصلی (۰٪)', pct: 0 },
                    { label: '۵٪ نقدی', pct: 5 },
                    { label: '۱۰٪ بیمار', pct: 10 },
                    { label: '۱۵٪ پکیج', pct: 15 },
                    { label: '۲۰٪ مدیر کلینیک', pct: 20 },
                  ].map(d => (
                    <button
                      key={d.pct}
                      type="button"
                      onClick={() => applyDiscount(d.pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        discountPercent === d.pct
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">یادداشت تخصصی بالینی</label>
              <input
                type="text"
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                placeholder="توضیحات تشخیصی، وضعیت کانال‌ها یا متریال..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors active:scale-95 border border-slate-200"
          >
            انصراف
          </button>
          
          <button
            onClick={handleSubmit}
            className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
            <span>ثبت نهایی در پرونده و چارت</span>
          </button>
        </div>

      </div>
    </div>
  );
};
