/**
 * Database-types, handmatig bijgehouden in lijn met supabase/migrations.
 * Later te vervangen door `supabase gen types typescript`.
 */

export type SwipeDirection = "left" | "right" | "up" | "down";
export type ConnectionProvider = "enablebanking" | "csv";
export type ConnectionStatus = "active" | "expiring" | "expired" | "revoked";
export type TransactionSource = "bank" | "csv";
export type ShareStatus = "open" | "received" | "settled_elsewhere";
export type CategorySystemKey = "voorgeschoten";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  onboarding_done: boolean;
  notifications_enabled: boolean;
  salary_day: number | null;
  coach_step: number;
  month_review_seen_for: string | null;
  last_push_at: string | null;
  invite_code: string | null;
};

export type InviteCodeRow = {
  code: string;
  note: string | null;
  max_uses: number;
  uses: number;
  created_at: string;
  expires_at: string | null;
};

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  swipe_direction: SwipeDirection | null;
  monthly_budget: number | null;
  goal_amount: number | null;
  is_income: boolean;
  archived: boolean;
  system_key: CategorySystemKey | null;
  created_at: string;
};

export type BankConnectionRow = {
  id: string;
  user_id: string;
  provider: ConnectionProvider;
  aspsp_name: string | null;
  session_id: string | null;
  valid_until: string | null;
  status: ConnectionStatus;
  last_manual_sync_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  expiry_notified_at: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type AccountRow = {
  id: string;
  user_id: string;
  connection_id: string;
  external_uid: string | null;
  iban_masked: string | null;
  name: string | null;
  currency: string;
  last_balance: number | null;
  last_synced_at: string | null;
  iban_hash: string | null;
  active: boolean;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  external_id: string | null;
  dedupe_hash: string;
  booking_date: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  description: string | null;
  category_id: string | null;
  categorized_at: string | null;
  skipped_count: number;
  source: TransactionSource;
  booking_time: string | null;
  balance_after: number | null;
  raw_counterparty: string | null;
  raw_description: string | null;
  own_share: number | null;
  is_internal_transfer: boolean;
  note: string | null;
  created_at: string;
};

export type TransactionShareRow = {
  id: string;
  user_id: string;
  transaction_id: string;
  person_name: string | null;
  amount: number;
  status: ShareStatus;
  received_transaction_id: string | null;
  received_at: string | null;
  created_at: string;
};

export type CategoryRuleRow = {
  id: string;
  user_id: string;
  counterparty_match: string;
  category_id: string;
  created_at: string;
};

export type EventRow = {
  id: number;
  user_id: string;
  type: string;
  payload: Json;
  created_at: string;
};

/** Anonieme regel per verwijderd account: geen user_id, alleen cohort en duur. */
export type ChurnLogRow = {
  id: number;
  cohort_week: string;
  days_since_signup: number;
  created_at: string;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        WithOptional<
          ProfileRow,
          | "display_name"
          | "created_at"
          | "onboarding_done"
          | "notifications_enabled"
          | "salary_day"
          | "coach_step"
          | "month_review_seen_for"
          | "last_push_at"
          | "invite_code"
        >
      >;
      categories: Table<
        CategoryRow,
        WithOptional<
          CategoryRow,
          | "id"
          | "icon"
          | "color"
          | "sort_order"
          | "swipe_direction"
          | "monthly_budget"
          | "goal_amount"
          | "is_income"
          | "archived"
          | "system_key"
          | "created_at"
        >
      >;
      bank_connections: Table<
        BankConnectionRow,
        WithOptional<
          BankConnectionRow,
          | "id"
          | "aspsp_name"
          | "session_id"
          | "valid_until"
          | "status"
          | "last_manual_sync_at"
          | "last_synced_at"
          | "last_error"
          | "expiry_notified_at"
          | "created_at"
        >
      >;
      accounts: Table<
        AccountRow,
        WithOptional<
          AccountRow,
          | "id"
          | "external_uid"
          | "iban_masked"
          | "name"
          | "currency"
          | "last_balance"
          | "last_synced_at"
          | "iban_hash"
          | "active"
          | "created_at"
        >
      >;
      transactions: Table<
        TransactionRow,
        WithOptional<
          TransactionRow,
          | "id"
          | "external_id"
          | "currency"
          | "counterparty"
          | "description"
          | "category_id"
          | "categorized_at"
          | "skipped_count"
          | "booking_time"
          | "balance_after"
          | "raw_counterparty"
          | "raw_description"
          | "own_share"
          | "is_internal_transfer"
          | "note"
          | "created_at"
        >
      >;
      transaction_shares: Table<
        TransactionShareRow,
        WithOptional<
          TransactionShareRow,
          "id" | "person_name" | "status" | "received_transaction_id" | "received_at" | "created_at"
        >
      >;
      category_rules: Table<CategoryRuleRow, WithOptional<CategoryRuleRow, "id" | "created_at">>;
      events: Table<EventRow, WithOptional<EventRow, "id" | "payload" | "created_at">>;
      invite_codes: Table<InviteCodeRow, WithOptional<InviteCodeRow, "note" | "max_uses" | "uses" | "created_at" | "expires_at">>;
      churn_log: Table<ChurnLogRow, WithOptional<ChurnLogRow, "id" | "created_at">>;
      push_subscriptions: Table<
        PushSubscriptionRow,
        WithOptional<PushSubscriptionRow, "id" | "user_agent" | "created_at" | "last_used_at">
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
