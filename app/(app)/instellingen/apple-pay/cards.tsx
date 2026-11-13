"use client";

import { CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import { setWalletCardKind } from "@/app/(app)/instellingen/actions";
import { RowLabel } from "@/app/(app)/instellingen/rows";
import { ListGroup, ListRow } from "@/components/ui/list-group";
import { Switch } from "@/components/ui/switch";

/**
 * De kaarten waarmee via Apple Pay is betaald. De app gokt aan de naam of het een creditcard is;
 * hier zet je dat zelf goed. Een creditcardbetaling komt niet los via de bank, maar één keer per
 * maand als totaal.
 */
export function WalletCards({ cards }: { cards: { name: string; credit: boolean }[] }) {
  const [local, setLocal] = useState(() => new Map(cards.map((c) => [c.name, c.credit])));
  const [, startTransition] = useTransition();

  if (cards.length === 0) {
    return (
      <p className="px-1 text-[13px] leading-[18px] text-text-muted">
        Je kaart verschijnt hier na je eerste betaling.
      </p>
    );
  }

  function change(name: string, credit: boolean) {
    setLocal((prev) => new Map(prev).set(name, credit));
    startTransition(async () => {
      const result = await setWalletCardKind(name, credit ? "credit" : "debit");
      if (!result.ok) setLocal((prev) => new Map(prev).set(name, !credit));
    });
  }

  return (
    <ListGroup title="Je kaarten">
      {cards.map((card) => {
        const credit = local.get(card.name) ?? card.credit;
        return (
          <ListRow
            key={card.name}
            icon={CreditCard}
            iconClass="bg-cat-indigo-soft text-cat-indigo"
            label={<RowLabel label={card.name} hint={credit ? "Creditcard" : "Betaalpas"} />}
            trailing={<Switch checked={credit} onCheckedChange={(next) => change(card.name, next)} label={`${card.name} is een creditcard`} />}
          />
        );
      })}
    </ListGroup>
  );
}
