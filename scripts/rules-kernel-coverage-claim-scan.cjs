const fs = require("node:fs");
const path = require("node:path");
const {
  markerKinds,
  skippedScanDirs,
} = require("./rules-kernel-coverage-config.cjs");

function toRepoPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function scanClaimFiles(root) {
  const markers = [];

  function visit(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skippedScanDirs.has(entry.name)) {
          visit(path.join(dirPath, entry.name));
        }
        continue;
      }
      if (!entry.isFile() || !/\.(md|qnt|ts|tsx|js|cjs|mjs)$/.test(entry.name)) {
        continue;
      }
      const filePath = path.join(dirPath, entry.name);
      const repoPath = toRepoPath(root, filePath);
      const text = fs.readFileSync(filePath, "utf8");
      for (const [index, line] of text.split("\n").entries()) {
        const trimmed = line.trimStart();
        if (
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("#") &&
          !trimmed.startsWith("*") &&
          !trimmed.startsWith("<!--")
        ) {
          continue;
        }
        const match = line.match(/KERNEL-COVERAGE:\s+(\S+)\s+(.+)$/);
        if (!match) continue;
        const markerKind = match[1];
        const obligationIds = match[2].trim().split(/\s+/);
        markers.push({
          ownerPath: repoPath,
          line: index + 1,
          markerKind,
          obligationIds,
        });
      }
    }
  }

  visit(root);
  return {
    markers,
    markerKinds,
  };
}

module.exports = {
  scanClaimFiles,
  toRepoPath,
};
