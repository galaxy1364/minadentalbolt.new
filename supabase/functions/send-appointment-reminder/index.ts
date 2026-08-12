import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointmentId, customMessage } = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'Appointment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select(`
        *,
        patient:patients (first_name, last_name, phone),
        doctor:doctors (display_name),
        unit:units (name)
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return new Response(
        JSON.stringify({ error: 'Appointment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!appointment.patient?.phone) {
      return new Response(
        JSON.stringify({ error: 'Patient has no phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format date for Persian
    const appointmentDate = new Date(appointment.date);
    const persianDate = appointmentDate.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appointmentTime = appointment.start_time?.substring(0, 5) || '';

    // Build message
    const patientName = `${appointment.patient.first_name} ${appointment.patient.last_name}`;
    const doctorName = appointment.doctor?.display_name || 'پزشک';
    const unitName = appointment.unit?.name || '';

    let message: string;

    if (customMessage) {
      message = customMessage
        .replace('{patient_name}', patientName)
        .replace('{date}', persianDate)
        .replace('{time}', appointmentTime)
        .replace('{doctor}', doctorName)
        .replace('{unit}', unitName);
    } else {
      // Default reminder message
      message = `${patientName} عزیز\nنوبت شما:\n📅 ${persianDate}\n🕐 ساعت ${appointmentTime}\n👨‍⚕️ ${doctorName}\n📍 ${unitName}\n${appointment.clinic_name || 'کلینیک دندانپزشکی'}\n\nلطفاً ۱۵ دقیقه زودتر حضور داشته باشید.`;
    }

    // Send SMS
    const smsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`;
    const smsResponse = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        to: appointment.patient.phone,
        message: message,
        type: 'reminder',
      }),
    });

    const smsResult = await smsResponse.json();

    // Update appointment reminder status
    await supabaseClient
      .from('appointments')
      .update({
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (appointment.reminder_count || 0) + 1,
      })
      .eq('id', appointmentId);

    // Log the reminder
    await supabaseClient
      .from('notification_logs')
      .insert({
        id: crypto.randomUUID(),
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        type: 'sms_reminder',
        status: smsResult.success ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
        message_content: message,
        response_data: smsResult,
      });

    return new Response(
      JSON.stringify({
        success: smsResult.success,
        message: smsResult.success ? 'Reminder sent successfully' : 'Failed to send reminder',
        error: smsResult.error,
        message_content: message,
      }),
      { status: smsResult.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing reminder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
