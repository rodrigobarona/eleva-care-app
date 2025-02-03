import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyAndUpdateSpecificExpert } from "@/server/actions/experts";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify if the user is an admin
    const user = await clerkClient.users.getUser(userId);
    const isAdmin = user.publicMetadata?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can verify other experts" },
        { status: 403 }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await verifyAndUpdateSpecificExpert(email);

    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in verify-specific endpoint:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
