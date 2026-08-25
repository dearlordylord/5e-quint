import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createDndMcpProtocolServer } from "../../src/protocol-server.ts";
import { createMcpApplicationServices } from "../../src/server.ts";

const applicationServices = createMcpApplicationServices();

export async function handlePrototypeMcpRequest(
  request: Request,
): Promise<Response> {
  if (new URL(request.url).pathname !== "/mcp") {
    return new Response("Not found", { status: 404 });
  }
  const { server } = createDndMcpProtocolServer(applicationServices);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
