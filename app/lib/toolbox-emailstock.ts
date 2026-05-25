const TOOLBOX_URL = "http://toolboxapi.caixukun.de/toolbox/external/emailStock/save"
const TOOLBOX_AUTH = "a7#v9k!2m@x3q8d"
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

export interface ToolboxDebug {
  url: string
  requestHeaders: Record<string, string>
  requestBody: { account: string; password?: string }
  status?: number
  responseHeaders?: Record<string, string>
  responseBody?: string
  elapsedMs: number
  error?: {
    name?: string
    message?: string
    cause?: string
    stack?: string
  }
  skipped?: string
}

/**
 * 同步等待并返回 toolbox 调用全过程，方便直接塞到 /api/emails/generate 的响应里调试。
 * 不再 fire-and-forget；调用方需要 await。
 *
 * password 字段实际存的是 moemail 这条邮箱的 emailId（UUID），
 * 后续 toolbox 要拉这个邮箱的邮件，就用这个 id 调 moemail 的 /api/emails/{emailId}。
 */
export async function notifyToolboxEmailStock(account: string, emailId: string): Promise<ToolboxDebug> {
  const started = Date.now()
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TOOLBOX_AUTH}`,
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
  }
  const requestBody = { account, password: emailId }

  if (!account) {
    return {
      url: TOOLBOX_URL,
      requestHeaders,
      requestBody,
      elapsedMs: 0,
      skipped: "empty-account",
    }
  }

  try {
    const resp = await fetch(TOOLBOX_URL, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    })
    const text = await resp.text()
    return {
      url: TOOLBOX_URL,
      requestHeaders,
      requestBody,
      status: resp.status,
      responseHeaders: Object.fromEntries(resp.headers.entries()),
      responseBody: text.length > 2000 ? `${text.slice(0, 2000)}... [truncated ${text.length} bytes]` : text,
      elapsedMs: Date.now() - started,
    }
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; cause?: unknown; stack?: string }
    return {
      url: TOOLBOX_URL,
      requestHeaders,
      requestBody,
      elapsedMs: Date.now() - started,
      error: {
        name: e?.name,
        message: String(e?.message ?? err),
        cause: e?.cause ? String(e.cause) : undefined,
        stack: e?.stack ? String(e.stack).split("\n").slice(0, 6).join("\n") : undefined,
      },
    }
  }
}
