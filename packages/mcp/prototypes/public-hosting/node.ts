import { createServer } from "node:http";

import { handlePrototypeMcpRequest } from "./handler.ts";

const port = 8787;

createServer(async (incoming, outgoing) => {
  const body = await requestBody(incoming);
  const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
    headers: new Headers(incoming.headers as Record<string, string>),
    ...(incoming.method === undefined ? {} : { method: incoming.method }),
    ...(body.byteLength === 0 ? {} : { body }),
  });
  const response = await handlePrototypeMcpRequest(request);
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(new Uint8Array(await response.arrayBuffer()));
}).listen(port, "127.0.0.1", () => {
  process.stderr.write(
    `prototype MCP listening on http://127.0.0.1:${port}/mcp\n`,
  );
});

async function requestBody(
  incoming: import("node:http").IncomingMessage,
): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
