"use client";
import { useEffect, useState } from "react";
type Report = {
  checks: { name: string; ok: boolean; detail: string }[];
  products: { id: string; name: string; issues: string[] }[];
  feedCount: number;
};
export default function Readiness({ demo }: { demo: boolean }) {
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/readiness");
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      setReport(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!demo) void refresh();
  }, [demo]);
  return (
    <div className="admin-panel">
      <div className="admin-panel-heading">
        <h2>Готовність до запуску</h2>
        <button
          className="button outline"
          disabled={busy || demo}
          onClick={refresh}
        >
          Перевірити знову
        </button>
      </div>
      {demo ? (
        <p className="notice">
          Спочатку підключіть Supabase та виконайте міграції 001 і 002 за
          інструкцією START-HERE.md. У демонстраційному режимі дані не
          зберігаються.
        </p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : !report ? (
        <p>Перевіряємо…</p>
      ) : (
        <>
          <div className="readiness-list">
            {report.checks.map((c) => (
              <div
                className={"readiness-item " + (c.ok ? "pass" : "fail")}
                key={c.name}
              >
                <strong>
                  {c.ok ? "✓" : "○"} {c.name}
                </strong>
                <p>{c.detail}</p>
              </div>
            ))}
          </div>
          <h3>Товари для Google: {report.feedCount}</h3>
          {report.products.map((p) => (
            <p className="notice" key={p.id}>
              {p.name}: {p.issues.join(", ")}
            </p>
          ))}
          <p className="notice">
            Ця перевірка контролює конфігурацію сайту. Доступність домену для
            Google, фактичні фото, правдивість даних, тест банку й схвалення
            Merchant Center перевіряються окремо.
          </p>
        </>
      )}
    </div>
  );
}
