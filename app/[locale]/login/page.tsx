import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Locale } from "@/i18n/config"
import { getTurnstileConfig } from "@/lib/turnstile"
import { getRequestContext } from "@cloudflare/next-on-pages"

export const runtime = "edge"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: localeFromParams } = await params
  const locale = localeFromParams as Locale
  const session = await auth()
  
  if (session?.user) {
    redirect(`/${locale}`)
  }

  const turnstile = await getTurnstileConfig()
  // 注册开关：默认关闭，仅显式开启（"true"）时才显示注册入口
  const registrationEnabled =
    (await getRequestContext().env.SITE_CONFIG.get("REGISTRATION_ENABLED")) === "true"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <LoginForm
        turnstile={{ enabled: turnstile.enabled, siteKey: turnstile.siteKey }}
        registrationEnabled={registrationEnabled}
      />
    </div>
  )
}
