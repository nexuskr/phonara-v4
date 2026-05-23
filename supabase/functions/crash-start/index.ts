import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    const user = await userResp.json();
    if (!user.id) throw new Error("Invalid token");

    const serverSeedArray = new Uint8Array(32);
    crypto.getRandomValues(serverSeedArray);
    const serverSeed = Array.from(serverSeedArray, (b) => b.toString(16).padStart(2, "0")).join("");

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(serverSeed));
    const serverSeedHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    const clientSeed = "loavable2026";
    const nonce = Date.now();

    const keyData = encoder.encode(serverSeed);
    const msgData = encoder.encode(`${clientSeed}:${nonce}`);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const hmac = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");

    const hex = hmac.slice(0, 13);
    const num = parseInt(hex, 16);
    const maxInt = 2 ** 52;
    const houseEdge = 0.04;
    const crashPoint = Math.floor((1 / (1 - num / maxInt)) * (1 - houseEdge) * 100) / 100;
    const finalCrash = Math.max(1.0, Math.min(1000, crashPoint));

    const supabaseHeaders = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/crash_rounds`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        server_seed_hash: serverSeedHash,
        client_seed: clientSeed,
        status: "waiting",
      }),
    });
    const round = await insertResp.json();
    const roundId = round?.[0]?.id || round?.id || crypto.randomUUID();

    return new Response(
      JSON.stringify({
        roundId,
        serverSeedHash,
        clientSeed,
        crashPoint: finalCrash,
        nonce,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
