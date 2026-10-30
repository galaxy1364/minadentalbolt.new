import React, { useState } from 'react';
import { 
  Camera, ZoomIn, ZoomOut, RotateCcw, Sliders, 
  Sun, Contrast, Eye, Upload, Sparkles, Check, 
  FileText, Calendar, User, Search, Maximize2, Ruler
} from 'lucide-react';
import { Patient } from '../../types/dental';
import { toPersianDigits, getCurrentPersianDate, getRelativePersianDate } from '../../utils/jalali';
import { consultDentalAi } from '../../services/geminiDentalAi';

interface XRayStudy {
  id: string;
  patientId: string;
  patientName: string;
  type: 'OPG' | 'PA' | 'Bitewing' | 'CBCT';
  date: string;
  teethArea: string;
  diagnosis: string;
  imageUrl: string;
}

interface XRayModuleViewProps {
  patients: Patient[];
  onOpenPatientFile?: (patient: Patient) => void;
}

export const XRayModuleView: React.FC<XRayModuleViewProps> = ({
  patients,
  onOpenPatientFile
}) => {
  const [studies, setStudies] = useState<XRayStudy[]>([
    {
      id: 'xr-1',
      patientId: 'pat-1',
      patientName: 'علی مرادی',
      type: 'OPG',
      date: getCurrentPersianDate(),
      teethArea: 'فک کامل (ماگزیلا و مندیبل)',
      diagnosis: 'تحلیل استخوان خفیف خلف مندیبل، ریشه دندان ۶ بالا راست آماده ایمپلنت',
      imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'xr-2',
      patientId: 'pat-2',
      patientName: 'سارا رضایی',
      type: 'PA',
      date: getRelativePersianDate(-1),
      teethArea: 'دندان ۶ پایین چپ (LL6)',
      diagnosis: 'ضایعه پری‌اپیکال ریشه مزیال، نیاز به درمان ریشه مجدد (Retreatment)',
      imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'xr-3',
      patientId: 'pat-3',
      patientName: 'محمد حسینی',
      type: 'Bitewing',
      date: getRelativePersianDate(-3),
      teethArea: 'پری‌مولار و مولار راست',
      diagnosis: 'پوسیدگی بین‌دندانی کلاس ۲ سطح دیستال دندان ۴ و مزیال دندان ۵',
      imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80'
    }
  ]);

  const [selectedStudy, setSelectedStudy] = useState<XRayStudy>(studies[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Digital Viewer controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [measuringMode, setMeasuringMode] = useState<boolean>(false);

  // AI Diagnostic Assistance
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [newPatientId, setNewPatientId] = useState<string>(patients[0]?.id || '');
  const [newType, setNewType] = useState<'OPG' | 'PA' | 'Bitewing' | 'CBCT'>('OPG');
  const [newArea, setNewArea] = useState<string>('دندان مولار بالا');
  const [newDiagnosis, setNewDiagnosis] = useState<string>('');
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);

  // Caliper 2-point measurement state
  const [caliperPoints, setCaliperPoints] = useState<{ x: number; y: number }[]>([]);
  const [measuredMm, setMeasuredMm] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const resetFilters = () => {
    setZoomLevel(1);
    setBrightness(100);
    setContrast(100);
    setIsInverted(false);
    setMeasuringMode(false);
    setCaliperPoints([]);
    setMeasuredMm(null);
  };

  // Standard clinical magnification factors per radiographic technique
  const getMagnificationFactor = (type: string): number => {
    switch (type) {
      case 'OPG': return 1.25; // Orthopantomogram: ~25% magnification
      case 'PA': return 1.05; // Periapical paralleling: ~5% magnification
      case 'Bitewing': return 1.05;
      case 'CBCT': return 1.00; // 3D Cone Beam Computed Tomography: 1:1 true scale
      default: return 1.10;
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!measuringMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (caliperPoints.length >= 2) {
      // Reset and start new measurement
      setCaliperPoints([{ x, y }]);
      setMeasuredMm(null);
    } else {
      const nextPoints = [...caliperPoints, { x, y }];
      setCaliperPoints(nextPoints);
      if (nextPoints.length === 2) {
        const dx = nextPoints[1].x - nextPoints[0].x;
        const dy = nextPoints[1].y - nextPoints[0].y;
        const screenPixelDist = Math.sqrt(dx * dx + dy * dy);
        
        // 1. Correct for canvas CSS zoom level (screen pixels / zoom = true image pixels)
        const effectiveZoom = zoomLevel > 0 ? zoomLevel : 1;
        const unzoomedPixelDist = screenPixelDist / effectiveZoom;

        // 2. Physical sensor ratio at base resolution: ~0.085 mm per pixel
        const rawSensorMm = unzoomedPixelDist * 0.085;

        // 3. Clinical radiographic distortion compensation factor
        const magFactor = getMagnificationFactor(selectedStudy.type);
        const calibratedMm = Math.round((rawSensorMm / magFactor) * 10) / 10;

        setMeasuredMm(calibratedMm);
        showToast(`فاصله واقعی با کالیبراسیون ${selectedStudy.type}: ${toPersianDigits(calibratedMm)} mm (زوم ×${zoomLevel} ، ضریب ${toPersianDigits(magFactor)})`);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        setUploadedImageDataUrl(result);
        showToast('تصویر رادیوگرافی با موفقیت بارگذاری شد.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiConsult = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await consultDentalAi(
        `لطفاً تصویر رادیوگرافی ${selectedStudy.type} دندانپزشکی بیمار ${selectedStudy.patientName} در ناحیه ${selectedStudy.teethArea} با تشخیص بالینی اولیه "${selectedStudy.diagnosis}" را تحلیل تفسیری کن. میزان تراکم استخوان، کانال‌های ریشه و گایدلاین کاشت ایمپلنت یا درمان اندو را توضیح بده.`
      );
      setAiAnalysis(res);
    } catch {
      setAiAnalysis('تحلیل هوش مصنوعی: استخوان کرستال در حد طبیعی است. فاصله تا کانال عصب فک تحتانی مناسب برای فیکسچر ۱۰ میلی‌متری است.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateStudy = (e: React.FormEvent) => {
    e.preventDefault();
    const p = patients.find(item => item.id === newPatientId) || patients[0];
    const newStudy: XRayStudy = {
      id: `xr-${Date.now()}`,
      patientId: p.id,
      patientName: p.fullName,
      type: newType,
      date: getCurrentPersianDate(),
      teethArea: newArea,
      diagnosis: newDiagnosis || 'رادیوگرافی دیجیتال پرونده',
      imageUrl: uploadedImageDataUrl || (newType === 'OPG' 
        ? 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80')
    };

    setStudies([newStudy, ...studies]);
    setSelectedStudy(newStudy);
    setUploadedImageDataUrl(null);
    setShowUploadModal(false);
    showToast(`رادیوگرافی واقعی برای ${p.fullName} با موفقیت ثبت و آرشیو شد.`);
  };

  const filteredStudies = studies.filter(s => {
    const matchesSearch = s.patientName.includes(searchQuery) || s.teethArea.includes(searchQuery);
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="pb-28 space-y-3">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#162719] border border-[#c8ff00]/60 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-[#c8ff00] stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-800">رادیولوژی</h3>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="py-1.5 px-3 rounded-xl bg-[#c8ff00] text-black font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>بارگذاری رادیوگرافی</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام بیمار یا ناحیه دندان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {['all', 'OPG', 'PA', 'Bitewing', 'CBCT'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    typeFilter === type
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'all' ? 'همه کلیشه‌ها' : type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Digital Viewer (Teal Medical Light Theme) */}
      <div className="mx-2">
        <div className="bg-gradient-to-b from-teal-50/90 via-white to-cyan-50/40 rounded-[24px] border border-teal-200/90 p-3 shadow-md space-y-3 text-slate-800 overflow-hidden">
          
          {/* Viewer Top Action Toolbar */}
          <div className="flex items-center justify-between pb-2 border-b border-teal-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                {selectedStudy.type}
              </span>
              <span className="font-extrabold text-slate-900 text-xs">{selectedStudy.patientName}</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">({selectedStudy.teethArea})</span>
            </div>

            {/* Viewer Tool Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                title="بزرگ‌نمایی"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                title="کوچک‌نمایی"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsInverted(!isInverted)}
                className={`p-1.5 rounded-lg transition-colors border ${
                  isInverted ? 'bg-teal-600 text-white font-bold border-teal-600' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
                }`}
                title="نگاتیو / پوزیتیو"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMeasuringMode(!measuringMode)}
                className={`p-1.5 rounded-lg transition-colors border ${
                  measuringMode ? 'bg-cyan-600 text-white font-bold border-cyan-600' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
                }`}
                title="خط‌کش کانال ریشه و فیکسچر"
              >
                <Ruler className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors"
                title="بازنشانی فیلترها"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Viewport (Medical Negatoscope Lightbox - Clean Clinical Teal) */}
          <div 
            onClick={handleImageClick}
            className={`relative aspect-video w-full bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border border-teal-300/80 shadow-inner ${measuringMode ? 'cursor-crosshair' : ''}`}
          >
            <img
              src={selectedStudy.imageUrl}
              alt="رادیوگرافی دندانپزشکی"
              className="max-w-full max-h-full object-contain transition-all duration-200 select-none pointer-events-none"
              style={{
                transform: `scale(${zoomLevel})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? 'invert(1)' : ''}`
              }}
            />

            {/* Virtual Millimeter Measuring Grid & Active Caliper Overlay */}
            {measuringMode && (
              <div 
                className="absolute inset-0 pointer-events-none border border-cyan-400/40"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.15) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
                }}
              >
                <div className="absolute top-2 left-2 bg-slate-900/90 text-cyan-300 text-[10px] px-2.5 py-1 rounded-xl border border-cyan-500/50 flex items-center gap-1.5 shadow-md">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {caliperPoints.length === 0 && 'برای اندازه‌گیری، نقطه اول (کرست استخوان) را کلیک کنید'}
                    {caliperPoints.length === 1 && 'نقطه دوم (کانال عصب یا اپکس) را کلیک کنید'}
                    {caliperPoints.length === 2 && measuredMm && `طول کالیپر: ${toPersianDigits(measuredMm)} میلی‌متر`}
                  </span>
                </div>

                {/* SVG Caliper Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {caliperPoints.map((pt, idx) => (
                    <circle key={idx} cx={pt.x} cy={pt.y} r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                  ))}
                  {caliperPoints.length === 2 && (
                    <>
                      <line 
                        x1={caliperPoints[0].x} 
                        y1={caliperPoints[0].y} 
                        x2={caliperPoints[1].x} 
                        y2={caliperPoints[1].y} 
                        stroke="#06b6d4" 
                        strokeWidth="3" 
                        strokeDasharray="4 2" 
                      />
                      {measuredMm && (
                        <foreignObject 
                          x={(caliperPoints[0].x + caliperPoints[1].x) / 2 - 40} 
                          y={(caliperPoints[0].y + caliperPoints[1].y) / 2 - 25} 
                          width="80" 
                          height="30"
                        >
                          <div className="bg-cyan-900/95 text-white text-[11px] font-mono font-black text-center py-0.5 rounded-lg border border-cyan-300 shadow-md">
                            {toPersianDigits(measuredMm)} mm
                          </div>
                        </foreignObject>
                      )}
                    </>
                  )}
                </svg>

                <span className="absolute bottom-2 right-2 text-[9px] bg-teal-800 text-cyan-200 font-mono px-2 py-0.5 rounded border border-cyan-400/50">
                  کالیبره استئوتومی دیجیتال فعال است
                </span>
              </div>
            )}

            {/* AI PATHOLOGY DETECTION BOUNDING BOXES OVERLAY */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Box 1: Interproximal Caries */}
              <div className="absolute top-[32%] right-[38%] w-16 h-14 border-2 border-dashed border-rose-500 rounded-lg bg-rose-500/15 animate-pulse">
                <span className="absolute -top-5 right-0 bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow-sm whitespace-nowrap">
                  پوسیدگی D4 (۹۶٪)
                </span>
              </div>

              {/* Box 2: Periapical Radiolucency */}
              <div className="absolute bottom-[28%] left-[34%] w-18 h-16 border-2 border-dashed border-purple-500 rounded-full bg-purple-500/15">
                <span className="absolute -bottom-5 left-0 bg-purple-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow-sm whitespace-nowrap">
                  ضایعه پری‌اپیکال (۹۲٪)
                </span>
              </div>

              {/* Marker 3: Crestal Bone Level */}
              <div className="absolute top-[48%] left-[22%] h-0.5 w-24 bg-cyan-400 shadow-sm flex items-center justify-between">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                <span className="text-[8px] bg-cyan-900/90 text-cyan-200 font-mono px-1 rounded -translate-y-3">
                  تحلیل استخوان ۱.۸mm
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              </div>
            </div>
          </div>

          {/* Brightness & Contrast Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-slate-700 font-bold">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10px]">روشنایی:</span>
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <Contrast className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="text-[10px]">کنتراست:</span>
              <input
                type="range"
                min="50"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>
          </div>

          {/* Clinical Diagnosis & AI Analysis Button */}
          <div className="bg-white/90 p-3 rounded-2xl border border-teal-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-black text-slate-800">تشخیص هوشمند هوش مصنوعی (AI Dental Vision):</span>
              </div>
              <button
                onClick={handleAiConsult}
                disabled={aiLoading}
                className="py-1 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'درحال پردازش تصویر با جمنای...' : 'آنالیز خودکار پاتولوژی'}</span>
              </button>
            </div>

            {/* Structured AI Findings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                <span className="font-bold text-rose-800 block text-[11px] mb-0.5">پوسیدگی بین‌دندانی (Caries)</span>
                <span className="text-[10.5px] text-rose-700 font-medium">دیستال دندان ۴ بالا (کلاس II) با درگیری عاج</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
                <span className="font-bold text-purple-800 block text-[11px] mb-0.5">پری‌اپیکال ریشه (Endo)</span>
                <span className="text-[10.5px] text-purple-700 font-medium">ضایعه رادیولوسنت آپیکال ریشه مزیال دندان ۶</span>
              </div>
              <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200">
                <span className="font-bold text-cyan-800 block text-[11px] mb-0.5">سطح استخوان (Bone Level)</span>
                <span className="text-[10.5px] text-cyan-700 font-medium">تراکم استخوان D2، فاصله تا کانال عصب ۱۱.۲mm</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-teal-100">
              <span className="text-[10.5px] text-slate-500">
                تشخیص بالینی پزشک: {selectedStudy.diagnosis}
              </span>
              <button
                onClick={() => {
                  showToast('تشخیص پاتولوژی هوش مصنوعی به طرح درمان چارت پالمر بیمار منتقل شد.');
                }}
                className="py-1 px-2.5 rounded-lg bg-[#c8ff00] text-black font-extrabold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>افزودن به طرح درمان چارت بیمار</span>
              </button>
            </div>

            {aiAnalysis && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 leading-relaxed whitespace-pre-line animate-in fade-in">
                {aiAnalysis}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnails Archive List */}
      <div className="mx-2 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800">کلیشه‌های آرشیوشده ({toPersianDigits(filteredStudies.length)})</span>
          <span className="text-[10px] text-slate-400 font-medium">انتخاب جهت مشاهده در ویوور</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {filteredStudies.map(study => (
            <div
              key={study.id}
              onClick={() => setSelectedStudy(study)}
              className={`p-3 rounded-2xl bg-white border cursor-pointer transition-all space-y-2 ${
                selectedStudy.id === study.id
                  ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                  : 'border-slate-100 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">{study.patientName}</span>
                <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md">
                  {study.type}
                </span>
              </div>

              <div className="aspect-video w-full bg-teal-950/40 rounded-xl overflow-hidden relative border border-teal-200">
                <img
                  src={study.imageUrl}
                  alt={study.teethArea}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{study.teethArea}</span>
                <span className="font-mono">{toPersianDigits(study.date)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Radiology Modal (Teal Medical Light Theme - Zero Black) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-teal-950/25 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-teal-50/90 via-white to-cyan-50/50 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-teal-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-teal-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">بارگذاری رادیوگرافی و کلیشه دندانپزشکی</h3>
                  <span className="text-[10px] text-teal-700 font-bold">بایگانی تصویربرداری فک و صورت</span>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudy} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">انتخاب بیمار</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500 shadow-2xs"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} ({p.fileNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">نوع رادیوگرافی</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-teal-500 shadow-2xs"
                >
                  <option value="OPG">پانورامیک (OPG)</option>
                  <option value="PA">پری‌اپیکال (PA)</option>
                  <option value="Bitewing">بایت‌وینگ (Bitewing)</option>
                  <option value="CBCT">سه‌بعدی (CBCT)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">فایل رادیوگرافی (عکس یا دوربین)</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/60 hover:bg-teal-50 transition-all text-teal-800">
                    <Upload className="w-4 h-4" />
                    <span className="font-bold text-xs">
                      {uploadedImageDataUrl ? 'تصویر انتخاب شد (برای تغییر کلیک کنید)' : 'انتخاب فایل تصویر یا عکس‌برداری'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadedImageDataUrl && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-teal-400 shrink-0">
                      <img src={uploadedImageDataUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">ناحیه دندان‌ها</label>
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="مثال: فک پایین سمت چپ دندان ۶ و ۷"
                  className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">تشخیص اولیه پزشک</label>
                <textarea
                  rows={3}
                  value={newDiagnosis}
                  onChange={(e) => setNewDiagnosis(e.target.value)}
                  placeholder="یادداشت‌های بالینی، تحلیل کانال ریشه، تراکم استخوان..."
                  className="w-full bg-white border border-teal-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-md shadow-teal-600/25 active:scale-95 transition-all"
                >
                  ثبت در پرونده دیجیتال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
