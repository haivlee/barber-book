"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-secondary/50 px-4">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          Please try again. If it keeps happening, give us a call.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="xl" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" size="xl">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
