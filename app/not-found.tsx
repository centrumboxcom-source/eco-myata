import Link from "next/link";
import { Leaf } from "lucide-react";
import { Header, Footer } from "@/components/shop";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="empty-state" style={{ minHeight: "60vh" }}>
        <Leaf size={60} />
        <span className="eyebrow">404 · ТРОХИ ЗАБЛУКАЛИ</span>
        <h1>Ця стежка веде в нікуди.</h1>
        <p>Повернімося туди, де є щось корисне.</p>
        <Link href="/catalog" className="button">
          До крамниці
        </Link>
      </main>
      <Footer />
    </>
  );
}
