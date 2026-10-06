"use client";

import { useCallback, useEffect, useState } from "react";
import type { SlotOption } from "./types";

type State<T> =
  | { status: "idle"; data: null }
  | { status: "loading"; data: T | null }
  | { status: "ready"; data: T }
  | { status: "error"; data: null };

function useJson<T>(url: string | null, pick: (json: unknown) => T) {
  const [state, setState] = useState<State<T>>({ status: "idle", data: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ status: "idle", data: null });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ status: "loading", data: prev.data }));
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        setState({ status: "ready", data: pick(await res.json()) });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error(err);
        setState({ status: "error", data: null });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

function qs(params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  return sp.toString();
}

export function useOpenDays(serviceId: string | null, barberId: string | null, staff = false) {
  const base = staff ? "/api/admin/availability" : "/api/availability";
  const url = serviceId ? `${base}/days?${qs({ serviceId, barberId })}` : null;
  return useJson(url, (json) => (json as { days: Record<string, number> }).days);
}

export function useSlots(
  serviceId: string | null,
  barberId: string | null,
  date: string | null,
  staff = false,
) {
  const base = staff ? "/api/admin/availability" : "/api/availability";
  const url = serviceId && date ? `${base}?${qs({ serviceId, barberId, date })}` : null;
  return useJson(url, (json) => (json as { slots: SlotOption[] }).slots);
}
