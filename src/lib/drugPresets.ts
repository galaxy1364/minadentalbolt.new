// src/lib/drugPresets.ts — Standard 1-click clinical dental prescription presets

export interface DrugPresetItem {
  drug_name: string
  dosage: string
  frequency: string
  instructions: string
  quantity?: number
}

export interface DrugPreset {
  id: string
  title: string
  category: 'surgery' | 'endo' | 'infection' | 'pediatric' | 'general'
  description: string
  badgeColor: string
  items: DrugPresetItem[]
}

export const DENTAL_DRUG_PRESETS: DrugPreset[] = [
  {
    id: 'post_wisdom_surgery',
    title: 'پک جراحی دندان عقل و کشیدن پیچیده',
    category: 'surgery',
    description: 'آموکسی‌سیلین ۵۰۰ + ژلوفن ۴۰۰ + دهانشویه کلرهگزیدین',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
    items: [
      {
        drug_name: 'آموکسی‌سیلین ۵۰۰ میلی‌گرم',
        dosage: 'کپسول ۵۰۰mg',
        frequency: 'هر ۸ ساعت',
        instructions: 'یک عدد همراه با یک لیوان آب کامل بعد از غذا (طول دوره ۵ تا ۷ روز)',
        quantity: 21,
      },
      {
        drug_name: 'ژلوفن (ایبوپروفن) ۴۰۰ میلی‌گرم',
        dosage: 'کپسول ژلاتینی ۴۰۰mg',
        frequency: 'هر ۸ ساعت بعد از غذا',
        instructions: 'یک عدد همراه با آب زیاد بعد از وعده غذایی میل شود',
        quantity: 10,
      },
      {
        drug_name: 'دهانشویه کلرهگزیدین ۰.۲٪',
        dosage: 'محلول دهانشویه',
        frequency: 'روزی ۲ بار',
        instructions: 'شروع از ۲۴ ساعت پس از جراحی؛ هر بار ۱۵ سی‌سی به مدت ۱ دقیقه قرقره و خارج شود',
        quantity: 1,
      },
    ],
  },
  {
    id: 'acute_dental_abscess',
    title: 'پک عفونت حاد و آبسه دندان',
    category: 'infection',
    description: 'آموکسی‌سیلین ۵۰۰ + مترونیدازول ۲۵۰ + ناپروکسن',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    items: [
      {
        drug_name: 'آموکسی‌سیلین ۵۰۰ میلی‌گرم',
        dosage: 'کپسول ۵۰۰mg',
        frequency: 'هر ۸ ساعت',
        instructions: 'یک عدد سر ساعت با آب فراوان میل شود',
        quantity: 21,
      },
      {
        drug_name: 'مترونیدازول ۲۵۰ میلی‌گرم',
        dosage: 'قرص ۲۵۰mg',
        frequency: 'هر ۸ ساعت',
        instructions: 'یک عدد همراه غذا میل شود (از مصرف الکل اکیداً خودداری شود)',
        quantity: 20,
      },
      {
        drug_name: 'ناپروکسن ۵۰۰ میلی‌گرم',
        dosage: 'قرص ۵۰۰mg',
        frequency: 'هر ۱۲ ساعت',
        instructions: 'یک عدد بعد از غذا در صورت درد و التهاب میل شود',
        quantity: 10,
      },
    ],
  },
  {
    id: 'acute_pulpitis_endo',
    title: 'پک پالپیت و تسکین درد پس از عصب‌کشی (اندو)',
    category: 'endo',
    description: 'ایبوپروفن ۴۰۰ + استامینوفن کدئین ۳۰۰/۱۰',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
    items: [
      {
        drug_name: 'ایبوپروفن ۴۰۰ میلی‌گرم',
        dosage: 'قرص ۴۰۰mg',
        frequency: 'هر ۶ تا ۸ ساعت',
        instructions: 'یک عدد بعد از غذا در صورت احساس درد و ضربان',
        quantity: 10,
      },
      {
        drug_name: 'استامینوفن کدئین ۳۰۰/۱۰ میلی‌گرم',
        dosage: 'قرص خوراکی',
        frequency: 'در صورت درد شدید هر ۸ ساعت',
        instructions: 'یک عدد در صورت عدم تسکین کامل با ایبوپروفن میل شود',
        quantity: 10,
      },
    ],
  },
  {
    id: 'implant_placement',
    title: 'پک جراحی کاشت ایمپلنت',
    category: 'surgery',
    description: 'آموکسی‌کلاو ۶۲۵ + سلکوکسیب ۲۰۰ + دهانشویه بنزیدامین',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    items: [
      {
        drug_name: 'کوآموکسی‌کلاو ۶۲۵ میلی‌گرم',
        dosage: 'قرص ۶۲۵mg',
        frequency: 'هر ۸ ساعت',
        instructions: 'یک عدد در ابتدای وعده غذایی میل شود',
        quantity: 20,
      },
      {
        drug_name: 'سلکوکسیب ۲۰۰ میلی‌گرم',
        dosage: 'کپسول ۲۰۰mg',
        frequency: 'روزی یک تا دو بار',
        instructions: 'یک عدد بعد از صبحانه یا شام جهت کاهش ورم بافت لثه',
        quantity: 10,
      },
      {
        drug_name: 'دهانشویه بنزیدامین ۰.۱۵٪',
        dosage: 'محلول ضدالتهاب',
        frequency: 'هر ۸ ساعت',
        instructions: '۱۵ میلی‌لیتر بدون رقیق‌سازی ۳۰ ثانیه قرقره شود',
        quantity: 1,
      },
    ],
  },
  {
    id: 'pediatric_dental_pack',
    title: 'پک درد و عفونت دندانپزشکی اطفال',
    category: 'pediatric',
    description: 'سوسپانسیون آموکسی‌سیلین ۲۵۰ + شربت ایبوپروفن اطفال',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
    items: [
      {
        drug_name: 'سوسپانسیون آموکسی‌سیلین ۲۵۰ میلی‌گرم/۵ میلی‌لیتر',
        dosage: 'شربت خوراکی',
        frequency: 'هر ۸ ساعت',
        instructions: 'میزان مصرف دقیق طبق وزن کودک (توسط پزشک) با پیمانه مدرج مصرف شود',
        quantity: 1,
      },
      {
        drug_name: 'شربت ایبوپروفن ۱۰۰ میلی‌گرم/۵ میلی‌لیتر',
        dosage: 'شربت خوراکی',
        frequency: 'هر ۶ تا ۸ ساعت در صورت درد و تب',
        instructions: 'بعد از تغذیه کودک و همراه با مایعات کافی مصرف شود',
        quantity: 1,
      },
    ],
  },
  {
    id: 'simple_extraction_pack',
    title: 'پک تسکین درد کشیدن ساده دندان',
    category: 'surgery',
    description: 'ژلوفن ۴۰۰ یا استامینوفن کدئین + دهانشویه آب‌نمک ولرم',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    items: [
      {
        drug_name: 'ژلوفن (ایبوپروفن) ۴۰۰ میلی‌گرم',
        dosage: 'کپسول ۴۰۰mg',
        frequency: 'هر ۶ تا ۸ ساعت در صورت احساس درد',
        instructions: 'یک عدد همراه آب کافی بعد از غذا مصرف شود',
        quantity: 10,
      },
      {
        drug_name: 'دهانشویه سرم فیزیولوژی (نرمال سالین)',
        dosage: 'محلول شستشو',
        frequency: 'روزانه ۳ تا ۴ بار بعد از ۲۴ ساعت اول',
        instructions: 'به آرامی در دهان چرخانده و خارج شود؛ از تف کردن محکم خودداری فرمایید',
        quantity: 1,
      },
    ],
  },
  {
    id: 'perio_maintenance_pack',
    title: 'پک بیماری‌های لثه و پریودنتال',
    category: 'general',
    description: 'داکسی‌سایکلین ۱۰۰ + دهانشویه کلرهگزیدین ۰.۲٪',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300',
    items: [
      {
        drug_name: 'داکسی‌سایکلین ۱۰۰ میلی‌گرم',
        dosage: 'کپسول ۱۰۰mg',
        frequency: 'روز اول ۲ کپسول، سپس روزی ۱ کپسول به مدت ۱۴ روز',
        instructions: 'همراه با یک لیوان آب کامل و در حالت ایستاده میل شود؛ تا ۱ ساعت بعد دراز نکشید',
        quantity: 15,
      },
      {
        drug_name: 'دهانشویه کلرهگزیدین ۰.۲٪',
        dosage: 'محلول دهانشویه',
        frequency: 'روزی ۲ بار صبح و شب به مدت ۱۰ روز',
        instructions: 'نیم ساعت بعد از مسواک، ۱۵ سی‌سی به مدت ۱ دقیقه چرخانده و تخلیه شود',
        quantity: 1,
      },
    ],
  },
]
