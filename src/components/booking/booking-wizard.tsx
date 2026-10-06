"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBooking } from "@/app/book/actions";
import { BarberAvatar } from "@/components/barber-avatar";
import { Button } from "@/components/ui/button";
import { formatDateLong, formatDuration, formatInShop, formatPrice, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { customerDetailsSchema, type CustomerDetails } from "@/lib/validation";
import { BarberStep, DateTimeStep, DetailsStep, ReviewStep, ServiceStep } from "./steps";
import { ANY_BARBER, type BarberOption, type ServiceOption, type SlotOption } from "./types";
import { useOpenDays, useSlots } from "./use-availability";

const STEPS = [
  { key: "service", label: "Service", title: "What are we doing today?" },
  { key: "barber", label: "Barber", title: "Who would you like?" },
  { key: "time", label: "Date & time", title: "Pick a time that works" },
  { key: "details", label: "Your details", title: "How can we reach you?" },
  { key: "review", label: "Review", title: "Review and send your request" },
] as const;

const STORAGE_KEY = "bb_customer";

export function BookingWizard({
  services,
  barbers,
  initialServiceSlug,
  initialBarberSlug,
  firstDay,
  lastDay,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  initialServiceSlug?: string;
  initialBarberSlug?: string;
  firstDay: string;
  lastDay: string;
}) {
  const router = useRouter();
  const initialService = services.find((s) => s.slug === initialServiceSlug)?.id ?? null;
  const initialBarber = barbers.find((b) => b.slug === initialBarberSlug)?.id ?? null;

  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [barberChoice, setBarberChoice] = useState<string | null>(initialBarber);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotOption | null>(null);
  const [step, setStep] = useState(() => (initialService ? (initialBarber ? 2 : 1) : 0));
  const [submitting, startSubmit] = useTransition();

  const form = useForm<CustomerDetails>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { customerName: "", customerPhone: "", customerEmail: "", note: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.customerName) form.setValue("customerName", saved.customerName);
      if (saved?.customerPhone) form.setValue("customerPhone", saved.customerPhone);
      if (saved?.customerEmail) form.setValue("customerEmail", saved.customerEmail);
    } catch {}
  }, [form]);

  const barberId = barberChoice && barberChoice !== ANY_BARBER ? barberChoice : null;
  const openDays = useOpenDays(step >= 2 ? serviceId : null, barberId);
  const slots = useSlots(step >= 2 ? serviceId : null, barberId, date);

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

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barberLabel = useMemo(() => {
    if (!barberChoice) return null;
    if (barberChoice === ANY_BARBER) {
      if (slot?.barberIds.length === 1) {
        return barbers.find((b) => b.id === slot.barberIds[0])?.name ?? "Any barber";
      }
      return "Any barber";
    }
    return barbers.find((b) => b.id === barberChoice)?.name ?? null;
  }, [barberChoice, barbers, slot]);

  const canContinue = [!!serviceId, !!barberChoice, !!slot, true, true][step];

  function goTo(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleNext() {
    if (step === 3) {
      const ok = await form.trigger();
      if (!ok) return;
    }
    if (step < STEPS.length - 1) goTo(step + 1);
    else submit();
  }

  function submit() {
    if (!service || !slot) return;
    const details = form.getValues();
    startSubmit(async () => {
      const result = await createBooking({
        ...details,
        serviceId: service.id,
        barberId,
        startAt: slot.startAt,
      });
      if (result.ok) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              customerName: details.customerName,
              customerPhone: details.customerPhone,
              customerEmail: details.customerEmail,
            }),
          );
        } catch {}
        router.push(`/booking/${result.code}?new=1`);
        return;
      }
      toast.error(result.message);
      if (result.reason === "slot_taken") {
        setSlot(null);
        slots.reload();
        openDays.reload();
        goTo(2);
      }
    });
  }

  const current = STEPS[step];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-36 sm:px-6 sm:pt-10 lg:pb-16">
      <Progress step={step} onJump={(i) => i < step && goTo(i)} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="rounded-2xl border bg-background p-4 shadow-sm sm:p-6 md:p-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {current.title}
          </h1>
          <div className="mt-6">
            {current.key === "service" && (
              <ServiceStep
                services={services}
                value={serviceId}
                onChange={(id) => {
                  setServiceId(id);
                  setSlot(null);
                  goTo(barberChoice ? 2 : 1);
                }}
              />
            )}
            {current.key === "barber" && (
              <BarberStep
                barbers={barbers}
                value={barberChoice}
                onChange={(id) => {
                  setBarberChoice(id);
                  setSlot(null);
                  goTo(2);
                }}
              />
            )}
            {current.key === "time" && (
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
            )}
            {current.key === "details" && <DetailsStep form={form} />}
            {current.key === "review" && service && slot && barberLabel && (
              <ReviewStep
                service={service}
                barberLabel={barberLabel}
                slot={slot}
                details={form.getValues()}
              />
            )}
          </div>

          <div className="mt-8 hidden items-center justify-between border-t pt-6 lg:flex">
            <Button variant="ghost" size="xl" onClick={() => goTo(step - 1)} disabled={step === 0 || submitting}>
              <ArrowLeft data-icon="inline-start" /> Back
            </Button>
            <NextButton step={step} disabled={!canContinue || submitting} submitting={submitting} onClick={handleNext} />
          </div>
        </section>

        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <Summary service={service} barberLabel={barberLabel} barberChoice={barberChoice} slot={slot} />
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {service ? (
              <>
                <p className="truncate font-medium">
                  {service.name}
                  {slot ? ` · ${formatInShop(slot.startAt, "EEE MMM d")}, ${formatTime(slot.startAt)}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatPrice(service.priceCents)} · {formatDuration(service.durationMin)}
                  {barberLabel ? ` · ${barberLabel}` : ""}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Choose a service to start</p>
            )}
          </div>
          {step > 0 && (
            <Button
              variant="outline"
              size="icon-lg"
              className="size-11 rounded-xl"
              onClick={() => goTo(step - 1)}
              disabled={submitting}
              aria-label="Back"
            >
              <ArrowLeft />
            </Button>
          )}
          <NextButton step={step} disabled={!canContinue || submitting} submitting={submitting} onClick={handleNext} />
        </div>
      </div>
    </div>
  );
}

function NextButton({
  step,
  disabled,
  submitting,
  onClick,
}: {
  step: number;
  disabled: boolean;
  submitting: boolean;
  onClick: () => void;
}) {
  const isLast = step === STEPS.length - 1;
  return (
    <Button variant={isLast ? "brass" : "default"} size="xl" onClick={onClick} disabled={disabled}>
      {submitting ? (
        <>
          <Loader2 className="animate-spin" data-icon="inline-start" /> Sending
        </>
      ) : isLast ? (
        "Request booking"
      ) : (
        <>
          Continue <ArrowRight data-icon="inline-end" />
        </>
      )}
    </Button>
  );
}

function Progress({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm sm:hidden">
        <span className="font-medium">{STEPS[step].label}</span>
        <span className="text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted sm:hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={i >= step}
              className={cn(
                "flex items-center gap-2 text-sm whitespace-nowrap",
                i < step && "cursor-pointer hover:underline",
                i > step && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full border text-xs font-semibold",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary text-foreground ring-3 ring-ring/30",
                )}
              >
                {i + 1}
              </span>
              <span className={cn(i === step && "font-medium")}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Summary({
  service,
  barberLabel,
  barberChoice,
  slot,
}: {
  service: ServiceOption | null;
  barberLabel: string | null;
  barberChoice: string | null;
  slot: SlotOption | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="barber-stripes h-1.5" />
      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Your appointment
        </p>
        {!service ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Pick a service to see your summary here.
          </p>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-heading text-lg font-semibold">{service.name}</p>
              <p className="text-muted-foreground">{formatDuration(service.durationMin)}</p>
            </div>
            <div className="flex items-center gap-3">
              {barberLabel && barberChoice !== ANY_BARBER ? (
                <BarberAvatar name={barberLabel} className="size-9 text-xs" />
              ) : null}
              <div>
                <p className="text-muted-foreground">Barber</p>
                <p className="font-medium">{barberLabel ?? "Not chosen yet"}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">When</p>
              <p className="font-medium">
                {slot ? `${formatDateLong(slot.startAt)}, ${formatTime(slot.startAt)}` : "Not chosen yet"}
              </p>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-muted-foreground">Pay in shop</span>
              <span className="font-heading text-xl font-semibold">{formatPrice(service.priceCents)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
