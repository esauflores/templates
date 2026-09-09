import { Badge } from "#/components/ui/badge";
import { CHANGELOG, type ChangeType } from "#/features/account/data/changelog";
import { fmtDate } from "#/lib/format";

const TONE: Record<ChangeType, string> = {
  added: "text-emerald-600 dark:text-emerald-400",
  improved: "text-blue-600 dark:text-blue-400",
  fixed: "text-amber-600 dark:text-amber-400",
};

export const ChangelogContent = () => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
    {CHANGELOG.map((entry) => (
      <section key={entry.version} className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <Badge variant="outline" className="font-mono">
            v{entry.version}
          </Badge>
          <span className="text-xs text-muted-foreground">{fmtDate(entry.date)}</span>
        </div>
        <ul className="flex flex-col gap-1.5 border-l pl-4 text-sm">
          {entry.changes.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className={`w-16 shrink-0 font-medium capitalize ${TONE[c.type]}`}>{c.type}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);
