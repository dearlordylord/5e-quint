import {
  canonicalizeStringSet,
  compareCodePoints,
} from "./oracle-canonical.ts";

type RecordInput = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is RecordInput {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

export function canonicalizeCaseInput(input: unknown): unknown {
  try {
    return canonicalizeCaseInputUnsafe(input);
  } catch {
    return input;
  }
}

function canonicalizeCaseInputUnsafe(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const creation = isRecord(input.creation) ? input.creation : undefined;
  const sheet = isRecord(input.sheet) ? input.sheet : undefined;
  const battle = isRecord(input.battle) ? input.battle : undefined;
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
  const canonicalBattle =
    battle === undefined ? undefined : canonicalizeBattleInput(battle);
  return {
    ...input,
    ...(canonicalCreation === undefined ? {} : { creation: canonicalCreation }),
    ...(canonicalSheet === undefined ? {} : { sheet: canonicalSheet }),
    ...(canonicalBattle === undefined ? {} : { battle: canonicalBattle }),
  };
}

function canonicalizeFillInput(input: unknown): unknown {
  if (!isRecord(input) || input.kind !== "choice") return input;
  return isStringArray(input.optionIds)
    ? { ...input, optionIds: canonicalizeStringSet(input.optionIds) }
    : input;
}

export function canonicalizeBatchInput(input: unknown): unknown {
  try {
    if (!isRecord(input) || !Array.isArray(input.cases)) return input;
    return { ...input, cases: input.cases.map(canonicalizeCaseInput) };
  } catch {
    return input;
  }
}

export function canonicalizeTraceInput(input: unknown): unknown {
  try {
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
  } catch {
    return input;
  }
}

function canonicalizeCreationOutcome(input: RecordInput): unknown {
  if (input.tag !== "built" || !isRecord(input.sheet)) return input;
  const sheet = input.sheet;
  if (sheet.tag !== "constructed" || !isRecord(sheet.sheet)) return input;
  const battle = isRecord(sheet.battle)
    ? canonicalizeBattleOutcome(sheet.battle)
    : sheet.battle;
  return {
    ...input,
    sheet: {
      ...sheet,
      sheet: canonicalizeFreshSheetProjection(sheet.sheet),
      ...(battle === undefined ? {} : { battle }),
    },
  };
}

function canonicalizeBattleInput(input: RecordInput): unknown {
  if (!isRecord(input.roster)) return input;
  return { ...input, roster: canonicalizeRoster(input.roster) };
}

function canonicalizeRoster(input: RecordInput): unknown {
  if (input.tag === "statBlocks" && Array.isArray(input.entries)) {
    return {
      ...input,
      entries: input.entries.map((entry) => canonicalizeRosterEntry(entry)),
    };
  }
  if (input.tag !== "characterSheet") return input;
  return {
    ...input,
    ...(Array.isArray(input.precedingStatBlocks)
      ? {
          precedingStatBlocks: input.precedingStatBlocks.map((entry) =>
            canonicalizeRosterEntry(entry),
          ),
        }
      : {}),
    ...(Array.isArray(input.followingStatBlocks)
      ? {
          followingStatBlocks: input.followingStatBlocks.map((entry) =>
            canonicalizeRosterEntry(entry),
          ),
        }
      : {}),
  };
}

function canonicalizeRosterEntry(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const conditions = isStringArray(input.conditions)
    ? canonicalizeStringSet(input.conditions)
    : input.conditions;
  const ammunitionStocks = canonicalizeAmmunitionStocks(input.ammunitionStocks);
  return {
    ...input,
    ...(conditions === undefined ? {} : { conditions }),
    ...(ammunitionStocks === undefined ? {} : { ammunitionStocks }),
  };
}

function canonicalizeAmmunitionStocks(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const keys = Object.keys(input).sort(compareCodePoints);
  return Object.fromEntries(keys.map((key) => [key, input[key]]));
}

function canonicalizeBattleOutcome(input: RecordInput): unknown {
  if (input.tag !== "entered") return input;
  const checkpoint = isRecord(input.checkpoint)
    ? canonicalizeCheckpoint(input.checkpoint)
    : input.checkpoint;
  const segment = isRecord(input.segment)
    ? canonicalizeBattleSegment(input.segment)
    : input.segment;
  return {
    ...input,
    ...(checkpoint === undefined ? {} : { checkpoint }),
    ...(segment === undefined ? {} : { segment }),
  };
}

function canonicalizeBattleSegment(input: RecordInput): unknown {
  if (!isRecord(input.outcome)) return input;
  const outcome = input.outcome;
  if (outcome.tag === "next" && isRecord(outcome.continuation)) {
    return {
      ...input,
      outcome: {
        ...outcome,
        continuation: canonicalizeBattleContinuation(outcome.continuation),
      },
    };
  }
  if (outcome.tag === "resolved" && isRecord(outcome.checkpoint)) {
    return {
      ...input,
      outcome: {
        ...outcome,
        checkpoint: canonicalizeCheckpoint(outcome.checkpoint),
      },
    };
  }
  return input;
}

function canonicalizeBattleContinuation(input: RecordInput): unknown {
  const checkpoint = isRecord(input.checkpoint)
    ? canonicalizeCheckpoint(input.checkpoint)
    : input.checkpoint;
  const segment = isRecord(input.segment)
    ? canonicalizeBattleSegment(input.segment)
    : input.segment;
  return {
    ...input,
    ...(checkpoint === undefined ? {} : { checkpoint }),
    ...(segment === undefined ? {} : { segment }),
  };
}

function canonicalizeCheckpoint(input: RecordInput): unknown {
  const canonicalEntries = (entries: unknown): unknown =>
    !Array.isArray(entries)
      ? entries
      : entries.map((entry) => {
          if (!isRecord(entry) || !isRecord(entry.creature)) return entry;
          const creature = entry.creature;
          return !isStringArray(creature.conditions)
            ? entry
            : {
                ...entry,
                creature: {
                  ...creature,
                  conditions: canonicalizeStringSet(creature.conditions),
                },
              };
        });
  return {
    ...input,
    ...(Array.isArray(input.alreadyActed)
      ? { alreadyActed: canonicalEntries(input.alreadyActed) }
      : {}),
    ...(Array.isArray(input.stillToAct)
      ? { stillToAct: canonicalEntries(input.stillToAct) }
      : {}),
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
  try {
    return (
      Array.isArray(value) &&
      value.every((member) => typeof member === "string")
    );
  } catch {
    return false;
  }
}
