import Link from "next/link";
import { Scissors } from "lucide-react";
import { shop } from "@/config/shop";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-full bg-brass text-brass-foreground transition-transform group-hover:-rotate-12">
        <Scissors className="size-4" />
      </span>
      <span className="leading-none">
        <span className="block font-heading text-lg font-semibold tracking-tight">{shop.name}</span>
        <span className="block text-[0.65rem] uppercase tracking-[0.25em] opacity-70">
          {shop.tagline}
        </span>
      </span>
    </Link>
  );
}
