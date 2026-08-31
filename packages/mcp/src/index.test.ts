import { describe, expect, test, vi } from "vitest";

const entrypoint = vi.hoisted(() => ({
  connect: vi.fn(async () => {}),
  runMain: vi.fn(),
}));

vi.mock("@effect/platform-node", () => ({
  NodeRuntime: { runMain: entrypoint.runMain },
}));
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class StdioServerTransport {},
}));
vi.mock("./protocol-server.ts", () => ({
  createDndMcpProtocolServer: () => ({
    server: { connect: entrypoint.connect },
  }),
}));

describe("MCP stdio entrypoint", () => {
  test("hands the composed never-ending program to NodeRuntime", async () => {
    await import("./index.ts");

    expect(entrypoint.runMain).toHaveBeenCalledWith(expect.anything(), {
      disableErrorReporting: true,
    });
  });
});
