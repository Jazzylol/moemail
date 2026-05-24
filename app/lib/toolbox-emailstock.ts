const TOOLBOX_URL = "http://toolboxapi.caixukun.de/toolbox/external/emailStock/save"
const TOOLBOX_AUTH = "a7#v9k!2m@x3q8d"
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"

type WaitUntilCtx = { waitUntil?: (p: Promise<unknown>) => void }

export function notifyToolboxEmailStock(account: string, ctx?: WaitUntilCtx) {
  try {
    if (!account) return

    let task: Promise<unknown>
    try {
      task = fetch(TOOLBOX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOOLBOX_AUTH}`,
          "User-Agent": USER_AGENT,
          "Accept": "application/json, text/plain, */*",
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
