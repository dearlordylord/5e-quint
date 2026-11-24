import { NonNegativeInteger } from "@dnd/shared/types";
import type {
  BoundCharacterUnarmedStrikeActionOption,
  BoundCharacterWeaponAttackActionOption,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
} from "./battle-action-options.ts";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleExecutionScopeOrdinal,
  battleProcedureExecutionRefIsAtOrdinal,
  type BattleId,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";

export type CharacterAttackExecution = {
  readonly attack: BoundCharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: BoundCharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: BoundCharacterWeaponAttackActionOption;
  /** The bindings of the owned weapons outside the selected loadout. */
  readonly otherOwnedWeaponAttacks: readonly BoundCharacterWeaponAttackActionOption[];
};

type BattleAttackProcedureExecutionRef = ReturnType<
  typeof battleAttackProcedureExecutionRef
>;

export type CharacterAttackExecutionSnapshotRefs = {
  readonly attackProcedureRef: BattleAttackProcedureExecutionRef | null;
  readonly unarmedStrikeProcedureRef: BattleAttackProcedureExecutionRef;
  readonly offHandAttackProcedureRef: BattleAttackProcedureExecutionRef | null;
  readonly otherOwnedWeaponAttackProcedureRefs: readonly BattleAttackProcedureExecutionRef[];
};

/** Every attack procedure the character has bound, in no particular order. */
export function characterAttackExecutionProcedureRefs(
  refs: CharacterAttackExecutionSnapshotRefs,
): readonly BattleAttackProcedureExecutionRef[] {
  return [
    ...(refs.attackProcedureRef === null ? [] : [refs.attackProcedureRef]),
    refs.unarmedStrikeProcedureRef,
    ...(refs.offHandAttackProcedureRef === null
      ? []
      : [refs.offHandAttackProcedureRef]),
    ...refs.otherOwnedWeaponAttackProcedureRefs,
  ];
}

/**
 * Battle start binds one attack procedure for the Unarmed Strike and one for
 * each owned weapon, at consecutive ordinals of the attack scope. Equipping a
 * weapon moves its binding between the hand slots and the other owned
 * weapons, so a snapshot's refs are those ordinals in any order.
 */
export function characterAttackExecutionRefsMatchLayout(
  scopeRef: ReturnType<typeof battleAttackExecutionScopeRef>,
  refs: CharacterAttackExecutionSnapshotRefs,
): boolean {
  const procedureRefs = characterAttackExecutionProcedureRefs(refs);
  return (
    new Set(procedureRefs).size === procedureRefs.length &&
    procedureRefs.every((procedureRef) =>
      procedureRefs.some((_, ordinal) =>
        battleProcedureExecutionRefIsAtOrdinal(procedureRef, scopeRef, ordinal),
      ),
    )
  );
}

export function admitCharacterAttackExecution(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
  readonly attack: CharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: CharacterWeaponAttackActionOption;
  readonly otherOwnedWeaponAttacks: readonly CharacterWeaponAttackActionOption[];
}): {
  readonly execution: CharacterAttackExecution;
  readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
} {
  const scopeRef = battleAttackExecutionScopeRef(
    input.battleId,
    input.combatantId,
    input.startingScopeOrdinal,
  );
  let procedureOrdinal = 0;
  const bind = <T extends object>(
    procedure: T,
  ): T & {
    readonly procedureRef: ReturnType<typeof battleAttackProcedureExecutionRef>;
  } => ({
    ...procedure,
    procedureRef: battleAttackProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(procedureOrdinal++),
    ),
  });

  return {
    execution: {
      attack: input.attack === null ? null : bind(input.attack),
      unarmedStrike: bind(input.unarmedStrike),
      ...(input.offHandAttack === undefined
        ? {}
        : { offHandAttack: bind(input.offHandAttack) }),
      otherOwnedWeaponAttacks: input.otherOwnedWeaponAttacks.map(bind),
    },
    nextScopeOrdinal: battleExecutionScopeOrdinal(
      Number(input.startingScopeOrdinal) + 1,
    ),
  };
}
