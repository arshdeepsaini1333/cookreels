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
      data: { backgroundPicture: fileUrl },
      select: { backgroundPicture: true },
    });

    return NextResponse.json({ url: user.backgroundPicture });
  } catch {
    return NextResponse.json({ error: "Failed to update background picture" }, { status: 500 });
  }
}
