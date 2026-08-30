import { Effect, Fiber } from "effect";
import { describe, expect, test, vi } from "vitest";

import { dndMcpStdioProgram } from "./stdio-server.ts";

describe("MCP stdio server program", () => {
  test("connects the transport and remains alive until interrupted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const connect = vi.fn(async () => {});
    const fiber = Effect.runFork(
      dndMcpStdioProgram(
        { connect },
        { start: vi.fn(), send: vi.fn(), close: vi.fn() },
      ),
    );
    await vi.waitFor(() => expect(connect).toHaveBeenCalledOnce());
    await Effect.runPromise(Fiber.interrupt(fiber));
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  test("reports connection failure and terminates the program", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const exit = await Effect.runPromiseExit(
      dndMcpStdioProgram(
        {
          connect: async () => {
            throw new Error("synthetic transport failure");
          },
        },
        { start: vi.fn(), send: vi.fn(), close: vi.fn() },
      ),
    );
    expect(exit._tag).toBe("Failure");
    expect(error).toHaveBeenCalledWith(
      "MCP server crashed",
      expect.stringContaining("synthetic transport failure"),
    );
    error.mockRestore();
  });
});
