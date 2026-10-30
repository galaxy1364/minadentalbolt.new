import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * MOD-FIX-010 | ساخت حساب ورود برای پرسنل
 *
 * Every failure path here now answers in Persian and says what to do
 * next. The version this replaces passed Supabase's raw English through
 * ("A user with this email address has already been registered"), and the
 * app then swallowed it behind a green success toast — so a real 422 from
 * the auth API looked, on the phone, exactly like everything working.
 *
 * Deployed as invite-staff v6 on 2026-08-31. This file and the deployed
 * function must stay identical; being in the repo is not being deployed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  email?: string | null;
  phone?: string | null;
  password: string;
  full_name: string;
  access_role: string;
  clinic_id: string;
  doctor_id?: string | null;
  staff_id?: string | null;
}

const VALID_ROLES = ['owner', 'doctor', 'receptionist', 'assistant', 'lab', 'accountant'];

function fail(message: string, status: number, code?: string) {
  return new Response(JSON.stringify({ error: message, code: code ?? null }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Turns an auth-API error into something a clinic manager can act on.
 * Anything unrecognised keeps its original text — a strange English
 * message beats a friendly Persian one that hides which thing broke.
 */
function explainCreateError(message: string, hasEmail: boolean): string {
  const m = message.toLowerCase();
  if (m.includes('already been registered') || m.includes('email_exists')) {
    return 'این ایمیل از قبل یک حساب ورود دارد. اگر این شخص باید با همین ایمیل وارد شود، از همان حساب استفاده کند؛ برای شخص جدید یک ایمیل دیگر بگذارید.';
  }
  if (m.includes('phone_exists') || m.includes('phone number has already')) {
    return 'این شماره موبایل از قبل یک حساب ورود دارد. برای شخص جدید شماره‌ی دیگری بگذارید.';
  }
  if (m.includes('phone_provider_disabled') || m.includes('phone logins are disabled')) {
    return 'ورود با موبایل در تنظیمات Supabase فعال نیست. فعلاً برای این شخص ایمیل بگذارید.';
  }
  if (m.includes('weak') || m.includes('password')) {
    return 'رمز عبور ضعیف است — رمز طولانی‌تری انتخاب کنید.';
  }
  if (m.includes('invalid') && hasEmail) {
    return 'قالب ایمیل معتبر نیست.';
  }
  return message;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return fail('برای ساخت حساب باید وارد شده باشید — یک بار خارج و دوباره وارد شوید.', 401, 'unauthorized');
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: callerRow } = await admin.from('users').select('role, clinic_id').eq('id', caller.id).maybeSingle();
    if (!callerRow) {
      return fail('حساب شما به هیچ کلینیکی وصل نیست، پس نمی‌تواند حساب بسازد.', 403, 'no_profile');
    }
    if (callerRow.role !== 'owner') {
      return fail(`فقط مدیر کلینیک می‌تواند حساب کاربری بسازد — نقش فعلی شما «${callerRow.role}» است.`, 403, 'not_owner');
    }

    const body: InviteRequest = await req.json();
    const email = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;

    if (!email && !phone) return fail('ایمیل یا موبایل لازم است.', 400, 'missing_identifier');
    if (!body.password || body.password.length < 6) return fail('رمز عبور باید حداقل ۶ کاراکتر باشد.', 400, 'weak_password');
    if (!VALID_ROLES.includes(body.access_role)) return fail('نقش نامعتبر است.', 400, 'invalid_role');

    // Checked before createUser so the common case — ticking «ساخت حساب
    // ورود» on someone who already has one — gets a precise answer
    // instead of a raw 422 from the auth API.
    if (body.staff_id) {
      const { data: existingForStaff } = await admin
        .from('users').select('id').eq('staff_id', body.staff_id).maybeSingle();
      if (existingForStaff) {
        return fail('این پرسنل از قبل حساب ورود دارد. برای عوض کردن رمز، از «فراموشی رمز» در صفحه‌ی ورود استفاده کنید.', 409, 'staff_already_has_login');
      }
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password: body.password,
      email_confirm: !!email,
      phone_confirm: !!phone,
    });
    if (createErr || !created?.user) {
      const raw = createErr?.message || 'ساخت کاربر ناموفق بود';
      return fail(explainCreateError(raw, !!email), 400, 'create_user_failed');
    }

    const { error: rowErr } = await admin.from('users').insert({
      id: created.user.id,
      clinic_id: body.clinic_id || callerRow.clinic_id,
      full_name: body.full_name,
      role: body.access_role,
      doctor_id: body.access_role === 'doctor' ? (body.doctor_id || null) : null,
      staff_id: body.staff_id || null,
      is_active: true,
    });
    if (rowErr) {
      // An auth user with no profile row can sign in but has no clinic and
      // no role, which is worse than not existing. It was created moments
      // ago by this same call and has no history, so removing it is safe
      // and leaves nothing half-built behind.
      await admin.auth.admin.deleteUser(created.user.id);
      return fail(`حساب ساخته شد ولی ثبت نقش شکست خورد و حساب برگردانده شد: ${rowErr.message}`, 400, 'profile_insert_failed');
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'خطای ناشناخته', 500, 'unexpected');
  }
});
