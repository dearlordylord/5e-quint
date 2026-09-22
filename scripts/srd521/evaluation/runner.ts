import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SOURCE_MAP_NAME,
  candidatePageText,
  evaluateQuality,
  normalizeText,
  readSourceMap,
  type QualityEvaluation,
  type SourceMap,
} from "./quality.ts";

const EVALUATION_ROOT = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = resolve(EVALUATION_ROOT, "../../..");
const GENERATOR_PATH = join(
  REPOSITORY_ROOT,
  "scripts/srd521/generator/generate.py",
);
const GENERATOR_ROOT = dirname(GENERATOR_PATH);
const GENERATOR_MANIFEST_PATH = join(
  REPOSITORY_ROOT,
  "scripts/srd521/section-manifest.json",
);
const PDF_SOURCE_PATH = join(REPOSITORY_ROOT, "scripts/srd521/pdf-source.json");
const ORACLE_PATH = join(EVALUATION_ROOT, "page-oracles.json");
const APPROVED_ARTIFACT_ROOT = join(
  REPOSITORY_ROOT,
  ".scratch/srd521-evaluation",
);

export const EXPECTED_OUTPUT_FILES = [
  "animals.md",
  "character-creation.md",
  "character-origins.md",
  "classes.md",
  "equipment.md",
  "feats.md",
  "gameplay-toolbox.md",
  "legal.md",
  "magic-items.md",
  "monsters-A-Z.md",
  "monsters.md",
  "playing-the-game.md",
  "rules-glossary.md",
  "spells.md",
] as const;
const EXPECTED_OUTPUT_FILE_SET: ReadonlySet<string> = new Set(
  EXPECTED_OUTPUT_FILES,
);

type PdfSource = {
  readonly path: string;
  readonly sha256: string;
  readonly pages: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readPdfSource = (): PdfSource => {
  const value: unknown = JSON.parse(readFileSync(PDF_SOURCE_PATH, "utf8"));
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.path !== "string" ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    typeof value.pages !== "number" ||
    !Number.isInteger(value.pages) ||
    value.pages < 1
  )
    throw new Error("PDF source contract has an invalid shape");
  return { path: value.path, sha256: value.sha256, pages: value.pages };
};

const PDF_SOURCE = readPdfSource();
const REFERENCES_ROOT = join(REPOSITORY_ROOT, ".references");
const PDF_PATH = resolve(REPOSITORY_ROOT, PDF_SOURCE.path);
const pdfRelativeToReferences = relative(REFERENCES_ROOT, PDF_PATH);
if (
  pdfRelativeToReferences.startsWith("..") ||
  resolve(REFERENCES_ROOT, pdfRelativeToReferences) !== PDF_PATH
)
  throw new Error("PDF source contract must resolve below .references");

type PageOracle = {
  readonly page: number;
  readonly candidateRequired: boolean;
  readonly expectedFiles: readonly string[];
  readonly mustContain: readonly string[];
  readonly mustNotContain: readonly string[];
};

type CandidateAssessment = {
  readonly evaluation: QualityEvaluation;
  readonly issues: readonly string[];
  readonly oracleAssertions: number;
  readonly nativeTextOracleMisses: readonly string[];
  readonly candidateOracleFailurePages: readonly number[];
};

const stringArray = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value
    : undefined;

const readOracles = (): readonly PageOracle[] => {
  const value: unknown = JSON.parse(readFileSync(ORACLE_PATH, "utf8"));
  if (!Array.isArray(value))
    throw new Error("page oracle manifest must be an array");
  const oracles = value.map((entry, index) => {
    if (!isRecord(entry))
      throw new Error(`page oracle ${index} must be an object`);
    const expectedFiles =
      entry.expectedFiles === undefined ? [] : stringArray(entry.expectedFiles);
    const mustContain = stringArray(entry.mustContain);
    const visualOnlyMustContain =
      entry.visualOnlyMustContain === undefined
        ? []
        : stringArray(entry.visualOnlyMustContain);
    const mustNotContain =
      entry.mustNotContain === undefined
        ? []
        : stringArray(entry.mustNotContain);
    const candidateRequired =
      entry.candidateRequired === undefined
        ? true
        : typeof entry.candidateRequired === "boolean"
          ? entry.candidateRequired
          : undefined;
    if (
      !Number.isInteger(entry.page) ||
      typeof entry.page !== "number" ||
      entry.page < 1 ||
      typeof entry.rationale !== "string" ||
      expectedFiles === undefined ||
      mustContain === undefined ||
      visualOnlyMustContain === undefined ||
      mustNotContain === undefined ||
      candidateRequired === undefined ||
      new Set(expectedFiles).size !== expectedFiles.length ||
      expectedFiles.some((file) => !EXPECTED_OUTPUT_FILE_SET.has(file))
    )
      throw new Error(`page oracle ${index} has an invalid shape`);
    return {
      page: entry.page,
      candidateRequired,
      expectedFiles,
      mustContain: [...mustContain, ...visualOnlyMustContain],
      mustNotContain,
    };
  });
  if (new Set(oracles.map((oracle) => oracle.page)).size !== oracles.length)
    throw new Error("page oracle manifest contains duplicate pages");
  return oracles;
};

export const evaluationArtifactRoot = (
  argument: string | undefined,
  lane: string,
): string => {
  const resolved = resolve(
    REPOSITORY_ROOT,
    argument ?? join(".scratch/srd521-evaluation", lane),
  );
  const relativePath = relative(APPROVED_ARTIFACT_ROOT, resolved);
  if (
    resolved === APPROVED_ARTIFACT_ROOT ||
    relativePath.startsWith("..") ||
    resolve(APPROVED_ARTIFACT_ROOT, relativePath) !== resolved
  )
    throw new Error(
      `evaluation artifacts must be below ${APPROVED_ARTIFACT_ROOT}`,
    );
  return resolved;
};

export const generateCandidate = (output: string): void => {
  mkdirSync(dirname(output), { recursive: true });
  const replace = existsSync(output) ? ["--replace"] : [];
  execFileSync(
    "uv",
    ["run", "--script", GENERATOR_PATH, "--output", output, ...replace],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
};

export const readPdfPages = (): readonly string[] => {
  const text = execFileSync("pdftotext", ["-layout", PDF_PATH, "-"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const splitPages = text.split("\f");
  return splitPages.at(-1)?.trim() === ""
    ? splitPages.slice(0, -1)
    : splitPages;
};

const sameValues = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const oracleIssues = (
  pdfPages: readonly string[],
  candidateRoot: string,
  sourceMap: SourceMap,
  oracles: readonly PageOracle[],
): {
  readonly hardIssues: readonly string[];
  readonly nativeTextMisses: readonly string[];
  readonly candidateFailurePages: ReadonlySet<number>;
  readonly assertions: number;
} => {
  const hardIssues: string[] = [];
  const nativeTextMisses: string[] = [];
  const candidateFailurePages = new Set<number>();
  let assertions = 0;
  const byPage = new Map(sourceMap.pages.map((page) => [page.page, page]));
  for (const oracle of oracles) {
    const pdfText = normalizeText(pdfPages[oracle.page - 1] ?? "");
    const sourcePage = byPage.get(oracle.page);
    const candidateText =
      sourcePage?.kind === "generated"
        ? normalizeText(candidatePageText(candidateRoot, sourcePage))
        : undefined;
    for (const phrase of oracle.mustContain) {
      assertions += 1;
      const normalizedPhrase = normalizeText(phrase);
      if (!pdfText.includes(normalizedPhrase))
        nativeTextMisses.push(
          `PDF page ${oracle.page} native text is missing oracle phrase: ${phrase}`,
        );
      if (
        oracle.candidateRequired &&
        !candidateText?.includes(normalizedPhrase)
      )
        candidateFailurePages.add(oracle.page);
    }
    for (const phrase of oracle.mustNotContain) {
      assertions += 1;
      const normalizedPhrase = normalizeText(phrase);
      if (pdfText.includes(normalizedPhrase))
        hardIssues.push(
          `PDF page ${oracle.page} contains forbidden phrase: ${phrase}`,
        );
      if (candidateText?.includes(normalizedPhrase))
        hardIssues.push(
          `candidate page ${oracle.page} contains forbidden phrase: ${phrase}`,
        );
    }
  }
  return {
    hardIssues,
    nativeTextMisses,
    candidateFailurePages,
    assertions,
  };
};

const validateSourceMap = (
  candidateRoot: string,
  sourceMap: SourceMap,
): readonly string[] => {
  const issues: string[] = [];
  if (sourceMap.pdfSha256 !== PDF_SOURCE.sha256)
    issues.push("source map names an unexpected PDF digest");
  if (sourceMap.pdfPages !== PDF_SOURCE.pages)
    issues.push("source map names an unexpected PDF page count");
  const outputFiles = [...sourceMap.outputFiles].sort();
  if (!sameValues(outputFiles, [...EXPECTED_OUTPUT_FILES]))
    issues.push(
      "source map output-file manifest differs from the protected contract",
    );
  const directoryEntries = readdirSync(candidateRoot).sort();
  const expectedEntries = [SOURCE_MAP_NAME, ...EXPECTED_OUTPUT_FILES].sort();
  if (!sameValues(directoryEntries, expectedEntries))
    issues.push("candidate directory contains a missing or unexpected file");
  if (sourceMap.pages.length !== PDF_SOURCE.pages)
    issues.push(
      `source map must account for exactly ${PDF_SOURCE.pages} pages`,
    );
  const pageNumbers = sourceMap.pages.map((page) => page.page);
  if (
    pageNumbers.some((page, index) => page !== index + 1) ||
    new Set(pageNumbers).size !== PDF_SOURCE.pages
  )
    issues.push(
      `source map pages must be unique and ordered from 1 through ${PDF_SOURCE.pages}`,
    );
  const excludedPages = sourceMap.pages
    .filter((page) => page.kind === "excluded")
    .map((page) => page.page);
  if (!sameValues(excludedPages.map(String), ["2", "3", "4"]))
    issues.push("only table-of-contents pages 2 through 4 may be excluded");
  if (
    sourceMap.pages.some(
      (page) => page.kind === "excluded" && page.reason !== "table-of-contents",
    )
  )
    issues.push("excluded pages must name the table-of-contents reason");

  const intervalsByFile = new Map<string, Array<readonly [number, number]>>();
  const pageIntervalsByFile = new Map<
    string,
    Array<readonly [number, number, number]>
  >();
  for (const page of sourceMap.pages) {
    if (page.kind === "excluded") continue;
    const pageHasUnexpectedFile = page.fragments.some(
      (fragment) => !EXPECTED_OUTPUT_FILE_SET.has(fragment.file),
    );
    for (const fragment of page.fragments) {
      if (!EXPECTED_OUTPUT_FILE_SET.has(fragment.file))
        issues.push(`page ${page.page} names unexpected file ${fragment.file}`);
      if (fragment.firstLine > fragment.lastLine)
        issues.push(`page ${page.page} has a reversed line interval`);
      const intervals = intervalsByFile.get(fragment.file) ?? [];
      intervals.push([fragment.firstLine, fragment.lastLine]);
      intervalsByFile.set(fragment.file, intervals);
      const pageIntervals = pageIntervalsByFile.get(fragment.file) ?? [];
      pageIntervals.push([fragment.firstLine, fragment.lastLine, page.page]);
      pageIntervalsByFile.set(fragment.file, pageIntervals);
    }
    if (!pageHasUnexpectedFile)
      try {
        candidatePageText(candidateRoot, page);
      } catch (error) {
        issues.push(error instanceof Error ? error.message : String(error));
      }
  }
  for (const [file, intervals] of intervalsByFile) {
    const ordered = [...intervals].sort(([left], [right]) => left - right);
    if (
      ordered.some(
        ([first], index) => index > 0 && first <= ordered[index - 1]![1],
      )
    )
      issues.push(`${file} contains overlapping source-map intervals`);
  }
  for (const file of EXPECTED_OUTPUT_FILES) {
    const lines = readFileSync(join(candidateRoot, file), "utf8").split("\n");
    const intervals = pageIntervalsByFile.get(file) ?? [];
    const validIntervals = intervals.filter(
      ([firstLine, lastLine]) => firstLine >= 1 && lastLine <= lines.length,
    );
    const coveredLines = new Set(
      validIntervals.flatMap(([firstLine, lastLine]) =>
        Array.from(
          { length: Math.max(0, lastLine - firstLine + 1) },
          (_, index) => firstLine + index,
        ),
      ),
    );
    if (
      intervals.some(
        ([firstLine, lastLine]) => firstLine < 1 || lastLine > lines.length,
      )
    )
      issues.push(`${file} contains a source-map interval outside the file`);
    if (
      lines.some(
        (line, index) => line.trim() !== "" && !coveredLines.has(index + 1),
      )
    )
      issues.push(`${file} contains nonblank content outside the source map`);
    const ordered = [...intervals].sort(([left], [right]) => left - right);
    if (
      ordered.some(
        ([, , page], index) =>
          index > 0 && page < (ordered[index - 1]?.[2] ?? page),
      )
    )
      issues.push(`${file} source fragments are not in PDF page order`);
  }
  return issues;
};

const candidateTreeIssues = (root: string): readonly string[] => {
  const issues: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink() || lstatSync(path).isSymbolicLink()) {
      issues.push(`candidate artifact must not be a symlink: ${path}`);
      continue;
    }
    if (entry.isDirectory()) issues.push(...candidateTreeIssues(path));
  }
  return issues;
};

const forbiddenDependencyIssues = (
  candidateRoot: string,
): readonly string[] => {
  const issues: string[] = [];
  for (const root of [GENERATOR_ROOT, candidateRoot]) {
    for (const path of recursiveFiles(root)) {
      if (/downfallx/iu.test(readFileSync(path, "utf8")))
        issues.push(
          `forbidden Downfallx dependency marker in ${relative(REPOSITORY_ROOT, path)}`,
        );
    }
  }
  if (/downfallx/iu.test(readFileSync(GENERATOR_MANIFEST_PATH, "utf8")))
    issues.push("forbidden Downfallx dependency marker in section manifest");
  return issues;
};

const recursiveFiles = (root: string): readonly string[] =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory() ? recursiveFiles(path) : [path];
  });

export const treeDigest = (root: string): string => {
  const digest = createHash("sha256");
  for (const path of recursiveFiles(root).sort()) {
    digest.update(relative(root, path));
    digest.update("\0");
    digest.update(readFileSync(path));
    digest.update("\0");
  }
  return digest.digest("hex");
};

export const pdfDigest = (): string =>
  createHash("sha256").update(readFileSync(PDF_PATH)).digest("hex");

export const assessCandidate = (
  candidateRoot: string,
  pdfPages = readPdfPages(),
): CandidateAssessment => {
  const treeIssues = candidateTreeIssues(candidateRoot);
  if (treeIssues.length > 0)
    throw new Error(`unsafe candidate artifact:\n${treeIssues.join("\n")}`);
  const sourceMap = readSourceMap(candidateRoot);
  const sourceMapIssues = validateSourceMap(candidateRoot, sourceMap);
  if (sourceMapIssues.length > 0)
    throw new Error(
      `invalid candidate source map:\n${sourceMapIssues.join("\n")}`,
    );
  const oracles = readOracles();
  const expectedFilesByPage = new Map(
    oracles
      .filter((oracle) => oracle.expectedFiles.length > 0)
      .map((oracle) => [oracle.page, new Set(oracle.expectedFiles)]),
  );
  const oracle = oracleIssues(pdfPages, candidateRoot, sourceMap, oracles);
  const oracleContentPages = new Set(
    oracles
      .filter((pageOracle) => pageOracle.candidateRequired)
      .map((pageOracle) => pageOracle.page),
  );
  return {
    evaluation: evaluateQuality(
      pdfPages,
      candidateRoot,
      sourceMap,
      expectedFilesByPage,
      oracleContentPages,
      oracle.candidateFailurePages,
    ),
    issues: [...oracle.hardIssues, ...forbiddenDependencyIssues(candidateRoot)],
    oracleAssertions: oracle.assertions,
    nativeTextOracleMisses: oracle.nativeTextMisses,
    candidateOracleFailurePages: [...oracle.candidateFailurePages].sort(
      (left, right) => left - right,
    ),
  };
};

export const assertPdfAuthority = (pdfPages: readonly string[]): void => {
  if (pdfDigest() !== PDF_SOURCE.sha256)
    throw new Error("official PDF digest differs from the protected contract");
  if (pdfPages.length !== PDF_SOURCE.pages)
    throw new Error(
      `pdftotext returned ${pdfPages.length} pages; expected ${PDF_SOURCE.pages}`,
    );
  const pagesFromPdfInfo = Number(
    execFileSync("pdfinfo", [PDF_PATH], { encoding: "utf8" }).match(
      /^Pages:\s+(\d+)$/mu,
    )?.[1],
  );
  if (pagesFromPdfInfo !== PDF_SOURCE.pages)
    throw new Error(
      `pdfinfo returned ${pagesFromPdfInfo} pages; expected ${PDF_SOURCE.pages}`,
    );
};

export const ensureRegularOutputFiles = (candidateRoot: string): void => {
  for (const file of EXPECTED_OUTPUT_FILES) {
    const path = join(candidateRoot, file);
    if (!statSync(path).isFile() || statSync(path).size === 0)
      throw new Error(`candidate output is missing or empty: ${file}`);
  }
};
