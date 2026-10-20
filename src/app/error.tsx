"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main id="main" className="mx-auto grid max-w-xl justify-items-center px-4 py-24 text-center">
      <h1 className="font-display text-3xl tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        We couldn’t load this page. Your saved invoices are safe, so please try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="brand" size="lg" onClick={() => retry()}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to invoices</Link>
        </Button>
      </div>
      {digest && <p className="mt-6 text-xs text-muted-foreground">Reference: {digest}</p>}
    </main>
  );
}
