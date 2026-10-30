import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, popularSearches, type Category } from "@/data/sample";

export function HeroSearch() {
  const [cat, setCat] = useState<Category>("tutors");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const current = categories.find((c) => c.id === cat)!;

  const go = (e?: FormEvent, term = q) => {
    e?.preventDefault();
    setNote(term ? `Showing ${current.label.toLowerCase()} for “${term}”` : `Browsing all ${current.label.toLowerCase()}`);
    document.getElementById(current.anchor)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full max-w-2xl">
      <div role="tablist" className="mb-3 inline-flex flex-wrap gap-1 rounded-full bg-card p-1 shadow-soft">
        {categories.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${cat === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            {c.label}
          </button>
        ))}
      </div>
      <form onSubmit={go} className="flex items-center gap-2 rounded-full bg-card p-2 pl-5 shadow-lift">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={current.placeholder} aria-label="Search"
          className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted-foreground" />
        <Button type="submit" variant="pill" size="xl">Search</Button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-muted-foreground">Popular:</span>
        {popularSearches.map((p) => (
          <button key={p} onClick={() => { setQ(p); go(undefined, p); }} className="rounded-full border border-border bg-card/70 px-3 py-1 font-semibold hover:border-primary hover:text-primary">
            {p}
          </button>
        ))}
      </div>
      {note && <p className="mt-3 text-sm font-semibold text-primary" aria-live="polite">{note}</p>}
    </div>
  );
}
