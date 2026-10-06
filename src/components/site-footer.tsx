import Link from "next/link";
import { Logo } from "@/components/logo";
import { shop } from "@/config/shop";

export function SiteFooter() {
  return (
    <footer className="bg-[oklch(0.16_0.01_60)] text-[oklch(0.92_0.01_85)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm opacity-70">{shop.description}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium uppercase tracking-[0.2em] text-brass">Visit</p>
          <p className="opacity-80">{shop.address.line1}</p>
          <p className="opacity-80">{shop.address.line2}</p>
          <a href={`tel:${shop.phone.replace(/\D/g, "")}`} className="block opacity-80 hover:opacity-100">
            {shop.phone}
          </a>
          <a href={`mailto:${shop.email}`} className="block opacity-80 hover:opacity-100">
            {shop.email}
          </a>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium uppercase tracking-[0.2em] text-brass">Quick links</p>
          <Link href="/book" className="block opacity-80 hover:opacity-100">
            Book an appointment
          </Link>
          <a href={shop.instagram} className="block opacity-80 hover:opacity-100">
            Instagram
          </a>
          <Link href="/admin" className="block opacity-80 hover:opacity-100">
            Barber login
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs opacity-60 sm:px-6">
          &copy; {new Date().getFullYear()} {shop.name} {shop.tagline} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
