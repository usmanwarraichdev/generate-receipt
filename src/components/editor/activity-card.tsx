import { MailCheck, MailWarning } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import type { EmailActivity } from "@/lib/invoice";
import { cn } from "@/lib/utils";

/** Email delivery history. Recipients arrive already masked by the server. */
export function ActivityCard({ activity }: { activity: EmailActivity[] }) {
  return (
    <section
      aria-labelledby="activity-title"
      className="rounded-2xl border border-line bg-surface px-5 py-5 shadow-card sm:px-6"
    >
      <h2 id="activity-title" className="font-display text-xl text-ink">
        Activity
      </h2>
      {activity.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No emails sent yet. Use <span className="font-medium text-ink">Send</span> to email this
          invoice.
        </p>
      ) : (
        <ol className="mt-4 grid gap-4">
          {activity.map((item) => {
            const sent = item.status === "sent";
            const Icon = sent ? MailCheck : MailWarning;
            return (
              <li key={item.id} className="flex gap-3 text-sm">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    sent ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-ink">
                    {sent ? "Emailed to " : "Couldn’t email "}
                    <span className="font-medium">{item.recipient}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={item.createdAt} suppressHydrationWarning>
                      {formatDateTime(item.createdAt)}
                    </time>
                    {item.error && ` · ${item.error}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
