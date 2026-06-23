import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export async function GET() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Count published recipes per user in the rolling 30-day window
    const topCounts = await prisma.recipe.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, isPublished: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    if (topCounts.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = topCounts.map((r) => r.userId);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profileImage: true,
        cuisineSpecialty: true,
        _count: { select: { followers: true } },
      },
    });

    // Preserve the ranking order from topCounts
    const countMap = new Map(topCounts.map((r) => [r.userId, r._count.id]));
    const userMap  = new Map(users.map((u) => [u.id, u]));

    const result = userIds
      .map((id) => {
        const u = userMap.get(id);
        if (!u) return null;
        return {
          id:             u.id,
          name:           `${u.firstName} ${u.lastName}`,
          username:       u.username,
          profileImage:   u.profileImage,
          specialty:      u.cuisineSpecialty ?? "Chef",
          followers:      formatCount(u._count.followers),
          followerCount:  u._count.followers,
          recipeCount:    countMap.get(id) ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch top creators" }, { status: 500 });
  }
}
