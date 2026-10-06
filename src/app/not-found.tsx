import Link from "next/link";
import { Scissors } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-secondary/50 px-4">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-muted">
            <Scissors className="size-6 text-muted-foreground" />
          </span>
          <h1 className="mt-6 font-heading text-3xl font-semibold">We couldn&apos;t find that page</h1>
          <p className="mt-2 text-muted-foreground">
            The link may be mistyped, or the booking reference doesn&apos;t exist.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="brass" size="xl">
              <Link href="/book">Book an appointment</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
