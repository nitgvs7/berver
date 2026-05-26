import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLocalFallbackAllowed } from "./supabase";

let serverClient: SupabaseClient | null = null;

function createMissingSupabaseServerConfigError(): Error {
  return new Error("Supabase server access is required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

export function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { serviceRoleKey, url };
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const config = getSupabaseServerConfig();

  if (!config) {
    if (isLocalFallbackAllowed()) {
      return null;
    }

    throw createMissingSupabaseServerConfigError();
  }

  if (!serverClient) {
    serverClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
}
