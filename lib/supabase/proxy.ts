import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "./env";

/** Paden die zonder sessie bereikbaar zijn. */
const PUBLIC_PATHS = ["/welkom", "/login", "/registreren", "/privacy"];
const PUBLIC_PREFIXES = ["/auth/", "/api/cron"];

/** Paden waar een ingelogde gebruiker niets te zoeken heeft. */
const AUTH_ONLY_PATHS = ["/welkom", "/login", "/registreren"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Ververst de Supabase-sessie (tokens in cookies) en stuurt gebruikers door:
 * - zonder sessie naar /login (behalve op publieke paden)
 * - met sessie weg van /welkom, /login en /registreren
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    // Zonder configuratie één duidelijke uitlegpagina in plaats van een serverfout op elke route.
    if (request.nextUrl.pathname === "/niet-ingesteld") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/niet-ingesteld";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Belangrijk: geen logica tussen createServerClient en getClaims, anders
  // kan de sessie-refresh verloren gaan.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

  const { pathname } = request.nextUrl;

  if (!userId && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && AUTH_ONLY_PATHS.includes(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
