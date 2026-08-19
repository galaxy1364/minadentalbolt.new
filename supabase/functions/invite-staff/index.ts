import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: callerRow } = await admin.from('users').select('role, clinic_id').eq('id', caller.id).maybeSingle();
    if (!callerRow || callerRow.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'فقط مدیر کلینیک می‌تواند حساب کاربری بسازد' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: InviteRequest = await req.json();
    if (!body.email && !body.phone) {
      return new Response(JSON.stringify({ error: 'ایمیل یا موبایل لازم است' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!body.password || body.password.length < 6) {
      return new Response(JSON.stringify({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!VALID_ROLES.includes(body.access_role)) {
      return new Response(JSON.stringify({ error: 'نقش نامعتبر است' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email || undefined,
      phone: body.phone || undefined,
      password: body.password,
      email_confirm: !!body.email,
      phone_confirm: !!body.phone,
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'ساخت کاربر ناموفق بود' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: rowErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, user_id: created.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'خطای ناشناخته' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
