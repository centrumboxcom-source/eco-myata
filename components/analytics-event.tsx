"use client";
import { useEffect, useRef } from "react";
import { track, purchase, type Purchase } from "@/lib/analytics";
export default function AnalyticsEvent({
  name,
  data,
  order,
}: {
  name?: string;
  data?: Record<string, unknown>;
  order?: Purchase;
}) {
  const done = useRef(false);
  const key = JSON.stringify(data);
  useEffect(() => {
    const send = () => {
      if (order) {
        purchase(order);
        return;
      }
      if (!done.current && name)
        done.current = track(name, JSON.parse(key || "{}"));
    };
    send();
    window.addEventListener("eko:analytics-ready", send);
    return () => window.removeEventListener("eko:analytics-ready", send);
  }, [name, key, order]);
  return null;
}
