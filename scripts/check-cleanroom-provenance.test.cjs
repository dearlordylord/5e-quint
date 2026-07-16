const { spawnSync } = require("node:child_process");
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

test("cleanroom provenance checker passes its production corpus", () => {
  const checker = path.join(__dirname, "check-cleanroom-provenance.cjs");
  const result = spawnSync(process.execPath, [checker], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /schema\/value role traversal passed/);
});
