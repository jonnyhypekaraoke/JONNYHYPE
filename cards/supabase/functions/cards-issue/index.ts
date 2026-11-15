import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://jonnyhype.it",
  "https://www.jonnyhype.it",
]);

function corsOrigin(origin: string): string {
  try {
    const host = new URL(origin).hostname;
    if (allowedOrigins.has(origin) ||
        host === "jonnyhype-cards-test.pages.dev" ||
        host.endsWith(".jonnyhype-cards-test.pages.dev")) return origin;
  } catch {}
  return "https://jonnyhype.it";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo non consentito" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Accesso non autorizzato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Configurazione server incompleta");
    }

    const accessToken = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !userData.user || !userData.user.email_confirmed_at) {
      return new Response(JSON.stringify({ error: "Verifica prima il tuo indirizzo email" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    if (body?.action !== "issue") {
      return new Response(JSON.stringify({ error: "Operazione non supportata" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body?.termsAccepted !== true) {
      return new Response(JSON.stringify({ error: "È necessario accettare termini e informativa privacy" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const privacyVersion = String(body.privacyNoticeVersion ?? "").trim();
    const termsVersion = String(body.termsVersion ?? "").trim();
    const birthDateText = String(body.birthDate ?? "").trim();
    const birthDate = new Date(`${birthDateText}T00:00:00Z`);
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    if (today.getUTCMonth() < birthDate.getUTCMonth() || (today.getUTCMonth() === birthDate.getUTCMonth() && today.getUTCDate() < birthDate.getUTCDate())) age--;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateText) || Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0,10) !== birthDateText || age < 14) {
      return new Response(JSON.stringify({ error: "La JONNYHYPE CARD è riservata a chi ha compiuto 14 anni" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !privacyVersion || privacyVersion.length > 40 || !termsVersion || termsVersion.length > 40) {
      return new Response(JSON.stringify({ error: "Controlla nome, cognome e versione dell'informativa" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("issue_member_card", {
      p_auth_user_id: userData.user.id,
      p_first_name: firstName,
      p_last_name: lastName,
      p_birth_date: birthDateText,
      p_terms_version: termsVersion,
      p_privacy_notice_version: privacyVersion,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, card: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});