"use client";
import { useEffect, useState } from "react";
import { csvDownload } from "@/lib/csv";
import { money } from "@/lib/data";
type Row = Record<string, any>;
export default function Customers({
  demo,
  subscribers,
}: {
  demo: boolean;
  subscribers: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [q, setQ] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!demo);
  useEffect(() => {
    if (demo) return;
    fetch("/api/admin/customers" + (subscribers ? "?subscribers=1" : ""))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.message);
        setRows(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [demo, subscribers]);
  const filtered = rows.filter((r) =>
    (r.email + " " + r.name + " " + r.phone)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <div className="admin-panel">
      <div className="editor-section-heading">
        <input
          placeholder="Пошук за email, іменем, телефоном"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="button outline"
          onClick={() =>
            csvDownload(
              subscribers ? "subscribers" : "customers",
              subscribers
                ? [
                    ["Email", "Дата"],
                    ...filtered.map((r) => [r.email, r.created_at]),
                  ]
                : [
                    [
                      "Покупець",
                      "Email",
                      "Телефон",
                      "Замовлень",
                      "Сума замовлень",
                      "Останнє замовлення",
                    ],
                    ...filtered.map((r) => [
                      r.name,
                      r.email,
                      r.phone,
                      r.orders,
                      r.total,
                      r.last,
                    ]),
                  ],
            )
          }
        >
          Експорт CSV
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Завантажуємо…</p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {(subscribers
                  ? ["Email", "Підписався"]
                  : [
                      "Покупець",
                      "Контакти",
                      "Замовлень",
                      "Сума",
                      "Остання покупка",
                    ]
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email}>
                  {subscribers ? (
                    <>
                      <td>{r.email}</td>
                      <td>
                        {new Date(r.created_at).toLocaleDateString("uk-UA")}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.name}</td>
                      <td>
                        <a href={"mailto:" + r.email}>{r.email}</a>
                        <small>{r.phone}</small>
                      </td>
                      <td>{r.orders}</td>
                      <td>{money(r.total)}</td>
                      <td>{new Date(r.last).toLocaleDateString("uk-UA")}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="editor-empty">
              {subscribers
                ? "Підписників поки немає."
                : "Клієнти з’являться після перших замовлень."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
