// Small leaf helpers shared between G (creature_state) and S (movement_speed).
// Mechanical extraction — no behavior change. Per cycle #17/#26 in the
// refactor map, hoisting these here lets S avoid cycling back into G.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT

import {
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import type { ArmorCategory, HandUse } from "@dnd/shared/types";
import { Match } from "effect";
import {
  type WildShapeEffectiveLoadoutWornKind,
  wildShapeEquipmentDispositionWearsKind,
} from "./wild-shape-equipment.ts";
import {
  type BattleSeeInvisibleEtherealWitness,
  type BattleSeeInvisibleObjectWitness,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

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
  combatant: BattleCreatureState,
  category: ArmorCategory,
): boolean {
  if (
    combatantHasUnendedDruidWildShapeEffect(combatant) &&
    !combatantDruidWildShapeEquipmentWearsKind(combatant, "armor")
  ) {
    return false;
  }
  return (
    combatant.armorClass.base.kind === "armor" &&
    combatant.armorClass.base.category === category
  );
}

export function combatantWearingArmor(combatant: BattleCreatureState): boolean {
  if (
    combatantHasUnendedDruidWildShapeEffect(combatant) &&
    !combatantDruidWildShapeEquipmentWearsKind(combatant, "armor")
  ) {
    return false;
  }
  return combatant.armorClass.base.kind === "armor";
}

export function combatantWieldingShield(
  combatant: BattleCreatureState,
): boolean {
  if (
    combatantHasUnendedDruidWildShapeEffect(combatant) &&
    !combatantDruidWildShapeEquipmentWearsKind(combatant, "shield")
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
  return {
    left: handUseForOccupancy(
      leftHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "left",
      ),
    ),
    right: handUseForOccupancy(
      rightHandUse,
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
  if (!combatantHasUnendedDruidWildShapeEffect(combatant)) return handUse;
  return Match.value(handUse).pipe(
    Match.when("shield", () =>
      combatantDruidWildShapeEquipmentWearsKind(combatant, "shield")
        ? handUse
        : "free",
    ),
    Match.when("mainWeapon", () => "free" as const),
    Match.when("offWeapon", () => "free" as const),
    Match.when("free", () => handUse),
    Match.when("grapple", () => handUse),
    Match.when("spellCreatedHeldObject", () => handUse),
    Match.exhaustive,
  );
}

function combatantDruidWildShapeEquipmentWearsKind(
  combatant: BattleCreatureState,
  kind: WildShapeEffectiveLoadoutWornKind,
): boolean {
  if (
    !combatantHasUnendedDruidWildShapeEffect(combatant) ||
    combatant.origin.kind !== "character"
  ) {
    return false;
  }
  const origin = combatant.origin;
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "druidWildShapeForm" &&
      wildShapeEquipmentDispositionWearsKind(
        effect.equipmentDisposition,
        kind,
      ) &&
      origin.druidWildShapeKnownForms?.some(
        (form) => form.id === effect.formStatBlockId,
      ) === true,
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

export function combatantsAreEnemies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side !== target.side
  );
}

export function combatantsAreAllies(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  return (
    actor !== undefined && target !== undefined && actor.side === target.side
  );
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
