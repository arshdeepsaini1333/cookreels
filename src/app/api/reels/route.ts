import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

    const reel = await prisma.reel.create({
      data: {
        userId: body.userId,

        title: body.title,

        description: body.description,

        videoUrl: body.videoUrl,

        thumbnailUrl: body.thumbnailUrl,

        duration: body.duration
          ? Number(body.duration)
          : null,

        gradient: body.gradient,

        emoji: body.emoji,

        categories: categoryIds.length > 0
          ? { create: categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
      },
      include: {
        categories: { include: { category: { select: { id: true, name: true, slug: true, emoji: true, group: true } } } },
      },
    });

    return NextResponse.json(reel);

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error: "Reel creation failed",
      },
      {
        status: 500,
      }
    );
  }
}