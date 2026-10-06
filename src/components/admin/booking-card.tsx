"use client";

import { Check, Clock, Loader2, Mail, MessageCircle, MessageSquare, Phone, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelBookingAsBarber, confirmBooking, declineBooking } from "@/app/admin/actions";
import { BarberAvatar } from "@/components/barber-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { zaloChatUrl } from "@/lib/share-message";
import { formatDuration, formatInShop, formatPrice, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ShareMessagePanel } from "./share-message-panel";

export type AdminBooking = {
  id: string;
  code: string;
  status: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  source: string;
  customerName: string;
  customerPhone: string | null;
  customerZalo: string | null;
  customerEmail: string | null;
  note: string | null;
  barberName: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
};

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-warning/25 text-[oklch(0.42_0.1_65)]" },
  CONFIRMED: { label: "Confirmed", className: "bg-success/15 text-[oklch(0.4_0.1_155)]" },
  DECLINED: { label: "Declined", className: "bg-destructive/10 text-destructive" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

const sourceBadge: Record<string, { label: string; className: string } | undefined> = {
  ZALO: { label: "Zalo", className: "bg-[#0068ff]/10 text-[#0068ff]" },
  PHONE: { label: "Phone", className: "bg-secondary text-secondary-foreground" },
  WALK_IN: { label: "Walk-in", className: "bg-secondary text-secondary-foreground" },
};

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export function BookingCard({ booking, showDate = true }: { booking: AdminBooking; showDate?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [action, setAction] = useState<"confirm" | "decline" | "cancel" | null>(null);
  const [dialog, setDialog] = useState<"decline" | "cancel" | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const source = sourceBadge[booking.source];
  const zaloUrl = zaloChatUrl(booking.customerZalo ?? (booking.source === "ZALO" ? booking.customerPhone : null));
  const canMessage = booking.source !== "WALK_IN" || !!booking.customerPhone;
  const [note, setNote] = useState("");
  const badge = statusBadge[booking.status] ?? statusBadge.PENDING;

  function run(kind: "confirm" | "decline" | "cancel") {
    setAction(kind);
    start(async () => {
      const res =
        kind === "confirm"
          ? await confirmBooking(booking.id)
          : kind === "decline"
            ? await declineBooking(booking.id, note)
            : await cancelBookingAsBarber(booking.id, note);
      if (res.ok) {
        toast.success(
          kind === "confirm"
            ? `Confirmed ${booking.customerName} for ${formatTime(booking.startAt)}`
            : kind === "decline"
              ? "Request declined. The slot is open again."
              : "Appointment cancelled. The slot is open again.",
        );
        setDialog(null);
        setNote("");
        router.refresh();
      } else {
        toast.error(res.message ?? "Something went wrong");
      }
      setAction(null);
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-shadow sm:p-5",
        booking.status === "PENDING" && "border-warning/50 shadow-sm",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-baseline gap-2 sm:w-28 sm:flex-col sm:gap-0">
          {showDate && (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {formatInShop(booking.startAt, "EEE, MMM d")}
            </p>
          )}
          <p className="font-heading text-xl font-semibold tabular-nums">{formatTime(booking.startAt)}</p>
          <p className="text-xs text-muted-foreground">to {formatTime(booking.endAt)}</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{booking.customerName}</p>
            <Badge className={badge.className}>{badge.label}</Badge>
            {source && <Badge className={source.className}>via {source.label}</Badge>}
            <span className="font-mono text-xs text-muted-foreground">#{booking.code}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{booking.serviceName}</span>
            <span aria-hidden>&middot;</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {formatDuration(booking.durationMin)}
            </span>
            <span aria-hidden>&middot;</span>
            <span>{formatPrice(booking.priceCents)}</span>
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <BarberAvatar name={booking.barberName} className="size-6 text-[0.6rem]" />
            <span>{booking.barberName}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {booking.customerPhone && (
              <a href={`tel:${booking.customerPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                <Phone className="size-3.5 text-muted-foreground" /> {booking.customerPhone}
              </a>
            )}
            {booking.customerZalo &&
              (zaloUrl ? (
                <a href={zaloUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#0068ff] hover:underline">
                  <MessageCircle className="size-3.5" /> Zalo: {booking.customerZalo}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-3.5 text-[#0068ff]" /> Zalo: {booking.customerZalo}
                </span>
              ))}
            {booking.customerEmail && (
              <a href={`mailto:${booking.customerEmail}`} className="inline-flex items-center gap-1.5 break-all hover:underline">
                <Mail className="size-3.5 text-muted-foreground" /> {booking.customerEmail}
              </a>
            )}
          </div>
          {booking.note && (
            <p className="mt-3 flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="break-words">{booking.note}</span>
            </p>
          )}
          {booking.status === "PENDING" && (
            <p className="mt-2 text-xs text-muted-foreground">Requested {timeAgo(booking.createdAt)}</p>
          )}
        </div>

        {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
          <div className="flex gap-2 sm:flex-col">
            {booking.status === "PENDING" ? (
              <>
                <Button size="lg" className="flex-1 px-4 sm:flex-none" disabled={pending} onClick={() => run("confirm")}>
                  {pending && action === "confirm" ? <Loader2 className="animate-spin" /> : <Check />}
                  Confirm
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 px-4 sm:flex-none"
                  disabled={pending}
                  onClick={() => setDialog("decline")}
                >
                  <X /> Decline
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                variant="ghost"
                className="flex-1 px-4 text-muted-foreground sm:flex-none"
                disabled={pending}
                onClick={() => setDialog("cancel")}
              >
                Cancel
              </Button>
            )}
            {canMessage && (
              <Button
                size="lg"
                variant="ghost"
                className="flex-1 px-4 sm:flex-none"
                onClick={() => setShareOpen(true)}
              >
                <Send /> Message
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send booking details</DialogTitle>
            <DialogDescription>
              Copy this into your Zalo chat with {booking.customerName}. The link lets them check or
              cancel the booking.
            </DialogDescription>
          </DialogHeader>
          <ShareMessagePanel
            booking={{
              code: booking.code,
              status: booking.status,
              customerName: booking.customerName,
              serviceName: booking.serviceName,
              durationMin: booking.durationMin,
              barberName: booking.barberName,
              startAt: booking.startAt,
            }}
            contact={booking.customerZalo || booking.customerPhone}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "decline" ? "Decline this request?" : "Cancel this appointment?"}
            </DialogTitle>
            <DialogDescription>
              {booking.customerName} &middot; {formatInShop(booking.startAt, "EEE, MMM d")} at{" "}
              {formatTime(booking.startAt)}. The time will open up for other customers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`note-${booking.id}`}>Message to the customer (optional)</Label>
            <Textarea
              id={`note-${booking.id}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Running a training session that afternoon. Could you do 4 PM instead?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => dialog && run(dialog)}
            >
              {pending && <Loader2 className="animate-spin" />}
              {dialog === "decline" ? "Decline request" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
