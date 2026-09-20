import { NextResponse } from "next/server";
import { dispatchNotifications } from "@/lib/notifications";
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== "Bearer " + secret)
    return NextResponse.json({ message: "Недоступно" }, { status: 401 });
  try {
    return NextResponse.json(await dispatchNotifications());
  } catch {
    return NextResponse.json(
      { message: "Не вдалося обробити чергу" },
      { status: 503 },
    );
  }
}
