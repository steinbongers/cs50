"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createInviteCode, disableInviteCode } from "./actions";

interface CodeRow {
  code: string;
  note: string | null;
  maxUses: number;
  uses: number;
  expired: boolean;
}

export function InviteCodes({ codes }: { codes: CodeRow[] }) {
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createInviteCode({ note, maxUses: Number(maxUses) || 1 });
      if (!result.ok) setError(result.error);
      else {
        setCreated(result.code ?? null);
        setNote("");
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Uitnodigingscodes</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Notitie (bijvoorbeeld: groep 1)" value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
        <Input type="number" min={1} max={100} aria-label="Aantal keer te gebruiken" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="h-11 sm:w-28" />
        <Button onClick={create} loading={isPending}>
          Code maken
        </Button>
      </div>
      {created && (
        <p className="rounded-control bg-positive-soft px-3 py-2 text-sm text-positive">
          Nieuwe code: <strong className="font-mono">{created}</strong>. Deel hem als link: <span className="font-mono">/registreren?code={created}</span>
        </p>
      )}
      {error && <p className="text-sm text-negative">{error}</p>}
      {codes.length > 0 && (
        <ul className="divide-y text-sm">
          {codes.map((c) => {
            const expired = c.expired;
            const used = c.uses >= c.maxUses;
            return (
              <li key={c.code} className="flex items-center gap-3 py-2">
                <span className="font-mono font-medium">{c.code}</span>
                <span className="min-w-0 flex-1 truncate text-text-muted">{c.note}</span>
                <span className="tabular-nums text-text-muted">
                  {c.uses}/{c.maxUses}
                </span>
                {expired || used ? (
                  <span className="text-xs text-text-muted">{used ? "op" : "uit"}</span>
                ) : (
                  <button type="button" onClick={() => startTransition(async () => { await disableInviteCode(c.code); })} className="-my-2 inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-negative">
                    Uitschakelen
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
