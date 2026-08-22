/* v8 ignore start -- @preserve -- this file is only the Node process bootstrap; run-cli.test.ts covers the argument, decoding, rendering, and output behavior */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { argv, exit, stdout } from "node:process";

import { runSurfaceTraceCli } from "./run-cli.ts";

const exitCode = runSurfaceTraceCli(argv.slice(2), {
  readFile: (path) => readFileSync(path, "utf8"),
  writeFile: (path, contents) => writeFileSync(path, contents, "utf8"),
  resolvePath: resolve,
  writeStdout: (contents) => stdout.write(contents),
});
if (exitCode !== 0) exit(exitCode);
/* v8 ignore stop -- @preserve */
