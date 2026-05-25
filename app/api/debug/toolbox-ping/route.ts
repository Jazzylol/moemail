import { NextResponse } from "next/server"

export const runtime = "edge"

const TOOLBOX_URL = "http://toolboxapi.caixukun.de/toolbox/external/emailStock/save"
const TOOLBOX_AUTH = "a7#v9k!2m@x3q8d"
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

// 调试端点：从 CF Workers runtime 主动打 toolbox，把结果/异常原样返回
// 浏览器访问 https://mailweb.caixukun.de/api/debug/toolbox-ping 一次就知道 CF→toolbox 这条路通不通
export async function GET() {
  const account = `cf_ping_${Date.now()}@delete.me`
  const started = Date.now()

  try {
    const resp = await fetch(TOOLBOX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOOLBOX_AUTH}`,
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/plain, */*",
      },
      body: JSON.stringify({ account }),
    })

    const text = await resp.text()
    return NextResponse.json({
      ok: resp.ok,
      status: resp.status,
      elapsed_ms: Date.now() - started,
      url: TOOLBOX_URL,
      account_tried: account,
      response_headers: Object.fromEntries(resp.headers.entries()),
      body: text.slice(0, 2000),
    })
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; stack?: string; cause?: unknown }
    return NextResponse.json({
      ok: false,
      elapsed_ms: Date.now() - started,
      url: TOOLBOX_URL,
      account_tried: account,
      error_name: e?.name,
      error_message: String(e?.message ?? err),
      error_cause: e?.cause ? String(e.cause) : undefined,
      stack: e?.stack ? String(e.stack).split("\n").slice(0, 6).join("\n") : undefined,
    }, { status: 200 })
  }
}
