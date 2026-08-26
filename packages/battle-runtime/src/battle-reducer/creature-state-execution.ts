// Authored-free creature-state queries and transitions used by battle execution.
// Creature initialization, support-profile admission, and presentation joins stay
// in creature-state.ts so execution roots do not inherit those owners.

import {
  armorClass,
  armorClassDelta,
  currentArmorClass,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  hasCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import { type Condition } from "@dnd/shared/types";
import { Match } from "effect";
import { CONDITIONS as ALL_CONDITIONS } from "@dnd/shared/types";
import { characterProcedureBindingSnapshots } from "../character-execution-queries.ts";
import {
  characterBattleResourceIsPointPool,
  characterBattleResourceUsage,
  type CharacterBattleResourceState,
} from "../character-battle-resource-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import {
  battleAttackExecutionScopeRefForProcedureRef,
  type BattleObjectId,
  type CombatantId,
} from "../identity.ts";
import { statBlockExecutionSnapshot } from "../stat-block-execution-state.ts";
import {
  type BattleActiveEffect,
  type BattleCharacterResourceSnapshot,
  type BattleCreatureOriginSnapshot,
  type BattleCreatureSnapshot,
  type BattleCreatureState,
  type BattleCreatureZeroHpLifecycleSnapshot,
  type BattleState,
  type CharacterBattleCreatureState,
} from "../battle-state-execution.ts";

export {
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleCreatureStateWithoutKnockOut,
  knockedOutConditionState,
  knockedOutOneHp,
  nonKnockOutLifecycleFields,
} from "./creature-hit-point-state.ts";

import {
  SLOW_ACTIVE_PENALTIES_ARMOR_CLASS_DELTA,
  WARDING_BOND_ARMOR_CLASS_BONUS,
} from "./domain-constants.ts";
import { effectiveHitPointMaximum } from "./hit-point-maximum.ts";
import {
  activeDruidWildShapeEffect,
  combatantDruidWildShapeArmorClassState,
  combatantEffectiveSize,
  removeEndedDruidWildShapeEffects,
} from "./druid-wild-shape.ts";
import {
  battleObjectIsOnGround,
  characterEffectiveLoadoutFromOrigin,
} from "./battle-object-lifecycle.ts";
import { battleMovementBudgetForActor } from "./movement-speed.ts";
import { spellExecutionFacts } from "./spell-execution-facts.ts";
import { wildShapeCanUseWornLoadoutObject } from "./wild-shape-equipment.ts";
import {
  combatantInvisibleBenefitDenied,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";

export {
  combatantCanTakeActions,
  combatantCanTakeReactions,
} from "./creature-state-leaves.ts";

import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
} from "./creature-state-queries.ts";
export {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-queries.ts";

export function normalizeEarlyEndedOngoingFeatures(
  state: BattleState,
): BattleState {
  const combatants = new Map<CombatantId, BattleCreatureState>();
  let changed = false;
  for (const [id, combatant] of state.combatants) {
    const activeOngoingFeatureOccurrences =
      activeOngoingFeatureOccurrencesForCombatant(state, combatant);
    const activeEffects = activeEffectsWithoutDetachedBoundHeldWeaponEffects(
      state,
      combatant,
    );
    if (
      activeOngoingFeatureOccurrences.size !==
        combatant.activeOngoingFeatureOccurrences.size ||
      activeEffects.length !== combatant.activeEffects.length
    ) {
      changed = true;
      combatants.set(id, {
        ...combatant,
        activeEffects,
        activeOngoingFeatureOccurrences,
      });
    } else {
      combatants.set(id, combatant);
    }
  }
  return changed ? { ...state, combatants } : state;
}

function activeEffectsWithoutDetachedBoundHeldWeaponEffects(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleCreatureState["activeEffects"] {
  if (!isCharacterBattleCreatureState(combatant)) {
    return removeEndedDruidWildShapeEffects(combatant);
  }
  return removeEndedDruidWildShapeEffects(combatant).filter((effect) => {
    const boundWeaponItemId = activeEffectBoundHeldWeaponItemId(effect);
    return (
      boundWeaponItemId === null ||
      combatantCanStillHoldBoundWeaponItem(state, combatant, boundWeaponItemId)
    );
  });
}

function combatantCanStillHoldBoundWeaponItem(
  state: BattleState,
  combatant: CharacterBattleCreatureState,
  itemId: BattleObjectId,
): boolean {
  if (battleObjectIsOnGround(state, combatant.combatantId, itemId)) {
    return false;
  }
  const activeWildShape = activeDruidWildShapeEffect(combatant);
  const main = combatant.origin.selectedLoadout.weapon;
  const offHand = combatant.origin.selectedLoadout.offHandWeapon;
  if (activeWildShape === null) {
    return main?.itemId === itemId || offHand?.itemId === itemId;
  }
  return (
    (main?.itemId === itemId &&
      wildShapeCanUseWornLoadoutObject({
        loadout: combatant.origin.selectedLoadout,
        formLimbs: activeWildShape.formLimbs,
        equipmentDisposition: activeWildShape.equipmentDisposition,
        objectKind: "mainWeapon",
        objectId: main.itemId,
      })) ||
    (offHand?.itemId === itemId &&
      wildShapeCanUseWornLoadoutObject({
        loadout: combatant.origin.selectedLoadout,
        formLimbs: activeWildShape.formLimbs,
        equipmentDisposition: activeWildShape.equipmentDisposition,
        objectKind: "offHandWeapon",
        objectId: offHand.itemId,
      }))
  );
}

function activeEffectBoundHeldWeaponItemId(
  effect: BattleActiveEffect,
): BattleObjectId | null {
  return effect.kind === "spellWeaponAttackOverride" ||
    effect.kind === "paladinSacredWeapon"
    ? effect.weaponItemId
    : null;
}

export function combatantSnapshot(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleCreatureSnapshot {
  const sourceGrapple = grappledBy(state, combatant.combatantId) ?? null;
  const common: Omit<BattleCreatureSnapshot, "origin"> = {
    combatantId: combatant.combatantId,
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: effectiveHitPointMaximum(combatant),
    tempHp: combatant.tempHp,
    activeEffectRefs: combatant.activeEffects.flatMap((effect) =>
      "effectRef" in effect ? [effect.effectRef] : [],
    ),
    armorClass: currentArmorClass(activeEffectArmorClass(state, combatant)),
    size: combatantEffectiveSize(combatant),
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(
      combatant.conditions,
      sourceGrapple !== null,
      combatant.hidden !== null && !combatantInvisibleBenefitDenied(combatant),
    ),
    concentrating: combatant.concentration !== null,
    dodging: combatant.dodging,
    reactionAvailable: combatant.reactionAvailable,
    movement: battleMovementBudgetForActor(state, combatant.combatantId),
    ammunitionStocks: combatant.ammunitionStocks,
  };
  const origin = combatantOriginSnapshot(combatant);
  return Match.value(origin).pipe(
    Match.when({ kind: "character" }, (characterOrigin) => ({
      ...common,
      origin: characterOrigin,
    })),
    Match.when({ kind: "statBlock" }, (statBlockOrigin) => ({
      ...common,
      origin: statBlockOrigin,
    })),
    Match.exhaustive,
  );
}

type BattleCreatureOriginProjection =
  | Extract<BattleCreatureOriginSnapshot, { readonly kind: "character" }>
  | Extract<BattleCreatureOriginSnapshot, { readonly kind: "statBlock" }>;

export function combatantOriginSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureOriginProjection {
  return Match.value(combatant.origin).pipe(
    Match.when({ kind: "character" }, (origin) => ({
      kind: "character" as const,
      characterId: origin.characterId,
      execution: {
        scopeRef: origin.execution.scopeRef,
        procedureBindings: characterProcedureBindingSnapshots(
          origin.execution,
          (invocation) => spellExecutionFacts(invocation),
        ),
      },
      attackExecution: {
        scopeRef: battleAttackExecutionScopeRefForProcedureRef(
          origin.unarmedStrike.procedureRef,
        ),
        attackProcedureRef: origin.attack?.procedureRef ?? null,
        unarmedStrikeProcedureRef: origin.unarmedStrike.procedureRef,
        offHandAttackProcedureRef: origin.offHandAttack?.procedureRef ?? null,
      },
      resources: origin.resources.map(characterResourceSnapshot),
      druidWildShapeAvailableForms: (
        origin.druidWildShapeAvailableForms ?? []
      ).map((admission) => ({
        statBlockId: admission.statBlock.id,
        execution: statBlockExecutionSnapshot(admission.execution),
      })),
      spellcasting:
        origin.spellcasting === undefined
          ? null
          : { spellSlots: origin.spellcasting.spellSlots },
    })),
    Match.when({ kind: "statBlock" }, (origin) => ({
      kind: "statBlock" as const,
      statBlockId: origin.statBlockId,
      execution: statBlockExecutionSnapshot(origin.execution),
    })),
    Match.exhaustive,
  );
}

export function characterResourceSnapshot(
  resource: CharacterBattleResourceState,
): BattleCharacterResourceSnapshot {
  if (characterBattleResourceIsPointPool(resource)) {
    return {
      resourcePoolRef: resource.resourcePoolRef,
      usage: "pointPool",
      pointsRemaining: resource.pointsRemaining,
    };
  }
  const common = {
    resourcePoolRef: resource.resourcePoolRef,
    usedThisTurn: resource.usedThisTurn,
  };
  const usage = characterBattleResourceUsage(resource);
  const usesRemaining =
    "usesRemaining" in resource ? resource.usesRemaining : undefined;
  if (usage === "unlimited" || usesRemaining === undefined) {
    return { ...common, usage: "unlimited" };
  }
  return { ...common, usage: "limited", usesRemaining };
}

export function activeEffectArmorClass(
  state: BattleState,
  combatant: BattleCreatureState,
): ArmorClassState {
  const baseArmorClassEffect = combatant.activeEffects.find(
    (effect) => effect.kind === "spellBaseArmorClass",
  );
  const baseArmorClass =
    combatantDruidWildShapeArmorClassState(combatant) ??
    groundEffectiveCharacterArmorClass(state, combatant);
  const withBase =
    baseArmorClassEffect === undefined || baseArmorClass.base.kind === "armor"
      ? baseArmorClass
      : {
          ...baseArmorClass,
          base: {
            kind: "ability_sum" as const,
            base: armorClass(baseArmorClassEffect.base),
            abilityModifiers: [baseArmorClassEffect.ability] as const,
            source: "spell_base_plus_ability" as const,
          },
        };
  const spellArmorClassBonuses = combatant.activeEffects.flatMap((effect) =>
    effect.kind === "spellArmorClassBonus"
      ? [{ kind: "flat" as const, bonus: armorClassDelta(effect.bonus) }]
      : effect.kind === "wardingBond"
        ? [
            {
              kind: "flat" as const,
              bonus: armorClassDelta(WARDING_BOND_ARMOR_CLASS_BONUS),
            },
          ]
        : [],
  );
  const slowActivePenaltyEffect = combatant.activeEffects.find(
    (effect) => effect.kind === "slowActivePenalties",
  );
  const armorClassBonuses =
    slowActivePenaltyEffect === undefined
      ? spellArmorClassBonuses
      : [
          ...spellArmorClassBonuses,
          {
            kind: "flat" as const,
            bonus: armorClassDelta(SLOW_ACTIVE_PENALTIES_ARMOR_CLASS_DELTA),
          },
        ];
  const withBonuses =
    armorClassBonuses.length === 0
      ? withBase
      : { ...withBase, bonuses: [...withBase.bonuses, ...armorClassBonuses] };
  const spellArmorClassFloors = combatant.activeEffects.flatMap((effect) =>
    effect.kind === "spellArmorClassFloor" ? [{ floor: effect.floor }] : [],
  );
  return spellArmorClassFloors.length === 0
    ? withBonuses
    : {
        ...withBonuses,
        floors: [...withBonuses.floors, ...spellArmorClassFloors],
      };
}

function groundEffectiveCharacterArmorClass(
  state: BattleState,
  combatant: BattleCreatureState,
): ArmorClassState {
  if (combatant.origin.kind !== "character") return combatant.armorClass;
  const selected = combatant.origin.selectedLoadout;
  const effective = characterEffectiveLoadoutFromOrigin(
    state,
    combatant.combatantId,
    combatant.origin,
  );
  const armorGrounded =
    selected.armor !== undefined && effective.armor === undefined;
  const shieldGrounded =
    selected.shield !== undefined && effective.shield === undefined;
  const armorAvailable = !armorGrounded;
  const shieldAvailable = !shieldGrounded;
  const usesShield = selected.shield !== undefined && shieldAvailable;
  const usesArmoredBase =
    combatant.armorClass.base.kind === "armor" && !armorGrounded;
  return {
    ...combatant.armorClass,
    base: usesArmoredBase
      ? combatant.armorClass.base
      : usesShield
        ? combatant.origin.unarmoredArmorClassBases.shielded
        : combatant.origin.unarmoredArmorClassBases.unshielded,
    bonuses: combatant.armorClass.bonuses.filter((bonus) => {
      if (bonus.kind === "shield") return shieldAvailable;
      if (bonus.kind === "wearing_armor") return armorAvailable;
      return true;
    }),
    leftHandUse:
      combatant.armorClass.leftHandUse === "shield" && !shieldAvailable
        ? "free"
        : combatant.armorClass.leftHandUse === "offWeapon" &&
            effective.offHandWeapon === undefined
          ? "free"
          : combatant.armorClass.leftHandUse,
    rightHandUse:
      combatant.armorClass.rightHandUse === "mainWeapon" &&
      effective.weapon === undefined
        ? "free"
        : combatant.armorClass.rightHandUse,
  };
}

export function combatantZeroHpLifecycleSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureZeroHpLifecycleSnapshot {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, (lifecycle) => ({
      policy: lifecycle.policy,
      dead: combatant.hp === 0,
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      policy: lifecycle.policy,
      deathSaves: lifecycle.deathSaves.deathSaves,
      stable: lifecycle.deathSaves.stable,
      dead: lifecycle.deathSaves.dead,
    })),
    Match.exhaustive,
  );
}

export function activeConditions(
  state: ConditionState,
  includeGrappled = false,
  includeHiddenInvisible = false,
): readonly Condition[] {
  return ALL_CONDITIONS.filter(
    (condition) =>
      hasCondition(state, condition) ||
      (condition === "grappled" && includeGrappled) ||
      (condition === "invisible" && includeHiddenInvisible),
  );
}

export function battleSubjectActorId(subject: BattleSubject): CombatantId {
  return subject.actorId;
}

export function isLegendaryAttackSubject(
  state: BattleState,
  subject: BattleSubject,
): boolean {
  if (
    subject.tag !== "action" ||
    subject.action !== "attack" ||
    subject.procedureRef === undefined
  ) {
    return false;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "statBlock") return false;
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === subject.procedureRef,
  );
  return (
    binding?.procedure.kind === "attack" &&
    binding.procedure.section === "legendaryActions"
  );
}

export function statBlockLegendaryActionWindowIsOpen(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.legendaryActionWindow !== null &&
    !state.legendaryActionWindow.consumed &&
    actorId !== state.legendaryActionWindow.afterTurnActorId &&
    actorId !== currentActorId(state)
  );
}

export function closeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : { ...state, legendaryActionWindow: null };
}

export function consumeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : {
        ...state,
        legendaryActionWindow: {
          ...state.legendaryActionWindow,
          consumed: true,
        },
      };
}
