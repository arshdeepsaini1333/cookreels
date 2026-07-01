import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

// ─── Block relationship helpers ───────────────────────────────────────────────
//
// Blocking is directional in storage (blockerId → blockedId) but symmetric in
// effect: once either side has blocked the other, all discovery surfaces
// (feed, search, explore, profile listings, comments) must hide each party's
// content from the other. Only the profile page itself distinguishes
// direction, since the blocker still needs to see/manage the profile they
// blocked, while the blocked party must not be able to find it at all.

export interface BlockRelation {
  blockedByViewer: boolean // viewer has blocked target
  blockedViewer:   boolean // target has blocked viewer
}

export async function getBlockRelation(
  viewerId: string | null | undefined,
  targetId: string,
): Promise<BlockRelation> {
  if (!viewerId || viewerId === targetId) {
    return { blockedByViewer: false, blockedViewer: false }
  }

  const [byViewer, byTarget] = await Promise.all([
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: targetId } },
      select: { id: true },
    }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: targetId, blockedId: viewerId } },
      select: { id: true },
    }),
  ])

  return { blockedByViewer: !!byViewer, blockedViewer: !!byTarget }
}

// All user ids involved in a block relationship with `userId`, in either
// direction — used to exclude their content from feeds/search/explore.
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })
  const ids = new Set<string>()
  for (const b of blocks) {
    ids.add(b.blockerId === userId ? b.blockedId : b.blockerId)
  }
  return [...ids]
}

// Prisma filter fragment: excludes content whose author has a block
// relationship (either direction) with `userId`. Spread this alongside other
// `NOT` conditions inside a `where` clause on Recipe/Reel — combine via a
// `NOT` array rather than object-spreading two `NOT` keys.
//
// Generic over the concrete WhereInput (Recipe vs Reel) because Prisma's
// generated WhereInput types are structurally near-identical but nominally
// distinct (their recursive AND/OR/NOT fields reference themselves), so a
// single concrete return type can't satisfy both — callers pin T explicitly,
// e.g. `blockedAuthorFilter<Prisma.ReelWhereInput>(uid)`.
export function blockedAuthorFilter<T>(userId: string): T {
  return {
    user: {
      OR: [
        { blocksMade:     { some: { blockedId: userId } } },
        { blocksReceived: { some: { blockerId: userId } } },
      ],
    },
  } as T
}

// Same shape, for filtering User rows directly (e.g. people search).
export function blockedUserFilter(userId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { blocksMade:     { some: { blockedId: userId } } },
      { blocksReceived: { some: { blockerId: userId } } },
    ],
  }
}
