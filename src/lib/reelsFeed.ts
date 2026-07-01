import { prisma } from '@/lib/prisma'

const GLOW_COLORS = [
  '#c2410c', '#d97706', '#059669', '#db2777',
  '#0284c7', '#7c3aed', '#dc2626', '#65a30d',
]
const DEFAULT_GRADIENTS = [
  'from-[#120200] via-[#220800] to-[#0a0100]',
  'from-[#150500] via-[#261000] to-[#0c0200]',
  'from-[#001205] via-[#00200a] to-[#000802]',
  'from-[#150010] via-[#250020] to-[#0a0008]',
  'from-[#00061a] via-[#000e2d] to-[#00030d]',
  'from-[#0a0015] via-[#140025] to-[#060008]',
]

function strHash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return h
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedRow = {
  id: string
  videoUrl: string
  thumbnailUrl: string | null
  gradient: string | null
  emoji: string | null
  title: string
  description: string | null
  duration: number | null
  isTrending: boolean
  likeCount: number
  commentCount: number
  savedCount: number
  createdAt: Date
  userId: string
  firstName: string
  lastName: string
  username: string
  profileImage: string | null
  isVerified: boolean
  priority: number
  tags: string[] | null
  userLiked: boolean
}

export interface FeedReel {
  id: string
  videoUrl: string
  thumbnailUrl: string | null
  gradient: string
  glow: string
  emoji: string
  recipeTitle: string
  caption: string
  duration: number | null
  isTrending: boolean
  likes: number
  liked: boolean
  comments: number
  saves: number
  tags: string[]
  creator: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
    isVerified: boolean
  }
  relationTag: 'friend' | 'following' | 'follower' | 'recommended'
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

type CursorPayload = { priority: number; createdAt: string; id: string }

export function encodeCursor(priority: number, createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ priority, createdAt: createdAt.toISOString(), id }),
  ).toString('base64url')
}

function decodeCursor(raw: string): CursorPayload | null {
  try {
    const p = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'))
    if (
      typeof p.priority  !== 'number' ||
      typeof p.createdAt !== 'string' ||
      typeof p.id        !== 'string'
    ) return null
    return p as CursorPayload
  } catch {
    return null
  }
}

// ─── Row → FeedReel mapping ───────────────────────────────────────────────────

function mapRow(row: FeedRow): FeedReel {
  const h = strHash(row.id)
  return {
    id:           row.id,
    videoUrl:     row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    gradient:     row.gradient  ?? DEFAULT_GRADIENTS[h % DEFAULT_GRADIENTS.length],
    glow:         GLOW_COLORS[h % GLOW_COLORS.length],
    emoji:        row.emoji     ?? '🍽️',
    recipeTitle:  row.title,
    caption:      row.description ?? '',
    duration:     row.duration,
    isTrending:   row.isTrending,
    likes:        row.likeCount,
    liked:        row.userLiked,
    comments:     row.commentCount,
    saves:        row.savedCount,
    tags:         (row.tags ?? []).map((n: string) => `#${n}`),
    creator: {
      id:           row.userId,
      username:     row.username,
      displayName:  `${row.firstName} ${row.lastName}`.trim(),
      profileImage: row.profileImage,
      isVerified:   row.isVerified,
    },
    relationTag: (
      row.priority === 1 ? 'friend'
    : row.priority === 2 ? 'following'
    : row.priority === 3 ? 'follower'
    : 'recommended'
    ) as FeedReel['relationTag'],
  }
}

// ─── Cursor-based feed query ──────────────────────────────────────────────────
//
// Uses a CTE so the computed `priority` column (derived from GROUP BY aggregates)
// is available for cursor filtering in the outer SELECT — you cannot reference an
// aggregate alias directly in WHERE, only after it's materialised.
//
// Sort order: priority ASC, createdAt DESC, id ASC
// Cursor condition for mixed-direction sort:
//   priority > cur  OR
//   (priority = cur AND createdAt < curCreatedAt)  ← DESC means "older than"
//   (priority = cur AND createdAt = curCreatedAt AND id > curId)  ← stable tie-break

export async function fetchReelsFeedCursor(
  userId: string,
  cursor: string | null,
  limit: number,
): Promise<{ reels: FeedReel[]; nextCursor: string | null; hasMore: boolean }> {
  const fetchLimit = limit + 1
  const cur = cursor ? decodeCursor(cursor) : null

  // NOTE: the cursor condition is inlined directly into the single template below
  // (rather than built as a separate Prisma.sql fragment and spliced in via ${...})
  // because composing two Prisma.sql fragments together breaks parameter
  // renumbering under the @prisma/adapter-pg driver adapter — it silently produces
  // malformed positional placeholders (e.g. "syntax error at or near $5") once the
  // cursor is non-empty. A flat template with nullable params + a NULL guard avoids
  // that fragment-composition path entirely.
  const curPriority  = cur ? cur.priority : null
  const curCreatedAt = cur ? new Date(cur.createdAt) : null
  const curId        = cur ? cur.id : null

  const rows = await prisma.$queryRaw<FeedRow[]>`
    WITH feed AS (
      SELECT
        r.id,
        r."videoUrl",
        r."thumbnailUrl",
        r.gradient,
        r.emoji,
        r.title,
        r.description,
        r.duration,
        r."isTrending",
        r."likeCount",
        r."commentCount",
        r."savedCount",
        r."createdAt",
        u.id           AS "userId",
        u."firstName",
        u."lastName",
        u.username,
        u."profileImage",
        u."isVerified",
        CAST(CASE
          WHEN bool_or(f1."followingId" IS NOT NULL) AND bool_or(f2."followerId" IS NOT NULL) THEN 1
          WHEN bool_or(f1."followingId" IS NOT NULL)                                          THEN 2
          WHEN bool_or(f2."followerId"  IS NOT NULL)                                          THEN 3
          ELSE 4
        END AS INTEGER) AS priority,
        array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
        EXISTS (
          SELECT 1 FROM reel_likes rl
          WHERE rl."reelId" = r.id AND rl."userId" = ${userId}
        ) AS "userLiked"
      FROM reels r
      JOIN users u ON u.id = r."userId"
      LEFT JOIN follows f1
        ON f1."followingId" = r."userId" AND f1."followerId" = ${userId}
      LEFT JOIN follows f2
        ON f2."followerId"  = r."userId" AND f2."followingId" = ${userId}
      LEFT JOIN reel_tags rt ON rt."reelId" = r.id
      LEFT JOIN tags t       ON t.id = rt."tagId"
      WHERE r."isPublished" = true AND r."isBanned" = false
        AND r."userId" != ${userId} AND u."isBanned" = false
        AND (u."privateAccount" = false OR (f1."followingId" IS NOT NULL AND f1.status = 'ACCEPTED'))
        AND NOT EXISTS (
          SELECT 1 FROM reports rep
          WHERE rep."reporterId" = ${userId} AND rep."targetReelId" = r.id
        )
      GROUP BY r.id, u.id
    )
    SELECT * FROM feed
    WHERE (
      ${curPriority}::int IS NULL
      OR priority > ${curPriority}::int
      OR (priority = ${curPriority}::int AND "createdAt" < ${curCreatedAt}::timestamptz)
      OR (priority = ${curPriority}::int AND "createdAt" = ${curCreatedAt}::timestamptz AND id > ${curId}::text)
    )
    ORDER BY priority ASC, "createdAt" DESC, id ASC
    LIMIT ${fetchLimit}
  `

  const hasMore  = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const lastRow  = pageRows[pageRows.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor(lastRow.priority, lastRow.createdAt, lastRow.id)
    : null

  return { reels: pageRows.map(mapRow), nextCursor, hasMore }
}

// ─── Single reel by ID ───────────────────────────────────────────────────────

export async function fetchReelById(
  userId: string,
  reelId: string,
): Promise<FeedReel | null> {
  const rows = await prisma.$queryRaw<FeedRow[]>`
    WITH feed AS (
      SELECT
        r.id,
        r."videoUrl",
        r."thumbnailUrl",
        r.gradient,
        r.emoji,
        r.title,
        r.description,
        r.duration,
        r."isTrending",
        r."likeCount",
        r."commentCount",
        r."savedCount",
        r."createdAt",
        u.id           AS "userId",
        u."firstName",
        u."lastName",
        u.username,
        u."profileImage",
        u."isVerified",
        CAST(CASE
          WHEN bool_or(f1."followingId" IS NOT NULL) AND bool_or(f2."followerId" IS NOT NULL) THEN 1
          WHEN bool_or(f1."followingId" IS NOT NULL)                                          THEN 2
          WHEN bool_or(f2."followerId"  IS NOT NULL)                                          THEN 3
          ELSE 4
        END AS INTEGER) AS priority,
        array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
        EXISTS (
          SELECT 1 FROM reel_likes rl
          WHERE rl."reelId" = r.id AND rl."userId" = ${userId}
        ) AS "userLiked"
      FROM reels r
      JOIN users u ON u.id = r."userId"
      LEFT JOIN follows f1 ON f1."followingId" = r."userId" AND f1."followerId" = ${userId}
      LEFT JOIN follows f2 ON f2."followerId"  = r."userId" AND f2."followingId" = ${userId}
      LEFT JOIN reel_tags rt ON rt."reelId" = r.id
      LEFT JOIN tags t       ON t.id = rt."tagId"
      WHERE r."isPublished" = true AND r."isBanned" = false AND r.id = ${reelId}
        AND u."isBanned" = false
        AND (u."privateAccount" = false OR r."userId" = ${userId} OR (f1."followingId" IS NOT NULL AND f1.status = 'ACCEPTED'))
      GROUP BY r.id, u.id
    )
    SELECT * FROM feed
  `
  return rows.length > 0 ? mapRow(rows[0]) : null
}

// ─── Legacy offset-based (SSR page 1 only) ───────────────────────────────────
//
// For the initial server-side render we call this with page=1 (OFFSET 0).
// Deep-page OFFSET queries are never issued from SSR; all client pagination
// goes through fetchReelsFeedCursor.  We still return nextCursor so the
// client can hand off to cursor-based pagination immediately.

export async function fetchReelsFeed(
  userId: string,
  page: number,
  limit: number,
): Promise<{ reels: FeedReel[]; hasMore: boolean; page: number; totalPages: number; nextCursor: string | null }> {
  const offset     = (page - 1) * limit
  const fetchLimit = limit + 1

  const rows = await prisma.$queryRaw<FeedRow[]>`
    WITH feed AS (
      SELECT
        r.id,
        r."videoUrl",
        r."thumbnailUrl",
        r.gradient,
        r.emoji,
        r.title,
        r.description,
        r.duration,
        r."isTrending",
        r."likeCount",
        r."commentCount",
        r."savedCount",
        r."createdAt",
        u.id           AS "userId",
        u."firstName",
        u."lastName",
        u.username,
        u."profileImage",
        u."isVerified",
        CAST(CASE
          WHEN bool_or(f1."followingId" IS NOT NULL) AND bool_or(f2."followerId" IS NOT NULL) THEN 1
          WHEN bool_or(f1."followingId" IS NOT NULL)                                          THEN 2
          WHEN bool_or(f2."followerId"  IS NOT NULL)                                          THEN 3
          ELSE 4
        END AS INTEGER) AS priority,
        array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL) AS tags,
        EXISTS (
          SELECT 1 FROM reel_likes rl
          WHERE rl."reelId" = r.id AND rl."userId" = ${userId}
        ) AS "userLiked"
      FROM reels r
      JOIN users u ON u.id = r."userId"
      LEFT JOIN follows f1
        ON f1."followingId" = r."userId" AND f1."followerId" = ${userId}
      LEFT JOIN follows f2
        ON f2."followerId"  = r."userId" AND f2."followingId" = ${userId}
      LEFT JOIN reel_tags rt ON rt."reelId" = r.id
      LEFT JOIN tags t       ON t.id = rt."tagId"
      WHERE r."isPublished" = true AND r."isBanned" = false
        AND r."userId" != ${userId} AND u."isBanned" = false
        AND (u."privateAccount" = false OR (f1."followingId" IS NOT NULL AND f1.status = 'ACCEPTED'))
        AND NOT EXISTS (
          SELECT 1 FROM reports rep
          WHERE rep."reporterId" = ${userId} AND rep."targetReelId" = r.id
        )
      GROUP BY r.id, u.id
    )
    SELECT * FROM feed
    ORDER BY priority ASC, "createdAt" DESC, id ASC
    LIMIT ${fetchLimit} OFFSET ${offset}
  `

  const hasMore  = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  const lastRow  = pageRows[pageRows.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor(lastRow.priority, lastRow.createdAt, lastRow.id)
    : null

  return {
    reels: pageRows.map(mapRow),
    hasMore,
    page,
    totalPages: hasMore ? page + 1 : page,
    nextCursor,
  }
}
