import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function thirdPartyNotices(inputs, root) {
  const owners = new Map();
  for (const input of inputs) {
    if (!input.includes("node_modules/")) continue;
    let directory = dirname(resolve(root, input));
    while (directory !== dirname(directory)) {
      const path = resolve(directory, "package.json");
      if (existsSync(path)) {
        const manifest = JSON.parse(readFileSync(path, "utf8"));
        if (manifest.name && manifest.version) {
          owners.set(`${manifest.name}@${manifest.version}`, directory);
          break;
        }
      }
      directory = dirname(directory);
    }
  }
  return [...owners]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, directory]) => {
      const files = readdirSync(directory)
        .filter((file) => /^(?:licen[sc]e|copying|notice)(?:\.|$)/i.test(file))
        .sort();
      if (files.length === 0)
        throw new Error(`Bundled dependency ${name} has no license file.`);
      return `## ${name}\n\n${files.map((file) => readFileSync(resolve(directory, file), "utf8")).join("\n\n")}`;
    })
    .join("\n\n");
}
