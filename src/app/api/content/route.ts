import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:30";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(cookTime: number | null, prepTime: number | null): string {
  const total = (cookTime ?? 0) + (prepTime ?? 0);
  if (!total) return "30 min";
  if (total >= 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  return `${total} min`;
}

function mapDifficulty(d: string | null): "Easy" | "Medium" | "Hard" {
  if (d === "EASY") return "Easy";
  if (d === "HARD") return "Hard";
  return "Medium";
}

const CREATOR_EMOJIS = ["👨‍🍳", "👩‍🍳", "🧑‍🍳"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "all";
  const q        = searchParams.get("q") || "";
  const type     = searchParams.get("type") || "mixed"; // "recipe" | "reel" | "mixed"
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit    = Math.min(40, parseInt(searchParams.get("limit") || "20", 10));
  const skip     = (page - 1) * limit;

  try {
    const catFilter = category !== "all"
      ? { categories: { some: { category: { slug: category } } } }
      : {};

    const qFilter = q
      ? {
          OR: [
            { title:   { contains: q, mode: "insensitive" as const } },
            { cuisine: { contains: q, mode: "insensitive" as const } },
            { categories: { some: { category: { name: { contains: q, mode: "insensitive" as const } } } } },
          ],
        }
      : {};

    const recipeWhere  = { ...catFilter, ...qFilter, isPublished: true };
    const reelQFilter  = q ? { title: { contains: q, mode: "insensitive" as const } } : {};
    const reelWhere    = { ...catFilter, ...reelQFilter, isPublished: true };

    const recipeLimit = type === "reel"   ? 0 : type === "recipe" ? limit : Math.ceil(limit * 0.67);
    const reelLimit   = type === "recipe" ? 0 : type === "reel"   ? limit : limit - recipeLimit;

    const [recipes, reels] = await Promise.all([
      prisma.recipe.findMany({
        where: recipeWhere,
        take: recipeLimit,
        skip,
        orderBy: [{ isTrending: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
        select: {
          id: true, title: true, description: true, coverImage: true,
          cuisine: true, cookTime: true, prepTime: true, calories: true,
          avgRating: true, ratingCount: true, likeCount: true,
          isVeg: true, difficulty: true, isTrending: true,
          user: { select: { firstName: true, lastName: true, username: true, profileImage: true } },
          categories: {
            take: 4,
            select: { category: { select: { id: true, name: true, slug: true, emoji: true } } },
          },
        },
      }),
      prisma.reel.findMany({
        where: reelWhere,
        take: reelLimit,
        skip,
        orderBy: [{ isTrending: "desc" }, { likeCount: "desc" }, { createdAt: "desc" }],
        select: {
          id: true, title: true, thumbnailUrl: true, videoUrl: true, likeCount: true,
          commentCount: true, duration: true, viewCount: true,
          isTrending: true, gradient: true, emoji: true,
          user: { select: { firstName: true, lastName: true, username: true, profileImage: true } },
          categories: {
            take: 3,
            select: { category: { select: { id: true, name: true, slug: true, emoji: true } } },
          },
        },
      }),
    ]);

    const mappedRecipes = recipes.map((r, i) => ({
      id:           r.id,
      title:        r.title,
      description:  r.description ?? "",
      image:        r.coverImage,
      cuisine:      r.cuisine ?? "Indian",
      time:         formatTime(r.cookTime, r.prepTime),
      calories:     r.calories ?? 350,
      rating:       Number(r.avgRating.toFixed(1)),
      ratingCount:  r.ratingCount,
      creator:      `${r.user.firstName} ${r.user.lastName}`,
      username:     r.user.username,
      creatorEmoji: CREATOR_EMOJIS[i % CREATOR_EMOJIS.length],
      tags:         r.categories.map((c) => c.category.name),
      isVeg:        r.isVeg,
      difficulty:   mapDifficulty(r.difficulty),
      isTrending:   r.isTrending,
    }));

    const mappedReels = reels.map((r, i) => ({
      id:           r.id,
      title:        r.title,
      thumbnail:    r.thumbnailUrl ?? r.videoUrl.replace(/\.mp4$/i, '.jpg'),
      videoUrl:     r.videoUrl,
      creator:      `${r.user.firstName} ${r.user.lastName}`,
      username:     r.user.username,
      creatorEmoji: CREATOR_EMOJIS[i % CREATOR_EMOJIS.length],
      likes:        formatCount(r.likeCount),
      likeCount:    r.likeCount,
      comments:     formatCount(r.commentCount),
      duration:     r.duration,
      views:        formatCount(r.viewCount),
      trending:     r.isTrending,
      gradient:     r.gradient ?? "from-orange-500 to-rose-600",
      emoji:        r.emoji ?? "🍲",
    }));

    return NextResponse.json({ recipes: mappedRecipes, reels: mappedReels });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
