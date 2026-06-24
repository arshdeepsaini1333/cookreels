import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { fileUrl?: string };
    const { fileUrl } = body;

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { profileImage: fileUrl },
      select: { profileImage: true },
    });

    return NextResponse.json({ url: user.profileImage });
  } catch {
    return NextResponse.json({ error: "Failed to update profile picture" }, { status: 500 });
  }
}
