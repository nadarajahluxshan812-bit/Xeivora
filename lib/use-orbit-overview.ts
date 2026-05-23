"use client";

import { startTransition, useEffect, useState } from "react";

import type { OrbitOverview } from "@/lib/types";

export function useOrbitOverview() {
  const [overview, setOverview] = useState<OrbitOverview | null>(null);
  const [connectionState, setConnectionState] = useState("Connecting");

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let cancelled = false;

    const applySnapshot = (nextSnapshot: OrbitOverview) => {
      startTransition(() => {
        setOverview(nextSnapshot);
      });
    };

    async function loadOverview() {
      const response = await fetch("/api/orbit/overview", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to fetch Xeivora overview.");
      }

      const snapshot = (await response.json()) as OrbitOverview;

      if (!cancelled) {
        applySnapshot(snapshot);
      }
    }

    loadOverview()
      .then(() => {
        if (!cancelled) {
          setConnectionState("Streaming");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionState("Retrying");
        }
      });

    eventSource = new EventSource("/api/orbit/stream");
    eventSource.onopen = () => setConnectionState("Streaming");
    eventSource.onmessage = (event) => {
      const snapshot = JSON.parse(event.data) as OrbitOverview;
      applySnapshot(snapshot);
    };
    eventSource.onerror = () => {
      setConnectionState("Reconnecting");
    };

    return () => {
      cancelled = true;
      eventSource?.close();
    };
  }, []);

  return {
    overview,
    connectionState
  };
}
