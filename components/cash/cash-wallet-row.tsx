import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CashWallet } from "./cash-wallet";
import { loadCashWallet } from "./queries";

/**
 * "Contant over: € 30" op Overzicht, alleen als er nog contant geld in je portemonnee zit.
 * Laadt zelf wat hij nodig heeft, zodat de pagina er maar één regel voor hoeft te tonen.
 */
export async function CashWalletRow() {
  const user = await requireUser();
  const supabase = await createClient();
  const [wallet, { data: categories }] = await Promise.all([
    loadCashWallet(supabase, user.id).catch(() => null),
    supabase
      .from("categories")
      .select("id, name, icon, color")
      .eq("archived", false)
      .eq("is_income", false)
      // Contant uitgeven is uitgeven: geen spaarpotjes.
      .eq("is_savings", false)
      .is("system_key", null)
      .order("sort_order", { ascending: true }),
  ]);
  if (!wallet || wallet.remaining <= 0) return null;

  return <CashWallet remaining={wallet.remaining} categories={categories ?? []} />;
}
