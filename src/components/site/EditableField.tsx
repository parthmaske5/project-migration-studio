import { useState, type ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  label: string;
  value: string;
  display?: ReactNode;
  kind?: "text" | "textarea" | "select" | "number";
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** Throw an Error with a friendly message to show it inline. */
  onSave: (next: string) => Promise<void>;
};

/** A labeled value with a pencil button that turns it into an inline editor. */
export function EditableField({ label, value, display, kind = "text", options = [], placeholder, hint, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;

  function start() { setDraft(value); setError(null); setEditing(true); }
  async function save() {
    setBusy(true); setError(null);
    try { await onSave(draft); setEditing(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't save. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
        {!editing && (
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 size-10 rounded-full" onClick={start} aria-label={`Edit ${label}`}>
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      {!editing ? (
        <div className="mt-0.5 text-[15px] font-semibold">
          {display ?? (value ? value : <span className="font-normal text-muted-foreground">Not added yet</span>)}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {kind === "textarea" ? (
            <textarea id={id} autoFocus className={`${inputCls} min-h-28`} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} />
          ) : kind === "select" ? (
            <select id={id} autoFocus className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">Not set</option>
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input id={id} autoFocus type={kind === "number" ? "number" : "text"} min={0} className={inputCls} value={draft} placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} />
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {error && <p role="alert" className="text-xs font-semibold text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="pill" size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}><X /> Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
