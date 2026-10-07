"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface SlotEvent {
  date: string;
  start: string;
  action: "booked" | "released";
}

/**
 * Subscribes to the private realtime topic `slots` (Broadcast from Database,
 * no personal data in the payload). Calls `onEvent` for every change and
 * `onResync` when it should refetch: on (re)subscription, when the tab becomes
 * visible again and when the window regains focus (safety nets for missed
 * messages while offline or asleep). `enabled: false` (the demo board) opens
 * no connection at all.
 */
export function useRealtimeSlots(onEvent: (e: SlotEvent) => void, onResync: () => void, enabled = true) {
  const eventRef = useRef(onEvent);
  const resyncRef = useRef(onResync);

  useEffect(() => {
    eventRef.current = onEvent;
    resyncRef.current = onResync;
  });

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel("slots", { config: { private: true } })
        .on("broadcast", { event: "slot" }, (message) => {
          const p = message.payload as Partial<SlotEvent> | undefined;
          if (p?.date && p.start && (p.action === "booked" || p.action === "released")) {
            eventRef.current({ date: p.date, start: p.start, action: p.action });
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") resyncRef.current();
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") resyncRef.current();
    };
    const onFocus = () => resyncRef.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
