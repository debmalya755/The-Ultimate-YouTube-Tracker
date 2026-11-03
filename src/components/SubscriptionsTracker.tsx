import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useLocalArray } from "../hooks/useLocalArray";

export interface Sub {
  id: string;
  name: string;
  amount: number;
  cycle: "weekly" | "monthly" | "yearly";
  nextAt?: string;
  note?: string;
  createdAt: number;
}

function isSub(v: unknown): v is Sub {
  return !!v && typeof v === "object" && typeof (v as Sub).id === "string" && typeof (v as Sub).name === "string";
}

const field =
  "mt-2 w-full border-b border-bone/20 bg-transparent pb-2 font-mono text-sm text-bone caret-blood outline-none placeholder:text-bone/20 focus:border-bone/70";
const label = "block font-mono text-[9px] tracking-[0.35em] text-bone/45 uppercase";

function Editor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Sub | null;
  onCancel: () => void;
  onSave: (draft: Omit<Sub, "id" | "createdAt">) => void;
}) {
  useBodyScrollLock();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : ""
  );
  const [cycle, setCycle] = useState<Sub["cycle"]>(initial?.cycle ?? "monthly");
  const [nextAt, setNextAt] = useState(initial?.nextAt ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Name required.");
      return;
    }
    const n = Number(amount);
    onSave({
      name: name.trim(),
      amount: Number.isFinite(n) ? n : 0,
      cycle,
      nextAt: nextAt || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        role="dialog"
        className="relative w-full max-w-lg border border-bone/15 bg-ash/95 p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-blood uppercase">
              {initial ? "Edit" : "New"}
            </p>
            <h3 className="mt-2 font-display text-3xl uppercase">Subscription</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className={label}>Name *</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="YouTube Premium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Amount</label>
              <input className={field} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="149" />
            </div>
            <div>
              <label className={label}>Cycle</label>
              <select
                className={`${field} appearance-none`}
                value={cycle}
                onChange={(e) => setCycle(e.target.value as Sub["cycle"])}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Next charge</label>
            <input className={field} type="date" value={nextAt} onChange={(e) => setNextAt(e.target.value)} />
          </div>
          <div>
            <label className={label}>Note</label>
            <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Family plan" />
          </div>
          {err && <p className="font-mono text-[9px] text-blood uppercase">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-full border border-bone/20 px-5 py-2.5 font-mono text-[9px] tracking-[0.3em] uppercase">
              Cancel
            </button>
            <button type="submit" className="rounded-full bg-bone px-6 py-2.5 font-mono text-[9px] tracking-[0.3em] text-carbon uppercase hover:bg-blood hover:text-bone">
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function SubscriptionsTracker() {
  const store = useLocalArray<Sub>("debos.desk.subs.v1", isSub);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sub | null>(null);

  const monthly = store.rows.reduce((s, r) => {
    if (r.cycle === "monthly") return s + r.amount;
    if (r.cycle === "yearly") return s + r.amount / 12;
    if (r.cycle === "weekly") return s + (r.amount * 52) / 12;
    return s;
  }, 0);

  return (
    <div className="px-6 pb-24 md:px-12">
      <p className="font-mono text-[10px] tracking-[0.45em] text-blood uppercase">
        Desk 02
      </p>
      <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.2rem,7vw,5.5rem)] uppercase leading-[0.92]">
        Subscriptions Tracker
      </h1>
      <p className="mt-5 font-mono text-[10px] tracking-[0.3em] text-bone/40 uppercase">
        ≈ {monthly.toFixed(0)} / month across {store.rows.length}{" "}
        {store.rows.length === 1 ? "item" : "items"}
      </p>

      <div className="mt-12 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-full border border-bone/20 px-4 py-2 font-mono text-[9px] tracking-[0.3em] uppercase hover:border-blood"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add
        </button>
      </div>

      <div className="mt-8 divide-y divide-bone/10 border-y border-bone/10">
        {store.rows.length === 0 && (
          <p className="py-10 font-mono text-[10px] tracking-[0.3em] text-bone/30 uppercase">
            Nothing tracked yet
          </p>
        )}
        {store.rows.map((s) => (
          <article key={s.id} className="flex items-center gap-4 py-5">
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl uppercase leading-none">{s.name}</p>
              <p className="mt-2 font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">
                {s.cycle}
                {s.nextAt ? ` · next ${s.nextAt}` : ""}
                {s.note ? ` · ${s.note}` : ""}
              </p>
            </div>
            <p className="font-display text-2xl tabular-nums">{s.amount}</p>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => {
                setEditing(s);
                setOpen(true);
              }}
              className="text-bone/40 hover:text-bone"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => store.remove(s.id)}
              className="text-bone/40 hover:text-blood"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </article>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <Editor
            initial={editing}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSave={(draft) => {
              if (editing) store.update(editing.id, draft);
              else store.add({ ...draft, createdAt: Date.now() });
              setOpen(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
