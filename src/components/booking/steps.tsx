"use client";

import { format } from "date-fns";
import { AlertCircle, CalendarX2, Check, Clock, RefreshCw, Sparkles } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { BarberAvatar } from "@/components/barber-avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateKeyLong,
  formatDateLong,
  formatDuration,
  formatPrice,
  formatTime,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CustomerDetails } from "@/lib/validation";
import { ANY_BARBER, type BarberOption, type ServiceOption, type SlotOption } from "./types";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function OptionCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative w-full rounded-xl border bg-card p-4 text-left transition-all outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-foreground ring-1 ring-foreground",
        className,
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      )}
      {children}
    </button>
  );
}

export function ServiceStep({
  services,
  value,
  onChange,
}: {
  services: ServiceOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title="No services available right now"
        body="We are updating our menu. Please call the shop to book."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => (
        <OptionCard key={s.id} selected={value === s.id} onClick={() => onChange(s.id)}>
          <div className="pr-7">
            <p className="font-heading text-lg font-semibold">{s.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-4" /> {formatDuration(s.durationMin)}
            </span>
            <span className="font-semibold">{formatPrice(s.priceCents)}</span>
          </div>
        </OptionCard>
      ))}
    </div>
  );
}

export function BarberStep({
  barbers,
  value,
  onChange,
}: {
  barbers: BarberOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <OptionCard selected={value === ANY_BARBER} onClick={() => onChange(ANY_BARBER)}>
        <div className="flex items-center gap-4 pr-7">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brass/25 text-[oklch(0.45_0.1_65)]">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">Any barber</p>
            <p className="text-sm text-muted-foreground">Most open times. We match you with whoever is free.</p>
          </div>
        </div>
      </OptionCard>
      {barbers.map((b) => (
        <OptionCard key={b.id} selected={value === b.id} onClick={() => onChange(b.id)}>
          <div className="flex items-center gap-4 pr-7">
            <BarberAvatar name={b.name} />
            <div className="min-w-0">
              <p className="font-heading text-lg font-semibold">{b.name}</p>
              <p className="text-sm text-muted-foreground">{b.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {order
                  .filter((d) => b.weekdays.includes(d))
                  .map((d) => DAY_SHORT[d])
                  .join(" · ")}
              </p>
            </div>
          </div>
        </OptionCard>
      ))}
    </div>
  );
}

function keyToDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function groupSlots(slots: SlotOption[]) {
  const groups: { label: string; slots: SlotOption[] }[] = [
    { label: "Morning", slots: [] },
    { label: "Afternoon", slots: [] },
    { label: "Evening", slots: [] },
  ];
  for (const s of slots) {
    const hour = Number(s.time.slice(0, 2));
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length > 0);
}

export function DateTimeStep({
  firstDay,
  lastDay,
  openDays,
  openDaysStatus,
  date,
  onDateChange,
  slots,
  slotsStatus,
  selectedSlot,
  onSlotChange,
  onRetry,
}: {
  firstDay: string;
  lastDay: string;
  openDays: Record<string, number> | null;
  openDaysStatus: "idle" | "loading" | "ready" | "error";
  date: string | null;
  onDateChange: (key: string) => void;
  slots: SlotOption[] | null;
  slotsStatus: "idle" | "loading" | "ready" | "error";
  selectedSlot: SlotOption | null;
  onSlotChange: (slot: SlotOption) => void;
  onRetry: () => void;
}) {
  const noDays = openDaysStatus === "ready" && openDays && Object.values(openDays).every((n) => n === 0);

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="mx-auto w-full max-w-sm md:mx-0 md:w-auto">
        <div className="rounded-xl border bg-card p-2">
          {openDaysStatus === "loading" && !openDays ? (
            <Skeleton className="h-[300px] w-full md:w-[280px]" />
          ) : (
            <Calendar
              mode="single"
              selected={date ? keyToDate(date) : undefined}
              onSelect={(d) => d && onDateChange(format(d, "yyyy-MM-dd"))}
              startMonth={keyToDate(firstDay)}
              endMonth={keyToDate(lastDay)}
              defaultMonth={date ? keyToDate(date) : keyToDate(firstDay)}
              disabled={(d) => {
                const key = format(d, "yyyy-MM-dd");
                if (key < firstDay || key > lastDay) return true;
                return !openDays || !openDays[key];
              }}
              showOutsideDays={false}
              className="w-full bg-transparent [--cell-size:--spacing(10)] md:[--cell-size:--spacing(9)]"
            />
          )}
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Greyed-out days are closed or fully booked.
        </p>
      </div>

      <div className="min-w-0">
        {openDaysStatus === "error" || slotsStatus === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="We couldn't load availability"
            body="Check your connection and try again."
            action={
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw /> Try again
              </Button>
            }
          />
        ) : noDays ? (
          <EmptyState
            icon={CalendarX2}
            title="Fully booked for the next few weeks"
            body="Try choosing “Any barber”, or call the shop to join the waitlist."
          />
        ) : !date ? (
          <EmptyState icon={CalendarX2} title="Pick a day" body="Choose a date to see open times." />
        ) : (
          <div>
            <p className="font-heading text-lg font-semibold">{formatDateKeyLong(date)}</p>
            {slotsStatus === "loading" || slotsStatus === "idle" ? (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : slots && slots.length > 0 ? (
              <div className="mt-4 space-y-5">
                {groupSlots(slots).map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                      {group.slots.map((slot) => {
                        const selected = selectedSlot?.startAt === slot.startAt;
                        return (
                          <button
                            key={slot.startAt}
                            type="button"
                            onClick={() => onSlotChange(slot)}
                            aria-pressed={selected}
                            className={cn(
                              "h-10 rounded-lg border bg-card text-sm font-medium tabular-nums transition-colors outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50",
                              selected && "border-primary bg-primary text-primary-foreground hover:border-primary",
                            )}
                          >
                            {formatTime(slot.startAt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarX2}
                title="No times left this day"
                body="Try another date on the calendar."
                className="mt-4"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailsStep({ form }: { form: UseFormReturn<CustomerDetails> }) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <form className="grid max-w-xl gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
      <Field label="Full name" error={errors.customerName?.message} htmlFor="customerName">
        <Input
          id="customerName"
          autoComplete="name"
          placeholder="Jordan Smith"
          className="h-11"
          aria-invalid={!!errors.customerName}
          {...register("customerName")}
        />
      </Field>
      <Field
        label="Mobile number"
        hint="Your barber may text you if something changes."
        error={errors.customerPhone?.message}
        htmlFor="customerPhone"
      >
        <Input
          id="customerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(917) 555-0123"
          className="h-11"
          aria-invalid={!!errors.customerPhone}
          {...register("customerPhone")}
        />
      </Field>
      <Field label="Email (optional)" error={errors.customerEmail?.message} htmlFor="customerEmail">
        <Input
          id="customerEmail"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11"
          aria-invalid={!!errors.customerEmail}
          {...register("customerEmail")}
        />
      </Field>
      <Field label="Anything we should know? (optional)" error={errors.note?.message} htmlFor="note">
        <Textarea
          id="note"
          rows={3}
          placeholder="e.g. Growing out the top, keep the sides short."
          aria-invalid={!!errors.note}
          {...register("note")}
        />
      </Field>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function ReviewStep({
  service,
  barberLabel,
  slot,
  details,
}: {
  service: ServiceOption;
  barberLabel: string;
  slot: SlotOption;
  details: CustomerDetails;
}) {
  const rows = [
    { label: "Service", value: `${service.name} · ${formatDuration(service.durationMin)}` },
    { label: "Barber", value: barberLabel },
    { label: "When", value: `${formatDateLong(slot.startAt)} at ${formatTime(slot.startAt)}` },
    { label: "Name", value: details.customerName },
    { label: "Phone", value: details.customerPhone },
    ...(details.customerEmail ? [{ label: "Email", value: details.customerEmail }] : []),
    ...(details.note ? [{ label: "Note", value: details.note }] : []),
  ];
  return (
    <div className="max-w-xl">
      <dl className="divide-y rounded-xl border bg-card">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[6rem_1fr] gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="font-medium break-words">{r.value}</dd>
          </div>
        ))}
        <div className="grid grid-cols-[6rem_1fr] gap-4 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-heading text-lg font-semibold">{formatPrice(service.priceCents)}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg bg-brass/15 px-4 py-3 text-sm text-[oklch(0.38_0.07_65)]">
        Your time is held as soon as you send the request. Your barber will confirm it shortly and
        you can track the status on the next page. Pay in the shop after your cut.
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </span>
      <p className="mt-4 font-heading text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
