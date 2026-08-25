import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const endpoint = new URL(process.argv[2] ?? "http://127.0.0.1:8787/mcp");
const client = new Client({ name: "public-hosting-probe", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(endpoint);

const startedAt = performance.now();
// SDK 1.29's transport declarations do not satisfy exactOptionalPropertyTypes,
// although StreamableHTTPClientTransport explicitly implements Transport.
await client.connect(transport as Transport);
const initializedAt = performance.now();
const tools = await client.listTools();
const listedAt = performance.now();
const catalog = await client.callTool({
  name: "list_catalog_units",
  arguments: {},
});
const completedAt = performance.now();

process.stdout.write(
  `${JSON.stringify(
    {
      endpoint: endpoint.toString(),
      advertisedToolCount: tools.tools.length,
      toolCatalogBytes: Buffer.byteLength(JSON.stringify(tools)),
      catalogResultBytes: Buffer.byteLength(JSON.stringify(catalog)),
      initializeMilliseconds: initializedAt - startedAt,
      listToolsMilliseconds: listedAt - initializedAt,
      catalogCallMilliseconds: completedAt - listedAt,
    },
    null,
    2,
  )}\n`,
);

await transport.close();
