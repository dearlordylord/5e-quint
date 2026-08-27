import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  BattleObjectOutcomeAccumulation,
  BattleResolutionResult,
} from "../battle-state-execution.ts";

type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;

type ObjectOutcomeSource = Pick<
  ResolvedBattleResult,
  "objectDamages" | "objectIgnitions" | "droppedObjects"
>;

function appendNonEmpty<T>(
  current: ReadonlyNonEmptyArray<T> | undefined,
  additions: readonly T[] | undefined,
): ReadonlyNonEmptyArray<T> | undefined {
  const candidates = additions ?? [];
  if (candidates.length === 0) {
    return current;
  }
  const [first, ...rest] = candidates;
  return current === undefined ? [first, ...rest] : [...current, ...candidates];
}

export function appendObjectOutcomeAccumulation(
  current: BattleObjectOutcomeAccumulation | undefined,
  source: ObjectOutcomeSource,
): BattleObjectOutcomeAccumulation | undefined {
  const objectDamages = appendNonEmpty(
    current?.objectDamages,
    source.objectDamages,
  );
  const objectIgnitions = appendNonEmpty(
    current?.objectIgnitions,
    source.objectIgnitions,
  );
  const droppedObjects = appendNonEmpty(
    current?.droppedObjects,
    source.droppedObjects,
  );
  if (
    objectDamages === undefined &&
    objectIgnitions === undefined &&
    droppedObjects === undefined
  ) {
    return undefined;
  }
  if (objectDamages !== undefined) {
    return {
      objectDamages,
      ...(objectIgnitions === undefined ? {} : { objectIgnitions }),
      ...(droppedObjects === undefined ? {} : { droppedObjects }),
    };
  }
  if (objectIgnitions !== undefined) {
    return {
      objectIgnitions,
      ...(droppedObjects === undefined ? {} : { droppedObjects }),
    };
  }
  return droppedObjects === undefined ? undefined : { droppedObjects };
}

export function mergeObjectOutcomeResult(
  result: ResolvedBattleResult,
  accumulated: BattleObjectOutcomeAccumulation | undefined,
): ResolvedBattleResult {
  const outcomes = appendObjectOutcomeAccumulation(accumulated, result);
  return outcomes === undefined
    ? result
    : {
        ...result,
        ...(outcomes.objectDamages === undefined
          ? {}
          : { objectDamages: outcomes.objectDamages }),
        ...(outcomes.objectIgnitions === undefined
          ? {}
          : { objectIgnitions: outcomes.objectIgnitions }),
        ...(outcomes.droppedObjects === undefined
          ? {}
          : { droppedObjects: outcomes.droppedObjects }),
      };
}
