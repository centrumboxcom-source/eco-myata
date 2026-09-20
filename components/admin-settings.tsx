"use client";
import {
  defaultSettings,
  launchIssues,
  type Settings,
} from "@/lib/store-settings";
type Props = {
  value: Settings;
  onChange: (value: Settings) => void;
  onSave: () => void;
  busy: boolean;
  view: string;
};
export default function AdminSettings({
  value,
  onChange,
  onSave,
  busy,
  view,
}: Props) {
  const s = { ...defaultSettings, ...value };
  const set = (key: string, value: unknown) => onChange({ ...s, [key]: value });
  return (
    <form
      className="admin-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="form-grid">
        {view === "integrations" ? (
          <>
            <label className="field full-width">
              Публічний домен магазину
              <input
                type="url"
                placeholder="https://your-domain.ua"
                value={s.site_url}
                onChange={(e) => set("site_url", e.target.value.trim())}
              />
              <small>
                Адреса для фіда, sitemap, SEO та повернення з банку. DNS, HTTPS
                і підключення домену виконуються окремо на хостингу.
              </small>
            </label>
            <label className="field">
              Спосіб підключення аналітики
              <select
                value={s.analytics_mode}
                onChange={(e) => set("analytics_mode", e.target.value)}
              >
                <option value="off">Вимкнено</option>
                <option value="ga4">Google Analytics 4 напряму</option>
                <option value="gtm">Google Tag Manager</option>
              </select>
            </label>
            <label className="field">
              GA4 Measurement ID
              <input
                placeholder="G-XXXXXXXXXX"
                value={s.ga4_id}
                onChange={(e) =>
                  set("ga4_id", e.target.value.trim().toUpperCase())
                }
              />
            </label>
            <label className="field">
              GTM Container ID
              <input
                placeholder="GTM-XXXXXXX"
                value={s.gtm_id}
                onChange={(e) =>
                  set("gtm_id", e.target.value.trim().toUpperCase())
                }
              />
            </label>
            <label className="field">
              Google Site Verification — лише значення content
              <input
                value={s.google_verification}
                onChange={(e) =>
                  set("google_verification", e.target.value.trim())
                }
              />
            </label>
            <p className="notice full-width">
              Оберіть один спосіб, щоб не подвоювати події. Аналітика
              запускається після згоди покупця. Для GTM налаштуйте Google tag та
              GA4 Event із даних ecommerce. Персональні контакти покупця у події
              не передаються.
            </p>
            <label className="radio-option full-width">
              <input
                type="checkbox"
                checked={s.merchant_enabled}
                onChange={(e) => set("merchant_enabled", e.target.checked)}
              />{" "}
              Увімкнути фід Merchant Center
            </label>
            <p className="full-width">
              Адреса фіда:{" "}
              <a href="/merchant.xml" target="_blank" rel="noreferrer">
                /merchant.xml
              </a>
              . Потрібні відкритий магазин, SEO-видимість та перевірені товари з
              увімкненим експортом. Публічний домен підтверджується у Merchant
              Center. Схвалення Google не гарантується.
            </p>
          </>
        ) : (
          <>
            {[
              ["legal_name", "Повна назва ФОП / компанії"],
              ["tax_id", "РНОКПП / ЄДРПОУ (публічні реквізити продавця)"],
              ["address", "Адреса для звернень та повернень"],
            ].map(([key, label]) => (
              <label className="field full-width" key={key}>
                {label}
                <input
                  value={String(s[key as keyof Settings])}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
            {[
              [
                "shipping_details",
                "Доставка: регіони, строки обробки й перевезення, вартість, комісії",
              ],
              [
                "returns_policy",
                "Повернення: умови, винятки, строки, адреса, хто оплачує доставку, відшкодування",
              ],
              ["terms", "Умови продажу / публічна оферта"],
            ].map(([key, label]) => (
              <label className="field full-width" key={key}>
                {label}
                <textarea
                  rows={8}
                  value={String(s[key as keyof Settings])}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
            <label className="radio-option full-width">
              <input
                type="checkbox"
                checked={s.store_open}
                onChange={(e) => set("store_open", e.target.checked)}
              />{" "}
              Відкрити приймання реальних замовлень
            </label>
            {launchIssues(s).length > 0 && (
              <div className="notice full-width">
                Для запуску заповніть: {launchIssues(s).join("; ")}.
              </div>
            )}
            <p className="full-width">
              Тексти публікуються на сторінках доставки, повернення й умов
              продажу. Вкажіть фактичні умови вашого бізнесу. Поріг безкоштовної
              доставки задається в загальних налаштуваннях.
            </p>
          </>
        )}
      </div>
      <div className="modal-actions">
        <button className="button" disabled={busy}>
          Зберегти налаштування
        </button>
      </div>
    </form>
  );
}
