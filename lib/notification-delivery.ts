type Job = {
  id: string;
  channel: string;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
};
type Keys = { telegram?: string; resend?: string };
export async function deliverNotification(
  job: Job,
  keys: Keys,
  send: typeof fetch = fetch,
): Promise<{ status: "sent" | "failed" | "uncertain"; error: string }> {
  const telegram = job.channel === "telegram";
  if (!(telegram ? keys.telegram : keys.resend))
    return {
      status: "failed",
      error: telegram
        ? "Не підключено TELEGRAM_BOT_TOKEN"
        : "Не підключено RESEND_API_KEY",
    };
  try {
    const response = await send(
      telegram
        ? "https://api.telegram.org/bot" + keys.telegram + "/sendMessage"
        : "https://api.resend.com/emails",
      {
        method: "POST",
        headers: telegram
          ? { "Content-Type": "application/json" }
          : {
              "Content-Type": "application/json",
              Authorization: "Bearer " + keys.resend,
              "Idempotency-Key": "order-notification/" + job.id,
            },
        body: JSON.stringify(
          telegram
            ? { chat_id: job.recipient, text: job.body.slice(0, 4000) }
            : {
                from: job.sender,
                to: [job.recipient],
                subject: job.subject,
                text: job.body,
              },
        ),
        signal: AbortSignal.timeout(8000),
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok)
      return {
        status: response.status >= 500 ? "uncertain" : "failed",
        error:
          "Сервіс відхилив запит (HTTP " +
          response.status +
          "). Перевірте підключення та отримувача.",
      };
    if (telegram ? !data?.ok : !data?.id)
      return {
        status: "uncertain",
        error:
          "Сервіс не підтвердив відправку. Перевірте доставку перед повтором.",
      };
    return { status: "sent", error: "" };
  } catch {
    return {
      status: "uncertain",
      error: "Немає підтвердження сервісу. Перевірте доставку перед повтором.",
    };
  }
}
