import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("[NOTIFY-ADMIN] LOVABLE_API_KEY not set, skipping email");
    return;
  }

  const SUPABASE_PROJECT_ID = Deno.env.get("SUPABASE_URL")?.match(/\/\/([^.]+)/)?.[1];

  try {
    const res = await fetch("https://api.lovable.dev/v1/email/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject,
        html: body,
        purpose: "transactional",
        projectId: SUPABASE_PROJECT_ID,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[NOTIFY-ADMIN] Email send failed [${res.status}]: ${errText}`);
    } else {
      console.log(`[NOTIFY-ADMIN] Email sent to ${to}`);
    }
  } catch (err) {
    console.error(`[NOTIFY-ADMIN] Email error: ${err}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { type, title, message, metadata, userId } = await req.json();

    if (!type || !title || !message) {
      throw new Error("type, title, and message are required");
    }

    // Insert in-app notification
    const { error } = await supabaseClient.from("admin_notifications").insert({
      type,
      title,
      message,
      metadata: metadata || {},
      user_id: userId || null,
    });

    if (error) throw new Error(`Failed to create notification: ${error.message}`);

    console.log(`[NOTIFY-ADMIN] Created notification: ${type} - ${title}`);

    // Send email to owner for demo requests and signups
    const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");
    if (OWNER_EMAIL && (type === "demo_request" || type === "signup")) {
      const emailSubject = type === "demo_request"
        ? `🎤 New Demo Request: ${metadata?.institution || "Unknown"}`
        : `👤 New Signup: ${metadata?.email || "Unknown"}`;

      const emailBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 24px; border-radius: 16px 16px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🎤 SmartMic Notification</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
            <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 18px;">${title}</h2>
            <p style="color: #6b7280; margin: 0 0 20px 0; line-height: 1.6;">${message}</p>
            ${metadata ? `
              <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Details</h3>
                ${Object.entries(metadata).map(([key, val]) =>
                  `<p style="color: #6b7280; margin: 4px 0; font-size: 14px;"><strong style="color: #374151;">${key}:</strong> ${val}</p>`
                ).join('')}
              </div>
            ` : ''}
            <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">This is an automated notification from SmartMic.</p>
          </div>
        </div>
      `;

      await sendEmail(OWNER_EMAIL, emailSubject, emailBody);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[NOTIFY-ADMIN] Error: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
