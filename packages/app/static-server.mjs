import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, resolve, sep } from "node:path"
import { pipeline } from "node:stream/promises"

const root = resolve(process.argv[2] ?? "/app")
const configuredPort = Number(process.argv[3] ?? process.env.PORT ?? "5000")
if (!Number.isInteger(configuredPort) || configuredPort < 0) {
  throw new Error("Static application port must be a non-negative integer.")
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
])

const server = createServer(async (request, response) => {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" }).end()
      return
    }
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname
    const requested = pathname === "/" || extname(pathname) === "" ? "index.html" : pathname.slice(1)
    const path = resolve(root, requested)
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      response.writeHead(404).end()
      return
    }
    const status = await stat(path)
    if (!status.isFile()) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, {
      "content-length": status.size,
      "content-type": contentTypes.get(extname(path)) ?? "application/octet-stream"
    })
    if (request.method === "HEAD") {
      response.end()
      return
    }
    await pipeline(createReadStream(path), response)
  } catch {
    if (!response.headersSent) response.writeHead(404).end()
  }
})

server.listen(configuredPort, "0.0.0.0", () => {
  const address = server.address()
  if (address === null || typeof address === "string") process.exit(70)
  process.stdout.write(`${address.port}\n`)
})

let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  server.close((error) => {
    process.exitCode = error === undefined ? 0 : 1
  })
  server.closeIdleConnections()
}
process.once("SIGINT", stop)
process.once("SIGTERM", stop)
