// Small leaf helpers shared by creature state and movement speed avoid a cycle
// between those owners.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT

import {
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import type { ArmorCategory, HandUse } from "@dnd/shared/types";
import { Match } from "effect";
import { characterEffectiveLoadoutFromOrigin } from "./battle-object-lifecycle.ts";
import {
  type WildShapeArmorClassWornKind,
  wildShapeEquipmentDispositionWearsKind,
  wildShapeFormLimbsCanHandleObjects,
} from "./wild-shape-equipment.ts";
import {
  type BattleSeeInvisibleEtherealWitness,
  type BattleSeeInvisibleObjectWitness,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import type { ActiveDruidWildShape } from "./druid-wild-shape-types.ts";

export function combatantCanSee(
  state: BattleState,
  viewerId: CombatantId,
  seenId: CombatantId,
): boolean {
  const viewer = state.combatants.get(viewerId);
  if (viewer === undefined) {
    return false;
  }
  const seen = state.combatants.get(seenId);
  const invisibleBenefitDenied = combatantInvisibleBenefitDenied(seen);
  return (
    seen !== undefined &&
    (seen.hidden === null || invisibleBenefitDenied) &&
    (!hasCondition(seen.conditions, "invisible") ||
      invisibleBenefitDenied ||
      combatantHasSeeInvisibleAndEtherealEffect(viewer))
  );
}

export function combatantHasSeeInvisibleAndEtherealEffect(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.activeEffects.some(
      (effect) => effect.kind === "seeInvisibleAndEthereal",
    ) === true
  );
}

export function seeInvisibleRevealsInvisibleObject(
  state: BattleState,
  witness: BattleSeeInvisibleObjectWitness,
): boolean {
  return (
    combatantHasSeeInvisibleAndEtherealEffect(
      state.combatants.get(witness.observerId),
    ) &&
    witness.objectHasInvisibleCondition &&
    witness.hasSightLine &&
    !witness.blockedByOpaqueCover
  );
}

export function seeInvisibleRevealsEtherealWitness(
  state: BattleState,
  witness: BattleSeeInvisibleEtherealWitness,
): boolean {
  return (
    combatantHasSeeInvisibleAndEtherealEffect(
      state.combatants.get(witness.observerId),
    ) &&
    witness.targetPlane === "ethereal" &&
    witness.hasSightLine &&
    !witness.blockedByOpaqueCover
  );
}

export function combatantInvisibleBenefitDenied(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.activeEffects.some(
      (effect) =>
        effect.kind === "faerieFireOutline" ||
        effect.kind === "shiningSmiteIllumination" ||
        effect.kind === "invisibleBenefitDenied",
    ) === true
  );
}

export function currentActorId(state: BattleState): CombatantId {
  return currentActing(state.initiative);
}

export function combatantWearingArmorCategory(
  state: BattleState,
  combatant: BattleCreatureState,
  category: ArmorCategory,
): boolean {
  return (
    combatantArmorWearIsEffective(state, combatant) &&
    combatant.armorClass.base.kind === "armor" &&
    combatant.armorClass.base.category === category
  );
}

export function combatantWearingArmor(
  state: BattleState,
  combatant: BattleCreatureState,
): boolean {
  return (
    combatantArmorWearIsEffective(state, combatant) &&
    combatant.armorClass.base.kind === "armor"
  );
}

function combatantArmorWearIsEffective(
  state: BattleState,
  combatant: BattleCreatureState,
): boolean {
  if (
    combatantActiveDruidWildShape(combatant) !== null &&
    !combatantDruidWildShapeEquipmentWearsKind(combatant, "armor")
  ) {
    return false;
  }
  if (
    combatant.origin.kind === "character" &&
    combatant.origin.selectedLoadout.armor !== undefined &&
    characterEffectiveLoadoutFromOrigin(
      state,
      combatant.combatantId,
      combatant.origin,
    ).armor === undefined
  ) {
    return false;
  }
  return true;
}

export function combatantWieldingShield(
  state: BattleState,
  combatant: BattleCreatureState,
): boolean {
  if (
    combatantActiveDruidWildShape(combatant) !== null &&
    !combatantDruidWildShapeEquipmentWearsKind(combatant, "shield")
  ) {
    return false;
  }
  if (
    combatant.origin.kind === "character" &&
    combatant.origin.selectedLoadout.shield !== undefined &&
    characterEffectiveLoadoutFromOrigin(
      state,
      combatant.combatantId,
      combatant.origin,
    ).shield === undefined
  ) {
    return false;
  }
  return (
    combatant.armorClass.leftHandUse === "shield" ||
    combatant.armorClass.rightHandUse === "shield"
  );
}

export function grappledBy(
  state: BattleState,
  targetId: CombatantId,
): BattleGrappleLink | undefined {
  return state.grapples.find((grapple) => grapple.targetId === targetId);
}

export function combatantHandUses(
  state: BattleState,
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): { readonly left: HandUse; readonly right: HandUse } {
  const leftHandUse = combatantWildShapeEffectiveHandUse(
    combatant,
    combatant.armorClass.leftHandUse,
  );
  const rightHandUse = combatantWildShapeEffectiveHandUse(
    combatant,
    combatant.armorClass.rightHandUse,
  );
  const effectiveLoadout =
    combatant.origin.kind === "character"
      ? characterEffectiveLoadoutFromOrigin(
          state,
          combatant.combatantId,
          combatant.origin,
        )
      : null;
  const selectedLoadout =
    combatant.origin.kind === "character"
      ? combatant.origin.selectedLoadout
      : null;
  return {
    left: handUseForOccupancy(
      (leftHandUse === "shield" &&
        selectedLoadout?.shield !== undefined &&
        effectiveLoadout?.shield === undefined) ||
        (leftHandUse === "offWeapon" &&
          selectedLoadout?.offHandWeapon !== undefined &&
          effectiveLoadout?.offHandWeapon === undefined)
        ? "free"
        : leftHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "left",
      ),
    ),
    right: handUseForOccupancy(
      rightHandUse === "mainWeapon" &&
        selectedLoadout?.weapon !== undefined &&
        effectiveLoadout?.weapon === undefined
        ? "free"
        : rightHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "right",
      ),
    ),
  };
}

function combatantWildShapeEffectiveHandUse(
  combatant: BattleCreatureState,
  handUse: HandUse,
): HandUse {
  const activeForm = combatantActiveDruidWildShape(combatant);
  if (activeForm === null) return handUse;
  const wildShapeEffect = activeForm.effect;
  return Match.value(handUse).pipe(
    Match.when("shield", () =>
      combatantDruidWildShapeEquipmentWearsKind(combatant, "shield")
        ? handUse
        : "free",
    ),
    Match.when("mainWeapon", () =>
      wildShapeFormLimbsCanHandleObjects(wildShapeEffect.formLimbs) &&
      wildShapeEquipmentDispositionWearsKind(
        wildShapeEffect.equipmentDisposition,
        "mainWeapon",
      )
        ? handUse
        : "free",
    ),
    Match.when("offWeapon", () =>
      wildShapeFormLimbsCanHandleObjects(wildShapeEffect.formLimbs) &&
      wildShapeEquipmentDispositionWearsKind(
        wildShapeEffect.equipmentDisposition,
        "offHandWeapon",
      )
        ? handUse
        : "free",
    ),
    Match.when("free", () => handUse),
    Match.when("grapple", () => handUse),
    Match.when("spellCreatedHeldObject", () => handUse),
    Match.exhaustive,
  );
}

export function combatantActiveDruidWildShape(
  combatant: BattleCreatureState | undefined,
): ActiveDruidWildShape | null {
  if (
    combatant === undefined ||
    combatant.origin.kind !== "character" ||
    !combatantHasUnendedDruidWildShapeEffect(combatant)
  ) {
    return null;
  }
  for (const effect of combatant.activeEffects) {
    if (effect.kind !== "druidWildShapeForm") continue;
    const admission = combatant.origin.druidWildShapeAvailableForms?.find(
      (candidate) => candidate.execution.scopeRef === effect.formScopeRef,
    );
    if (admission !== undefined) {
      return { effect, admission };
    }
  }
  return null;
}

function combatantDruidWildShapeEquipmentWearsKind(
  combatant: BattleCreatureState,
  kind: WildShapeArmorClassWornKind,
): boolean {
  const activeForm = combatantActiveDruidWildShape(combatant);
  if (activeForm === null) {
    return false;
  }
  return wildShapeEquipmentDispositionWearsKind(
    activeForm.effect.equipmentDisposition,
    kind,
  );
}

export function combatantHasUnendedDruidWildShapeEffect(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.activeEffects?.some(
      (effect) => effect.kind === "druidWildShapeForm",
    ) === true &&
    Number(combatant.hp) > 0 &&
    !isIncapacitated(combatant.conditions) &&
    (combatant.zeroHpLifecycle === undefined ||
      !zeroHpLifecycleIsTerminal(combatant))
  );
}

function handUseForOccupancy(
  occupancy: HandUse,
  occupiedByGrapple: boolean,
): HandUse {
  if (occupiedByGrapple) return "grapple";
  return occupancy;
}

export function normalizeBattleGrapples(state: BattleState): BattleState {
  const grapples = state.grapples.filter((grapple) => {
    const grappler = state.combatants.get(grapple.grapplerId);
    const target = state.combatants.get(grapple.targetId);
    return (
      grappler !== undefined &&
      target !== undefined &&
      !isIncapacitated(grappler.conditions) &&
      !zeroHpLifecycleIsTerminal(grappler) &&
      !zeroHpLifecycleIsTerminal(target)
    );
  });
  return grapples.length === state.grapples.length
    ? state
    : { ...state, grapples };
}

export function zeroHpLifecycleIsTerminal(
  combatant: BattleCreatureState,
): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}
