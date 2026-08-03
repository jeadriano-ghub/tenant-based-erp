import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client for file storage (tenant logos).
 * Uses the service-role key so uploads work regardless of RLS and without a
 * user session. This key must NEVER be exposed to the browser.
 */
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Allow the app to boot without Supabase configured (e.g. local dev with no
  // storage). Uploads will return a clear error instead of crashing the build.
  console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — logo uploads disabled.");
}

export const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

export const LOGO_BUCKET = "tenant-logos";

/** Public URL for an object in the tenant-logos bucket. */
export function logoPublicUrl(path: string) {
  if (!supabase) return path;
  return supabase.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}
