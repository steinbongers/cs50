/**
 * Enable Banking API-types (alleen de velden die wij gebruiken).
 * Gecontroleerd tegen enablebanking.com/docs/api/reference op 8 oktober 2026.
 */

export interface EbAmount {
  currency: string;
  amount: string;
}

export interface EbAspsp {
  name: string;
  country: string;
  logo?: string;
  beta?: boolean;
  /** Maximale geldigheid van toestemming in seconden. */
  maximum_consent_validity?: number;
  psu_types?: string[];
}

export interface EbAspspsResponse {
  aspsps: EbAspsp[];
}

export interface EbStartAuthorizationRequest {
  access: { valid_until: string };
  aspsp: { name: string; country: string };
  state: string;
  redirect_url: string;
  psu_type: "personal" | "business";
  language?: string;
}

export interface EbStartAuthorizationResponse {
  url: string;
  authorization_id: string;
  psu_id_hash: string;
}

export interface EbSessionAccount {
  uid: string;
  account_id?: { iban?: string | null } | null;
  name?: string | null;
  product?: string | null;
  currency?: string | null;
  cash_account_type?: string | null;
  usage?: string | null;
}

export interface EbAuthorizeSessionResponse {
  session_id: string;
  accounts: EbSessionAccount[];
  aspsp: { name: string; country: string };
  psu_type: string;
  access: { valid_until: string };
}

export interface EbParty {
  name?: string | null;
}

export interface EbTransaction {
  entry_reference?: string | null;
  transaction_id?: string | null;
  merchant_category_code?: string | null;
  transaction_amount: EbAmount;
  creditor?: EbParty | null;
  creditor_account?: { iban?: string | null } | null;
  debtor?: EbParty | null;
  debtor_account?: { iban?: string | null } | null;
  credit_debit_indicator: "CRDT" | "DBIT";
  status: "BOOK" | "PDNG" | "RJCT" | "SCHD" | "CNCL" | string;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  balance_after_transaction?: EbAmount | null;
  remittance_information?: string[] | null;
  bank_transaction_code?: { description?: string | null; code?: string | null; sub_code?: string | null } | null;
  note?: string | null;
}

export interface EbTransactionsResponse {
  transactions: EbTransaction[];
  continuation_key?: string | null;
}

export interface EbBalance {
  name?: string | null;
  balance_amount: EbAmount;
  balance_type: string;
  last_change_date_time?: string | null;
  reference_date?: string | null;
}

export interface EbBalancesResponse {
  balances: EbBalance[];
}
