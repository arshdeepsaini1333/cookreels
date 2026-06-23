import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const categories = [
  // Meals
  { name: "Breakfast",   slug: "breakfast",   emoji: "☀️",  group: "Meals",          sortOrder: 1 },
  { name: "Lunch",       slug: "lunch",       emoji: "🍱",  group: "Meals",          sortOrder: 2 },
  { name: "Dinner",      slug: "dinner",      emoji: "🌙",  group: "Meals",          sortOrder: 3 },
  { name: "Brunch",      slug: "brunch",      emoji: "🥞",  group: "Meals",          sortOrder: 4 },
  { name: "Snacks",      slug: "snacks",      emoji: "🍿",  group: "Meals",          sortOrder: 5 },
  { name: "Appetizer",   slug: "appetizer",   emoji: "🥗",  group: "Meals",          sortOrder: 6 },

  // Sweets & Drinks
  { name: "Sweet Dish",  slug: "sweet-dish",  emoji: "🍰",  group: "Sweets & Drinks", sortOrder: 7 },
  { name: "Dessert",     slug: "dessert",     emoji: "🧁",  group: "Sweets & Drinks", sortOrder: 8 },
  { name: "Shakes",      slug: "shakes",      emoji: "🥤",  group: "Sweets & Drinks", sortOrder: 9 },
  { name: "Smoothies",   slug: "smoothies",   emoji: "🥝",  group: "Sweets & Drinks", sortOrder: 10 },
  { name: "Juice",       slug: "juice",       emoji: "🍹",  group: "Sweets & Drinks", sortOrder: 11 },
  { name: "Beverages",   slug: "beverages",   emoji: "☕",  group: "Sweets & Drinks", sortOrder: 12 },

  // Indian Cuisine
  { name: "North Indian", slug: "north-indian", emoji: "🫓", group: "Indian Cuisine", sortOrder: 13 },
  { name: "South Indian", slug: "south-indian", emoji: "🥘", group: "Indian Cuisine", sortOrder: 14 },
  { name: "Punjabi",      slug: "punjabi",      emoji: "🧆", group: "Indian Cuisine", sortOrder: 15 },
  { name: "Bengali",      slug: "bengali",      emoji: "🐟", group: "Indian Cuisine", sortOrder: 16 },
  { name: "Rajasthani",   slug: "rajasthani",   emoji: "🌵", group: "Indian Cuisine", sortOrder: 17 },
  { name: "Street Food",  slug: "street-food",  emoji: "🌮", group: "Indian Cuisine", sortOrder: 18 },
  { name: "Mughlai",      slug: "mughlai",      emoji: "🍖", group: "Indian Cuisine", sortOrder: 19 },
  { name: "Gujarati",     slug: "gujarati",     emoji: "🫘", group: "Indian Cuisine", sortOrder: 20 },

  // World Cuisine
  { name: "Chinese",       slug: "chinese",       emoji: "🥡", group: "World Cuisine", sortOrder: 21 },
  { name: "Italian",       slug: "italian",       emoji: "🍝", group: "World Cuisine", sortOrder: 22 },
  { name: "Mexican",       slug: "mexican",       emoji: "🌯", group: "World Cuisine", sortOrder: 23 },
  { name: "Thai",          slug: "thai",          emoji: "🍜", group: "World Cuisine", sortOrder: 24 },
  { name: "Japanese",      slug: "japanese",      emoji: "🍣", group: "World Cuisine", sortOrder: 25 },
  { name: "Korean",        slug: "korean",        emoji: "🥢", group: "World Cuisine", sortOrder: 26 },
  { name: "Mediterranean", slug: "mediterranean", emoji: "🫒", group: "World Cuisine", sortOrder: 27 },
  { name: "American",      slug: "american",      emoji: "🍔", group: "World Cuisine", sortOrder: 28 },
  { name: "French",        slug: "french",        emoji: "🥐", group: "World Cuisine", sortOrder: 29 },
  { name: "Spanish",       slug: "spanish",       emoji: "🥘", group: "World Cuisine", sortOrder: 30 },
  { name: "Greek",         slug: "greek",         emoji: "🫙", group: "World Cuisine", sortOrder: 31 },
  { name: "Middle Eastern",slug: "middle-eastern",emoji: "🧆", group: "World Cuisine", sortOrder: 32 },
  { name: "Turkish",       slug: "turkish",       emoji: "🥙", group: "World Cuisine", sortOrder: 33 },
  { name: "Vietnamese",    slug: "vietnamese",    emoji: "🍲", group: "World Cuisine", sortOrder: 34 },

  // Dietary
  { name: "Vegetarian",  slug: "vegetarian",  emoji: "🥦", group: "Dietary", sortOrder: 35 },
  { name: "Vegan",       slug: "vegan",       emoji: "🌱", group: "Dietary", sortOrder: 36 },
  { name: "Non-Veg",     slug: "non-veg",     emoji: "🍗", group: "Dietary", sortOrder: 37 },
  { name: "Gluten-Free", slug: "gluten-free", emoji: "🌾", group: "Dietary", sortOrder: 38 },
  { name: "Keto",        slug: "keto",        emoji: "🥑", group: "Dietary", sortOrder: 39 },
  { name: "Healthy",     slug: "healthy",     emoji: "💪", group: "Dietary", sortOrder: 40 },
  { name: "Low-Calorie", slug: "low-calorie", emoji: "🥗", group: "Dietary", sortOrder: 41 },

  // Special
  { name: "Quick Meals", slug: "quick-meals", emoji: "⚡", group: "Special", sortOrder: 42 },
  { name: "Baking",      slug: "baking",      emoji: "🍞", group: "Special", sortOrder: 43 },
  { name: "BBQ & Grill", slug: "bbq-grill",   emoji: "🔥", group: "Special", sortOrder: 44 },
  { name: "Soups",       slug: "soups",       emoji: "🍲", group: "Special", sortOrder: 45 },
  { name: "Salads",      slug: "salads",      emoji: "🥬", group: "Special", sortOrder: 46 },
  { name: "Sandwiches",  slug: "sandwiches",  emoji: "🥪", group: "Special", sortOrder: 47 },
  { name: "Festive",     slug: "festive",     emoji: "🎉", group: "Special", sortOrder: 48 },
  { name: "Kids Menu",   slug: "kids-menu",   emoji: "🧒", group: "Special", sortOrder: 49 },
  { name: "Other",       slug: "other",       emoji: "✨", group: "Special", sortOrder: 50 },
];

async function main() {
  console.log("Seeding categories...");

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, emoji: cat.emoji, group: cat.group, sortOrder: cat.sortOrder },
      create: cat,
    });
  }

  console.log(`Done — ${categories.length} categories seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
