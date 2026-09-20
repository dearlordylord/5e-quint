#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export async function digestPackage(directory) {
  const root = resolve(directory);
  const files = await packageFiles(root);
  const hash = createHash("sha256");
  for (const file of files) {
    const path = relative(root, file).split(sep).join("/");
    const content = await readFile(file);
    hash.update(`${Buffer.byteLength(path)}:${path}:${content.byteLength}:`);
    hash.update(content);
  }
  return hash.digest("hex");
}

async function packageFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return packageFiles(path);
      if (!entry.isFile()) {
        throw new Error(`Package contains an unsupported entry: ${path}`);
      }
      return [path];
    }),
  );
  return files.flat().sort((left, right) => left.localeCompare(right));
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  resolve(invokedPath) === fileURLToPath(import.meta.url)
) {
  const directory = process.argv[2];
  if (directory === undefined || process.argv.length !== 3) {
    throw new Error("usage: package-digest.mjs DIRECTORY");
  }
  process.stdout.write(`${await digestPackage(directory)}\n`);
}
