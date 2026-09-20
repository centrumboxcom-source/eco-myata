import { Header, Footer } from "@/components/shop";
import PaymentResult from "@/components/payment-result";
export const metadata = {
  title: "Статус оплати",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <Header />
      <main className="container">
        <PaymentResult />
      </main>
      <Footer />
    </>
  );
}
