import { getRequestContext } from "@cloudflare/next-on-pages"

const FALLBACK_URL = "http://49.0.246.137:8765/toolbox/external/emailStock/save"
const FALLBACK_AUTH = "a7#v9k!2m@x3q8d"

type WaitUntilCtx = { waitUntil?: (p: Promise<unknown>) => void }

export function notifyToolboxEmailStock(account: string) {
  try {
    if (!account) return

    let url: string = FALLBACK_URL
    let auth: string = FALLBACK_AUTH
    let ctx: WaitUntilCtx | undefined

    try {
      const reqCtx = getRequestContext()
      const env = ((reqCtx?.env || {}) as unknown as Record<string, string | undefined>)
      if (env.TOOLBOX_EMAIL_STOCK_URL) url = env.TOOLBOX_EMAIL_STOCK_URL
      if (env.TOOLBOX_EMAIL_STOCK_AUTH) auth = env.TOOLBOX_EMAIL_STOCK_AUTH
      ctx = (reqCtx as unknown as { ctx?: WaitUntilCtx })?.ctx
    } catch (err) {
      console.error("toolbox emailStock getRequestContext failed", err)
    }

    let task: Promise<unknown>
    try {
      task = fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth}`,
        },
        body: JSON.stringify({ account }),
      })
        .then(async (res) => {
          if (!res.ok) {
            console.error(`toolbox emailStock non-2xx ${res.status} ${account}`)
          }
        })
        .catch((err) => {
          console.error(`toolbox emailStock fetch failed ${account}`, err)
        })
    } catch (err) {
      console.error(`toolbox emailStock sync error ${account}`, err)
      return
    }

    if (ctx?.waitUntil) {
      try {
        ctx.waitUntil(task)
      } catch (err) {
        console.error("toolbox emailStock waitUntil failed", err)
        task.catch(() => {})
      }
    } else {
      task.catch(() => {})
    }
  } catch (err) {
    console.error("toolbox emailStock outer error", err)
  }
}
