// Resolve a queue row's anchor to the unit's source text. Keeps text
// loading out of the queue file so PHB text doesn't leak into main-repo
// paths.
//
// Input (stdin or --anchor-json): an Anchor JSON object matching the
// QueueRow.anchor shape from unit-catalog.ts.
//
// Output (stdout): the plaintext extracted from the referenced source.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

type Anchor =
  | { kind: "srd_markdown"; file: string; heading: string }
  | { kind: "xphb_json"; file: string; spellName: string }
  | { kind: "hardcoded"; note: string };

function parseArgs(): { anchorJson: string } {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--anchor-json" && i + 1 < args.length) {
      const v = args[i + 1];
      if (v !== undefined) return { anchorJson: v };
    }
  }
  // read from stdin
  const raw = fs.readFileSync(0, "utf8").trim();
  return { anchorJson: raw };
}

function extractMarkdownSection(filePath: string, heading: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  // Find the first heading line that contains the heading (case-sensitive).
  // Capture until the next heading of equal or higher level.
  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^(#+)\s+(.+)$/);
    if (m && m[1] !== undefined && m[2] !== undefined) {
      const level = m[1].length;
      const text = m[2].trim();
      if (text === heading || text.toLowerCase().includes(heading.toLowerCase())) {
        if (startIdx === -1) {
          startIdx = i;
          startLevel = level;
        }
      } else if (startIdx >= 0 && level <= startLevel) {
        return lines.slice(startIdx, i).join("\n").trim();
      }
    }
  }
  if (startIdx >= 0) return lines.slice(startIdx).join("\n").trim();
  return `[extract-unit-text: heading "${heading}" not found in ${filePath}]`;
}

type XphbSpell = { name: string; [k: string]: unknown };

function extractXphbSpell(filePath: string, spellName: string): string {
  const content = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(content) as { spell: XphbSpell[] };
  const sp = data.spell.find((x) => x.name === spellName);
  if (!sp) return `[extract-unit-text: spell "${spellName}" not found in ${filePath}]`;
  return JSON.stringify(sp, null, 2);
}

function main(): void {
  const { anchorJson } = parseArgs();
  const anchor = JSON.parse(anchorJson) as Anchor;
  let text = "";
  switch (anchor.kind) {
    case "srd_markdown": {
      const filePath = path.resolve(repoRoot, anchor.file);
      text = extractMarkdownSection(filePath, anchor.heading);
      break;
    }
    case "xphb_json": {
      const filePath = path.resolve(repoRoot, anchor.file);
      text = extractXphbSpell(filePath, anchor.spellName);
      break;
    }
    case "hardcoded":
      text = `[hardcoded unit — see note: ${anchor.note}]`;
      break;
    default: {
      const _: never = anchor;
      throw new Error(`unknown anchor: ${String(_)}`);
    }
  }
  process.stdout.write(text);
}

main();
