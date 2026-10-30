import React, { useState } from 'react';
import { 
  X, Check, Layers, Package, Plus, Minus, 
  ArrowUpDown, Sparkles, AlertCircle, ShoppingCart 
} from 'lucide-react';
import { InventoryItem } from '../types/dental';
import { toPersianDigits } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';

interface BatchCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItem[];
  categories: string[];
  onApplyCategory: (newCategory: string) => void;
}

export const BatchCategoryModal: React.FC<BatchCategoryModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  categories,
  onApplyCategory
}) => {
  const { impactMedium, selection } = useHapticFeedback();
  const [selectedCat, setSelectedCat] = useState<string>(categories[1] || 'کامپوزیت و ترمیم');

  if (!isOpen) return null;

  const validCategories = categories.filter(c => c !== 'همه');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    impactMedium();
    onApplyCategory(selectedCat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-[28px] border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-900 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">تغییر دسته‌بندی گروهی</h3>
              <span className="text-[10px] text-slate-400">
                اعمال برای {toPersianDigits(selectedItems.length)} قلم کالای انتخابی
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Items summary preview */}
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 max-h-28 overflow-y-auto space-y-1 text-xs">
          <span className="text-[10px] text-slate-500 font-bold block mb-1">کالاهای انتخاب شده:</span>
          {selectedItems.map(item => (
            <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-700 bg-white p-1 px-2 rounded-lg border border-slate-100">
              <span className="truncate">{item.name}</span>
              <span className="text-[9px] text-slate-400 mr-2 shrink-0">{item.category}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              دسته‌بندی جدید برای انتقال:
            </label>
            <div className="space-y-1.5">
              {validCategories.map(cat => (
                <label
                  key={cat}
                  onClick={selection}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedCat === cat
                      ? 'bg-purple-50 border-purple-300 text-purple-900 font-black shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat}</span>
                  <input
                    type="radio"
                    name="batchCategory"
                    checked={selectedCat === cat}
                    onChange={() => setSelectedCat(cat)}
                    className="accent-purple-600"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>اعمال دسته‌بندی جدید</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BatchStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItem[];
  onApplyStockAdjustment: (mode: 'add' | 'subtract' | 'set', amount: number) => void;
}

export const BatchStockModal: React.FC<BatchStockModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  onApplyStockAdjustment
}) => {
  const { impactMedium, selection } = useHapticFeedback();
  const [mode, setMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState<number>(5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    impactMedium();
    onApplyStockAdjustment(mode, Number(amount));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-[28px] border border-slate-200 shadow-2xl p-5 space-y-4 text-slate-900 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">تعدیل گروهی موجودی انبار</h3>
              <span className="text-[10px] text-slate-400">
                اعمال برای {toPersianDigits(selectedItems.length)} قلم کالا
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Operation Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-center font-bold">
            <button
              type="button"
              onClick={() => {
                selection();
                setMode('add');
              }}
              className={`py-2 px-1 rounded-xl transition-all ${
                mode === 'add'
                  ? 'bg-emerald-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              افزایش (+ خرید)
            </button>
            <button
              type="button"
              onClick={() => {
                selection();
                setMode('subtract');
              }}
              className={`py-2 px-1 rounded-xl transition-all ${
                mode === 'subtract'
                  ? 'bg-rose-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              کاهش (- مصرف)
            </button>
            <button
              type="button"
              onClick={() => {
                selection();
                setMode('set');
              }}
              className={`py-2 px-1 rounded-xl transition-all ${
                mode === 'set'
                  ? 'bg-amber-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تنظیم مقدار ثابت
            </button>
          </div>

          {/* Amount input & presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block text-center">
              {mode === 'add' && 'تعداد اضافه شده به هر قلم کالا:'}
              {mode === 'subtract' && 'تعداد کسر شده از هر قلم کالا:'}
              {mode === 'set' && 'مقدار موجودی جدید برای همه اقلام انتخابی:'}
            </label>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  selection();
                  setAmount(prev => Math.max(1, prev - 1));
                }}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg flex items-center justify-center active:scale-95 transition-all"
              >
                -
              </button>
              
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 text-center font-mono font-black text-xl py-2 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />

              <button
                type="button"
                onClick={() => {
                  selection();
                  setAmount(prev => prev + 1);
                }}
                className="w-10 h-10 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-lg flex items-center justify-center active:scale-95 transition-all"
              >
                +
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[1, 5, 10, 20].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    selection();
                    setAmount(val);
                  }}
                  className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    amount === val 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {toPersianDigits(val)} عدد
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>اعمال تغییرات موجودی</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
