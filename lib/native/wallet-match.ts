import { similarMerchant } from "./wallet";

/**
 * Ontdubbelen: dezelfde betaling komt eerst direct via Apple Pay (Opdrachten) binnen en uren of
 * een dag later nog eens via de bank. Een bankregel en een Apple Pay-regel zijn dezelfde
 * betaling als het bedrag precies gelijk is, de boekdatum van de bank op dezelfde dag of tot
 * drie dagen later valt (ING boekt pinbetalingen vaak de volgende werkdag), en de winkel lijkt.
 * Lijkt de winkel niet, dan alleen als er aan beide kanten precies één kandidaat is.
 */

export const MATCH_DAYS_BEFORE = 1;
export const MATCH_DAYS_AFTER = 3;

export interface WalletSide {
  id: string;
  booking_date: string;
  amount: number;
  merchant: string | null;
}

export interface BankSide {
  id: string;
  booking_date: string;
  amount: number;
  counterparty: string | null;
  raw_counterparty?: string | null;
}

export interface WalletMatch {
  bankId: string;
  walletId: string;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
}

function cents(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** Valt de bankdatum binnen het venster rond de Apple Pay-datum? */
export function inMatchWindow(walletDate: string, bankDate: string): boolean {
  const diff = dayNumber(bankDate) - dayNumber(walletDate);
  return diff >= -MATCH_DAYS_BEFORE && diff <= MATCH_DAYS_AFTER;
}

function candidate(bank: BankSide, wallet: WalletSide): boolean {
  return cents(bank.amount) === cents(wallet.amount) && cents(bank.amount) !== 0 && inMatchWindow(wallet.booking_date, bank.booking_date);
}

function merchantFits(bank: BankSide, wallet: WalletSide): boolean {
  return similarMerchant(wallet.merchant, bank.counterparty) || similarMerchant(wallet.merchant, bank.raw_counterparty);
}

/**
 * Koppelt bankregels aan Apple Pay-regels, elk hoogstens één keer.
 * Eerst de paren waarvan de winkel lijkt (dichtstbijzijnde datum eerst), daarna de enige-kandidaat-paren.
 */
export function matchWalletPayments(bank: readonly BankSide[], wallet: readonly WalletSide[]): WalletMatch[] {
  const usedBank = new Set<string>();
  const usedWallet = new Set<string>();
  const matches: WalletMatch[] = [];

  const pairs: { b: BankSide; w: WalletSide; gap: number }[] = [];
  for (const b of bank) {
    for (const w of wallet) {
      if (candidate(b, w)) pairs.push({ b, w, gap: Math.abs(dayNumber(b.booking_date) - dayNumber(w.booking_date)) });
    }
  }

  // Ronde 1: winkel lijkt.
  for (const p of pairs.filter((p) => merchantFits(p.b, p.w)).sort((x, y) => x.gap - y.gap)) {
    if (usedBank.has(p.b.id) || usedWallet.has(p.w.id)) continue;
    usedBank.add(p.b.id);
    usedWallet.add(p.w.id);
    matches.push({ bankId: p.b.id, walletId: p.w.id });
  }

  // Ronde 2: winkel lijkt niet (andere schrijfwijze bij de bank), maar het is aan beide kanten de enige.
  const open = pairs.filter((p) => !usedBank.has(p.b.id) && !usedWallet.has(p.w.id));
  for (const p of open) {
    const forBank = open.filter((q) => q.b.id === p.b.id).length;
    const forWallet = open.filter((q) => q.w.id === p.w.id).length;
    if (forBank === 1 && forWallet === 1) {
      usedBank.add(p.b.id);
      usedWallet.add(p.w.id);
      matches.push({ bankId: p.b.id, walletId: p.w.id });
    }
  }
  return matches;
}
