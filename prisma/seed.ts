
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

const userIds = [
"0975a62f-5203-4f58-b0c1-3949e3299423",
"09ed0902-dc6a-45af-988f-20542631a962",
"0bf8444a-a887-4ce0-9482-5278a209723f",
"0f6dbb87-3da6-4297-a4c1-ee43a2e84d02",
"1995bd58-17ea-473b-a6d7-ab84322f99b6",
"215a52b4-68e3-4ebd-8831-9740bdffbc91",
"290a1009-96ef-40f9-bfeb-10dd50c1953d",
"44c806d7-4085-45e2-89ea-4c2ccdaa8b48",
"49d39526-4687-499d-9ee4-b28cd4d78d92",
"5622d387-68cf-4f5c-94d2-c34a346f0d1a",
"5d1e35d9-1558-4499-b2de-2cb76465bcf5",
"689128c2-25f7-4dbb-ad0d-8f9202e7b323",
"75ae57f5-191c-470a-8962-4f5de89af286",
"7e6ac31a-8ba2-4e5b-bfa3-ca61717843a6",
"7fdb0326-f733-41db-91a6-5750f5c930a9",
"8b0d4e28-a184-436e-821d-5a58747420ab",
"97a16934-f775-4bb0-9a3e-a238daf897ca",
"9f328710-898c-4ea2-a8c8-cec748da40d8",
"b425b1ae-1cd0-40cd-b965-92d881cfe274",
"b74ec9ba-c624-4d35-8da6-dd0a7f6af558",
"b774f603-452f-49ca-8d98-52510d90055e",
"bb36a0c5-6b0f-4c18-8a57-1828c9256cb0",
"bdc47881-4736-494e-b228-9a97ed107bbb",
"c7468e62-9147-4ac4-b4f5-557327af5299",
"c9dc5358-4bdb-4021-8786-e7b615646929",
"e5920852-610d-4a40-a9e9-d28dee64ebef",
"eb577521-d6f3-45f1-b364-7c448ace1a46",
"fb980ed0-5527-4ad4-802d-64e1319208a4"


];

async function main() {
  // RECIPES
  for (let i = 0; i < 42; i++) {
    await prisma.recipe.create({
      data: {
        userId: userIds[i % userIds.length],
        title: `Recipe ${i + 1}`,
        description: `Delicious homemade recipe ${i + 1}`,
        coverImage: `https://cookreels.s3.ap-southeast-2.amazonaws.com/recipes/cookimages${String(i).padStart(2, "0")}.jpg`,
        cuisine: "Indian",
        cookTime: 20,
        prepTime: 10,
        servings: 4,
        calories: 350,
        difficulty: "MEDIUM",
        isVeg: i % 2 === 0,
        savedCount: Math.floor(Math.random() * 50),
        viewCount: Math.floor(Math.random() * 10000),
        isTrending: i < 5,
      },
    });
  }

  // REELS
  for (let i = 0; i < 50; i++) {
    await prisma.reel.create({
      data: {
        userId: userIds[i % userIds.length],
        title: `Cooking Reel ${i + 1}`,
        description: `Quick cooking reel ${i + 1}`,
        videoUrl: `https://cookreels.s3.ap-southeast-2.amazonaws.com/reels/cookreels${String(i).padStart(2, "0")}.mp4`,
        duration: 10,
        emoji: "🍲",
        savedCount: Math.floor(Math.random() * 200),
        viewCount: Math.floor(Math.random() * 50000),
        isTrending: i < 10,
      },
    });
  }

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

