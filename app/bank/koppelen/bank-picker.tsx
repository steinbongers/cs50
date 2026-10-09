"use client";

import { useMemo, useState, useTransition } from "react";
import { IconChevronRight } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_IMPORT_FROM, type ImportFrom } from "@/lib/bank/import-from";
import { startBankConnection } from "../actions";
import { ImportFromChoice } from "./import-from-choice";

interface BankOption {
  name: string;
  logo: string | null;
}

/** Lijst van banken met zoekveld; één tik start de autorisatie bij de bank. */
export function BankPicker({ banks, next, reconnect }: { banks: BankOption[]; next: string; reconnect: boolean }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importFrom, setImportFrom] = useState<ImportFrom>(DEFAULT_IMPORT_FROM);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? banks.filter((b) => b.name.toLowerCase().includes(q)) : banks;
  }, [banks, query]);

  function choose(name: string) {
    setError(null);
    setBusy(name);
    startTransition(async () => {
      const result = await startBankConnection(name, next, reconnect, importFrom);
      if ("error" in result) {
        setError(result.error);
        setBusy(null);
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {!reconnect && (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] leading-5 font-semibold">Kaartjes ophalen vanaf</h2>
          <ImportFromChoice value={importFrom} onChange={setImportFrom} />
        </div>
      )}
      <Input
        type="search"
        aria-label="Zoek je bank"
        placeholder="Zoek je bank"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {error && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y overflow-hidden rounded-card bg-surface shadow-card" role="list">
        {filtered.map((bank) => (
          <li key={bank.name}>
            <button
              type="button"
              onClick={() => choose(bank.name)}
              disabled={busy !== null}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-surface-muted",
                busy !== null && busy !== bank.name && "opacity-50",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-[13px] leading-[18px] font-semibold text-text-muted">
                {bank.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bank.logo} alt="" className="size-10 object-contain" loading="lazy" />
                ) : (
                  bank.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="flex-1 font-medium">{bank.name}</span>
              {busy === bank.name ? <Spinner className="text-text-muted" /> : <IconChevronRight className="text-text-muted" size={20} />}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-[13px] leading-[18px] text-text-muted">Geen bank gevonden met die naam.</li>}
      </ul>
    </div>
  );
}
