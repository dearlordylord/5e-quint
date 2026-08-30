import { Brand, Schema } from "effect";
import {
  CreatureId,
  Initiative,
  NonNegativeInteger,
  ResourceCount,
} from "@dnd/shared/types";
import { semanticRefinement } from "@dnd/shared/semantic-refinement";

const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);

export const CombatantId = CreatureId.pipe(Schema.brand("CombatantId"));
export type CombatantId = typeof CombatantId.Type;
export const combatantId: (value: string) => CombatantId = CombatantId.make;

export const BattleObjectId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleObjectId"),
);
export type BattleObjectId = typeof BattleObjectId.Type;
export const battleObjectId: (value: string) => BattleObjectId =
  BattleObjectId.make;

export const BattleAreaId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleAreaId"),
);
export type BattleAreaId = typeof BattleAreaId.Type;
export const battleAreaId: (value: string) => BattleAreaId = BattleAreaId.make;

export const BattleTablePositionId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleTablePositionId"),
);
export type BattleTablePositionId = typeof BattleTablePositionId.Type;
export const battleTablePositionId: (value: string) => BattleTablePositionId =
  BattleTablePositionId.make;

export const BattleCompanionFormId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleCompanionFormId"),
);
export type BattleCompanionFormId = typeof BattleCompanionFormId.Type;
export const battleCompanionFormId: (value: string) => BattleCompanionFormId =
  BattleCompanionFormId.make;

export const BattleLineDirectionId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleLineDirectionId"),
);
export type BattleLineDirectionId = typeof BattleLineDirectionId.Type;
export const battleLineDirectionId: (value: string) => BattleLineDirectionId =
  BattleLineDirectionId.make;

export const BattleMovableLightId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleMovableLightId"),
);
export type BattleMovableLightId = typeof BattleMovableLightId.Type;
export const battleMovableLightId: (value: string) => BattleMovableLightId =
  BattleMovableLightId.make;

export const BattleSpellEffectOccurrenceId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleSpellEffectOccurrenceId"),
);
export type BattleSpellEffectOccurrenceId =
  typeof BattleSpellEffectOccurrenceId.Type;

export const BattleStartTurnOccurrenceId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleStartTurnOccurrenceId"),
);
export type BattleStartTurnOccurrenceId =
  typeof BattleStartTurnOccurrenceId.Type;
export const battleStartTurnOccurrenceId: (
  value: string,
) => BattleStartTurnOccurrenceId = BattleStartTurnOccurrenceId.make;

export const BattleEffectExecutionRef = NonEmptyTrimmedStringSchema.pipe(
  Schema.check(
    Schema.makeFilter(battleEffectExecutionReferenceIsCanonical, {
      message: "Invalid canonical Battle effect execution ref.",
      ...semanticRefinement("canonicalExecutionReferenceSyntax"),
    }),
  ),
  Schema.brand("BattleEffectExecutionRef"),
);
export type BattleEffectExecutionRef = typeof BattleEffectExecutionRef.Type;
export const battleEffectExecutionRef: (
  value: string,
) => BattleEffectExecutionRef = BattleEffectExecutionRef.make;

export const BattleEffectExecutionOrdinal = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("BattleEffectExecutionOrdinal"),
);
export type BattleEffectExecutionOrdinal =
  typeof BattleEffectExecutionOrdinal.Type;
export const battleEffectExecutionOrdinal: (
  value: number,
) => BattleEffectExecutionOrdinal = BattleEffectExecutionOrdinal.make;

export const battleSpellEffectOccurrenceId: (
  value: string,
) => BattleSpellEffectOccurrenceId = BattleSpellEffectOccurrenceId.make;

export const SpellId = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("SpellId"),
);
export type SpellId = typeof SpellId.Type;
export const spellId: (value: string) => SpellId = SpellId.make;

export const BattleId = NonEmptyTrimmedStringSchema.pipe(
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

export const BattleProcedureExecutionRef = NonEmptyTrimmedStringSchema.pipe(
  Schema.check(
    Schema.makeFilter(
      (reference) =>
        nestedExecutionReferenceIsCanonical(reference, "procedure"),
      {
        /* v8 ignore next -- @preserve -- Only a malformed externally decoded reference requests this diagnostic; constructors emit the canonical nested identity shape. */
        message: "Invalid canonical Battle procedure execution ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      },
    ),
  ),
  Schema.brand("BattleProcedureExecutionRef"),
);
export type BattleProcedureExecutionRef =
  typeof BattleProcedureExecutionRef.Type;

export const BattleProcedureExecutionCursor = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("BattleProcedureExecutionCursor"),
);
export type BattleProcedureExecutionCursor =
  typeof BattleProcedureExecutionCursor.Type;
export const battleProcedureExecutionCursor: (
  value: number,
) => BattleProcedureExecutionCursor = BattleProcedureExecutionCursor.make;

export const BattleAttackProcedureExecutionRef =
  BattleProcedureExecutionRef.pipe(
    Schema.check(
      Schema.makeFilter(attackProcedureExecutionReferenceIsCanonical, {
        message: "Invalid canonical Battle attack procedure execution ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      }),
    ),
    Schema.brand("BattleAttackProcedureExecutionRef"),
  );
export type BattleAttackProcedureExecutionRef =
  typeof BattleAttackProcedureExecutionRef.Type;

export const BattleStatBlockProcedureExecutionRef =
  BattleProcedureExecutionRef.pipe(
    Schema.check(
      Schema.makeFilter(statBlockProcedureExecutionReferenceIsCanonical, {
        /* v8 ignore next -- @preserve -- Only a malformed externally decoded Stat Block reference requests this diagnostic; the scoped constructor is canonical. */
        message: "Invalid canonical Battle Stat Block procedure execution ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      }),
    ),
    Schema.brand("BattleStatBlockProcedureExecutionRef"),
  );
export type BattleStatBlockProcedureExecutionRef =
  typeof BattleStatBlockProcedureExecutionRef.Type;

export const BattleResourcePoolExecutionRef = NonEmptyTrimmedStringSchema.pipe(
  Schema.check(
    Schema.makeFilter(battleResourcePoolExecutionReferenceIsCanonical, {
      message: "Invalid canonical Battle resource-pool execution ref.",
      ...semanticRefinement("canonicalExecutionReferenceSyntax"),
    }),
  ),
  Schema.brand("BattleResourcePoolExecutionRef"),
);
export type BattleResourcePoolExecutionRef =
  typeof BattleResourcePoolExecutionRef.Type;

export const BattleSpellAccessExecutionRef = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("BattleSpellAccessExecutionRef"),
);
export type BattleSpellAccessExecutionRef =
  typeof BattleSpellAccessExecutionRef.Type;

export type BattleResourceOwningExecutionScopeRef =
  | BattleStatBlockExecutionScopeRef
  | BattleCharacterExecutionScopeRef;

export const BattleStatBlockExecutionScopeRef =
  NonEmptyTrimmedStringSchema.pipe(
    Schema.check(
      Schema.makeFilter(battleStatBlockExecutionScopeReferenceIsCanonical, {
        message: "Invalid canonical Battle Stat Block execution scope ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      }),
    ),
    Schema.brand("BattleStatBlockExecutionScopeRef"),
  );
export type BattleStatBlockExecutionScopeRef =
  typeof BattleStatBlockExecutionScopeRef.Type;

export const BattleCharacterExecutionScopeRef =
  NonEmptyTrimmedStringSchema.pipe(
    Schema.check(
      Schema.makeFilter(battleCharacterExecutionScopeReferenceIsCanonical, {
        message: "Invalid canonical Battle character execution scope ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      }),
    ),
    Schema.brand("BattleCharacterExecutionScopeRef"),
  );
export type BattleCharacterExecutionScopeRef =
  typeof BattleCharacterExecutionScopeRef.Type;

export const BattleAttackExecutionScopeRef = NonEmptyTrimmedStringSchema.pipe(
  Schema.check(
    Schema.makeFilter(
      (reference) =>
        battleOwnedExecutionScopeReferenceIsCanonical(
          reference,
          "attackExecution",
        ),
      /* v8 ignore next -- @preserve -- Only a malformed externally decoded attack scope requests this diagnostic; the battle-owned scope constructor is canonical. */
      {
        message: "Invalid canonical Battle attack execution scope ref.",
        ...semanticRefinement("canonicalExecutionReferenceSyntax"),
      },
    ),
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
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("BattleExecutionScopeOrdinal"),
);
export type BattleExecutionScopeOrdinal =
  typeof BattleExecutionScopeOrdinal.Type;
export const battleExecutionScopeOrdinal: (
  value: number,
) => BattleExecutionScopeOrdinal = BattleExecutionScopeOrdinal.make;

export function battleExecutionScopeInitialOrNextOrdinal(
  nextScopeOrdinal: BattleExecutionScopeOrdinal | undefined,
): BattleExecutionScopeOrdinal {
  return nextScopeOrdinal ?? battleExecutionScopeOrdinal(0);
}

export const BattleExecutionScopeCursor = BattleExecutionScopeOrdinal.pipe(
  Schema.check(Schema.isGreaterThan(0)),
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

export function battleSpellAccessExecutionRef(
  scopeRef: BattleCharacterExecutionScopeRef,
  ordinal: NonNegativeInteger,
): BattleSpellAccessExecutionRef {
  return BattleSpellAccessExecutionRef.make(
    JSON.stringify({ scopeRef, kind: "spellAccess", ordinal }),
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
    scopeReferenceEncodingIsCanonical(scopeRef, decoded, "statBlockExecution")
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
    scopeReferenceEncodingIsCanonical(scopeRef, decoded, "statBlockExecution")
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
  return battleOwnedExecutionScopeReferenceIsCanonical(
    scopeRef,
    "statBlockExecution",
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

export function battleProcedureExecutionRefBelongsToCombatant(
  procedureRef: BattleProcedureExecutionRef,
  combatantId: CombatantId,
): boolean {
  const decoded = parseExecutionReference(procedureRef);
  if (
    decoded === null ||
    !hasExactKeys(decoded, ["scopeRef", "kind", "ordinal"]) ||
    decoded.kind !== "procedure"
  ) {
    return false;
  }
  const scopeRef = decoded.scopeRef;
  return battleProcedureScopeRefBelongsToCombatant(
    procedureRef,
    scopeRef,
    combatantId,
  );
}

function battleProcedureScopeRefBelongsToCombatant(
  procedureRef: BattleProcedureExecutionRef,
  scopeRef: unknown,
  combatantId: CombatantId,
): boolean {
  if (Schema.is(BattleAttackExecutionScopeRef)(scopeRef)) {
    return battleProcedureScopeAndCombatant(
      procedureRef,
      scopeRef,
      combatantId,
      battleAttackExecutionScopeRefBelongsToCombatant,
    );
  }
  if (Schema.is(BattleStatBlockExecutionScopeRef)(scopeRef)) {
    return battleProcedureScopeAndCombatant(
      procedureRef,
      scopeRef,
      combatantId,
      battleStatBlockExecutionScopeRefBelongsToCombatant,
    );
  }
  return Schema.is(BattleCharacterExecutionScopeRef)(scopeRef)
    ? battleProcedureScopeAndCombatant(
        procedureRef,
        scopeRef,
        combatantId,
        battleCharacterExecutionScopeRefBelongsToCombatant,
      )
    : false;
}

function battleProcedureScopeAndCombatant<
  Scope extends BattleExecutionScopeRef,
>(
  procedureRef: BattleProcedureExecutionRef,
  scopeRef: Scope,
  combatantId: CombatantId,
  belongsToCombatant: (scopeRef: Scope, combatantId: CombatantId) => boolean,
): boolean {
  return (
    battleProcedureExecutionRefBelongsToScope(procedureRef, scopeRef) &&
    belongsToCombatant(scopeRef, combatantId)
  );
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

export function battleEffectExecutionRefOrdinalIsBefore(
  effectRef: BattleEffectExecutionRef,
  scopeRef: BattleExecutionScopeRef,
  nextEffectOrdinal: BattleEffectExecutionOrdinal,
): boolean {
  const decoded = parseExecutionReference(effectRef);
  return (
    decoded !== null &&
    decoded.ownerScopeRef === scopeRef &&
    decoded.kind === "effectOccurrence" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    Number(decoded.ordinal) < nextEffectOrdinal &&
    battleEffectExecutionReferenceIsCanonical(effectRef)
  );
}

export function battleEffectExecutionRefBelongsToScope(
  effectRef: BattleEffectExecutionRef,
  scopeRef: BattleExecutionScopeRef,
): boolean {
  const decoded = parseExecutionReference(effectRef);
  return (
    decoded !== null &&
    decoded.ownerScopeRef === scopeRef &&
    decoded.kind === "effectOccurrence" &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    battleEffectExecutionReferenceIsCanonical(effectRef)
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
  kind: "statBlockExecution" | "characterExecution" | "attackExecution",
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
  kind: "statBlockExecution" | "characterExecution" | "attackExecution",
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

function battleEffectExecutionReferenceIsCanonical(reference: string): boolean {
  const decoded = parseExecutionReference(reference);
  return (
    decoded !== null &&
    hasExactKeys(decoded, ["kind", "ownerScopeRef", "ordinal"]) &&
    decoded.kind === "effectOccurrence" &&
    typeof decoded.ownerScopeRef === "string" &&
    (Schema.is(BattleStatBlockExecutionScopeRef)(decoded.ownerScopeRef) ||
      Schema.is(BattleCharacterExecutionScopeRef)(decoded.ownerScopeRef)) &&
    nonNegativeIntegerProperty(decoded, "ordinal") &&
    reference ===
      JSON.stringify({
        kind: "effectOccurrence",
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
  return battleOwnedExecutionScopeReferenceIsCanonical(
    reference,
    "statBlockExecution",
  );
}

function battleCharacterExecutionScopeReferenceIsCanonical(
  reference: string,
): boolean {
  return battleOwnedExecutionScopeReferenceIsCanonical(
    reference,
    "characterExecution",
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
