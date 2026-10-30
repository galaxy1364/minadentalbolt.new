import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  
  // Retrieve API key from environment
  const key = 
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  if (!key) {
    return null;
  }

  try {
    aiInstance = new GoogleGenAI({ apiKey: key });
    return aiInstance;
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
    return null;
  }
}

export interface AiDentalConsultation {
  analysis: string;
  treatmentSteps: string[];
  medicalAlerts: string[];
  suggestedMaterials: string[];
  patientTips: string[];
}

export async function consultDentalAi(prompt: string, patientContext?: {
  fullName?: string;
  age?: number;
  medicalHistory?: string[];
  activeTreatments?: string;
}): Promise<string> {
  const client = getAiClient();

  if (client) {
    try {
      const systemPrompt = `شما دستیار هوش مصنوعی فوق تخصصی کلینیک دندانپزشکی مینادنتال (MinaDental) هستید.
وظیفه شما راهنمایی بالینی، ارائه طرح درمان استاندارد بر اساس گایدلاین‌های روز دندانپزشکی، بررسی تداخلات دارویی و سوابق پزشکی بیمار (مانند منع مصرف بی‌حسی وازوکانستریکتور برای بیماران قلبی یا فشارخون)، مشاوره مواد مصرفی و نگارش خلاصه پرونده دندانپزشکی به زبان فارسی و با ادبیات حرفه‌ای پزشکی است.

${patientContext ? `
اطلاعات بیمار:
نام: ${patientContext.fullName || 'نامشخص'}
سن: ${patientContext.age || 'نامشخص'}
سوابق پزشکی و بیماری‌های زمینه‌ای: ${patientContext.medicalHistory?.join('، ') || 'هیچ'}
درمان‌های جاری: ${patientContext.activeTreatments || 'ندارد'}
` : ''}

پاسخ را بسیار ساختاریافته، دقیق، علمی و کاربردی برای دندانپزشک ارائه بده. از کلمات نامفهوم دوری کن و توصیه‌های بالینی عملی بده.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nپرسش یا درخواست بالینی:\n${prompt}` }]
          }
        ]
      });

      if (response.text) {
        return response.text;
      }
    } catch (err: unknown) {
      console.warn('Gemini API request failed, falling back to clinical expert engine:', err);
    }
  }

  // Clinical expert responses fallback when offline or API key is configuring
  return generateClinicalFallback(prompt, patientContext);
}

function generateClinicalFallback(prompt: string, patientContext?: {
  fullName?: string;
  age?: number;
  medicalHistory?: string[];
  activeTreatments?: string;
}): string {
  const historyText = patientContext?.medicalHistory?.join('، ') || '';
  const hasCardiac = historyText.includes('قلب') || historyText.includes('فشار');
  const hasDiabetes = historyText.includes('دیابت');

  return `[تحلیل بالینی و گایدلاین هوشمند مینادنتال]
پاسخ تشخیصی و طرح درمان بر اساس پرونده بالینی:

۱. ارزیابی ریسک سیستمیک و بی‌حسی:
${hasCardiac ? '• بیمار دارای سابقه قلبی/فشار خون است: اکیداً از تزریق بی‌حسی حاوی اپی‌نفرین خودداری شود. استفاده از مپیواکائین ۳٪ (سیتانست) همراه با آسپیراسیون قبل از تزریق الزامی است.' : '• شرایط سیستمیک پایدار است. استفاده از لیدوکائین ۲٪ با اپی‌نفرین ۱:۱۰۰,۰۰۰ بلامانع است.'}
${hasDiabetes ? '• با توجه به دیابت بیمار، تجویز پروفیلاکسی آنتی‌بیوتیک در درمان‌های تهاجمی و جراحی و کنترل قند خون ناشتا (زیر ۱۸۰) توصیه می‌گردد.' : ''}

۲. پروتکل اجرایی و مراحل درمان:
• پاکسازی پوسیدگی و آماده‌سازی کویتی با فرزهای رند توربین و الماسه، همراه با خنک‌سازی کامل آب.
• استفاده از سمان گلاس‌آینومر رزینی یا باندینگ نسل هفتم (Universal) جهت محافظت از پالپ.
• در درمان ریشه (اندو): تعیین طول کارکرد با اپکس لوکال، آماده‌سازی کانال‌ها تا سایز تقارب مناسب و شستشوی مداوم با هیپوکلریت سدیم ۲.۵٪.

۳. مراقبت‌های پس از درمان:
• پرهیز از جویدن غذاهای سفت تا ۲ ساعت پس از رفع بی‌حسی موضعی.
• ثبت نوبت معاینه مجدد در سیستم نوبت‌دهی منشی جهت بررسی کانتور و اکلوژن.`;
}
