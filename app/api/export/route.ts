import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";

function csvField(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Tekst die een rekenprogramma als formule zou lezen (=, +, -, @, tab) onschadelijk maken.
  // Bedragen gaan niet door deze functie als getal maar als "12,34"; een minteken daar is
  // legitiem en wordt door de apostrof niet verstoord bij importeren als tekst.
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(,\d+)?$/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Export van al je transacties met potje, als CSV (puntkomma, voor Excel in het Nederlands). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const supabase = await createClient();
  const [transactions, { data: categories }, shares] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("transactions")
        .select("booking_date, booking_time, amount, own_share, currency, counterparty, description, raw_counterparty, raw_description, category_id, categorized_at, is_internal_transfer, balance_after, note, source")
        .order("booking_date", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase.from("categories").select("id, name"),
    fetchAll((from, to) => supabase.from("transaction_shares").select("transaction_id, person_name, amount, status").order("id").range(from, to)),
  ]);

  const nameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const header = [
    "datum", "tijd", "bedrag", "jouw_deel", "valuta", "tegenpartij", "omschrijving", "tegenpartij_bank", "omschrijving_bank",
    "potje", "in_potje_gezet_op", "eigen_overboeking", "saldo_erna", "notitie", "bron",
  ];
  const lines = [header.join(";")];
  for (const t of transactions) {
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
        t.note ?? "",
        // bank, csv of cash (contante uitgave zonder rekening)
        t.source,
      ]
        .map(csvField)
        .join(";"),
    );
  }

  if (shares.length > 0) {
    lines.push("");
    lines.push(["voorgeschoten_transactie", "persoon", "bedrag", "status"].join(";"));
    for (const s of shares) {
      lines.push([s.transaction_id, s.person_name ?? "", String(s.amount).replace(".", ","), s.status].map(csvField).join(";"));
    }
  }

  const rows = transactions.length;
  await logEvent("export_downloaded", {
    rows_bucket: rows === 0 ? "0" : rows <= 100 ? "1-100" : rows <= 1000 ? "101-1000" : "1000+",
  });

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
