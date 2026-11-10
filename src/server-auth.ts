import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AuthEnv {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

// Reuse one client per isolate so the JWKS (public signing keys) fetched by
// getClaims() stays cached across requests instead of being refetched each time.
let cachedClient: SupabaseClient | null = null;
let cachedUrl: string | null = null;

function getSupabase(env: AuthEnv): SupabaseClient {
  if (!cachedClient || cachedUrl !== env.SUPABASE_URL) {
    cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    cachedUrl = env.SUPABASE_URL;
  }
  return cachedClient;
}

/**
 * Browsers cannot set headers on WebSocket upgrades, so the token arrives as a
 * `token` query param for WebSockets and as an `Authorization: Bearer` header
 * for plain HTTP requests (e.g. the `/get-messages` history fetch).
 */
function extractToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return new URL(request.url).searchParams.get("token");
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Verifies the Supabase access token on an incoming agent request and ensures
 * the caller is only accessing their own Durable Object instance (`route.name === userId`).
 */
export async function authorizeAgentRequest(
  request: Request,
  env: AuthEnv,
  route?: { name?: string },
): Promise<Response | Request> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    // Fail closed: never expose the agent if auth is misconfigured.
    console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in worker env");
    return new Response("Server auth misconfigured", { status: 500 });
  }

  const token = extractToken(request);
  if (!token) return jsonError("Missing access token", 401);

  // getClaims() verifies the JWT signature (via JWKS for asymmetric keys, or
  // via the Auth server for legacy HS256 keys) and checks expiry.
  const { data, error } = await getSupabase(env).auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return jsonError("Invalid or expired access token", 401);

  // Enforce per-user isolation so a user cannot connect to another user's
  // agent instance or reset their rate limit by inventing a new room name.
  if (route?.name && route.name !== userId) {
    return jsonError("Forbidden: agent instance does not match authenticated user", 403);
  }

  // Forward the verified identity; drop any client-supplied value first.
  const headers = new Headers(request.headers);
  headers.set("x-user-id", userId);
  return new Request(request, { headers });
}
