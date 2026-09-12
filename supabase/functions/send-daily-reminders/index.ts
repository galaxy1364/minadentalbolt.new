/**
 * send-daily-reminders — Edge Function
 *
 * هر روز صبح ساعت ۸ (به وقت تهران) اجرا می‌شود.
 * نوبت‌های فردا را از دیتابیس می‌خواند و به هر بیمار
 * یک پیامک یادآوری ارسال می‌کند.
 *
 * راه‌اندازی به صورت Scheduled Function در Supabase Dashboard:
 *   Schedule: 0 4 * * *   (04:00 UTC = 08:30 IRST)
 *   HTTP Method: POST
 *   URL: https://<project>.supabase.co/functions/v1/send-daily-reminders
 *   Authorization: Bearer <service_role_key>
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSProvider {
  send(to: string, message: string): Promise<{ success: boolean; id?: string; error?: string }>;
}

class KavenegarProvider implements SMSProvider {
  private apiKey = Deno.env.get('KAVENEGAR_API_KEY') || '';
  private sender  = Deno.env.get('KAVENEGAR_SENDER') || '';

  async send(to: string, message: string) {
    if (!this.apiKey) return { success: false, error: 'KAVENEGAR_API_KEY not set' };
    const clean   = to.replace(/\D/g, '');
    const number  = clean.startsWith('0') ? clean : `0${clean}`;
    const url     = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
    const params  = new URLSearchParams({ receptor: number, message, sender: this.sender });
    try {
      const res  = await fetch(`${url}?${params}`);
      const data = await res.json();
      return data.return?.status === 200
        ? { success: true, id: String(data.entries?.[0]?.messageid ?? '') }
        : { success: false, error: data.return?.message ?? 'Unknown error' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

class MagfaProvider implements SMSProvider {
  private username = Deno.env.get('MAGFA_USERNAME') || '';
  private password = Deno.env.get('MAGFA_PASSWORD') || '';
  private sender   = Deno.env.get('MAGFA_SENDER') || '';

  async send(to: string, message: string) {
    if (!this.username) return { success: false, error: 'MAGFA credentials not set' };
    const clean = to.replace(/\D/g, '');
    const auth  = btoa(`${this.username}:${this.password}`);
    try {
      const res  = await fetch('https://sms.magfa.com/api/v2/send', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: [clean], message, sender: this.sender }),
      });
      const data = await res.json();
      return data.status === 0
        ? { success: true, id: String(data.id ?? '') }
        : { success: false, error: data.error ?? 'Unknown error' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

function getProvider(): SMSProvider {
  const p = (Deno.env.get('SMS_PROVIDER') || 'kavenegar').toLowerCase();
  return p === 'magfa' ? new MagfaProvider() : new KavenegarProvider();
}

/** تاریخ فردا به فرمت YYYY-MM-DD */
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const targetDate = tomorrow();
  console.log(`[send-daily-reminders] Processing appointments for ${targetDate}`);

  try {
    // نوبت‌های فردا که لغو نشده‌اند
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        id, start_time, type, status, reminder_sent,
        patient:patients ( id, first_name, last_name, phone ),
        doctor:doctors ( name, specialty )
      `)
      .eq('date', targetDate)
      .not('status', 'in', '("cancelled","no_show")')
      .eq('reminder_sent', false);

    if (apptErr) throw apptErr;
    if (!appointments || appointments.length === 0) {
      console.log('[send-daily-reminders] No appointments to remind.');
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const provider  = getProvider();
    let sent = 0, failed = 0;

    for (const appt of appointments) {
      const patient = appt.patient as any;
      if (!patient?.phone) continue;

      const name      = `${patient.first_name} ${patient.last_name}`;
      const doctor    = (appt.doctor as any)?.name
        ? `دکتر ${(appt.doctor as any).name}`
        : 'پزشک محترم';
      const time      = (appt.start_time as string || '').slice(0, 5);
      const message   =
        `${name} عزیز،\nیادآوری نوبت فردا:\nپزشک: ${doctor}\nساعت: ${time}\n\nمطب دندانپزشکی`;

      const result = await provider.send(patient.phone, message);

      // ثبت وضعیت ارسال در لاگ
      await supabase.from('sms_logs').insert({
        id: crypto.randomUUID(),
        recipient: patient.phone,
        message,
        type: 'reminder',
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.id ?? null,
        error: result.error ?? null,
        sent_at: new Date().toISOString(),
      });

      if (result.success) {
        // جلوگیری از ارسال مجدد یادآوری برای همین نوبت
        await supabase
          .from('appointments')
          .update({ reminder_sent: true, last_reminder_sent: new Date().toISOString(), reminder_count: 1 })
          .eq('id', appt.id);
        sent++;
      } else {
        console.error(`[send-daily-reminders] SMS failed for ${patient.phone}:`, result.error);
        failed++;
      }
    }

    console.log(`[send-daily-reminders] Done. sent=${sent}, failed=${failed}`);
    return new Response(
      JSON.stringify({ sent, failed, date: targetDate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[send-daily-reminders] Fatal:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
