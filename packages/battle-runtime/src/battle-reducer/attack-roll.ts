// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// Shared ongoing-feature helpers avoid a cycle between attack rolls and unit
// features.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.grappler unit-feature.hunters-prey unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master spell.invocation-object-contact-damage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
// KERNEL-COVERAGE: runtime-owner BATTLE.RELATIONSHIP_DISCOVERY
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION

import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "../optional-property.ts";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  abilityModifier,
  movementDeltaFeet,
  SIZES,
  type Ability,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../effect-execution-ref.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import {
  unboundAttackActionOption,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type CharacterWeaponAttackAbilityChoice,
  type SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import type {
  OngoingFeatureDamageModifier,
  OngoingFeatureRollModifier,
} from "../unit-feature-execution-constants.ts";
import {
  HUNTERS_PREY_SUPPORT_PROFILE,
  TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  type TacticalMasterReplacementMasteryProperty,
} from "../unit-feature-execution-constants.ts";
import {
  type AttackDamageRider,
  type AttackRollFeatureActivation,
  type BattleActiveEffect,
  type BattleAttackRollHole,
  type BattleAttackRollRelationshipFact,
  type BattleDamageRollHole,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleFill,
  type BattleShovePushOutcome,
  type BattleTargetChoiceHole,
  type BattleUnitFeatureDecisionHole,
  type BattleLightEmitterMechanicalFacts,
  type BattleObjectOutline,
  type BattleSavingThrowRelationshipFact,
  type BattleState,
  type BattleTargetSpatialFact,
  type SpellAttackDamageComponent,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-queries.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";

type RuntimeSpellProcedure =
  | SupportedSpellInvocation
  | RuntimeSpellProcedureExecution;
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-queries.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-hit-point-state.ts";
import { combatantHasGrapplerSupportProfile } from "./grappler-support-profile.ts";
import { attackDamageDieFloorChoiceProcedureRefs } from "./attack-damage-die-floor-choice.ts";
import {
  activeRageSourceKeysForFrenzy,
  ongoingFeatureProfileIsRecklessAttackForFrenzy,
} from "./barbarian-frenzy.ts";
import {
  combatantCanSee,
  combatantInvisibleBenefitDenied,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import { ongoingSpellEffectSuppressedByMagicSuppressionEmanation } from "./magic-suppression-ongoing-effect.ts";
import {
  activeOngoingFeatureOccurrenceFromExecution,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureProfileHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources,
  spellConcentrationEffectSourceFromEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_INSTANCE,
  TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID,
  TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_INSTANCE,
  HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import {
  attackExecutionSelectionMatchesOption,
  attackTargetIsLegal,
  attackTargetDistanceFeet,
  attackTargetRangeBand,
} from "./attack-spatial.ts";
import { hasDodgeBenefit } from "./dodge-benefit.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
export { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import {
  attackRollTargetIsEnemy,
  parseSavingThrowRelationshipFacts,
  savingThrowTargetsEnemy,
} from "./roll-trigger-relationship-facts.ts";
import {
  admittedAttackRollTableSource,
  combineD20TestRollMode,
  mechanicalD20TestRollMode,
  mechanicalD20TestRollModeSources,
  proneAttackRollModeSources,
} from "../d20-test-circumstance.ts";
import {
  attackActionBonusWithPassiveFeatureBonus,
  attackActionOptionName,
  attackRollMissToHitReplacementHolePayloadForAttacker,
  attackTargetConstraint,
  targetHasAdjacentNonIncapacitatedAlly,
  weaponAttackDamageExpression,
} from "./statblock-attacks.ts";

const WEAPON_MASTERY_PROPERTIES_BY_SUPPORT_PROFILE = [
  { supportProfile: WEAPON_MASTERY_PUSH_SUPPORT_PROFILE, property: "push" },
  { supportProfile: WEAPON_MASTERY_SAP_SUPPORT_PROFILE, property: "sap" },
  { supportProfile: WEAPON_MASTERY_SLOW_SUPPORT_PROFILE, property: "slow" },
  {
    supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
    property: "topple",
  },
  {
    supportProfile: WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
    property: "cleave",
  },
] as const satisfies ReadonlyArray<{
  readonly supportProfile: string;
  readonly property: CharacterWeaponAttackActionOption["weapon"]["mastery"];
}>;
type WeaponMasteryPropertySupportProfile =
  (typeof WEAPON_MASTERY_PROPERTIES_BY_SUPPORT_PROFILE)[number]["supportProfile"];

type SelectedWeaponMasteryProperty = {
  readonly attack: CharacterWeaponAttackActionOption;
  readonly procedureRef: BattleProcedureExecutionRef;
};

export function attackRollHole(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  rollMode?: AttackRollMode,
  ongoingFeatureActivations?: readonly AttackRollFeatureActivation[],
): BattleAttackRollHole {
  const name = attackActionOptionName(attack);
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${name} attack roll`,
    attack: unboundAttackActionOption(attack),
    attackBonus: attackActionBonusWithPassiveFeatureBonus(attacker, attack),
    ...optionalProperty("rollMode", rollMode),
    ...(ongoingFeatureActivations === undefined ||
    ongoingFeatureActivations.length === 0
      ? {}
      : { ongoingFeatureActivations }),
    ...(attacker === undefined
      ? {}
      : attackRollMissToHitReplacementHolePayloadForAttacker(attacker)),
  };
}

export function requiredAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption | undefined,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): AttackRollMode | undefined {
  const sources = attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  return attackRollModeFromSources(
    sources.hasAdvantage,
    sources.hasDisadvantage,
  );
}

type AttackRollSourceFlags = {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
};

function proneTargetAttackRollModeSources(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption | undefined,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
) {
  const target = state.combatants.get(targetId);
  if (
    target === undefined ||
    attack === undefined ||
    !hasCondition(target.conditions, "prone")
  ) {
    return { advantage: false, disadvantage: false };
  }
  const distanceFeet = attackTargetDistanceFeet(
    targetSpatialFacts,
    attackerId,
    targetId,
    attack,
  );
  return distanceFeet === null
    ? { advantage: false, disadvantage: false }
    : proneAttackRollModeSources(distanceFeet);
}

function combatantHasHiddenAttackRollBenefit(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.hidden !== null &&
    combatant?.hidden !== undefined &&
    !combatantInvisibleBenefitDenied(combatant)
  );
}

function attackRollSourceFlags(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption | undefined,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): AttackRollSourceFlags {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  const grapple = grappledBy(state, attackerId);
  const hiddenTargetDisadvantage = combatantHasHiddenAttackRollBenefit(target);
  const dodgeDisadvantage =
    attacker !== undefined &&
    target !== undefined &&
    hasDodgeAttackRollBenefit(state, target, attacker);
  const grappleDisadvantage =
    grapple !== undefined && grapple.grapplerId !== targetId;
  const longRangeDisadvantage =
    attack !== undefined &&
    attackTargetRangeBand(targetSpatialFacts, attackerId, targetId, attack) ===
      "long";
  const proneTargetRollModeSources = proneTargetAttackRollModeSources(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  const sightAdvantage = hasAttackSightFact(
    targetSpatialFacts,
    "attackTargetCannotSeeAttacker",
    attackerId,
    targetId,
  );
  const sightDisadvantage = hasAttackSightFact(
    targetSpatialFacts,
    "attackAttackerCannotSeeTarget",
    attackerId,
    targetId,
  );
  const attackerCanSeeTarget =
    attacker !== undefined &&
    target !== undefined &&
    !sightDisadvantage &&
    combatantCanSee(state, attacker.combatantId, target.combatantId);
  const grapplerAttackAdvantage =
    combatantHasGrapplerSupportProfile(attacker) &&
    state.grapples.some(
      (link) => link.grapplerId === attackerId && link.targetId === targetId,
    );
  const hasAdvantage =
    sightAdvantage ||
    proneTargetRollModeSources.advantage ||
    grapplerAttackAdvantage ||
    combatantHasHiddenAttackRollBenefit(attacker) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    statBlockTraitGrantsAttackRollAdvantage(
      state,
      attackerId,
      targetId,
      attack,
      targetSpatialFacts,
    ) ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "advantage", {
      attackerCanSeeTarget,
      attack,
    }) ||
    ongoingFeatureGrantsAttackRollMode(
      state,
      attacker,
      target,
      "advantage",
      attack,
    );
  const hasDisadvantage =
    sightDisadvantage ||
    proneTargetRollModeSources.disadvantage ||
    hiddenTargetDisadvantage ||
    dodgeDisadvantage ||
    grappleDisadvantage ||
    longRangeDisadvantage ||
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "disadvantage", {
      attackerCanSeeTarget,
      attack,
      targetSpatialFacts,
    }) ||
    ongoingFeatureGrantsAttackRollMode(
      state,
      attacker,
      target,
      "disadvantage",
      attack,
    );
  return { hasAdvantage, hasDisadvantage };
}

function statBlockTraitGrantsAttackRollAdvantage(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption | undefined,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): boolean {
  if (attack?.kind !== "statBlockAttack") return false;
  return (
    attack.traitAttackRollModes?.some(
      (mode) =>
        mode.mode === "advantage" &&
        mode.predicate === "nonIncapacitatedAllyWithin5FeetOfTarget" &&
        targetHasAdjacentNonIncapacitatedAlly(
          state,
          attackerId,
          targetId,
          targetSpatialFacts,
        ),
    ) ?? false
  );
}

type AttackSightSpatialFactKind =
  | "attackAttackerCannotSeeTarget"
  | "attackTargetCannotSeeAttacker";

function hasAttackSightFact(
  facts: readonly BattleTargetSpatialFact[],
  kind: AttackSightSpatialFactKind,
  attackerId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === kind &&
      fact.attackerId === attackerId &&
      fact.targetId === targetId,
  );
}

function objectTargetAttackRollSourceFlags(
  state: BattleState,
  attackerId: CombatantId,
  targetObjectId: BattleObjectId | undefined,
  attackerCanSeeObject: boolean | undefined,
  attack: SupportedAttackActionOption | undefined,
): AttackRollSourceFlags {
  const attacker = state.combatants.get(attackerId);
  const hasAdvantage =
    activeEffectGrantsAttackRollMode(state, attacker, undefined, "advantage", {
      attack,
      ...optionalProperty("attackerCanSeeTarget", attackerCanSeeObject),
    }) ||
    objectOutlineGrantsAttackRollAdvantage(
      state.objectOutlines,
      targetObjectId,
      attackerCanSeeObject,
    );
  const hasDisadvantage =
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(
      state,
      attacker,
      undefined,
      "disadvantage",
      {
        attack,
        ...optionalProperty("attackerCanSeeTarget", attackerCanSeeObject),
      },
    );
  return { hasAdvantage, hasDisadvantage };
}

export function requiredSpellObjectTargetAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  invocation: RuntimeSpellProcedure,
  targetObjectId: BattleObjectId,
  attackerCanSeeObject: boolean | undefined,
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const sources = objectTargetAttackRollSourceFlags(
    state,
    attackerId,
    targetObjectId,
    attackerCanSeeObject,
    undefined,
  );
  const hasAdvantage =
    sources.hasAdvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      state,
      attacker,
      invocation,
      "advantage",
    );
  const hasDisadvantage =
    sources.hasDisadvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      state,
      attacker,
      invocation,
      "disadvantage",
    );
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

export function requiredOrdinaryObjectAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  fact: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "attackObjectTarget" }
  >,
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const sources = objectTargetAttackRollSourceFlags(
    state,
    attackerId,
    fact.objectId,
    fact.attackerCanSeeObject,
    attack,
  );
  const hasAdvantage =
    sources.hasAdvantage ||
    ongoingFeatureGrantsAttackRollMode(
      state,
      attacker,
      undefined,
      "advantage",
      attack,
    );
  const hasDisadvantage =
    sources.hasDisadvantage ||
    !fact.attackerCanSeeObject ||
    (fact.range.kind === "rangedRange" &&
      (fact.range.band === "long" ||
        fact.range.enemyWithin5FeetCanSeeAttacker)) ||
    ongoingFeatureGrantsAttackRollMode(
      state,
      attacker,
      undefined,
      "disadvantage",
      attack,
    ) ||
    state.grapples.some((grapple) => grapple.targetId === attackerId);
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

export function objectTargetAttackNeedsSightFact(
  state: BattleState,
  targetObjectId: BattleObjectId,
): boolean {
  return state.objectOutlines.some(
    (outline) => outline.objectId === targetObjectId,
  );
}

export function objectInvisibleBenefitDenied(
  state: BattleState,
  targetObjectId: BattleObjectId,
): boolean {
  return (
    state.objectOutlines.some(
      (outline) => outline.objectId === targetObjectId,
    ) ||
    state.lightEmitters.some((emitter) =>
      objectLightEmitterDeniesInvisibleBenefit(emitter, targetObjectId),
    )
  );
}

function objectLightEmitterDeniesInvisibleBenefit(
  emitter: BattleLightEmitterMechanicalFacts,
  targetObjectId: BattleObjectId,
): boolean {
  return (
    emitter.kind === "objectInvisibleRevealLightEmitter" &&
    emitter.objectId === targetObjectId
  );
}

function objectOutlineGrantsAttackRollAdvantage(
  outlines: readonly BattleObjectOutline[],
  targetObjectId: BattleObjectId | undefined,
  attackerCanSeeObject: boolean | undefined,
): boolean {
  return (
    targetObjectId !== undefined &&
    attackerCanSeeObject === true &&
    outlines.some((outline) => outline.objectId === targetObjectId)
  );
}

export function requiredSpellAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  invocation: RuntimeSpellProcedure,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const sources = attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    undefined,
    targetSpatialFacts,
  );
  const hasAdvantage =
    sources.hasAdvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      state,
      attacker,
      invocation,
      "advantage",
    );
  const hasDisadvantage =
    sources.hasDisadvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      state,
      attacker,
      invocation,
      "disadvantage",
    );
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

function attackRollModeFromSources(
  hasAdvantage: boolean,
  hasDisadvantage: boolean,
): AttackRollMode | undefined {
  return mechanicalD20TestRollMode({
    advantage: hasAdvantage,
    disadvantage: hasDisadvantage,
  });
}

export function attackRollHasAdvantageSource(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption | undefined,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): boolean {
  return attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  ).hasAdvantage;
}

export function attackRollModeWithOptionalOngoingFeature(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
  activatedOngoingFeatureProcedureRef: BattleProcedureExecutionRef | undefined,
): AttackRollMode | undefined {
  const baseline = requiredAttackRollMode(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  if (activatedOngoingFeatureProcedureRef === undefined) {
    return baseline;
  }
  if (baseline === "normal" || baseline === "disadvantage") return "normal";
  return "advantage";
}

export function attackRollOngoingFeatureActivations(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly AttackRollFeatureActivation[] {
  const attacker = state.combatants.get(attackerId);
  if (
    !isCharacterBattleCreatureState(attacker) ||
    state.currentTurnResources.attackRollMadeThisTurn ||
    (attack.kind !== "weapon" && attack.kind !== "unarmedStrike")
  ) {
    return [];
  }
  return attacker.origin.execution.procedureBindings.flatMap(
    (binding): readonly AttackRollFeatureActivation[] => {
      const procedure = binding.procedure;
      if (
        procedure.kind !== "unitFeature" ||
        procedure.execution.kind !== "ongoingFeature"
      ) {
        return [];
      }
      const unitFeature = procedure.execution;
      if (
        unitFeature.activationTrigger !== "firstAttackRoll" ||
        unitFeature.spendsUse ||
        activeOngoingFeatureOccurrencesForCombatant(state, attacker).has(
          binding.procedureRef,
        ) ||
        !unitFeature.rollModifiers.some(
          (modifier) =>
            modifier.affects === "selfRoll" &&
            modifier.mode === "advantage" &&
            attackAbilityMatchesModifier(attack, modifier),
        )
      ) {
        return [];
      }
      return [
        {
          procedureRef: binding.procedureRef,
          rollMode: "advantage" as const,
        },
      ];
    },
  );
}

export function attackRollOngoingFeatureActivationProfile(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  procedureRef: BattleProcedureExecutionRef | undefined,
  allowAlreadyActiveReplay: boolean,
): {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly execution: Extract<
    UnitFeatureProcedureExecution,
    { readonly kind: "ongoingFeature" }
  >;
} | null {
  if (procedureRef === undefined) return null;
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) return null;
  const procedure = characterUnitProcedure(
    attacker.origin.execution,
    procedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const activation =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "ongoingFeature"
      ? { procedureRef, execution: procedure.execution }
      : undefined;
  const unitFeature = activation?.execution;
  if (
    activation === undefined ||
    unitFeature === undefined ||
    unitFeature.activationTrigger !== "firstAttackRoll" ||
    !(
      attackRollOngoingFeatureActivations(state, attackerId, attack).some(
        (option) => option.procedureRef === activation.procedureRef,
      ) ||
      (allowAlreadyActiveReplay &&
        activeOngoingFeatureOccurrencesForCombatant(state, attacker).has(
          activation.procedureRef,
        ))
    )
  ) {
    return null;
  }
  return activation;
}

export function ongoingFeatureGrantsAttackRollMode(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
  attack?: SupportedAttackActionOption,
): boolean {
  const outgoing =
    isCharacterBattleCreatureState(attacker) &&
    [...activeOngoingFeatureOccurrencesForCombatant(state, attacker)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(attacker, key)?.rollModifiers.some(
          (modifier) =>
            modifier.mode === mode &&
            modifier.affects === "selfRoll" &&
            modifier.on === "attackRoll" &&
            attackAbilityMatchesModifier(
              attack?.kind === "weapon" || attack?.kind === "unarmedStrike"
                ? attack
                : null,
              modifier,
            ),
        ),
    );
  const incoming =
    isCharacterBattleCreatureState(target) &&
    [...activeOngoingFeatureOccurrencesForCombatant(state, target)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(target, key)?.rollModifiers.some(
          (modifier) =>
            modifier.mode === mode &&
            modifier.affects === "rollsAgainstSelf" &&
            modifier.on === "attackRoll" &&
            attackAbilityMatchesModifier(
              attack?.kind === "weapon" || attack?.kind === "unarmedStrike"
                ? attack
                : null,
              modifier,
            ),
        ),
    );
  return outgoing || incoming;
}

function ongoingFeatureGrantsSpellAttackRollMode(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  invocation: RuntimeSpellProcedure,
  mode: AttackRollMode,
): boolean {
  return (
    isCharacterBattleCreatureState(attacker) &&
    spellInvocationIsFromSpellcastingSource(attacker, invocation) &&
    [...activeOngoingFeatureOccurrencesForCombatant(state, attacker)].some(
      ([key]) => {
        const profile = ongoingFeatureProfileForSourceKey(attacker, key);
        const castingSource = spellInvocationCastingSource(invocation);
        return (
          profile !== null &&
          profile.spellModifiers.some(
            (modifier) =>
              modifier.attackRollMode === mode &&
              castingSource.tag === "classSpellcasting" &&
              modifier.sourceClassName === castingSource.className,
          )
        );
      },
    )
  );
}

function spellInvocationIsFromSpellcastingSource(
  combatant: BattleCreatureState | undefined,
  invocation: RuntimeSpellProcedure,
): boolean {
  return (
    isCharacterBattleCreatureState(combatant) &&
    combatant.origin.spellcasting !== undefined &&
    spellInvocationIsSpellcasting(invocation) &&
    spellInvocationCastingSource(invocation).tag === "classSpellcasting"
  );
}

function spellInvocationCastingSource(invocation: RuntimeSpellProcedure) {
  return "spellRuleFacts" in invocation
    ? invocation.spellRuleFacts.castingSource
    : invocation.spell.castingSource;
}

export function activeEffectGrantsAttackRollMode(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
  context: {
    readonly attack?: SupportedAttackActionOption | undefined;
    readonly attackerCanSeeTarget?: boolean;
    readonly targetSpatialFacts?: readonly BattleTargetSpatialFact[];
  } = {},
): boolean {
  const attackerCreatureType =
    attacker === undefined ? null : battleCreatureType(attacker);
  const attackerCanSeeTarget =
    context.attackerCanSeeTarget ??
    (attacker !== undefined &&
      target !== undefined &&
      combatantCanSee(state, attacker.combatantId, target.combatantId));
  return (
    attacker?.activeEffects.some(
      (effect) =>
        (effect.kind === "nextAttackRollBySelf" ||
          (effect.kind === "abilityD20TestRollModeEndTurnSave" &&
            attackUsesAbility(context.attack, effect.ability)) ||
          (effect.kind === "selfAttackRollAndAbilityCheckRollMode" &&
            !ongoingSpellEffectSuppressedByMagicSuppressionEmanation(state, {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              effectRef: effect.sourceEffectRef,
            }))) &&
        effect.mode === mode,
    ) === true ||
    target?.activeEffects.some(
      (effect) =>
        (effect.kind === "nextAttackRollAgainstSelf" && effect.mode === mode) ||
        (effect.kind === "saveGatedTargetProjection" &&
          mode === "advantage" &&
          attackerCanSeeTarget) ||
        (effect.kind === "afterHitDamageAndIllumination" &&
          mode === "advantage") ||
        (effect.kind === "creatureTypeProtection" &&
          effect.attackRollMode === mode &&
          attackerCreatureType !== null &&
          effect.protectedAgainstCreatureTypes.includes(
            attackerCreatureType,
          )) ||
        (effect.kind === "perceptionGatedAttackRollDefense" &&
          mode === "disadvantage" &&
          attacker !== undefined &&
          target !== undefined &&
          !attackerPerceivesPerceptionGatedAttackRollDefenseTargetWithBypassSense(
            context.targetSpatialFacts ?? [],
            attacker.combatantId,
            target.combatantId,
          )),
    ) === true
  );
}

function attackerPerceivesPerceptionGatedAttackRollDefenseTargetWithBypassSense(
  facts: readonly BattleTargetSpatialFact[],
  attackerId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "attackerPerceivesObscuredTargetWithSense" &&
      fact.attackerId === attackerId &&
      fact.targetId === targetId,
  );
}

function attackUsesAbility(
  attack: SupportedAttackActionOption | undefined,
  ability: Ability,
): boolean {
  if (attack?.kind === "weapon") {
    return attack.ability === ability;
  }
  if (attack?.kind === "unarmedStrike") {
    return attack.attackAbility === ability;
  }
  return false;
}

export function attackAbilityMatchesModifier(
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption
    | null
    | undefined,
  modifier: OngoingFeatureRollModifier | OngoingFeatureDamageModifier,
): boolean {
  const ability =
    attack?.kind === "weapon"
      ? attack.ability
      : attack?.kind === "unarmedStrike"
        ? attack.attackAbility
        : undefined;
  if (modifier.abilityFilter === undefined) {
    return true;
  }
  return (
    ability !== undefined &&
    ability !== "spellcasting" &&
    modifier.abilityFilter.includes(ability)
  );
}

export function hasDodgeAttackRollBenefit(
  state: BattleState,
  target: BattleCreatureState,
  attacker: BattleCreatureState,
): boolean {
  return (
    hasDodgeBenefit(state, target) &&
    !hasCondition(target.conditions, "blinded") &&
    attacker.hidden === null
  );
}

export function consumeHelpAttackForAttackRoll(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const helpIndex = state.helpAttacks.findIndex(
    (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
  );
  const withoutOneShotEffects = consumeOneShotAttackRollEffects(
    state,
    attackerId,
    targetId,
  );
  if (helpIndex === -1) return withoutOneShotEffects;
  return {
    ...withoutOneShotEffects,
    helpAttacks: withoutOneShotEffects.helpAttacks.filter(
      (_, index) => index !== helpIndex,
    ),
  };
}

export function applyWeaponMasterySapOnHit(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleState {
  const selection = selectedWeaponMasteryProperty({
    state,
    attackerId,
    attack,
    supportProfile: WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  });
  const target = state.combatants.get(targetId);
  if (selection === null || target === undefined) {
    return state;
  }
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      kind: "nextAttackRollBySelf",
      sourceProcedureRef: selection.procedureRef,
      sourceCombatantId: attackerId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: attackerId },
    },
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "nextAttackRollBySelf" &&
          "sourceProcedureRef" in effect &&
          effect.sourceProcedureRef === selection.procedureRef &&
          effect.sourceCombatantId === attackerId
        ),
    ),
    allocation.effect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...allocation.owner,
      activeEffects,
    }),
  };
}

type TacticalMasterReplacementSelection = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly replacementProperties: readonly TacticalMasterReplacementMasteryProperty[];
};

export function tacticalMasterReplacementDecisionHole(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureDecisionHole | null {
  const selection = tacticalMasterReplacementSelection(
    state,
    attackerId,
    attack,
  );
  return selection === null
    ? null
    : {
        kind: "unitFeatureDecision",
        holeId: TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID,
        holeInstanceKey: TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_INSTANCE,
        label: "Tactical Master mastery replacement",
        choices: TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
      };
}

export function tacticalMasterAttackWithReplacement<
  TAttack extends SupportedAttackActionOption,
>(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly attack: TAttack;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
}):
  | { readonly tag: "ok"; readonly attack: TAttack }
  | { readonly tag: "invalid"; readonly message: string } {
  const selection = tacticalMasterReplacementSelection(
    input.state,
    input.attackerId,
    input.attack,
  );
  if (selection === null) {
    return input.decision === undefined
      ? { tag: "ok", attack: input.attack }
      : {
          tag: "invalid",
          message:
            "Tactical Master replacement is only valid for an eligible weapon mastery attack.",
        };
  }
  if (input.decision === undefined || input.decision.value === "decline") {
    return { tag: "ok", attack: input.attack };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!isTacticalMasterReplacementMasteryProperty(input.decision.value)) {
    return {
      tag: "invalid",
      message:
        "Tactical Master replacement choice is not one of the supported mastery options.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!selection.replacementProperties.includes(input.decision.value)) {
    return {
      tag: "invalid",
      message:
        "Tactical Master replacement choice is not admitted by the feature profile.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    attack: weaponAttackWithMasteryProperty(input.attack, input.decision.value),
  };
}

export function applyWeaponMasteryPushOnHit(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}):
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly shovePushes: readonly BattleShovePushOutcome[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const selection = selectedWeaponMasteryProperty({
    state: input.state,
    attackerId: input.attackerId,
    attack: input.attack,
    supportProfile: WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  });
  if (selection === null) {
    return { tag: "ok", state: input.state, shovePushes: [] };
  }
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return { tag: "ok", state: input.state, shovePushes: [] };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!creatureSizeIsAtMost(combatantEffectiveSize(target), "large")) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Push target must be Large or smaller.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const pushDisposition = input.targetSpatialFacts.find(
    (
      fact,
    ): fact is Extract<
      BattleTargetSpatialFact,
      { readonly kind: "weaponMasteryPushDisposition" }
    > =>
      fact.kind === "weaponMasteryPushDisposition" &&
      fact.attackerId === input.attackerId &&
      fact.targetId === input.targetId &&
      attackExecutionSelectionMatchesOption(fact, input.attack),
  )?.disposition;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (pushDisposition === undefined) {
    return {
      tag: "invalid",
      message:
        "Weapon Mastery Push requires caller-supplied straight-away push disposition.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    Number(pushDisposition.distanceFeet) < 0 ||
    Number(pushDisposition.distanceFeet) > 10
  ) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Push distance must be from 0 to 10 feet.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    state: input.state,
    shovePushes: [
      {
        targetId: input.targetId,
        disposition: pushDisposition,
      },
    ],
  };
}

export function applyWeaponMasterySlowAfterDamage(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly damageAmount: number;
}): BattleState {
  if (input.damageAmount <= 0) {
    return input.state;
  }
  const selection = selectedWeaponMasteryProperty({
    state: input.state,
    attackerId: input.attackerId,
    attack: input.attack,
    supportProfile: WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  });
  const target = input.state.combatants.get(input.targetId);
  if (selection === null || target === undefined) {
    return input.state;
  }
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      kind: "unitFeatureSpeedDelta",
      sourceProcedureRef: selection.procedureRef,
      sourceCombatantId: input.attackerId,
      deltaFeet: movementDeltaFeet(-10),
      expiresAt: { kind: "startOfTurn", combatantId: input.attackerId },
    },
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "unitFeatureSpeedDelta" &&
          "sourceProcedureRef" in effect &&
          effect.sourceProcedureRef === selection.procedureRef
        ),
    ),
    allocation.effect,
  ];
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.targetId, {
      ...allocation.owner,
      activeEffects,
    }),
  };
}

export function applyWeaponMasteryToppleSavingThrow(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const outcomes = fill.value.outcomes;
  if (outcomes.length === 0) {
    return { tag: "ok", state };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcomes.length !== 1 || outcomes[0]?.targetId !== targetId) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Topple save must target the attacked creature.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    fill.relationshipFacts ?? [],
    attackerId,
    [targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "enemySavingThrow",
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    return {
      tag: "invalid",
      message:
        "Weapon Mastery Topple relationship facts must answer the saving-throw hole request.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    state,
    attackerId,
    [targetId],
    relationshipFacts,
  );
  if (outcomes[0].succeeded) {
    return { tag: "ok", state: savingThrowExtendedState };
  }
  const target = savingThrowExtendedState.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target === undefined) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Topple target is no longer in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    state: {
      ...savingThrowExtendedState,
      combatants: new Map(savingThrowExtendedState.combatants).set(targetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "prone"),
        ),
      }),
    },
  };
}

export function weaponMasteryToppleSelection(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): SelectedWeaponMasteryProperty | null {
  return state.combatants.has(targetId)
    ? selectedWeaponMasteryProperty({
        state,
        attackerId,
        attack,
        supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
      })
    : null;
}

export function weaponMasteryCleaveDecisionHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureDecisionHole | null {
  const selection = weaponMasteryCleaveSelection(
    state,
    attackerId,
    targetId,
    attack,
  );
  return selection !== null
    ? {
        kind: "unitFeatureDecision",
        holeId: WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
        holeInstanceKey: WEAPON_MASTERY_CLEAVE_DECISION_HOLE_INSTANCE,
        label: "Use Cleave",
        choices: ["use", "decline"],
      }
    : null;
}

export function weaponMasteryCleaveTargetHole(
  state: BattleState,
  attackerId: CombatantId,
  firstTargetId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_TARGET_HOLE_INSTANCE,
    label: "Cleave second target",
    requiresTableSpatialFact: true,
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId,
          },
        }
      : {}),
    choices: [...state.combatants.keys()].filter(
      (combatantId) =>
        combatantId !== attackerId && combatantId !== firstTargetId,
    ),
  };
}

export function weaponMasteryCleaveAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): BattleAttackRollHole {
  return {
    ...attackRollHole(
      state.combatants.get(attackerId),
      attack,
      requiredAttackRollMode(
        state,
        attackerId,
        targetId,
        attack,
        targetSpatialFacts,
      ),
    ),
    holeId: WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_INSTANCE,
    label: "Cleave attack roll",
  };
}

export function weaponMasteryCleaveDamageHole(
  attack: CharacterWeaponAttackActionOption,
  critical: boolean,
  attackRoll: BattleAttackRollResult,
  eligibleAttackDamageDieFloorChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(attack, critical, attackRoll);
  const damageDieFloorProcedureRefs = attackDamageDieFloorChoiceProcedureRefs(
    eligibleAttackDamageDieFloorChoiceProcedureRefs,
  );
  return {
    kind: "rolledDice",
    holeId: WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_INSTANCE,
    label: `Cleave damage (${expression})`,
    attack,
    critical,
    ...(damageDieFloorProcedureRefs === null
      ? {}
      : {
          attackDamageDieFloorChoiceProcedureRefs: damageDieFloorProcedureRefs,
        }),
  };
}

export function weaponMasteryCleaveExtraAttack(
  attack: CharacterWeaponAttackActionOption,
): CharacterWeaponAttackActionOption {
  return {
    ...attack,
    damageAbilityModifier:
      attack.abilityModifier < 0 ? attack.abilityModifier : abilityModifier(0),
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: cleaveAbilityChoices(
            attack.alternateAbilityChoices,
          ),
        }),
  };
}

export type HuntersPreyHordeBreakerSelection = {
  readonly procedureRef: BattleProcedureExecutionRef;
};

export function huntersPreyHordeBreakerDecisionHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureDecisionHole | null {
  const selection = huntersPreyHordeBreakerSelection(
    state,
    attackerId,
    targetId,
    attack,
  );
  return selection === null
    ? null
    : {
        kind: "unitFeatureDecision",
        holeId: HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID,
        holeInstanceKey: HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_INSTANCE,
        label: "Use Horde Breaker",
        choices: ["use", "decline"],
      };
}

export function huntersPreyHordeBreakerTargetHole(
  state: BattleState,
  attackerId: CombatantId,
  firstTargetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID,
    holeInstanceKey: HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_INSTANCE,
    label: "Horde Breaker second target",
    requiresTableSpatialFact: true,
    procedureRef: sourceProcedureRef,
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId,
          },
        }
      : {}),
    choices: [...state.combatants.keys()].filter(
      (combatantId) =>
        combatantId !== attackerId && combatantId !== firstTargetId,
    ),
  };
}

export function huntersPreyHordeBreakerAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): BattleAttackRollHole {
  return {
    ...attackRollHole(
      state.combatants.get(attackerId),
      attack,
      requiredAttackRollMode(
        state,
        attackerId,
        targetId,
        attack,
        targetSpatialFacts,
      ),
    ),
    holeId: HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_INSTANCE,
    label: "Horde Breaker attack roll",
  };
}

export function huntersPreyHordeBreakerDamageHole(
  attack: CharacterWeaponAttackActionOption,
  critical: boolean,
  attackRoll: BattleAttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  eligibleAttackDamageDieFloorChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    ongoingDamageModifier,
  );
  const damageDieFloorProcedureRefs = attackDamageDieFloorChoiceProcedureRefs(
    eligibleAttackDamageDieFloorChoiceProcedureRefs,
  );
  return {
    kind: "rolledDice",
    holeId: HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
    holeInstanceKey: HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_INSTANCE,
    label: `Horde Breaker damage (${expression})`,
    attack,
    critical,
    ...nonEmptyArrayProperty("attackDamageRiders", attackDamageRiders),
    ...nonEmptyArrayProperty(
      "spellWeaponDamageRiders",
      spellWeaponDamageRiders,
    ),
    ...nonEmptyArrayProperty(
      "spellMarkedDamageRiders",
      spellMarkedDamageRiders,
    ),
    ...(damageDieFloorProcedureRefs === null
      ? {}
      : {
          attackDamageDieFloorChoiceProcedureRefs: damageDieFloorProcedureRefs,
        }),
  };
}

export function huntersPreyHordeBreakerTargetIsLegal(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly firstTargetId: CombatantId;
  readonly secondTargetId: CombatantId;
  readonly attack: CharacterWeaponAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.secondTargetId !== input.firstTargetId &&
    attackTargetIsLegal(
      input.state,
      input.attackerId,
      input.secondTargetId,
      input.attack,
      input.targetSpatialFacts,
    ) &&
    input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "hordeBreakerSecondTargetEligible" &&
        fact.attackerId === input.attackerId &&
        fact.sourceProcedureRef === input.sourceProcedureRef &&
        fact.originalTargetId === input.firstTargetId &&
        fact.secondTargetId === input.secondTargetId,
    )
  );
}

export function recordHuntersPreyHordeBreakerUsed(
  state: BattleState,
  attackerId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): BattleState {
  return state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn.some(
    (usage) =>
      usage.attackerId === attackerId && usage.procedureRef === procedureRef,
  )
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          huntersPreyHordeBreakerUsedThisTurn: [
            ...state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
            { attackerId, procedureRef },
          ],
        },
      };
}

export function huntersPreyHordeBreakerSelection(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): HuntersPreyHordeBreakerSelection | null {
  if (
    attack.kind !== "weapon" ||
    currentActorId(state) !== attackerId ||
    !state.combatants.has(targetId)
  ) {
    return null;
  }
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return null;
  }
  const binding = attacker.origin.execution.procedureBindings.find(
    (candidate) => {
      const procedure = candidate.procedure;
      return (
        !state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn.some(
          (usage) =>
            usage.attackerId === attackerId &&
            usage.procedureRef === candidate.procedureRef,
        ) &&
        procedure.kind === "unitSupportProfile" &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === HUNTERS_PREY_SUPPORT_PROFILE &&
        procedure.execution.huntersPrey.kind ===
          "nearbyDifferentTargetSameWeaponAttack"
      );
    },
  );
  return binding === undefined ? null : { procedureRef: binding.procedureRef };
}

function cleaveAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [firstChoice, ...remainingChoices] = choices;
  return [
    cleaveAbilityChoice(firstChoice),
    ...remainingChoices.map(cleaveAbilityChoice),
  ];
}

function cleaveAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
): CharacterWeaponAttackAbilityChoice {
  return {
    ...choice,
    damageAbilityModifier:
      choice.abilityModifier < 0 ? choice.abilityModifier : abilityModifier(0),
  };
}

export function weaponMasteryCleaveTargetIsLegal(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly firstTargetId: CombatantId;
  readonly secondTargetId: CombatantId;
  readonly attack: CharacterWeaponAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.secondTargetId !== input.firstTargetId &&
    attackTargetIsLegal(
      input.state,
      input.attackerId,
      input.secondTargetId,
      input.attack,
      input.targetSpatialFacts,
    ) &&
    input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "cleaveSecondTargetWithin5FeetOfFirstTarget" &&
        fact.attackerId === input.attackerId &&
        fact.firstTargetId === input.firstTargetId &&
        fact.secondTargetId === input.secondTargetId,
    )
  );
}

export function recordWeaponMasteryCleaveUsed(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  return state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
    attackerId,
  )
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          weaponMasteryCleaveAttackersUsedThisTurn: [
            ...state.currentTurnResources
              .weaponMasteryCleaveAttackersUsedThisTurn,
            attackerId,
          ],
        },
      };
}

function weaponMasteryCleaveSelection(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): SelectedWeaponMasteryProperty | null {
  if (
    attack.kind !== "weapon" ||
    attackTargetConstraint(attack).kind !== "meleeReach"
  ) {
    return null;
  }
  if (
    !state.combatants.has(targetId) ||
    state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
      attackerId,
    )
  ) {
    return null;
  }
  return selectedWeaponMasteryProperty({
    state,
    attackerId,
    attack,
    supportProfile: WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  });
}

function tacticalMasterReplacementSelection(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): TacticalMasterReplacementSelection | null {
  if (attack.kind !== "weapon" || currentActorId(state) !== attackerId) {
    return null;
  }
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return null;
  }
  if (!attack.hasWeaponMastery) {
    return null;
  }
  const binding = attacker.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitSupportProfile" &&
      typeof candidate.procedure.execution === "object" &&
      candidate.procedure.execution.kind ===
        TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  );
  return binding === undefined ||
    binding.procedure.kind !== "unitSupportProfile" ||
    typeof binding.procedure.execution !== "object" ||
    binding.procedure.execution.kind !==
      TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE
    ? null
    : {
        procedureRef: binding.procedureRef,
        replacementProperties:
          binding.procedure.execution.replacementProperties,
      };
}

function weaponAttackWithMasteryProperty<
  TAttack extends SupportedAttackActionOption,
>(
  attack: TAttack,
  property: TacticalMasterReplacementMasteryProperty,
): TAttack {
  return attack.kind !== "weapon"
    ? attack
    : {
        ...attack,
        weapon: {
          ...attack.weapon,
          mastery: property,
        },
      };
}

function isTacticalMasterReplacementMasteryProperty(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is TacticalMasterReplacementMasteryProperty {
  return value === "push" || value === "sap" || value === "slow";
}

function creatureSizeIsAtMost(
  actual: (typeof SIZES)[number],
  maximum: (typeof SIZES)[number],
): boolean {
  return SIZES.indexOf(actual) <= SIZES.indexOf(maximum);
}

function selectedWeaponMasteryProperty(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly supportProfile: WeaponMasteryPropertySupportProfile;
}): SelectedWeaponMasteryProperty | null {
  const attack = input.attack;
  const property = weaponMasteryPropertyForSupportProfile(input.supportProfile);
  if (
    property === null ||
    attack.kind !== "weapon" ||
    attack.weapon.mastery !== property
  ) {
    return null;
  }
  const attacker = input.state.combatants.get(input.attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return null;
  }
  if (!attack.hasWeaponMastery) {
    return null;
  }
  const binding = attacker.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitSupportProfile" &&
      candidate.procedure.execution === input.supportProfile,
  );
  return binding === undefined
    ? null
    : { attack, procedureRef: binding.procedureRef };
}

function weaponMasteryPropertyForSupportProfile(
  supportProfile: WeaponMasteryPropertySupportProfile,
): CharacterWeaponAttackActionOption["weapon"]["mastery"] | null {
  for (const entry of WEAPON_MASTERY_PROPERTIES_BY_SUPPORT_PROFILE) {
    if (entry.supportProfile === supportProfile) return entry.property;
  }
  return null;
}

export function consumeSelfAttackRollEffects(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return state;
  }
  const consumed = attacker.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "nextAttackRollBySelf" }
    > => effect.kind === "nextAttackRollBySelf",
  );
  const activeEffects = attacker.activeEffects.filter(
    (effect) => effect.kind !== "nextAttackRollBySelf",
  );
  if (activeEffects.length === attacker.activeEffects.length) {
    return state;
  }
  const combatants = new Map(state.combatants).set(attackerId, {
    ...attacker,
    activeEffects,
  });
  return {
    ...state,
    combatants:
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources(
        combatants,
        consumed.flatMap((effect) => {
          const source = spellConcentrationEffectSourceFromEffect(effect);
          return source === null ? [] : [source];
        }),
      ),
  };
}

export function consumeOneShotAttackRollEffects(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const stateWithoutSelfEffects = consumeSelfAttackRollEffects(
    state,
    attackerId,
  );
  const target = state.combatants.get(targetId);
  const combatants = new Map(stateWithoutSelfEffects.combatants);
  let changed = false;
  if (target !== undefined) {
    const activeEffects = target.activeEffects.filter(
      (effect) => effect.kind !== "nextAttackRollAgainstSelf",
    );
    if (activeEffects.length !== target.activeEffects.length) {
      changed = true;
      combatants.set(targetId, { ...target, activeEffects });
    }
  }
  return changed
    ? { ...stateWithoutSelfEffects, combatants }
    : stateWithoutSelfEffects;
}

export function extendAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  relationshipFacts: readonly BattleAttackRollRelationshipFact[],
): BattleState {
  if (!attackRollTargetIsEnemy(relationshipFacts, attackerId, targetId)) {
    return state;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(state, attacker);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(attacker.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, attackerId, occurrence),
      );
    }
  }
  const nextActor = {
    ...attacker,
    activeOngoingFeatureOccurrences: nextOccurrences,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, nextActor),
  };
}

export function extendSavingThrowOngoingFeatures(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  relationshipFacts: readonly BattleSavingThrowRelationshipFact[],
): BattleState {
  if (!savingThrowTargetsEnemy(relationshipFacts, actorId, targetIds)) {
    return state;
  }
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(state, actor);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(actor.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, actorId, occurrence),
      );
    }
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: nextOccurrences,
    }),
  };
}

export function recordAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  activatedOngoingFeatureProfile: {
    readonly procedureRef: BattleProcedureExecutionRef;
    readonly execution: Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "ongoingFeature" }
    >;
  } | null,
  relationshipFacts: readonly BattleAttackRollRelationshipFact[],
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined || attackerId !== currentActorId(state)) {
    return state;
  }
  const recklessAttackWhileRagingUses =
    isCharacterBattleCreatureState(attacker) &&
    activatedOngoingFeatureProfile !== null &&
    ongoingFeatureProfileIsRecklessAttackForFrenzy(
      activatedOngoingFeatureProfile.execution,
    )
      ? activeRageSourceKeysForFrenzy(attacker).map((rageSourceKey) => ({
          attackerId,
          recklessAttackSourceKey: activatedOngoingFeatureProfile.procedureRef,
          rageSourceKey,
        }))
      : [];
  const withActivatedOngoingFeature =
    activatedOngoingFeatureProfile === null
      ? state
      : stateWithActiveOngoingFeatureOccurrence(
          state,
          attacker,
          attackerId,
          activatedOngoingFeatureProfile,
        );
  const withExtendedOngoingFeatures = extendAttackRollOngoingFeatures(
    withActivatedOngoingFeature,
    attackerId,
    targetId,
    relationshipFacts,
  );
  return {
    ...withExtendedOngoingFeatures,
    currentTurnResources: {
      ...withExtendedOngoingFeatures.currentTurnResources,
      attackRollMadeThisTurn: true,
      recklessAttackWhileRagingUsedThisTurn: [
        ...withExtendedOngoingFeatures.currentTurnResources
          .recklessAttackWhileRagingUsedThisTurn,
        ...recklessAttackWhileRagingUses.filter(
          (usage) =>
            !withExtendedOngoingFeatures.currentTurnResources.recklessAttackWhileRagingUsedThisTurn.some(
              (existing) =>
                existing.attackerId === usage.attackerId &&
                existing.recklessAttackSourceKey ===
                  usage.recklessAttackSourceKey &&
                existing.rageSourceKey === usage.rageSourceKey,
            ),
        ),
      ],
    },
  };
}

export function stateWithActiveOngoingFeatureOccurrence(
  state: BattleState,
  actor: BattleCreatureState,
  actorId: CombatantId,
  activation: {
    readonly procedureRef: BattleProcedureExecutionRef;
    readonly execution: Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "ongoingFeature" }
    >;
  },
): BattleState {
  const occurrences = new Map(actor.activeOngoingFeatureOccurrences);
  occurrences.set(
    activation.procedureRef,
    activeOngoingFeatureOccurrenceFromExecution(
      state,
      actorId,
      activation.execution,
    ),
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: occurrences,
    }),
  };
}

export function attackRollModeMatches(
  roll: BattleAttackRollResult,
  requiredMode: AttackRollMode | undefined,
): boolean {
  const tableSource = admittedAttackRollTableSource(roll);
  if (tableSource === undefined) {
    return (
      requiredMode === undefined || (roll.rollMode ?? "normal") === requiredMode
    );
  }
  return (
    (roll.rollMode ?? "normal") ===
    combineD20TestRollMode(
      mechanicalD20TestRollModeSources(requiredMode),
      tableSource,
    )
  );
}
