import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import type { ReportType, ReportReason } from '@/generated/prisma'
import { sendReportNotificationEmail, type ReportNotificationData } from '@/lib/email'

const BAN_THRESHOLD = 500
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const TARGET_FIELD: Record<string, string> = {
  USER:           'targetUserId',
  RECIPE:         'targetRecipeId',
  REEL:           'targetReelId',
  RECIPE_COMMENT: 'targetRecipeCommentId',
  REEL_COMMENT:   'targetReelCommentId',
}

const TARGET_LABEL: Record<string, string> = {
  USER:           'User',
  RECIPE:         'Recipe',
  REEL:           'Reel',
  RECIPE_COMMENT: 'Recipe Comment',
  REEL_COMMENT:   'Reel Comment',
}

// Gathers a human-readable summary of the reported item (and its owner/parent
// post, for comments) so the moderation alert email is self-contained.
async function buildTargetDetails(
  type: string,
  targetId: string,
): Promise<ReportNotificationData['target']> {
  const label = TARGET_LABEL[type]

  if (type === 'USER') {
    const user = await prisma.user.findUnique({
      where:  { id: targetId },
      select: { firstName: true, lastName: true, username: true, email: true },
    })
    return {
      label,
      id:      targetId,
      summary: user ? `${user.firstName} ${user.lastName} (@${user.username})` : '(user not found)',
      link:    user ? `${APP_URL}/user/${user.username}` : undefined,
      ownerName:     user ? `${user.firstName} ${user.lastName}` : undefined,
      ownerUsername: user?.username,
      ownerEmail:    user?.email,
    }
  }

  if (type === 'RECIPE') {
    const recipe = await prisma.recipe.findUnique({
      where:  { id: targetId },
      select: { title: true, user: { select: { firstName: true, lastName: true, username: true, email: true } } },
    })
    return {
      label,
      id:      targetId,
      summary: recipe?.title ?? '(recipe not found)',
      link:    `${APP_URL}/recipe/${targetId}`,
      ownerName:     recipe ? `${recipe.user.firstName} ${recipe.user.lastName}` : undefined,
      ownerUsername: recipe?.user.username,
      ownerEmail:    recipe?.user.email,
    }
  }

  if (type === 'REEL') {
    const reel = await prisma.reel.findUnique({
      where:  { id: targetId },
      select: { title: true, user: { select: { firstName: true, lastName: true, username: true, email: true } } },
    })
    return {
      label,
      id:      targetId,
      summary: reel?.title ?? '(reel not found)',
      link:    `${APP_URL}/reel/${targetId}`,
      ownerName:     reel ? `${reel.user.firstName} ${reel.user.lastName}` : undefined,
      ownerUsername: reel?.user.username,
      ownerEmail:    reel?.user.email,
    }
  }

  if (type === 'RECIPE_COMMENT') {
    const comment = await prisma.recipeComment.findUnique({
      where:  { id: targetId },
      select: {
        content: true,
        user:    { select: { firstName: true, lastName: true, username: true, email: true } },
        recipe:  { select: { id: true, title: true } },
      },
    })
    return {
      label,
      id:      targetId,
      summary: comment?.content ?? '(comment not found)',
      ownerName:     comment ? `${comment.user.firstName} ${comment.user.lastName}` : undefined,
      ownerUsername: comment?.user.username,
      ownerEmail:    comment?.user.email,
      parentLabel: comment ? `Recipe: ${comment.recipe.title}` : undefined,
      parentLink:  comment ? `${APP_URL}/recipe/${comment.recipe.id}` : undefined,
    }
  }

  // REEL_COMMENT
  const comment = await prisma.reelComment.findUnique({
    where:  { id: targetId },
    select: {
      content: true,
      user:    { select: { firstName: true, lastName: true, username: true, email: true } },
      reel:    { select: { id: true, title: true } },
    },
  })
  return {
    label,
    id:      targetId,
    summary: comment?.content ?? '(comment not found)',
    ownerName:     comment ? `${comment.user.firstName} ${comment.user.lastName}` : undefined,
    ownerUsername: comment?.user.username,
    ownerEmail:    comment?.user.email,
    parentLabel: comment ? `Reel: ${comment.reel.title}` : undefined,
    parentLink:  comment ? `${APP_URL}/reel/${comment.reel.id}` : undefined,
  }
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

  const report = await prisma.report.create({
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

  let autoBanned = false
  if (count >= BAN_THRESHOLD) {
    const modelActions: Record<string, () => Promise<unknown>> = {
      USER:           () => prisma.user.update({          where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      RECIPE:         () => prisma.recipe.update({        where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      REEL:           () => prisma.reel.update({          where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      RECIPE_COMMENT: () => prisma.recipeComment.update({ where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
      REEL_COMMENT:   () => prisma.reelComment.update({   where: { id: targetId }, data: { isBanned: true, bannedAt: new Date() } }),
    }
    await modelActions[type]()
    autoBanned = true
  }

  // Notify moderation inbox with full context. Best-effort — a delivery
  // failure here shouldn't fail the user's report submission.
  try {
    const reporter = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { firstName: true, lastName: true, username: true, email: true },
    })
    if (reporter) {
      const target = await buildTargetDetails(type, targetId)
      await sendReportNotificationEmail({
        reportId:    report.id,
        type,
        reason,
        description: report.description,
        createdAt:   report.createdAt,
        reporter: {
          id:       session.userId,
          name:     `${reporter.firstName} ${reporter.lastName}`,
          username: reporter.username,
          email:    reporter.email,
        },
        target,
        totalReportsForTarget: count,
        autoBanned,
      })
    }
  } catch (err) {
    console.error('Failed to send report notification email:', err)
  }

  return NextResponse.json({ message: 'Report submitted' }, { status: 201 })
}
