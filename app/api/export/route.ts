import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvField(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Export van al je transacties met potje, als CSV (puntkomma, voor Excel in het Nederlands). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: transactions }, { data: categories }, { data: shares }] = await Promise.all([
    supabase
      .from("transactions")
      .select("booking_date, booking_time, amount, own_share, currency, counterparty, description, raw_counterparty, raw_description, category_id, categorized_at, is_internal_transfer, balance_after")
      .order("booking_date", { ascending: false }),
    supabase.from("categories").select("id, name"),
    supabase.from("transaction_shares").select("transaction_id, person_name, amount, status"),
  ]);

  const nameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const header = [
    "datum", "tijd", "bedrag", "jouw_deel", "valuta", "tegenpartij", "omschrijving", "tegenpartij_bank", "omschrijving_bank",
    "potje", "in_potje_gezet_op", "eigen_overboeking", "saldo_erna",
  ];
  const lines = [header.join(";")];
  for (const t of transactions ?? []) {
    lines.push(
      [
        t.booking_date,
        t.booking_time ? String(t.booking_time).slice(0, 5) : "",
        String(t.amount).replace(".", ","),
        t.own_share === null ? "" : String(t.own_share).replace(".", ","),
        t.currency,
        t.counterparty,
        t.description,
        t.raw_counterparty,
        t.raw_description,
        t.category_id ? (nameById.get(t.category_id) ?? "") : "",
        t.categorized_at ?? "",
        t.is_internal_transfer ? "ja" : "nee",
        t.balance_after === null ? "" : String(t.balance_after).replace(".", ","),
      ]
        .map(csvField)
        .join(";"),
    );
  }

  if (shares && shares.length > 0) {
    lines.push("");
    lines.push(["voorgeschoten_transactie", "persoon", "bedrag", "status"].join(";"));
    for (const s of shares) {
      lines.push([s.transaction_id, s.person_name ?? "", String(s.amount).replace(".", ","), s.status].map(csvField).join(";"));
    }
  }

  const body = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transacties-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
