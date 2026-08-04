// Household-aware placeholder for the pending BGG API approval.
// Replace your existing sync-bgg-collection function with the full household-aware
// version when BGG provides the application token.
//
// Expected browser payload:
// { username: "TheHowlingMeeple", householdId: "<uuid>" }
//
// The final function must:
// 1. Verify the signed-in user.
// 2. Verify membership in household_members.
// 3. Upsert games using onConflict: "household_id,bgg_id".
// 4. Update household_settings rather than user_settings.
Deno.serve(async (request: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: "BGG synchronization is pending application-token approval. CSV import remains available."
  }), {
    status: 503,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
