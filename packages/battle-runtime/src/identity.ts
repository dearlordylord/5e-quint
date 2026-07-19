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

export const BattleActiveEffectExecutionRef = Schema.NonEmptyTrimmedString.pipe(
  Schema.filter(battleActiveEffectExecutionReferenceIsCanonical, {
    message: () => "Invalid canonical Battle active-effect execution ref.",
  }),
  Schema.brand("BattleActiveEffectExecutionRef"),
);
export type BattleActiveEffectExecutionRef =
  typeof BattleActiveEffectExecutionRef.Type;
export const battleActiveEffectExecutionRef: (
  value: string,
) => BattleActiveEffectExecutionRef = BattleActiveEffectExecutionRef.make;

export const BattleActiveEffectExecutionOrdinal = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("BattleActiveEffectExecutionOrdinal"),
);
export type BattleActiveEffectExecutionOrdinal =
  typeof BattleActiveEffectExecutionOrdinal.Type;
export const battleActiveEffectExecutionOrdinal: (
  value: number,
) => BattleActiveEffectExecutionOrdinal =
  BattleActiveEffectExecutionOrdinal.make;

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

export const BattleProcedureExecutionCursor = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("BattleProcedureExecutionCursor"),
);
export type BattleProcedureExecutionCursor =
  typeof BattleProcedureExecutionCursor.Type;
export const battleProcedureExecutionCursor: (
  value: number,
) => BattleProcedureExecutionCursor = BattleProcedureExecutionCursor.make;

export const BattleAttackProcedureExecutionRef =
  BattleProcedureExecutionRef.pipe(
    Schema.filter(attackProcedureExecutionReferenceIsCanonical, {
      message: () => "Invalid canonical Battle attack procedure execution ref.",
    }),
    Schema.brand("BattleAttackProcedureExecutionRef"),
  );
export type BattleAttackProcedureExecutionRef =
  typeof BattleAttackProcedureExecutionRef.Type;

export const BattleStatBlockProcedureExecutionRef =
  BattleProcedureExecutionRef.pipe(
    Schema.filter(statBlockProcedureExecutionReferenceIsCanonical, {
      message: () =>
        "Invalid canonical Battle Stat Block procedure execution ref.",
    }),
    Schema.brand("BattleStatBlockProcedureExecutionRef"),
  );
export type BattleStatBlockProcedureExecutionRef =
  typeof BattleStatBlockProcedureExecutionRef.Type;

export const BattleResourcePoolExecutionRef = Schema.NonEmptyTrimmedString.pipe(
  Schema.filter(battleResourcePoolExecutionReferenceIsCanonical, {
    message: () => "Invalid canonical Battle resource-pool execution ref.",
  }),
  Schema.brand("BattleResourcePoolExecutionRef"),
);
export type BattleResourcePoolExecutionRef =
  typeof BattleResourcePoolExecutionRef.Type;

export type BattleResourceOwningExecutionScopeRef =
  | BattleStatBlockExecutionScopeRef
  | BattleCharacterExecutionScopeRef;

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

export const BattleAttackExecutionScopeRef = Schema.NonEmptyTrimmedString.pipe(
  Schema.filter(
    (reference) =>
      battleOwnedExecutionScopeReferenceIsCanonical(
        reference,
        "attackExecution",
      ),
    { message: () => "Invalid canonical Battle attack execution scope ref." },
  ),
  Schema.brand("BattleAttackExecutionScopeRef"),
);
export type BattleAttackExecutionScopeRef =
  typeof BattleAttackExecutionScopeRef.Type;

export type BattleExecutionScopeRef =
  | BattleStatBlockExecutionScopeRef
  | BattleCharacterExecutionScopeRef
  | BattleAttackExecutionScopeRef;

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

export function battleAttackExecutionScopeRef(
  battleId: BattleId,
  combatantId: CombatantId,
  ordinal: BattleExecutionScopeOrdinal,
): BattleAttackExecutionScopeRef {
  return BattleAttackExecutionScopeRef.make(
    JSON.stringify({
      battleId,
      combatantId,
      kind: "attackExecution",
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

export function battleStatBlockProcedureExecutionRef(
  scopeRef: BattleStatBlockExecutionScopeRef,
  ordinal: NonNegativeInteger,
): BattleStatBlockProcedureExecutionRef {
  return BattleStatBlockProcedureExecutionRef.make(
    JSON.stringify({ scopeRef, kind: "procedure", ordinal }),
  );
}

export function battleAttackProcedureExecutionRef(
  scopeRef: BattleAttackExecutionScopeRef,
  ordinal: NonNegativeInteger,
): BattleAttackProcedureExecutionRef {
  return BattleAttackProcedureExecutionRef.make(
    JSON.stringify({ scopeRef, kind: "procedure", ordinal }),
  );
}

export function battleAttackExecutionScopeRefForProcedureRef(
  procedureRef: BattleAttackProcedureExecutionRef,
): BattleAttackExecutionScopeRef {
  const decoded = parseExecutionReference(procedureRef);
  if (decoded === null || typeof decoded.scopeRef !== "string") {
    throw new Error(
      "Canonical Battle attack procedure ref must contain an attack execution scope ref.",
    );
  }
  return BattleAttackExecutionScopeRef.make(decoded.scopeRef);
}

export function battleAttackExecutionScopeRefBelongsToCombatant(
  scopeRef: BattleAttackExecutionScopeRef,
  combatantId: CombatantId,
): boolean {
  return battleOwnedExecutionScopeRefBelongsToCombatant(
    scopeRef,
    combatantId,
    "attackExecution",
  );
}

export function battleAttackExecutionScopeRefBelongsToBattle(
  scopeRef: BattleAttackExecutionScopeRef,
  battleId: BattleId,
): boolean {
  return battleOwnedExecutionScopeRefBelongsToBattle(
    scopeRef,
    battleId,
    "attackExecution",
  );
}

export function battleAttackExecutionScopeRefOrdinalIsBefore(
  scopeRef: BattleAttackExecutionScopeRef,
  nextScopeOrdinal: BattleExecutionScopeCursor | undefined,
): boolean {
  return battleOwnedExecutionScopeRefOrdinalIsBefore(
    scopeRef,
    nextScopeOrdinal,
  );
}

export function battleResourcePoolExecutionRef(
  scopeRef: BattleResourceOwningExecutionScopeRef,
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

export function battleProcedureExecutionRefOrdinalIsBefore(
  procedureRef: BattleProcedureExecutionRef,
  scopeRef: BattleExecutionScopeRef,
  nextProcedureOrdinal: BattleProcedureExecutionCursor,
): boolean {
  const decoded = parseExecutionReference(procedureRef);
  return (
    decoded !== null &&
    decoded.scopeRef === scopeRef &&
    decoded.kind === "procedure" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    Number(decoded.ordinal) < nextProcedureOrdinal &&
    nestedReferenceEncodingIsCanonical(procedureRef, decoded, "procedure")
  );
}

export function battleResourcePoolExecutionRefBelongsToScope(
  resourcePoolRef: BattleResourcePoolExecutionRef,
  scopeRef: BattleResourceOwningExecutionScopeRef,
): boolean {
  return executionReferenceBelongsToScope(
    resourcePoolRef,
    "resourcePool",
    scopeRef,
  );
}

export function battleActiveEffectExecutionRefBelongsToScope(
  effectRef: BattleActiveEffectExecutionRef,
  scopeRef: BattleExecutionScopeRef,
): boolean {
  const decoded = parseExecutionReference(effectRef);
  return (
    decoded !== null &&
    decoded.ownerScopeRef === scopeRef &&
    decoded.kind === "activeEffectOccurrence" &&
    battleActiveEffectExecutionReferenceIsCanonical(effectRef)
  );
}

export function battleActiveEffectExecutionRefOrdinalIsBefore(
  effectRef: BattleActiveEffectExecutionRef,
  scopeRef: BattleExecutionScopeRef,
  nextEffectOrdinal: BattleActiveEffectExecutionOrdinal,
): boolean {
  const decoded = parseExecutionReference(effectRef);
  return (
    battleActiveEffectExecutionRefBelongsToScope(effectRef, scopeRef) &&
    decoded !== null &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    Number(decoded.ordinal) < nextEffectOrdinal &&
    battleActiveEffectExecutionReferenceIsCanonical(effectRef)
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

function battleOwnedExecutionScopeRefBelongsToCombatant(
  scopeRef: string,
  combatantId: CombatantId,
  kind: "attackExecution",
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === kind &&
    decoded.combatantId === combatantId &&
    scopeReferenceEncodingIsCanonical(scopeRef, decoded, kind)
  );
}

function battleOwnedExecutionScopeRefBelongsToBattle(
  scopeRef: string,
  battleId: BattleId,
  kind: "attackExecution",
): boolean {
  const decoded = parseExecutionReference(scopeRef);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === kind &&
    decoded.battleId === battleId &&
    scopeReferenceEncodingIsCanonical(scopeRef, decoded, kind)
  );
}

function battleOwnedExecutionScopeRefOrdinalIsBefore(
  scopeRef: string,
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

function scopeReferenceEncodingIsCanonical(
  reference: string,
  decoded: Readonly<Record<string, unknown>>,
  kind: "statBlockExecution" | "attackExecution" = "statBlockExecution",
): boolean {
  return (
    typeof decoded.battleId === "string" &&
    typeof decoded.combatantId === "string" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        battleId: decoded.battleId,
        combatantId: decoded.combatantId,
        kind,
        ordinal: decoded.ordinal,
      })
  );
}

function battleOwnedExecutionScopeReferenceIsCanonical(
  reference: string,
  kind: "attackExecution",
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["battleId", "combatantId", "kind", "ordinal"]) &&
    decoded.kind === kind &&
    typeof decoded.battleId === "string" &&
    decoded.battleId.trim() === decoded.battleId &&
    decoded.battleId.length > 0 &&
    typeof decoded.combatantId === "string" &&
    decoded.combatantId.trim() === decoded.combatantId &&
    decoded.combatantId.length > 0 &&
    scopeReferenceEncodingIsCanonical(reference, decoded, kind)
  );
}

function battleActiveEffectExecutionReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["kind", "ownerScopeRef", "ordinal"]) &&
    decoded.kind === "activeEffectOccurrence" &&
    typeof decoded.ownerScopeRef === "string" &&
    (Schema.is(BattleStatBlockExecutionScopeRef)(decoded.ownerScopeRef) ||
      Schema.is(BattleCharacterExecutionScopeRef)(decoded.ownerScopeRef)) &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        kind: "activeEffectOccurrence",
        ownerScopeRef: decoded.ownerScopeRef,
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
    battleCharacterExecutionScopeReferenceIsCanonical(reference) ||
    battleOwnedExecutionScopeReferenceIsCanonical(reference, "attackExecution")
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
    (battleStatBlockExecutionScopeReferenceIsCanonical(decoded.scopeRef) ||
      battleCharacterExecutionScopeReferenceIsCanonical(decoded.scopeRef)) &&
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
    (kind === "procedure"
      ? battleExecutionScopeReferenceIsCanonical(decoded.scopeRef)
      : battleStatBlockExecutionScopeReferenceIsCanonical(decoded.scopeRef)) &&
    nestedReferenceEncodingIsCanonical(reference, decoded, kind)
  );
}

function attackProcedureExecutionReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    nestedExecutionReferenceIsCanonical(reference, "procedure") &&
    typeof decoded.scopeRef === "string" &&
    battleOwnedExecutionScopeReferenceIsCanonical(
      decoded.scopeRef,
      "attackExecution",
    )
  );
}

function statBlockProcedureExecutionReferenceIsCanonical(
  reference: string,
): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    nestedExecutionReferenceIsCanonical(reference, "procedure") &&
    typeof decoded.scopeRef === "string" &&
    battleStatBlockExecutionScopeReferenceIsCanonical(decoded.scopeRef)
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
