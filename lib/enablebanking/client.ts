import "server-only";
import { createEnableBankingJwt } from "./jwt";
import type {
  EbAspspsResponse,
  EbAuthorizeSessionResponse,
  EbBalancesResponse,
  EbStartAuthorizationRequest,
  EbStartAuthorizationResponse,
  EbTransactionsResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://api.enablebanking.com";

export class EnableBankingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "EnableBankingError";
  }

  /** Toestemming verlopen of ingetrokken: de gebruiker moet opnieuw koppelen. */
  get needsReconnect(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function baseUrl(): string {
  return (process.env.ENABLE_BANKING_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function ebFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${createEnableBankingJwt()}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let code: string | undefined;
    let message = `Enable Banking antwoordde met ${response.status}.`;
    try {
      const body = (await response.json()) as { code?: string; message?: string; error?: string };
      code = body.code ?? body.error;
      if (body.message) message = body.message;
    } catch {
      // geen JSON-body
    }
    // Nooit transactiedata loggen; alleen status en code.
    throw new EnableBankingError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listAspsps(country = "NL"): Promise<EbAspspsResponse> {
  const params = new URLSearchParams({ country, psu_type: "personal" });
  return ebFetch<EbAspspsResponse>(`/aspsps?${params}`);
}

export async function startAuthorization(
  body: EbStartAuthorizationRequest,
): Promise<EbStartAuthorizationResponse> {
  return ebFetch<EbStartAuthorizationResponse>("/auth", { method: "POST", body: JSON.stringify(body) });
}

export async function authorizeSession(code: string): Promise<EbAuthorizeSessionResponse> {
  return ebFetch<EbAuthorizeSessionResponse>("/sessions", { method: "POST", body: JSON.stringify({ code }) });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await ebFetch<void>(`/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export async function getAccountTransactions(
  accountUid: string,
  options: { dateFrom?: string; dateTo?: string; continuationKey?: string | null } = {},
): Promise<EbTransactionsResponse> {
  const params = new URLSearchParams();
  if (options.dateFrom) params.set("date_from", options.dateFrom);
  if (options.dateTo) params.set("date_to", options.dateTo);
  if (options.continuationKey) params.set("continuation_key", options.continuationKey);
  const query = params.toString();
  return ebFetch<EbTransactionsResponse>(
    `/accounts/${encodeURIComponent(accountUid)}/transactions${query ? `?${query}` : ""}`,
  );
}

export async function getAccountBalances(accountUid: string): Promise<EbBalancesResponse> {
  return ebFetch<EbBalancesResponse>(`/accounts/${encodeURIComponent(accountUid)}/balances`);
}

/**
 * Controleert onze eigen applicatiesleutel vóór een sync-ronde. Geeft false bij
 * 401/403: dan ligt het aan onze configuratie, niet aan de banktoestemmingen,
 * en mogen koppelingen niet als ingetrokken worden gemarkeerd.
 */
export async function verifyCredentials(): Promise<boolean> {
  try {
    await ebFetch<unknown>("/application");
    return true;
  } catch (err) {
    if (err instanceof EnableBankingError && err.needsReconnect) return false;
    // Andere fouten (netwerk, 5xx) zeggen niets over de sleutel.
    return true;
  }
}
