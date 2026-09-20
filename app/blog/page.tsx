import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Header, Footer } from "@/components/shop";
import { getPosts } from "@/lib/posts";
export const metadata = {
  title: "Блог — смачні ідеї та природні ритуали",
  description:
    "Рецепти, поради щодо продуктів і натхнення для щоденних ритуалів від ЕКО М’ЯТА.",
};
export default async function Page() {
  const posts = await getPosts();
  return (
    <>
      <Header />
      <main className="container" style={{ paddingBottom: 70 }}>
        <div className="breadcrumb">
          <Link href="/">Головна</Link> / Блог
        </div>
        <span className="eyebrow">НАТХНЕННЯ НА ЩОДЕНЬ</span>
        <h1 className="page-title">Жити смачно. Обирати свідомо.</h1>
        <p className="page-description" style={{ marginBottom: 35 }}>
          Прості рецепти, знайомство з продуктами та маленькі ритуали.
        </p>
        <div className="journal-grid">
          {posts.map((p) => (
            <Link href={"/blog/" + p.slug} className="journal-card" key={p.id}>
              <div>
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width:600px) 100vw,33vw"
                />
              </div>
              <span className="eyebrow">
                {new Date(p.created_at).toLocaleDateString("uk-UA")}
              </span>
              <h3>{p.title}</h3>
              <p className="page-description" style={{ marginBottom: 15 }}>
                {p.excerpt}
              </p>
              <span className="underlined-link">
                Читати <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
        {!posts.length && (
          <div className="empty-state">
            Готуємо перші корисні історії. Завітайте трохи пізніше.
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
