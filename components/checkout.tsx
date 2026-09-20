"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useShopConfig, usePrice } from "./shop-config";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ShoppingBag } from "lucide-react";
import { useShop } from "@/lib/store";
import { money } from "@/lib/data";
import { item, type Purchase } from "@/lib/analytics";
import AnalyticsEvent from "./analytics-event";
type Choice = { id: string; name: string; locker?: boolean };
export default function Checkout({
  configured,
  methods,
  freeShipping,
}: {
  configured: boolean;
  methods: Record<string, boolean>;
  freeShipping: number;
}) {
  const { commerce } = useShopConfig();
  const money = usePrice();
  const { items, clear } = useShop();
  const [ready, setReady] = useState(false);
  const [delivery, setDelivery] = useState(
    ["np", "ukr", "courier"].find((m) => methods[m]) || "np",
  );
  const [payment, setPayment] = useState(
    ["cod", "mono", "liqpay", "bank"].find((m) => methods[m]) || "cod",
  );
  const [city, setCity] = useState("");
  const [cityRef, setCityRef] = useState("");
  const [cities, setCities] = useState<Choice[]>([]);
  const [warehouses, setWarehouses] = useState<Choice[]>([]);
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<Choice | null>(
    null,
  );
  const [showWarehouseList, setShowWarehouseList] = useState(false);
  const warehouseBoxRef = useRef<HTMLDivElement>(null);
  const [npConfigured, setNpConfigured] = useState(false);
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    (Purchase & { iban?: string; recipient?: string }) | null
  >(null);
  const requestId = useRef("");

  useEffect(() => {
    setReady(true);
    requestId.current =
      sessionStorage.getItem("eko-checkout-request") || crypto.randomUUID();
    sessionStorage.setItem("eko-checkout-request", requestId.current);
    if (!useShop.getState().items.length) {
      const previous = sessionStorage.getItem("eko-last-order");
      if (previous)
        fetch("/api/order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: previous,
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) {
              setResult(d);
              requestId.current = JSON.parse(previous).requestId;
            }
          })
          .catch(() => {});
    } else {
      fetch("/api/catalog")
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (p) useShop.getState().refresh(p);
        })
        .catch(() => {});
    }
  }, []);

  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const itemsKey = items.map((i) => i.product.id + ":" + i.quantity).join(",");

  useEffect(() => {
    setDiscount(0);
    setPromoMessage("");
  }, [itemsKey]);

  useEffect(() => {
    if (!["np", "locker"].includes(delivery) || city.length < 2) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/delivery?q=" + encodeURIComponent(city), {
          signal: abort.signal,
        });
        const d = await r.json();
        setNpConfigured(d.configured);
        setCities(d.items || []);
      } catch {}
    }, 350);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [city, delivery]);

  useEffect(() => {
    if (!cityRef) {
      setWarehouses([]);
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/delivery?city=${encodeURIComponent(cityRef)}&q=${encodeURIComponent(warehouseQuery)}`,
          { signal: abort.signal },
        );
        const d = await r.json();
        setWarehouses(d.items || []);
        if (!d.configured) setNpConfigured(false);
      } catch {}
    }, 200);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [cityRef, warehouseQuery, delivery]);

  useEffect(() => {
    setSelectedWarehouse(null);
    setWarehouseQuery("");
    setShowWarehouseList(false);
  }, [cityRef, delivery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        warehouseBoxRef.current &&
        !warehouseBoxRef.current.contains(e.target as Node)
      ) {
        setShowWarehouseList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!ready) return <p>Завантажуємо кошик…</p>;
  if (result)
    return (
      <div className="empty-state" style={{ minHeight: "55vh" }}>
        <CheckCircle2 size={64} />
        <AnalyticsEvent order={result} />
        <h2>Дякуємо за ваш вибір!</h2>
        <p>Замовлення № {result.id.slice(0, 8).toUpperCase()} прийнято.</p>
        <strong>{money(result.total)}</strong>
        {result.payment === "bank" && (
          <div className="notice">
            Отримувач: {result.recipient}
            <br />
            IBAN: {result.iban}
            <br />
            Призначення: замовлення {result.id}
          </div>
        )}
        {["mono", "liqpay"].includes(result.payment) &&
          result.payment_status !== "paid" && (
            <button
              className="button"
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await fetch("/api/payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: result.id,
                      requestId: requestId.current,
                    }),
                  });
                  const d = await r.json();
                  if (!r.ok) throw new Error(d.message);
                  if (d.provider === "liqpay") {
                    const form = document.createElement("form");
                    form.method = "POST";
                    form.action = "https://www.liqpay.ua/api/3/checkout";
                    for (const key of ["data", "signature"]) {
                      const input = document.createElement("input");
                      input.type = "hidden";
                      input.name = key;
                      input.value = d[key];
                      form.appendChild(input);
                    }
                    document.body.appendChild(form);
                    form.submit();
                  } else {
                    window.location.href = d.url;
                  }
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Перейти до оплати <ArrowRight size={18} />
            </button>
          )}
        {error && <p className="error-message">{error}</p>}
        <Link href="/catalog" className="button outline">
          Продовжити покупки
        </Link>
      </div>
    );
  if (!items.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={50} />
        <h2>Спочатку оберіть щось корисне</h2>
        <Link href="/catalog" className="button">
          До каталогу
        </Link>
      </div>
    );

  return (
    <>
      <AnalyticsEvent
        name="begin_checkout"
        data={{
          currency: "UAH",
          value: total,
          items: items.map((i) => item(i.product, i.quantity)),
        }}
      />
      {!configured && (
        <p className="notice">
          Режим перегляду: можна перевірити оформлення. Замовлення ще не
          приймаються, кошти не списуються.
        </p>
      )}
      <form
        className="checkout-layout"
        onSubmit={async (e) => {
          e.preventDefault();
          if (total - discount < commerce.minimum_order) {
            setError(
              "Мінімальна сума замовлення — " + money(commerce.minimum_order),
            );
            return;
          }
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          const warehouse =
            selectedWarehouse ||
            warehouses.find((w) => w.id === f.get("warehouse"));
          const finalAddress =
            warehouse?.name ||
            String(f.get("address") || warehouseQuery || "").trim();
          if (["np", "locker"].includes(delivery) && cityRef && !finalAddress) {
            setError("Будь ласка, оберіть або вкажіть відділення / поштомат");
            setBusy(false);
            return;
          }
          try {
            const r = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: f.get("name"),
                lastName: f.get("lastName"),
                phone: String(f.get("phone")).replace(/[\s()-]/g, ""),
                email: f.get("email"),
                city,
                address: finalAddress,
                cityRef,
                warehouseRef: warehouse?.id,
                delivery,
                payment,
                comment: String(f.get("comment") || ""),
                custom_fields: Object.fromEntries(
                  commerce.extra_fields.map((field) => [
                    field.id,
                    String(f.get("extra_" + field.id) || ""),
                  ]),
                ),
                promo: discount > 0 ? promo : "",
                consent: f.get("consent") === "on",
                items: items.map((i) => ({
                  id: i.product.id,
                  quantity: i.quantity,
                })),
                requestId: requestId.current,
              }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.message);
            sessionStorage.setItem(
              "eko-last-order",
              JSON.stringify({ orderId: d.id, requestId: requestId.current }),
            );
            sessionStorage.removeItem("eko-checkout-request");
            setResult(d);
            clear();
          } catch (e) {
            setError(
              (e as Error).message ||
                "Не вдалося з’єднатися. Спробуйте ще раз.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <section className="form-card">
            <h2>
              <span>01</span> Ваші контактні дані
            </h2>
            <div className="form-grid">
              <label className="field">
                Ім’я
                <input
                  name="name"
                  autoComplete="given-name"
                  required
                  minLength={2}
                  placeholder="Олена"
                />
              </label>
              <label className="field">
                Прізвище
                <input
                  name="lastName"
                  autoComplete="family-name"
                  required
                  minLength={2}
                  placeholder="Шевченко"
                />
              </label>
              <label className="field">
                Телефон
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  placeholder="+380 67 123 45 67"
                  pattern="\+380[0-9\s()\-]{9,16}"
                />
              </label>
              <label className="field">
                Електронна пошта
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <h2>
              <span>02</span> Куди доставити?
            </h2>
            {[
              ["np", "Нова пошта — відділення"],
              ["locker", "Нова пошта — поштомат"],
              ["ukr", "Укрпошта"],
              ["courier", "Кур’єр до дверей"],
            ]
              .filter(([id]) => methods[id === "locker" ? "np" : id])
              .map(([id, label]) => (
                <label className="radio-option" key={id}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === id}
                    onChange={() => setDelivery(id)}
                  />
                  {label}
                </label>
              ))}
            <div className="form-grid" style={{ marginTop: 22 }}>
              <label className="field full-width">
                Місто
                <input
                  required
                  value={city}
                  autoComplete="address-level2"
                  placeholder="Почніть вводити назву міста"
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCityRef("");
                  }}
                />
              </label>
              {npConfigured && !cityRef && cities.length > 0 && (
                <div className="field full-width">
                  {cities.map((c) => (
                    <button
                      type="button"
                      className="radio-option"
                      key={c.id}
                      onClick={() => {
                        setCity(c.name);
                        setCityRef(c.id);
                        setCities([]);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {npConfigured &&
              cityRef &&
              ["np", "locker"].includes(delivery) ? (
                <div
                  className="field full-width"
                  style={{ position: "relative" }}
                  ref={warehouseBoxRef}
                >
                  <label style={{ display: "block", width: "100%" }}>
                    {delivery === "locker"
                      ? "Поштомат Нової пошти"
                      : "Відділення Нової пошти"}
                    <input
                      type="text"
                      required
                      value={
                        selectedWarehouse
                          ? selectedWarehouse.name
                          : warehouseQuery
                      }
                      placeholder={
                        delivery === "locker"
                          ? "Почніть вводити № або адресу (напр. 1001 чи Головна)"
                          : "Почніть вводити № або адресу (напр. 15 чи Зелена)"
                      }
                      onChange={(e) => {
                        setSelectedWarehouse(null);
                        setWarehouseQuery(e.target.value);
                        setShowWarehouseList(true);
                      }}
                      onFocus={() => setShowWarehouseList(true)}
                      autoComplete="off"
                    />
                  </label>
                  <input
                    type="hidden"
                    name="warehouse"
                    value={selectedWarehouse?.id || ""}
                  />
                  <input
                    type="hidden"
                    name="address"
                    value={selectedWarehouse?.name || warehouseQuery}
                  />
                  {showWarehouseList && (
                    <div
                      className="search-results"
                      style={{
                        maxHeight: 280,
                        overflowY: "auto",
                        zIndex: 60,
                        top: "100%",
                        marginTop: 4,
                        boxShadow: "0 10px 30px rgba(35,60,40,0.18)",
                      }}
                    >
                      {warehouses
                        .filter((w) =>
                          delivery === "locker" ? w.locker : !w.locker,
                        )
                        .map((w) => (
                          <button
                            type="button"
                            key={w.id}
                            className="search-result"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background:
                                selectedWarehouse?.id === w.id
                                  ? "#edf3e6"
                                  : undefined,
                              cursor: "pointer",
                              border: 0,
                            }}
                            onClick={() => {
                              setSelectedWarehouse(w);
                              setWarehouseQuery(w.name);
                              setShowWarehouseList(false);
                            }}
                          >
                            <div>
                              <b>{w.name}</b>
                            </div>
                          </button>
                        ))}
                      {warehouses.filter((w) =>
                        delivery === "locker" ? w.locker : !w.locker,
                      ).length === 0 && (
                        <div className="search-empty">
                          {warehouseQuery
                            ? `Нічого не знайдено за запитом "${warehouseQuery}"`
                            : "Введіть номер відділення/поштомата або назву вулиці"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <label className="field full-width">
                  {delivery === "courier"
                    ? "Вулиця, будинок, квартира"
                    : delivery === "ukr"
                      ? "Індекс та адреса відділення"
                      : "Адреса та номер відділення / поштомата"}
                  <input
                    required
                    name="address"
                    minLength={2}
                    autoComplete="street-address"
                    placeholder="Вкажіть повну адресу"
                  />
                </label>
              )}
            </div>
            <p
              className="page-description"
              style={{ marginTop: 15, fontSize: 12 }}
            >
              Вартість доставки — за тарифами перевізника.{" "}
              {total - discount >= freeShipping
                ? "Ваше замовлення має безкоштовну доставку."
                : `Від ${money(freeShipping)} — безкоштовно.`}
            </p>
          </section>
          <section className="form-card">
            <h2>
              <span>03</span> Зручна оплата
            </h2>
            {[
              ["cod", "При отриманні", "Оплатіть після огляду посилки"],
              [
                "mono",
                "Monopay · Apple Pay · Google Pay",
                "Безпечна оплата на сторінці банку",
              ],
              ["liqpay", "LiqPay", "Онлайн карткою"],
              ["bank", "За реквізитами IBAN", "Реквізити після оформлення"],
            ]
              .filter(([id]) => methods[id])
              .map(([id, title, desc]) => (
                <label className="radio-option" key={id}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === id}
                    onChange={() => setPayment(id)}
                  />
                  <span>
                    {title}
                    <small>{desc}</small>
                  </span>
                </label>
              ))}
          </section>
          {commerce.comment_enabled && (
            <label className="field">
              {commerce.comment_label}
              <textarea
                name="comment"
                rows={3}
                maxLength={1000}
                placeholder="Побажання щодо вашого замовлення"
              />
            </label>
          )}
          {commerce.extra_fields.length > 0 && (
            <section className="form-card">
              <h2>Додаткова інформація</h2>
              {commerce.extra_fields.map((field) => (
                <label
                  className={
                    field.type === "checkbox" ? "radio-option" : "field"
                  }
                  key={field.id}
                >
                  {field.type !== "checkbox" && (
                    <span>
                      {field.label}
                      {field.required ? " *" : ""}
                    </span>
                  )}
                  {field.type === "textarea" ? (
                    <textarea
                      name={"extra_" + field.id}
                      required={field.required}
                      maxLength={1000}
                    />
                  ) : field.type === "select" ? (
                    <select
                      name={"extra_" + field.id}
                      required={field.required}
                    >
                      <option value="">Оберіть варіант</option>
                      {field.options.map((o, i) => (
                        <option key={i}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={"extra_" + field.id}
                      type={field.type === "checkbox" ? "checkbox" : "text"}
                      required={field.required}
                      maxLength={1000}
                    />
                  )}{" "}
                  {field.type === "checkbox" && field.label}
                </label>
              ))}
            </section>
          )}
        </div>
        <aside className="order-summary">
          <h2>Ваше замовлення</h2>
          {items.map((i) => (
            <div className="cart-item" key={i.product.id}>
              <Image
                src={i.product.image}
                alt={i.product.name}
                width={54}
                height={60}
              />
              <div>
                {i.product.name}
                <small>
                  {i.quantity} × {money(i.product.price)}
                </small>
              </div>
              <strong style={{ fontSize: 13 }}>
                {money(i.quantity * i.product.price)}
              </strong>
            </div>
          ))}
          <div className="promo-form">
            <input
              aria-label="Промокод"
              placeholder="Маєте промокод?"
              value={promo}
              onChange={(e) => {
                setPromo(e.target.value.toUpperCase());
                setDiscount(0);
              }}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const r = await fetch("/api/promo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: promo,
                      items: items.map((i) => ({
                        id: i.product.id,
                        quantity: i.quantity,
                      })),
                    }),
                  });
                  const d = await r.json();
                  setDiscount(r.ok ? d.discount : 0);
                  setPromoMessage(r.ok ? "Промокод застосовано" : d.message);
                } catch {
                  setPromoMessage("Не вдалося перевірити промокод");
                }
              }}
            >
              Застосувати
            </button>
          </div>
          {promoMessage && <p style={{ fontSize: 12 }}>{promoMessage}</p>}
          <div className="summary-row">
            <span>Товари</span>
            <span>{money(total)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row">
              <span>Знижка</span>
              <span>−{money(discount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>Доставка</span>
            <span>
              {total - discount >= freeShipping
                ? "Безкоштовно"
                : "За тарифом перевізника"}
            </span>
          </div>
          <div className="summary-row total">
            <span>До сплати за товари</span>
            <strong>{money(total - discount)}</strong>
          </div>
          <label
            className="radio-option"
            style={{ padding: 0, border: 0, fontSize: 11, margin: "20px 0" }}
          >
            <input type="checkbox" name="consent" required />
            <span>
              Погоджуюся з{" "}
              <Link
                href="/privacy"
                target="_blank"
                style={{ textDecoration: "underline" }}
              >
                політикою конфіденційності
              </Link>{" "}
              та обробкою даних для виконання замовлення. Ознайомлений з{" "}
              <Link href="/terms" target="_blank">
                умовами продажу
              </Link>{" "}
              та{" "}
              <Link href="/returns" target="_blank">
                повернення
              </Link>
              .
            </span>
          </label>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {total - discount < commerce.minimum_order && (
            <p className="notice">
              Мінімальна сума замовлення — {money(commerce.minimum_order)}.
              Додайте товарів ще на{" "}
              {money(commerce.minimum_order - total + discount)}.
            </p>
          )}
          <button
            disabled={busy || total - discount < commerce.minimum_order}
            className="button full"
          >
            {busy ? "Оформлюємо…" : commerce.checkout_button}
            <ArrowRight size={18} />
          </button>
        </aside>
      </form>
    </>
  );
}
