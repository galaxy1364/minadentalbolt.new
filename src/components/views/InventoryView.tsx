import React, { useState } from 'react';
import { 
  Package, AlertTriangle, Plus, Search, 
  Check, ArrowDownCircle, ShieldCheck, ShoppingCart,
  Layers, ChevronDown, Sparkles, QrCode, Camera,
  ArrowUpDown, Tag, Barcode, MapPin, Eye, Filter,
  CheckSquare, Square, X, CheckCheck, SlidersHorizontal,
  Truck
} from 'lucide-react';
import { InventoryItem } from '../../types/dental';
import { toPersianDigits, formatToman, getRelativePersianDate } from '../../utils/jalali';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { InventoryQrScannerModal } from '../InventoryQrScannerModal';
import { InventoryBarcodeModal } from '../InventoryBarcodeModal';
import { BatchCategoryModal, BatchStockModal } from '../InventoryBatchModal';
import { SupplierPurchaseOrderModal } from '../SupplierPurchaseOrderModal';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onUpdateStock: (itemId: string, newStock: number) => void;
  onAddItem?: (item: InventoryItem) => void;
  onBatchUpdate?: (updatedItems: InventoryItem[]) => void;
}

export type SortOrder = 'min_stock' | 'name' | 'highest_price' | 'lowest_price' | 'expiry';

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onUpdateStock,
  onAddItem,
  onBatchUpdate
}) => {
  const { selection, impactLight, impactHeavy, success } = useHapticFeedback();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('min_stock');
  
  // Multi-Select Mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showBatchCategoryModal, setShowBatchCategoryModal] = useState(false);
  const [showBatchStockModal, setShowBatchStockModal] = useState(false);
  const [itemForBarcodeModal, setItemForBarcodeModal] = useState<InventoryItem | null>(null);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New item form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('کامپوزیت و ترمیم');
  const [formStock, setFormStock] = useState<number>(10);
  const [formMinAlert, setFormMinAlert] = useState<number>(3);
  const [formUnit, setFormUnit] = useState('تیوپ');
  const [formExpiry, setFormExpiry] = useState(() => getRelativePersianDate(365));
  const [formPrice, setFormPrice] = useState<number>(850000);
  const [formBarcode, setFormBarcode] = useState('');
  const [formQrCode, setFormQrCode] = useState('');
  const [formLocation, setFormLocation] = useState('قفسه A-1');

  const categories = [
    'همه',
    'کامپوزیت و ترمیم',
    'بی‌حسی و دارو',
    'ایمپلنت و جراحی',
    'پروتز و قالب‌گیری',
    'اندودانتیکس',
    'مصرفی و بهداشتی'
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const lowStockItems = inventory.filter(i => i.stock <= i.minAlert);
  const totalValue = inventory.reduce((sum, i) => sum + (i.stock * (i.pricePerUnit || 0)), 0);

  // Filter items
  const filtered = inventory.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      item.name.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.qrCode && item.qrCode.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q));

    const matchesCat = selectedCategory === 'همه' || item.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || item.stock <= item.minAlert;
    return matchesSearch && matchesCat && matchesLowStock;
  });

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'min_stock') {
      const aIsLow = a.stock <= a.minAlert ? 1 : 0;
      const bIsLow = b.stock <= b.minAlert ? 1 : 0;
      if (aIsLow !== bIsLow) return bIsLow - aIsLow;
      return a.stock - b.stock;
    }
    if (sortOrder === 'name') {
      return a.name.localeCompare(b.name, 'fa');
    }
    if (sortOrder === 'highest_price') {
      return (b.pricePerUnit || 0) - (a.pricePerUnit || 0);
    }
    if (sortOrder === 'lowest_price') {
      return (a.pricePerUnit || 0) - (b.pricePerUnit || 0);
    }
    if (sortOrder === 'expiry') {
      return a.expiryDate.localeCompare(b.expiryDate, 'fa');
    }
    return 0;
  });

  // Multi-Select handlers
  const toggleSelectAll = () => {
    selection();
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map(i => i.id)));
    }
  };

  const toggleItemSelection = (id: string) => {
    selection();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Batch Category Update
  const handleApplyBatchCategory = (newCategory: string) => {
    const updated = inventory.map(item => {
      if (selectedIds.has(item.id)) {
        return { ...item, category: newCategory };
      }
      return item;
    });

    if (onBatchUpdate) {
      onBatchUpdate(updated);
    } else {
      // Fallback
      inventory.forEach(item => {
        if (selectedIds.has(item.id)) {
          item.category = newCategory;
        }
      });
    }

    success();
    showToast(`دسته‌بندی ${toPersianDigits(selectedIds.size)} قلم کالا به «${newCategory}» تغییر یافت.`);
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Batch Stock Adjustment
  const handleApplyBatchStockAdjustment = (mode: 'add' | 'subtract' | 'set', amount: number) => {
    const updated = inventory.map(item => {
      if (selectedIds.has(item.id)) {
        let newStock = item.stock;
        if (mode === 'add') newStock = item.stock + amount;
        if (mode === 'subtract') newStock = Math.max(0, item.stock - amount);
        if (mode === 'set') newStock = Math.max(0, amount);
        onUpdateStock(item.id, newStock);
        return { ...item, stock: newStock };
      }
      return item;
    });

    if (onBatchUpdate) {
      onBatchUpdate(updated);
    }

    success();
    const actionDesc = mode === 'add' ? `افزایش ${toPersianDigits(amount)} واحدی` : mode === 'subtract' ? `کسر ${toPersianDigits(amount)} واحدی` : `تنظیم روی ${toPersianDigits(amount)} واحد`;
    showToast(`${actionDesc} برای ${toPersianDigits(selectedIds.size)} قلم کالا با موفقیت ثبت شد.`);
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Batch Reorder Requisition
  const handleBatchReorder = () => {
    selection();
    setShowPurchaseOrderModal(true);
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: formName,
      category: formCategory,
      stock: Number(formStock),
      minAlert: Number(formMinAlert),
      unit: formUnit,
      expiryDate: formExpiry,
      pricePerUnit: Number(formPrice),
      barcode: formBarcode || `62601${Math.floor(1000000 + Math.random() * 9000000)}`,
      qrCode: formQrCode || `MINA-INV-${Date.now().toString().slice(-6)}`,
      location: formLocation
    };

    if (onAddItem) {
      onAddItem(newItem);
    } else {
      inventory.unshift(newItem);
    }

    success();
    showToast(`کالای ${newItem.name} با موفقیت به انبار دندانپزشکی اضافه شد.`);
    setShowAddModal(false);
    setFormName('');
    setFormBarcode('');
    setFormQrCode('');
  };

  const selectedItemsList = inventory.filter(i => selectedIds.has(i.id));

  return (
    <div className="pb-32 space-y-3" dir="rtl">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 bg-[#162719] border border-[#c8ff00]/60 text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-[#c8ff00] stroke-[3]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="mx-2 mt-2">
        <div className="bg-white rounded-[24px] p-3.5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">انبار</h3>
              </div>
            </div>

            {/* Top Action Buttons: Multi-Select, QR Scanner & Add Item */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  selection();
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) {
                    setSelectedIds(new Set());
                  }
                }}
                className={`py-1.5 px-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${
                  isMultiSelectMode 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
                title="حالت انتخاب گروهی و ویرایش دسته‌جمعی"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isMultiSelectMode ? 'اتمام انتخاب' : 'انتخاب گروهی'}</span>
                <span className="sm:hidden">{isMultiSelectMode ? 'خروج' : 'گروهی'}</span>
              </button>

              <button
                onClick={() => {
                  selection();
                  setShowScannerModal(true);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm shadow-emerald-600/30 active:scale-95 transition-all"
                title="اسکن بارکد و QR با دوربین"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>اسکنر QR</span>
              </button>

              <button
                onClick={() => {
                  selection();
                  setShowAddModal(true);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-[#c8ff00] hover:bg-[#bbf000] text-black font-extrabold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">کالای جدید</span>
              </button>
            </div>
          </div>

          {/* Multi-Select Header Toolbar */}
          {isMultiSelectMode && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-xs font-black">
                  حالت انتخاب گروهی: {toPersianDigits(selectedIds.size)} از {toPersianDigits(sorted.length)} مورد انتخاب شده
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSelectAll}
                  className="px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-purple-700 font-bold text-[10px] hover:bg-purple-100 transition-colors"
                >
                  {selectedIds.size === sorted.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </button>
                <button
                  onClick={() => {
                    selection();
                    setIsMultiSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center hover:bg-purple-300"
                  title="خروج از حالت انتخاب"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Automatic Low-Stock Notification Alert Banner */}
          {lowStockItems.length > 0 && !isMultiSelectMode && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-900 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-black">
                  هشدار خودکار: {toPersianDigits(lowStockItems.length)} قلم کالا به حداقل مجاز موجودی رسیده‌اند!
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    selection();
                    setShowPurchaseOrderModal(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[10px] shadow-2xs hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" />
                  <span>سفارش به شرکت پخش</span>
                </button>
                <button
                  onClick={() => {
                    selection();
                    setShowLowStockOnly(!showLowStockOnly);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-[10px] shadow-2xs hover:bg-rose-700 active:scale-95 transition-all"
                >
                  {showLowStockOnly ? 'نمایش همه' : 'کسری‌ها'}
                </button>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">اقلام فعال</span>
              <span className="text-xs font-black text-slate-800 font-mono">{toPersianDigits(inventory.length)} ردیف</span>
            </div>
            <button
              onClick={() => {
                selection();
                setShowLowStockOnly(!showLowStockOnly);
              }}
              className={`p-2 rounded-xl border text-center transition-all ${
                showLowStockOnly 
                  ? 'bg-rose-500 text-white border-rose-600 shadow-2xs' 
                  : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
              }`}
            >
              <span className="text-[9px] block opacity-80">کسری موجودی</span>
              <span className="text-xs font-black font-mono">
                {toPersianDigits(lowStockItems.length)} کالا
              </span>
            </button>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] text-slate-400 block">ارزش ریالی انبار</span>
              <span className="text-[10px] font-black text-emerald-700 truncate block font-mono">{formatToman(totalValue)}</span>
            </div>
          </div>

          {/* Search Box & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو با نام، بارکد، QR یا دسته‌بندی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Sort Selector Dropdown */}
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => {
                  selection();
                  setSortOrder(e.target.value as SortOrder);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1.5 text-[11px] font-bold focus:outline-none appearance-none pr-6 cursor-pointer"
              >
                <option value="min_stock">اولویت کسری موجودی</option>
                <option value="name">نام کالا (الفبا)</option>
                <option value="highest_price">بیشترین ارزش ریالی</option>
                <option value="lowest_price">کمترین قیمت</option>
                <option value="expiry">نزدیک‌ترین تاریخ انقضا</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Material Category Pill Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {categories.map(cat => {
              const count = cat === 'همه' 
                ? inventory.length 
                : inventory.filter(i => i.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => {
                    selection();
                    setSelectedCategory(cat);
                  }}
                  className={`py-1 px-2.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[9px] px-1 rounded-full font-mono ${
                    selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                  }`}>
                    {toPersianDigits(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory Items List */}
      <div className="mx-2 space-y-2">
        {sorted.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 text-xs">
            کالایی با این مشخصات در انبار دندانپزشکی یافت نشد.
          </div>
        ) : (
          sorted.map(item => {
            const isLowStock = item.stock <= item.minAlert;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isMultiSelectMode) {
                    toggleItemSelection(item.id);
                  }
                }}
                className={`bg-white rounded-[22px] p-3.5 shadow-2xs border transition-all ${
                  isMultiSelectMode ? 'cursor-pointer select-none' : ''
                } ${
                  isSelected 
                    ? 'ring-2 ring-purple-500 bg-purple-50/30 border-purple-300' 
                    : isLowStock 
                      ? 'border-rose-200/80 bg-gradient-to-l from-rose-50/20 via-white to-white' 
                      : 'border-slate-100 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    {/* Multi-Select Checkbox */}
                    {isMultiSelectMode && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                        className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected 
                            ? 'bg-purple-600 text-white shadow-xs' 
                            : 'border-2 border-slate-300 hover:border-purple-400 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          {item.category}
                        </span>
                        {item.location && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {item.location}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-slate-900 mt-1">{item.name}</h4>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  {isLowStock ? (
                    <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      هشدار کسری
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      موجودی کافی
                    </span>
                  )}
                </div>

                {/* Metrics Table */}
                <div className="grid grid-cols-3 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100 text-center mt-2">
                  <div>
                    <span className="text-slate-400 block text-[9px]">موجودی در قفسه</span>
                    <span className={`font-mono font-black text-xs ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                      {toPersianDigits(item.stock)} {item.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9px]">انقضا</span>
                    <span className="text-slate-700 font-mono text-[10px]">{toPersianDigits(item.expiryDate)}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9px]">قیمت خرید</span>
                    <span className="text-slate-700 font-mono text-[10px]">{formatToman(item.pricePerUnit)}</span>
                  </div>
                </div>

                {/* Bottom Bar: Barcode / QR Preview and Quick Stock Adjustments */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {/* View Barcode & QR Label Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selection();
                        setItemForBarcodeModal(item);
                      }}
                      className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 transition-colors"
                      title="مشاهده و چاپ برچسب QR و بارکد"
                    >
                      <QrCode className="w-3 h-3 text-emerald-600" />
                      <span>لیبل QR</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selection();
                        setShowPurchaseOrderModal(true);
                      }}
                      className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 transition-colors border border-emerald-200"
                    >
                      <ShoppingCart className="w-3 h-3 text-emerald-600" />
                      <span>سفارش مجدد</span>
                    </button>
                  </div>

                  {/* Direct + / - Stock Stepper */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        impactLight();
                        onUpdateStock(item.id, Math.max(0, item.stock - 1));
                      }}
                      disabled={item.stock <= 0}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                      title="کسر ۱ عدد مصرفی"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs min-w-[20px] text-center">
                      {toPersianDigits(item.stock)}
                    </span>
                    <button
                      onClick={() => {
                        impactLight();
                        onUpdateStock(item.id, item.stock + 1);
                      }}
                      className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs active:scale-90 transition-transform"
                      title="افزودن ۱ عدد ورودی"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Batch Action Dock Bar (appears when items are selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-40 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-[26px] border border-purple-500/40 shadow-2xl flex items-center justify-between gap-2 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono font-black text-xs">
              {toPersianDigits(selectedIds.size)}
            </span>
            <span className="text-xs font-bold text-white hidden sm:inline">کالای انتخابی</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Batch Category Update */}
            <button
              onClick={() => {
                selection();
                setShowBatchCategoryModal(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تغییر دسته‌بندی</span>
            </button>

            {/* Batch Stock Adjustment */}
            <button
              onClick={() => {
                selection();
                setShowBatchStockModal(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تعدیل موجودی</span>
            </button>

            {/* Batch Reorder */}
            <button
              onClick={handleBatchReorder}
              className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 transition-all"
              title="سفارش خرید گروهی"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">سفارش</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => {
                selection();
                setSelectedIds(new Set());
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
              title="لغو انتخاب‌ها"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-emerald-950/25 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-emerald-50/90 via-white to-teal-50/50 text-slate-900 rounded-t-[32px] sm:rounded-[28px] border border-emerald-200/90 p-5 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">افزودن متریال و کالا به انبار مطب</h3>
                  <span className="text-[10px] text-emerald-700 font-bold">همراه با کد QR و محل نگهداری</span>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">نام کالا یا متریال *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: کامپوزیت 3M Filtek Z250 شید A2"
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">دسته‌بندی متریال</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  {categories.filter(c => c !== 'همه').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">موجودی فعلی</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-2 py-2 text-slate-900 text-center font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">حداقل هشدار</label>
                  <input
                    type="number"
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-2 py-2 text-slate-900 text-center font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="تیوپ / کارپول / بسته"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-2 py-2 text-slate-900 text-center focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">تاریخ انقضا</label>
                  <input
                    type="text"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">قیمت خرید (تومان)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">بارکد کالا (اختیاری)</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="مثال: 626012345010"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">محل نگهداری / قفسه</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="قفسه A-1 / یخچال"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
                >
                  ثبت در کاردکس انبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Category Update Modal */}
      <BatchCategoryModal
        isOpen={showBatchCategoryModal}
        onClose={() => setShowBatchCategoryModal(false)}
        selectedItems={selectedItemsList}
        categories={categories}
        onApplyCategory={handleApplyBatchCategory}
      />

      {/* Batch Stock Adjustment Modal */}
      <BatchStockModal
        isOpen={showBatchStockModal}
        onClose={() => setShowBatchStockModal(false)}
        selectedItems={selectedItemsList}
        onApplyStockAdjustment={handleApplyBatchStockAdjustment}
      />

      {/* Camera QR & Barcode Scanner Modal */}
      <InventoryQrScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        inventory={inventory}
        onUpdateStock={onUpdateStock}
        onShowToast={showToast}
      />

      {/* Barcode & QR Sticker Preview Modal */}
      <InventoryBarcodeModal
        isOpen={!!itemForBarcodeModal}
        onClose={() => setItemForBarcodeModal(null)}
        item={itemForBarcodeModal}
        onShowToast={showToast}
      />

      {/* Dental Supplier Purchase Order & Restock Modal */}
      <SupplierPurchaseOrderModal
        isOpen={showPurchaseOrderModal}
        onClose={() => setShowPurchaseOrderModal(false)}
        inventory={inventory}
        onRestockReceived={(restockedItems) => {
          restockedItems.forEach(({ itemId, quantityAdded }) => {
            const currentItem = inventory.find(i => i.id === itemId);
            if (currentItem) {
              onUpdateStock(itemId, currentItem.stock + quantityAdded);
            }
          });
          showToast(`موجودی ${toPersianDigits(restockedItems.length)} قلم کالا با موفقیت به‌روزرسانی و شارژ شد.`);
        }}
      />
    </div>
  );
};
