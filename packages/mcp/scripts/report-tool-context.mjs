import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

const bytes = (value) =>
  value === undefined ? 0 : Buffer.byteLength(JSON.stringify(value));

function definitionCount(value) {
  if (value === null || typeof value !== "object") return 0;
  if (Array.isArray(value)) {
    return value.reduce((sum, entry) => sum + definitionCount(entry), 0);
  }
  return Object.entries(value).reduce(
    (sum, [key, entry]) =>
      sum +
      (key === "$defs" && entry !== null && typeof entry === "object"
        ? Object.keys(entry).length
        : 0) +
      definitionCount(entry),
    0,
  );
}

async function captureReport(path) {
  const parsed = ListToolsResultSchema.safeParse(
    JSON.parse(await readFile(path, "utf8")),
  );
  if (!parsed.success) return undefined;
  const names = new Set(parsed.data.tools.map((tool) => tool.name));
  if (names.size !== parsed.data.tools.length) return undefined;
  const tools = parsed.data.tools
    .map((tool) => ({
      name: tool.name,
      totalBytes: bytes(tool),
      inputBytes: bytes(tool.inputSchema),
      outputBytes: bytes(tool.outputSchema),
      descriptionBytes: bytes(tool.description),
      definitionCount: definitionCount(tool),
    }))
    .sort(
      (left, right) =>
        right.totalBytes - left.totalBytes ||
        left.name.localeCompare(right.name),
    );
  return {
    toolCount: tools.length,
    totalBytes: bytes({ tools: parsed.data.tools }),
    definitionCount: tools.reduce((sum, tool) => sum + tool.definitionCount, 0),
    tools,
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      baseline: { type: "string" },
      output: { type: "string" },
    },
  });
  if (positionals.length !== 1) return false;
  const current = await captureReport(positionals[0]);
  if (current === undefined) return false;
  const report = { current };
  if (values.baseline !== undefined) {
    const baseline = await captureReport(values.baseline);
    if (baseline === undefined) return false;
    const oldTools = new Map(baseline.tools.map((tool) => [tool.name, tool]));
    const currentNames = new Set(current.tools.map((tool) => tool.name));
    report.baseline = baseline;
    report.delta = {
      toolCount: current.toolCount - baseline.toolCount,
      totalBytes: current.totalBytes - baseline.totalBytes,
      definitionCount: current.definitionCount - baseline.definitionCount,
      addedNames: current.tools
        .filter((tool) => !oldTools.has(tool.name))
        .map((tool) => tool.name),
      removedNames: baseline.tools
        .filter((tool) => !currentNames.has(tool.name))
        .map((tool) => tool.name),
      tools: current.tools.map((tool) => {
        const previous = oldTools.get(tool.name);
        return {
          name: tool.name,
          ...(previous === undefined
            ? { status: "added" }
            : {
                totalBytes: tool.totalBytes - previous.totalBytes,
                inputBytes: tool.inputBytes - previous.inputBytes,
                outputBytes: tool.outputBytes - previous.outputBytes,
                descriptionBytes:
                  tool.descriptionBytes - previous.descriptionBytes,
                definitionCount:
                  tool.definitionCount - previous.definitionCount,
              }),
        };
      }),
    };
  }
  if (values.output !== undefined) {
    await writeFile(values.output, `${JSON.stringify(report, null, 2)}\n`, {
      flag: "wx",
    });
  }
  console.log(
    `Tools: ${current.toolCount}; JSON bytes: ${current.totalBytes}; $defs entries: ${current.definitionCount}`,
  );
  if (report.baseline !== undefined) {
    console.log(
      `Baseline JSON bytes: ${report.baseline.totalBytes}; delta: ${report.delta.totalBytes}; added: ${report.delta.addedNames.length}; removed: ${report.delta.removedNames.length}`,
    );
  }
  for (const tool of current.tools.slice(0, 10)) {
    console.log(
      `${tool.name}: ${tool.totalBytes} bytes (input ${tool.inputBytes}, output ${tool.outputBytes}, description ${tool.descriptionBytes}, $defs ${tool.definitionCount})`,
    );
  }
  return true;
}

try {
  if (!(await main())) {
    console.error(
      "Invalid tool capture or arguments. Usage: report-tool-context.mjs <capture.json> [--baseline <capture.json>] [--output <report.json>]",
    );
    process.exitCode = 1;
  }
} catch {
  console.error("Unable to read tool capture or write report.");
  process.exitCode = 1;
}
