import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: "/api/webhooks/stripe",
};

export function middleware(request: NextRequest) {
  // Only allow POST requests
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Ensure content type is raw
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { error: "Invalid content type" },
      { status: 400 }
    );
  }

  return NextResponse.next();
}
