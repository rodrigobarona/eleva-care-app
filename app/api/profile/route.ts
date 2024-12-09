import { auth } from "@clerk/nextjs/server";
import { updateProfile } from "@/server/actions/profile";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const result = await updateProfile(userId, body);

    if (result.error) {
      return new Response(result.error, { status: 500 });
    }

    return new Response("OK");
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
