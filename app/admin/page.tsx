import { configured, requireAdmin } from "@/lib/server";
import Account from "@/components/account";
import Admin from "@/components/admin";
export const metadata = {
  title: "Керування магазином",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!configured()) return <Admin demo />;
  try {
    await requireAdmin();
    return <Admin demo={false} />;
  } catch {
    return <Account admin />;
  }
}

export const dynamic = "force-dynamic";
