import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const categoryIds: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : [];

    const recipe = await prisma.recipe.create({
      data: {
        userId: session.userId,

        title: body.title,
        description: body.description,

        coverImage: body.coverImage,

        cuisine: body.cuisine,

        cookTime: body.cookTime
          ? Number(body.cookTime)
          : null,

        prepTime: body.prepTime
          ? Number(body.prepTime)
          : null,

        difficulty: body.difficulty,

        isVeg: body.isVeg ?? false,

        categories: categoryIds.length > 0
          ? { create: categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
      },
      include: {
        categories: { include: { category: { select: { id: true, name: true, slug: true, emoji: true, group: true } } } },
      },
    });

    return NextResponse.json(recipe);

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        error: "Recipe creation failed",
      },
      {
        status: 500,
      }
    );
  }
}