import { integrationSecrets } from "@/lib/integration-secrets";
import { serviceClient } from "./server";
import { deliverNotification } from "./notification-delivery";
export async function dispatchNotifications() {
  const db = serviceClient();
  if (!db) throw Error("База не підключена");
  const keys = await integrationSecrets([
    "TELEGRAM_BOT_TOKEN",
    "RESEND_API_KEY",
  ]);
  const { data, error } = await db.rpc("claim_order_notifications");
  if (error) throw error;
  const results = await Promise.all(
    (data || []).map(async (job: any) => {
      const result = await deliverNotification(job, {
        telegram: keys.TELEGRAM_BOT_TOKEN,
        resend: keys.RESEND_API_KEY,
      });
      const { error } = await db
        .from("order_notifications")
        .update({
          status: result.status,
          error: result.error,
          sent_at: result.status === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", job.id)
        .eq("claim_id", job.claim_id);
      if (error) throw error;
      return result.status;
    }),
  );
  return {
    processed: results.length,
    sent: results.filter((s) => s === "sent").length,
  };
}
