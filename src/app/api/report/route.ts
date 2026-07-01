import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import type { ReportType, ReportReason } from '@/generated/prisma'

const BAN_THRESHOLD = 500

const TARGET_FIELD: Record<string, string> = {
  USER:           'targetUserId',
  RECIPE:         'targetRecipeId',
  REEL:           'targetReelId',
  RECIPE_COMMENT: 'targetRecipeCommentId',
  REEL_COMMENT:   'targetReelCommentId',
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { type?: string; targetId?: string; reason?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, targetId, reason, description } = body

  if (!type || !TARGET_FIELD[type]) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
  }

  const validReasons: ReportReason[] = [
    'SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT',
    'HATE_SPEECH', 'MISINFORMATION', 'VIOLENCE', 'OTHER',
  ]
  if (!reason || !validReasons.includes(reason as ReportReason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  if (type === 'USER' && targetId === session.userId) {
    return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 })
  }

  const targetField = TARGET_FIELD[type]

  // Prevent duplicate reports
  const existing = await prisma.report.findFirst({
    where: { reporterId: session.userId, [targetField]: targetId },
  })
  if (existing) {
    return NextResponse.json({ error: 'Already reported' }, { status: 409 })
  }

  await prisma.report.create({
    data: {
      reporterId:  session.userId,
      type:        type as ReportType,
      reason:      reason as ReportReason,
      description: description ? description.slice(0, 500) : null,
      [targetField]: targetId,
    },
  })

  // Count total reports for this target and auto-ban at threshold
  const count = await prisma.report.count({
    where: { [targetField]: targetId },
  })

  if (count >= BAN_THRESHOLD) {
    const modelActions: Record<string, () => Promise<unknown>> = {
      USER:           () => prisma.user.update({          where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      RECIPE:         () => prisma.recipe.update({        where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      REEL:           () => prisma.reel.update({          where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      RECIPE_COMMENT: () => prisma.recipeComment.update({ where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      REEL_COMMENT:   () => prisma.reelComment.update({   where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
    }
    await modelActions[type]()
  }

  return NextResponse.json({ message: 'Report submitted' }, { status: 201 })
}
