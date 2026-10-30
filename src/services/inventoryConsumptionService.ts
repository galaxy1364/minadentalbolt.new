import { InventoryItem, TreatmentType } from '../types/dental';

export interface TreatmentConsumptionRecipe {
  treatmentType: TreatmentType;
  title: string;
  items: {
    categoryMatch?: string;
    nameKeyword: string;
    quantity: number;
    unitName: string;
  }[];
}

export interface ConsumptionResult {
  updatedInventory: InventoryItem[];
  deductedItems: {
    itemId: string;
    itemName: string;
    amountDeducted: number;
    remainingStock: number;
    isBelowAlert: boolean;
  }[];
  criticalAlerts: {
    itemId: string;
    itemName: string;
    currentStock: number;
    minAlert: number;
  }[];
}

export interface DentalSupplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  specialty: string;
  deliveryTimeDays: number;
}

export interface SupplierPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  status: 'draft' | 'submitted' | 'received' | 'cancelled';
  items: {
    inventoryItemId: string;
    itemName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  notes?: string;
}

export const DENTAL_SUPPLIERS: DentalSupplier[] = [
  {
    id: 'sup-dentkala',
    name: 'شرکت بازرگانی دنت‌کالا',
    contactPerson: 'مهندس رضایی',
    phone: '۰۲۱-۸۸۹۹۲۲۰۱',
    address: 'تهران، خیابان آزادی، تقاطع نواب، برج دندانپزشکی کالا، طبقه ۵',
    specialty: 'توزیع سراسری انواع مواد مصرفی، کامپوزیت و بی‌حسی',
    deliveryTimeDays: 1
  },
  {
    id: 'sup-pishgaman',
    name: 'پیشگامان سلامت دنتال (نمایندگی دنتیوم)',
    contactPerson: 'دکتر افشار',
    phone: '۰۲۱-۲۲۶۵۴۱۰۰',
    address: 'تهران، خیابان ولیعصر، نرسیده به پارک وی، پلاک ۱۲۴',
    specialty: 'تخصصی کیت‌ها و فیکسچرهای ایمپلنت، پودر استخوان و ممبرین',
    deliveryTimeDays: 2
  },
  {
    id: 'sup-caldent',
    name: 'تجهیزات و ملزومات دندانپزشکی کالدنت',
    contactPerson: 'آقای شجاعی',
    phone: '۰۲۱-۶۶۴۰۱۸۹۰',
    address: 'تهران، خیابان انقلاب، روبروی دانشگاه، بازار دنتال ایران',
    specialty: 'مواد قالب‌گیری پروتز، آلژینات، گوتاپرکا و روتاری اندو',
    deliveryTimeDays: 1
  },
  {
    id: 'sup-kavosh',
    name: 'پخش سراسری کاوش طب البرز',
    contactPerson: 'مهندس تهرانی',
    phone: '۰۲۱-۴۴۲۱۰۸۰۲',
    address: 'تهران، ستارخان، جنب پل تاج، ساختمان دندانپزشکی پاستور',
    specialty: 'سر سوزن، دستکش نیتریل، رول پنبه و ملزومات عمومی استریل',
    deliveryTimeDays: 1
  }
];

// Clinical bill-of-materials per dental treatment
export const CLINICAL_CONSUMPTION_RECIPES: Partial<Record<TreatmentType, TreatmentConsumptionRecipe>> = {
  composite: {
    treatmentType: 'composite',
    title: 'ترمیم کامپوزیت',
    items: [
      { nameKeyword: 'کامپوزیت', quantity: 1, unitName: 'تیوپ/واحد' },
      { nameKeyword: 'لیدوکائین', quantity: 1, unitName: 'کارپول' },
      { nameKeyword: 'سوزن', quantity: 1, unitName: 'عدد' }
    ]
  },
  amalgam: {
    treatmentType: 'amalgam',
    title: 'ترمیم آمالگام',
    items: [
      { nameKeyword: 'لیدوکائین', quantity: 1, unitName: 'کارپول' },
      { nameKeyword: 'سوزن', quantity: 1, unitName: 'عدد' }
    ]
  },
  implant: {
    treatmentType: 'implant',
    title: 'جراحی ایمپلنت',
    items: [
      { nameKeyword: 'فیکسچر', quantity: 1, unitName: 'کیت استریل' },
      { nameKeyword: 'لیدوکائین', quantity: 2, unitName: 'کارپول' },
      { nameKeyword: 'سوزن', quantity: 2, unitName: 'عدد' }
    ]
  },
  endo: {
    treatmentType: 'endo',
    title: 'عصب‌کشی و درمان ریشه',
    items: [
      { nameKeyword: 'پروتیپر', quantity: 1, unitName: 'فایل' },
      { nameKeyword: 'لیدوکائین', quantity: 2, unitName: 'کارپول' },
      { nameKeyword: 'سوزن', quantity: 1, unitName: 'عدد' }
    ]
  },
  extraction: {
    treatmentType: 'extraction',
    title: 'کشیدن دندان',
    items: [
      { nameKeyword: 'لیدوکائین', quantity: 1, unitName: 'کارپول' },
      { nameKeyword: 'سوزن', quantity: 1, unitName: 'عدد' },
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  crown_zirconia: {
    treatmentType: 'crown_zirconia',
    title: 'روکش زیرکونیا',
    items: [
      { nameKeyword: 'Speedex', quantity: 1, unitName: 'ست قالب‌گیری' },
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  crown_pfm: {
    treatmentType: 'crown_pfm',
    title: 'روکش PFM',
    items: [
      { nameKeyword: 'Speedex', quantity: 1, unitName: 'ست قالب‌گیری' },
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  laminate: {
    treatmentType: 'laminate',
    title: 'لمینت سرامیکی',
    items: [
      { nameKeyword: 'Speedex', quantity: 1, unitName: 'ست قالب‌گیری' },
      { nameKeyword: 'باندینگ', quantity: 1, unitName: 'واحد' }
    ]
  },
  bleaching: {
    treatmentType: 'bleaching',
    title: 'بلیچینگ و سفیدکردن',
    items: [
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  scaling: {
    treatmentType: 'scaling',
    title: 'جرم‌گیری و بروساژ',
    items: [
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  pulpotomy: {
    treatmentType: 'pulpotomy',
    title: 'پالپوتومی اطفال',
    items: [
      { nameKeyword: 'لیدوکائین', quantity: 1, unitName: 'کارپول' }
    ]
  },
  pulpectomy: {
    treatmentType: 'pulpectomy',
    title: 'پالپکتومی اطفال',
    items: [
      { nameKeyword: 'لیدوکائین', quantity: 1, unitName: 'کارپول' }
    ]
  },
  ss_crown: {
    treatmentType: 'ss_crown',
    title: 'روکش استیل اطفال',
    items: [
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  fissure_sealant: {
    treatmentType: 'fissure_sealant',
    title: 'فیشورسیلانت',
    items: [
      { nameKeyword: 'باندینگ', quantity: 1, unitName: 'واحد' }
    ]
  },
  fluoride: {
    treatmentType: 'fluoride',
    title: 'فلورایدتراپی',
    items: [
      { nameKeyword: 'دستکش', quantity: 1, unitName: 'جفت' }
    ]
  },
  space_maintainer: {
    treatmentType: 'space_maintainer',
    title: 'فضانگهدار',
    items: [
      { nameKeyword: 'Speedex', quantity: 1, unitName: 'ست قالب‌گیری' }
    ]
  }
};

class InventoryConsumptionService {
  /**
   * Automatically deducts supplies from inventory when a dental procedure is performed
   */
  deductSuppliesForTreatment(
    treatmentType: TreatmentType,
    currentInventory: InventoryItem[]
  ): ConsumptionResult {
    const recipe = CLINICAL_CONSUMPTION_RECIPES[treatmentType];
    if (!recipe || recipe.items.length === 0) {
      return {
        updatedInventory: currentInventory,
        deductedItems: [],
        criticalAlerts: []
      };
    }

    const deductedItems: ConsumptionResult['deductedItems'] = [];
    const criticalAlerts: ConsumptionResult['criticalAlerts'] = [];

    // Clone inventory array
    const updatedInventory = currentInventory.map(item => {
      // Find if this item matches any requirement in the recipe
      const matchingRecipeItem = recipe.items.find(ri => 
        item.name.toLowerCase().includes(ri.nameKeyword.toLowerCase()) ||
        item.category.toLowerCase().includes(ri.nameKeyword.toLowerCase())
      );

      if (matchingRecipeItem && item.stock > 0) {
        const qtyToDeduct = Math.min(item.stock, matchingRecipeItem.quantity);
        const newStock = Math.max(0, item.stock - qtyToDeduct);
        const isBelow = newStock <= item.minAlert;

        deductedItems.push({
          itemId: item.id,
          itemName: item.name,
          amountDeducted: qtyToDeduct,
          remainingStock: newStock,
          isBelowAlert: isBelow
        });

        if (isBelow) {
          criticalAlerts.push({
            itemId: item.id,
            itemName: item.name,
            currentStock: newStock,
            minAlert: item.minAlert
          });
        }

        return {
          ...item,
          stock: newStock
        };
      }

      return item;
    });

    return {
      updatedInventory,
      deductedItems,
      criticalAlerts
    };
  }

  /**
   * Generates a recommended re-order purchase order based on current low stock items
   */
  generateAutoPurchaseOrder(
    inventory: InventoryItem[],
    preferredSupplierId: string = 'sup-dentkala'
  ): SupplierPurchaseOrder {
    const lowStock = inventory.filter(i => i.stock <= i.minAlert);
    const supplier = DENTAL_SUPPLIERS.find(s => s.id === preferredSupplierId) || DENTAL_SUPPLIERS[0];

    const orderItems = lowStock.map(item => {
      // Recommended reorder is triple minAlert or at least 5 units
      const recommendedQty = Math.max(5, item.minAlert * 3);
      const unitPrice = item.pricePerUnit || 1000000;
      return {
        inventoryItemId: item.id,
        itemName: item.name,
        unit: item.unit,
        quantity: recommendedQty,
        unitPrice,
        totalPrice: recommendedQty * unitPrice
      };
    });

    const totalAmount = orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    return {
      id: `po-${Date.now()}`,
      orderNumber: `PO-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toLocaleDateString('fa-IR'),
      status: 'draft',
      items: orderItems,
      totalAmount,
      notes: 'سفارش فوری جهت تکمیل ذخیره احتیاطی کلینیک مینادنتال دکتر مهدی امیری'
    };
  }
}

export const inventoryConsumptionService = new InventoryConsumptionService();
