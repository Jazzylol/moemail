import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { register } from "@/lib/auth"
import { authSchema, AuthSchema } from "@/lib/validation"
import { verifyTurnstileToken } from "@/lib/turnstile"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    // 注册开关：仅当显式开启（"true"）时放行，默认关闭（KV 未设置即视为关闭）
    const registrationEnabled = await getRequestContext().env.SITE_CONFIG.get("REGISTRATION_ENABLED")
    if (registrationEnabled !== "true") {
      return NextResponse.json({ error: "注册已关闭" }, { status: 403 })
    }

    const json = await request.json() as AuthSchema

    try {
      authSchema.parse(json)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "输入格式不正确" },
        { status: 400 }
      )
    }

    const { username, password, turnstileToken } = json

    const verification = await verifyTurnstileToken(turnstileToken)
    if (!verification.success) {
      const message = verification.reason === "missing-token"
        ? "请先完成安全验证"
        : "安全验证未通过"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const user = await register(username, password)

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "注册失败" },
      { status: 500 }
    )
  }
} 
