import { Patient, Appointment, InventoryItem, SayadCheck, Installment, LabOrder, ImplantCase, PaymentRecord } from '../types/dental';
import { getCurrentPersianDate, getRelativePersianDate } from '../utils/jalali';

// Dynamic Persian dates computed live from native Intl
const today = getCurrentPersianDate();
const tomorrow = getRelativePersianDate(1);
const inTwoDays = getRelativePersianDate(2);
const inFiveDays = getRelativePersianDate(5);
const nextWeek = getRelativePersianDate(7);
const inTenDays = getRelativePersianDate(10);
const inTwoWeeks = getRelativePersianDate(14);
const inThreeWeeks = getRelativePersianDate(21);
const nextMonth = getRelativePersianDate(30);
const inTwoMonths = getRelativePersianDate(60);
const inThreeMonths = getRelativePersianDate(90);

const yesterday = getRelativePersianDate(-1);
const pastThreeDays = getRelativePersianDate(-3);
const pastFiveDays = getRelativePersianDate(-5);
const pastSevenDays = getRelativePersianDate(-7);
const pastTenDays = getRelativePersianDate(-10);
const pastTwoWeeks = getRelativePersianDate(-14);
const pastMonth = getRelativePersianDate(-30);
const pastTwoMonths = getRelativePersianDate(-60);

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    fileNumber: 'D-1048',
    fullName: 'علی مرادی',
    nationalId: '۰۰۱۲۸۴۷۵۹۱',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    age: 38,
    gender: 'مرد',
    medicalHistory: ['دیابت کنترل شده', 'حساسیت به پنی‌سیلین'],
    totalCost: 38500000,
    paidAmount: 22000000,
    balance: -16500000, // ۱۶.۵ میلیون تومان بدهکار (اقساط)
    activeTreatmentsCount: 3,
    lastVisit: pastFiveDays,
    nextAppointment: `${tomorrow} - ۱۶:۳۰`,
    notes: 'در حال تکمیل فیکسچر ایمپلنت دندان ۶ و روکش زیرکونیا دندان ۵ بالا راست.',
    teethConditions: {
      'UR_6': {
        quadrant: 'UR',
        toothNumber: 6,
        surfaces: ['occlusal', 'buccal'],
        treatment: 'implant',
        status: 'in_progress',
        notes: 'فیکسچر کاشته شده، در انتظار موعد هیلینگ',
        cost: 18000000,
        doctorName: 'دکتر مهدی امیری',
        date: pastMonth
      },
      'UR_5': {
        quadrant: 'UR',
        toothNumber: 5,
        surfaces: ['occlusal', 'mesial', 'distal'],
        treatment: 'crown_zirconia',
        status: 'in_progress',
        notes: 'قالب‌گیری ارسال به لابراتوار',
        cost: 6500000,
        doctorName: 'دکتر مهدی امیری',
        date: pastTenDays
      },
      'LL_6': {
        quadrant: 'LL',
        toothNumber: 6,
        surfaces: ['occlusal', 'mesial'],
        treatment: 'composite',
        status: 'completed',
        notes: 'ترمیم کامپوزیت خلفی کلاس ۲ با رابردم',
        cost: 2400000,
        doctorName: 'دکتر مهدی امیری',
        date: pastTwoMonths,
        annotations: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><path d="M130,135 Q160,120 190,145 T200,185" stroke="%23ef4444" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="160" cy="160" r="15" fill="%23ef4444" fill-opacity="0.75"/><path d="M125,170 Q145,190 175,180" stroke="%2338bdf8" stroke-width="5" fill="none" stroke-linecap="round"/></svg>'
      }
    },
    sayadChecks: [
      {
        id: 'chk-101',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        sayadId: '۷۳۰۱۸۴۹۲۱۶۴۸۵۲',
        bankName: 'بانک ملت',
        amount: 10000000,
        dueDate: inTenDays,
        drawerName: 'علی مرادی',
        status: 'in_collection',
        isGuarantee: false,
        description: 'قسط اول ایمپلنت'
      },
      {
        id: 'chk-102',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        sayadId: '۴۱۸۰۹۲۶۳۵۱۷۲۸۰',
        bankName: 'بانک صادرات',
        amount: 6500000,
        dueDate: nextMonth,
        drawerName: 'علی مرادی',
        status: 'in_collection',
        isGuarantee: false,
        description: 'قسط دوم و نهایی روکش'
      },
      {
        id: 'chk-103',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        sayadId: '۹۹۰۱۴۴۲۸۷۱۶۰۹۹',
        bankName: 'بانک ملت',
        amount: 25000000,
        dueDate: inTwoMonths,
        drawerName: 'علی مرادی',
        status: 'in_collection',
        isGuarantee: true,
        description: 'چک ضمانت قرارداد کلی ایمپلنت و پروتز'
      }
    ],
    installments: [
      {
        id: 'inst-1',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        treatmentName: 'ایمپلنت و روکش دندان ۶ و ۵',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 6000000,
        dueDate: pastTenDays,
        paidDate: pastTenDays,
        status: 'paid',
        paymentMethod: 'pos'
      },
      {
        id: 'inst-2',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        treatmentName: 'ایمپلنت و روکش دندان ۶ و ۵',
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 10000000,
        dueDate: inTenDays,
        status: 'pending',
        paymentMethod: 'check'
      },
      {
        id: 'inst-3',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        treatmentName: 'ایمپلنت و روکش دندان ۶ و ۵',
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 6500000,
        dueDate: nextMonth,
        status: 'pending',
        paymentMethod: 'check'
      }
    ],
    labOrders: [
      {
        id: 'lab-1',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        toothNumber: 'UR5 (دندان ۵ بالا راست)',
        workType: 'روکش تمام زیرکونیا مولتی‌لیر',
        labName: 'لابراتوار دیجیتال پیشرو',
        shade: 'A2',
        sendDate: pastTenDays,
        deliveryDate: today,
        appointmentDate: tomorrow,
        status: 'ready_for_clinic',
        cost: 2200000,
        reminderNotice: 'کار آماده تحویل به مطب است (نوبت فردا ساعت ۱۶:۳۰)'
      }
    ],
    implantCases: [
      {
        id: 'imp-1',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        toothNumber: 'UR6 (دندان ۶ بالا راست)',
        brand: 'Dentium SuperLine (کره جنوبی)',
        diameter: '4.5 mm',
        length: '10 mm',
        torque: 45,
        boneGraft: true,
        membrane: true,
        surgeryDate: pastMonth,
        healingDueDate: inTwoMonths,
        currentStage: 'fixture_placed',
        notes: 'پیوند پودر استخوان انجام شد، تورک اولیه عالی.'
      }
    ],
    payments: [
      {
        id: 'pay-1',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        amount: 16000000,
        date: pastMonth,
        method: 'pos',
        referenceNumber: '۷۲۸۴۹۱۲۸',
        terminalName: 'دستگاه کارتخوان سامان یونیت ۱',
        forTreatment: 'پیش‌پرداخت جراحی ایمپلنت'
      },
      {
        id: 'pay-2',
        patientId: 'pat-1',
        patientName: 'علی مرادی',
        amount: 6000000,
        date: pastTenDays,
        method: 'card_to_card',
        referenceNumber: '۹۸۴۵۱۲',
        forTreatment: 'قسط اول درمانی'
      }
    ],
    prescriptions: [
      {
        id: 'rx-1',
        patientId: 'pat-1',
        date: pastMonth,
        doctorName: 'دکتر مهدی امیری',
        items: [
          { medicationName: 'کپسول آموکسی‌سیلین ۵۰۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد بعد از غذا' },
          { medicationName: 'قرص ژلوفن (ایبوپروفن) ۴۰۰ میلی‌گرم', dosage: '۲۰ عدد', instructions: 'هر ۸ ساعت ۱ عدد هنگام درد' },
          { medicationName: 'دهان‌شویه کلرهگزیدین ۰.۲٪', dosage: '۱ بطری', instructions: 'روزی ۲ بار بعد از مسواک به مدت ۳۰ ثانیه' }
        ],
        notes: 'مراقبت‌های بعد از کاشت فیکسچر ایمپلنت ناحیه ۶ بالا'
      }
    ],
    consents: [
      {
        id: 'cst-1',
        patientId: 'pat-1',
        procedureType: 'surgery_implant',
        title: 'رضایت‌نامه آگاهانه جراحی ایمپلنت و پیوند استخوان',
        signedDate: pastMonth,
        isConfirmed: true,
        notes: 'بیمار در مورد ریسک عدم اینتگریشن و اهمیت بهداشت دهان توجیه شد.'
      }
    ]
  },
  {
    id: 'pat-2',
    fileNumber: 'D-1049',
    fullName: 'سارا علیزاده',
    nationalId: '۰۰۲۹۱۸۴۷۲۳',
    phone: '۰۹۳۵۱۲۳۴۵۶۷',
    age: 29,
    gender: 'زن',
    medicalHistory: ['ندارد (سالم)'],
    totalCost: 28000000,
    paidAmount: 28000000,
    balance: 0, // تسویه کامل
    activeTreatmentsCount: 1,
    lastVisit: pastThreeDays,
    nextAppointment: `${nextWeek} - ۱۸:۰۰`,
    notes: 'لمینت سرامیکی E-Max فک بالا (۶ واحد قدامی)',
    teethConditions: {
      'UR_1': { quadrant: 'UR', toothNumber: 1, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 },
      'UR_2': { quadrant: 'UR', toothNumber: 2, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 },
      'UR_3': { quadrant: 'UR', toothNumber: 3, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 },
      'UL_1': { quadrant: 'UL', toothNumber: 1, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 },
      'UL_2': { quadrant: 'UL', toothNumber: 2, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 },
      'UL_3': { quadrant: 'UL', toothNumber: 3, surfaces: ['buccal'], treatment: 'laminate', status: 'in_progress', cost: 4500000 }
    },
    sayadChecks: [],
    installments: [],
    labOrders: [
      {
        id: 'lab-2',
        patientId: 'pat-2',
        patientName: 'سارا علیزاده',
        toothNumber: 'UR3 تا UL3 (۶ واحد فک بالا)',
        workType: 'لمینت سرامیکی فوق‌نازک E-Max',
        labName: 'لابراتوار تخصصی رویال دنت',
        shade: 'BL2',
        sendDate: pastThreeDays,
        deliveryDate: inFiveDays,
        appointmentDate: nextWeek,
        status: 'fabrication',
        cost: 12000000,
        reminderNotice: 'در حال پخت پرسلن'
      }
    ],
    implantCases: [],
    payments: [
      {
        id: 'pay-3',
        patientId: 'pat-2',
        patientName: 'سارا علیزاده',
        amount: 28000000,
        date: pastThreeDays,
        method: 'pos',
        referenceNumber: '۸۸۱۹۲۳۴۰',
        terminalName: 'کارتخوان پذیرش مطب',
        forTreatment: 'تسویه کامل ۶ واحد لمینت سرامیکی'
      }
    ]
  },
  {
    id: 'pat-3',
    fileNumber: 'D-1050',
    fullName: 'محمدرضا حسینی',
    nationalId: '۰۴۵۱۹۳۸۴۷۲',
    phone: '۰۹۱۹۷۶۵۴۳۲۱',
    age: 45,
    gender: 'مرد',
    medicalHistory: ['فشار خون بالا (مصرف لوزارتان)', 'سابقه جراحی بای‌پس'],
    totalCost: 12800000,
    paidAmount: 6000000,
    balance: -6800000,
    activeTreatmentsCount: 2,
    lastVisit: pastSevenDays,
    nextAppointment: `${tomorrow} - ۱۷:۳۰`,
    notes: 'عصب‌کشی (اندو) تخصصی ۳ کانال دندان ۶ پایین چپ و پست و کور',
    teethConditions: {
      'LL_6': {
        quadrant: 'LL',
        toothNumber: 6,
        surfaces: ['occlusal', 'rootCanal'],
        treatment: 'endo',
        status: 'in_progress',
        cost: 5800000,
        notes: 'کانال‌ها آماده‌سازی شده، پانسمان شد'
      }
    },
    sayadChecks: [
      {
        id: 'chk-104',
        patientId: 'pat-3',
        patientName: 'محمدرضا حسینی',
        sayadId: '۵۵۴۰۱۸۲۹۳۶۴۱۷۸',
        bankName: 'بانک سپه',
        amount: 6800000,
        dueDate: inTwoWeeks,
        drawerName: 'محمدرضا حسینی',
        status: 'in_collection',
        isGuarantee: false,
        description: 'تسویه هزینه اندو و روکش'
      }
    ],
    installments: [],
    labOrders: [],
    implantCases: [],
    payments: [
      {
        id: 'pay-4',
        patientId: 'pat-3',
        patientName: 'محمدرضا حسینی',
        amount: 6000000,
        date: pastSevenDays,
        method: 'pos',
        referenceNumber: '۴۱۷۲۸۳۹۴',
        forTreatment: 'پیش‌پرداخت اندو تخصصی'
      }
    ]
  },
  {
    id: 'pat-4',
    fileNumber: 'D-1051',
    fullName: 'نگار تهرانی',
    nationalId: '۰۰۷۱۸۲۹۳۰۴',
    phone: '۰۹۱۲۹۸۷۶۵۴۳',
    age: 32,
    gender: 'زن',
    medicalHistory: ['ندارد'],
    totalCost: 8500000,
    paidAmount: 8500000,
    balance: 0,
    activeTreatmentsCount: 0,
    lastVisit: pastTwoWeeks,
    notes: 'جرم‌گیری و بروساژ کامل + ترمیم کامپوزیت زیبایی',
    teethConditions: {},
    sayadChecks: [],
    installments: [],
    labOrders: [],
    implantCases: [],
    payments: []
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    patientName: 'علی مرادی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    unit: 'یونیت ۱',
    doctor: 'دکتر مهدی امیری',
    date: today,
    time: '۱۶:۳۰',
    durationMinutes: 45,
    treatment: 'امتحان و سمان روکش زیرکونیا UR5',
    status: 'waiting'
  },
  {
    id: 'apt-2',
    patientId: 'pat-3',
    patientName: 'محمدرضا حسینی',
    phone: '۰۹۱۹۷۶۵۴۳۲۱',
    unit: 'یونیت ۱',
    doctor: 'دکتر مهدی امیری',
    date: today,
    time: '۱۷:۳۰',
    durationMinutes: 60,
    treatment: 'جلسه دوم روت‌کانال (آبچوریشن ۳ کانال دندان ۶ پایین)',
    status: 'scheduled'
  },
  {
    id: 'apt-3',
    patientId: 'pat-2',
    patientName: 'سارا علیزاده',
    phone: '۰۹۳۵۱۲۳۴۵۶۷',
    unit: 'یونیت ۲',
    doctor: 'دکتر مریم رضایی',
    date: today,
    time: '۱۸:۳۰',
    durationMinutes: 45,
    treatment: 'چکاپ و بررسی تماس لمینت‌ها',
    status: 'scheduled'
  },
  {
    id: 'apt-4',
    patientId: 'pat-4',
    patientName: 'نگار تهرانی',
    phone: '۰۹۱۲۹۸۷۶۵۴۳',
    unit: 'اتاق جراحی',
    doctor: 'دکتر مهدی امیری',
    date: today,
    time: '۱۹:۱۵',
    durationMinutes: 30,
    treatment: 'معاینه و قالب‌گیری مطالعه',
    status: 'scheduled'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'کامپوزیت فیلتک 3M مدل Z250 (رنگ A2)',
    category: 'کامپوزیت و ترمیم',
    stock: 8,
    unit: 'سرنگ ۴ گرمی',
    minAlert: 3,
    expiryDate: getRelativePersianDate(300),
    pricePerUnit: 2200000,
    barcode: '626012345001',
    qrCode: 'MINA-COMP-Z250-A2',
    location: 'قفسه A-1 (مواد ترمیمی)'
  },
  {
    id: 'inv-2',
    name: 'کارپول بی‌حسی لیدوکائین ۲٪ با اپی‌نفرین داروپخش',
    category: 'بی‌حسی و دارو',
    stock: 140,
    unit: 'عدد',
    minAlert: 50,
    expiryDate: getRelativePersianDate(180),
    pricePerUnit: 38000,
    barcode: '626012345002',
    qrCode: 'MINA-ANESTH-LIDO',
    location: 'یخچال دارویی مطب'
  },
  {
    id: 'inv-3',
    name: 'فیکسچر ایمپلنت Dentium SuperLine قطر 4.5 طول 10',
    category: 'ایمپلنت و جراحی',
    stock: 1, // Below minAlert (3) - Critical low stock!
    unit: 'کیت استریل',
    minAlert: 3,
    expiryDate: getRelativePersianDate(500),
    pricePerUnit: 8500000,
    barcode: '626012345003',
    qrCode: 'MINA-IMP-DENT-4510',
    location: 'کابینت جراحی ایمپلنت'
  },
  {
    id: 'inv-4',
    name: 'پودر استخوان آلوگرافت زنوگرافت Cerabone (۰.۵ گرم)',
    category: 'ایمپلنت و جراحی',
    stock: 3,
    unit: 'ویال استریل',
    minAlert: 2,
    expiryDate: getRelativePersianDate(400),
    pricePerUnit: 4900000,
    barcode: '626012345004',
    qrCode: 'MINA-SURG-CERABONE',
    location: 'کابینت جراحی ایمپلنت'
  },
  {
    id: 'inv-5',
    name: 'ماده قالب‌گیری سیلیکونی افزایشی Speedex (پوتی و واش)',
    category: 'پروتز و قالب‌گیری',
    stock: 1, // Below minAlert (2) - Low stock!
    unit: 'ست',
    minAlert: 2,
    expiryDate: getRelativePersianDate(250),
    pricePerUnit: 3400000,
    barcode: '626012345005',
    qrCode: 'MINA-PROSTH-SPEEDEX',
    location: 'قفسه B-2 (پروتز)'
  },
  {
    id: 'inv-6',
    name: 'فایل روتاری پروتیپر گلد دنتسپلی (SX-F3)',
    category: 'اندودانتیکس',
    stock: 12,
    unit: 'بسته ۶ عددی',
    minAlert: 4,
    expiryDate: getRelativePersianDate(365),
    pricePerUnit: 2800000,
    barcode: '626012345006',
    qrCode: 'MINA-ENDO-PROTAPER',
    location: 'قفسه C-1 (اندو)'
  },
  {
    id: 'inv-7',
    name: 'سر سوزن دندانپزشکی گیج ۲۷ بلند سوپا',
    category: 'مصرفی و بهداشتی',
    stock: 8, // Below minAlert (25) - Low stock!
    unit: 'بسته ۱۰۰ عددی',
    minAlert: 25,
    expiryDate: getRelativePersianDate(420),
    pricePerUnit: 145000,
    barcode: '626012345007',
    qrCode: 'MINA-DISP-NEEDLE27',
    location: 'کمد انبار مصرفی'
  },
  {
    id: 'inv-8',
    name: 'باندینگ نسل پنجم Single Bond Universal 3M',
    category: 'کامپوزیت و ترمیم',
    stock: 5,
    unit: 'بطری ۵ میلی‌لیتر',
    minAlert: 2,
    expiryDate: getRelativePersianDate(320),
    pricePerUnit: 3100000,
    barcode: '626012345008',
    qrCode: 'MINA-COMP-BOND3M',
    location: 'قفسه A-1 (مواد ترمیمی)'
  },
  {
    id: 'inv-9',
    name: 'دستکش نیتریل مشکی بدون پودر اپی‌پرودنت (M)',
    category: 'مصرفی و بهداشتی',
    stock: 4,
    unit: 'بسته ۱۰۰ عددی',
    minAlert: 6, // Low stock!
    expiryDate: getRelativePersianDate(480),
    pricePerUnit: 260000,
    barcode: '626012345009',
    qrCode: 'MINA-DISP-GLOVES-M',
    location: 'کمد انبار مصرفی'
  }
];
