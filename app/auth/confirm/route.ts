import { NextRequest, NextResponse } from "next/server";
import { sessionClient } from "@/lib/server";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash"),
    type = request.nextUrl.searchParams.get("type");
  const client = await sessionClient();
  if (client && token_hash && (type === "email" || type === "recovery")) {
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "recovery" ? "/account/reset" : "/account",
          request.url,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/account?error=confirmation", request.url),
  );
}
