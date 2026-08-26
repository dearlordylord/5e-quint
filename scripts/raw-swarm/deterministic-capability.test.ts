import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

describe("deterministic guarded repository phase", () => {
  test("rejects a network global", () => {
    const networkGlobal = ["fe", "tch"].join("");
    expect(() => Reflect.get(globalThis, networkGlobal)).toThrow(
      /blocked network capability/,
    );
  });

  test("rejects a coding-agent child process", () => {
    const codingAgentExecutable = ["co", "dex"].join("");
    expect(() =>
      spawnSync(codingAgentExecutable, [], { stdio: "ignore" }),
    ).toThrow(/blocked coding-agent capability/);
  });
});
