import { readFileSync } from "node:fs";

type ReviewInvocationPolicyResult =
  | { readonly tag: "valid" }
  | { readonly tag: "invalid"; readonly message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function reviewInvocationPolicy(
  events: readonly unknown[],
): ReviewInvocationPolicyResult {
  const toolItem = events.find((event) => {
    if (
      !isRecord(event) ||
      (event.type !== "item.started" && event.type !== "item.completed")
    )
      return false;
    const item = event.item;
    return (
      isRecord(item) &&
      typeof item.type === "string" &&
      !["agent_message", "reasoning", "todo_list"].includes(item.type)
    );
  });
  return toolItem === undefined
    ? { tag: "valid" }
    : {
        tag: "invalid",
        message:
          "Reviewer invocation used a tool instead of the evidence packet.",
      };
}

function fail(message: string): never {
  throw new Error(message);
}

function main(args: readonly string[]): void {
  const [eventsPath, ...unexpected] = args;
  if (eventsPath === undefined || unexpected.length > 0) {
    fail("Usage: review-invocation-policy.ts <events.jsonl>");
  }
  const events = readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
  const result = reviewInvocationPolicy(events);
  if (result.tag === "invalid") fail(result.message);
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("review-invocation-policy.ts")) {
  main(process.argv.slice(2));
}
