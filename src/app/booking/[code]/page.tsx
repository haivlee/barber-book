import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Phone,
  XCircle,
  Ban,
  PartyPopper,
} from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { BarberAvatar } from "@/components/barber-avatar";
import { CancelBookingButton } from "@/components/booking/cancel-booking-button";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { shop } from "@/config/shop";
import { db } from "@/lib/db";
import { formatDateLong, formatDuration, formatPrice, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your booking" };

const STATUS = {
  PENDING: {
    icon: Hourglass,
    label: "Waiting for confirmation",
    tone: "bg-warning/20 text-[oklch(0.42_0.1_65)] border-warning/40",
    body: (barber: string) =>
      `${barber} has your request and will confirm shortly. Your time is held in the meantime. This page updates automatically.`,
  },
  CONFIRMED: {
    icon: CheckCircle2,
    label: "Confirmed",
    tone: "bg-success/15 text-[oklch(0.4_0.1_155)] border-success/40",
    body: (barber: string) => `You're all set. ${barber} will see you then. Please arrive 5 minutes early.`,
  },
  DECLINED: {
    icon: XCircle,
    label: "Not available",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
    body: (barber: string) =>
      `Sorry, ${barber} can't take this appointment. Please pick another time, it only takes a minute.`,
  },
  CANCELLED: {
    icon: Ban,
    label: "Cancelled",
    tone: "bg-muted text-muted-foreground border-border",
    body: () => "This appointment was cancelled and the time has been released.",
  },
} as const;

type Status = keyof typeof STATUS;

function googleCalendarUrl(opts: { title: string; start: Date; end: Date; details: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.details,
    location: `${shop.address.line1}, ${shop.address.line2}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const booking = await db.booking.findUnique({
    where: { code: code.toUpperCase() },
    include: { barber: true, service: true },
  });
  if (!booking) notFound();

  const status = (booking.status in STATUS ? booking.status : "PENDING") as Status;
  const meta = STATUS[status];
  const isUpcoming = booking.startAt.getTime() > Date.now();
  const canCancel = isUpcoming && (status === "PENDING" || status === "CONFIRMED");
  const Icon = meta.icon;

  return (
    <>
      <SiteHeader />
      {status === "PENDING" && <AutoRefresh intervalMs={10_000} />}
      <main className="min-h-[calc(100dvh-4rem)] bg-secondary/50 px-4 py-8 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl">
          {isNew && status === "PENDING" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border bg-background p-4 shadow-sm">
              <PartyPopper className="mt-0.5 size-5 shrink-0 text-[oklch(0.55_0.12_65)]" />
              <div className="text-sm">
                <p className="font-medium">Request sent!</p>
                <p className="text-muted-foreground">
                  Save this page or bookmark it. It&apos;s the easiest way to check your booking
                  status.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="barber-stripes h-1.5" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
                    meta.tone,
                  )}
                >
                  <Icon className={cn("size-4", status === "PENDING" && "animate-pulse")} />
                  {meta.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  Booking ref <span className="font-mono font-semibold text-foreground">{booking.code}</span>
                </span>
              </div>

              <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatDateLong(booking.startAt)}
              </h1>
              <p className="mt-1 text-xl text-muted-foreground">
                {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">{meta.body(booking.barber.name.split(" ")[0])}</p>
              {booking.decisionNote && (status === "DECLINED" || status === "CANCELLED") && (
                <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm">
                  <span className="font-medium">Note from the shop:</span> {booking.decisionNote}
                </p>
              )}

              <div className="mt-8 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <BarberAvatar name={booking.barber.name} className="size-11 text-sm" />
                  <div>
                    <p className="font-medium">{booking.barber.name}</p>
                    <p className="text-sm text-muted-foreground">{booking.barber.title}</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium">{booking.service.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="size-3.5" /> {formatDuration(booking.service.durationMin)} &middot;{" "}
                    {formatPrice(booking.service.priceCents)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" /> {shop.address.line1}, {shop.address.line2}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4" />
                  <a href={`tel:${shop.phone.replace(/\D/g, "")}`} className="hover:underline">
                    {shop.phone}
                  </a>
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {status === "CONFIRMED" && isUpcoming && (
                  <Button asChild size="xl">
                    <a
                      href={googleCalendarUrl({
                        title: `${booking.service.name} with ${booking.barber.name} at ${shop.name}`,
                        start: booking.startAt,
                        end: booking.endAt,
                        details: `Booking ref ${booking.code}`,
                      })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <CalendarPlus data-icon="inline-start" /> Add to calendar
                    </a>
                  </Button>
                )}
                {(status === "DECLINED" || status === "CANCELLED") && (
                  <Button asChild variant="brass" size="xl">
                    <Link href={`/book?service=${booking.service.slug}`}>Book another time</Link>
                  </Button>
                )}
                {canCancel && <CancelBookingButton code={booking.code} />}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need help? Call us at{" "}
            <a href={`tel:${shop.phone.replace(/\D/g, "")}`} className="font-medium text-foreground hover:underline">
              {shop.phone}
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
