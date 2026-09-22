import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const pdfSource = JSON.parse(
  readFileSync("scripts/srd521/pdf-source.json", "utf8"),
);
const pdfPath = pdfSource.path;
const corpusRoot = ".references/srd-5.2.1";
const expectedPdfSha256 = pdfSource.sha256;
const expectedPdfPages = pdfSource.pages;

const normalize = (text) =>
  text
    .normalize("NFKD")
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[–—−]/gu, "-")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[^\p{L}\p{N}+'-]+/gu, " ")
    .trim()
    .toLowerCase();

const digest = createHash("sha256").update(readFileSync(pdfPath)).digest("hex");
if (digest !== expectedPdfSha256) {
  throw new Error(`unexpected PDF SHA-256: ${digest}`);
}

const pdfInfo = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
const pdfPages = Number(pdfInfo.match(/^Pages:\s+(\d+)$/mu)?.[1]);
if (pdfPages !== expectedPdfPages) {
  throw new Error(`unexpected PDF page count: ${pdfPages}`);
}

const pdfText = normalize(
  execFileSync("pdftotext", [pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
);
const markdownFiles = readdirSync(corpusRoot)
  .filter((name) => name.endsWith(".md"))
  .filter((name) => !["README.md", "attribution.md"].includes(name))
  .sort();
const corpusText = normalize(
  markdownFiles
    .map((name) => readFileSync(join(corpusRoot, name), "utf8"))
    .join("\n"),
);

const assertions = [
  ["legal grant", "creative commons attribution 4 0 international license"],
  ["Utilize action omission repaired", "utilize action"],
  [
    "Bard level-18 spell slots",
    "18 +6 superior inspiration d12 4 20 4 3 3 3 3 1 1 1 1",
  ],
  ["Cleric level-18 spell slots", "18 +6 - 4 5 20 4 3 3 3 3 1 1 1 1"],
  ["Mantle of Spell Resistance", "mantle of spell resistance"],
  [
    "Pony Hooves damage",
    "hooves melee attack roll +4 reach 5 ft hit 4 1d4 + 2",
  ],
  ["Giant Octopus Wisdom save", "wis 10 +0 +0"],
  [
    "Telekinesis PDF ending",
    "telekinetic grip such as manipulating a simple tool telepathic bond",
  ],
];

for (const [label, phrase] of assertions) {
  if (!pdfText.includes(phrase)) {
    throw new Error(`PDF text assertion failed: ${label}`);
  }
  if (!corpusText.includes(phrase)) {
    throw new Error(`Markdown assertion failed: ${label}`);
  }
}

const forbidden =
  "opening a door or a container stowing or retrieving an item from an open container or pouring the contents from a vial";
if (corpusText.includes(forbidden)) {
  throw new Error("Telekinesis contains text absent from the official PDF");
}

const words = (text) => text.split(" ").filter(Boolean);
const pdfWords = words(pdfText);
const corpusWords = words(corpusText);
const pdfFiveGrams = new Set();
for (let index = 0; index <= pdfWords.length - 5; index += 1) {
  pdfFiveGrams.add(pdfWords.slice(index, index + 5).join(" "));
}
let covered = 0;
let possible = 0;
for (let index = 0; index <= corpusWords.length - 5; index += 1) {
  possible += 1;
  if (pdfFiveGrams.has(corpusWords.slice(index, index + 5).join(" ")))
    covered += 1;
}
const coverage = covered / possible;
if (coverage < 0.9) {
  throw new Error(
    `corpus five-gram PDF coverage ${coverage.toFixed(4)} is below 0.9000`,
  );
}

console.log(
  JSON.stringify(
    {
      pdfSha256: digest,
      pdfPages,
      markdownFiles: markdownFiles.length,
      normalizedCorpusWords: corpusWords.length,
      fiveGramPdfCoverage: Number(coverage.toFixed(6)),
      assertions: assertions.length,
    },
    null,
    2,
  ),
);
