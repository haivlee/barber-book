import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Clock,
  MapPin,
  Phone,
  Scissors,
  Star,
  UserCheck,
} from "lucide-react";
import { BarberAvatar } from "@/components/barber-avatar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { shop } from "@/config/shop";
import { findNextSlot } from "@/lib/availability";
import { db } from "@/lib/db";
import {
  formatDuration,
  formatPrice,
  formatTime,
  hhmmToLabel,
  todayKey,
  addDaysKey,
  weekdayOf,
  formatDateKeyLong,
} from "@/lib/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function workingDaysLabel(weekdays: number[]) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((d) => weekdays.includes(d)).map((d) => DAY_SHORT[d]).join(" · ");
}

function relativeDay(dateKey: string) {
  const today = todayKey();
  if (dateKey === today) return "Today";
  if (dateKey === addDaysKey(today, 1)) return "Tomorrow";
  return formatDateKeyLong(dateKey);
}

export default async function HomePage() {
  const [services, barbers] = await Promise.all([
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.barber.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { workingHours: true },
    }),
  ]);
  const next = services[0] ? await findNextSlot(services[0].id) : null;
  const todayWeekday = weekdayOf(todayKey());

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[oklch(0.18_0.012_60)] text-[oklch(0.97_0.01_85)]">
          <div className="grain pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-brass/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-brass">
                <Scissors className="size-3.5" /> Grand Street, Brooklyn
              </p>
              <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
                Look sharp.
                <br />
                <span className="text-brass italic">Book your chair</span> in seconds.
              </h1>
              <p className="mt-6 max-w-xl text-base text-pretty opacity-75 sm:text-lg">
                See every open time live, pick the barber you trust, and get a confirmation
                straight from the chair. No phone tag, no waiting around.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="brass" size="xl">
                  <Link href="/book">
                    Book an appointment <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="xl"
                  className="border-white/20 bg-transparent text-inherit hover:bg-white/10 hover:text-inherit"
                >
                  <Link href="#services">View services & prices</Link>
                </Button>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div>
                  <dt className="text-xs opacity-60">Google rating</dt>
                  <dd className="mt-1 flex items-center gap-1 font-heading text-2xl">
                    4.9 <Star className="size-4 fill-brass text-brass" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs opacity-60">Cuts a year</dt>
                  <dd className="mt-1 font-heading text-2xl">6,000+</dd>
                </div>
                <div>
                  <dt className="text-xs opacity-60">Since</dt>
                  <dd className="mt-1 font-heading text-2xl">2011</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <div className="barber-stripes absolute -inset-3 rounded-3xl opacity-20" />
              <div className="relative rounded-2xl border border-white/10 bg-[oklch(0.23_0.014_60)] p-6 shadow-2xl sm:p-8">
                <div className="flex items-center gap-2 text-sm text-brass">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  Live availability
                </div>
                <p className="mt-5 text-sm opacity-60">Next open chair</p>
                {next ? (
                  <>
                    <p className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
                      {relativeDay(next.dateKey)}, {formatTime(next.startAt)}
                    </p>
                    {next.barberName && (
                      <p className="mt-2 text-sm opacity-75">
                        with {next.barberName} &middot; {services[0].name}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 font-heading text-2xl">Fully booked this week</p>
                )}
                <div className="mt-6 space-y-3">
                  {barbers.map((b) => {
                    const hours = b.workingHours.find((h) => h.weekday === todayWeekday);
                    return (
                      <div
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <BarberAvatar name={b.name} className="size-10 text-sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{b.name}</p>
                          <p className="text-xs opacity-60">
                            {hours
                              ? `In today ${hhmmToLabel(hours.startTime)} - ${hhmmToLabel(hours.endTime)}`
                              : "Off today"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            hours ? "bg-success" : "bg-white/25",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button asChild variant="brass" size="xl" className="mt-6 w-full">
                  <Link href="/book">See all open times</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b bg-secondary/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
            {[
              {
                icon: CalendarClock,
                title: "Pick a real open time",
                body: "Choose a service and barber. You only see times that are actually free.",
              },
              {
                icon: UserCheck,
                title: "Your barber confirms",
                body: "Your request lands in the barber's queue and gets confirmed, usually within the hour.",
              },
              {
                icon: CalendarCheck,
                title: "Walk in, sit down",
                body: "Track your booking with a personal link. Need to change plans? Cancel in one tap.",
              },
            ].map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 font-heading text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHeading
              eyebrow="Services"
              title="Straightforward menu. Serious craft."
              body="Every service includes a consultation and a hot towel finish."
            />
            {services.length === 0 ? (
              <p className="mt-10 text-muted-foreground">Our service menu is being updated. Call us to book.</p>
            ) : (
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/book?service=${s.slug}`}
                    className="group flex flex-col rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-heading text-xl font-semibold">{s.name}</h3>
                      <span className="font-heading text-xl font-semibold">{formatPrice(s.priceCents)}</span>
                    </div>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.description}</p>
                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-4" /> {formatDuration(s.durationMin)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium transition-colors group-hover:text-[oklch(0.55_0.12_65)]">
                        Book <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Barbers */}
        <section id="barbers" className="scroll-mt-20 bg-secondary/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHeading
              eyebrow="The team"
              title="Pick your barber, or let us match you."
              body="Book with a favorite or choose “Any barber” for the earliest open time."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {barbers.map((b) => (
                <div key={b.id} className="flex flex-col rounded-2xl border bg-card p-6">
                  <div className="flex items-center gap-4">
                    <BarberAvatar name={b.name} className="size-14 text-lg" />
                    <div>
                      <h3 className="font-heading text-lg font-semibold">{b.name}</h3>
                      <p className="text-sm text-muted-foreground">{b.title}</p>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">{b.bio}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                    {workingDaysLabel(b.workingHours.map((h) => h.weekday))}
                  </p>
                  <Button asChild variant="outline" size="lg" className="mt-4 w-full">
                    <Link href={`/book?barber=${b.slug}`}>Book with {b.name.split(" ")[0]}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visit */}
        <section id="visit" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="Visit"
                title="Find us on Grand Street."
                body="Two blocks from the Bedford Ave L. Street parking on Roebling."
              />
              <div className="mt-8 space-y-4 text-sm">
                <a
                  href={shop.address.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 hover:underline"
                >
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <span>
                    {shop.address.line1}
                    <br />
                    {shop.address.line2}
                  </span>
                </a>
                <a
                  href={`tel:${shop.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Phone className="size-4 text-muted-foreground" /> {shop.phone}
                </a>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
                <Clock className="size-4" /> Opening hours
              </h3>
              <ul className="mt-4 divide-y text-sm">
                {shop.openingHours.map((h) => {
                  const isToday = h.day === todayWeekday;
                  return (
                    <li
                      key={h.day}
                      className={cn(
                        "flex items-center justify-between py-3",
                        isToday && "font-semibold",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {h.label}
                        {isToday && (
                          <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[0.7rem] font-medium text-[oklch(0.45_0.1_65)]">
                            Today
                          </span>
                        )}
                      </span>
                      <span className={cn(!h.open && "text-muted-foreground")}>
                        {h.open && h.close ? `${hhmmToLabel(h.open)} - ${hhmmToLabel(h.close)}` : "Closed"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div className="barber-stripes absolute inset-x-0 top-0 h-2 opacity-80" />
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Your next fresh cut is a few taps away.
            </h2>
            <p className="mx-auto mt-3 max-w-lg opacity-75">
              Pick a time that works for you. We will confirm it shortly after.
            </p>
            <Button asChild variant="brass" size="xl" className="mt-8">
              <Link href="/book">
                Book now <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-[oklch(0.55_0.12_65)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
    </div>
  );
}
