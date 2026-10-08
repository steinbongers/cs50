/**
 * Database-types, handmatig bijgehouden in lijn met supabase/migrations.
 * Later te vervangen door `supabase gen types typescript`.
 */

export type SwipeDirection = "left" | "right" | "up" | "down";
export type ConnectionProvider = "enablebanking" | "csv";
export type ConnectionStatus = "active" | "expiring" | "expired" | "revoked";
export type TransactionSource = "bank" | "csv";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  onboarding_done: boolean;
  notifications_enabled: boolean;
}

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  swipe_direction: SwipeDirection | null;
  monthly_budget: number | null;
  is_income: boolean;
  archived: boolean;
  created_at: string;
}

export type BankConnectionRow = {
  id: string;
  user_id: string;
  provider: ConnectionProvider;
  aspsp_name: string | null;
  session_id: string | null;
  valid_until: string | null;
  status: ConnectionStatus;
  created_at: string;
}

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
  created_at: string;
}

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
  created_at: string;
}

export type CategoryRuleRow = {
  id: string;
  user_id: string;
  counterparty_match: string;
  category_id: string;
  created_at: string;
}

export type EventRow = {
  id: number;
  user_id: string;
  type: string;
  payload: Json;
  created_at: string;
}

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
          "display_name" | "created_at" | "onboarding_done" | "notifications_enabled"
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
          | "is_income"
          | "archived"
          | "created_at"
        >
      >;
      bank_connections: Table<
        BankConnectionRow,
        WithOptional<
          BankConnectionRow,
          "id" | "aspsp_name" | "session_id" | "valid_until" | "status" | "created_at"
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
          | "created_at"
        >
      >;
      category_rules: Table<CategoryRuleRow, WithOptional<CategoryRuleRow, "id" | "created_at">>;
      events: Table<EventRow, WithOptional<EventRow, "id" | "payload" | "created_at">>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
