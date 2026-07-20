// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.grappler

import type {
  BattleCreatureState,
  CharacterBattleCreatureState,
} from "../battle-reducer.ts";

export function combatantHasGrapplerSupportProfile(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return (
    combatant?.origin.kind === "character" &&
    combatant.origin.execution.procedureBindings.some((binding) => {
      const procedure = binding.procedure;
      return (
        (procedure.kind === "unitFeature" ||
          procedure.kind === "unitSupportProfile") &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "grappler"
      );
    })
  );
}
