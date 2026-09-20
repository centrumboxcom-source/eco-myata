"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import type { HomeContent } from "@/lib/content-settings";
export default function HomeHero({
  banners,
}: {
  banners: HomeContent["banners"];
}) {
  const [index, setIndex] = useState(0);
  const active = banners.filter((b) => b.enabled);
  if (!active.length) return null;
  const b = active[index % active.length];
  return (
    <section className="hero container">
      <Image
        className={"hero-image " + (b.mobile_image ? "hero-desktop-media" : "")}
        src={b.image}
        alt={b.title.replace(/\n/g, " ")}
        fill
        priority
        sizes="100vw"
      />
      {b.mobile_image && (
        <Image
          className="hero-image hero-mobile-media"
          src={b.mobile_image}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      )}
      <div className="hero-content">
        <span className="hero-kicker">
          <span />
          {b.eyebrow}
        </span>
        <h1 style={{ whiteSpace: "pre-line" }}>{b.title}</h1>
        <p style={{ whiteSpace: "pre-line" }}>{b.text}</p>
        {b.button && (
          <Link href={b.href} className="button">
            {b.button}
            <ArrowRight size={19} />
          </Link>
        )}
      </div>
      <div className="hero-stamp">
        <Leaf size={25} />
        <span>
          ЕКО<small>М’ЯТА</small>
        </span>
      </div>
      {active.length > 1 && (
        <div className="hero-pagination">
          {active.map((x, i) => (
            <button
              key={x.id}
              className={i === index % active.length ? "active" : ""}
              onClick={() => setIndex(i)}
              aria-label={"Банер " + (i + 1)}
              aria-pressed={i === index % active.length}
            />
          ))}
        </div>
      )}
    </section>
  );
}
