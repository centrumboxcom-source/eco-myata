"use client";
import { useCallback, useEffect, useState } from "react";
import { Mail, Send, RefreshCw, Check } from "lucide-react";
import { defaultNotifications } from "@/lib/notification-settings";
import { settingsSchema, type Settings } from "@/lib/store-settings";
export default function AdminNotifications({
  value,
  onChange,
  onSave,
  busy,
  demo,
}: {
  value: Settings;
  onChange: (s: Settings) => void;
  onSave: () => Promise<unknown>;
  busy: boolean;
  demo: boolean;
}) {
  const n = { ...defaultNotifications, ...value.notifications };
  const [jobs, setJobs] = useState<any[]>([]),
    [keys, setKeys] = useState({ telegram: false, email: false }),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [message, setMessage] = useState("");
  const set = (key: string, v: unknown) =>
    onChange({ ...value, notifications: { ...n, [key]: v } });
  const reload = useCallback(async () => {
    if (demo) return;
    try {
      const r = await fetch("/api/admin/notifications");
      const d = await r.json();
      if (!r.ok) throw Error(d.message);
      setJobs(d.jobs);
      setKeys(d.configured);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [demo]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function process(id?: string, uncertain = false) {
    if (
      uncertain &&
      !window.confirm(
        "Сервіс не підтвердив попередню спробу. Перевірте отримувача: повтор може створити дублікат. Надіслати ще раз?",
      )
    )
      return;
    setWorking(true);
    try {
      const r = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, confirm_uncertain: uncertain }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.message);
      setMessage(
        "Оброблено: " +
          d.processed +
          ". Підтверджено сервісом: " +
          d.sent +
          ".",
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="commerce-workspace">
      <div className="commerce-heading">
        <div>
          <span className="eyebrow">КОМУНІКАЦІЇ</span>
          <h2>Сповіщення та листи</h2>
          <p>Підтвердження замовлень і журнал кожної відправки.</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const p = settingsSchema.safeParse(value);
          if (!p.success) {
            setError(p.error.issues.map((i) => i.message).join(". "));
            return;
          }
          if (await onSave())
            setMessage(
              demo
                ? "Зміни лише в демоперегляді."
                : "Налаштування збережено. Застосуються до нових замовлень.",
            );
        }}
      >
        <fieldset disabled={busy} className="commerce-body">
          <section className="preference-section">
            <header className="notification-heading">
              <h3>
                <Send size={20} />
                Telegram адміністратора
              </h3>
              <span
                className={
                  keys.telegram ? "connection-ready" : "connection-missing"
                }
              >
                {keys.telegram ? "Ключ підключено" : "Ключ не підключено"}
              </span>
            </header>
            <label className="preference-row">
              <span>
                <strong>Повідомляти про нові замовлення</strong>
                <small>
                  Номер, сума та спосіб оплати. Контакти покупця залишаються в
                  адмінці.
                </small>
              </span>
              <input
                type="checkbox"
                checked={n.telegram_enabled}
                onChange={(e) => set("telegram_enabled", e.target.checked)}
              />
            </label>
            <label className="field">
              Chat ID
              <input
                value={n.telegram_chat_id}
                placeholder="-1001234567890"
                onChange={(e) => set("telegram_chat_id", e.target.value.trim())}
              />
            </label>
            <p className="field-help">
              Створіть свого бота через @BotFather, додайте його в потрібний
              чат. Токен зберігається на сервері як TELEGRAM_BOT_TOKEN. Не
              вставляйте його в Chat ID.
            </p>
          </section>
          <section className="preference-section">
            <header className="notification-heading">
              <h3>
                <Mail size={20} />
                Електронна пошта
              </h3>
              <span
                className={
                  keys.email ? "connection-ready" : "connection-missing"
                }
              >
                {keys.email ? "Ключ підключено" : "Ключ не підключено"}
              </span>
            </header>
            <div className="form-grid">
              <label className="field">
                Email відправника
                <input
                  type="email"
                  value={n.sender_email}
                  placeholder="orders@your-domain.ua"
                  onChange={(e) => set("sender_email", e.target.value)}
                />
                <small>Адреса з домену, підтвердженого в Resend.</small>
              </label>
              <label className="field">
                Email адміністратора
                <input
                  type="email"
                  value={n.staff_email}
                  onChange={(e) => set("staff_email", e.target.value)}
                />
              </label>
            </div>
            <label className="preference-row">
              <span>
                <strong>Лист адміністратору</strong>
                <small>Повідомлення про нове замовлення.</small>
              </span>
              <input
                type="checkbox"
                checked={n.staff_email_enabled}
                onChange={(e) => set("staff_email_enabled", e.target.checked)}
              />
            </label>
            <label className="preference-row">
              <span>
                <strong>Лист покупцю</strong>
                <small>
                  Номер, перелік товарів і підсумкова сума. Не є підтвердженням
                  оплати.
                </small>
              </span>
              <input
                type="checkbox"
                checked={n.customer_email_enabled}
                onChange={(e) =>
                  set("customer_email_enabled", e.target.checked)
                }
              />
            </label>
            <label className="field">
              Заголовок листа покупцю
              <input
                value={n.email_heading}
                onChange={(e) => set("email_heading", e.target.value)}
              />
            </label>
            <label className="field">
              Текст після замовлення
              <textarea
                rows={3}
                value={n.email_footer}
                onChange={(e) => set("email_footer", e.target.value)}
              />
            </label>
            <p className="field-help">
              Потрібен серверний ключ RESEND_API_KEY. Статус ключа не
              підтверджує доставку: результат відображається в журналі нижче.
            </p>
          </section>
        </fieldset>
        <div className="commerce-savebar">
          <span>
            {demo
              ? "Деморежим · відправку вимкнено"
              : "Налаштування застосовуються до нових замовлень"}
          </span>
          <button className="button" disabled={busy}>
            <Check size={16} />
            Зберегти
          </button>
        </div>
      </form>
      <section className="notification-log">
        <header>
          <div>
            <h3>Журнал відправок</h3>
            <p>
              Останні 100 повідомлень. Помилка сповіщення не скасовує
              замовлення.
            </p>
          </div>
          <div>
            <button
              className="button outline"
              disabled={working || demo}
              onClick={() => void reload()}
            >
              <RefreshCw size={15} />
              Оновити
            </button>
            <button
              className="button"
              disabled={working || demo}
              onClick={() => void process()}
            >
              Обробити чергу
            </button>
          </div>
        </header>
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
        {!jobs.length ? (
          <div className="notification-empty">
            <Mail size={32} />
            <h3>Відправок ще немає</h3>
            <p>
              {demo
                ? "Для роботи сповіщень підключіть базу й ключі сервісів."
                : "Після збереження налаштувань нові замовлення з’являтимуться тут."}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Замовлення / дата</th>
                  <th>Канал / отримувач</th>
                  <th>Стан</th>
                  <th>Дія</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      #{j.order_id.slice(0, 8)}
                      <small>
                        {new Date(j.created_at).toLocaleString("uk-UA")}
                      </small>
                    </td>
                    <td>
                      {j.channel === "telegram"
                        ? "Telegram"
                        : j.channel === "staff_email"
                          ? "Email адміністратора"
                          : "Email покупця"}
                      <small>{j.recipient}</small>
                    </td>
                    <td>
                      <strong>
                        {
                          {
                            pending: "У черзі",
                            sending: "Відправляється",
                            sent: "Прийнято сервісом",
                            failed: "Помилка",
                            uncertain: "Потребує перевірки",
                          }[j.status as string]
                        }
                      </strong>
                      <small>{j.error}</small>
                    </td>
                    <td>
                      {["failed", "uncertain"].includes(j.status) && (
                        <button
                          className="button outline"
                          disabled={working}
                          onClick={() =>
                            void process(j.id, j.status === "uncertain")
                          }
                        >
                          Повторити
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
