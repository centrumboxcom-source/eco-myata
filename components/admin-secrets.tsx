"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Save,
  RefreshCw,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  integrationDefinitions,
  type IntegrationId,
} from "@/lib/integration-definitions";
type Status = {
  id: IntegrationId;
  stored: boolean;
  environment: boolean;
  ready: boolean;
  readable: boolean;
  version: string | null;
  updated_at: string | null;
};
export default function AdminSecrets({ demo }: { demo: boolean }) {
  const [items, setItems] = useState<Status[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [encryptionReady, setEncryptionReady] = useState(false),
    [loading, setLoading] = useState(!demo),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(""),
    [values, setValues] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    try {
      const r = await fetch("/api/admin/secrets", { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw Error(d.message);
      setItems(d.items);
      setAudit(d.audit);
      setEncryptionReady(d.encryptionReady);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [demo]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(id: IntegrationId, remove = false) {
    const row = items.find((i) => i.id === id);
    if (
      remove &&
      !window.confirm(
        "Видалити збережений ключ? Якщо ключ також заданий на хостингу, магазин використає його. Для вимкнення сервісу вимкніть спосіб оплати або сповіщення.",
      )
    )
      return;
    setBusy(id);
    setMessage("");
    setError("");
    try {
      const r = await fetch("/api/admin/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          value: remove ? undefined : values[id],
          remove,
          version: row?.version || null,
        }),
      });
      const d = await r.json();
      setValues((v) => ({ ...v, [id]: "" }));
      if (!r.ok) throw Error(d.message);
      setMessage(
        remove
          ? "Збережений у БД ключ видалено."
          : "Ключ зашифровано й збережено. Він застосовується в нових запитах магазину.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
      setValues((v) => ({ ...v, [id]: "" }));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="commerce-workspace">
      <header className="commerce-heading">
        <div>
          <span className="eyebrow">ПІДКЛЮЧЕННЯ СЕРВІСІВ</span>
          <h2>Ключі та інтеграції</h2>
          <p>
            Безпечне введення та заміна токенів доставки, оплат і сповіщень.
          </p>
        </div>
        <ShieldCheck size={32} />
      </header>
      <div className="secret-setup">
        <Lock size={20} />
        <div>
          <strong>
            {demo
              ? "Спочатку підключіть базу"
              : encryptionReady
                ? "Шифрування налаштоване"
                : "Потрібен серверний ключ шифрування"}
          </strong>
          <p>
            {demo
              ? "На хостингу задайте адресу Supabase, публічний anon ключ та серверний service_role. Створіть адміністратора за інструкцією запуску. Не вводьте справжні токени в демонстрацію."
              : encryptionReady
                ? "Збережені значення не повертаються в браузер. Для заміни введіть новий токен."
                : "Виконайте міграцію 006 та задайте INTEGRATIONS_ENCRYPTION_KEY на хостингу: 32 випадкові байти у Base64. Він має зберігатися окремо від бази даних."}
          </p>
        </div>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="secret-grid">
        {integrationDefinitions.map((d) => {
          const row = items.find((i) => i.id === d.id);
          return (
            <form
              key={d.id}
              className="secret-card"
              onSubmit={(e) => {
                e.preventDefault();
                void save(d.id);
              }}
            >
              <header>
                <div className="secret-icon">
                  <KeyRound size={21} />
                </div>
                <div>
                  <small>{d.group}</small>
                  <h3>{d.name}</h3>
                </div>
                <span
                  className={
                    row?.ready ? "connection-ready" : "connection-missing"
                  }
                >
                  {row?.ready ? (
                    <>
                      <CheckCircle2 size={13} />
                      Ключ доступний
                    </>
                  ) : (
                    <>
                      <AlertCircle size={13} />
                      {row?.stored ? "Потрібна перевірка" : "Не підключено"}
                    </>
                  )}
                </span>
              </header>
              <p>{d.description}</p>
              <label className="field">
                {row?.stored ? "Новий ключ для заміни" : d.label}
                <input
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={values[d.id] || ""}
                  placeholder={
                    row?.stored
                      ? "Збережене значення приховано"
                      : "Вставте ключ сервісу"
                  }
                  disabled={demo || !encryptionReady || !!busy || loading}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [d.id]: e.target.value }))
                  }
                  maxLength={4096}
                  minLength={8}
                  required
                />
              </label>
              <small>
                {row?.stored
                  ? "Джерело: зашифроване сховище"
                  : row?.environment
                    ? "Джерело: налаштування хостингу"
                    : "Ключ ще не збережено"}
                {row?.updated_at
                  ? " · " + new Date(row.updated_at).toLocaleString("uk-UA")
                  : ""}
              </small>
              {row?.stored && !row.readable && (
                <p className="error-message">
                  Не вдалося розшифрувати ключ. Відновіть серверний ключ
                  шифрування або замініть токен.
                </p>
              )}
              <footer>
                <button
                  className="button"
                  disabled={
                    demo ||
                    !encryptionReady ||
                    !!busy ||
                    loading ||
                    !values[d.id]
                  }
                >
                  <Save size={15} />
                  {busy === d.id
                    ? "Збереження…"
                    : row?.stored
                      ? "Замінити ключ"
                      : "Зберегти ключ"}
                </button>
                {row?.stored && (
                  <button
                    type="button"
                    className="button outline"
                    disabled={!!busy}
                    onClick={() => void save(d.id, true)}
                  >
                    <Trash2 size={15} />
                    Видалити
                  </button>
                )}
              </footer>
            </form>
          );
        })}
      </div>
      <section className="notification-log">
        <header>
          <div>
            <h3>Історія змін ключів</h3>
            <p>
              Журнал містить назву інтеграції та дію, без значень токенів.
              Наявність ключа ще не підтверджує його чинність у сервісі.
            </p>
          </div>
          <button
            className="button outline"
            onClick={() => void load()}
            disabled={demo || loading || !!busy}
          >
            <RefreshCw size={15} />
            Оновити
          </button>
        </header>
        {audit.length ? (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Сервіс</th>
                  <th>Дія</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {
                        integrationDefinitions.find(
                          (d) => d.id === a.integration_id,
                        )?.name
                      }
                    </td>
                    <td>
                      {
                        {
                          created: "Додано",
                          replaced: "Замінено",
                          deleted: "Видалено",
                        }[a.action as string]
                      }
                    </td>
                    <td>{new Date(a.created_at).toLocaleString("uk-UA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="notification-empty">
            <ShieldCheck size={28} />
            <p>Змін ключів ще немає</p>
          </div>
        )}
      </section>
    </div>
  );
}
