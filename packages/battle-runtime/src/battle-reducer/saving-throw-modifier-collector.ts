// KERNEL-COVERAGE: runtime-owner BATTLE.SAVING_THROW.MODIFIER_COLLECTOR
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-saving-throw-roll-mode
//
// Every saving throw route asks this collector which Advantage, Disadvantage
// and bonuses reach each target. Each source is written once here.
// RAW: .references/srd-5.2.1/rules-glossary.md, "Dodge" ("you make Dexterity
// saving throws with Advantage"), "Restrained" ("You have Disadvantage on
// Dexterity saving throws"), "Advantage" and "Disadvantage" (one of each
// cancels, however many there are), and "Paralyzed", "Petrified", "Stunned"
// and "Unconscious" ("You automatically fail Strength and Dexterity saving
// throws").
import { Match } from "effect";
import {
  hasCondition,
  isIncapacitated,
  type StrengthAndDexteritySaveFailingCondition,
  strengthAndDexteritySaveFailingConditions,
} from "@dnd/shared-algebras/conditions-algebra";
import type { Condition } from "@dnd/shared/types";
import type { Ability } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleSavingThrowAutomaticFailureProjection,
  BattleSavingThrowFlatBonusProjection,
  BattleSavingThrowRollModeProjection,
  BattleSpellTargetListRelationshipFact,
  BattleState,
  BattleStrengthOrDexteritySavingThrowChoices,
} from "../battle-state-execution.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import { passiveSavingThrowRollModeDisposition } from "../unit-feature-execution-constants.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import { hasDodgeBenefit } from "./dodge-benefit.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeStrengthRollMode,
} from "./creature-size-change-effects.ts";
import { linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget } from "./linked-defense-damage-share.ts";
import { boundSaveGatedTurnConstraintBundleEffect } from "./spell-modifier-binding.ts";
import { spellTargetHasNonSpatialPrerequisites } from "./spell-target-prerequisites.ts";
import { spellTargetIsHostileToCaster } from "./roll-trigger-relationship-facts.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import { uniqueSavingThrowRollModeProjections } from "./saving-throw-roll-mode-projections.ts";
import { mechanicalD20TestRollMode } from "../d20-test-circumstance.ts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";

/** Where a saving throw's Advantage or Disadvantage comes from. */
export const SAVING_THROW_ROLL_MODE_SOURCES = [
  "dodgingTarget",
  "targetCondition",
  "passiveFeature",
  "activeEffect",
  "abilityD20TestEffect",
  "countedConditionEffect",
  "sizeChangeEffect",
  "conditionAvoidanceEffect",
  "spellSaveRule",
  "procedureRule",
] as const;
export type SavingThrowRollModeSource =
  (typeof SAVING_THROW_ROLL_MODE_SOURCES)[number];

/** Where a saving throw's flat bonus or penalty comes from. */
export const SAVING_THROW_BONUS_SOURCES = [
  "linkedDefense",
  "turnConstraint",
  "cover",
] as const;
export type SavingThrowBonusSource =
  (typeof SAVING_THROW_BONUS_SOURCES)[number];

export type SavingThrowContribution =
  | {
      readonly role: "rollMode";
      readonly source: SavingThrowRollModeSource;
      readonly mode: "advantage" | "disadvantage";
    }
  | {
      readonly role: "bonus";
      readonly source: SavingThrowBonusSource;
      readonly bonus: BattleSavingThrowFlatBonusProjection;
    }
  | {
      readonly role: "automaticFailure";
      readonly source: "targetCondition";
      readonly condition: StrengthAndDexteritySaveFailingCondition;
    };

/** A spell whose own text gives some targets Advantage or Disadvantage. */
export type SpellSaveRollModeRuleContext = {
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedureExecution,
      { readonly procedure: "saveGatedCondition" | "saveGatedDamage" }
    >
  >;
  readonly relationshipFacts: readonly BattleSpellTargetListRelationshipFact[];
};

/**
 * Sources that only the save's own procedure knows: Heightened Spell's
 * Disadvantage, a size or damage trigger's Advantage, and the cover the
 * table ruled for a target.
 */
export type SavingThrowProcedureSources = {
  readonly rollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly bonuses: readonly Extract<
    BattleSavingThrowFlatBonusProjection,
    { readonly kind: "cover" }
  >[];
};

export type SavingThrowContext = {
  readonly ability: Ability;
  /** The condition this save avoids or ends, when it names one. */
  readonly avoidsCondition?: Condition;
  readonly spellSaveRollModeRule?: SpellSaveRollModeRuleContext;
  readonly procedureSources?: SavingThrowProcedureSources;
};

export type SavingThrowTargetModifiers = {
  readonly targetRollModes: readonly BattleSavingThrowRollModeProjection[];
  readonly targetFlatBonuses: readonly BattleSavingThrowFlatBonusProjection[];
  readonly targetAutomaticFailures: readonly BattleSavingThrowAutomaticFailureProjection[];
};

type RollModeContribution = Extract<
  SavingThrowContribution,
  { readonly role: "rollMode" }
>;

// A "normal" source counts as both an Advantage and a Disadvantage, so it
// cancels any other source of either.
function rollModeContributions(
  source: SavingThrowRollModeSource,
  mode: BattleSavingThrowRollModeProjection["rollMode"],
): readonly RollModeContribution[] {
  return Match.value(mode).pipe(
    Match.when("advantage", () => [
      { role: "rollMode" as const, source, mode: "advantage" as const },
    ]),
    Match.when("disadvantage", () => [
      { role: "rollMode" as const, source, mode: "disadvantage" as const },
    ]),
    Match.when("normal", () => [
      { role: "rollMode" as const, source, mode: "advantage" as const },
      { role: "rollMode" as const, source, mode: "disadvantage" as const },
    ]),
    Match.exhaustive,
  );
}

function dodgeContributions(
  state: BattleState,
  target: BattleCreatureState,
  ability: Ability,
): readonly RollModeContribution[] {
  return ability === "dex" && hasDodgeBenefit(state, target)
    ? rollModeContributions("dodgingTarget", "advantage")
    : [];
}

function targetConditionContributions(
  target: BattleCreatureState,
  ability: Ability,
): readonly RollModeContribution[] {
  return ability === "dex" && hasCondition(target.conditions, "restrained")
    ? rollModeContributions("targetCondition", "disadvantage")
    : [];
}

function automaticFailureContributions(
  target: BattleCreatureState,
  ability: Ability,
): readonly SavingThrowContribution[] {
  return ability === "str" || ability === "dex"
    ? strengthAndDexteritySaveFailingConditions(target.conditions).map(
        (condition) => ({
          role: "automaticFailure" as const,
          source: "targetCondition" as const,
          condition,
        }),
      )
    : [];
}

function passiveFeatureContributions(
  target: BattleCreatureState,
  ability: Ability,
  avoidsCondition: Condition | undefined,
): readonly RollModeContribution[] {
  if (target.origin.kind !== "character") return [];
  const binding = characterUnitProcedureBindings(target.origin.execution).find(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "passiveSavingThrowRollMode" &&
      passiveSavingThrowRollModeDisposition(
        procedure.execution.savingThrow,
        ability,
        avoidsCondition,
        isIncapacitated(target.conditions),
      ) === "projected",
  );
  const execution =
    binding?.procedure.kind === "unitFeature"
      ? binding.procedure.execution
      : undefined;
  return execution?.kind !== "passiveSavingThrowRollMode"
    ? []
    : rollModeContributions("passiveFeature", execution.savingThrow.mode);
}

type EffectRollModeSource = (
  effect: BattleActiveEffect,
  ability: Ability,
  avoidsCondition: Condition | undefined,
) => readonly RollModeContribution[];

const savingThrowRollModeEffect: EffectRollModeSource = (effect, ability) =>
  effect.kind === "savingThrowRollMode" && effect.ability === ability
    ? rollModeContributions("activeEffect", effect.mode)
    : [];

const abilityD20TestRollModeEffect: EffectRollModeSource = (effect, ability) =>
  effect.kind === "abilityD20TestRollModeEndTurnSave" &&
  effect.ability === ability
    ? rollModeContributions("abilityD20TestEffect", effect.mode)
    : [];

const countedConditionEffect: EffectRollModeSource = (effect, ability) =>
  effect.kind === "spellConditionCountedEndTurnSave" &&
  effect.savingThrowDisadvantageAbility === ability
    ? rollModeContributions("countedConditionEffect", "disadvantage")
    : [];

const conditionAvoidanceEffect: EffectRollModeSource = (
  effect,
  _ability,
  avoidsCondition,
) =>
  effect.kind === "conditionSavingThrowRollMode" &&
  effect.condition === avoidsCondition
    ? rollModeContributions("conditionAvoidanceEffect", effect.mode)
    : [];

// Each effect kind that can change a saving throw's roll mode, and the saves
// it reaches.
const EFFECT_ROLL_MODE_SOURCES: readonly EffectRollModeSource[] = [
  savingThrowRollModeEffect,
  abilityD20TestRollModeEffect,
  countedConditionEffect,
  conditionAvoidanceEffect,
];

function activeEffectRollModeContributions(
  effect: BattleActiveEffect,
  ability: Ability,
  avoidsCondition: Condition | undefined,
): readonly RollModeContribution[] {
  return EFFECT_ROLL_MODE_SOURCES.flatMap((source) =>
    source(effect, ability, avoidsCondition),
  );
}

function sizeChangeContributions(
  target: BattleCreatureState,
  ability: Ability,
): readonly RollModeContribution[] {
  if (ability !== "str") return [];
  const effect = activeCreatureSizeChangeEffect(target);
  return effect === null
    ? []
    : rollModeContributions(
        "sizeChangeEffect",
        creatureSizeChangeStrengthRollMode(effect),
      );
}

function spellSaveRuleContributions(
  state: BattleState,
  target: BattleCreatureState,
  rule: SpellSaveRollModeRuleContext | undefined,
): readonly RollModeContribution[] {
  const saveRollModeRule = rule?.invocation.saveRollModeRule;
  if (
    rule === undefined ||
    saveRollModeRule === undefined ||
    saveRollModeRule === null
  ) {
    return [];
  }
  const { actorId, invocation, relationshipFacts } = rule;
  const applies = Match.value(saveRollModeRule).pipe(
    Match.when({ kind: "hostileTarget" }, () =>
      spellTargetIsHostileToCaster(
        relationshipFacts,
        actorId,
        target.combatantId,
        invocation,
      ),
    ),
    Match.when(
      { kind: "creatureType" },
      ({ creatureType }) => battleCreatureType(target) === creatureType,
    ),
    Match.exhaustive,
  );
  return applies &&
    spellTargetHasNonSpatialPrerequisites(
      state,
      actorId,
      target.combatantId,
      invocation,
    )
    ? rollModeContributions("spellSaveRule", saveRollModeRule.mode)
    : [];
}

function procedureRollModeContributions(
  target: BattleCreatureState,
  procedureSources: SavingThrowProcedureSources | undefined,
): readonly RollModeContribution[] {
  return (procedureSources?.rollModes ?? [])
    .filter((projection) => projection.targetId === target.combatantId)
    .flatMap((projection) =>
      rollModeContributions("procedureRule", projection.rollMode),
    );
}

function turnConstraintBonusContributions(
  state: BattleState,
  target: BattleCreatureState,
  ability: Ability,
): readonly SavingThrowContribution[] {
  if (ability !== "dex") return [];
  const effect = target.activeEffects.flatMap((candidate) => {
    if (candidate.kind !== "saveGatedTurnConstraintBundle") return [];
    const boundEffect = boundSaveGatedTurnConstraintBundleEffect(
      state,
      candidate,
    );
    return boundEffect === undefined ? [] : [boundEffect];
  })[0];
  return effect === undefined
    ? []
    : [
        {
          role: "bonus",
          source: "turnConstraint",
          bonus: {
            kind: "effect",
            targetId: target.combatantId,
            sourceCombatantId: effect.sourceCombatantId,
            sourceProcedureRef: effect.sourceProcedureRef,
            bonus: effect.constraints.dexteritySavingThrowDelta,
          },
        },
      ];
}

function targetBonusContributions(
  target: BattleCreatureState,
  context: SavingThrowContext,
): readonly SavingThrowContribution[] {
  return [
    ...linkedDefenseResistanceDamageShareSavingThrowFlatBonusProjectionsForTarget(
      target,
    ).map(
      (bonus): SavingThrowContribution => ({
        role: "bonus",
        source: "linkedDefense",
        bonus,
      }),
    ),
    ...(context.procedureSources?.bonuses ?? [])
      .filter((bonus) => bonus.targetId === target.combatantId)
      .map(
        (bonus): SavingThrowContribution => ({
          role: "bonus",
          source: "cover",
          bonus,
        }),
      ),
  ];
}

// The sources the target and the save's own procedure carry, which need no
// battle state.
function targetCarriedContributions(
  target: BattleCreatureState,
  context: SavingThrowContext,
): readonly SavingThrowContribution[] {
  const { ability, avoidsCondition } = context;
  return [
    ...targetConditionContributions(target, ability),
    ...automaticFailureContributions(target, ability),
    ...passiveFeatureContributions(target, ability, avoidsCondition),
    ...target.activeEffects.flatMap((effect) =>
      activeEffectRollModeContributions(effect, ability, avoidsCondition),
    ),
    ...sizeChangeContributions(target, ability),
    ...procedureRollModeContributions(target, context.procedureSources),
    ...targetBonusContributions(target, context),
  ];
}

/** Every source that reaches this target's saving throw, each named. */
export function savingThrowContributions(
  state: BattleState,
  target: BattleCreatureState,
  context: SavingThrowContext,
): readonly SavingThrowContribution[] {
  return [
    ...dodgeContributions(state, target, context.ability),
    ...targetCarriedContributions(target, context),
    ...spellSaveRuleContributions(state, target, context.spellSaveRollModeRule),
    ...turnConstraintBonusContributions(state, target, context.ability),
  ];
}

/**
 * A saving throw that isn't a Dexterity save and has no spell rule of its
 * own. Only Dexterity saves (Dodge, a turn constraint's penalty) and a
 * spell's rule read the battle around the target.
 */
export type TargetCarriedSavingThrowContext = SavingThrowContext & {
  readonly ability: Exclude<Ability, "dex">;
  readonly spellSaveRollModeRule?: never;
};

/**
 * Every source that reaches this target's saving throw, for a save whose
 * sources the target and the save's procedure alone carry.
 */
export function targetCarriedSavingThrowContributions(
  target: BattleCreatureState,
  context: TargetCarriedSavingThrowContext,
): readonly SavingThrowContribution[] {
  return targetCarriedContributions(target, context);
}

/** The roll mode one target's contributions combine to, if any reaches it. */
export function savingThrowRollModeFromContributions(
  contributions: readonly SavingThrowContribution[],
): AttackRollMode | undefined {
  return mechanicalD20TestRollMode({
    advantage: contributions.some(
      (entry) => entry.role === "rollMode" && entry.mode === "advantage",
    ),
    disadvantage: contributions.some(
      (entry) => entry.role === "rollMode" && entry.mode === "disadvantage",
    ),
  });
}

/** The flat bonuses among one target's contributions. */
export function savingThrowFlatBonusesFromContributions(
  contributions: readonly SavingThrowContribution[],
): readonly BattleSavingThrowFlatBonusProjection[] {
  return contributions.flatMap((entry) =>
    entry.role === "bonus" ? [entry.bonus] : [],
  );
}

function targetsFor(
  state: BattleState,
  targetIds: "everyCombatant" | readonly CombatantId[],
): readonly BattleCreatureState[] {
  return targetIds === "everyCombatant"
    ? [...state.combatants.values()]
    : targetIds.flatMap((targetId) => {
        const target = state.combatants.get(targetId);
        return target === undefined ? [] : [target];
      });
}

/**
 * The roll mode, flat bonuses and automatic failure a saving throw hole
 * carries for each target, from the collector's contributions.
 */
export function savingThrowTargetModifiers(
  state: BattleState,
  context: SavingThrowContext,
  targetIds: "everyCombatant" | readonly CombatantId[],
): SavingThrowTargetModifiers {
  const contributions = targetsFor(state, targetIds).map((target) => ({
    targetId: target.combatantId,
    contributions: savingThrowContributions(state, target, context),
  }));
  return {
    targetRollModes: uniqueSavingThrowRollModeProjections(
      contributions.flatMap(({ targetId, contributions: entries }) =>
        entries.flatMap((entry) =>
          entry.role === "rollMode" ? [{ targetId, rollMode: entry.mode }] : [],
        ),
      ),
    ),
    targetFlatBonuses: contributions.flatMap(({ contributions: entries }) =>
      savingThrowFlatBonusesFromContributions(entries),
    ),
    targetAutomaticFailures: contributions.flatMap(
      ({ targetId, contributions: entries }) => {
        const [first, ...rest] = entries.flatMap((entry) =>
          entry.role === "automaticFailure" ? [entry.condition] : [],
        );
        return first === undefined
          ? []
          : [{ targetId, conditions: [first, ...rest] }];
      },
    ),
  };
}

/**
 * A turn-boundary save hole is also rebuilt without the battle state, only to
 * find the fill that stands for it. Then only the save's own procedure
 * sources are known, and its roll modes, bonuses and automatic failures
 * are not read.
 */
export function savingThrowTargetModifiersWhenStateKnown(
  state: BattleState | undefined,
  context: SavingThrowContext,
  targetIds: readonly CombatantId[],
): SavingThrowTargetModifiers {
  if (state !== undefined) {
    return savingThrowTargetModifiers(state, context, targetIds);
  }
  return {
    targetRollModes: uniqueSavingThrowRollModeProjections(
      (context.procedureSources?.rollModes ?? []).filter((projection) =>
        targetIds.includes(projection.targetId),
      ),
    ),
    targetFlatBonuses: [],
    targetAutomaticFailures: [],
  };
}

/**
 * The Strength and Dexterity saving throws a Grapple or Shove target chooses
 * between, each with what reaches it.
 */
export function strengthOrDexteritySavingThrowChoices(
  state: BattleState,
  targetId: CombatantId,
  avoidsCondition?: Condition,
): BattleStrengthOrDexteritySavingThrowChoices {
  const context = avoidsCondition === undefined ? {} : { avoidsCondition };
  return [
    {
      ability: "str",
      ...savingThrowTargetModifiers(state, { ability: "str", ...context }, [
        targetId,
      ]),
    },
    {
      ability: "dex",
      ...savingThrowTargetModifiers(state, { ability: "dex", ...context }, [
        targetId,
      ]),
    },
  ];
}
