"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { shop } from "@/config/shop";

const nav = [
  { href: "/#services", label: "Services" },
  { href: "/#barbers", label: "Barbers" },
  { href: "/#visit", label: "Hours & Location" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.18_0.012_60)]/90 text-[oklch(0.97_0.01_85)] backdrop-blur supports-backdrop-filter:bg-[oklch(0.18_0.012_60)]/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="opacity-80 transition-opacity hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="brass" size="lg" className="hidden px-4 sm:inline-flex">
            <Link href="/book">Book a chair</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-inherit hover:bg-white/10 hover:text-inherit md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] max-w-sm">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl">{shop.name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-4">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b py-4 text-base font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 p-4">
                <Button asChild variant="brass" size="xl" onClick={() => setOpen(false)}>
                  <Link href="/book">Book a chair</Link>
                </Button>
                <Button asChild variant="outline" size="xl">
                  <a href={`tel:${shop.phone.replace(/\D/g, "")}`}>
                    <Phone /> {shop.phone}
                  </a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
