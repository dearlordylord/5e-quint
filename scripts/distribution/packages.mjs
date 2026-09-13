import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const output = resolve(root, "dist/npm");
export const packages = ["sdk", "mcp"].map((kind) => {
  const source = resolve(root, "distribution", kind);
  const manifest = JSON.parse(
    readFileSync(resolve(source, "package.json"), "utf8"),
  );
  return {
    kind,
    source,
    directory: resolve(output, kind),
    manifest,
    archiveName: `${manifest.name.replace(/^@/, "").replace("/", "-")}-${manifest.version}.tgz`,
  };
});

export const archiveIntegrity = (path) =>
  `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}`;
