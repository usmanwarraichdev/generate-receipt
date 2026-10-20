import { Settings2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";

/** Shown instead of a page when the server is missing configuration (useful on first run). */
export function SetupNotice({ message }: { message: string }) {
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
            <Settings2 aria-hidden className="size-5" />
          </span>
          <h1 className="mt-5 font-display text-3xl tracking-tight">Almost there</h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
          <ol className="mt-6 grid list-decimal gap-2 pl-5 text-sm text-ink">
            <li>
              Copy <code className="rounded bg-muted px-1.5 py-0.5">.env.example</code> to{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">.env.local</code> and add your
              Supabase and Resend keys.
            </li>
            <li>
              Run{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">
                supabase/migrations/20261019000000_init.sql
              </code>{" "}
              in the Supabase SQL editor.
            </li>
            <li>Restart the dev server. The README walks through each step.</li>
          </ol>
        </div>
      </main>
    </>
  );
}
