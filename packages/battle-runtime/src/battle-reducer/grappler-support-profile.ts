// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.grappler

import type { BattleUnitRef } from "../battle-init.ts";
import type {
  BattleCreatureState,
  CharacterBattleCreatureState,
} from "../battle-reducer.ts";
import {
  GRAPPLER_SUPPORT_PROFILE,
  type BattleGrapplerSupportProfile,
  type BattleUnitSupportProfile,
} from "../unit-feature-support.ts";

export type BattleGrapplerSupportProfileRef = {
  readonly unitRef: BattleUnitRef;
  readonly profile: BattleGrapplerSupportProfile;
};

export function grapplerSupportProfileRefForCombatant(
  combatant: BattleCreatureState | undefined,
): BattleGrapplerSupportProfileRef | null {
  if (combatant?.origin.kind !== "character") {
    return null;
  }
  return grapplerSupportProfileRefForUnitRefs(
    combatant.origin.characterUnitRefs,
  );
}

export function combatantHasGrapplerSupportProfile(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return grapplerSupportProfileRefForCombatant(combatant) !== null;
}

function grapplerSupportProfileRefForUnitRefs(
  unitRefs: readonly BattleUnitRef[],
): BattleGrapplerSupportProfileRef | null {
  for (const unitRef of unitRefs) {
    const profile = grapplerSupportProfileForUnitRef(unitRef);
    if (profile !== null) {
      return { unitRef, profile };
    }
  }
  return null;
}

function grapplerSupportProfileForUnitRef(
  unitRef: BattleUnitRef,
): BattleGrapplerSupportProfile | null {
  return unitRef.supportProfiles.find(isBattleGrapplerSupportProfile) ?? null;
}

function isBattleGrapplerSupportProfile(
  profile: BattleUnitSupportProfile,
): profile is BattleGrapplerSupportProfile {
  return (
    typeof profile === "object" && profile.kind === GRAPPLER_SUPPORT_PROFILE
  );
}
