import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        emoji: true,
        group: true,
        sortOrder: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
