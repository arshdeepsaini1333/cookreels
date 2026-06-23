import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const MEAL_CATS    = ["breakfast", "lunch", "dinner", "snacks", "brunch", "appetizer"];
const CUISINE_CATS = ["north-indian", "south-indian", "punjabi", "bengali", "street-food", "mughlai", "gujarati", "chinese", "italian", "mexican", "american", "thai"];
const DIETARY_CATS = ["vegetarian", "non-veg", "healthy", "keto", "vegan", "low-calorie"];
const SPECIAL_CATS = ["quick-meals", "baking", "soups", "salads", "sandwiches", "festive", "kids-menu", "bbq-grill"];
const SWEET_CATS   = ["dessert", "sweet-dish", "shakes", "smoothies", "juice", "beverages"];

async function main() {
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  const recipes = await prisma.recipe.findMany({
    select: { id: true, isVeg: true, isTrending: true },
    orderBy: { createdAt: "asc" },
  });

  const reels = await prisma.reel.findMany({
    select: { id: true, isTrending: true },
    orderBy: { createdAt: "asc" },
  });

  // Clear existing assignments for idempotency
  await prisma.recipeCategory.deleteMany({});
  await prisma.reelCategory.deleteMany({});

  // ── Recipes ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const slugs = new Set<string>();

    // Dietary preference
    slugs.add(recipe.isVeg ? DIETARY_CATS[(i % 3 === 2) ? 4 : 0] : "non-veg"); // veg rotates vegetarian/vegan/healthy

    // Meal type — cycle through all 6
    slugs.add(MEAL_CATS[i % MEAL_CATS.length]);

    // Cuisine — cycle through, offset by block of 6
    slugs.add(CUISINE_CATS[Math.floor(i / MEAL_CATS.length) % CUISINE_CATS.length]);

    // Trending → quick-meals
    if (recipe.isTrending) slugs.add("quick-meals");

    // Every 3rd recipe gets a special category
    if (i % 3 === 0) slugs.add(SPECIAL_CATS[Math.floor(i / 3) % SPECIAL_CATS.length]);

    // Last 10 recipes get a sweet/drink category (dessert-style recipes)
    if (i >= recipes.length - 10) slugs.add(SWEET_CATS[i % SWEET_CATS.length]);

    // Second cuisine category for variety (every 4th)
    if (i % 4 === 1) slugs.add(CUISINE_CATS[(Math.floor(i / 4) + 3) % CUISINE_CATS.length]);

    const valid = Array.from(slugs).filter((s) => catMap[s]);
    await prisma.recipeCategory.createMany({
      data: valid.map((slug) => ({ recipeId: recipe.id, categoryId: catMap[slug] })),
      skipDuplicates: true,
    });
  }

  // ── Reels ────────────────────────────────────────────────────────────────────
  for (let i = 0; i < reels.length; i++) {
    const reel = reels[i];
    const slugs = new Set<string>();

    // Meal type
    slugs.add(MEAL_CATS[i % MEAL_CATS.length]);

    // Cuisine — different offset from recipes for variety
    slugs.add(CUISINE_CATS[(i + 4) % CUISINE_CATS.length]);

    // Trending → quick-meals
    if (reel.isTrending) slugs.add("quick-meals");

    // Alternate dietary
    slugs.add(i % 2 === 0 ? "vegetarian" : "non-veg");

    // Every 4th reel gets a sweet/drink category
    if (i % 4 === 0) slugs.add(SWEET_CATS[Math.floor(i / 4) % SWEET_CATS.length]);

    // Every 5th reel gets a special category
    if (i % 5 === 0) slugs.add(SPECIAL_CATS[Math.floor(i / 5) % SPECIAL_CATS.length]);

    const valid = Array.from(slugs).filter((s) => catMap[s]);
    await prisma.reelCategory.createMany({
      data: valid.map((slug) => ({ reelId: reel.id, categoryId: catMap[slug] })),
      skipDuplicates: true,
    });
  }

  const rcCount = await prisma.recipeCategory.count();
  const rlCount = await prisma.reelCategory.count();
  console.log(`Done — ${rcCount} recipe-category links, ${rlCount} reel-category links`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
