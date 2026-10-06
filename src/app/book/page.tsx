import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { bookingWindow } from "@/lib/availability";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Book an appointment" };
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; barber?: string }>;
}) {
  const params = await searchParams;
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
    <>
      <SiteHeader />
      <main className="min-h-[calc(100dvh-4rem)] bg-secondary/50">
        <BookingWizard
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
          initialServiceSlug={params.service}
          initialBarberSlug={params.barber}
          firstDay={window.first}
          lastDay={window.last}
        />
      </main>
    </>
  );
}
