// One-time correction: recompute likeCount/commentCount on reels and recipes
// from the actual reel_likes/recipe_likes/reel_comments/recipe_comments rows.
// These counters had been seeded with random placeholder numbers (see prisma/seed.ts)
// that didn't reflect real user activity.
import pkg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const { Pool } = pkg

// Load .env
const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const before = await pool.query(`
  SELECT
    (SELECT COALESCE(SUM("likeCount"), 0) FROM reels)    AS reel_likes_before,
    (SELECT COALESCE(SUM("commentCount"), 0) FROM reels) AS reel_comments_before,
    (SELECT COALESCE(SUM("likeCount"), 0) FROM recipes)    AS recipe_likes_before,
    (SELECT COALESCE(SUM("commentCount"), 0) FROM recipes) AS recipe_comments_before
`)
console.log('Before:', before.rows[0])

const reelsResult = await pool.query(`
  UPDATE reels
  SET
    "likeCount" = (SELECT COUNT(*) FROM reel_likes WHERE reel_likes."reelId" = reels.id),
    "commentCount" = (SELECT COUNT(*) FROM reel_comments WHERE reel_comments."reelId" = reels.id)
`)
console.log(`✓ Recomputed counts for ${reelsResult.rowCount} reel(s).`)

const recipesResult = await pool.query(`
  UPDATE recipes
  SET
    "likeCount" = (SELECT COUNT(*) FROM recipe_likes WHERE recipe_likes."recipeId" = recipes.id),
    "commentCount" = (SELECT COUNT(*) FROM recipe_comments WHERE recipe_comments."recipeId" = recipes.id)
`)
console.log(`✓ Recomputed counts for ${recipesResult.rowCount} recipe(s).`)

const after = await pool.query(`
  SELECT
    (SELECT COALESCE(SUM("likeCount"), 0) FROM reels)    AS reel_likes_after,
    (SELECT COALESCE(SUM("commentCount"), 0) FROM reels) AS reel_comments_after,
    (SELECT COALESCE(SUM("likeCount"), 0) FROM recipes)    AS recipe_likes_after,
    (SELECT COALESCE(SUM("commentCount"), 0) FROM recipes) AS recipe_comments_after
`)
console.log('After:', after.rows[0])

await pool.end()
