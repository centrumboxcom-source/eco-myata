"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { readConsent, type Consent } from "@/lib/analytics";
const denied = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};
export default function Analytics({
  mode,
  ga4,
  gtm,
}: {
  mode: string;
  ga4: string;
  gtm: string;
}) {
  const path = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null),
    [open, setOpen] = useState(false),
    [loaded, setLoaded] = useState(false);
  const enabled =
    mode === "ga4"
      ? /^G-[A-Z0-9]+$/.test(ga4)
      : mode === "gtm"
        ? /^GTM-[A-Z0-9]+$/.test(gtm)
        : false;
  useEffect(() => {
    const saved = readConsent();
    setConsent(saved);
    setOpen(!saved);
    const manage = () => setOpen(true);
    window.addEventListener("eko:privacy", manage);
    return () => window.removeEventListener("eko:privacy", manage);
  }, []);
  useEffect(() => {
    if (
      !enabled ||
      !consent?.analytics ||
      /^\/(admin|account)(\/|$)/.test(path) ||
      (mode === "gtm" && !consent.marketing)
    )
      return;
    if (window.ekoAnalytics?.ready) {
      setLoaded(true);
      return;
    }
    if (document.getElementById("eko-google-tag")) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", denied);
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: consent.marketing ? "granted" : "denied",
      ad_user_data: consent.marketing ? "granted" : "denied",
      ad_personalization: consent.marketing ? "granted" : "denied",
    });
    const script = document.createElement("script");
    script.async = true;
    script.id = "eko-google-tag";
    if (mode === "ga4") {
      window.gtag("js", new Date());
      window.gtag("config", ga4, {
        send_page_view: false,
        page_location: location.origin + location.pathname,
        page_referrer: document.referrer
          ? new URL(document.referrer).origin +
            new URL(document.referrer).pathname
          : "",
        allow_google_signals: consent.marketing,
        allow_ad_personalization_signals: consent.marketing,
      });
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + ga4;
    } else {
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      script.src = "https://www.googletagmanager.com/gtm.js?id=" + gtm;
    }
    script.onload = () => {
      window.ekoAnalytics = { mode, ready: true };
      setLoaded(true);
      window.dispatchEvent(new Event("eko:analytics-ready"));
    };
    document.head.appendChild(script);
  }, [enabled, consent, mode, ga4, gtm, path]);
  useEffect(() => {
    if (!loaded || !consent?.analytics || /^\/(admin|account)(\/|$)/.test(path))
      return;
    const location = window.location.origin + path;
    if (mode === "ga4")
      window.gtag("event", "page_view", {
        page_location: location,
        page_title: document.title,
      });
    else
      window.dataLayer.push({
        event: "virtual_page_view",
        page_location: location,
        page_title: document.title,
      });
  }, [path, loaded, consent, mode]);
  function choose(next: Consent) {
    try {
      localStorage.setItem("eko-consent-v1", JSON.stringify(next));
    } catch {}
    setConsent(next);
    setOpen(false);
    if (window.ekoAnalytics?.ready) {
      window.gtag("consent", "update", {
        analytics_storage: next.analytics ? "granted" : "denied",
        ad_storage: next.marketing ? "granted" : "denied",
        ad_user_data: next.marketing ? "granted" : "denied",
        ad_personalization: next.marketing ? "granted" : "denied",
      });
      window.location.reload();
    }
  }
  if (!enabled || !open || /^\/(admin|account)(\/|$)/.test(path)) return null;
  return (
    <section
      className="consent-banner"
      aria-label="Налаштування конфіденційності"
    >
      <div>
        <strong>Ваш вибір щодо cookies</strong>
        <p>
          Необхідні дані зберігають кошик і вхід. За вашою згодою Google
          допоможе вимірювати відвідування та покупки
          {mode === "gtm" ? " і роботу реклами" : ""}.{" "}
          <Link href="/privacy">Докладніше</Link>
        </p>
      </div>
      <div className="consent-actions">
        <button onClick={() => choose({ analytics: false, marketing: false })}>
          Лише необхідні
        </button>
        {mode === "ga4" && (
          <button onClick={() => choose({ analytics: true, marketing: false })}>
            Лише аналітика
          </button>
        )}
        <button
          className="button"
          onClick={() => choose({ analytics: true, marketing: true })}
        >
          Дозволити всі
        </button>
      </div>
    </section>
  );
}
