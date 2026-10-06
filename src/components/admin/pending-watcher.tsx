"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Toasts and updates the tab title when new booking requests arrive between refreshes. */
export function PendingWatcher({ count }: { count: number }) {
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (previous.current !== null && count > previous.current) {
      const diff = count - previous.current;
      toast.info(diff === 1 ? "New booking request" : `${diff} new booking requests`, {
        description: "Check the Requests tab to confirm.",
      });
    }
    previous.current = count;
    const base = "Dashboard | Brass & Blade";
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count]);

  return null;
}
