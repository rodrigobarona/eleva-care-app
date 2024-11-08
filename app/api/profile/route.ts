import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";
import { profileActionSchema } from "@/schema/profile";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const data = profileActionSchema.parse({
      ...body,
      clerkUserId: userId,
    });

    await db.insert(ProfileTable).values(data).onConflictDoUpdate({
      target: ProfileTable.clerkUserId,
      set: data,
    });

    return new Response("OK");
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
