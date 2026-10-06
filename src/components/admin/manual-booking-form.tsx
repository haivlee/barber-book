"use client";

import {
  CheckCircle2,
  ClipboardPaste,
  Footprints,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createManualBooking, type ManualBookingResult } from "@/app/admin/actions";
import { BarberAvatar } from "@/components/barber-avatar";
import { DateTimeStep } from "@/components/booking/steps";
import { ANY_BARBER, type BarberOption, type ServiceOption, type SlotOption } from "@/components/booking/types";
import { useOpenDays, useSlots } from "@/components/booking/use-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractPhone } from "@/lib/share-message";
import { formatDateLong, formatDuration, formatPrice, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { manualBookingSchema } from "@/lib/validation";
import { ShareMessagePanel } from "./share-message-panel";

type Source = "ZALO" | "PHONE" | "WALK_IN";
type SavedBooking = Extract<ManualBookingResult, { ok: true }>["booking"];

const SOURCES: { value: Source; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "ZALO", label: "Zalo", icon: MessageCircle },
  { value: "PHONE", label: "Phone call", icon: Phone },
  { value: "WALK_IN", label: "Walk-in", icon: Footprints },
];

type Errors = Partial<Record<"customerName" | "customerPhone" | "customerZalo" | "serviceId" | "startAt" | "note", string>>;

export function ManualBookingForm({
  services,
  barbers,
  firstDay,
  lastDay,
  initialSource,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  firstDay: string;
  lastDay: string;
  initialSource: Source;
}) {
  const [source, setSource] = useState<Source>(initialSource);
  const [pasted, setPasted] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerZalo, setCustomerZalo] = useState("");
  const [note, setNote] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [barberChoice, setBarberChoice] = useState<string>(ANY_BARBER);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotOption | null>(null);
  const [status, setStatus] = useState<"CONFIRMED" | "PENDING">("CONFIRMED");
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState<SavedBooking | null>(null);
  const [saving, startSave] = useTransition();

  const barberId = barberChoice === ANY_BARBER ? null : barberChoice;
  const openDays = useOpenDays(saved ? null : serviceId, barberId, true);
  const slots = useSlots(saved ? null : serviceId, barberId, date, true);
  const service = services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (openDays.status !== "ready") return;
    const days = openDays.data;
    if (date && days[date]) return;
    const first = Object.keys(days)
      .sort()
      .find((k) => days[k] > 0);
    setDate(first ?? null);
    setSlot(null);
  }, [openDays.status, openDays.data, date]);

  function applyPasted() {
    const text = pasted.trim();
    if (!text) return;
    const phone = extractPhone(text);
    if (phone && !customerPhone) setCustomerPhone(phone);
    if (phone && !customerZalo && source === "ZALO") setCustomerZalo(phone);
    if (!note) setNote(text.slice(0, 500));
    toast.success(phone ? `Found phone ${phone} and added the message as a note` : "Added the message as a note");
  }

  function save() {
    const input = {
      source,
      customerName,
      customerPhone,
      customerZalo: source === "ZALO" ? customerZalo : "",
      note,
      status,
      serviceId: serviceId ?? "",
      barberId,
      startAt: slot?.startAt ?? "",
    };
    const parsed = manualBookingSchema.safeParse(input);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error(Object.values(next)[0] ?? "Please check the booking details");
      return;
    }
    setErrors({});
    startSave(async () => {
      const res = await createManualBooking(parsed.data);
      if (res.ok) {
        setSaved(res.booking);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.error(res.message);
      if (res.reason === "slot_taken") {
        setSlot(null);
        slots.reload();
        openDays.reload();
      }
    });
  }

  function reset() {
    setSaved(null);
    setPasted("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerZalo("");
    setNote("");
    setSlot(null);
    setStatus("CONFIRMED");
    setErrors({});
    openDays.reload();
    window.scrollTo({ top: 0 });
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="barber-stripes h-1.5" />
          <div className="p-5 sm:p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-success" />
              <div>
                <h1 className="font-heading text-2xl font-semibold">Booking saved</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  It&apos;s on the schedule and the time is no longer offered on the website.
                </p>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">{saved.customerName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">When</dt>
                <dd className="font-medium">
                  {formatDateLong(saved.startAt)}, {formatTime(saved.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Service</dt>
                <dd className="font-medium">{saved.serviceName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Barber</dt>
                <dd className="font-medium">{saved.barberName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{saved.status === "CONFIRMED" ? "Confirmed" : "Pending"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Booking ref</dt>
                <dd className="font-mono font-semibold">{saved.code}</dd>
              </div>
            </dl>

            {saved.source !== "WALK_IN" && (
              <div className="mt-6">
                <ShareMessagePanel
                  booking={saved}
                  contact={saved.customerZalo || saved.customerPhone}
                />
              </div>
            )}

            <div className="mt-8 flex flex-col gap-2 border-t pt-6 sm:flex-row">
              <Button size="xl" variant="brass" onClick={reset}>
                <Plus data-icon="inline-start" /> Add another booking
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/admin">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_300px] lg:items-start lg:pb-0">
      <div className="space-y-6">
        <Section title="Where did this booking come from?">
          <div className="grid grid-cols-3 gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                aria-pressed={source === s.value}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border bg-card px-2 py-3 text-sm font-medium transition-colors outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50",
                  source === s.value && "border-foreground ring-1 ring-foreground",
                  source === s.value && s.value === "ZALO" && "border-[#0068ff] text-[#0068ff] ring-[#0068ff]",
                )}
              >
                <s.icon className="size-5" />
                {s.label}
              </button>
            ))}
          </div>

          {source === "ZALO" && (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/30 p-4">
              <Label htmlFor="pasted" className="flex items-center gap-2">
                <ClipboardPaste className="size-4 text-muted-foreground" /> Paste the Zalo message (optional)
              </Label>
              <Textarea
                id="pasted"
                rows={3}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="e.g. Anh ơi cho em đặt lịch cắt tóc chiều thứ 5 lúc 3h nhé, sđt 0901 234 567"
                className="mt-2 bg-background"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  We&apos;ll pull out the phone number and keep the message as a note.
                </p>
                <Button type="button" variant="outline" size="lg" onClick={applyPasted} disabled={!pasted.trim()}>
                  <Sparkles /> Fill in
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Customer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="customerName" error={errors.customerName} className="sm:col-span-2">
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={source === "ZALO" ? "Name as shown on Zalo" : "Customer's name"}
                className="h-11"
                aria-invalid={!!errors.customerName}
              />
            </Field>
            {source === "ZALO" && (
              <Field
                label="Zalo name or number"
                htmlFor="customerZalo"
                error={errors.customerZalo}
                hint="A number lets you open the Zalo chat in one tap."
              >
                <Input
                  id="customerZalo"
                  value={customerZalo}
                  onChange={(e) => setCustomerZalo(e.target.value)}
                  placeholder="0901 234 567"
                  className="h-11"
                  aria-invalid={!!errors.customerZalo}
                />
              </Field>
            )}
            <Field
              label={source === "WALK_IN" ? "Phone (optional)" : "Phone"}
              htmlFor="customerPhone"
              error={errors.customerPhone}
              className={source === "ZALO" ? "" : "sm:col-span-2"}
            >
              <Input
                id="customerPhone"
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(917) 555-0123"
                className="h-11"
                aria-invalid={!!errors.customerPhone}
              />
            </Field>
          </div>
        </Section>

        <Section title="Service and barber">
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <Chip
                key={s.id}
                selected={serviceId === s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setSlot(null);
                }}
              >
                {s.name}
                <span className="text-xs opacity-70">{formatDuration(s.durationMin)}</span>
              </Chip>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip
              selected={barberChoice === ANY_BARBER}
              onClick={() => {
                setBarberChoice(ANY_BARBER);
                setSlot(null);
              }}
            >
              <Sparkles className="size-3.5" /> Whoever is free
            </Chip>
            {barbers.map((b) => (
              <Chip
                key={b.id}
                selected={barberChoice === b.id}
                onClick={() => {
                  setBarberChoice(b.id);
                  setSlot(null);
                }}
              >
                <BarberAvatar name={b.name} className="size-5 text-[0.55rem]" />
                {b.name}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Date and time" error={errors.startAt}>
          <DateTimeStep
            firstDay={firstDay}
            lastDay={lastDay}
            openDays={openDays.data}
            openDaysStatus={openDays.status}
            date={date}
            onDateChange={(key) => {
              setDate(key);
              setSlot(null);
            }}
            slots={slots.data}
            slotsStatus={slots.status}
            selectedSlot={slot}
            onSlotChange={setSlot}
            onRetry={() => {
              openDays.reload();
              slots.reload();
            }}
          />
        </Section>

        <Section title="Status and notes">
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusOption
              selected={status === "CONFIRMED"}
              onClick={() => setStatus("CONFIRMED")}
              title="Confirmed"
              body="You already agreed on this time with the customer."
            />
            <StatusOption
              selected={status === "PENDING"}
              onClick={() => setStatus("PENDING")}
              title="Pending"
              body="Hold the slot while you check. Confirm it later from the dashboard."
            />
          </div>
          <Field label="Note (optional)" htmlFor="note" error={errors.note} className="mt-4">
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the barber should know"
            />
          </Field>
        </Section>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
          <div className="barber-stripes h-1.5" />
          <div className="space-y-4 p-5 text-sm">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Summary</p>
            <SummaryRow label="Customer" value={customerName || "Not entered"} />
            <SummaryRow
              label="Service"
              value={service ? `${service.name} · ${formatPrice(service.priceCents)}` : "Not chosen"}
            />
            <SummaryRow
              label="Barber"
              value={
                barberChoice === ANY_BARBER
                  ? slot?.barberIds.length === 1
                    ? (barbers.find((b) => b.id === slot.barberIds[0])?.name ?? "Whoever is free")
                    : "Whoever is free"
                  : (barbers.find((b) => b.id === barberChoice)?.name ?? "")
              }
            />
            <SummaryRow
              label="When"
              value={slot ? `${formatDateLong(slot.startAt)}, ${formatTime(slot.startAt)}` : "Not chosen"}
            />
            <Button size="xl" variant="brass" className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Save booking
            </Button>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{customerName || "New booking"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {slot ? `${formatDateLong(slot.startAt)}, ${formatTime(slot.startAt)}` : "Pick a time"}
            </p>
          </div>
          <Button size="xl" variant="brass" onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Save booking
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-background p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
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

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-2 text-sm font-medium transition-colors outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary bg-primary text-primary-foreground hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

function StatusOption({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-xl border bg-card p-4 text-left transition-colors outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-foreground ring-1 ring-foreground",
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}
