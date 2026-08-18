import { publicSdkTypeHelp } from "./public-sdk-type-help.ts";

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function observationProjection(value: unknown): JsonRecord | undefined {
  if (!isRecord(value)) return undefined;
  const observation = isRecord(value.observation) ? value.observation : value;
  return isRecord(observation.projection) ? observation.projection : undefined;
}

function holeKind(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.hole)) return undefined;
  return typeof value.hole.kind === "string" ? value.hole.kind : undefined;
}

export type FrontierFillKindsResult =
  | { readonly tag: "valid"; readonly kinds: readonly string[] }
  | { readonly tag: "invalid"; readonly message: string };

export function frontierFillKinds(value: unknown): FrontierFillKindsResult {
  const projection = observationProjection(value);
  const frontier = isRecord(projection?.frontier)
    ? projection.frontier
    : undefined;
  if (frontier?.kind === "none") return { tag: "valid", kinds: [] };
  const occurrences: unknown[] = [];
  if (frontier?.kind === "holes" && Array.isArray(frontier.holes)) {
    occurrences.push(...frontier.holes);
  } else if (frontier?.kind === "acts" && Array.isArray(frontier.acts)) {
    for (const act of frontier.acts) {
      if (!isRecord(act) || !Array.isArray(act.holes)) {
        return {
          tag: "invalid",
          message: "Player act frontier has malformed hole occurrences.",
        };
      }
      occurrences.push(...act.holes);
    }
  } else {
    return {
      tag: "invalid",
      message: "Player observation has no valid frontier.",
    };
  }
  const kinds: string[] = [];
  for (const occurrence of occurrences) {
    const kind = holeKind(occurrence);
    if (kind === undefined) {
      return {
        tag: "invalid",
        message: "Player frontier has a malformed hole occurrence.",
      };
    }
    kinds.push(kind);
  }
  return { tag: "valid", kinds: [...new Set(kinds)].sort() };
}

export type FrontierFillTypeHelpResult =
  | { readonly tag: "valid"; readonly markdown: string }
  | { readonly tag: "invalid"; readonly message: string };

export function frontierFillTypeHelp(input: {
  readonly observation: unknown;
  readonly artifact: unknown;
  readonly declarationGraphSha256: string;
}): FrontierFillTypeHelpResult {
  const decoded = frontierFillKinds(input.observation);
  if (decoded.tag === "invalid") return decoded;
  if (decoded.kinds.length === 0) {
    return {
      tag: "valid",
      markdown:
        "# Frontier fill types\n\nThe current frontier requests no fills.\n",
    };
  }
  const sections: string[] = [];
  for (const kind of decoded.kinds) {
    const result = publicSdkTypeHelp(
      input.artifact,
      kind,
      input.declarationGraphSha256,
    );
    if (result.tag !== "found") {
      return { tag: "invalid", message: result.message };
    }
    sections.push(`## ${kind}\n\n\`\`\`ts\n${result.declaration}\`\`\``);
  }
  return {
    tag: "valid",
    markdown: `# Frontier fill types\n\n${sections.join("\n\n")}\n`,
  };
}
