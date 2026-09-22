import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SOURCE_MAP_NAME = ".source-map.json";

const TOKEN_SIMILARITY_WEIGHT = 0.55;
const SHINGLE_SIMILARITY_WEIGHT = 0.45;
const SEMANTIC_LOSS_WEIGHT = 0.8;
const POLISH_LOSS_WEIGHT = 0.2;
const SHINGLE_SIZE = 5;

const POLISH_CATEGORIES = [
  "extraction-markup",
  "decorated-heading",
  "heading-level-jump",
  "line-break-hyphenation",
  "page-furniture",
  "malformed-markdown-table",
  "oracle-content",
  "oracle-placement",
] as const;

type PolishCategory = (typeof POLISH_CATEGORIES)[number];
type PageNumber = number & { readonly PageNumber: unique symbol };

export type GeneratedPage = {
  readonly page: PageNumber;
  readonly kind: "generated";
  readonly fragments: readonly GeneratedFragment[];
};

export type GeneratedFragment = {
  readonly file: string;
  readonly firstLine: number;
  readonly lastLine: number;
  readonly contentSha256: string;
};

export type ExcludedPage = {
  readonly page: PageNumber;
  readonly kind: "excluded";
  readonly reason: string;
};

export type SourcePage = GeneratedPage | ExcludedPage;

export type SourceMap = {
  readonly schemaVersion: 1;
  readonly pdfSha256: string;
  readonly pdfPages: number;
  readonly outputFiles: readonly string[];
  readonly pages: readonly SourcePage[];
};

export type ParseResult<T> =
  | { readonly tag: "accepted"; readonly value: T }
  | { readonly tag: "rejected"; readonly issues: readonly string[] };

export type PageQuality = {
  readonly page: number;
  readonly tokenF1: number;
  readonly shingleF1: number;
  readonly semanticSimilarity: number;
  readonly polishFailures: readonly PolishCategory[];
};

export type QualityEvaluation = {
  readonly qualityLossPpm: number;
  readonly semanticLossPpm: number;
  readonly polishLossPpm: number;
  readonly generatedPages: number;
  readonly excludedPages: number;
  readonly polishFailureCounts: Readonly<Record<PolishCategory, number>>;
  readonly pages: readonly PageQuality[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && typeof value === "number" && value > 0;

const pageNumber = (value: number): PageNumber => {
  // The caller has already established the positive-integer page invariant.
  return value as PageNumber;
};

export const normalizeText = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[“”]/gu, '"')
    .replace(/[‘’]/gu, "'")
    .replace(/[–—−]/gu, "-")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[^\p{L}\p{N}+'-]+/gu, " ")
    .trim()
    .toLowerCase();

export const tokens = (text: string): readonly string[] => {
  const normalized = normalizeText(text);
  return normalized === "" ? [] : normalized.split(" ");
};

const frequencies = (
  values: readonly string[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
};

export const multisetF1 = (
  left: readonly string[],
  right: readonly string[],
): number => {
  if (left.length === 0 && right.length === 0) return 1;
  if (left.length === 0 || right.length === 0) return 0;
  const leftCounts = frequencies(left);
  const rightCounts = frequencies(right);
  const shared = [...leftCounts.entries()].reduce(
    (total, [value, count]) =>
      total + Math.min(count, rightCounts.get(value) ?? 0),
    0,
  );
  if (shared === 0) return 0;
  const precision = shared / left.length;
  const recall = shared / right.length;
  return (2 * precision * recall) / (precision + recall);
};

export const shingles = (
  values: readonly string[],
  size = SHINGLE_SIZE,
): readonly string[] => {
  if (values.length < size) return [];
  return Array.from({ length: values.length - size + 1 }, (_, index) =>
    values.slice(index, index + size).join(" "),
  );
};

const markdownTableFailure = (text: string): boolean => {
  const lines = text.split("\n");
  const tableWidths: number[] = [];
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/u.test(line)) {
      tableWidths.push(line.split("|").length - 2);
      continue;
    }
    if (tableWidths.length > 1 && new Set(tableWidths).size > 1) return true;
    tableWidths.length = 0;
  }
  return tableWidths.length > 1 && new Set(tableWidths).size > 1;
};

const headingLevelJump = (text: string): boolean => {
  const levels = [...text.matchAll(/^(#{1,6})\s+\S/gmu)].map(
    (match) => match[1]?.length ?? 0,
  );
  return levels.some(
    (level, index) => index > 0 && level > (levels[index - 1] ?? level) + 1,
  );
};

export const polishFailures = (text: string): readonly PolishCategory[] => {
  const failures: PolishCategory[] = [];
  if (/<\/?mark\b/iu.test(text)) failures.push("extraction-markup");
  if (/^#{1,6}\s+\*\*.+\*\*\s*$/gmu.test(text))
    failures.push("decorated-heading");
  if (headingLevelJump(text)) failures.push("heading-level-jump");
  if (/\p{L}{2,}-\s*\n\s*\p{Ll}{2,}/u.test(text))
    failures.push("line-break-hyphenation");
  if (/^\s*System Reference Document 5\.2\.1\s*$/gimu.test(text))
    failures.push("page-furniture");
  if (markdownTableFailure(text)) failures.push("malformed-markdown-table");
  return failures;
};

const parsePage = (value: unknown, index: number): ParseResult<SourcePage> => {
  if (!isRecord(value))
    return { tag: "rejected", issues: [`pages[${index}] must be an object`] };
  if (!isPositiveInteger(value.page))
    return {
      tag: "rejected",
      issues: [`pages[${index}].page must be a positive integer`],
    };
  const page = pageNumber(value.page);
  if (value.kind === "excluded" && typeof value.reason === "string") {
    return {
      tag: "accepted",
      value: { page, kind: "excluded", reason: value.reason },
    };
  }
  if (value.kind === "generated" && Array.isArray(value.fragments)) {
    const fragments = value.fragments.flatMap((fragment) => {
      if (
        !isRecord(fragment) ||
        typeof fragment.file !== "string" ||
        !isPositiveInteger(fragment.firstLine) ||
        !isPositiveInteger(fragment.lastLine) ||
        typeof fragment.contentSha256 !== "string" ||
        !/^[a-f0-9]{64}$/u.test(fragment.contentSha256)
      )
        return [];
      return [
        {
          file: fragment.file,
          firstLine: fragment.firstLine,
          lastLine: fragment.lastLine,
          contentSha256: fragment.contentSha256,
        },
      ];
    });
    if (fragments.length === 0 || fragments.length !== value.fragments.length)
      return {
        tag: "rejected",
        issues: [`pages[${index}].fragments has an invalid shape`],
      };
    return {
      tag: "accepted",
      value: {
        page,
        kind: "generated",
        fragments,
      },
    };
  }
  return {
    tag: "rejected",
    issues: [`pages[${index}] has an invalid discriminated shape`],
  };
};

export const parseSourceMap = (value: unknown): ParseResult<SourceMap> => {
  if (!isRecord(value))
    return { tag: "rejected", issues: ["source map must be an object"] };
  const issues: string[] = [];
  if (value.schemaVersion !== 1) issues.push("schemaVersion must equal 1");
  const pdfSha256 =
    typeof value.pdfSha256 === "string" ? value.pdfSha256 : undefined;
  if (pdfSha256 === undefined) issues.push("pdfSha256 must be a string");
  const pdfPages = isPositiveInteger(value.pdfPages)
    ? value.pdfPages
    : undefined;
  if (pdfPages === undefined)
    issues.push("pdfPages must be a positive integer");
  const outputFiles = Array.isArray(value.outputFiles)
    ? value.outputFiles.filter(
        (file): file is string => typeof file === "string",
      )
    : [];
  if (
    !Array.isArray(value.outputFiles) ||
    outputFiles.length !== value.outputFiles.length
  )
    issues.push("outputFiles must contain only strings");
  const parsedPages = Array.isArray(value.pages)
    ? value.pages.map((entry, index) => parsePage(entry, index))
    : [];
  if (!Array.isArray(value.pages)) issues.push("pages must be an array");
  for (const result of parsedPages)
    if (result.tag === "rejected") issues.push(...result.issues);
  if (issues.length > 0 || pdfSha256 === undefined || pdfPages === undefined)
    return { tag: "rejected", issues };
  return {
    tag: "accepted",
    value: {
      schemaVersion: 1,
      pdfSha256,
      pdfPages,
      outputFiles,
      pages: parsedPages.map((result) => {
        if (result.tag === "rejected")
          throw new Error("Source-page rejection escaped accumulated parsing");
        return result.value;
      }),
    },
  };
};

export const readSourceMap = (candidateRoot: string): SourceMap => {
  const value: unknown = JSON.parse(
    readFileSync(join(candidateRoot, SOURCE_MAP_NAME), "utf8"),
  );
  const parsed = parseSourceMap(value);
  if (parsed.tag === "rejected")
    throw new Error(`invalid source map:\n${parsed.issues.join("\n")}`);
  return parsed.value;
};

export const candidatePageText = (
  candidateRoot: string,
  page: GeneratedPage,
): string => {
  return page.fragments
    .map((fragment) => {
      const lines = readFileSync(
        join(candidateRoot, fragment.file),
        "utf8",
      ).split("\n");
      const text = lines
        .slice(fragment.firstLine - 1, fragment.lastLine)
        .join("\n");
      const digest = createHash("sha256").update(text).digest("hex");
      if (digest !== fragment.contentSha256)
        throw new Error(`source-map digest mismatch for PDF page ${page.page}`);
      return text;
    })
    .join("\n");
};

export const evaluateQuality = (
  pdfPages: readonly string[],
  candidateRoot: string,
  sourceMap: SourceMap,
  expectedFilesByPage: ReadonlyMap<number, ReadonlySet<string>> = new Map(),
  oracleContentPages: ReadonlySet<number> = new Set(),
  oracleContentFailurePages: ReadonlySet<number> = new Set(),
): QualityEvaluation => {
  const pages: PageQuality[] = [];
  const polishFailureCounts: Record<PolishCategory, number> = {
    "extraction-markup": 0,
    "decorated-heading": 0,
    "heading-level-jump": 0,
    "line-break-hyphenation": 0,
    "page-furniture": 0,
    "malformed-markdown-table": 0,
    "oracle-content": 0,
    "oracle-placement": 0,
  };
  for (const sourcePage of sourceMap.pages) {
    if (sourcePage.kind === "excluded") continue;
    const candidateText = candidatePageText(candidateRoot, sourcePage);
    const candidateTokens = tokens(candidateText);
    const pdfTokens = tokens(pdfPages[sourcePage.page - 1] ?? "");
    const tokenF1 = multisetF1(candidateTokens, pdfTokens);
    const shingleF1 = multisetF1(
      shingles(candidateTokens),
      shingles(pdfTokens),
    );
    const failures = polishFailures(candidateText);
    const expectedFiles = expectedFilesByPage.get(sourcePage.page);
    const actualFiles = new Set(
      sourcePage.fragments.map((fragment) => fragment.file),
    );
    const placementMatches =
      expectedFiles === undefined ||
      (expectedFiles.size === actualFiles.size &&
        [...expectedFiles].every((file) => actualFiles.has(file)));
    const contentFailures: readonly PolishCategory[] =
      oracleContentFailurePages.has(sourcePage.page) ? ["oracle-content"] : [];
    const placementFailures: readonly PolishCategory[] = placementMatches
      ? []
      : ["oracle-placement"];
    const assessedFailures: readonly PolishCategory[] = [
      ...failures,
      ...contentFailures,
      ...placementFailures,
    ];
    for (const failure of assessedFailures) polishFailureCounts[failure] += 1;
    pages.push({
      page: sourcePage.page,
      tokenF1,
      shingleF1,
      semanticSimilarity:
        TOKEN_SIMILARITY_WEIGHT * tokenF1 +
        SHINGLE_SIMILARITY_WEIGHT * shingleF1,
      polishFailures: assessedFailures,
    });
  }
  const semanticSimilarity =
    pages.reduce((total, page) => total + page.semanticSimilarity, 0) /
    Math.max(pages.length, 1);
  const polishFailureTotal = Object.values(polishFailureCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const generalPolishCategories = POLISH_CATEGORIES.length - 2;
  const polishOpportunities =
    pages.length * generalPolishCategories +
    expectedFilesByPage.size +
    oracleContentPages.size;
  const semanticLossPpm = Math.round((1 - semanticSimilarity) * 1_000_000);
  const polishLossPpm = Math.round(
    (polishFailureTotal / Math.max(polishOpportunities, 1)) * 1_000_000,
  );
  return {
    qualityLossPpm: Math.round(
      SEMANTIC_LOSS_WEIGHT * semanticLossPpm +
        POLISH_LOSS_WEIGHT * polishLossPpm,
    ),
    semanticLossPpm,
    polishLossPpm,
    generatedPages: pages.length,
    excludedPages: sourceMap.pages.length - pages.length,
    polishFailureCounts,
    pages,
  };
};
