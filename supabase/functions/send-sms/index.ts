import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  to: string;
  message: string;
  type?: 'reminder' | 'confirm' | 'followup' | 'general';
}

interface SMSProvider {
  send(to: string, message: string): Promise<{ success: boolean; id?: string; error?: string }>;
}

// Kavenegar SMS Provider
class KavenegarProvider implements SMSProvider {
  private apiKey: string;
  private sender: string;

  constructor() {
    this.apiKey = Deno.env.get('KAVENEGAR_API_KEY') || '';
    this.sender = Deno.env.get('KAVENEGAR_SENDER') || '';
  }

  async send(to: string, message: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.apiKey) {
      console.error('KAVENEGAR_API_KEY not configured');
      return { success: false, error: 'SMS provider not configured' };
    }

    const cleanNumber = to.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('0') ? cleanNumber : `0${cleanNumber}`;

    try {
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
      const params = new URLSearchParams({
        receptor: formattedNumber,
        message: message,
        sender: this.sender,
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (data.return?.status === 200) {
        return { success: true, id: data.entries?.[0]?.messageid?.toString() };
      }

      return { success: false, error: data.return?.message || 'Unknown error' };
    } catch (error) {
      console.error('Kavenegar error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Magfa SMS Provider
class MagfaProvider implements SMSProvider {
  private username: string;
  private password: string;
  private sender: string;

  constructor() {
    this.username = Deno.env.get('MAGFA_USERNAME') || '';
    this.password = Deno.env.get('MAGFA_PASSWORD') || '';
    this.sender = Deno.env.get('MAGFA_SENDER') || '';
  }

  async send(to: string, message: string): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.username || !this.password) {
      console.error('MAGFA credentials not configured');
      return { success: false, error: 'SMS provider not configured' };
    }

    const cleanNumber = to.replace(/\D/g, '');

    try {
      const auth = btoa(`${this.username}:${this.password}`);
      const url = 'https://sms.magfa.com/api/v2/send';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: [cleanNumber],
          message: message,
          sender: this.sender,
        }),
      });

      const data = await response.json();

      if (data.status === 0) {
        return { success: true, id: data.id?.toString() };
      }

      return { success: false, error: data.error || 'Unknown error' };
    } catch (error) {
      console.error('Magfa error:', error);
      return { success: false, error: error.message };
    }
  }
}

function getProvider(): SMSProvider {
  const provider = Deno.env.get('SMS_PROVIDER')?.toLowerCase() || 'kavenegar';

  switch (provider) {
    case 'magfa':
      return new MagfaProvider();
    case 'kavenegar':
    default:
      return new KavenegarProvider();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { to, message, type }: SMSRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const provider = getProvider();
    const result = await provider.send(to, message);

    // Log the SMS
    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        id: crypto.randomUUID(),
        recipient: to,
        message: message,
        type: type || 'general',
        status: result.success ? 'sent' : 'failed',
        provider_message_id: result.id,
        error: result.error,
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Failed to log SMS:', logError);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        id: result.id,
        error: result.error,
      }),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
