const fs = require("node:fs");
const path = require("node:path");

function fail(message) {
  throw new Error(message);
}

function toRepoPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(root, filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail(
          `${toRepoPath(root, filePath)}:${index + 1} is not valid JSON: ${error.message}`,
        );
      }
    });
}

function writeOrCompare({ root, write }, filePath, text) {
  if (write) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
    return;
  }
  const actual = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  if (actual !== text) {
    fail(
      `${toRepoPath(root, filePath)} is stale. Run node scripts/unit-profile-coverage-check.cjs --write.`,
    );
  }
}

module.exports = {
  fail,
  readJson,
  readJsonl,
  toRepoPath,
  writeOrCompare,
};
