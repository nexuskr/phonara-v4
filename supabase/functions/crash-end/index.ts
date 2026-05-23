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

    const body = await req.json();
    const { roundId, crashMultiplier, serverSeed } = body;
    if (!roundId || !crashMultiplier || !serverSeed) {
      throw new Error("Missing roundId, crashMultiplier, or serverSeed");
    }

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(serverSeed));
    const computedHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    const supabaseHeaders = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    };

    const roundResp = await fetch(`${SUPABASE_URL}/rest/v1/crash_rounds?id=eq.${roundId}&select=server_seed_hash`, {
      headers: supabaseHeaders,
    });
    const rounds = await roundResp.json();
    const storedHash = rounds?.[0]?.server_seed_hash;

    if (computedHash !== storedHash) {
      throw new Error("Server seed hash mismatch - verification failed");
    }

    await fetch(`${SUPABASE_URL}/rest/v1/crash_rounds?id=eq.${roundId}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "crashed",
        crash_multiplier: crashMultiplier,
        server_seed: serverSeed,
        crashed_at: new Date().toISOString(),
      }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/crash_bets?round_id=eq.${roundId}&status=eq.active`, {
      method: "PATCH",
      headers: { ...supabaseHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "lost" }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        roundId,
        crashMultiplier,
        serverSeed,
        computedHash,
        verified: true,
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
