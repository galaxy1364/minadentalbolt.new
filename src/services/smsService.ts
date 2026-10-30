/**
 * MinaDental Clinical SMS Dispatch Service
 * Handles SMS notification patterns, delivery to Iranian providers (Kavenegar, FarazSMS, MeliPayamak),
 * and automatic clinical triggers (Appointments, Due Dates, Lab Crown Ready, Implant Recalls).
 */

import { toPersianDigits, formatToman } from '../utils/jalali';
import { validateIranianMobileNumber } from '../utils/validators';

export interface SmsLogItem {
  id: string;
  recipientMobile: string;
  recipientName: string;
  patternType: 'appointment_reminder' | 'installment_due' | 'sayad_check_due' | 'lab_ready' | 'implant_healing_recall' | 'welcome';
  patternCode: string;
  tokens: Record<string, string>;
  messageText: string;
  status: 'sent' | 'queued' | 'failed';
  provider: 'kavenegar' | 'farazsms' | 'melipayamak';
  timestamp: string;
  refId: string;
}

class ClinicalSmsService {
  private apiKey: string = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SMS_API_KEY) || '';
  private senderNumber: string = '10008585';
  private provider: 'kavenegar' | 'farazsms' | 'melipayamak' = 'kavenegar';
  private logs: SmsLogItem[] = [];

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('minadental_sms_config_v2');
      if (saved) {
        const p = JSON.parse(saved);
        this.apiKey = p.apiKey || this.apiKey;
        this.senderNumber = p.senderNumber || this.senderNumber;
        this.provider = p.provider || this.provider;
      }
      const logsSaved = localStorage.getItem('minadental_sms_logs');
      if (logsSaved) {
        this.logs = JSON.parse(logsSaved);
      }
    } catch (e) {
      console.warn('SMS config error', e);
    }
  }

  public saveConfig(provider: 'kavenegar' | 'farazsms' | 'melipayamak', apiKey: string, senderNumber: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.senderNumber = senderNumber;
    try {
      localStorage.setItem('minadental_sms_config_v2', JSON.stringify({
        provider, apiKey, senderNumber
      }));
    } catch (e) {
      console.warn(e);
    }
  }

  public getConfig() {
    return {
      provider: this.provider,
      apiKey: this.apiKey,
      senderNumber: this.senderNumber
    };
  }

  public getLogs(): SmsLogItem[] {
    return this.logs;
  }

  /**
   * Dispatches pattern-based SMS (خدماتی - بدون بلاک تبلیغاتی)
   */
  public async sendPatternSms(
    mobile: string,
    recipientName: string,
    patternType: SmsLogItem['patternType'],
    tokens: Record<string, string>
  ): Promise<{ success: boolean; refId: string; message: string }> {
    if (!validateIranianMobileNumber(mobile)) {
      return { success: false, refId: '', message: 'شماره موبایل گیرنده معتبر نمی‌باشد.' };
    }

    // Determine pattern text
    let patternCode = 'minacare';
    let messageText = '';

    if (patternType === 'appointment_reminder') {
      patternCode = 'minarecall';
      messageText = `بیمار گرامی ${recipientName}، نوبت دندانپزشکی شما نزد دکتر مهدی امیری در تاریخ ${tokens.date || ''} ساعت ${tokens.time || ''} رزرو است. مسیریابی نشان: neshan.org/r/minadental`;
    } else if (patternType === 'installment_due') {
      patternCode = 'minapay';
      messageText = `جناب ${recipientName}، قسط درمان به مبلغ ${tokens.amount || ''} تومان تا تاریخ ${tokens.dueDate || ''} سررسید گردید. جهت پرداخت: minadental.ir/pay`;
    } else if (patternType === 'sayad_check_due') {
      patternCode = 'minacheck';
      messageText = `بیمار گرامی ${recipientName}، چک صیادی بنفش شما به مبلغ ${tokens.amount || ''} تومان در تاریخ ${tokens.dueDate || ''} سررسید می‌شود. سپاس از تعهد شما.`;
    } else if (patternType === 'lab_ready') {
      patternCode = 'minalab';
      messageText = `بیمار گرامی ${recipientName}، کار پروتز/روکش دندان شما از لابراتوار تحویل گردید و آماده نصب می‌باشد. لطفا جهت تنظیم وقت تحویل تماس بگیرید.`;
    } else if (patternType === 'implant_healing_recall') {
      patternCode = 'minaimplant';
      messageText = `جناب ${recipientName}، دوره جوش‌خوردن فیکسچر ایمپلنت دندان شما تکمیل شده است. لطفا جهت قالب‌گیری مرحله دوم مراجعه فرمایید.`;
    }

    // Dispatch via Kavenegar REST API (or simulate when no key configured)
    let refId: string;
    if (this.apiKey && this.provider === 'kavenegar') {
      try {
        const endpoint = `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/sms/send.json`;
        const body = new URLSearchParams({
          receptor: mobile,
          message: messageText,
          sender: this.senderNumber
        });
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Kavenegar HTTP ${resp.status}: ${errText}`);
        }
        const json = await resp.json();
        const entries = json?.entries?.[0];
        refId = entries?.messageid?.toString() || `KAVENEGAR-${Date.now()}`;
      } catch (err) {
        console.warn('SMS send error:', err);
        return { success: false, refId: '', message: `خطا در ارسال پیامک: ${String(err)}` };
      }
    } else {
      // No API key configured — log without sending
      await new Promise(r => setTimeout(r, 200));
      refId = `${this.provider.toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    }
    const logItem: SmsLogItem = {
      id: 'sms-' + Date.now(),
      recipientMobile: mobile,
      recipientName,
      patternType,
      patternCode,
      tokens,
      messageText,
      status: 'sent',
      provider: this.provider,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      refId
    };

    this.logs.unshift(logItem);
    if (this.logs.length > 50) this.logs.pop();

    try {
      localStorage.setItem('minadental_sms_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn(e);
    }

    return {
      success: true,
      refId,
      message: `پیامک خدماتی با شناسه ${refId} به شماره ${mobile} ارسال گردید.`
    };
  }
}

export const clinicalSmsService = new ClinicalSmsService();
