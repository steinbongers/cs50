import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Gesloten pilot: een ingelogd account zonder uitnodigingscode wordt hier
 * uitgelogd en terugverwezen naar registreren met uitleg.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/registreren?error=code", request.nextUrl.origin));
}
