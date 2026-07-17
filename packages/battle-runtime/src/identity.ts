import { Brand, Schema } from "effect";
import {
  CreatureId,
  Initiative,
  NonNegativeInteger,
  ResourceCount,
} from "@dnd/shared/types";

export const CombatantId = CreatureId.pipe(Schema.brand("CombatantId"));
export type CombatantId = typeof CombatantId.Type;
export const combatantId: (value: string) => CombatantId = CombatantId.make;

export const BattleObjectId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleObjectId"),
);
export type BattleObjectId = typeof BattleObjectId.Type;
export const battleObjectId: (value: string) => BattleObjectId =
  BattleObjectId.make;

export const BattleAreaId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleAreaId"),
);
export type BattleAreaId = typeof BattleAreaId.Type;
export const battleAreaId: (value: string) => BattleAreaId = BattleAreaId.make;

export const BattleTablePositionId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleTablePositionId"),
);
export type BattleTablePositionId = typeof BattleTablePositionId.Type;
export const battleTablePositionId: (value: string) => BattleTablePositionId =
  BattleTablePositionId.make;

export const BattleLineDirectionId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleLineDirectionId"),
);
export type BattleLineDirectionId = typeof BattleLineDirectionId.Type;
export const battleLineDirectionId: (value: string) => BattleLineDirectionId =
  BattleLineDirectionId.make;

export const BattleDancingLightId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleDancingLightId"),
);
export type BattleDancingLightId = typeof BattleDancingLightId.Type;
export const battleDancingLightId: (value: string) => BattleDancingLightId =
  BattleDancingLightId.make;

export const BattleSpellEffectOccurrenceId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleSpellEffectOccurrenceId"),
);
export type BattleSpellEffectOccurrenceId =
  typeof BattleSpellEffectOccurrenceId.Type;
export const battleSpellEffectOccurrenceId: (
  value: string,
) => BattleSpellEffectOccurrenceId = BattleSpellEffectOccurrenceId.make;

export const SpellId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("SpellId"),
);
export type SpellId = typeof SpellId.Type;
export const spellId: (value: string) => SpellId = SpellId.make;

export const BattleId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleId"),
);
export type BattleId = typeof BattleId.Type;
export const battleId: (value: string) => BattleId = BattleId.make;

export type CharacterId = string & Brand.Brand<"CharacterId">;
const CharacterId = Brand.nominal<CharacterId>();
export const characterId: (value: string) => CharacterId = CharacterId;

export type InitiativeScore = Initiative & Brand.Brand<"InitiativeScore">;
const InitiativeScore = Brand.all(Initiative, Brand.nominal<InitiativeScore>());
export const initiativeScore: (value: number) => InitiativeScore =
  InitiativeScore;

export const BattleReplayStackDepth = ResourceCount.pipe(
  Schema.brand("BattleReplayStackDepth"),
);
export type BattleReplayStackDepth = typeof BattleReplayStackDepth.Type;
export const battleReplayStackDepth: (value: number) => BattleReplayStackDepth =
  BattleReplayStackDepth.make;

export const BattleProcedureExecutionRef = Schema.NonEmptyTrimmedString.pipe(
  Schema.filter(
    (reference) => nestedExecutionReferenceIsCanonical(reference, "procedure"),
    { message: () => "Invalid canonical Battle procedure execution ref." },
  ),
  Schema.brand("BattleProcedureExecutionRef"),
);
export type BattleProcedureExecutionRef =
  typeof BattleProcedureExecutionRef.Type;

export const BattleResourcePoolExecutionRef = Schema.NonEmptyTrimmedString.pipe(
  Schema.filter(battleResourcePoolExecutionReferenceIsCanonical, {
    message: () => "Invalid canonical Battle resource-pool execution ref.",
  }),
  Schema.brand("BattleResourcePoolExecutionRef"),
);
export type BattleResourcePoolExecutionRef =
  typeof BattleResourcePoolExecutionRef.Type;

export const BattleStatBlockExecutionScopeRef =
  Schema.NonEmptyTrimmedString.pipe(
    Schema.filter(battleStatBlockExecutionScopeReferenceIsCanonical, {
      message: () => "Invalid canonical Battle Stat Block execution scope ref.",
    }),
    Schema.brand("BattleStatBlockExecutionScopeRef"),
  );
export type BattleStatBlockExecutionScopeRef =
  typeof BattleStatBlockExecutionScopeRef.Type;

export const BattleCharacterExecutionScopeRef =
  Schema.NonEmptyTrimmedString.pipe(
    Schema.filter(battleCharacterExecutionScopeReferenceIsCanonical, {
      message: () => "Invalid canonical Battle character execution scope ref.",
    }),
    Schema.brand("BattleCharacterExecutionScopeRef"),
  );
export type BattleCharacterExecutionScopeRef =
  typeof BattleCharacterExecutionScopeRef.Type;

export type BattleExecutionScopeRef =
  | BattleStatBlockExecutionScopeRef
  | BattleCharacterExecutionScopeRef;

export const BattleExecutionScopeOrdinal = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("BattleExecutionScopeOrdinal"),
);
export type BattleExecutionScopeOrdinal =
  typeof BattleExecutionScopeOrdinal.Type;
export const battleExecutionScopeOrdinal: (
  value: number,
) => BattleExecutionScopeOrdinal = BattleExecutionScopeOrdinal.make;

export const BattleExecutionScopeCursor = BattleExecutionScopeOrdinal.pipe(
  Schema.greaterThan(0),
  Schema.brand("BattleExecutionScopeCursor"),
);
export type BattleExecutionScopeCursor = typeof BattleExecutionScopeCursor.Type;
export const battleExecutionScopeCursor: (
  value: BattleExecutionScopeOrdinal,
) => BattleExecutionScopeCursor = BattleExecutionScopeCursor.make;

export function battleStatBlockExecutionScopeRef(
  battleId: BattleId,
  combatantId: CombatantId,
  ordinal: BattleExecutionScopeOrdinal,
): BattleStatBlockExecutionScopeRef {
  return BattleStatBlockExecutionScopeRef.make(
    JSON.stringify({
      battleId,
      combatantId,
      kind: "statBlockExecution",
      ordinal,
    }),
  );
}

export function battleCharacterExecutionScopeRef(
  battleId: BattleId,
  combatantId: CombatantId,
  ordinal: BattleExecutionScopeOrdinal,
): BattleCharacterExecutionScopeRef {
  return BattleCharacterExecutionScopeRef.make(
    JSON.stringify({
      battleId,
      combatantId,
      kind: "characterExecution",
      ordinal,
    }),
  );
}

export function battleProcedureExecutionRef(
  scopeRef: BattleExecutionScopeRef,
  ordinal: NonNegativeInteger,
): BattleProcedureExecutionRef {
  return BattleProcedureExecutionRef.make(
    JSON.stringify({ scopeRef, kind: "procedure", ordinal }),
  );
}

export function battleResourcePoolExecutionRef(
  scopeRef: BattleStatBlockExecutionScopeRef,
  ordinal: NonNegativeInteger,
): BattleResourcePoolExecutionRef {
  return BattleResourcePoolExecutionRef.make(
    JSON.stringify({ scopeRef, kind: "resourcePool", ordinal }),
  );
}

export function battleStatBlockExecutionScopeRefBelongsToCombatant(
  scopeRef: BattleStatBlockExecutionScopeRef,
  combatantId: CombatantId,
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "statBlockExecution" &&
    decoded.combatantId === combatantId &&
    scopeReferenceEncodingIsCanonical(scopeRef, decoded)
  );
}

export function battleCharacterExecutionScopeRefBelongsToCombatant(
  scopeRef: BattleCharacterExecutionScopeRef,
  combatantId: CombatantId,
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "characterExecution" &&
    decoded.combatantId === combatantId &&
    battleCharacterExecutionScopeReferenceIsCanonical(scopeRef)
  );
}

export function battleStatBlockExecutionScopeRefBelongsToBattle(
  scopeRef: BattleStatBlockExecutionScopeRef,
  battleId: BattleId,
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "statBlockExecution" &&
    decoded.battleId === battleId &&
    scopeReferenceEncodingIsCanonical(scopeRef, decoded)
  );
}

export function battleCharacterExecutionScopeRefBelongsToBattle(
  scopeRef: BattleCharacterExecutionScopeRef,
  battleId: BattleId,
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "characterExecution" &&
    decoded.battleId === battleId &&
    battleCharacterExecutionScopeReferenceIsCanonical(scopeRef)
  );
}

export function battleStatBlockExecutionScopeRefIsWellFormed(
  scopeRef: BattleStatBlockExecutionScopeRef,
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "statBlockExecution" &&
    typeof decoded.battleId === "string" &&
    decoded.battleId.trim() === decoded.battleId &&
    decoded.battleId.length > 0 &&
    typeof decoded.combatantId === "string" &&
    decoded.combatantId.trim() === decoded.combatantId &&
    decoded.combatantId.length > 0 &&
    scopeReferenceEncodingIsCanonical(scopeRef, decoded)
  );
}

export function battleStatBlockExecutionScopeRefOrdinalIsBefore(
  scopeRef: BattleStatBlockExecutionScopeRef,
  nextScopeOrdinal: BattleExecutionScopeCursor | undefined,
): boolean {
  if (nextScopeOrdinal === undefined) return false;
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    Number(decoded.ordinal) < nextScopeOrdinal
  );
}

export function battleCharacterExecutionScopeRefOrdinalIsBefore(
  scopeRef: BattleCharacterExecutionScopeRef,
  nextScopeOrdinal: BattleExecutionScopeCursor | undefined,
): boolean {
  if (nextScopeOrdinal === undefined) return false;
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    Number(decoded.ordinal) < nextScopeOrdinal
  );
}

export function battleProcedureExecutionRefBelongsToScope(
  procedureRef: BattleProcedureExecutionRef,
  scopeRef: BattleExecutionScopeRef,
): boolean {
  return executionReferenceBelongsToScope(procedureRef, "procedure", scopeRef);
}

export function battleProcedureExecutionRefIsAtOrdinal(
  procedureRef: BattleProcedureExecutionRef,
  scopeRef: BattleExecutionScopeRef,
  ordinal: number,
): boolean {
  const decoded = parseExecutionReference(procedureRef);
  return (
    Number.isInteger(ordinal) &&
    ordinal >= 0 &&
    decoded !== null &&
    decoded.scopeRef === scopeRef &&
    decoded.kind === "procedure" &&
    decoded.ordinal === ordinal &&
    nestedReferenceEncodingIsCanonical(procedureRef, decoded, "procedure")
  );
}

export function battleResourcePoolExecutionRefBelongsToScope(
  resourcePoolRef: BattleResourcePoolExecutionRef,
  scopeRef: BattleStatBlockExecutionScopeRef,
): boolean {
  return executionReferenceBelongsToScope(
    resourcePoolRef,
    "resourcePool",
    scopeRef,
  );
}

function executionReferenceBelongsToScope(
  reference: string,
  kind: "procedure" | "resourcePool",
  scopeRef: BattleExecutionScopeRef,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["scopeRef", "kind", "ordinal"]) &&
    decoded.kind === kind &&
    decoded.scopeRef === scopeRef &&
    nestedReferenceEncodingIsCanonical(reference, decoded, kind)
  );
}

function scopeReferenceEncodingIsCanonical(
  reference: string,
  decoded: Readonly<Record<string, unknown>>,
): boolean {
  return (
    typeof decoded.battleId === "string" &&
    typeof decoded.combatantId === "string" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        battleId: decoded.battleId,
        combatantId: decoded.combatantId,
        kind: "statBlockExecution",
        ordinal: decoded.ordinal,
      })
  );
}

function nestedReferenceEncodingIsCanonical(
  reference: string,
  decoded: Readonly<Record<string, unknown>>,
  kind: "procedure" | "resourcePool",
): boolean {
  return (
    typeof decoded.scopeRef === "string" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        scopeRef: decoded.scopeRef,
        kind,
        ordinal: decoded.ordinal,
      })
  );
}

function battleExecutionScopeReferenceIsCanonical(reference: string): boolean {
  return (
    battleStatBlockExecutionScopeReferenceIsCanonical(reference) ||
    battleCharacterExecutionScopeReferenceIsCanonical(reference)
  );
}

function battleStatBlockExecutionScopeReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "statBlockExecution" &&
    typeof decoded.battleId === "string" &&
    decoded.battleId.trim() === decoded.battleId &&
    decoded.battleId.length > 0 &&
    typeof decoded.combatantId === "string" &&
    decoded.combatantId.trim() === decoded.combatantId &&
    decoded.combatantId.length > 0 &&
    scopeReferenceEncodingIsCanonical(reference, decoded)
  );
}

function battleCharacterExecutionScopeReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === "characterExecution" &&
    typeof decoded.battleId === "string" &&
    decoded.battleId.trim() === decoded.battleId &&
    decoded.battleId.length > 0 &&
    typeof decoded.combatantId === "string" &&
    decoded.combatantId.trim() === decoded.combatantId &&
    decoded.combatantId.length > 0 &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        battleId: decoded.battleId,
        combatantId: decoded.combatantId,
        kind: "characterExecution",
        ordinal: decoded.ordinal,
      })
  );
}

function battleResourcePoolExecutionReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["scopeRef", "kind", "ordinal"]) &&
    decoded.kind === "resourcePool" &&
    typeof decoded.scopeRef === "string" &&
    battleStatBlockExecutionScopeReferenceIsCanonical(decoded.scopeRef) &&
    nestedReferenceEncodingIsCanonical(reference, decoded, "resourcePool")
  );
}

function nestedExecutionReferenceIsCanonical(
  reference: string,
  kind: "procedure" | "resourcePool",
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["scopeRef", "kind", "ordinal"]) &&
    decoded.kind === kind &&
    typeof decoded.scopeRef === "string" &&
    battleExecutionScopeReferenceIsCanonical(decoded.scopeRef) &&
    nestedReferenceEncodingIsCanonical(reference, decoded, kind)
  );
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function parseExecutionReference(
  reference: string,
): Readonly<Record<string, unknown>> | null {
  try {
    const decoded: unknown = JSON.parse(reference);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      return null;
    }
    // Cast evidence: the preceding object guards establish the string-keyed
    // record shape used for property reads below.
    return decoded as Readonly<Record<string, unknown>>;
  } catch {
    return null;
  }
}

function nonNegativeIntegerProperty(
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  const property = value[key];
  return (
    typeof property === "number" && Number.isInteger(property) && property >= 0
  );
}

export const BattleCombatantSide = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleCombatantSide"),
);
export type BattleCombatantSide = typeof BattleCombatantSide.Type;
export const battleCombatantSide: (value: string) => BattleCombatantSide =
  BattleCombatantSide.make;
