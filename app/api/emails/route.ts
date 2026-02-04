import { createDb } from "@/lib/db"
import { and, eq, gt, lt, or, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { emails } from "@/lib/schema"
import { encodeCursor, decodeCursor } from "@/lib/cursor"
import { getUserId } from "@/lib/apiKey"
import { getUserRole } from "@/lib/auth"
import { ROLES } from "@/lib/permissions"

export const runtime = "edge"

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const userId = await getUserId()

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  
  const db = createDb()

  try {
    // 检查用户是否是管理员
    const userRole = await getUserRole(userId!)
    const isAdmin = userRole === ROLES.EMPEROR

    // 管理员可以看到所有 email，普通用户只能看到自己的
    const baseConditions = isAdmin
      ? gt(emails.expiresAt, new Date())
      : and(
          eq(emails.userId, userId!),
          gt(emails.expiresAt, new Date())
        )

    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(baseConditions)
    const totalCount = Number(totalResult[0].count)

    const conditions = [baseConditions]

    if (cursor) {
      const { timestamp, id } = decodeCursor(cursor)
      conditions.push(
        or(
          lt(emails.createdAt, new Date(timestamp)),
          and(
            eq(emails.createdAt, new Date(timestamp)),
            lt(emails.id, id)
          )
        )
      )
    }

    const results = await db.query.emails.findMany({
      where: and(...conditions),
      orderBy: (emails, { desc }) => [
        desc(emails.createdAt),
        desc(emails.id)
      ],
      limit: PAGE_SIZE + 1,
      with: {
        user: true
      }
    })
    
    const hasMore = results.length > PAGE_SIZE
    const nextCursor = hasMore 
      ? encodeCursor(
          results[PAGE_SIZE - 1].createdAt.getTime(),
          results[PAGE_SIZE - 1].id
        )
      : null
    const emailList = hasMore ? results.slice(0, PAGE_SIZE) : results

    // 如果是管理员，返回创建者用户名
    const emailsWithOwner = isAdmin 
      ? emailList.map(email => ({
          id: email.id,
          address: email.address,
          createdAt: email.createdAt,
          expiresAt: email.expiresAt,
          userId: email.userId,
          ownerName: email.user?.name || email.user?.username || email.user?.email || '未知用户'
        }))
      : emailList.map(email => ({
          id: email.id,
          address: email.address,
          createdAt: email.createdAt,
          expiresAt: email.expiresAt,
          userId: email.userId
        }))

    return NextResponse.json({ 
      emails: emailsWithOwner,
      nextCursor,
      total: totalCount
    })
  } catch (error) {
    console.error('Failed to fetch user emails:', error)
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
} 