// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.ROLL_MODE_COLLECTOR
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE BATTLE.ATTACK.PRONE_ATTACKER_ROLL_MODE BATTLE.ATTACK.CONDITION_ROLL_MODE BATTLE.ATTACK.RANGED_CLOSE_COMBAT_ROLL_MODE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.grappler
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { Ability, MovementFeet } from "@dnd/shared/types";
import { creatureTypeProtectionGrantsAttackDisadvantage } from "../active-effect/creature-type-protection.ts";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  BattleCreatureState,
  BattleState,
  BattleTargetSpatialFact,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import {
  D20TestRollModeSourcesMonoid,
  attackerConditionAttackRollModeSources,
  mechanicalD20TestRollMode,
  proneAttackRollModeSources,
  targetConditionAttackRollModeSources,
  type D20TestRollModeSources,
} from "../d20-test-circumstance.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import { optionalProperty } from "../optional-property.ts";
import type {
  OngoingFeatureDamageModifier,
  OngoingFeatureRollModifier,
} from "../unit-feature-execution-constants.ts";
import { attackRollDefenseGrantsDisadvantage } from "./attack-roll-defense.ts";
import {
  attackTargetDistanceFeet,
  attackTargetRangeBand,
} from "./attack-spatial.ts";
import {
  combatantCanSee,
  combatantInvisibleBenefitDenied,
} from "./creature-state-leaves.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-queries.ts";
import { hasDodgeBenefit } from "./dodge-benefit.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { combatantHasGrapplerSupportProfile } from "./grappler-support-profile.ts";
import { ongoingSpellEffectSuppressedByMagicSuppressionEmanation } from "./magic-suppression-ongoing-effect.ts";
import {
  rangedAttackCloseCombatDisadvantage,
  type RangedAttackEnemyProximityEvidence,
  type SpatialQualificationIssue,
} from "./ranged-attack-close-combat.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import {
  attackTargetConstraint,
  targetHasAdjacentNonIncapacitatedAlly,
} from "./statblock-attacks.ts";

type RuntimeSpellProcedure =
  | SupportedSpellInvocation
  | RuntimeSpellProcedureExecution;

/**
 * Every source that can give an attack roll Advantage or Disadvantage. Each is
 * named for what it is, and each says for itself which attack rolls it reaches
 * (see `ATTACK_ROLL_MODE_SOURCE_CONTRIBUTIONS`), so no route can leave one out.
 */
const ATTACK_ROLL_MODE_SOURCES = [
  "attackerCondition",
  "grappledAttacker",
  "attackerCannotSeeTarget",
  "targetCannotSeeAttacker",
  "hiddenAttacker",
  "hiddenTarget",
  "dodgingTarget",
  "targetCondition",
  "proneTarget",
  "unconsciousTarget",
  "grapplerAgainstGrappledTarget",
  "helpedAttack",
  "statBlockTrait",
  "activeEffect",
  "ongoingFeature",
  "attackRollDefense",
  "longRange",
  "rangedCloseCombat",
  "outlinedObject",
] as const;
export type AttackRollModeSource = (typeof ATTACK_ROLL_MODE_SOURCES)[number];

/** One source's Advantage or Disadvantage on one attack roll. */
export type AttackRollModeContribution = {
  readonly source: AttackRollModeSource;
  readonly mode: Exclude<AttackRollMode, "normal">;
};

/**
 * Whether the attacker can see an object target. An ordinary object attack
 * always asks the table; a spell attack asks only when a source reads it (an
 * outlined object), so the fact may not have been asked for.
 */
export type ObjectTargetSight =
  | { readonly kind: "sightNotAsked" }
  | { readonly kind: "sightFact"; readonly attackerCanSeeObject: boolean };

/** The object sight a route has, from the table's fact if it asked for one. */
export function objectTargetSight(
  sightFact: { readonly attackerCanSeeObject: boolean } | null,
): ObjectTargetSight {
  return sightFact === null
    ? { kind: "sightNotAsked" }
    : {
        kind: "sightFact",
        attackerCanSeeObject: sightFact.attackerCanSeeObject,
      };
}

/** What the attack roll is made against. */
export type AttackRollModeTarget =
  | { readonly kind: "creature"; readonly creature: BattleCreatureState }
  | {
      readonly kind: "object";
      readonly objectId: BattleObjectId;
      readonly sight: ObjectTargetSight;
    };

/** How the attack roll is made. */
export type AttackRollModeMeans =
  | {
      readonly kind: "attack";
      readonly attack: SupportedAttackActionOption;
      readonly opportunityAttack: boolean;
    }
  | { readonly kind: "spell"; readonly invocation: RuntimeSpellProcedure };

/**
 * The SRD "Ranged Attacks" circumstances of one attack roll, already resolved
 * from admitted evidence: long range, and an enemy close enough to impose
 * Disadvantage ("Ranged Attacks in Close Combat"). A melee attack has neither.
 */
export type RangedAttackRollCircumstances = {
  readonly longRange: boolean;
  readonly closeCombat: boolean;
};

const NOT_RANGED: RangedAttackRollCircumstances = {
  longRange: false,
  closeCombat: false,
};

/** Everything the collector reads about one attack roll. */
export type AttackRollModeContext = {
  readonly attackerId: CombatantId;
  readonly target: AttackRollModeTarget;
  readonly means: AttackRollModeMeans;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly ranged: RangedAttackRollCircumstances;
};

type CollectorFacts = AttackRollModeContext & {
  readonly state: BattleState;
  readonly attacker: BattleCreatureState | undefined;
  /** The weapon, Unarmed Strike or Stat Block attack, if the means is one. */
  readonly attack: SupportedAttackActionOption | undefined;
};

type SourceContributions = (facts: CollectorFacts) => D20TestRollModeSources;

const NO_SOURCES = D20TestRollModeSourcesMonoid.initialValue;

function advantageIf(condition: boolean): D20TestRollModeSources {
  return { advantage: condition, disadvantage: false };
}

function disadvantageIf(condition: boolean): D20TestRollModeSources {
  return { advantage: false, disadvantage: condition };
}

function forCreatureTarget(
  facts: CollectorFacts,
  sources: (target: BattleCreatureState) => D20TestRollModeSources,
): D20TestRollModeSources {
  return facts.target.kind === "creature"
    ? sources(facts.target.creature)
    : NO_SOURCES;
}

/**
 * Each source's rule. A source that only a creature target can supply (sight
 * facts, Help, Dodge, the target's own conditions) supplies nothing against
 * an object.
 */
const ATTACK_ROLL_MODE_SOURCE_CONTRIBUTIONS = {
  attackerCondition: (facts) =>
    attackerConditionAttackRollModeSources(facts.attacker?.conditions),
  grappledAttacker: (facts) => disadvantageIf(attackerGrappledByOther(facts)),
  attackerCannotSeeTarget: (facts) =>
    disadvantageIf(attackerCannotSeeTarget(facts)),
  targetCannotSeeAttacker: (facts) =>
    forCreatureTarget(facts, (target) =>
      advantageIf(
        hasAttackSightFact(
          facts.targetSpatialFacts,
          "attackTargetCannotSeeAttacker",
          facts.attackerId,
          target.combatantId,
        ),
      ),
    ),
  // SRD Invisible: "your attack rolls have Advantage", unless the target can
  // see you. An object never sees the attacker.
  hiddenAttacker: (facts) =>
    advantageIf(combatantHasHiddenAttackRollBenefit(facts.attacker)),
  hiddenTarget: (facts) =>
    forCreatureTarget(facts, (target) =>
      disadvantageIf(combatantHasHiddenAttackRollBenefit(target)),
    ),
  dodgingTarget: (facts) =>
    forCreatureTarget(facts, (target) =>
      disadvantageIf(
        facts.attacker !== undefined &&
          hasDodgeAttackRollBenefit(facts.state, target, facts.attacker),
      ),
    ),
  targetCondition: (facts) =>
    forCreatureTarget(facts, (target) =>
      targetConditionAttackRollModeSources(target.conditions),
    ),
  proneTarget: (facts) =>
    forCreatureTarget(facts, (target) => proneTargetSources(facts, target)),
  unconsciousTarget: (facts) =>
    forCreatureTarget(facts, (target) =>
      advantageIf(
        hasCondition(target.conditions, "unconscious") &&
          (facts.means.kind === "spell" ||
            creatureTargetDistanceFeet(facts, target) !== null),
      ),
    ),
  grapplerAgainstGrappledTarget: (facts) =>
    forCreatureTarget(facts, (target) =>
      advantageIf(
        combatantHasGrapplerSupportProfile(facts.attacker) &&
          facts.state.grapples.some(
            (link) =>
              link.grapplerId === facts.attackerId &&
              link.targetId === target.combatantId,
          ),
      ),
    ),
  helpedAttack: (facts) =>
    forCreatureTarget(facts, (target) =>
      advantageIf(
        facts.state.helpAttacks.some(
          (help) =>
            help.allyId === facts.attackerId &&
            help.targetEnemyId === target.combatantId,
        ),
      ),
    ),
  statBlockTrait: (facts) =>
    forCreatureTarget(facts, (target) =>
      advantageIf(statBlockTraitGrantsAttackRollAdvantage(facts, target)),
    ),
  activeEffect: (facts) => activeEffectSources(facts),
  ongoingFeature: (facts) => ongoingFeatureSources(facts),
  attackRollDefense: (facts) =>
    forCreatureTarget(facts, (target) =>
      disadvantageIf(
        attackRollDefenseGrantsDisadvantage({
          state: facts.state,
          attackerId: facts.attackerId,
          defenderId: target.combatantId,
          opportunityAttack:
            facts.means.kind === "attack" && facts.means.opportunityAttack,
        }),
      ),
    ),
  longRange: (facts) => disadvantageIf(facts.ranged.longRange),
  rangedCloseCombat: (facts) => disadvantageIf(facts.ranged.closeCombat),
  outlinedObject: (facts) =>
    advantageIf(
      facts.target.kind === "object" &&
        attackerSeesObject(facts.target.sight) === true &&
        facts.state.objectOutlines.some(
          (outline) =>
            facts.target.kind === "object" &&
            outline.objectId === facts.target.objectId,
        ),
    ),
} as const satisfies Record<AttackRollModeSource, SourceContributions>;

/**
 * Every Advantage and Disadvantage the attack roll has, each with its source.
 * Every attack-roll route asks this one collector.
 */
export function attackRollModeContributions(
  state: BattleState,
  context: AttackRollModeContext,
): readonly AttackRollModeContribution[] {
  const facts: CollectorFacts = {
    ...context,
    state,
    attacker: state.combatants.get(context.attackerId),
    attack: context.means.kind === "attack" ? context.means.attack : undefined,
  };
  return ATTACK_ROLL_MODE_SOURCES.flatMap((source) =>
    sourceContributions(
      source,
      ATTACK_ROLL_MODE_SOURCE_CONTRIBUTIONS[source](facts),
    ),
  );
}

function sourceContributions(
  source: AttackRollModeSource,
  sources: D20TestRollModeSources,
): readonly AttackRollModeContribution[] {
  return [
    ...(sources.advantage ? [{ source, mode: "advantage" as const }] : []),
    ...(sources.disadvantage
      ? [{ source, mode: "disadvantage" as const }]
      : []),
  ];
}

/**
 * The attack roll's mode from its contributions (SRD D20 Tests,
 * "Advantage/Disadvantage": like sources don't stack, and any Advantage with
 * any Disadvantage leaves a normal roll). Undefined when there is none.
 */
export function attackRollModeFromContributions(
  contributions: readonly AttackRollModeContribution[],
): AttackRollMode | undefined {
  return mechanicalD20TestRollMode({
    advantage: contributions.some(
      (contribution) => contribution.mode === "advantage",
    ),
    disadvantage: contributions.some(
      (contribution) => contribution.mode === "disadvantage",
    ),
  });
}

/** The collected attack-roll mode for one attack roll. */
export function collectedAttackRollMode(
  state: BattleState,
  context: AttackRollModeContext,
): AttackRollMode | undefined {
  return attackRollModeFromContributions(
    attackRollModeContributions(state, context),
  );
}

/**
 * SRD "Ranged Attacks", from the admitted creature-target or spell evidence.
 * A ranged weapon attack reads its range band from the target's spatial fact;
 * a ranged attack of either means needs the admitted enemy proximity evidence
 * ("Ranged Attacks in Close Combat": "with a weapon, a spell, or some other
 * means").
 */
export function rangedAttackRollCircumstances(
  state: BattleState,
  input: {
    readonly attackerId: CombatantId;
    readonly targetId: CombatantId | null;
    readonly means: AttackRollModeMeans;
    readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
    readonly enemyProximity: RangedAttackEnemyProximityEvidence | null;
  },
): RangedAttackRollCircumstances | SpatialQualificationIssue {
  if (!attackRollMeansIsRanged(input.means)) return NOT_RANGED;
  if (input.enemyProximity === null)
    return {
      tag: "invalid",
      message:
        input.means.kind === "attack"
          ? "Ranged attack requires admitted enemy proximity evidence."
          : "Ranged spell attack requires admitted enemy proximity evidence.",
    };
  const closeCombat = rangedAttackCloseCombatDisadvantage(
    state,
    input.enemyProximity,
  );
  if (typeof closeCombat !== "boolean") return closeCombat;
  return {
    longRange:
      input.means.kind === "attack" &&
      input.targetId !== null &&
      attackTargetRangeBand(
        input.targetSpatialFacts,
        input.attackerId,
        input.targetId,
        input.means.attack,
      ) === "long",
    closeCombat,
  };
}

function attackRollMeansIsRanged(means: AttackRollModeMeans): boolean {
  if (means.kind === "attack")
    return attackTargetConstraint(means.attack).kind === "rangedRange";
  const invocation = means.invocation;
  return (
    "attackKind" in invocation &&
    invocation.attackKind === "ranged_spell_attack" &&
    "rangeFeet" in invocation &&
    "sourceProcedureRef" in invocation
  );
}

/** SRD "Ranged Attacks", from an ordinary object attack's admitted fact. */
export function objectAttackRangedCircumstances(
  range: Extract<
    BattleTargetSpatialFact,
    { readonly kind: "attackObjectTarget" }
  >["range"],
): RangedAttackRollCircumstances {
  return range.kind === "rangedRange"
    ? {
        longRange: range.band === "long",
        closeCombat: range.enemyWithin5FeetCanSeeAttacker,
      }
    : NOT_RANGED;
}

// SRD Grappled: "You have Disadvantage on attack rolls against any target
// other than the grappler." An object is never the grappler.
function attackerGrappledByOther(facts: CollectorFacts): boolean {
  return facts.state.grapples.some(
    (link) =>
      link.targetId === facts.attackerId &&
      (facts.target.kind === "object" ||
        link.grapplerId !== facts.target.creature.combatantId),
  );
}

// SRD "Unseen Attackers and Targets": "When you make an attack roll against a
// target you can't see, you have Disadvantage."
function attackerCannotSeeTarget(facts: CollectorFacts): boolean {
  return facts.target.kind === "creature"
    ? hasAttackSightFact(
        facts.targetSpatialFacts,
        "attackAttackerCannotSeeTarget",
        facts.attackerId,
        facts.target.creature.combatantId,
      )
    : attackerSeesObject(facts.target.sight) === false;
}

/** The table's answer, or undefined when the attack didn't ask. */
function attackerSeesObject(sight: ObjectTargetSight): boolean | undefined {
  return sight.kind === "sightFact" ? sight.attackerCanSeeObject : undefined;
}

function creatureTargetDistanceFeet(
  facts: CollectorFacts,
  target: BattleCreatureState,
): MovementFeet | null {
  return facts.means.kind === "attack"
    ? attackTargetDistanceFeet(
        facts.targetSpatialFacts,
        facts.attackerId,
        target.combatantId,
        facts.means.attack,
      )
    : spellAttackTargetDistanceFeet(
        facts.targetSpatialFacts,
        facts.attackerId,
        target.combatantId,
        facts.means.invocation,
      );
}

function proneTargetSources(
  facts: CollectorFacts,
  target: BattleCreatureState,
): D20TestRollModeSources {
  if (!hasCondition(target.conditions, "prone")) return NO_SOURCES;
  const distanceFeet = creatureTargetDistanceFeet(facts, target);
  return distanceFeet === null
    ? NO_SOURCES
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

function statBlockTraitGrantsAttackRollAdvantage(
  facts: CollectorFacts,
  target: BattleCreatureState,
): boolean {
  if (facts.attack?.kind !== "statBlockAttack") return false;
  return (
    facts.attack.traitAttackRollModes?.some(
      (mode) =>
        mode.mode === "advantage" &&
        mode.predicate === "nonIncapacitatedAllyWithin5FeetOfTarget" &&
        targetHasAdjacentNonIncapacitatedAlly(
          facts.state,
          facts.attackerId,
          target.combatantId,
          facts.targetSpatialFacts,
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

function spellAttackTargetDistanceFeet(
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
  attackerId: CombatantId,
  targetId: CombatantId,
  invocation: RuntimeSpellProcedure,
): MovementFeet | null {
  if (!("sourceProcedureRef" in invocation)) return null;
  const spellTarget = targetSpatialFacts.find(
    (
      fact,
    ): fact is Extract<
      BattleTargetSpatialFact,
      { readonly kind: "spellTarget" }
    > =>
      fact.kind === "spellTarget" &&
      fact.casterId === attackerId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === invocation.sourceProcedureRef,
  );
  return spellTarget?.distanceFeet ?? null;
}

function activeEffectSources(facts: CollectorFacts): D20TestRollModeSources {
  const target =
    facts.target.kind === "creature" ? facts.target.creature : undefined;
  const effectContext = {
    attack: facts.attack,
    targetSpatialFacts: facts.targetSpatialFacts,
    ...optionalProperty("attackerCanSeeTarget", attackerCanSeeTarget(facts)),
  };
  return {
    advantage: activeEffectGrantsAttackRollMode(
      facts.state,
      facts.attacker,
      target,
      "advantage",
      effectContext,
    ),
    disadvantage: activeEffectGrantsAttackRollMode(
      facts.state,
      facts.attacker,
      target,
      "disadvantage",
      effectContext,
    ),
  };
}

function attackerCanSeeTarget(facts: CollectorFacts): boolean | undefined {
  if (facts.target.kind === "object")
    return attackerSeesObject(facts.target.sight);
  return (
    facts.attacker !== undefined &&
    !attackerCannotSeeTarget(facts) &&
    combatantCanSee(
      facts.state,
      facts.attacker.combatantId,
      facts.target.creature.combatantId,
    )
  );
}

function ongoingFeatureSources(facts: CollectorFacts): D20TestRollModeSources {
  const target =
    facts.target.kind === "creature" ? facts.target.creature : undefined;
  return D20TestRollModeSourcesMonoid.combine(
    {
      advantage: ongoingFeatureGrantsAttackRollMode(
        facts.state,
        facts.attacker,
        target,
        "advantage",
        facts.attack,
      ),
      disadvantage: ongoingFeatureGrantsAttackRollMode(
        facts.state,
        facts.attacker,
        target,
        "disadvantage",
        facts.attack,
      ),
    },
    facts.means.kind === "spell"
      ? ongoingFeatureSpellAttackSources(facts, facts.means.invocation)
      : NO_SOURCES,
  );
}

function ongoingFeatureSpellAttackSources(
  facts: CollectorFacts,
  invocation: RuntimeSpellProcedure,
): D20TestRollModeSources {
  return {
    advantage: ongoingFeatureGrantsSpellAttackRollMode(
      facts.state,
      facts.attacker,
      invocation,
      "advantage",
    ),
    disadvantage: ongoingFeatureGrantsSpellAttackRollMode(
      facts.state,
      facts.attacker,
      invocation,
      "disadvantage",
    ),
  };
}

function ongoingFeatureGrantsAttackRollMode(
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
          mode === "disadvantage" &&
          attackerCreatureType !== null &&
          creatureTypeProtectionGrantsAttackDisadvantage(
            effect,
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

function hasDodgeAttackRollBenefit(
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
