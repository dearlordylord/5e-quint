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
  type BattleId,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";

export type CharacterAttackExecution = {
  readonly attack: BoundCharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: BoundCharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: BoundCharacterWeaponAttackActionOption;
};

export function admitCharacterAttackExecution(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
  readonly attack: CharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: CharacterWeaponAttackActionOption;
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
    },
    nextScopeOrdinal: battleExecutionScopeOrdinal(
      Number(input.startingScopeOrdinal) + 1,
    ),
  };
}
