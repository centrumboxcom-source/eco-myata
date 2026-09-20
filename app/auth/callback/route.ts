import { NextRequest, NextResponse } from "next/server";
import { sessionClient } from "@/lib/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"),
    next = request.nextUrl.searchParams.get("next");
  const client = await sessionClient();
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(next === "/account/reset" ? next : "/account", request.url),
      );
  }
  return NextResponse.redirect(
    new URL("/account?error=confirmation", request.url),
  );
}
