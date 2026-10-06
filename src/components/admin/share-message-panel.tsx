"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  bookingUrl,
  buildBookingMessage,
  type MessageLang,
  type ShareableBooking,
  zaloChatUrl,
} from "@/lib/share-message";
import { cn } from "@/lib/utils";

const LANG_KEY = "bb_msg_lang";

export function ShareMessagePanel({
  booking,
  contact,
}: {
  booking: ShareableBooking;
  /** Zalo name/number or phone used to build the "Open Zalo" link */
  contact: string | null;
}) {
  const [lang, setLang] = useState<MessageLang>("vi");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "vi") setLang(saved);
  }, []);

  const url = bookingUrl(origin, booking.code);
  const message = useMemo(() => buildBookingMessage(booking, lang, url), [booking, lang, url]);
  const zaloUrl = zaloChatUrl(contact);

  function chooseLang(next: MessageLang) {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      textRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    toast.success("Message copied. Paste it into the Zalo chat.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Message for the customer</p>
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs" role="group" aria-label="Message language">
          {(
            [
              ["vi", "Tiếng Việt"],
              ["en", "English"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => chooseLang(value)}
              aria-pressed={lang === value}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                lang === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={textRef}
        readOnly
        value={message}
        rows={10}
        className="w-full resize-none rounded-lg border bg-muted/40 p-3 font-mono text-[0.8rem] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <Button size="xl" onClick={copy} className="sm:col-span-1">
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy message"}
        </Button>
        {zaloUrl ? (
          <Button asChild size="xl" className="bg-[#0068ff] text-white hover:bg-[#0068ff]/90">
            <a href={zaloUrl} target="_blank" rel="noreferrer">
              <MessageCircle data-icon="inline-start" /> Open Zalo chat
            </a>
          </Button>
        ) : (
          <Button size="xl" variant="outline" disabled title="Add a Zalo phone number to open the chat directly">
            <MessageCircle data-icon="inline-start" /> Open Zalo chat
          </Button>
        )}
        <Button asChild size="xl" variant="outline">
          <a href={url || `/booking/${booking.code}`} target="_blank" rel="noreferrer">
            <ExternalLink data-icon="inline-start" /> Booking page
          </a>
        </Button>
      </div>
    </div>
  );
}
