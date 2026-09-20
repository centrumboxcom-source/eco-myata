"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/data";
type Stats = {
  revenue: number;
  orders: number;
  average: number;
  stock_count: number;
  days: { day: string; revenue: number; orders: number }[];
};
export default function AdminDashboard({
  demo,
  period,
}: {
  demo: boolean;
  period: string;
}) {
  const [stats, setStats] = useState<Stats | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (demo) {
      setStats({ revenue: 0, orders: 0, average: 0, stock_count: 8, days: [] });
      return;
    }
    const abort = new AbortController();
    setError("");
    setStats(null);
    fetch("/api/admin/dashboard?days=" + period, { signal: abort.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        setStats(d);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [demo, period]);
  if (error) return <p className="error-message">{error}</p>;
  if (!stats) return <p>Рахуємо показники…</p>;
  const max = Math.max(1, ...stats.days.map((d) => d.revenue));
  return (
    <>
      <div className="admin-stats">
        {[
          ["Дохід", money(stats.revenue)],
          ["Замовлення", stats.orders],
          ["Середній чек", money(stats.average)],
          ["Товари в наявності", stats.stock_count],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>
              {demo
                ? "Демонстраційний перегляд"
                : label === "Товари в наявності"
                  ? "Поточний залишок"
                  : "За весь обраний період · Київ"}
            </small>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Продажі за період</h2>
          <span>Оплачені або виконані, без повернених і скасованих</span>
        </div>
        <div
          className="chart"
          role="img"
          aria-label={"Дохід " + money(stats.revenue)}
        >
          {stats.days.map((d) => (
            <div
              className="chart-column"
              key={d.day}
              title={d.day + ": " + money(d.revenue)}
            >
              <div
                style={{ height: Math.max(1, (d.revenue / max) * 100) + "%" }}
              />
              <span>
                {d.day.slice(8)}.{d.day.slice(5, 7)}
              </span>
            </div>
          ))}
        </div>
        {!stats.orders && (
          <p className="admin-empty">
            Тут з’являться дані після перших замовлень.
          </p>
        )}
      </section>
    </>
  );
}
