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
        <h1 className="hero-serif-title">
          Натуральні
          <br />продукти <Leaf size={55} strokeWidth={1.5} className="hero-leaf-inline" />
          <br />для здорового життя
        </h1>
        <div className="hero-features-list">
          Без цукру &bull; Без глютену &bull; Без лактози &bull; Веган
        </div>
        <Link href="/catalog" className="button hero-button">
          Перейти до покупок <ArrowRight size={19} />
        </Link>
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
