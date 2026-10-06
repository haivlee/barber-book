import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";
import { bookingWindow } from "@/lib/availability";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New booking" };
export const dynamic = "force-dynamic";

const SOURCES = ["ZALO", "PHONE", "WALK_IN"] as const;

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const initialSource = SOURCES.find((s) => s === source?.toUpperCase()) ?? "ZALO";
  const [services, barbers] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.barber.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { workingHours: { select: { weekday: true } } },
    }),
  ]);
  const window = bookingWindow();

  return (
    <div className="min-h-dvh bg-secondary/50">
      <AdminHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Add a booking</h1>
        <p className="mt-1 mb-6 text-muted-foreground">
          Got a booking on Zalo, by phone, or at the door? Add it here so it shows on the schedule and
          the time is blocked on the website.
        </p>
        <ManualBookingForm
          services={services.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
          }))}
          barbers={barbers.map((b) => ({
            id: b.id,
            slug: b.slug,
            name: b.name,
            title: b.title,
            weekdays: b.workingHours.map((h) => h.weekday),
          }))}
          firstDay={window.first}
          lastDay={window.last}
          initialSource={initialSource}
        />
      </main>
    </div>
  );
}
