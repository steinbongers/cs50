import { isCashWithdrawal } from "./cash";
import { counterpartyKey } from "./same-counterparty";

/**
 * Vaste ontvangers: de gebruiker houdt een potje ingedrukt en zegt daarmee
 * "deze ontvanger hoort altijd hier". Alleen dan deelt de app zelf in; nooit op eigen houtje.
 *
 * De sleutel bevat de richting, zodat geld van een ontvanger (bijvoorbeeld een terugbetaling)
 * niet automatisch in het potje van de uitgaven bij diezelfde ontvanger belandt.
 * Een geldautomaat wordt nooit een vaste ontvanger: waar contant geld heen gaat, verschilt elke keer.
 */
export const MAX_RULE_KEY_LENGTH = 120;

export function ruleKey(counterparty: string | null, amount: number): string | null {
  const key = counterpartyKey(counterparty ?? "");
  if (!key || amount === 0 || isCashWithdrawal({ counterparty, amount })) return null;
  return `${amount < 0 ? "uit" : "in"}:${key}`.slice(0, MAX_RULE_KEY_LENGTH);
}

/** De ontvanger uit een sleutel, om te tonen in Instellingen (in kleine letters). */
export function ruleLabel(match: string): { counterparty: string; incoming: boolean } {
  const incoming = match.startsWith("in:");
  return { counterparty: match.replace(/^(uit|in):/, ""), incoming };
}

/** Welk potje hoort bij deze transactie volgens de vaste ontvangers? */
export function ruleCategory(
  rules: ReadonlyMap<string, string>,
  tx: { counterparty: string | null; amount: number },
): string | null {
  const key = ruleKey(tx.counterparty, tx.amount);
  return key ? (rules.get(key) ?? null) : null;
}
