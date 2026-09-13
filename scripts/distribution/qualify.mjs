import { execFileSync } from "node:child_process";
import { root } from "./packages.mjs";

for (const script of ["build.mjs", "check.mjs"]) {
  execFileSync(process.execPath, [`scripts/distribution/${script}`], {
    cwd: root,
    stdio: "inherit",
  });
}
