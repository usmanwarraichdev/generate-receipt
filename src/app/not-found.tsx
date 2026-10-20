import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main id="main" className="mx-auto grid max-w-xl justify-items-center px-4 py-24 text-center">
        <p className="font-display text-7xl text-brand">404</p>
        <h1 className="mt-4 font-display text-3xl tracking-tight">This page has gone missing</h1>
        <p className="mt-3 text-muted-foreground">
          The invoice may have been deleted, or the link is incomplete.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link href="/">
            <ArrowLeft aria-hidden />
            Back to invoices
          </Link>
        </Button>
      </main>
    </>
  );
}
