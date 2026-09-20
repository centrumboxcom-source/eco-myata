"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/data";
import AnalyticsEvent from "./analytics-event";
import type { Purchase } from "@/lib/analytics";
export default function PaymentResult() {
  const [order, setOrder] = useState<Purchase | null>(null),
    [message, setMessage] = useState("Перевіряємо підтвердження банку…"),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let stopped = false,
      tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const token = JSON.parse(
          sessionStorage.getItem("eko-last-order") || "null",
        );
        if (!token) {
          setMessage(
            "Перевірте статус замовлення у своєму кабінеті або зверніться до магазину.",
          );
          return;
        }
        const r = await fetch("/api/order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(token),
        });
        const o = await r.json();
        if (!r.ok) throw new Error(o.message);
        if (stopped) return;
        setOrder(o);
        setMessage(
          o.payment_status === "paid"
            ? "Оплату підтверджено. Дякуємо!"
            : o.payment_status === "failed"
              ? "Банк не підтвердив оплату. Ви можете спробувати знову."
              : o.payment_status === "refunded"
                ? "Повернення оплати зафіксовано."
                : "Підтвердження банку ще очікується.",
        );
        if (o.payment_status === "pending" && tries++ < 12)
          timer = setTimeout(check, 5000);
      } catch (e) {
        if (!stopped) setMessage((e as Error).message);
      }
    }
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [tick]);
  return (
    <div className="empty-state">
      <h1>Статус оплати</h1>
      <p role="status">{message}</p>
      {order && (
        <>
          <strong>
            № {order.id.slice(0, 8).toUpperCase()} · {money(order.total)}
          </strong>
          <AnalyticsEvent order={order} />
        </>
      )}
      <button className="button outline" onClick={() => setTick((t) => t + 1)}>
        Оновити статус
      </button>
      <Link href="/checkout" className="button">
        Повернутися до замовлення
      </Link>
      <Link href="/account">Мій кабінет</Link>
    </div>
  );
}
