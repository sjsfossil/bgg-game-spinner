import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Only POST is supported." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign-in is required." }, 401);
    const userToken = authorization.slice(7);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const bggToken = Deno.env.get("BGG_API_TOKEN") ?? "";
    if (!bggToken) return json({ error: "BGG_API_TOKEN is not configured." }, 500);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await admin.auth.getUser(userToken);
    if (userError || !userData.user) return json({ error: "Your session could not be verified." }, 401);

    const body = await request.json();
    const bggId = Number(body?.bggId);
    const gameId = Number(body?.gameId);
    const householdId = String(body?.householdId ?? "");
    if (!Number.isInteger(bggId) || !Number.isInteger(gameId) || !householdId)
      return json({ error: "Valid bggId, gameId, and householdId are required." }, 400);

    const { data: membership } = await admin.from("household_members")
      .select("household_id")
      .eq("household_id", householdId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) return json({ error: "You are not a member of this household." }, 403);

    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}`, {
      headers: {
        Authorization: `Bearer ${bggToken}`,
        Accept: "application/xml,text/xml",
        "User-Agent": "TheHowlingMeeple-Companion/1.0",
      },
    });
    if (!response.ok) return json({ error: `BGG returned HTTP ${response.status}.` }, 502);

    const xml = await response.text();
    const decode = (value?: string) => value
      ? value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
          .replaceAll("&quot;", '"').replaceAll("&#39;", "'")
      : null;
    const imageUrl = decode(xml.match(/<image>(.*?)<\/image>/s)?.[1]);
    const thumbnailUrl = decode(xml.match(/<thumbnail>(.*?)<\/thumbnail>/s)?.[1]);
    if (!imageUrl && !thumbnailUrl) return json({ error: "BGG returned no artwork." }, 404);

    const { error } = await admin.from("games")
      .update({ image_url: imageUrl, thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
      .eq("id", gameId)
      .eq("household_id", householdId);
    if (error) return json({ error: error.message }, 500);

    return json({ bggId, imageUrl, thumbnailUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected artwork error." }, 500);
  }
});
