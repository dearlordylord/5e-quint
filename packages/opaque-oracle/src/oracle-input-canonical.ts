import { canonicalizeStringSet } from "./oracle-canonical.ts";

type RecordInput = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is RecordInput {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalizeCaseInput(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const creation = isRecord(input.creation) ? input.creation : undefined;
  const sheet = isRecord(input.sheet) ? input.sheet : undefined;
  const canonicalCreation =
    creation === undefined || !Array.isArray(creation.fillBatches)
      ? creation
      : {
          ...creation,
          fillBatches: creation.fillBatches.map((batch) =>
            Array.isArray(batch)
              ? batch.map((fill) => canonicalizeFillInput(fill))
              : batch,
          ),
        };
  const canonicalSheet =
    sheet?.tag === "wildShapeKnownForms" && isStringArray(sheet.statBlockIds)
      ? {
          ...sheet,
          statBlockIds: canonicalizeStringSet(sheet.statBlockIds),
        }
      : sheet;
  return {
    ...input,
    ...(canonicalCreation === undefined ? {} : { creation: canonicalCreation }),
    ...(canonicalSheet === undefined ? {} : { sheet: canonicalSheet }),
  };
}

function canonicalizeFillInput(input: unknown): unknown {
  if (!isRecord(input) || input.kind !== "choice") return input;
  return isStringArray(input.optionIds)
    ? { ...input, optionIds: canonicalizeStringSet(input.optionIds) }
    : input;
}

export function canonicalizeBatchInput(input: unknown): unknown {
  if (!isRecord(input) || !Array.isArray(input.cases)) return input;
  return { ...input, cases: input.cases.map(canonicalizeCaseInput) };
}

export function canonicalizeTraceInput(input: unknown): unknown {
  if (!isRecord(input) || !isRecord(input.creation)) return input;
  const creation = input.creation;
  const outcome = isRecord(creation.outcome)
    ? canonicalizeCreationOutcome(creation.outcome)
    : creation.outcome;
  return {
    ...input,
    creation: {
      ...creation,
      ...(outcome === undefined ? {} : { outcome }),
    },
  };
}

function canonicalizeCreationOutcome(input: RecordInput): unknown {
  if (input.tag !== "built" || !isRecord(input.sheet)) return input;
  const sheet = input.sheet;
  if (sheet.tag !== "constructed" || !isRecord(sheet.sheet)) return input;
  return {
    ...input,
    sheet: {
      ...sheet,
      sheet: canonicalizeFreshSheetProjection(sheet.sheet),
    },
  };
}

function canonicalizeFreshSheetProjection(input: RecordInput): unknown {
  const knownForms = input.druidWildShapeKnownForms;
  return isRecord(knownForms) && isStringArray(knownForms.statBlockIds)
    ? {
        ...input,
        druidWildShapeKnownForms: {
          ...knownForms,
          statBlockIds: canonicalizeStringSet(knownForms.statBlockIds),
        },
      }
    : input;
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((member) => typeof member === "string")
  );
}
