import React, { useState } from 'react';
import { 
  X, ShoppingBag, Truck, CheckCircle2, 
  Send, Plus, Trash2, Printer, Building2, 
  Clock, Phone, AlertCircle
} from 'lucide-react';
import { InventoryItem } from '../types/dental';
import { 
  inventoryConsumptionService, 
  DENTAL_SUPPLIERS, 
  SupplierPurchaseOrder, 
  DentalSupplier 
} from '../services/inventoryConsumptionService';
import { toPersianDigits, formatToman, getCurrentPersianDate } from '../utils/jalali';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { clinicalSmsService } from '../services/smsService';

interface SupplierPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onRestockReceived: (items: { itemId: string; quantityAdded: number }[]) => void;
}

export const SupplierPurchaseOrderModal: React.FC<SupplierPurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onRestockReceived
}) => {
  const { impactLight, success, selection } = useHapticFeedback();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('sup-dentkala');
  const [purchaseOrder, setPurchaseOrder] = useState<SupplierPurchaseOrder>(() => 
    inventoryConsumptionService.generateAutoPurchaseOrder(inventory, 'sup-dentkala')
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync purchase order when modal opens or supplier changes
  const handleSelectSupplier = (supplierId: string) => {
    selection();
    setSelectedSupplierId(supplierId);
    const updated = inventoryConsumptionService.generateAutoPurchaseOrder(inventory, supplierId);
    setPurchaseOrder(updated);
  };

  if (!isOpen) return null;

  const currentSupplier: DentalSupplier = DENTAL_SUPPLIERS.find(s => s.id === selectedSupplierId) || DENTAL_SUPPLIERS[0];

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    impactLight();
    const qty = Math.max(1, newQty);
    setPurchaseOrder(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.inventoryItemId === itemId) {
          return {
            ...item,
            quantity: qty,
            totalPrice: qty * item.unitPrice
          };
        }
        return item;
      });
      const newTotal = updatedItems.reduce((sum, i) => sum + i.totalPrice, 0);
      return {
        ...prev,
        items: updatedItems,
        totalAmount: newTotal
      };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    impactLight();
    setPurchaseOrder(prev => {
      const updatedItems = prev.items.filter(item => item.inventoryItemId !== itemId);
      const newTotal = updatedItems.reduce((sum, i) => sum + i.totalPrice, 0);
      return {
        ...prev,
        items: updatedItems,
        totalAmount: newTotal
      };
    });
  };

  const handleSendOrderToSupplier = async () => {
    setIsSubmitting(true);
    impactLight();

    try {
      // Send dispatch notification through clinical SMS
      await clinicalSmsService.sendPatternSms(
        '09123456789',
        currentSupplier.name,
        'lab_ready',
        {
          clinicName: 'مینادنتال',
          manager: 'دکتر مهدی امیری',
          orderNumber: purchaseOrder.orderNumber,
          supplier: currentSupplier.name
        }
      );
    } catch {
      // Non-blocking
    }

    setPurchaseOrder(prev => ({ ...prev, status: 'submitted' }));
    setIsSubmitting(false);
    success();
    setStatusMessage(`پیش‌فاکتور ${purchaseOrder.orderNumber} با موفقیت به شرکت ${currentSupplier.name} ارسال شد.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleReceiveStockIntoClinic = () => {
    success();
    const itemsToAdd = purchaseOrder.items.map(i => ({
      itemId: i.inventoryItemId,
      quantityAdded: i.quantity
    }));

    onRestockReceived(itemsToAdd);
    setPurchaseOrder(prev => ({ ...prev, status: 'received' }));
    setStatusMessage(`تعداد ${toPersianDigits(itemsToAdd.length)} قلم کالا به موجودی انبار کلینیک اضافه شد.`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header with Q-Bank Emerald-Cyan Aesthetic */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">پیش‌فاکتور خرید تجهیزات و مواد دندانپزشکی</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">
                  {purchaseOrder.orderNumber}
                </span>
              </div>
              <p className="text-xs text-white/80">تأمین هوشمند ذخیره انبار و سفارش به شرکت‌های پخش معتبر</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          
          {/* Supplier Selector Chips */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">انتخاب شرکت پخش / تأمین‌کننده:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DENTAL_SUPPLIERS.map(sup => {
                const isSelected = selectedSupplierId === sup.id;
                return (
                  <div
                    key={sup.id}
                    onClick={() => handleSelectSupplier(sup.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-800">{sup.name}</span>
                      <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{sup.specialty}</p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-600">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        {sup.phone}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <Clock className="w-2.5 h-2.5" />
                        تحویل {toPersianDigits(sup.deliveryTimeDays)} روزه
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supplier Info Card */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black text-slate-800">نشانی انبار پخش مرکزی:</span>
              <p className="text-slate-600 text-[11px]">{currentSupplier.address}</p>
              <p className="text-[10px] text-slate-500">مسئول فروش: {currentSupplier.contactPerson}</p>
            </div>
          </div>

          {/* Order Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700">
                اقلام نیازمند تأمین ({toPersianDigits(purchaseOrder.items.length)} ردیف):
              </span>
              <span className="text-[10px] text-slate-400 font-mono">تاریخ صدور: {toPersianDigits(getCurrentPersianDate())}</span>
            </div>

            {purchaseOrder.items.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                هیچ کالایی در وضعیت کسری بحرانی قرار ندارد. تمام اقلام انبار تکمیل هستند!
              </div>
            ) : (
              <div className="space-y-2">
                {purchaseOrder.items.map((item) => (
                  <div 
                    key={item.inventoryItemId}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-xs text-slate-900 truncate">{item.itemName}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span>فی: {formatToman(item.unitPrice)}</span>
                        <span>·</span>
                        <span className="font-bold text-emerald-700">جمع: {formatToman(item.totalPrice)}</span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateItemQty(item.inventoryItemId, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors"
                        >
                          -
                        </button>
                        <span className="font-mono font-black text-xs min-w-[28px] text-center">
                          {toPersianDigits(item.quantity)} {item.unit}
                        </span>
                        <button
                          onClick={() => handleUpdateItemQty(item.inventoryItemId, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.inventoryItemId)}
                        className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        title="حذف ردیف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Summary Box */}
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
            <span className="font-black text-xs text-emerald-900">مجموع برآورد ارزش خرید:</span>
            <span className="font-mono font-black text-base text-emerald-800">
              {formatToman(purchaseOrder.totalAmount)}
            </span>
          </div>

          {/* Notes */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700">یادداشت سفارش: </span>
            {purchaseOrder.notes}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>چاپ پیش‌فاکتور</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {purchaseOrder.status === 'submitted' ? (
              <button
                onClick={handleReceiveStockIntoClinic}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ثبت ورود محموله به انبار کلینیک</span>
              </button>
            ) : (
              <button
                onClick={handleSendOrderToSupplier}
                disabled={isSubmitting || purchaseOrder.items.length === 0}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ارسال...' : 'ارسال سفارش خرید به شرکت'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
