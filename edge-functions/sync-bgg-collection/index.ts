import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
});
const arr = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const n = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "" || value === "N/A") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value["#text"] !== undefined) return String(value["#text"]);
  return null;
};

const valueAttr = (value: any): string | null =>
  value?.["@_value"] !== undefined ? String(value["@_value"]) : text(value);

const namesFor = (links: any[], type: string): string[] =>
  links.filter((link) => link?.["@_type"] === type)
    .map((link) => String(link?.["@_value"] ?? "").trim())
    .filter(Boolean);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function bggFetch(url: string, token: string): Promise<Response> {
  return await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/xml,text/xml",
      "User-Agent": "TheHowlingMeeple-Companion/1.0",
    },
  });
}

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
    if (userError || !userData.user) return json({ error: "Your Supabase session could not be verified." }, 401);

    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const householdId = String(body?.householdId ?? "").trim();
    const detailLimit = Math.min(150, Math.max(0, Number(body?.detailLimit ?? 100)));

    if (!username || !householdId) return json({ error: "username and householdId are required." }, 400);

    const { data: membership } = await admin.from("household_members")
      .select("household_id")
      .eq("household_id", householdId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) return json({ error: "You are not a member of this household." }, 403);

    const collectionUrl =
      `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}` +
      `&own=1&stats=1&excludesubtype=boardgameexpansion`;

    let collectionResponse: Response | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      collectionResponse = await bggFetch(collectionUrl, bggToken);
      if (collectionResponse.status !== 202) break;
      await sleep(5000);
    }

    if (!collectionResponse) return json({ error: "BGG returned no response." }, 502);
    if (collectionResponse.status === 202) return json({ error: "BGG is still preparing the collection. Wait one minute and try again." }, 503);
    if (!collectionResponse.ok) return json({ error: `BGG collection request returned HTTP ${collectionResponse.status}.` }, 502);

    const collectionXml = await collectionResponse.text();
    const collectionParsed = parser.parse(collectionXml);
    const collectionItems = arr(collectionParsed?.items?.item);
    if (!collectionItems.length) return json({ error: text(collectionParsed?.message) || "No owned base games were returned." }, 404);

    const { data: existingRows, error: existingError } = await admin.from("games")
      .select("id,bgg_id,image_url,thumbnail_url,detail_synced_at")
      .eq("household_id", householdId);
    if (existingError) return json({ error: existingError.message }, 500);
    const existing = new Map((existingRows ?? []).map((row: any) => [Number(row.bgg_id), row]));

    const now = new Date().toISOString();

    // BGG can occasionally return the same object more than once in a collection
    // response. PostgreSQL cannot update the same conflict target twice inside one
    // INSERT ... ON CONFLICT statement, so deduplicate by BGG ID before batching.
    const mappedRows = collectionItems.map((item: any) => {
      const stats = item?.stats ?? {};
      const rating = stats?.rating ?? {};
      const bggId = n(item?.["@_objectid"]);
      return {
        household_id: householdId,
        user_id: userData.user.id,
        bgg_id: bggId,
        name: text(item?.name) ?? "Unknown game",
        year_published: n(item?.yearpublished),
        owned: true,
        num_plays: n(item?.numplays) ?? 0,
        item_type: item?.["@_subtype"] ?? "boardgame",
        min_players: n(stats?.["@_minplayers"]),
        max_players: n(stats?.["@_maxplayers"]),
        min_play_time: n(stats?.["@_minplaytime"]),
        max_play_time: n(stats?.["@_maxplaytime"]) ?? n(stats?.["@_playingtime"]),
        average_rating: n(rating?.average?.["@_value"]),
        weight: n(rating?.averageweight?.["@_value"]),
        comment: text(item?.comment),
        image_url: text(item?.image),
        thumbnail_url: text(item?.thumbnail),
        last_bgg_sync: now,
        updated_at: now,
      };
    }).filter((row: any) => row.bgg_id && row.name);

    const rowMap = new Map<number, any>();
    for (const row of mappedRows) {
      rowMap.set(Number(row.bgg_id), row);
    }
    const baseRows = Array.from(rowMap.values());
    const duplicatesRemoved = mappedRows.length - baseRows.length;

    if (duplicatesRemoved > 0) {
      console.log(`Removed ${duplicatesRemoved} duplicate BGG collection row(s) before upsert.`);
    }

    const newGames = baseRows.filter((row: any) => !existing.has(row.bgg_id)).length;
    const artworkAdded = baseRows.filter((row: any) =>
      row.image_url && !existing.get(row.bgg_id)?.image_url
    ).length;

    const { error: markError } = await admin.from("games")
      .update({ owned: false, updated_at: now })
      .eq("household_id", householdId);
    if (markError) return json({ error: markError.message }, 500);

    for (let i = 0; i < baseRows.length; i += 100) {
      const { error } = await admin.from("games")
        .upsert(baseRows.slice(i, i + 100), { onConflict: "household_id,bgg_id" });
      if (error) return json({ error: error.message }, 500);
    }

    await admin.from("household_settings").upsert({
      household_id: householdId,
      bgg_username: username,
      updated_at: now,
    }, { onConflict: "household_id" });

    // Choose new or stale/missing-detail games for controlled enrichment.
    const { data: candidates, error: candidateError } = await admin.from("games")
      .select("id,bgg_id,detail_synced_at")
      .eq("household_id", householdId)
      .eq("owned", true)
      .order("detail_synced_at", { ascending: true, nullsFirst: true })
      .limit(detailLimit);
    if (candidateError) return json({ error: candidateError.message }, 500);

    let detailsProcessed = 0;
    for (let i = 0; i < (candidates ?? []).length; i += 20) {
      const batch = (candidates ?? []).slice(i, i + 20);
      const ids = batch.map((row: any) => row.bgg_id).join(",");
      const detailResponse = await bggFetch(
        `https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`,
        bggToken,
      );
      if (!detailResponse.ok) {
        console.error("BGG detail batch failed", detailResponse.status, ids);
        continue;
      }

      const detailParsed = parser.parse(await detailResponse.text());
      const detailItems = arr(detailParsed?.items?.item);
      for (const item of detailItems as any[]) {
        const bggId = n(item?.["@_id"]);
        if (!bggId) continue;
        const links = arr(item?.link);
        const names = arr(item?.name);
        const primaryName =
          names.find((name: any) => name?.["@_type"] === "primary")?.["@_value"] ??
          names[0]?.["@_value"];
        const ratings = item?.statistics?.ratings ?? {};
        const ranks = arr(ratings?.ranks?.rank);
        const boardGameRank = ranks.find((rank: any) => rank?.["@_name"] === "boardgame");
        const rankValue = boardGameRank?.["@_value"] === "Not Ranked" ? null : n(boardGameRank?.["@_value"]);

        const update = {
          name: primaryName ? String(primaryName) : undefined,
          description: text(item?.description),
          year_published: n(item?.yearpublished?.["@_value"]),
          min_players: n(item?.minplayers?.["@_value"]),
          max_players: n(item?.maxplayers?.["@_value"]),
          min_play_time: n(item?.minplaytime?.["@_value"]),
          max_play_time: n(item?.maxplaytime?.["@_value"]) ?? n(item?.playingtime?.["@_value"]),
          min_age: n(item?.minage?.["@_value"]),
          image_url: text(item?.image),
          thumbnail_url: text(item?.thumbnail),
          average_rating: n(ratings?.average?.["@_value"]),
          weight: n(ratings?.averageweight?.["@_value"]),
          rating_count: n(ratings?.usersrated?.["@_value"]),
          bgg_rank: rankValue,
          mechanics: namesFor(links, "boardgamemechanic"),
          categories: namesFor(links, "boardgamecategory"),
          designers: namesFor(links, "boardgamedesigner"),
          artists: namesFor(links, "boardgameartist"),
          publishers: namesFor(links, "boardgamepublisher"),
          families: namesFor(links, "boardgamefamily"),
          detail_synced_at: now,
          updated_at: now,
        };

        const { error } = await admin.from("games")
          .update(update)
          .eq("household_id", householdId)
          .eq("bgg_id", bggId);
        if (!error) detailsProcessed++;
      }
      await sleep(750);
    }

    const { count: detailsRemaining } = await admin.from("games")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .eq("owned", true)
      .is("detail_synced_at", null);

    return json({
      username,
      total: baseRows.length,
      newGames,
      updatedGames: baseRows.length - newGames,
      artworkAdded,
      detailsProcessed,
      detailsRemaining: detailsRemaining ?? 0,
      duplicatesRemoved,
    });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected synchronization error." }, 500);
  }
});
