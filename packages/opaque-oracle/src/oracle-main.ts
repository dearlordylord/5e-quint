import { pathToFileURL } from "node:url";

import { runOracleProcess } from "./oracle-bootstrap.ts";

async function runMain(): Promise<void> {
  const exitCode = await runOracleProcess(process.argv.slice(2));
  if (exitCode !== 0) process.exitCode = exitCode;
}

const invokedScript = process.argv[1];
if (
  invokedScript !== undefined &&
  pathToFileURL(invokedScript).href === import.meta.url
) {
  void runMain().catch((cause) => {
    process.stderr.write(`opaque-oracle: fatal: ${String(cause)}\n`);
    process.exitCode = 1;
  });
}
