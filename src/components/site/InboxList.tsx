import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { timeAgo, type ThreadSummary } from "@/lib/enquiries";

export function InboxList({ threads }: { threads: ThreadSummary[] }) {
  return (
    <ul className="divide-y divide-border">
      {threads.map((t) => (
        <li key={t.id}>
          <Link
            to="/account/enquiries/$id"
            params={{ id: t.id }}
            className={`group flex items-start gap-3 rounded-2xl px-3 py-4 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${t.unread ? "bg-mint/40" : ""}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-display text-base font-extrabold text-primary">
              {t.counterpartName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`truncate ${t.unread ? "font-extrabold" : "font-bold"}`}>{t.counterpartName}</p>
                {t.unread && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">New</span>}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(t.lastMessageAt)}</span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">{t.subject} · {t.educationLevel} · {t.status}</p>
              <p className={`mt-1 line-clamp-1 text-sm ${t.unread ? "text-foreground" : "text-muted-foreground"}`}>{t.preview}</p>
            </div>
            <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
