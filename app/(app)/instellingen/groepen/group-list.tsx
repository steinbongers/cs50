"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-group";
import { Sheet } from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
import { clearCachedGroups } from "@/lib/groups/cache";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME_LENGTH, MAX_MEMBER_NAME_LENGTH, type MemberTotal } from "@/lib/groups/groups";
import { createGroup, deleteGroup, updateGroup } from "./actions";

export interface GroupItem {
  id: string;
  name: string;
  members: string[];
  /** Per lid wat er nog openstaat in Voorgeschoten, in de volgorde van de groep. */
  open: MemberTotal[];
}

type Editing = { id: string | null; name: string; members: string[] } | null;

export function GroupList({ items }: { items: GroupItem[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  // Nieuwe sleutel per keer openen: de editor begint dan altijd met verse velden.
  const [openCount, setOpenCount] = useState(0);

  function open(next: Editing) {
    setOpenCount((n) => n + 1);
    setEditing(next);
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-5 text-center text-[15px] leading-5 text-text-muted shadow-card">
          Nog geen groepen.
        </p>
      ) : (
        items.map((group) => <GroupCard key={group.id} group={group} onEdit={() => open(group)} />)
      )}

      <Button variant="secondary" size="lg" fullWidth onClick={() => open({ id: null, name: "", members: [""] })}>
        <Plus size={18} aria-hidden />
        Nieuwe groep
      </Button>

      <GroupEditor key={openCount} editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function GroupCard({ group, onEdit }: { group: GroupItem; onEdit: () => void }) {
  const totalCents = group.open.reduce((sum, m) => sum + Math.round(m.total * 100), 0);

  return (
    <section>
      <div className="flex items-end justify-between gap-3 px-4 pb-1.5">
        <h2 className="min-w-0 truncate text-[13px] font-medium text-text-muted">{group.name}</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${group.name} wijzigen`}
          className="-my-2 flex h-9 shrink-0 items-center px-1 text-[13px] font-medium text-primary"
        >
          Wijzigen
        </button>
      </div>
      <ListGroup>
        {group.open.map((member) => (
          <div key={member.name} className="group/row flex min-h-[52px] items-center pl-4">
            <span className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-4 group-last/row:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[15px] leading-5">{member.name}</span>
              {member.total > 0 ? (
                <span className="shrink-0 text-[15px] tabular-nums text-accent-strong">{formatEuro(member.total)}</span>
              ) : (
                <span className="shrink-0 text-[13px] text-text-muted">Niets open</span>
              )}
            </span>
          </div>
        ))}
      </ListGroup>
      {totalCents > 0 && (
        <p className="px-4 pt-1.5 text-[13px] leading-[18px] tabular-nums text-text-muted">
          Nog {formatEuro(totalCents / 100)} te krijgen van deze groep
        </p>
      )}
    </section>
  );
}

/** Groep maken of wijzigen: een naam en de namen van de anderen (jij telt niet mee). */
function GroupEditor({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const router = useRouter();
  const nameId = useId();
  const [name, setName] = useState(editing?.name ?? "");
  const [members, setMembers] = useState<string[]>(editing?.members.length ? editing.members : [""]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const isNew = editing?.id == null;

  function setMember(index: number, value: string) {
    setMembers((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = editing.id ? await updateGroup(editing.id, name, members) : await createGroup(name, members);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearCachedGroups();
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!editing?.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setError(null);
    const id = editing.id;
    startTransition(async () => {
      const result = await deleteGroup(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearCachedGroups();
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={editing !== null}
      onClose={onClose}
      title={isNew ? "Nieuwe groep" : "Groep wijzigen"}
      description="Alleen de namen van de anderen. Jij telt vanzelf mee."
    >
      <div className="flex flex-col gap-4">
        <Field label="Naam van de groep" htmlFor={nameId}>
          <Input
            id={nameId}
            value={name}
            maxLength={MAX_GROUP_NAME_LENGTH}
            placeholder="Huisgenoten"
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-[18px] font-medium">Wie zitten erin?</p>
          {members.map((member, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Naam ${index + 1}`}
                placeholder={`Naam ${index + 1}`}
                value={member}
                maxLength={MAX_MEMBER_NAME_LENGTH}
                autoComplete="off"
                className="h-11 flex-1 text-[15px]"
                onChange={(e) => setMember(index, e.target.value)}
              />
              <button
                type="button"
                aria-label={`Naam ${index + 1} weghalen`}
                disabled={members.length <= 1}
                onClick={() => setMembers((prev) => prev.filter((_, i) => i !== index))}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-surface-muted disabled:opacity-30"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          ))}
          {members.length < MAX_GROUP_MEMBERS && (
            <button
              type="button"
              onClick={() => setMembers((prev) => [...prev, ""])}
              className="flex h-11 items-center gap-1.5 self-start px-1 text-[15px] font-medium text-primary"
            >
              <Plus size={16} aria-hidden />
              Naam toevoegen
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-[13px] leading-[18px] text-negative">
            {error}
          </p>
        )}

        <Button size="lg" fullWidth onClick={save} loading={pending}>
          Bewaren
        </Button>
        {!isNew && (
          <Button variant={confirmDelete ? "danger" : "ghost"} fullWidth onClick={remove} disabled={pending}>
            {confirmDelete ? "Ja, verwijder deze groep" : "Groep verwijderen"}
          </Button>
        )}
        {!isNew && confirmDelete && (
          <p className="-mt-2 text-center text-[13px] leading-[18px] text-text-muted">
            Wat al is verdeeld, blijft gewoon staan.
          </p>
        )}
      </div>
    </Sheet>
  );
}
