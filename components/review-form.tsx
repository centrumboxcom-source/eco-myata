"use client";
import { useState } from "react";
export default function ReviewForm() {
  const [message, setMessage] = useState("");
  return (
    <section className="form-card" style={{ marginTop: 30 }}>
      <h2>Поділіться враженнями</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          try {
            const r = await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.fromEntries(f)),
            });
            const d = await r.json();
            setMessage(d.message);
            if (r.ok) form.reset();
          } catch {
            setMessage("Не вдалося надіслати відгук. Спробуйте пізніше.");
          }
        }}
      >
        <div className="form-grid">
          <label className="field">
            Ім’я
            <input name="name" required minLength={2} />
          </label>
          <label className="field">
            Оцінка
            <select name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option value={n} key={n}>
                  {n} із 5
                </option>
              ))}
            </select>
          </label>
          <label className="field full-width">
            Ваш відгук
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={2000}
              rows={3}
            />
          </label>
        </div>
        <p role="status">{message}</p>
        <button className="button" style={{ marginTop: 20 }}>
          Надіслати відгук
        </button>
      </form>
    </section>
  );
}
