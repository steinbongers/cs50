import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";
import type { Database } from "./types";

/**
 * Supabase-client voor Server Components, Server Actions en Route Handlers.
 * Maak per request een nieuwe client aan; deel hem nooit tussen requests.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Aangeroepen vanuit een Server Component: daar mogen geen cookies
          // gezet worden. proxy.ts ververst de sessie, dus dit is veilig te negeren.
        }
      },
    },
  });
}
