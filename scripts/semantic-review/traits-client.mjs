import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const projectFlag = args.indexOf("--project");
const project =
  projectFlag === -1 ? root : resolve(args[projectFlag + 1] ?? "");
if (projectFlag !== -1) {
  if (!args[projectFlag + 1] || args[projectFlag + 1].startsWith("--"))
    throw new Error("--project requires a directory");
  args.splice(projectFlag, 2);
}
const outputFlag = args.indexOf("--output");
const outputPath = outputFlag === -1 ? undefined : args[outputFlag + 1];
if (outputFlag !== -1) {
  if (!outputPath || outputPath.startsWith("--"))
    throw new Error("--output requires a file");
  args.splice(outputFlag, 2);
}
const [operation, inputPath] = args;
const client = new Client({
  name: "semantic-review-evaluation",
  version: "1.0.0",
});
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    resolve(root, "scripts/semantic-review/traits-server.mjs"),
    "--project",
    project,
  ],
  cwd: project,
  env: Object.fromEntries(
    ["TYPESAFE_API_KEY", "XDG_CONFIG_HOME", "CODEX_HOME"].flatMap((key) =>
      process.env[key] === undefined ? [] : [[key, process.env[key]]],
    ),
  ),
  stderr: "inherit",
});
try {
  await client.connect(transport);
  const result =
    operation === "list"
      ? await client.listTools()
      : await client.callTool(
          {
            name: operation,
            arguments: JSON.parse(
              await readFile(resolve(project, inputPath), "utf8"),
            ),
          },
          undefined,
          { timeout: 600_000 },
        );
  const directory = resolve(project, ".artifacts/semantic-review");
  await mkdir(directory, { recursive: true });
  const output = outputPath
    ? resolve(project, outputPath)
    : resolve(directory, `traits-${operation}.json`);
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  if (operation === "list") {
    console.log(JSON.stringify(result.tools.map(({ name }) => name)));
  } else if (operation === "check_traits" && result.structuredContent?.files) {
    console.log(
      JSON.stringify(
        result.structuredContent.files.map((file) => ({
          path: file.path,
          revision: file.revision,
          chunks: file.chunks.map((chunk) => ({
            startLine: chunk.startLine,
            findings: chunk.findings,
          })),
        })),
        null,
        2,
      ),
    );
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  if (result.isError) process.exitCode = 1;
} finally {
  await client.close();
}
