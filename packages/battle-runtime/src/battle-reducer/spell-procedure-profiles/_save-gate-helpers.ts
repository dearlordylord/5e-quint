import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// Save-gated spell profile projections shared by save-gated profiles.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  NonNegativeInteger,
  DAMAGE_TYPES,
  PositiveInteger,
  movementFeet,
  spellSlotLevel,
  type Ability,
  type Condition,
  type DamageType,
  type ReadonlyNonEmptyArray,
  type MovementFeet,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  ActivationPhase,
  Attachment,
  EffectAtom,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  isFixedDistancePointRange,
  topLevelSpellCastingTime,
} from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Result, Match } from "effect";
import {
  FAILED_SAVE_BLINDED_CONDITION as HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
  FAILED_SAVE_RESTRAINED_CONDITION as AREA_RESTRAINT_FAILED_SAVE_CONDITION,
  SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
  type DamageSpellSource,
  type DimIlluminationEmissionFacts,
  type SaveGateFailureEffect,
  type SpellActivationPhase,
  type SpellFailedSaveAttackRollEffect,
  type SpellFailedSaveConditionEffect,
  type SpellFailedSavePostDamageRider,
  type SpellPostSaveAreaEffect,
  type SpellSavingThrowRollModeRule,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { damageSpellSource } from "../spells-invocation-guards.ts";
import { isCantripSpellAccess } from "../../procedure-execution/spell-invocation-vocabulary.ts";
import {
  cantripSpellAccessFor,
  spellInvocationResourceForCastOption,
  type SpellAdmissionContext,
} from "./profile.ts";
import type { CombatantId } from "../../identity.ts";
import type {
  SaveGatedConditionSpellTargeting,
  SaveGatedDamageSpellTargeting,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellProcedureNonEmpty,
  type SpellMechanicsAdmissionSource,
  type SpellDurationChild,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import {
  sameStringSet,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import { illuminationEmissionFactsFromSurface } from "./illumination-emission-facts.ts";

type SpellMechanicsSource = Pick<BattleSpellAdmissionSource, "mechanics">;
type ActivationSpellMechanicsSource = SpellMechanicsSource & {
  readonly mechanics: Extract<
    SpellMechanicsSource["mechanics"],
    { readonly family: "activation" }
  >;
};
type SaveGateDuration = BattleSpellAdmissionSource["mechanics"]["duration"];
type SaveGatedConditionImmunitySpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionImmunity" }
>;

/** Immutable linear targeting facts projected from authored selection data. */
export type SaveGateTargetCountFacts = {
  readonly base: PositiveInteger;
  readonly baseLevel: SpellSlotLevel;
  readonly perSlotAboveBase: PositiveInteger;
};

/** Targeting shape retained by save-gate mechanics, without authored input. */
export type SaveGateConditionTargetingFacts =
  | {
      readonly kind: "targetList";
      readonly count: SaveGateTargetCountFacts;
    }
  | Exclude<SaveGatedConditionSpellTargeting, { readonly kind: "targetList" }>;

export type SaveGateConditionSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: SaveGateConditionTargetingFacts;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
  readonly effect: SpellFailedSaveConditionEffect;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
};

type SaveGatedConditionEffectExpirationFact =
  | "spellDuration"
  | "endOfCasterNextTurn";
type SaveGatedConditionEffectRepeatFact = "endOfTargetTurn" | null;
type SaveGatedConditionEffectFacts =
  | {
      readonly kind: "fixed";
      readonly condition: Condition;
      readonly escape: Extract<
        SpellFailedSaveConditionEffect,
        { readonly kind: "fixed" }
      >["escape"];
      readonly turnStartDamage: Extract<
        SpellFailedSaveConditionEffect,
        { readonly kind: "fixed" }
      >["turnStartDamage"];
      readonly expiration: SaveGatedConditionEffectExpirationFact;
      readonly repeatSave: SaveGatedConditionEffectRepeatFact;
    }
  | {
      readonly kind: "choice";
      readonly choices: Extract<
        SpellFailedSaveConditionEffect,
        { readonly kind: "choice" }
      >["choices"];
      readonly escape: Extract<
        SpellFailedSaveConditionEffect,
        { readonly kind: "choice" }
      >["escape"];
      readonly turnStartDamage: Extract<
        SpellFailedSaveConditionEffect,
        { readonly kind: "choice" }
      >["turnStartDamage"];
      readonly expiration: SaveGatedConditionEffectExpirationFact;
      readonly repeatSave: SaveGatedConditionEffectRepeatFact;
    };

export type SaveGatedConditionMechanicsFacts = {
  readonly ability: SaveGateConditionSpell["phase"]["ability"];
  readonly dc: SaveGateConditionSpell["phase"]["dc"];
  readonly targeting: SaveGateConditionSpell["targeting"];
  readonly targetCreatureTypes: SaveGateConditionSpell["targetCreatureTypes"];
  readonly effect: SaveGatedConditionEffectFacts;
  readonly saveRollModeRule: SaveGateConditionSpell["saveRollModeRule"];
};

/** Apply contextual spell-slot scaling to immutable targeting facts. */
export function saveGatedConditionTargetingFromFacts(
  facts: SaveGateConditionTargetingFacts,
  slotLevel: SpellSlotLevel,
): SaveGatedConditionSpellTargeting {
  if (facts.kind !== "targetList") {
    return facts;
  }
  return {
    kind: "targetList",
    minTargets: 1,
    maxTargets: saveGateTargetCountAtSlot(facts.count, slotLevel),
  };
}

function saveGateTargetCountAtSlot(
  facts: SaveGateTargetCountFacts,
  slotLevel: SpellSlotLevel,
): PositiveInteger {
  const slotDelta = NonNegativeInteger(
    Math.max(0, Number(slotLevel) - Number(facts.baseLevel)),
  );
  return PositiveInteger(
    Number(facts.base) + Number(slotDelta) * Number(facts.perSlotAboveBase),
  );
}

/** Derive the execution range projection from canonical definition facts. */
function saveGateRangeFeetFromRuleFacts(
  range: SpellDefinitionRuleFacts["range"],
): MovementFeet | null {
  if (isFixedDistancePointRange(range)) return movementFeet(range.feet);
  return range.kind === "self" ? movementFeet(0) : null;
}

/** Derive concentration ticks at contextual admission from canonical duration. */
function saveGateConcentrationDurationTicksFromRuleFacts(
  duration: SpellDefinitionRuleFacts["duration"],
): ElapsedTimeTicks | null {
  if (duration.kind !== "concentration") return null;
  const ticks = elapsedTimeTicksFromTimeSpanDuration(duration.upTo);
  return Result.isFailure(ticks) ? null : ticks.success;
}

function saveGatedConditionExpirationFromFacts(
  expiration: SaveGatedConditionEffectExpirationFact,
  duration: SpellDefinitionRuleFacts["duration"],
): SpellFailedSaveConditionEffect["expiresAt"] | null {
  return Match.value(expiration).pipe(
    Match.when("spellDuration", () => {
      const timeSpan =
        duration.kind === "timed"
          ? duration.value
          : duration.kind === "concentration"
            ? duration.upTo
            : null;
      if (timeSpan === null) return null;
      const ticks = elapsedTimeTicksFromTimeSpanDuration(timeSpan);
      return Result.isFailure(ticks)
        ? null
        : {
            kind:
              duration.kind === "timed"
                ? ("duration" as const)
                : ("concentration" as const),
            durationTicks: ticks.success,
          };
    }),
    Match.when("endOfCasterNextTurn", () => "endOfCasterNextTurn" as const),
    Match.exhaustive,
  );
}

function saveGatedConditionEffectFromFacts(
  effectFacts: SaveGatedConditionEffectFacts,
  duration: SpellDefinitionRuleFacts["duration"],
  ability: SaveGateConditionSpell["phase"]["ability"],
  dc: SaveGateConditionSpell["phase"]["dc"],
): SpellFailedSaveConditionEffect | null {
  const { expiration, repeatSave: repeatFact, ...effect } = effectFacts;
  const expiresAt = saveGatedConditionExpirationFromFacts(expiration, duration);
  if (expiresAt === null) return null;
  if (repeatFact === null) {
    return effect.kind === "fixed"
      ? {
          kind: "fixed",
          condition: effect.condition,
          expiresAt,
          escape: effect.escape,
          turnStartDamage: effect.turnStartDamage,
          repeatSave: null,
        }
      : {
          kind: "choice",
          choices: effect.choices,
          expiresAt,
          escape: effect.escape,
          turnStartDamage: effect.turnStartDamage,
          repeatSave: null,
        };
  }
  return effect.kind === "fixed"
    ? {
        kind: "fixed",
        condition: effect.condition,
        expiresAt,
        escape: null,
        turnStartDamage: null,
        repeatSave: { ability, dc },
      }
    : {
        kind: "choice",
        choices: effect.choices,
        expiresAt,
        escape: null,
        turnStartDamage: null,
        repeatSave: { ability, dc },
      };
}

export type SaveGatedConditionMechanicsProjection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SaveGatedConditionMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedConditionMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type SaveGatedConditionMechanicsIssue = Omit<
  SpellProcedureAdmissionIssue<"saveGatedCondition">,
  "failedFact"
> & {
  readonly failedFact: SaveGatedConditionFailedFact;
};

const SAVE_GATED_CONDITION_FAILED_FACTS = [
  {
    failedFact: "level",
    message: "Save-gated condition has an unsupported spell level.",
  },
  {
    failedFact: "castingTime",
    message: "Save-gated condition requires an action casting time.",
  },
  {
    failedFact: "range",
    message: "Save-gated condition has an unsupported spell range.",
  },
  {
    failedFact: "duration",
    message: "Save-gated condition has an unsupported duration value.",
  },
  {
    failedFact: "durationExtension",
    message: "Save-gated condition has an unsupported duration extension.",
  },
  {
    failedFact: "durationEnding",
    message: "Save-gated condition has an unsupported duration ending.",
  },
  {
    failedFact: "missingPhase",
    message: "Save-gated condition is missing its activation phase.",
  },
  {
    failedFact: "extraPhase",
    message: "Save-gated condition has an unsupported additional phase.",
  },
  {
    failedFact: "phaseAbility",
    message: "Save-gated condition has an unsupported saving-throw ability.",
  },
  {
    failedFact: "phaseDc",
    message: "Save-gated condition has an unsupported saving-throw DC.",
  },
  {
    failedFact: "phaseAttachment",
    message: "Save-gated condition has an unsupported target attachment.",
  },
  {
    failedFact: "successOutcome",
    message: "Save-gated condition has an unsupported successful-save outcome.",
  },
  {
    failedFact: "failedSaveEffect",
    message: "Save-gated condition has an unsupported failed-save effect.",
  },
  {
    failedFact: "missingRepeat",
    message: "Save-gated condition is missing its required repeat save.",
  },
  {
    failedFact: "extraRepeat",
    message: "Save-gated condition has an unsupported additional repeat save.",
  },
  {
    failedFact: "repeatSave",
    message: "Save-gated condition has an unsupported repeat save.",
  },
] as const satisfies readonly [
  { readonly failedFact: string; readonly message: string },
  ...{ readonly failedFact: string; readonly message: string }[],
];
type SaveGatedConditionFailedFact =
  (typeof SAVE_GATED_CONDITION_FAILED_FACTS)[number]["failedFact"];

export type SaveGatedConditionImmunityMechanicsFacts = {
  readonly ability: SaveGatedConditionImmunitySpellInvocation["ability"];
  readonly dc: SaveGatedConditionImmunitySpellInvocation["dc"];
  readonly targeting: SaveGatedConditionImmunitySpellInvocation["targeting"];
  readonly targetCreatureTypes: typeof AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES;
};

export type SaveGatedConditionImmunityMechanicsProjection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SaveGatedConditionImmunityMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedConditionImmunityMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type SaveGatedConditionImmunityMechanicsIssue = Omit<
  SpellProcedureAdmissionIssue<"saveGatedConditionImmunity">,
  "failedFact"
> & {
  readonly failedFact: SaveGatedConditionImmunityFailedFact;
};

const SAVE_GATED_CONDITION_IMMUNITY_FAILED_FACTS = [
  {
    failedFact: "level",
    message: "Save-gated condition immunity has an unsupported spell level.",
  },
  {
    failedFact: "castingTime",
    message: "Save-gated condition immunity requires an action casting time.",
  },
  {
    failedFact: "range",
    message: "Save-gated condition immunity has an unsupported spell range.",
  },
  {
    failedFact: "duration",
    message: "Save-gated condition immunity has an unsupported duration value.",
  },
  {
    failedFact: "durationExtension",
    message:
      "Save-gated condition immunity has an unsupported duration extension.",
  },
  {
    failedFact: "durationEnding",
    message:
      "Save-gated condition immunity has an unsupported duration ending.",
  },
  {
    failedFact: "missingPhase",
    message: "Save-gated condition immunity is missing its activation phase.",
  },
  {
    failedFact: "extraPhase",
    message:
      "Save-gated condition immunity has an unsupported additional phase.",
  },
  {
    failedFact: "phaseAbility",
    message:
      "Save-gated condition immunity has an unsupported saving-throw ability.",
  },
  {
    failedFact: "phaseDc",
    message:
      "Save-gated condition immunity has an unsupported saving-throw DC.",
  },
  {
    failedFact: "phaseAttachment",
    message:
      "Save-gated condition immunity has an unsupported target attachment.",
  },
  {
    failedFact: "successOutcome",
    message:
      "Save-gated condition immunity has an unsupported successful-save outcome.",
  },
  {
    failedFact: "conditionImmunityEffect",
    message:
      "Save-gated condition immunity is missing a required condition-immunity effect.",
  },
  {
    failedFact: "failedSaveEffect",
    message:
      "Save-gated condition immunity has an unsupported failed-save effect.",
  },
  {
    failedFact: "missingRepeat",
    message:
      "Save-gated condition immunity is missing its required repeat save.",
  },
  {
    failedFact: "extraRepeat",
    message:
      "Save-gated condition immunity has an unsupported additional repeat save.",
  },
  {
    failedFact: "repeatSave",
    message: "Save-gated condition immunity has an unsupported repeat save.",
  },
] as const satisfies readonly [
  { readonly failedFact: string; readonly message: string },
  ...{ readonly failedFact: string; readonly message: string }[],
];
type SaveGatedConditionImmunityFailedFact =
  (typeof SAVE_GATED_CONDITION_IMMUNITY_FAILED_FACTS)[number]["failedFact"];

type SaveGatedAttackRollAdvantageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedAttackRollAdvantage" }
>;

export type SaveGatedAttackRollAdvantageMechanicsFacts = {
  readonly ability: SaveGatedAttackRollAdvantageInvocation["ability"];
  readonly dc: SaveGatedAttackRollAdvantageInvocation["dc"];
  readonly targeting: SaveGateAttackRollAdvantageSpell["targeting"];
  readonly illumination: SaveGatedAttackRollAdvantageInvocation["illumination"];
};

export type SaveGatedAttackRollAdvantageMechanicsProjection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SaveGatedAttackRollAdvantageMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedAttackRollAdvantageMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type SaveGatedAttackRollAdvantageMechanicsIssue = Omit<
  SpellProcedureAdmissionIssue<"saveGatedAttackRollAdvantage">,
  "failedFact"
> & {
  readonly failedFact: SaveGatedAttackRollAdvantageFailedFact;
};

const SAVE_GATED_ATTACK_ROLL_ADVANTAGE_FAILED_FACTS = [
  {
    failedFact: "level",
    message: "Save-gated attack-roll advantage has an unsupported spell level.",
  },
  {
    failedFact: "castingTime",
    message:
      "Save-gated attack-roll advantage requires an action casting time.",
  },
  {
    failedFact: "range",
    message: "Save-gated attack-roll advantage has an unsupported spell range.",
  },
  {
    failedFact: "duration",
    message:
      "Save-gated attack-roll advantage has an unsupported duration value.",
  },
  {
    failedFact: "durationExtension",
    message:
      "Save-gated attack-roll advantage has an unsupported duration extension.",
  },
  {
    failedFact: "durationEnding",
    message:
      "Save-gated attack-roll advantage has an unsupported duration ending.",
  },
  {
    failedFact: "missingPhase",
    message:
      "Save-gated attack-roll advantage is missing its activation phase.",
  },
  {
    failedFact: "extraPhase",
    message:
      "Save-gated attack-roll advantage has an unsupported additional phase.",
  },
  {
    failedFact: "phaseAbility",
    message:
      "Save-gated attack-roll advantage has an unsupported saving-throw ability.",
  },
  {
    failedFact: "phaseDc",
    message:
      "Save-gated attack-roll advantage has an unsupported saving-throw DC.",
  },
  {
    failedFact: "phaseAttachment",
    message:
      "Save-gated attack-roll advantage has an unsupported target attachment.",
  },
  {
    failedFact: "successOutcome",
    message:
      "Save-gated attack-roll advantage has an unsupported successful-save outcome.",
  },
  {
    failedFact: "attackRollAdvantageEffect",
    message:
      "Save-gated attack-roll advantage is missing its attack-roll advantage effect.",
  },
  {
    failedFact: "invisibleSuppressionEffect",
    message:
      "Save-gated attack-roll advantage is missing its Invisible-condition suppression effect.",
  },
  {
    failedFact: "illuminationEffect",
    message:
      "Save-gated attack-roll advantage is missing its illumination effect.",
  },
  {
    failedFact: "failedSaveEffect",
    message:
      "Save-gated attack-roll advantage has an unsupported failed-save effect.",
  },
  {
    failedFact: "missingRepeat",
    message:
      "Save-gated attack-roll advantage is missing its required repeat save.",
  },
  {
    failedFact: "extraRepeat",
    message:
      "Save-gated attack-roll advantage has an unsupported additional repeat save.",
  },
  {
    failedFact: "repeatSave",
    message: "Save-gated attack-roll advantage has an unsupported repeat save.",
  },
] as const satisfies readonly [
  { readonly failedFact: string; readonly message: string },
  ...{ readonly failedFact: string; readonly message: string }[],
];
type SaveGatedAttackRollAdvantageFailedFact =
  (typeof SAVE_GATED_ATTACK_ROLL_ADVANTAGE_FAILED_FACTS)[number]["failedFact"];

type AbilityD20TestRollModeSaveGateInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "abilityD20TestRollModeSaveGate" }
>;

export type AbilityD20TestRollModeSaveGateMechanicsFacts = {
  readonly ability: AbilityD20TestRollModeSaveGateInvocation["ability"];
  readonly dc: AbilityD20TestRollModeSaveGateInvocation["dc"];
  readonly targeting: AbilityD20TestRollModeSaveGateInvocation["targeting"];
};

export type AbilityD20TestRollModeSaveGateMechanicsProjection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<AbilityD20TestRollModeSaveGateMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: AbilityD20TestRollModeSaveGateMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type AbilityD20TestRollModeSaveGateMechanicsIssue = Omit<
  SpellProcedureAdmissionIssue<"abilityD20TestRollModeSaveGate">,
  "failedFact"
> & {
  readonly failedFact: AbilityD20TestRollModeSaveGateFailedFact;
};

const ABILITY_D20_TEST_ROLL_MODE_SAVE_GATE_FAILED_FACTS = [
  {
    failedFact: "level",
    message:
      "Ability D20 test roll mode save gate has an unsupported spell level.",
  },
  {
    failedFact: "castingTime",
    message:
      "Ability D20 test roll mode save gate requires an action casting time.",
  },
  {
    failedFact: "range",
    message:
      "Ability D20 test roll mode save gate has an unsupported spell range.",
  },
  {
    failedFact: "duration",
    message:
      "Ability D20 test roll mode save gate has an unsupported duration value.",
  },
  {
    failedFact: "durationExtension",
    message:
      "Ability D20 test roll mode save gate has an unsupported duration extension.",
  },
  {
    failedFact: "durationEnding",
    message:
      "Ability D20 test roll mode save gate has an unsupported duration ending.",
  },
  {
    failedFact: "missingPhase",
    message:
      "Ability D20 test roll mode save gate is missing its activation phase.",
  },
  {
    failedFact: "extraPhase",
    message:
      "Ability D20 test roll mode save gate has an unsupported additional phase.",
  },
  {
    failedFact: "phaseAbility",
    message:
      "Ability D20 test roll mode save gate has an unsupported saving-throw ability.",
  },
  {
    failedFact: "phaseDc",
    message:
      "Ability D20 test roll mode save gate has an unsupported saving-throw DC.",
  },
  {
    failedFact: "phaseAttachment",
    message:
      "Ability D20 test roll mode save gate has an unsupported target attachment.",
  },
  {
    failedFact: "successOutcome",
    message:
      "Ability D20 test roll mode save gate has an unsupported successful-save outcome.",
  },
  {
    failedFact: "d20DisadvantageEffect",
    message:
      "Ability D20 test roll mode save gate is missing its Strength D20 Disadvantage effect.",
  },
  {
    failedFact: "damagePenaltyEffect",
    message:
      "Ability D20 test roll mode save gate is missing its damage-roll penalty effect.",
  },
  {
    failedFact: "failedSaveEffect",
    message:
      "Ability D20 test roll mode save gate has an unsupported failed-save effect.",
  },
  {
    failedFact: "missingRepeat",
    message:
      "Ability D20 test roll mode save gate is missing its required repeat save.",
  },
  {
    failedFact: "extraRepeat",
    message:
      "Ability D20 test roll mode save gate has an unsupported additional repeat save.",
  },
  {
    failedFact: "repeatSave",
    message:
      "Ability D20 test roll mode save gate has an unsupported repeat save.",
  },
] as const satisfies readonly [
  { readonly failedFact: string; readonly message: string },
  ...{ readonly failedFact: string; readonly message: string }[],
];
type AbilityD20TestRollModeSaveGateFailedFact =
  (typeof ABILITY_D20_TEST_ROLL_MODE_SAVE_GATE_FAILED_FACTS)[number]["failedFact"];

export type SaveGateAttackRollAdvantageSpell = {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginCube" }
  >;
  readonly effect: SpellFailedSaveAttackRollEffect;
  readonly illumination: DimIlluminationEmissionFacts;
};

type SaveGateFailedEffect = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>["onFail"];
type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type ModifyRollAdvantageEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "modify_roll_advantage" }
>;
type AbilityChoiceHoleFilter = {
  readonly kind: "hole";
  readonly value: {
    readonly kind: "choice";
    readonly options: readonly [Ability, ...Ability[]];
  };
};
type ChosenAbilitySaveDisadvantageEffect = ModifyRollAdvantageEffect & {
  readonly saveAbilityFilter: AbilityChoiceHoleFilter;
};
type TimedBattleSpell = SpellMechanicsSource & {
  readonly mechanics: SpellMechanicsSource["mechanics"] & {
    readonly duration: Extract<
      BattleSpellAdmissionSource["mechanics"]["duration"],
      { readonly kind: "timed" }
    >;
  };
};
type SupportedDamageComponent = {
  readonly expr: NonNullable<ReturnType<typeof supportedDamageAmountExpr>>;
  readonly damageType: DamageType;
};
type SaveGatedDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;
type SaveGatedConditionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
>;
type SaveGateFailedSaveEffects = NonNullable<
  ReturnType<typeof supportedSaveGateFailedSaveEffects>
>;
type SaveGateDamageEffect = Extract<
  SaveGateFailureEffect,
  { readonly kind: "damage" }
>;
type SaveGatedDamageEffect = SaveGateDamageEffect & {
  readonly damageType: DamageType;
};
type SaveGatedDamageFailedSaveEffects = Omit<
  SaveGateFailedSaveEffects,
  "damage" | "additionalDamageComponents"
> & {
  readonly damage: SaveGatedDamageEffect;
  readonly additionalDamageComponents: readonly SaveGatedDamageEffect[];
};

/**
 * Static save-gate facts retained after the authored mechanics graph is
 * admitted. Damage amounts remain typed Surface facts because their final
 * dice expression depends on the dynamic slot or character level.
 */
export type SaveGatedDamageMechanicsFacts = {
  readonly ability: SaveGatedDamageInvocation["ability"];
  readonly dc: SaveGatedDamageInvocation["dc"];
  readonly targeting: SaveGatedDamageInvocation["targeting"];
  readonly rangeFeet: SaveGatedDamageInvocation["rangeFeet"];
  readonly saveRollModeRule: SaveGatedDamageInvocation["saveRollModeRule"];
  readonly successDamage: SaveGatedDamageInvocation["successDamage"];
  readonly failedSaveEffects: SaveGatedDamageFailedSaveEffects;
  readonly postSaveAreaEffect: SpellPostSaveAreaEffect | null;
};

type SaveGatedDamageMechanicsIssue = Omit<
  SpellProcedureAdmissionIssue<"saveGatedDamage">,
  "failedFact"
> & {
  readonly failedFact: SaveGateFailedFact;
};
const SAVE_GATE_FAILED_FACTS = [
  {
    failedFact: "castingTime",
    message: "Save-gated damage requires an action casting time.",
  },
  {
    failedFact: "phaseAttachment",
    message: "Save-gated damage has an unsupported target attachment.",
  },
  {
    failedFact: "range",
    message:
      "Save-gated damage has an unsupported spell range for its target shape.",
  },
  {
    failedFact: "extraPhase",
    message:
      "Save-gated damage has an unsupported additional activation phase.",
  },
  {
    failedFact: "missingPhase",
    message: "Save-gated damage is missing a required activation phase.",
  },
  {
    failedFact: "successOutcome",
    message:
      "Save-gated damage has an unsupported saving-throw success outcome.",
  },
  {
    failedFact: "failedSaveEffect",
    message: "Save-gated damage has an unsupported failed-save effect.",
  },
  {
    failedFact: "damageType",
    message: "Save-gated damage has an unsupported damage type.",
  },
  {
    failedFact: "requiredFacts",
    message: "Save-gated damage could not retain its required narrowed facts.",
  },
] as const satisfies readonly [
  { readonly failedFact: string; readonly message: string },
  ...{ readonly failedFact: string; readonly message: string }[],
];
type SaveGateFailedFact = (typeof SAVE_GATE_FAILED_FACTS)[number]["failedFact"];
type StaticFactsWithoutCommonKeys<StaticFacts extends object> = {
  readonly [K in Extract<
    keyof StaticFacts,
    keyof SpellDefinitionRuleFacts
  >]: never;
};
type SaveGateStaticFacts<StaticFacts extends object> = StaticFacts &
  StaticFactsWithoutCommonKeys<StaticFacts>;
type SaveGatedDamageMechanicsProjection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SaveGatedDamageMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedDamageMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

/** Build the common static owner result without widening the execution view. */
export function saveGateMechanicsInspection<
  P extends BattleSpellProcedureKey,
  I extends SupportedSpellInvocation,
  StaticFacts extends object,
>(input: {
  readonly source: SpellMechanicsAdmissionSource;
  readonly procedure: P;
  readonly projection:
    | { readonly tag: "notRepresented" }
    | {
        readonly tag: "unsupported";
        readonly issues: ReadonlyNonEmptyArray<SpellProcedureAdmissionIssue<P>>;
      }
    | {
        readonly tag: "supported";
        readonly facts: SaveGateStaticFacts<StaticFacts>;
        readonly evidence: SpellProcedureMechanicsEvidence;
      };
  readonly admit: (
    facts: SpellDefinitionRuleFacts & SaveGateStaticFacts<StaticFacts>,
    source: BattleSpellExecutionSource,
    ctx: SpellAdmissionContext,
  ) => readonly I[];
}): SpellProcedureMechanicsInspection<
  P,
  SpellDefinitionRuleFacts & SaveGateStaticFacts<StaticFacts>,
  I
> {
  const { source, procedure, projection, admit } = input;
  return Match.value(projection).pipe(
    Match.discriminatorsExhaustive("tag")({
      notRepresented: () => ({
        tag: "notRepresented" as const,
      }),
      unsupported: ({ issues }) => ({
        tag: "unsupported" as const,
        issues,
      }),
      supported: ({ facts, evidence }) => {
        const admittedFacts = {
          ...source.spellDefinitionRuleFacts,
          ...facts,
        };
        return {
          tag: "supported" as const,
          admitted: saveGateReadyMechanics({
            procedure,
            facts: admittedFacts,
            evidence,
            admit,
          }),
        };
      },
    }),
  );
}

/** Bind only copied static facts into the contextual closure. */
function saveGateReadyMechanics<
  P extends BattleSpellProcedureKey,
  Facts extends SpellDefinitionRuleFacts,
  I extends SupportedSpellInvocation,
>(input: {
  readonly procedure: P;
  readonly facts: Facts;
  readonly evidence: SpellProcedureMechanicsEvidence;
  readonly admit: (
    facts: Facts,
    source: BattleSpellExecutionSource,
    ctx: SpellAdmissionContext,
  ) => readonly I[];
}): {
  readonly binding: "ready";
  readonly procedure: P;
  readonly facts: Facts;
  readonly evidence: SpellProcedureMechanicsEvidence;
  readonly admit: (
    source: BattleSpellExecutionSource,
    ctx: SpellAdmissionContext,
  ) => readonly I[];
} {
  const { procedure, facts, evidence, admit } = input;
  return {
    binding: "ready",
    procedure,
    facts,
    evidence,
    admit: (source, ctx) => admit(facts, source, ctx),
  };
}
type WeaponDamageReductionRepeatSavePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "con";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "target";
      readonly selection: TargetSelection;
    };
  };
};

const LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL = 3;
const LARGE_FIRE_SPHERE_RANGE_FEET = 150;
const LARGE_FIRE_SPHERE_RADIUS_FEET = 20;
const LARGE_FIRE_SPHERE_BASE_DAMAGE_DICE = 8;
const LARGE_FIRE_SPHERE_DAMAGE_DIE_SIZE = 6;
const LARGE_FIRE_SPHERE_SLOT_DAMAGE_DICE_INCREMENT = 1;
const LEVEL5_SELF_CONE_SAVE_GATE_LENGTH_FEET = 60;
const SIMPLE_LINE_DAMAGE_PROFILE_LENGTH_FEET = 100;
const SIMPLE_LINE_DAMAGE_PROFILE_WIDTH_FEET = 5;
const SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL = 2;
const SMALL_THUNDER_SPHERE_RANGE_FEET = 60;
const SMALL_THUNDER_SPHERE_RADIUS_FEET = 10;
const SMALL_THUNDER_SPHERE_BASE_DAMAGE_DICE = 3;
const SMALL_THUNDER_SPHERE_DAMAGE_DIE_SIZE = 8;
const SMALL_THUNDER_SPHERE_SLOT_DAMAGE_DICE_INCREMENT = 1;
const SENSORY_CONDITION_CHOICE_BASE_SPELL_LEVEL = 2;
const SENSORY_CONDITION_CHOICE_RANGE_FEET = 120;
const SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS = [
  "blinded",
  "deafened",
] as const satisfies readonly [Condition, ...Condition[]];
const SAVE_GATED_CONDITION_ROOT_CONDITIONS = [
  "blinded",
  "charmed",
  "paralyzed",
  "restrained",
] as const satisfies readonly [Condition, ...Condition[]];
const HUMANOID_PARALYSIS_BASE_SPELL_LEVEL = 2;
const HUMANOID_PARALYSIS_RANGE_FEET = 60;
const PARALYSIS_FAILED_SAVE_CONDITION =
  "paralyzed" as const satisfies Condition;
const HUMANOID_PARALYSIS_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const CREATURE_PARALYSIS_BASE_SPELL_LEVEL = 5;
const CREATURE_PARALYSIS_RANGE_FEET = 90;
const AREA_RESTRAINT_RANGE_FEET = 90;
const AREA_CONDITION_IMMUNITY_BASE_SPELL_LEVEL = 2;
const AREA_CONDITION_IMMUNITY_RANGE_FEET = 60;
const AREA_CONDITION_IMMUNITY_RADIUS_FEET = 20;
const AREA_CONDITION_IMMUNITIES = [
  "charmed",
  "frightened",
] as const satisfies readonly [Condition, Condition];
type AreaConditionImmunity = (typeof AREA_CONDITION_IMMUNITIES)[number];
const AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES = [
  "humanoid",
] as const satisfies readonly [CreatureType, ...CreatureType[]];
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_BASE_SPELL_LEVEL = 2;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET = 60;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_AMOUNT = 1;
const WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_UNIT = "minute";

function spellHasActionCastingTime(spell: SpellMechanicsSource): boolean {
  return topLevelSpellCastingTime(spell.mechanics)?.kind === "action";
}

function allAdmissionFactsHold(...facts: readonly boolean[]): boolean {
  return facts.every(Boolean);
}

function saveGatePhaseCountFailures(
  actualCount: number,
  expectedCount: number,
): readonly {
  readonly failedFact: "missingPhase" | "extraPhase";
  readonly mechanicsPath: SpellMechanicsBranchPath;
}[] {
  if (actualCount > expectedCount) {
    return Array.from({ length: actualCount - expectedCount }, (_, index) => ({
      failedFact: "extraPhase" as const,
      mechanicsPath: spellActivationPhasePath(
        PositiveInteger(expectedCount + index + 1),
      ),
    }));
  }
  return actualCount < expectedCount
    ? [
        {
          failedFact: "missingPhase",
          mechanicsPath: spellActivationPhasePath(
            PositiveInteger(actualCount + 1),
          ),
        },
      ]
    : [];
}

function saveGateRepeatFailuresForCount(
  phase: SaveGatePhase,
  expectedCount: 0 | 1,
): readonly {
  readonly failedFact: "missingRepeat" | "extraRepeat";
  readonly mechanicsPath: SpellMechanicsBranchPath;
}[] {
  const repeats = phase.repeatSaves ?? [];
  if (repeats.length < expectedCount) {
    return [
      {
        failedFact: "missingRepeat",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(repeats.length + 1),
        ),
      },
    ];
  }
  const firstExtraOrdinal = expectedCount + 1;
  return repeats.length > expectedCount
    ? repeats.slice(expectedCount).map((_, index) => ({
        failedFact: "extraRepeat" as const,
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(firstExtraOrdinal + index),
        ),
      }))
    : [];
}

type SaveGateDurationChildFailure = {
  readonly failedFact: "durationExtension" | "durationEnding";
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function saveGateDurationChildFailure(
  child: SpellDurationChild,
): SaveGateDurationChildFailure {
  return {
    failedFact:
      child.branch === "extension" ? "durationExtension" : "durationEnding",
    mechanicsPath: spellDurationChildPath(child),
  };
}

function saveGateDurationChildFailures(
  children: readonly SpellDurationChild[],
  supportedEndingOrdinals: readonly PositiveInteger[] = [],
): readonly SaveGateDurationChildFailure[] {
  return children
    .filter(
      (child) =>
        child.branch === "extension" ||
        !supportedEndingOrdinals.some((ordinal) => ordinal === child.ordinal),
    )
    .map(saveGateDurationChildFailure);
}

function saveGateSupportedDurationPaths(
  duration: SaveGateDuration,
  supportedEndingOrdinals: readonly PositiveInteger[] = [],
): readonly SpellMechanicsBranchPath[] {
  return [
    ...spellDurationValueEvidencePaths(duration),
    ...spellDurationChildCoordinates(duration).flatMap((child) =>
      child.branch === "ending" &&
      supportedEndingOrdinals.some((ordinal) => ordinal === child.ordinal)
        ? [spellDurationChildPath(child)]
        : [],
    ),
  ];
}

function pointOriginCubeSaveGatePhase(
  phase: ActivationPhase | undefined,
): { readonly phase: SaveGatePhase; readonly sideFeet: number } | null {
  if (phase?.kind !== "save_gate") return null;
  if (phase.attachment.kind !== "hole") return null;
  if (phase.attachment.value.kind !== "area") return null;
  if (phase.attachment.value.origin.kind !== "point_within_range") return null;
  if (phase.attachment.value.shape.kind !== "cube") return null;
  return { phase, sideFeet: phase.attachment.value.shape.sideFeet };
}

function selfOriginConeSaveGatePhase(
  phase: ActivationPhase | undefined,
): { readonly phase: SaveGatePhase; readonly lengthFeet: number } | null {
  if (phase?.kind !== "save_gate") return null;
  if (phase.attachment.kind !== "area") return null;
  if (phase.attachment.origin.kind !== "self") return null;
  if (phase.attachment.shape.kind !== "cone") return null;
  return { phase, lengthFeet: phase.attachment.shape.lengthFeet };
}

function hasPointRangeFeet(
  spell: SpellMechanicsSource,
  rangeFeet: number,
): boolean {
  const range = spell.mechanics.range;
  return range.kind === "point" && range.feet === rangeFeet;
}

function hasOneMinuteConcentrationDuration(
  spell: SpellMechanicsSource,
): boolean {
  const duration = spell.mechanics.duration;
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1
  );
}

function hasOneRoundTimedDuration(spell: SpellMechanicsSource): boolean {
  const duration = spell.mechanics.duration;
  return (
    duration.kind === "timed" &&
    duration.value.unit === "round" &&
    duration.value.amount === 1
  );
}

function isFailedSaveCondition(
  effect: SaveGateFailedEffect,
  condition: Condition,
): boolean {
  return effect.kind === "apply_condition" && effect.condition === condition;
}

export function hasSaveGateRepeatSaves(
  phase: ActivationPhase | undefined,
): boolean {
  return phase?.kind === "save_gate" && phase.repeatSaves !== undefined;
}

export function supportedCantripSaveGateDamageProfile(
  spell: BattleSpellAdmissionSource,
  characterLevel: number,
): readonly SupportedSpellInvocation[] {
  return supportedSaveGateDamageProfile({
    spell,
    access: cantripSpellAccessFor(spell.castingSource),
    resource: { tag: "none" },
    characterLevel,
  });
}

export function supportedPreparedSaveGateDamageProfile(
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return supportedSaveGateDamageProfile({
      spell,
      access: { tag: "prepared" },
      resource: spellInvocationResourceForCastOption(slot),
      slotLevel: slot.spellLevel,
    });
  });
}

export function supportedPreparedSaveGateConditionProfile(
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const conditionSpell = supportedSaveGateConditionSpell(spell);
  const rangeFeet = saveGateRangeFeetFromRuleFacts(
    spell.spellDefinitionRuleFacts.range,
  );
  if (conditionSpell === null || rangeFeet === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedCondition",
        spell,
        ability: conditionSpell.phase.ability,
        dc: conditionSpell.phase.dc,
        targeting: saveGatedConditionTargetingFromFacts(
          conditionSpell.targeting,
          slot.spellLevel,
        ),
        targetCreatureTypes: conditionSpell.targetCreatureTypes,
        effect: conditionSpell.effect,
        saveRollModeRule: conditionSpell.saveRollModeRule,
        rangeFeet,
      },
    ];
  });
}

/** Parse generic save-gated condition mechanics without retaining the phase. */
export function saveGatedConditionMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedConditionMechanicsProjection {
  if (spell.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  if (
    isSaveGatedDamageRootShape(phase) ||
    isSaveGatedConditionSiblingShape(phase) ||
    !isSaveGatedConditionRootShape(phase)
  ) {
    return { tag: "notRepresented" };
  }
  const activationSpell: ActivationSpellMechanicsSource = {
    mechanics: spell.mechanics,
  };
  const parsed = saveGatedConditionMechanicsFailures(activationSpell, phase);
  if (parsed.tag === "unsupported") {
    const [firstIssue, ...remainingIssues] = parsed.failures;
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionMechanicsIssue(
          firstIssue.failedFact,
          firstIssue.mechanicsPath,
        ),
        ...remainingIssues.map(({ failedFact, mechanicsPath }) =>
          saveGatedConditionMechanicsIssue(failedFact, mechanicsPath),
        ),
      ],
    };
  }
  return {
    tag: "supported",
    facts: parsed.facts,
    evidence: saveGatedConditionMechanicsEvidence(
      activationSpell,
      phase,
      parsed.variant,
    ),
  };
}

/** Build prepared invocations from one correlated static condition projection. */
export function saveGatedConditionInvocationsFromFacts(input: {
  readonly spell: SaveGatedConditionInvocation["spell"];
  readonly facts: SpellDefinitionRuleFacts & SaveGatedConditionMechanicsFacts;
  readonly access: SaveGatedConditionInvocation["access"];
  readonly resource: SaveGatedConditionInvocation["resource"];
  readonly slotLevel: SpellSlotLevel;
}): readonly SaveGatedConditionInvocation[] {
  const { level } = input.facts;
  if (Number(input.slotLevel) < level) {
    return [];
  }
  const rangeFeet = saveGateRangeFeetFromRuleFacts(input.facts.range);
  if (rangeFeet === null) {
    return [];
  }
  const effect = saveGatedConditionEffectFromFacts(
    input.facts.effect,
    input.facts.duration,
    input.facts.ability,
    input.facts.dc,
  );
  if (effect === null) {
    return [];
  }
  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "saveGatedCondition",
      spell: input.spell,
      ability: input.facts.ability,
      dc: input.facts.dc,
      targeting: saveGatedConditionTargetingFromFacts(
        input.facts.targeting,
        input.slotLevel,
      ),
      targetCreatureTypes: input.facts.targetCreatureTypes,
      effect,
      saveRollModeRule: input.facts.saveRollModeRule,
      rangeFeet,
    },
  ];
}

function isSaveGatedConditionRootShape(
  phase: SaveGatePhase,
): phase is SaveGatedConditionRootPhase {
  const effects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [phase.onFail];
  return effects.some(
    (effect) =>
      effect.kind === "apply_condition" &&
      (isSaveGatedConditionRoot(effect.condition) ||
        isSensoryConditionChoiceRoot(effect.condition)),
  );
}

function isSaveGatedConditionRoot(condition: unknown): condition is Condition {
  return (
    typeof condition === "string" &&
    SAVE_GATED_CONDITION_ROOT_CONDITIONS.some(
      (candidate) => candidate === condition,
    )
  );
}

function isSensoryConditionChoiceRoot(condition: unknown): boolean {
  if (
    typeof condition !== "object" ||
    condition === null ||
    Array.isArray(condition) ||
    !("kind" in condition) ||
    condition.kind !== "choose" ||
    !("from" in condition) ||
    !Array.isArray(condition.from) ||
    !condition.from.every(
      (value): value is Condition => typeof value === "string",
    )
  ) {
    return false;
  }
  return sameStringSet(
    condition.from,
    SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
  );
}

function isSaveGatedConditionSiblingShape(phase: SaveGatePhase): boolean {
  const effects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [phase.onFail];
  const appliedConditions = effects.filter(
    (effect) => effect.kind === "apply_condition",
  );
  return (
    effects.some(
      (effect) =>
        effect.kind === "suppress_condition_self_end" ||
        effect.kind === "set_speed" ||
        effect.kind === "target_effect_escape_action",
    ) ||
    appliedConditions.length > 1 ||
    (phase.repeatSaves?.length ?? 0) > 1
  );
}

type SaveGatedConditionVariant =
  | "charm"
  | "paralysis"
  | "sensory"
  | "blinded"
  | "restrained";

type SaveGatedConditionFailure = {
  readonly failedFact: SaveGatedConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type SaveGatedConditionRootPhase = SaveGatePhase & {
  readonly onFail: Extract<
    SaveGateFailedEffect,
    { readonly kind: "apply_condition" | "composite" }
  >;
};

type SaveGateNarrowedParse<Value, Failure> =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<Failure>;
    }
  | {
      readonly tag: "supported";
      readonly value: Value;
    };

function saveGateFailureSequence<T>(
  before: readonly T[],
  middle: ReadonlyNonEmptyArray<T>,
  after: readonly T[],
): ReadonlyNonEmptyArray<T> {
  const [middleFirst, ...middleRest] = middle;
  const beforeNonEmpty = spellProcedureNonEmpty(before);
  if (beforeNonEmpty === undefined) {
    return [middleFirst, ...middleRest, ...after];
  }
  const [beforeFirst, ...beforeRest] = beforeNonEmpty;
  return [beforeFirst, ...beforeRest, middleFirst, ...middleRest, ...after];
}

function saveGateAppendFailures<T>(
  before: ReadonlyNonEmptyArray<T>,
  after: readonly T[],
): ReadonlyNonEmptyArray<T> {
  const [first, ...rest] = before;
  return [first, ...rest, ...after];
}

function saveGateNarrowedParseWithFailures<Value, Failure>(
  before: readonly Failure[],
  parsed: SaveGateNarrowedParse<Value, Failure>,
  after: readonly Failure[],
): SaveGateNarrowedParse<Value, Failure> {
  if (parsed.tag === "unsupported") {
    return {
      tag: "unsupported",
      failures: saveGateFailureSequence(before, parsed.failures, after),
    };
  }
  const failures = spellProcedureNonEmpty([...before, ...after]);
  return failures === undefined ? parsed : { tag: "unsupported", failures };
}

function saveGateCombineNarrowedParses<First, Second, Value, Failure>(
  before: readonly Failure[],
  first: SaveGateNarrowedParse<First, Failure>,
  between: readonly Failure[],
  second: SaveGateNarrowedParse<Second, Failure>,
  after: readonly Failure[],
  combine: (first: First, second: Second) => Value,
): SaveGateNarrowedParse<Value, Failure> {
  if (first.tag === "unsupported") {
    const firstFailures = saveGateFailureSequence(
      before,
      first.failures,
      between,
    );
    return second.tag === "unsupported"
      ? {
          tag: "unsupported",
          failures: saveGateFailureSequence(
            firstFailures,
            second.failures,
            after,
          ),
        }
      : {
          tag: "unsupported",
          failures: saveGateAppendFailures(firstFailures, after),
        };
  }
  if (second.tag === "unsupported") {
    return {
      tag: "unsupported",
      failures: saveGateFailureSequence(
        [...before, ...between],
        second.failures,
        after,
      ),
    };
  }
  const failures = spellProcedureNonEmpty([...before, ...between, ...after]);
  return failures === undefined
    ? { tag: "supported", value: combine(first.value, second.value) }
    : { tag: "unsupported", failures };
}

type SaveGatedConditionAttachmentFacts = Pick<
  SaveGatedConditionMechanicsFacts,
  "targeting" | "targetCreatureTypes"
>;

type SaveGatedConditionAttachmentParse = SaveGateNarrowedParse<
  SaveGatedConditionAttachmentFacts,
  SaveGatedConditionFailure
>;

type SaveGatedConditionMechanicsParse =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<SaveGatedConditionFailure>;
    }
  | {
      readonly tag: "supported";
      readonly variant: SaveGatedConditionVariant;
      readonly facts: SaveGatedConditionMechanicsFacts;
    };

function saveGatedConditionMechanicsFailures(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatedConditionRootPhase,
): SaveGatedConditionMechanicsParse {
  const variant = saveGatedConditionVariant(spell, phase);
  const expected = saveGatedConditionVariantFacts(variant, phase);
  const attachment = saveGatedConditionAttachmentParse(
    phase,
    expected,
    spell.mechanics.level,
  );
  const failuresBeforeAttachment: SaveGatedConditionFailure[] = [];
  if (spell.mechanics.level !== expected.level) {
    failuresBeforeAttachment.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  }
  if (!spellHasActionCastingTime(spell)) {
    failuresBeforeAttachment.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  }
  if (!saveGatedConditionRangeMatches(spell, variant, expected.rangeFeet)) {
    failuresBeforeAttachment.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (!saveGatedConditionDurationMatches(spell, expected)) {
    failuresBeforeAttachment.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failuresBeforeAttachment.push(
    ...saveGatedConditionDurationFailures(spell, variant),
  );
  failuresBeforeAttachment.push(
    ...saveGatePhaseCountFailures(spell.mechanics.phases.length, 1),
  );
  if (phase.ability !== expected.ability) {
    failuresBeforeAttachment.push({
      failedFact: "phaseAbility",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  if (phase.dc.kind !== "caster_spell_save_dc") {
    failuresBeforeAttachment.push({
      failedFact: "phaseDc",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  const failuresAfterAttachment: SaveGatedConditionFailure[] = [];
  if (phase.onSuccess.kind !== "none") {
    failuresAfterAttachment.push({
      failedFact: "successOutcome",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  failuresAfterAttachment.push(
    ...saveGatedConditionFailureEffectFailures(phase, variant),
  );
  failuresAfterAttachment.push(
    ...saveGatedConditionRepeatFailures(phase, variant),
  );
  const parsed = saveGateNarrowedParseWithFailures(
    failuresBeforeAttachment,
    attachment,
    failuresAfterAttachment,
  );
  return parsed.tag === "unsupported"
    ? parsed
    : {
        tag: "supported",
        variant,
        facts: saveGatedConditionFactsFromParsed(phase, variant, parsed.value),
      };
}

function saveGatedConditionFactsFromParsed(
  phase: SaveGatePhase,
  variant: SaveGatedConditionVariant,
  attachment: SaveGatedConditionAttachmentFacts,
): SaveGatedConditionMechanicsFacts {
  return {
    ability: phase.ability,
    dc: phase.dc,
    ...attachment,
    effect: saveGatedConditionEffectFacts(variant),
    saveRollModeRule:
      variant === "charm"
        ? attachment.targetCreatureTypes?.[0] === "beast"
          ? null
          : { kind: "hostileTarget", mode: "advantage" }
        : null,
  };
}

function saveGatedConditionEffectFacts(
  variant: SaveGatedConditionVariant,
): SaveGatedConditionEffectFacts {
  return Match.value(variant).pipe(
    Match.when(
      "sensory",
      (): SaveGatedConditionEffectFacts => ({
        kind: "choice" as const,
        choices: SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
        expiration: "spellDuration" as const,
        escape: null,
        turnStartDamage: null,
        repeatSave: "endOfTargetTurn" as const,
      }),
    ),
    Match.when(
      "blinded",
      (): SaveGatedConditionEffectFacts => ({
        kind: "fixed" as const,
        condition: HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
        expiration: "endOfCasterNextTurn" as const,
        escape: null,
        turnStartDamage: null,
        repeatSave: null,
      }),
    ),
    Match.when(
      "restrained",
      (): SaveGatedConditionEffectFacts => ({
        kind: "fixed" as const,
        condition: AREA_RESTRAINT_FAILED_SAVE_CONDITION,
        expiration: "spellDuration" as const,
        escape: {
          kind: "abilityCheck" as const,
          ability: "str" as const,
          skill: "athletics" as const,
          allowedActor: "target" as const,
          successEnds: "condition" as const,
        },
        turnStartDamage: null,
        repeatSave: null,
      }),
    ),
    Match.when(
      "paralysis",
      (): SaveGatedConditionEffectFacts => ({
        kind: "fixed" as const,
        condition: "paralyzed" as const,
        expiration: "spellDuration" as const,
        escape: null,
        turnStartDamage: null,
        repeatSave: "endOfTargetTurn" as const,
      }),
    ),
    Match.when(
      "charm",
      (): SaveGatedConditionEffectFacts => ({
        kind: "fixed" as const,
        condition: "charmed" as const,
        expiration: "spellDuration" as const,
        escape: { kind: "targetDamagedByCasterOrAlly" as const },
        turnStartDamage: null,
        repeatSave: null,
      }),
    ),
    Match.exhaustive,
  );
}

function saveGatedConditionAttachmentParse(
  phase: SaveGatePhase,
  expected: SaveGatedConditionVariantFacts,
  spellLevel: number,
): SaveGatedConditionAttachmentParse {
  const invalidAttachment = (): SaveGatedConditionAttachmentParse => ({
    tag: "unsupported",
    failures: [
      {
        failedFact: "phaseAttachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ],
  });
  const attachment = phase.attachment;
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (expected.target.kind === "selfCone") {
    return value.kind === "area" &&
      value.origin.kind === "self" &&
      value.shape.kind === "cone" &&
      value.shape.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET
      ? {
          tag: "supported",
          value: {
            targeting: {
              kind: "selfOriginCone",
              lengthFeet: movementFeet(value.shape.lengthFeet),
            },
            targetCreatureTypes: null,
          },
        }
      : invalidAttachment();
  }
  if (expected.target.kind === "pointCube") {
    return attachment.kind === "hole" &&
      value.kind === "area" &&
      value.origin.kind === "point_within_range" &&
      value.shape.kind === "cube" &&
      value.shape.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
      ? {
          tag: "supported",
          value: {
            targeting: {
              kind: "pointOriginCubeExcludingCaster",
              sideFeet: movementFeet(value.shape.sideFeet),
            },
            targetCreatureTypes: null,
          },
        }
      : invalidAttachment();
  }
  if (attachment.kind !== "hole" || value.kind !== "target") {
    return invalidAttachment();
  }
  const selection = value.selection;
  const targetCountFacts = saveGateTargetCountFactsFromSelection(
    selection,
    spellLevel,
  );
  if (targetCountFacts === null || !isCreatureOnlyTargetSelection(selection)) {
    return invalidAttachment();
  }
  const typeFilter = targetSelectionTypeFilter(selection);
  const targetCreatureTypes =
    expected.target.creatureType === null
      ? typeFilter === undefined
        ? null
        : undefined
      : typeFilter?.length === 1 &&
          typeFilter[0] === expected.target.creatureType
        ? [expected.target.creatureType]
        : undefined;
  return targetCreatureTypes === undefined
    ? invalidAttachment()
    : {
        tag: "supported",
        value: {
          targeting: { kind: "targetList", count: targetCountFacts },
          targetCreatureTypes,
        },
      };
}

function saveGatedConditionVariant(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatedConditionRootPhase,
): SaveGatedConditionVariant {
  const failedCondition = saveGatedConditionFailedCondition(phase);
  return Match.value(phase.onFail).pipe(
    Match.when({ kind: "apply_condition" }, (effect) =>
      saveGatedConditionVariantFromCondition(spell, phase, effect.condition),
    ),
    Match.when({ kind: "composite" }, () =>
      saveGatedConditionVariantFromCondition(spell, phase, failedCondition),
    ),
    Match.exhaustive,
  );
}

function saveGatedConditionVariantFromCondition(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatePhase,
  failedCondition: unknown,
): SaveGatedConditionVariant {
  if (isSensoryConditionChoiceRoot(failedCondition)) {
    return "sensory";
  }
  const attachment = phase.attachment;
  const attachmentValue =
    attachment.kind === "hole" ? attachment.value : attachment;
  if (
    failedCondition === "blinded" &&
    attachmentValue.kind === "area" &&
    attachmentValue.origin.kind === "self" &&
    attachmentValue.shape.kind === "cone"
  ) {
    return "blinded";
  }
  if (
    failedCondition === "restrained" &&
    attachmentValue.kind === "area" &&
    attachmentValue.origin.kind === "point_within_range" &&
    attachmentValue.shape.kind === "cube"
  ) {
    return "restrained";
  }
  if (
    attachment.kind === "hole" &&
    attachmentValue.kind === "target" &&
    attachmentValue.selection.mode === "choose_up_to"
  ) {
    const typeFilter = targetSelectionTypeFilter(attachmentValue.selection);
    if (typeFilter?.length === 1 && typeFilter[0] === "humanoid") {
      return failedCondition === "charmed" ? "charm" : "paralysis";
    }
    if (failedCondition === "charmed") {
      return "charm";
    }
  }
  return spell.mechanics.duration.kind === "concentration"
    ? "paralysis"
    : "charm";
}

function saveGatedConditionFailedCondition(
  phase: SaveGatePhase,
):
  | Extract<
      SaveGateFailureEffect,
      { readonly kind: "apply_condition" }
    >["condition"]
  | undefined {
  const effects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [phase.onFail];
  for (const effect of effects) {
    if (effect.kind === "apply_condition") {
      return effect.condition;
    }
  }
  return undefined;
}

type SaveGatedConditionVariantFacts = {
  readonly level: number;
  readonly rangeFeet: number;
  readonly ability: Ability;
  readonly duration:
    | { readonly kind: "concentration"; readonly amount: 1 }
    | {
        readonly kind: "timed";
        readonly unit: "hour" | "minute" | "round";
        readonly amount: number;
      };
  readonly target:
    | { readonly kind: "target"; readonly creatureType: CreatureType | null }
    | { readonly kind: "selfCone" }
    | { readonly kind: "pointCube" };
  readonly repeatCount: 0 | 1;
};

function saveGatedConditionVariantFacts(
  variant: SaveGatedConditionVariant,
  phase: SaveGatePhase,
): SaveGatedConditionVariantFacts {
  const targetSelection =
    phase.attachment.kind === "hole" && phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const targetTypeFilter =
    targetSelection === null
      ? undefined
      : targetSelectionTypeFilter(targetSelection);
  const humanoidTarget =
    targetTypeFilter?.length === 1 && targetTypeFilter[0] === "humanoid";
  const beastTarget =
    targetTypeFilter?.length === 1 && targetTypeFilter[0] === "beast";
  return Match.value(variant).pipe(
    Match.when(
      "sensory",
      (): SaveGatedConditionVariantFacts => ({
        level: SENSORY_CONDITION_CHOICE_BASE_SPELL_LEVEL,
        rangeFeet: SENSORY_CONDITION_CHOICE_RANGE_FEET,
        ability: "con",
        duration: { kind: "timed", unit: "minute", amount: 1 },
        target: { kind: "target", creatureType: null },
        repeatCount: 1,
      }),
    ),
    Match.when(
      "blinded",
      (): SaveGatedConditionVariantFacts => ({
        level: 1,
        rangeFeet: 0,
        ability: "con",
        duration: { kind: "timed", unit: "round", amount: 1 },
        target: { kind: "selfCone" },
        repeatCount: 0,
      }),
    ),
    Match.when(
      "restrained",
      (): SaveGatedConditionVariantFacts => ({
        level: 1,
        rangeFeet: AREA_RESTRAINT_RANGE_FEET,
        ability: "str",
        duration: { kind: "concentration", amount: 1 },
        target: { kind: "pointCube" },
        repeatCount: 0,
      }),
    ),
    Match.when(
      "paralysis",
      (): SaveGatedConditionVariantFacts => ({
        level: humanoidTarget
          ? HUMANOID_PARALYSIS_BASE_SPELL_LEVEL
          : CREATURE_PARALYSIS_BASE_SPELL_LEVEL,
        rangeFeet: humanoidTarget
          ? HUMANOID_PARALYSIS_RANGE_FEET
          : CREATURE_PARALYSIS_RANGE_FEET,
        ability: "wis",
        duration: { kind: "concentration", amount: 1 },
        target: {
          kind: "target",
          creatureType: humanoidTarget ? "humanoid" : null,
        },
        repeatCount: 1,
      }),
    ),
    Match.when(
      "charm",
      (): SaveGatedConditionVariantFacts => ({
        level: 1,
        rangeFeet: 30,
        ability: "wis",
        duration: {
          kind: "timed",
          unit: "hour",
          amount: beastTarget ? 24 : 1,
        },
        target: {
          kind: "target",
          creatureType: beastTarget ? "beast" : "humanoid",
        },
        repeatCount: 0,
      }),
    ),
    Match.exhaustive,
  );
}

function saveGatedConditionDurationMatches(
  spell: SpellMechanicsSource,
  expected: SaveGatedConditionVariantFacts,
): boolean {
  const duration = spell.mechanics.duration;
  if (expected.duration.kind === "concentration") {
    return (
      duration.kind === "concentration" &&
      duration.upTo.unit === "minute" &&
      duration.upTo.amount === expected.duration.amount
    );
  }
  return (
    duration.kind === "timed" &&
    duration.value.unit === expected.duration.unit &&
    duration.value.amount === expected.duration.amount
  );
}

function saveGatedConditionRangeMatches(
  spell: SpellMechanicsSource,
  variant: SaveGatedConditionVariant,
  expectedRangeFeet: number,
): boolean {
  return variant === "blinded"
    ? spell.mechanics.range.kind === "self"
    : hasPointRangeFeet(spell, expectedRangeFeet);
}

function targetSelectionTypeFilter(
  selection: TargetSelection,
): readonly CreatureType[] | undefined {
  return "typeFilter" in selection ? selection.typeFilter : undefined;
}

function saveGatedConditionSupportedDurationEndingOrdinals(
  variant: SaveGatedConditionVariant,
  duration: SaveGateDuration,
): readonly PositiveInteger[] {
  if (variant !== "charm" || duration.kind !== "timed") {
    return [];
  }
  const earlyEndChildren = spellDurationChildCoordinates(duration).filter(
    (child) => child.branch === "ending" && child.ending.kind === "earlyEnd",
  );
  return earlyEndChildren.length === 1 &&
    earlyEndChildren[0]?.branch === "ending" &&
    earlyEndChildren[0].ending.kind === "earlyEnd" &&
    earlyEndChildren[0].ending.trigger.kind ===
      "target_damaged_by_caster_or_ally"
    ? [PositiveInteger(1)]
    : [];
}

function saveGatedConditionDurationFailures(
  spell: ActivationSpellMechanicsSource,
  variant: SaveGatedConditionVariant,
): readonly SaveGatedConditionFailure[] {
  const duration = spell.mechanics.duration;
  const durationChildren = spellDurationChildCoordinates(duration);
  const supportedEndingOrdinals =
    saveGatedConditionSupportedDurationEndingOrdinals(variant, duration);
  const failures: SaveGatedConditionFailure[] = [];
  if (
    variant === "charm" &&
    duration.kind !== "slot_tiered" &&
    supportedEndingOrdinals.length === 0 &&
    !durationChildren.some((child) => child.branch === "ending")
  ) {
    failures.push({
      failedFact: "durationEnding",
      mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
    });
  }
  failures.push(
    ...saveGateDurationChildFailures(durationChildren, supportedEndingOrdinals),
  );
  return failures;
}

function saveGatedConditionFailureEffectFailures(
  phase: SaveGatePhase,
  variant: SaveGatedConditionVariant,
): readonly SaveGatedConditionFailure[] {
  const effects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [phase.onFail];
  if (effects.length !== 1 || effects[0]?.kind !== "apply_condition") {
    return effects.map((_, index) => ({
      failedFact: "failedSaveEffect" as const,
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(index + 1),
      ),
    }));
  }
  const condition = effects[0].condition;
  const expected =
    variant === "sensory"
      ? isSensoryConditionChoiceRoot(condition)
      : typeof condition === "string" &&
        condition ===
          (variant === "blinded"
            ? "blinded"
            : variant === "restrained"
              ? "restrained"
              : variant === "paralysis"
                ? "paralyzed"
                : "charmed");
  return expected
    ? []
    : [
        {
          failedFact: "failedSaveEffect" as const,
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ];
}

function saveGatedConditionRepeatFailures(
  phase: SaveGatePhase,
  variant: SaveGatedConditionVariant,
): readonly SaveGatedConditionFailure[] {
  const repeats = phase.repeatSaves ?? [];
  const expectedCount =
    variant === "paralysis" || variant === "sensory" ? 1 : 0;
  const failures: SaveGatedConditionFailure[] = [];
  if (expectedCount === 0) {
    return repeats.map((_, index) => ({
      failedFact: "extraRepeat" as const,
      mechanicsPath: spellActivationRepeatPath(
        PositiveInteger(1),
        PositiveInteger(index + 1),
      ),
    }));
  }
  const firstRepeat = repeats[0];
  if (firstRepeat === undefined) {
    return [
      {
        failedFact: "missingRepeat",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ];
  }
  if (
    firstRepeat.cadence !== "end_of_target_turn" ||
    firstRepeat.rollMode !== undefined ||
    firstRepeat.onSuccess !== "ends_on_target" ||
    firstRepeat.onFailAgain !== undefined ||
    firstRepeat.successesRequired !== undefined ||
    firstRepeat.failuresRequired !== undefined ||
    firstRepeat.onFailureThreshold !== undefined
  ) {
    failures.push({
      failedFact: "repeatSave",
      mechanicsPath: spellActivationRepeatPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  failures.push(
    ...repeats.slice(1).map((_, index) => ({
      failedFact: "extraRepeat" as const,
      mechanicsPath: spellActivationRepeatPath(
        PositiveInteger(1),
        PositiveInteger(index + 2),
      ),
    })),
  );
  return failures;
}

function saveGatedConditionMechanicsIssue(
  failedFact: SaveGatedConditionFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedConditionMechanicsIssue {
  const definition = SAVE_GATED_CONDITION_FAILED_FACTS.find(
    (candidate) => candidate.failedFact === failedFact,
  );
  if (definition === undefined) {
    throw new Error(
      "SaveGatedConditionFailedFact derives from SAVE_GATED_CONDITION_FAILED_FACTS and must have a definition.",
    );
  }
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedCondition",
    failedFact,
    mechanicsPath,
    message: definition.message,
  };
}

function saveGatedConditionMechanicsEvidence(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatePhase,
  variant: SaveGatedConditionVariant,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...saveGateSupportedDurationPaths(
      spell.mechanics.duration,
      saveGatedConditionSupportedDurationEndingOrdinals(
        variant,
        spell.mechanics.duration,
      ),
    ),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...saveGateFailureEffectPaths(phase.onFail),
    ...(phase.repeatSaves ?? []).map((_, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
  ];
  consumed.push(
    ...spellConsumedMaterialEvidencePaths(spell.mechanics.components),
  );
  return { consumed, unowned: [] };
}

function saveGateFailureEffectPaths(
  effect: SaveGateFailureEffect,
): readonly SpellMechanicsBranchPath[] {
  const effects = effect.kind === "composite" ? effect.effects : [effect];
  return effects.map((_, index) =>
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
  );
}

export function supportedSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  return (
    creatureTypeRestrictedCharmSaveGateConditionSpell(spell) ??
    sensoryConditionChoiceSaveGateSpell(spell) ??
    humanoidCharmSaveGateConditionSpell(spell) ??
    humanoidParalysisSaveGateConditionSpell(spell) ??
    creatureParalysisSaveGateConditionSpell(spell) ??
    hitPointBudgetBlindedSaveGateConditionSpell(spell) ??
    persistentAreaRestrainedSaveGateConditionSpell(spell)
  );
}

export function supportedPreparedSaveGateAttackRollAdvantageProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const attackRollAdvantageSpell = areaSaveGatedAttackRollAdvantageSpell(
    actorId,
    spell,
  );
  const rangeFeet = saveGateRangeFeetFromRuleFacts(
    spell.spellDefinitionRuleFacts.range,
  );
  if (attackRollAdvantageSpell === null || rangeFeet === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    /* v8 ignore start -- @preserve -- Domain invariant: this profile admits only level-1 spells, and SpellSlotLevel cannot represent a slot below level 1. */
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    /* v8 ignore stop -- @preserve */
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedAttackRollAdvantage",
        spell,
        ability: attackRollAdvantageSpell.phase.ability,
        dc: attackRollAdvantageSpell.phase.dc,
        targeting: attackRollAdvantageSpell.targeting,
        effect: attackRollAdvantageSpell.effect,
        illumination: attackRollAdvantageSpell.illumination,
        rangeFeet,
      },
    ];
  });
}

export function supportedPreparedAbilityD20TestRollModeSaveGateProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const d20Lifecycle = abilityD20TestRollModeSaveGateSpell(actorId, spell);
  const rangeFeet = saveGateRangeFeetFromRuleFacts(
    spell.spellDefinitionRuleFacts.range,
  );
  const durationTicks = saveGateConcentrationDurationTicksFromRuleFacts(
    spell.spellDefinitionRuleFacts.duration,
  );
  if (d20Lifecycle === null || rangeFeet === null || durationTicks === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "abilityD20TestRollModeSaveGate",
        spell,
        actionCost: "magicAction",
        ability: d20Lifecycle.phase.ability,
        dc: d20Lifecycle.phase.dc,
        targeting: d20Lifecycle.targeting,
        rangeFeet,
        successEffect: d20Lifecycle.successEffect,
        failedSaveEffect: d20Lifecycle.failedSaveEffect,
        failedSaveDamagePenaltyEffect:
          d20Lifecycle.failedSaveDamagePenaltyEffect,
      },
    ];
  });
}

export function supportedPreparedSaveGateConditionImmunityProfile(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly SupportedSpellInvocation[] {
  const conditionImmunitySpell = areaConditionImmunitySaveGateSpell(
    actorId,
    spell,
  );
  const rangeFeet = saveGateRangeFeetFromRuleFacts(
    spell.spellDefinitionRuleFacts.range,
  );
  if (conditionImmunitySpell === null || rangeFeet === null) {
    return [];
  }

  return castOptions.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(slot),
        procedure: "saveGatedConditionImmunity",
        spell,
        actionCost: "magicAction",
        ability: conditionImmunitySpell.phase.ability,
        dc: conditionImmunitySpell.phase.dc,
        targeting: conditionImmunitySpell.targeting,
        targetCreatureTypes: conditionImmunitySpell.targetCreatureTypes,
        activeEffects: conditionImmunitySpell.activeEffects,
        rangeFeet,
      },
    ];
  });
}

/** Parse condition-immunity mechanics without retaining actor-bound effects. */
export function saveGatedConditionImmunityMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedConditionImmunityMechanicsProjection {
  if (spell.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  if (
    isSaveGatedDamageRootShape(phase) ||
    !isSaveGatedConditionImmunityRootShape(phase)
  ) {
    return { tag: "notRepresented" };
  }
  const activationSpell: ActivationSpellMechanicsSource = {
    mechanics: spell.mechanics,
  };
  const parsed = saveGatedConditionImmunityMechanicsFailures(
    activationSpell,
    phase,
  );
  if (parsed.tag === "unsupported") {
    const [firstIssue, ...remainingIssues] = parsed.failures;
    return {
      tag: "unsupported",
      issues: [
        saveGatedConditionImmunityMechanicsIssue(
          firstIssue.failedFact,
          firstIssue.mechanicsPath,
        ),
        ...remainingIssues.map(({ failedFact, mechanicsPath }) =>
          saveGatedConditionImmunityMechanicsIssue(failedFact, mechanicsPath),
        ),
      ],
    };
  }
  return {
    tag: "supported",
    facts: parsed.facts,
    evidence: saveGatedConditionImmunityMechanicsEvidence(spell, phase),
  };
}

/** Build condition-immunity effects from static facts and actor state. */
export function saveGatedConditionImmunityInvocationsFromFacts(input: {
  readonly spell: SaveGatedConditionImmunitySpellInvocation["spell"];
  readonly facts: SpellDefinitionRuleFacts &
    SaveGatedConditionImmunityMechanicsFacts;
  readonly access: SaveGatedConditionImmunitySpellInvocation["access"];
  readonly resource: SaveGatedConditionImmunitySpellInvocation["resource"];
  readonly slotLevel: SpellSlotLevel;
  readonly sourceCombatantId: CombatantId;
}): readonly SaveGatedConditionImmunitySpellInvocation[] {
  const { level } = input.facts;
  if (Number(input.slotLevel) < level) {
    return [];
  }
  const rangeFeet = saveGateRangeFeetFromRuleFacts(input.facts.range);
  if (rangeFeet === null) {
    return [];
  }
  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "saveGatedConditionImmunity",
      spell: input.spell,
      actionCost: "magicAction",
      ability: input.facts.ability,
      dc: input.facts.dc,
      targeting: input.facts.targeting,
      targetCreatureTypes: input.facts.targetCreatureTypes,
      activeEffects: conditionImmunityActiveEffectsFor(input.sourceCombatantId),
      rangeFeet,
    },
  ];
}

function isSaveGatedConditionImmunityRootShape(phase: SaveGatePhase): boolean {
  const effects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [phase.onFail];
  return effects.some((effect) => effect.kind === "grant_condition_immunity");
}

type SaveGatedConditionImmunityFailure = {
  readonly failedFact: SaveGatedConditionImmunityFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type SaveGatedConditionImmunityAttachmentFacts = Pick<
  SaveGatedConditionImmunityMechanicsFacts,
  "targeting" | "targetCreatureTypes"
>;

type SaveGatedConditionImmunityAttachmentParse = SaveGateNarrowedParse<
  SaveGatedConditionImmunityAttachmentFacts,
  SaveGatedConditionImmunityFailure
>;

type SaveGatedConditionImmunityMechanicsParse =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<SaveGatedConditionImmunityFailure>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedConditionImmunityMechanicsFacts;
    };

function saveGatedConditionImmunityMechanicsFailures(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatePhase,
): SaveGatedConditionImmunityMechanicsParse {
  const failuresBeforeAttachment: SaveGatedConditionImmunityFailure[] = [];
  const attachment = conditionImmunityAttachmentParse(phase);
  if (spell.mechanics.level !== AREA_CONDITION_IMMUNITY_BASE_SPELL_LEVEL) {
    failuresBeforeAttachment.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  }
  if (!spellHasActionCastingTime(spell)) {
    failuresBeforeAttachment.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  }
  if (!hasPointRangeFeet(spell, AREA_CONDITION_IMMUNITY_RANGE_FEET)) {
    failuresBeforeAttachment.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (!hasOneMinuteConcentrationDuration(spell)) {
    failuresBeforeAttachment.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failuresBeforeAttachment.push(
    ...saveGateDurationChildFailures(
      spellDurationChildCoordinates(spell.mechanics.duration),
    ),
  );
  failuresBeforeAttachment.push(
    ...saveGatePhaseCountFailures(spell.mechanics.phases.length, 1),
  );
  if (phase.ability !== "cha") {
    failuresBeforeAttachment.push({
      failedFact: "phaseAbility",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  if (phase.dc.kind !== "caster_spell_save_dc") {
    failuresBeforeAttachment.push({
      failedFact: "phaseDc",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  const failuresAfterAttachment: SaveGatedConditionImmunityFailure[] = [];
  if (phase.onSuccess.kind !== "none") {
    failuresAfterAttachment.push({
      failedFact: "successOutcome",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  failuresAfterAttachment.push(
    ...conditionImmunityFailureEffectFailures(phase),
  );
  failuresAfterAttachment.push(...saveGateRepeatFailuresForCount(phase, 0));
  const parsed = saveGateNarrowedParseWithFailures(
    failuresBeforeAttachment,
    attachment,
    failuresAfterAttachment,
  );
  return parsed.tag === "unsupported"
    ? parsed
    : {
        tag: "supported",
        facts: {
          ability: phase.ability,
          dc: phase.dc,
          ...parsed.value,
        },
      };
}

function conditionImmunityAttachmentParse(
  phase: SaveGatePhase,
): SaveGatedConditionImmunityAttachmentParse {
  const invalidAttachment = (): SaveGatedConditionImmunityAttachmentParse => ({
    tag: "unsupported",
    failures: [
      {
        failedFact: "phaseAttachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ],
  });
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area"
  ) {
    return invalidAttachment();
  }
  const area = phase.attachment.value;
  if (
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== AREA_CONDITION_IMMUNITY_RADIUS_FEET
  ) {
    return invalidAttachment();
  }
  const selection = area.selection;
  return selection?.mode === "any_number" &&
    sameStringSet(selection.targetKinds ?? [], ["creature"]) &&
    sameStringSet(
      selection.typeFilter ?? [],
      AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
    )
    ? {
        tag: "supported",
        value: {
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(area.shape.radiusFeet),
          },
          targetCreatureTypes: AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
        },
      }
    : invalidAttachment();
}

function isAreaConditionImmunity(
  condition: unknown,
): condition is AreaConditionImmunity {
  return AREA_CONDITION_IMMUNITIES.some((candidate) => candidate === condition);
}

function conditionImmunityFailureEffectFailures(
  phase: SaveGatePhase,
): readonly SaveGatedConditionImmunityFailure[] {
  if (phase.onFail.kind !== "composite") {
    return [
      {
        failedFact: "conditionImmunityEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ];
  }
  const failures: SaveGatedConditionImmunityFailure[] = [];
  const seen = new Set<AreaConditionImmunity>();
  for (const [index, effect] of phase.onFail.effects.entries()) {
    if (
      effect.kind === "grant_condition_immunity" &&
      isAreaConditionImmunity(effect.condition) &&
      !seen.has(effect.condition)
    ) {
      seen.add(effect.condition);
      continue;
    }
    failures.push({
      failedFact: "failedSaveEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(index + 1),
      ),
    });
  }
  for (const condition of AREA_CONDITION_IMMUNITIES) {
    if (!seen.has(condition)) {
      failures.push({
        failedFact: "conditionImmunityEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(phase.onFail.effects.length + 1),
        ),
      });
    }
  }
  return failures;
}

function saveGatedConditionImmunityMechanicsIssue(
  failedFact: SaveGatedConditionImmunityFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedConditionImmunityMechanicsIssue {
  const definition = SAVE_GATED_CONDITION_IMMUNITY_FAILED_FACTS.find(
    (candidate) => candidate.failedFact === failedFact,
  );
  if (definition === undefined) {
    throw new Error(
      "SaveGatedConditionImmunityFailedFact derives from SAVE_GATED_CONDITION_IMMUNITY_FAILED_FACTS and must have a definition.",
    );
  }
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedConditionImmunity",
    failedFact,
    mechanicsPath,
    message: definition.message,
  };
}

function saveGatedConditionImmunityMechanicsEvidence(
  spell: SpellMechanicsSource,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...saveGateSupportedDurationPaths(spell.mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...saveGateFailureEffectPaths(phase.onFail),
  ];
  consumed.push(
    ...spellConsumedMaterialEvidencePaths(spell.mechanics.components),
  );
  return { consumed, unowned: [] };
}

function conditionImmunityActiveEffectsFor(
  sourceCombatantId: CombatantId,
): SaveGatedConditionImmunitySpellInvocation["activeEffects"] {
  return [
    {
      kind: "conditionImmunity",
      sourceCombatantId,
      condition: AREA_CONDITION_IMMUNITIES[0],
      expiresAt: { kind: "concentration", combatantId: sourceCombatantId },
    },
    {
      kind: "conditionImmunity",
      sourceCombatantId,
      condition: AREA_CONDITION_IMMUNITIES[1],
      expiresAt: { kind: "concentration", combatantId: sourceCombatantId },
    },
  ];
}

function areaConditionImmunitySaveGateSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly targetCreatureTypes: typeof AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES;
  readonly activeEffects: SaveGatedConditionImmunitySpellInvocation["activeEffects"];
} | null {
  const facts = areaConditionImmunitySaveGateMechanicsFacts(spell);
  if (facts === null || spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return null;
  }
  return {
    phase,
    ...facts,
    activeEffects: conditionImmunityActiveEffectsFor(actorId),
  };
}

function areaConditionImmunitySaveGateMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedConditionImmunityMechanicsFacts | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const area =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area"
      ? phase.attachment.value
      : null;
  const targetSelection = area?.selection;
  const immunityEffects =
    phase?.kind === "save_gate"
      ? conditionImmunityEffectsFromSaveGateFailure(phase.onFail)
      : null;
  if (
    spell.mechanics.level !== AREA_CONDITION_IMMUNITY_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== AREA_CONDITION_IMMUNITY_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "cha" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    area === null ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== AREA_CONDITION_IMMUNITY_RADIUS_FEET ||
    targetSelection?.mode !== "any_number" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    !sameStringSet(
      targetSelection.typeFilter ?? [],
      AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
    ) ||
    immunityEffects === null
  ) {
    return null;
  }

  return {
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(area.shape.radiusFeet),
    },
    targetCreatureTypes: AREA_CONDITION_IMMUNITY_TARGET_CREATURE_TYPES,
    ability: phase.ability,
    dc: phase.dc,
  };
}

type GrantConditionImmunitySaveGateEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "grant_condition_immunity" }
>;

function conditionImmunityEffectsFromSaveGateFailure(
  effect: SaveGateFailedEffect,
):
  | readonly [
      GrantConditionImmunitySaveGateEffect,
      GrantConditionImmunitySaveGateEffect,
    ]
  | null {
  const effects =
    effect.kind === "composite" ? effect.effects : ([effect] as const);
  const immunities = effects.filter(
    (candidate): candidate is GrantConditionImmunitySaveGateEffect =>
      candidate.kind === "grant_condition_immunity",
  );
  if (
    effects.length !== AREA_CONDITION_IMMUNITIES.length ||
    immunities.length !== AREA_CONDITION_IMMUNITIES.length ||
    !sameStringSet(
      immunities.map((immunity) => immunity.condition),
      AREA_CONDITION_IMMUNITIES,
    )
  ) {
    return null;
  }
  const [first, second] = immunities;
  return first === undefined || second === undefined ? null : [first, second];
}

export function oneAdditionalTargetPerSpellSlotAboveBaseLevel(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => PositiveInteger) | null {
  const facts = saveGateTargetCountFactsFromSelection(selection, spellLevel);
  return facts === null
    ? null
    : (slotLevel) => saveGateTargetCountAtSlot(facts, slotLevel);
}

function saveGateTargetCountFactsFromSelection(
  selection: TargetSelection,
  spellLevel: number,
): SaveGateTargetCountFacts | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed === true) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count === "number" ||
    count.kind !== "linear" ||
    count.base !== 1 ||
    count.baseLevel !== spellLevel ||
    count.perSlotAboveBase !== 1
  ) {
    return null;
  }
  const base = positiveIntegerFromParsedCount(count.base);
  const baseLevel = spellSlotLevelFromParsedCount(count.baseLevel);
  const perSlotAboveBase = positiveIntegerFromParsedCount(
    count.perSlotAboveBase,
  );
  if (base === null || baseLevel === null || perSlotAboveBase === null) {
    return null;
  }
  return {
    base,
    baseLevel,
    perSlotAboveBase,
  };
}

function positiveIntegerFromParsedCount(value: number): PositiveInteger | null {
  return Number.isInteger(value) && value > 0 ? PositiveInteger(value) : null;
}

function spellSlotLevelFromParsedCount(value: number): SpellSlotLevel | null {
  return Number.isInteger(value) && value >= 1 && value <= 9
    ? spellSlotLevel(value)
    : null;
}

/** Parse D20 test roll-mode mechanics without retaining actor-bound effects. */
export function abilityD20TestRollModeSaveGateMechanicsFacts(
  spell: SpellMechanicsSource,
): AbilityD20TestRollModeSaveGateMechanicsProjection {
  if (spell.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  if (
    isSaveGatedDamageRootShape(phase) ||
    !isAbilityD20TestRollModeSaveGateRootShape(phase)
  ) {
    return { tag: "notRepresented" };
  }
  const activationSpell: ActivationSpellMechanicsSource = {
    mechanics: spell.mechanics,
  };
  const parsed = abilityD20TestRollModeSaveGateMechanicsFailures(
    activationSpell,
    phase,
  );
  if (parsed.tag === "unsupported") {
    const [firstIssue, ...remainingIssues] = parsed.failures;
    return {
      tag: "unsupported",
      issues: [
        abilityD20TestRollModeSaveGateMechanicsIssue(
          firstIssue.failedFact,
          firstIssue.mechanicsPath,
        ),
        ...remainingIssues.map(({ failedFact, mechanicsPath }) =>
          abilityD20TestRollModeSaveGateMechanicsIssue(
            failedFact,
            mechanicsPath,
          ),
        ),
      ],
    };
  }
  return {
    tag: "supported",
    facts: parsed.facts,
    evidence: abilityD20TestRollModeSaveGateMechanicsEvidence(spell, phase),
  };
}

/** Build D20 test roll-mode effects from static facts and actor state. */
export function abilityD20TestRollModeSaveGateInvocationsFromFacts(input: {
  readonly spell: AbilityD20TestRollModeSaveGateInvocation["spell"];
  readonly facts: SpellDefinitionRuleFacts &
    AbilityD20TestRollModeSaveGateMechanicsFacts;
  readonly access: AbilityD20TestRollModeSaveGateInvocation["access"];
  readonly resource: AbilityD20TestRollModeSaveGateInvocation["resource"];
  readonly slotLevel: SpellSlotLevel;
  readonly sourceCombatantId: CombatantId;
}): readonly AbilityD20TestRollModeSaveGateInvocation[] {
  const { level } = input.facts;
  if (Number(input.slotLevel) < level) {
    return [];
  }
  const rangeFeet = saveGateRangeFeetFromRuleFacts(input.facts.range);
  const durationTicks = saveGateConcentrationDurationTicksFromRuleFacts(
    input.facts.duration,
  );
  if (rangeFeet === null || durationTicks === null) {
    return [];
  }
  const { sourceCombatantId } = input;
  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "abilityD20TestRollModeSaveGate",
      spell: input.spell,
      actionCost: "magicAction",
      ability: input.facts.ability,
      dc: input.facts.dc,
      targeting: input.facts.targeting,
      rangeFeet,
      successEffect: {
        kind: "nextAttackRollBySelf",
        sourceCombatantId,
        mode: "disadvantage",
        expiresAt: { kind: "startOfTurn", combatantId: sourceCombatantId },
      },
      failedSaveEffect: {
        kind: "abilityD20TestRollModeEndTurnSave",
        sourceCombatantId,
        ability: "str",
        mode: "disadvantage",
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: sourceCombatantId,
          durationTicks,
        },
      },
      failedSaveDamagePenaltyEffect: {
        kind: "sourceDamageRollPenalty",
        sourceCombatantId,
        amount: { dice: 1, dieSize: 8 },
        expiresAt: {
          kind: "concentration",
          combatantId: sourceCombatantId,
          durationTicks,
        },
      },
    },
  ];
}

function isAbilityD20TestRollModeSaveGateRootShape(
  phase: SaveGatePhase,
): boolean {
  const failedEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  return (
    !isSaveGatedDamageRootShape(phase) &&
    (phase.onSuccess.kind === "modify_roll_advantage" ||
      failedEffects.some((effect) => effect.kind === "modify_damage_numeric"))
  );
}

type AbilityD20TestRollModeSaveGateFailure = {
  readonly failedFact: AbilityD20TestRollModeSaveGateFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type AbilityD20TestRollModeSaveGateMechanicsParse =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<AbilityD20TestRollModeSaveGateFailure>;
    }
  | {
      readonly tag: "supported";
      readonly facts: AbilityD20TestRollModeSaveGateMechanicsFacts;
    };

function abilityD20TestRollModeSaveGateMechanicsFailures(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatePhase,
): AbilityD20TestRollModeSaveGateMechanicsParse {
  const failures: AbilityD20TestRollModeSaveGateFailure[] = [];
  if (
    spell.mechanics.level !==
    WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_BASE_SPELL_LEVEL
  ) {
    failures.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  }
  if (!spellHasActionCastingTime(spell)) {
    failures.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  }
  if (
    !hasPointRangeFeet(spell, WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET)
  ) {
    failures.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_UNIT ||
    spell.mechanics.duration.upTo.amount !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_AMOUNT
  ) {
    failures.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failures.push(
    ...saveGateDurationChildFailures(
      spellDurationChildCoordinates(spell.mechanics.duration),
    ),
  );
  failures.push(
    ...saveGatePhaseCountFailures(spell.mechanics.phases.length, 1),
  );
  if (phase.ability !== "con") {
    failures.push({
      failedFact: "phaseAbility",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  if (phase.dc.kind !== "caster_spell_save_dc") {
    failures.push({
      failedFact: "phaseDc",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one"
  ) {
    failures.push({
      failedFact: "phaseAttachment",
      mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
    });
  }
  if (!isRayStrengthD20SuccessEffect(phase.onSuccess)) {
    failures.push({
      failedFact: "successOutcome",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  failures.push(...abilityD20FailureEffectFailures(phase));
  const repeat = phase.repeatSaves?.[0];
  if (
    repeat !== undefined &&
    (repeat.cadence !== "end_of_target_turn" ||
      repeat.onSuccess !== "ends_on_target" ||
      repeat.rollMode !== undefined ||
      repeat.onFailAgain !== undefined ||
      repeat.successesRequired !== undefined ||
      repeat.failuresRequired !== undefined ||
      repeat.onFailureThreshold !== undefined)
  ) {
    failures.push({
      failedFact: "repeatSave",
      mechanicsPath: spellActivationRepeatPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  failures.push(...saveGateRepeatFailuresForCount(phase, 1));
  const nonEmptyFailures = spellProcedureNonEmpty(failures);
  if (nonEmptyFailures !== undefined) {
    return { tag: "unsupported", failures: nonEmptyFailures };
  }
  return {
    tag: "supported",
    facts: {
      ability: "con",
      dc: phase.dc,
      targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    },
  };
}

function isRayStrengthD20SuccessEffect(
  effect: SaveGateFailedEffect | SaveGatePhase["onSuccess"],
): boolean {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    sameStringSet(effect.on, ["attack_roll"]) &&
    effect.count === 1 &&
    effect.expiresOn?.kind === "caster_turn_start" &&
    effect.abilityFilter === undefined &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.saveAbilityFilter === undefined &&
    effect.saveSourceFilter === undefined &&
    effect.contextRangeFeet === undefined &&
    effect.attackRollTarget === undefined &&
    effect.spellSourceFilter === undefined &&
    effect.attackerTypeFilter === undefined
  );
}

function isRayDamagePenaltyEffect(effect: SaveGateFailedEffect): boolean {
  return (
    effect.kind === "modify_damage_numeric" &&
    effect.delta.kind === "fixed_dice" &&
    effect.delta.sign === "-" &&
    effect.delta.dice === 1 &&
    effect.delta.dieSize === 8 &&
    effect.damageSourceFilter === undefined &&
    effect.weaponFilter === undefined &&
    effect.abilityFilter === undefined &&
    effect.minimumDamageTotal === undefined
  );
}

function abilityD20FailureEffectFailures(
  phase: SaveGatePhase,
): readonly AbilityD20TestRollModeSaveGateFailure[] {
  if (phase.onFail.kind !== "composite") {
    return [
      {
        failedFact: "d20DisadvantageEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ];
  }
  const failures: AbilityD20TestRollModeSaveGateFailure[] = [];
  let hasD20Disadvantage = false;
  let hasDamagePenalty = false;
  for (const [index, effect] of phase.onFail.effects.entries()) {
    if (isRayStrengthD20DisadvantageEffect(effect) && !hasD20Disadvantage) {
      hasD20Disadvantage = true;
      continue;
    }
    if (isRayDamagePenaltyEffect(effect) && !hasDamagePenalty) {
      hasDamagePenalty = true;
      continue;
    }
    failures.push({
      failedFact: "failedSaveEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(index + 1),
      ),
    });
  }
  if (!hasD20Disadvantage) {
    failures.push({
      failedFact: "d20DisadvantageEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(phase.onFail.effects.length + 1),
      ),
    });
  }
  if (!hasDamagePenalty) {
    failures.push({
      failedFact: "damagePenaltyEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(phase.onFail.effects.length + 1),
      ),
    });
  }
  return failures;
}

function abilityD20TestRollModeSaveGateMechanicsIssue(
  failedFact: AbilityD20TestRollModeSaveGateFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): AbilityD20TestRollModeSaveGateMechanicsIssue {
  const definition = ABILITY_D20_TEST_ROLL_MODE_SAVE_GATE_FAILED_FACTS.find(
    (candidate) => candidate.failedFact === failedFact,
  );
  if (definition === undefined) {
    throw new Error(
      "AbilityD20TestRollModeSaveGateFailedFact derives from ABILITY_D20_TEST_ROLL_MODE_SAVE_GATE_FAILED_FACTS and must have a definition.",
    );
  }
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "abilityD20TestRollModeSaveGate",
    failedFact,
    mechanicsPath,
    message: definition.message,
  };
}

function abilityD20TestRollModeSaveGateMechanicsEvidence(
  spell: SpellMechanicsSource,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...saveGateSupportedDurationPaths(spell.mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...saveGateFailureEffectPaths(phase.onFail),
    ...(phase.repeatSaves ?? []).map((_, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
  ];
  consumed.push(
    ...spellConsumedMaterialEvidencePaths(spell.mechanics.components),
  );
  return { consumed, unowned: [] };
}

function abilityD20TestRollModeSaveGateMechanicsFactValues(
  spell: SpellMechanicsSource,
): AbilityD20TestRollModeSaveGateMechanicsFacts | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_UNIT ||
    spell.mechanics.duration.upTo.amount !==
      WEAPON_DAMAGE_REDUCTION_REPEAT_SAVE_DURATION_AMOUNT ||
    spell.mechanics.phases.length !== 1 ||
    !isWeaponDamageReductionRepeatSavePhase(phase)
  ) {
    return null;
  }
  return {
    ability: phase.ability,
    dc: phase.dc,
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
  };
}

function abilityD20TestRollModeSaveGateSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): {
  readonly phase: WeaponDamageReductionRepeatSavePhase;
  readonly targeting: Extract<SpellTargeting, { readonly kind: "targetList" }>;
  readonly successEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["successEffect"];
  readonly failedSaveEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["failedSaveEffect"];
  readonly failedSaveDamagePenaltyEffect: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "abilityD20TestRollModeSaveGate" }
  >["failedSaveDamagePenaltyEffect"];
} | null {
  const facts = abilityD20TestRollModeSaveGateMechanicsFactValues(spell);
  if (facts === null || spell.mechanics.family !== "activation") {
    return null;
  }
  const durationTicks = saveGateConcentrationDurationTicksFromRuleFacts(
    spell.spellDefinitionRuleFacts.duration,
  );
  if (durationTicks === null) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (!isWeaponDamageReductionRepeatSavePhase(phase)) {
    return null;
  }
  return {
    phase,
    targeting: facts.targeting,
    successEffect: {
      kind: "nextAttackRollBySelf",
      sourceCombatantId: actorId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: actorId },
    },
    failedSaveEffect: {
      kind: "abilityD20TestRollModeEndTurnSave",
      sourceCombatantId: actorId,
      ability: "str",
      mode: "disadvantage",
      save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks,
      },
    },
    failedSaveDamagePenaltyEffect: {
      kind: "sourceDamageRollPenalty",
      sourceCombatantId: actorId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: {
        kind: "concentration",
        combatantId: actorId,
        durationTicks,
      },
    },
  };
}

function isWeaponDamageReductionRepeatSavePhase(
  phase: ActivationPhase | undefined,
): phase is WeaponDamageReductionRepeatSavePhase {
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const success = phase?.kind === "save_gate" ? phase.onSuccess : undefined;
  const successDisadvantage =
    success?.kind === "modify_roll_advantage" ? success : undefined;
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const d20DisadvantageEffects = failedEffects.filter(
    isRayStrengthD20DisadvantageEffect,
  );
  const damagePenalty = failedEffects.find(
    (effect) => effect.kind === "modify_damage_numeric",
  );
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target" &&
    phase.attachment.value.selection.mode === "one" &&
    successDisadvantage?.mode === "disadvantage" &&
    sameStringSet(successDisadvantage.on, ["attack_roll"]) &&
    successDisadvantage.count === 1 &&
    successDisadvantage.expiresOn?.kind === "caster_turn_start" &&
    successDisadvantage.abilityFilter === undefined &&
    successDisadvantage.skillFilter === undefined &&
    successDisadvantage.conditionFilter === undefined &&
    d20DisadvantageEffects.length === 1 &&
    damagePenalty?.kind === "modify_damage_numeric" &&
    damagePenalty.delta.kind === "fixed_dice" &&
    damagePenalty.delta.sign === "-" &&
    damagePenalty.delta.dice === 1 &&
    damagePenalty.delta.dieSize === 8 &&
    failedEffects.length === 2 &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onFailAgain === undefined
  );
}

function isRayStrengthD20DisadvantageEffect(
  effect: EffectAtom,
): effect is ModifyRollAdvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    sameStringSet(effect.on, [
      "attack_roll",
      "ability_check",
      "saving_throw",
    ]) &&
    sameAbilitySet(effect.abilityFilter, ["str"]) &&
    effect.skillFilter === undefined &&
    effect.conditionFilter === undefined &&
    effect.count === undefined &&
    effect.expiresOn === undefined
  );
}

function sameAbilitySet(
  actual: ModifyRollAdvantageEffect["abilityFilter"],
  expected: readonly Ability[],
): boolean {
  return Array.isArray(actual) && sameStringSet(actual, expected);
}

export function areaSaveGatedAttackRollAdvantageSpell(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): SaveGateAttackRollAdvantageSpell | null {
  const facts = areaSaveGatedAttackRollAdvantageMechanicsFacts(spell);
  if (facts === null || spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return null;
  }
  return {
    phase,
    ...facts,
    effect: {
      kind: "saveGatedTargetProjection",
      sourceCombatantId: actorId,
      expiresAt: { kind: "concentration", combatantId: actorId },
    },
  };
}

/** Parse attack-roll advantage mechanics without retaining actor-bound effects. */
export function saveGatedAttackRollAdvantageMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedAttackRollAdvantageMechanicsProjection {
  if (spell.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  if (
    isSaveGatedDamageRootShape(phase) ||
    !isSaveGatedAttackRollAdvantageRootShape(phase)
  ) {
    return { tag: "notRepresented" };
  }
  const activationSpell: ActivationSpellMechanicsSource = {
    mechanics: spell.mechanics,
  };
  const parsed = saveGatedAttackRollAdvantageMechanicsFailures(
    activationSpell,
    phase,
  );
  if (parsed.tag === "unsupported") {
    const [firstIssue, ...remainingIssues] = parsed.failures;
    return {
      tag: "unsupported",
      issues: [
        saveGatedAttackRollAdvantageMechanicsIssue(
          firstIssue.failedFact,
          firstIssue.mechanicsPath,
        ),
        ...remainingIssues.map(({ failedFact, mechanicsPath }) =>
          saveGatedAttackRollAdvantageMechanicsIssue(failedFact, mechanicsPath),
        ),
      ],
    };
  }
  return {
    tag: "supported",
    facts: parsed.facts,
    evidence: saveGatedAttackRollAdvantageMechanicsEvidence(spell, phase),
  };
}

/** Build attack-roll advantage effects from static facts and actor state. */
export function saveGatedAttackRollAdvantageInvocationsFromFacts(input: {
  readonly spell: SaveGatedAttackRollAdvantageInvocation["spell"];
  readonly facts: SpellDefinitionRuleFacts &
    SaveGatedAttackRollAdvantageMechanicsFacts;
  readonly access: SaveGatedAttackRollAdvantageInvocation["access"];
  readonly resource: SaveGatedAttackRollAdvantageInvocation["resource"];
  readonly slotLevel: SpellSlotLevel;
  readonly sourceCombatantId: CombatantId;
}): readonly SaveGatedAttackRollAdvantageInvocation[] {
  const { level } = input.facts;
  if (Number(input.slotLevel) < level) {
    return [];
  }
  const rangeFeet = saveGateRangeFeetFromRuleFacts(input.facts.range);
  if (rangeFeet === null) {
    return [];
  }
  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "saveGatedAttackRollAdvantage",
      spell: input.spell,
      ability: input.facts.ability,
      dc: input.facts.dc,
      targeting: input.facts.targeting,
      effect: {
        kind: "saveGatedTargetProjection",
        sourceCombatantId: input.sourceCombatantId,
        expiresAt: {
          kind: "concentration",
          combatantId: input.sourceCombatantId,
        },
      },
      illumination: input.facts.illumination,
      rangeFeet,
    },
  ];
}

function isSaveGatedAttackRollAdvantageRootShape(
  phase: SaveGatePhase,
): boolean {
  return (
    phase.onFail.kind === "composite" &&
    phase.onFail.effects.some(
      (effect) => effect.kind === "modify_roll_advantage",
    ) &&
    phase.onFail.effects.some(
      (effect) =>
        effect.kind === "suppress_condition_benefit" &&
        effect.condition === "invisible",
    ) &&
    phase.onFail.effects.some(
      (effect) => effect.kind === "emit_dim_illumination",
    )
  );
}

type SaveGatedAttackRollAdvantageFailure = {
  readonly failedFact: SaveGatedAttackRollAdvantageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type SaveGatedAttackRollAdvantageMechanicsParse =
  | {
      readonly tag: "unsupported";
      readonly failures: ReadonlyNonEmptyArray<SaveGatedAttackRollAdvantageFailure>;
    }
  | {
      readonly tag: "supported";
      readonly facts: SaveGatedAttackRollAdvantageMechanicsFacts;
    };

type SaveGatedAttackAttachmentFacts = Pick<
  SaveGatedAttackRollAdvantageMechanicsFacts,
  "targeting"
>;

type SaveGatedAttackAttachmentParse = SaveGateNarrowedParse<
  SaveGatedAttackAttachmentFacts,
  SaveGatedAttackRollAdvantageFailure
>;

type SaveGatedAttackFailureEffectParse = SaveGateNarrowedParse<
  SaveGatedAttackRollAdvantageMechanicsFacts["illumination"],
  SaveGatedAttackRollAdvantageFailure
>;

function saveGatedAttackRollAdvantageMechanicsFailures(
  spell: ActivationSpellMechanicsSource,
  phase: SaveGatePhase,
): SaveGatedAttackRollAdvantageMechanicsParse {
  const failuresBeforeAttachment: SaveGatedAttackRollAdvantageFailure[] = [];
  if (spell.mechanics.level !== 1) {
    failuresBeforeAttachment.push({
      failedFact: "level",
      mechanicsPath: spellMechanicsHeaderPath("level"),
    });
  }
  if (!spellHasActionCastingTime(spell)) {
    failuresBeforeAttachment.push({
      failedFact: "castingTime",
      mechanicsPath: spellMechanicsHeaderPath("castingTime"),
    });
  }
  if (!hasPointRangeFeet(spell, 60)) {
    failuresBeforeAttachment.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  if (!hasOneMinuteConcentrationDuration(spell)) {
    failuresBeforeAttachment.push({
      failedFact: "duration",
      mechanicsPath: spellDurationValuePath(),
    });
  }
  failuresBeforeAttachment.push(
    ...saveGateDurationChildFailures(
      spellDurationChildCoordinates(spell.mechanics.duration),
    ),
  );
  failuresBeforeAttachment.push(
    ...saveGatePhaseCountFailures(spell.mechanics.phases.length, 1),
  );
  if (phase.ability !== "dex") {
    failuresBeforeAttachment.push({
      failedFact: "phaseAbility",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  if (phase.dc.kind !== "caster_spell_save_dc") {
    failuresBeforeAttachment.push({
      failedFact: "phaseDc",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
  }
  const attachment = saveGatedAttackAttachmentParse(phase);
  const failuresBetweenParses: SaveGatedAttackRollAdvantageFailure[] = [];
  if (phase.onSuccess.kind !== "none") {
    failuresBetweenParses.push({
      failedFact: "successOutcome",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(1),
      ),
    });
  }
  const failureEffect = saveGatedAttackFailureEffectParse(phase);
  const failuresAfterParses = saveGateRepeatFailuresForCount(phase, 0);
  const parsed = saveGateCombineNarrowedParses(
    failuresBeforeAttachment,
    attachment,
    failuresBetweenParses,
    failureEffect,
    failuresAfterParses,
    (attachmentFacts, illumination) => ({
      targeting: attachmentFacts.targeting,
      ability: phase.ability,
      dc: phase.dc,
      illumination,
    }),
  );
  return parsed.tag === "unsupported"
    ? parsed
    : { tag: "supported", facts: parsed.value };
}

function saveGatedAttackAttachmentParse(
  phase: SaveGatePhase,
): SaveGatedAttackAttachmentParse {
  const saveGate = pointOriginCubeSaveGatePhase(phase);
  return saveGate !== null &&
    saveGate.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
    ? {
        tag: "supported",
        value: {
          targeting: {
            kind: "pointOriginCube",
            sideFeet: movementFeet(saveGate.sideFeet),
          },
        },
      }
    : {
        tag: "unsupported",
        failures: [
          {
            failedFact: "phaseAttachment",
            mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          },
        ],
      };
}

function saveGatedAttackFailureEffectParse(
  phase: SaveGatePhase,
): SaveGatedAttackFailureEffectParse {
  if (phase.onFail.kind !== "composite") {
    return {
      tag: "unsupported",
      failures: [
        {
          failedFact: "attackRollAdvantageEffect",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ],
    };
  }
  const failures: SaveGatedAttackRollAdvantageFailure[] = [];
  const illumination = dimIlluminationFactsFromEffects(phase.onFail.effects);
  let hasAttack = false;
  let hasSuppression = false;
  let hasIllumination = false;
  for (const [index, effect] of phase.onFail.effects.entries()) {
    if (isAttackRollAdvantageEffect(effect) && !hasAttack) {
      hasAttack = true;
      continue;
    }
    if (isInvisibleBenefitSuppression(effect) && !hasSuppression) {
      hasSuppression = true;
      continue;
    }
    if (
      effect.kind === "emit_dim_illumination" &&
      !hasIllumination &&
      illumination !== null
    ) {
      hasIllumination = true;
      continue;
    }
    failures.push({
      failedFact: "failedSaveEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(index + 1),
      ),
    });
  }
  const missingPath = PositiveInteger(phase.onFail.effects.length + 1);
  if (!hasAttack) {
    failures.push({
      failedFact: "attackRollAdvantageEffect",
      mechanicsPath: spellActivationEffectPath(PositiveInteger(1), missingPath),
    });
  }
  if (!hasSuppression) {
    failures.push({
      failedFact: "invisibleSuppressionEffect",
      mechanicsPath: spellActivationEffectPath(PositiveInteger(1), missingPath),
    });
  }
  const illuminationParse: SaveGateNarrowedParse<
    SaveGatedAttackRollAdvantageMechanicsFacts["illumination"],
    SaveGatedAttackRollAdvantageFailure
  > =
    !hasIllumination || illumination === null
      ? {
          tag: "unsupported",
          failures: [
            {
              failedFact: "illuminationEffect",
              mechanicsPath: spellActivationEffectPath(
                PositiveInteger(1),
                missingPath,
              ),
            },
          ],
        }
      : { tag: "supported", value: illumination };
  return saveGateNarrowedParseWithFailures(failures, illuminationParse, []);
}

function saveGatedAttackRollAdvantageMechanicsIssue(
  failedFact: SaveGatedAttackRollAdvantageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedAttackRollAdvantageMechanicsIssue {
  const definition = SAVE_GATED_ATTACK_ROLL_ADVANTAGE_FAILED_FACTS.find(
    (candidate) => candidate.failedFact === failedFact,
  );
  if (definition === undefined) {
    throw new Error(
      "SaveGatedAttackRollAdvantageFailedFact derives from SAVE_GATED_ATTACK_ROLL_ADVANTAGE_FAILED_FACTS and must have a definition.",
    );
  }
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedAttackRollAdvantage",
    failedFact,
    mechanicsPath,
    message: definition.message,
  };
}

function saveGatedAttackRollAdvantageMechanicsEvidence(
  spell: SpellMechanicsSource,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...saveGateSupportedDurationPaths(spell.mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...saveGateFailureEffectPaths(phase.onFail),
  ];
  consumed.push(
    ...spellConsumedMaterialEvidencePaths(spell.mechanics.components),
  );
  return { consumed, unowned: [] };
}

function areaSaveGatedAttackRollAdvantageMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedAttackRollAdvantageMechanicsFacts | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = pointOriginCubeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedSaveFacts = visibilityGrantingAreaFailedSaveFacts(phase.onFail);
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      hasPointRangeFeet(spell, 60),
      hasOneMinuteConcentrationDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "dex",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
      failedSaveFacts !== null,
    )
  ) {
    return null;
  }
  if (failedSaveFacts === null) return null;

  return {
    targeting: {
      kind: "pointOriginCube",
      sideFeet: movementFeet(saveGate.sideFeet),
    },
    ability: phase.ability,
    dc: phase.dc,
    illumination: failedSaveFacts.illumination,
  };
}

function visibilityGrantingAreaFailedSaveFacts(
  effect: SaveGateFailedEffect | undefined,
): {
  readonly illumination: SaveGateAttackRollAdvantageSpell["illumination"];
} | null {
  if (effect === undefined) return null;
  if (effect.kind !== "composite") return null;
  if (effect.effects.length !== 3) return null;
  const attackAdvantageEffects = effect.effects.filter(
    isAttackRollAdvantageEffect,
  );
  const suppressesInvisible = effect.effects.some(
    isInvisibleBenefitSuppression,
  );
  const illumination = dimIlluminationFactsFromEffects(effect.effects);
  if (attackAdvantageEffects.length !== 1) return null;
  if (!suppressesInvisible) return null;
  if (illumination === null) return null;
  return { illumination };
}

type DimIlluminationEffect = Extract<
  SaveGateFailedEffect,
  { readonly kind: "emit_dim_illumination" }
>;

function singleDimIlluminationFacts(
  effects: readonly SaveGateFailedEffect[],
): ReturnType<typeof illuminationEmissionFactsFromSurface> | null {
  const illuminationEffects = effects.filter(
    (candidate): candidate is DimIlluminationEffect =>
      candidate.kind === "emit_dim_illumination",
  );
  if (illuminationEffects.length !== 1) return null;
  const illuminationEffect = illuminationEffects[0];
  if (illuminationEffect === undefined) return null;
  return illuminationEmissionFactsFromSurface({
    effect: illuminationEffect,
    opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
  });
}

function dimIlluminationFactsFromEffects(
  effects: readonly SaveGateFailedEffect[],
): DimIlluminationEmissionFacts | null {
  const illumination = singleDimIlluminationFacts(effects);
  if (illumination === null || illumination.emission.kind !== "dim") {
    return null;
  }
  return {
    emission: illumination.emission,
    opaqueCoverInteraction: {
      kind: illumination.opaqueCoverInteraction.kind,
    },
  };
}

function isAttackRollAdvantageEffect(
  effect: SaveGateFailedEffect,
): effect is ModifyRollAdvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    allAdmissionFactsHold(
      effect.mode === "advantage",
      sameStringSet(effect.on, ["attack_roll"]),
    )
  );
}

function isInvisibleBenefitSuppression(effect: SaveGateFailedEffect): boolean {
  return (
    effect.kind === "suppress_condition_benefit" &&
    effect.condition === "invisible"
  );
}

export function creatureTypeRestrictedCharmSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 24 },
    targetCreatureType: "beast",
    saveRollModeRule: null,
  });
}

export function humanoidCharmSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  return creatureTypeCharmedSaveGateConditionSpell({
    spell,
    duration: { unit: "hour", amount: 1 },
    targetCreatureType: "humanoid",
    saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
  });
}

export function sensoryConditionChoiceSaveGateSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const failedCondition =
    failedEffect?.kind === "apply_condition" ? failedEffect.condition : null;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== SENSORY_CONDITION_CHOICE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SENSORY_CONDITION_CHOICE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    failedCondition === null ||
    typeof failedCondition === "string" ||
    !("kind" in failedCondition) ||
    failedCondition.kind !== "choose" ||
    !sameStringSet(
      failedCondition.from,
      SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
    ) ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  const targetCountFacts = saveGateTargetCountFactsFromSelection(
    targetSelection,
    spell.mechanics.level,
  );
  if (
    targetCountFacts === null ||
    !isCreatureOnlyTargetSelection(targetSelection)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "targetList",
      count: targetCountFacts,
    },
    targetCreatureTypes: null,
    effect: {
      kind: "choice",
      choices: SENSORY_CONDITION_CHOICE_FAILED_SAVE_CONDITIONS,
      expiresAt: { kind: "duration", durationTicks: durationTicks.success },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
  };
}

export function humanoidParalysisSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  return paralyzedTargetListSaveGateConditionSpell({
    spell,
    baseSpellLevel: HUMANOID_PARALYSIS_BASE_SPELL_LEVEL,
    rangeFeet: HUMANOID_PARALYSIS_RANGE_FEET,
    targetCreatureTypes: HUMANOID_PARALYSIS_TARGET_CREATURE_TYPES,
  });
}

export function creatureParalysisSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  return paralyzedTargetListSaveGateConditionSpell({
    spell,
    baseSpellLevel: CREATURE_PARALYSIS_BASE_SPELL_LEVEL,
    rangeFeet: CREATURE_PARALYSIS_RANGE_FEET,
    targetCreatureTypes: null,
  });
}

function paralyzedTargetListSaveGateConditionSpell(input: {
  readonly spell: SpellMechanicsSource;
  readonly baseSpellLevel: number;
  readonly rangeFeet: number;
  readonly targetCreatureTypes: readonly CreatureType[] | null;
}): SaveGateConditionSpell | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !== input.baseSpellLevel ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== input.rangeFeet ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    !isCreatureOnlyTargetSelection(targetSelection) ||
    !matchesOptionalCreatureTypeFilter(
      targetSelection,
      input.targetCreatureTypes,
    ) ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== PARALYSIS_FAILED_SAVE_CONDITION ||
    repeatSave === undefined ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.rollMode !== undefined ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.onFailAgain !== undefined ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  const targetCountFacts = saveGateTargetCountFactsFromSelection(
    targetSelection,
    spell.mechanics.level,
  );
  if (targetCountFacts === null) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "targetList",
      count: targetCountFacts,
    },
    targetCreatureTypes: input.targetCreatureTypes,
    effect: {
      kind: "fixed",
      condition: PARALYSIS_FAILED_SAVE_CONDITION,
      expiresAt: {
        kind: "concentration",
        durationTicks: durationTicks.success,
      },
      escape: null,
      turnStartDamage: null,
      repeatSave: {
        ability: phase.ability,
        dc: phase.dc,
      },
    },
    saveRollModeRule: null,
  };
}

function matchesOptionalCreatureTypeFilter(
  targetSelection: TargetSelection,
  targetCreatureTypes: readonly CreatureType[] | null,
): boolean {
  const typeFilter =
    "typeFilter" in targetSelection ? targetSelection.typeFilter : undefined;
  return targetCreatureTypes === null
    ? typeFilter === undefined
    : sameStringSet(typeFilter ?? [], targetCreatureTypes);
}

function isCreatureOnlyTargetSelection(
  targetSelection: TargetSelection,
): boolean {
  return (
    targetSelection.targetKinds === undefined ||
    sameStringSet(targetSelection.targetKinds, ["creature"])
  );
}

function targetSelectionMatchesCreatureType(
  targetSelection: TargetSelection | null,
  creatureType: CreatureType,
): boolean {
  if (targetSelection === null || !("typeFilter" in targetSelection)) {
    return false;
  }
  return (
    targetSelection.typeFilter?.length === 1 &&
    targetSelection.typeFilter[0] === creatureType
  );
}

function creatureTypeCharmedSaveGateConditionSpell(input: {
  readonly spell: SpellMechanicsSource;
  readonly duration: { readonly unit: "hour"; readonly amount: 1 | 24 };
  readonly targetCreatureType: CreatureType;
  readonly saveRollModeRule: SpellSavingThrowRollModeRule | null;
}): SaveGateConditionSpell | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const failedEffect = phase?.kind === "save_gate" ? phase.onFail : undefined;
  const targetSelection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const earlyEnd = spellDurationChildCoordinates(spell.mechanics.duration)
    .filter(
      (child) => child.branch === "ending" && child.ending.kind === "earlyEnd",
    )
    .flatMap((child) =>
      child.branch === "ending" && child.ending.kind === "earlyEnd"
        ? [child.ending.trigger]
        : [],
    );
  if (
    spell.mechanics.level !== 1 ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== input.duration.unit ||
    spell.mechanics.duration.value.amount !== input.duration.amount ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_damaged_by_caster_or_ally" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "wis" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "none" ||
    targetSelection === null ||
    targetSelection.mode !== "choose_up_to" ||
    !isCreatureOnlyTargetSelection(targetSelection) ||
    !targetSelectionMatchesCreatureType(
      targetSelection,
      input.targetCreatureType,
    ) ||
    failedEffect?.kind !== "apply_condition" ||
    failedEffect.condition !== "charmed"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  const targetCountFacts = saveGateTargetCountFactsFromSelection(
    targetSelection,
    spell.mechanics.level,
  );
  if (targetCountFacts === null) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "targetList",
      count: targetCountFacts,
    },
    targetCreatureTypes: [input.targetCreatureType],
    effect: {
      kind: "fixed",
      condition: "charmed",
      expiresAt: { kind: "duration", durationTicks: durationTicks.success },
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: input.saveRollModeRule,
  };
}

export function hitPointBudgetBlindedSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = selfOriginConeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedEffect = phase.onFail;
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      spell.mechanics.range.kind === "self",
      hasOneRoundTimedDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "con",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET,
      isFailedSaveCondition(
        failedEffect,
        HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
      ),
    )
  ) {
    return null;
  }
  return {
    phase,
    targeting: {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(saveGate.lengthFeet),
    },
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: HIT_POINT_BUDGET_FAILED_SAVE_CONDITION,
      expiresAt: "endOfCasterNextTurn",
      escape: null,
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
  };
}

export function persistentAreaRestrainedSaveGateConditionSpell(
  spell: SpellMechanicsSource,
): SaveGateConditionSpell | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const saveGate = pointOriginCubeSaveGatePhase(spell.mechanics.phases[0]);
  if (saveGate === null) return null;
  const phase = saveGate.phase;
  const failedEffect = phase.onFail;
  if (
    !allAdmissionFactsHold(
      spell.mechanics.level === 1,
      spellHasActionCastingTime(spell),
      hasPointRangeFeet(spell, AREA_RESTRAINT_RANGE_FEET),
      hasOneMinuteConcentrationDuration(spell),
      spell.mechanics.phases.length === 1,
      !hasSaveGateRepeatSaves(phase),
      phase.ability === "str",
      phase.dc.kind === "caster_spell_save_dc",
      phase.onSuccess.kind === "none",
      saveGate.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET,
      isFailedSaveCondition(failedEffect, AREA_RESTRAINT_FAILED_SAVE_CONDITION),
    )
  ) {
    return null;
  }
  return {
    phase,
    targeting: {
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(saveGate.sideFeet),
    },
    targetCreatureTypes: null,
    effect: {
      kind: "fixed",
      condition: AREA_RESTRAINT_FAILED_SAVE_CONDITION,
      expiresAt: "concentration",
      escape: {
        kind: "abilityCheck",
        ability: "str",
        skill: "athletics",
        allowedActor: "target",
        successEnds: "condition",
      },
      turnStartDamage: null,
      repeatSave: null,
    },
    saveRollModeRule: null,
  };
}

export function supportedSaveGateDamageProfile(
  input: {
    readonly spell: BattleSpellAdmissionSource;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SupportedSpellInvocation[] {
  const projection = saveGatedDamageMechanicsFacts(input.spell);
  if (projection.tag !== "supported") {
    return [];
  }
  if (
    isCantripSpellAccess(input.access)
      ? input.spell.spellDefinitionRuleFacts.level !== 0
      : input.spell.spellDefinitionRuleFacts.level < 1
  ) {
    return [];
  }
  return saveGatedDamageInvocationsFromFacts({
    ...input,
    spell: battleSpellExecutionSourceFromAdmission(input.spell),
    facts: {
      ...input.spell.spellDefinitionRuleFacts,
      ...projection.facts,
    },
  });
}

/** Parse the save-gate mechanics once, without access, slot, or caster state. */
export function saveGatedDamageMechanicsFacts(
  spell: SpellMechanicsSource,
): SaveGatedDamageMechanicsProjection {
  if (spell.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  if (!isSaveGatedDamageRootShape(phase)) {
    return { tag: "notRepresented" };
  }
  const postSaveAreaEffect = saveGatedDamagePostSaveAreaEffect(
    spell,
    phase,
    spell.mechanics.phases[1],
  );
  const targeting = saveGatedDamageTargeting(spell, phase.attachment);
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : targeting === null
        ? null
        : areaSaveGateSpellRangeFeet(spell.mechanics.range, targeting);
  const failedSaveEffects = supportedSaveGateFailedSaveEffects(
    spell,
    phase,
    phase.onFail,
    postSaveAreaEffect,
  );
  const issues: SaveGatedDamageMechanicsIssue[] = [];
  if (!spellHasActionCastingTime(spell)) {
    issues.push(
      saveGateMechanicsIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  }
  if (targeting === null) {
    issues.push(
      saveGateMechanicsIssue(
        "phaseAttachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    );
  }
  if (targeting !== null && rangeFeet === null) {
    issues.push(
      saveGateMechanicsIssue("range", spellMechanicsHeaderPath("range")),
    );
  }
  const expectedPhaseCount = saveGatedDamagePhaseCount(postSaveAreaEffect);
  if (spell.mechanics.phases.length !== expectedPhaseCount) {
    const firstMissingOrExtraPhase =
      Math.min(spell.mechanics.phases.length, expectedPhaseCount) + 1;
    if (spell.mechanics.phases.length > expectedPhaseCount) {
      for (
        let phaseOrdinal = expectedPhaseCount + 1;
        phaseOrdinal <= spell.mechanics.phases.length;
        phaseOrdinal += 1
      ) {
        issues.push(
          saveGateMechanicsIssue(
            "extraPhase",
            spellActivationPhasePath(PositiveInteger(phaseOrdinal)),
          ),
        );
      }
    } else {
      issues.push(
        saveGateMechanicsIssue(
          "missingPhase",
          spellActivationPhasePath(PositiveInteger(firstMissingOrExtraPhase)),
        ),
      );
    }
  }
  if (!saveGateDamageSuccessIsSupported(phase)) {
    issues.push(
      saveGateMechanicsIssue(
        "successOutcome",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
  const narrowedFailedSaveEffects =
    failedSaveEffects === null
      ? null
      : saveGatedDamageFailedSaveEffects(failedSaveEffects);
  if (failedSaveEffects === null) {
    issues.push(
      saveGateMechanicsIssue(
        "failedSaveEffect",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  } else if (narrowedFailedSaveEffects === null) {
    issues.push(
      saveGateMechanicsIssue(
        "damageType",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(issues);
  if (nonEmptyIssues !== undefined) {
    return { tag: "unsupported", issues: nonEmptyIssues };
  }
  const readyFacts = saveGateReadyFacts({
    targeting,
    rangeFeet,
    failedSaveEffects: narrowedFailedSaveEffects,
  });
  if (readyFacts === null) {
    return {
      tag: "unsupported",
      issues: [
        saveGateMechanicsIssue(
          "requiredFacts",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    };
  }
  return {
    tag: "supported",
    facts: {
      ability: phase.ability,
      dc: phase.dc,
      targeting: readyFacts.targeting,
      rangeFeet: readyFacts.rangeFeet,
      saveRollModeRule: saveGatedDamageSaveRollModeRule(spell, phase),
      successDamage: phase.onSuccess.kind === "half_damage" ? "half" : "none",
      failedSaveEffects: readyFacts.failedSaveEffects,
      postSaveAreaEffect,
    },
    evidence: saveGatedDamageMechanicsEvidence(spell, postSaveAreaEffect),
  };
}

type SaveGateReadyFacts = {
  readonly targeting: SaveGatedDamageSpellTargeting;
  readonly rangeFeet: MovementFeet;
  readonly failedSaveEffects: SaveGatedDamageFailedSaveEffects;
};

function saveGateReadyFacts(input: {
  readonly targeting: SaveGatedDamageSpellTargeting | null;
  readonly rangeFeet: MovementFeet | null;
  readonly failedSaveEffects: SaveGatedDamageFailedSaveEffects | null;
}): SaveGateReadyFacts | null {
  if (
    input.targeting === null ||
    input.rangeFeet === null ||
    input.failedSaveEffects === null
  ) {
    return null;
  }
  const { targeting, rangeFeet, failedSaveEffects } = input;
  return { targeting, rangeFeet, failedSaveEffects };
}

function isSaveGatedDamageRootShape(phase: SaveGatePhase): boolean {
  if (phase.repeatSaves !== undefined) {
    return false;
  }
  return phase.onFail.kind === "damage"
    ? true
    : phase.onFail.kind === "composite" &&
        phase.onFail.effects[0]?.kind === "damage";
}

function saveGateMechanicsIssue(
  failedFact: SaveGateFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SaveGatedDamageMechanicsIssue {
  const definition = SAVE_GATE_FAILED_FACTS.find(
    (candidate) => candidate.failedFact === failedFact,
  );
  if (definition === undefined) {
    throw new Error(
      "SaveGateFailedFact derives from SAVE_GATE_FAILED_FACTS and must have a definition.",
    );
  }
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "saveGatedDamage",
    failedFact,
    mechanicsPath,
    message: definition.message,
  };
}

function saveGatedDamageFailedSaveEffects(
  effects: SaveGateFailedSaveEffects,
): SaveGatedDamageFailedSaveEffects | null {
  const damage = isDamageType(effects.damage.damageType)
    ? { ...effects.damage, damageType: effects.damage.damageType }
    : null;
  if (damage === null) {
    return null;
  }
  const additionalDamageComponents = effects.additionalDamageComponents.map(
    (damage) =>
      isDamageType(damage.damageType)
        ? { ...damage, damageType: damage.damageType }
        : null,
  );
  const typedAdditionalDamageComponents = additionalDamageComponents.filter(
    isSaveGatedDamageEffectWithType,
  );
  if (
    typedAdditionalDamageComponents.length !== additionalDamageComponents.length
  ) {
    return null;
  }
  return {
    ...effects,
    damage,
    additionalDamageComponents: typedAdditionalDamageComponents,
  };
}

function isSaveGatedDamageEffectWithType(
  effect: SaveGatedDamageEffect | null,
): effect is SaveGatedDamageEffect {
  return effect !== null;
}

function saveGatedDamageMechanicsEvidence(
  spell: SpellMechanicsSource,
  postSaveAreaEffect: SpellPostSaveAreaEffect | null,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(spell.mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
  ];
  const secondPhase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[1]
      : undefined;
  if (postSaveAreaEffect !== null && secondPhase?.kind === "direct") {
    consumed.push(
      spellActivationPhasePath(PositiveInteger(2)),
      spellActivationAttachmentPath(PositiveInteger(2)),
      ...(secondPhase.effects ?? []).map((_, index) =>
        spellActivationEffectPath(
          PositiveInteger(2),
          PositiveInteger(index + 1),
        ),
      ),
    );
  }
  consumed.push(
    ...spellConsumedMaterialEvidencePaths(spell.mechanics.components),
  );
  return { consumed, unowned: [] };
}

export function saveGatedDamageInvocationsFromFacts(
  input: {
    readonly spell: SaveGatedDamageInvocation["spell"];
    readonly facts: SpellDefinitionRuleFacts & SaveGatedDamageMechanicsFacts;
    readonly slotLevel?: SpellSlotLevel;
    readonly characterLevel?: number;
  } & DamageSpellSource,
): readonly SaveGatedDamageInvocation[] {
  const primaryDamageExpr = supportedDamageAmountExpr({
    amount: input.facts.failedSaveEffects.damage.amount,
    spellLevel: input.facts.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (primaryDamageExpr === null) {
    return [];
  }
  const damageComponents: [
    SupportedDamageComponent,
    ...SupportedDamageComponent[],
  ] = [
    {
      expr: primaryDamageExpr,
      damageType: input.facts.failedSaveEffects.damage.damageType,
    },
  ];
  for (const damage of input.facts.failedSaveEffects
    .additionalDamageComponents) {
    const expr = supportedDamageAmountExpr({
      amount: damage.amount,
      spellLevel: input.facts.level,
      slotLevel: input.slotLevel,
      characterLevel: input.characterLevel,
    });
    if (expr === null || !isDamageType(damage.damageType)) {
      return [];
    }
    damageComponents.push({ expr, damageType: damage.damageType });
  }
  const [resolvedPrimaryDamage, ...additionalDamageComponents] =
    damageComponents;
  const saveGatedInvocation = {
    procedure: "saveGatedDamage" as const,
    spell: input.spell,
    castingTime: { kind: "action" as const },
    ability: input.facts.ability,
    dc: input.facts.dc,
    targeting: input.facts.targeting,
    damage: {
      expr: resolvedPrimaryDamage.expr,
      damageType: resolvedPrimaryDamage.damageType,
    },
    additionalDamageComponents,
    successDamage: input.facts.successDamage,
    rangeFeet: input.facts.rangeFeet,
    failedSavePostDamageRiders: input.facts.failedSaveEffects.postDamageRiders,
    failedSaveConditionEffects: input.facts.failedSaveEffects.conditionEffects,
    failedSaveAbilityChoices: input.facts.failedSaveEffects.abilityChoices,
    saveRollModeRule: input.facts.saveRollModeRule,
    ...(input.facts.postSaveAreaEffect === null
      ? {}
      : { postSaveAreaEffect: input.facts.postSaveAreaEffect }),
  };
  return [{ ...damageSpellSource(input), ...saveGatedInvocation }];
}

function saveGateDamageSuccessIsSupported(
  phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    phase.onSuccess.kind === "none" || phase.onSuccess.kind === "half_damage"
  );
}

function isDamageType(value: unknown): value is DamageType {
  return (
    typeof value === "string" &&
    DAMAGE_TYPES.includes(value as (typeof DAMAGE_TYPES)[number])
  );
}

export function saveGateTargeting(
  attachment: Attachment,
): SaveGatedDamageSpellTargeting | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "target" &&
    value.selection.mode === "one" &&
    (value.selection.targetKinds === undefined ||
      sameStringSet(value.selection.targetKinds, ["creature"]))
  ) {
    return { kind: "singleCombatant" };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cylinder" &&
    typeof value.shape.radiusFeet === "number" &&
    typeof value.shape.heightFeet === "number"
  ) {
    return {
      kind: "pointOriginCylinder",
      radiusFeet: movementFeet(value.shape.radiusFeet),
      heightFeet: movementFeet(value.shape.heightFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === SUPPORTED_POINT_CUBE_SAVE_GATE_SIDE_FEET
  ) {
    return {
      kind: "pointOriginCubeExcludingCaster",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cube" &&
    value.shape.sideFeet === 15
  ) {
    return {
      kind: "selfOriginCube",
      sideFeet: movementFeet(value.shape.sideFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === SUPPORTED_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  if (
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "line" &&
    value.shape.lengthFeet === SIMPLE_LINE_DAMAGE_PROFILE_LENGTH_FEET &&
    value.shape.widthFeet === SIMPLE_LINE_DAMAGE_PROFILE_WIDTH_FEET
  ) {
    return {
      kind: "selfOriginLine",
      lengthFeet: movementFeet(value.shape.lengthFeet),
      widthFeet: movementFeet(value.shape.widthFeet),
    };
  }
  return null;
}

function saveGatedDamageTargeting(
  spell: SpellMechanicsSource,
  attachment: Attachment,
): SaveGatedDamageSpellTargeting | null {
  return (
    saveGateTargeting(attachment) ??
    level5SelfOriginConeTargeting(spell, attachment) ??
    largeFireSphereTargeting(spell, attachment) ??
    smallThunderSphereTargeting(spell, attachment)
  );
}

function level5SelfOriginConeTargeting(
  spell: SpellMechanicsSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "selfOriginCone" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === 5 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "self" &&
    value.kind === "area" &&
    value.origin.kind === "self" &&
    value.shape.kind === "cone" &&
    value.shape.lengthFeet === LEVEL5_SELF_CONE_SAVE_GATE_LENGTH_FEET
  ) {
    return {
      kind: "selfOriginCone",
      lengthFeet: movementFeet(value.shape.lengthFeet),
    };
  }
  return null;
}

function largeFireSphereTargeting(
  spell: SpellMechanicsSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL &&
    spellHasActionCastingTime(spell) &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === LARGE_FIRE_SPHERE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

function smallThunderSphereTargeting(
  spell: SpellMechanicsSource,
  attachment: Attachment,
): Extract<SpellTargeting, { readonly kind: "pointOriginSphere" }> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    spell.mechanics.level === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === SMALL_THUNDER_SPHERE_RANGE_FEET &&
    value.kind === "area" &&
    value.origin.kind === "point_within_range" &&
    value.shape.kind === "sphere" &&
    value.shape.radiusFeet === SMALL_THUNDER_SPHERE_RADIUS_FEET
  ) {
    return {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}

export function areaSaveGateSpellRangeFeet(
  range: BattleSpellAdmissionSource["mechanics"]["range"],
  targeting: Exclude<
    SpellTargeting,
    { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
  >,
): MovementFeet | null {
  return Match.value(targeting).pipe(
    Match.when({ kind: "pointOriginSphere" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "pointOriginSphereDiameter" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCubeExcludingCaster" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCube" }, () => fixedPointRangeFeet(range)),
    Match.when({ kind: "pointOriginGroundSquare" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "selfOriginCube" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginCone" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginLine" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "selfOriginEmanation" }, () =>
      range.kind === "self" ? movementFeet(0) : null,
    ),
    Match.when({ kind: "primaryTargetOriginEmanation" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "pointOriginCylinder" }, () =>
      fixedPointRangeFeet(range),
    ),
    Match.when({ kind: "targetList" }, () => fixedPointRangeFeet(range)),
    Match.exhaustive,
  );
}

function fixedPointRangeFeet(
  range: BattleSpellAdmissionSource["mechanics"]["range"],
): MovementFeet | null {
  return isFixedDistancePointRange(range) ? movementFeet(range.feet) : null;
}

export function supportedSaveGateFailedSaveEffects(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): {
  readonly damage: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>;
  readonly additionalDamageComponents: readonly Extract<
    SaveGateFailureEffect,
    { readonly kind: "damage" }
  >[];
  readonly postDamageRiders: readonly SpellFailedSavePostDamageRider[];
  readonly conditionEffects: readonly SpellFailedSaveConditionEffect[];
  readonly abilityChoices: readonly Ability[] | null;
} | null {
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    effect.kind === "damage"
  ) {
    return null;
  }
  if (effect.kind === "damage") {
    return {
      damage: effect,
      additionalDamageComponents: [],
      postDamageRiders: [],
      conditionEffects: [],
      abilityChoices: null,
    };
  }
  if (effect.kind !== "composite") {
    return null;
  }
  const [damage, ...remainingEffects] = effect.effects;
  if (damage?.kind !== "damage") {
    return null;
  }
  const additionalDamageComponents = remainingEffects.filter(
    (
      component,
    ): component is Extract<
      SaveGateFailureEffect,
      { readonly kind: "damage" }
    > => component.kind === "damage",
  );
  const riders = remainingEffects.filter(
    (component) => component.kind !== "damage",
  );
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    !isSelfOriginCubeFailedSaveDamageShape(damage)
  ) {
    return null;
  }
  if (
    postSaveAreaEffect?.kind === "selfOriginCubePush" &&
    riders.filter((rider) =>
      isSelfOriginCubeCreaturePushRiderShape(phase, rider),
    ).length !== 1
  ) {
    return null;
  }
  const failedSaveForcedReactionMovementCount = riders.filter((rider) =>
    isFailedSaveForcedReactionMovementShape(spell, phase, rider),
  ).length;
  if (
    (failedSaveForcedReactionMovementCount > 0 &&
      (failedSaveForcedReactionMovementCount !== 1 ||
        !isFailedSaveForcedReactionMovementDamageShape(damage))) ||
    (isFailedSaveForcedReactionMovementDamageShape(damage) &&
      failedSaveForcedReactionMovementCount !== 1)
  ) {
    return null;
  }
  const conditionSupport = supportedFailedSaveConditionEffects(
    spell,
    phase,
    riders,
  );
  if (conditionSupport === null) {
    return null;
  }
  const postDamageRiderCandidates = riders.filter(
    (rider) => !conditionSupport.consumedEffects.includes(rider),
  );
  const postDamageRiders = supportedFailedSavePostDamageRiders(
    spell,
    phase,
    postDamageRiderCandidates,
    postSaveAreaEffect,
  );
  return postDamageRiders === null
    ? null
    : {
        damage,
        additionalDamageComponents,
        postDamageRiders,
        conditionEffects: conditionSupport.conditionEffects,
        abilityChoices: conditionSupport.abilityChoices,
      };
}

type FailedSaveConditionSupport = {
  readonly conditionEffects: readonly SpellFailedSaveConditionEffect[];
  readonly abilityChoices: readonly Ability[] | null;
  readonly consumedEffects: readonly SaveGateFailureEffect[];
};

function supportedFailedSaveConditionEffects(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
): FailedSaveConditionSupport | null {
  const chosenAbilitySaveDisadvantageProfileShape =
    chosenAbilitySaveDisadvantageConditionSupport(spell, phase, effects);
  if (chosenAbilitySaveDisadvantageProfileShape !== null) {
    return chosenAbilitySaveDisadvantageProfileShape;
  }
  return { conditionEffects: [], abilityChoices: null, consumedEffects: [] };
}

function chosenAbilitySaveDisadvantageConditionSupport(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
): FailedSaveConditionSupport | null {
  const poisoned = effects.find(
    (effect) =>
      effect.kind === "apply_condition" && effect.condition === "poisoned",
  );
  const disadvantage = effects.find(isChosenAbilitySaveDisadvantage);
  if (poisoned === undefined && disadvantage === undefined) {
    return null;
  }
  if (
    poisoned === undefined ||
    disadvantage === undefined ||
    !isChosenAbilitySaveDisadvantageSpellShape(spell, phase)
  ) {
    return null;
  }
  const abilityChoices = disadvantage.saveAbilityFilter.value.options;
  const repeatSave = phase.repeatSaves?.[0];
  if (
    repeatSave === undefined ||
    phase.repeatSaves?.length !== 1 ||
    repeatSave.cadence !== "end_of_target_turn" ||
    repeatSave.onSuccess !== "ends_on_target" ||
    repeatSave.successesRequired !== 3 ||
    repeatSave.failuresRequired !== 3 ||
    repeatSave.onFailureThreshold !== "locks_duration"
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  if (Result.isFailure(durationTicks)) {
    return null;
  }
  return {
    conditionEffects: [
      {
        kind: "fixed",
        condition: "poisoned",
        expiresAt: {
          kind: "duration",
          durationTicks: durationTicks.success,
        },
        escape: null,
        turnStartDamage: null,
        repeatSave: {
          kind: "counted",
          save: { ability: phase.ability, dc: phase.dc },
          successThreshold: repeatSave.successesRequired,
          failureThreshold: repeatSave.failuresRequired,
          savingThrowDisadvantageAbilities: abilityChoices,
        },
      },
    ],
    abilityChoices,
    consumedEffects: [poisoned, disadvantage],
  };
}

function isChosenAbilitySaveDisadvantageSpellShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): spell is TimedBattleSpell {
  return (
    spell.mechanics.level === 5 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.amount === 7 &&
    spell.mechanics.duration.value.unit === "day" &&
    phase.ability === "con" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none"
  );
}

function isChosenAbilitySaveDisadvantage(
  effect: SaveGateFailureEffect,
): effect is ChosenAbilitySaveDisadvantageEffect {
  return (
    effect.kind === "modify_roll_advantage" &&
    effect.mode === "disadvantage" &&
    (effect.affects ?? "self_roll") === "self_roll" &&
    sameStringSet(effect.on ?? [], ["saving_throw"]) &&
    chosenAbilitySaveDisadvantageChoices(effect) !== null
  );
}

function chosenAbilitySaveDisadvantageChoices(
  effect: ModifyRollAdvantageEffect,
): readonly [Ability, ...Ability[]] | null {
  const filter = effect.saveAbilityFilter;
  if (
    filter === undefined ||
    Array.isArray(filter) ||
    !("kind" in filter) ||
    filter.kind !== "hole"
  ) {
    return null;
  }
  return filter.value.options;
}

export function supportedFailedSavePostDamageRiders(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effects: readonly SaveGateFailureEffect[],
  postSaveAreaEffect: SpellPostSaveAreaEffect | null = null,
): readonly SpellFailedSavePostDamageRider[] | null {
  const riders: SpellFailedSavePostDamageRider[] = [];
  for (const effect of effects) {
    if (
      postSaveAreaEffect?.kind === "selfOriginCubePush" &&
      isSelfOriginCubeCreaturePushRiderShape(phase, effect)
    ) {
      continue;
    }
    if (
      effect.kind === "forced_reaction_movement" &&
      isFailedSaveForcedReactionMovementShape(spell, phase, effect)
    ) {
      riders.push({
        kind: "forcedReactionMovement",
        direction: "awayFromCaster",
        route: "safest",
        distance: "asFarAsPossible",
        cost: "targetReactionIfAvailable",
      });
      continue;
    }
    if (
      effect.kind !== "modify_roll_advantage" ||
      effect.mode !== "disadvantage" ||
      !sameStringSet(effect.on ?? [], ["attack_roll"]) ||
      effect.count !== 1 ||
      effect.expiresOn?.kind !== "end_of_next_turn" ||
      (effect.affects ?? "self_roll") !== "self_roll" ||
      !isPsychicDamageNextAttackDisadvantageRiderShape(spell, phase)
    ) {
      return null;
    }
    riders.push({
      kind: "nextAttackRollByTarget",
      mode: "disadvantage",
      expiresAt: "endOfTargetNextTurn",
    });
  }
  return riders;
}

function isFailedSaveForcedReactionMovementShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spellHasActionCastingTime(spell) &&
    spell.mechanics.range.kind === "point" &&
    spell.mechanics.range.feet === 60 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "forced_reaction_movement" &&
    effect.cost === "target_reaction_if_available" &&
    effect.direction === "away_from_caster" &&
    effect.distance === "as_far_as_possible" &&
    effect.route === "safest_available" &&
    effect.unavailable === "no_movement"
  );
}

function isFailedSaveForcedReactionMovementDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  if (amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    effect.damageType === "psychic",
    amount.axis === "slot",
    amount.startingAtLevel === 1,
    amount.base.dice === 3,
    amount.base.dieSize === 6,
    amount.base.flat === undefined,
    amount.base.spellcastingMod === undefined,
    amount.base.abilityModifier === undefined,
    amount.perLevel.dice === 1,
    amount.perLevel.dieSize === undefined,
    amount.perLevel.flat === undefined,
  );
}

function saveGatedDamagePostSaveAreaEffect(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return (
    objectIgnitingSphericalBurstPostSaveAreaEffect(spell, phase, directPhase) ??
    objectAffectingThunderBurstPostSaveAreaEffect(spell, phase, directPhase) ??
    forcedMovementCubeBurstPostSaveAreaEffect(spell, phase, directPhase)
  );
}

function saveGatedDamagePhaseCount(
  postSaveAreaEffect: SpellPostSaveAreaEffect | null,
): number {
  if (postSaveAreaEffect === null) {
    return 1;
  }
  return Match.value(postSaveAreaEffect).pipe(
    Match.when({ kind: "areaObjectIgnition" }, () => 2),
    Match.when({ kind: "selfOriginCubePush" }, () => 2),
    Match.when({ kind: "areaObjectDamage" }, () => 1),
    Match.exhaustive,
  );
}

function saveGatedDamageSaveRollModeRule(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): SpellSavingThrowRollModeRule | null {
  return isSmallThunderSphereSaveGateDamageShape(spell, phase)
    ? { kind: "creatureType", creatureType: "construct", mode: "disadvantage" }
    : null;
}

function objectIgnitingSphericalBurstPostSaveAreaEffect(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  const damage = phase.onFail;
  const ignite =
    directPhase?.kind === "direct" ? directPhase.effects?.[0] : undefined;
  if (
    spell.mechanics.level !== LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== LARGE_FIRE_SPHERE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "sphere" ||
    phase.attachment.value.shape.radiusFeet !== LARGE_FIRE_SPHERE_RADIUS_FEET ||
    damage.kind !== "damage" ||
    damage.damageType !== "fire" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.startingAtLevel !== LARGE_FIRE_SPHERE_BASE_SPELL_LEVEL ||
    damage.amount.base.dice !== LARGE_FIRE_SPHERE_BASE_DAMAGE_DICE ||
    damage.amount.base.dieSize !== LARGE_FIRE_SPHERE_DAMAGE_DIE_SIZE ||
    damage.amount.perLevel.dice !==
      LARGE_FIRE_SPHERE_SLOT_DAMAGE_DICE_INCREMENT ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "hole" ||
    directPhase.attachment.value.kind !== "area" ||
    directPhase.attachment.value.origin.kind !== "point_within_range" ||
    directPhase.attachment.value.shape.kind !== "sphere" ||
    directPhase.attachment.value.shape.radiusFeet !==
      LARGE_FIRE_SPHERE_RADIUS_FEET ||
    directPhase.effects?.length !== 1 ||
    ignite?.kind !== "ignite_objects" ||
    ignite.filter.material !== "flammable" ||
    ignite.filter.targetRelation !== "not_worn_or_carried"
  ) {
    return null;
  }
  return { kind: "areaObjectIgnition" };
}

function objectAffectingThunderBurstPostSaveAreaEffect(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  return directPhase === undefined &&
    isSmallThunderSphereSaveGateDamageShape(spell, phase)
    ? { kind: "areaObjectDamage" }
    : null;
}

function isSmallThunderSphereSaveGateDamageShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  const damage = phase.onFail;
  if (spell.mechanics.range.kind !== "point") return false;
  if (phase.attachment.kind !== "hole") return false;
  if (phase.attachment.value.kind !== "area") return false;
  if (phase.attachment.value.origin.kind !== "point_within_range") return false;
  if (phase.attachment.value.shape.kind !== "sphere") return false;
  if (damage.kind !== "damage") return false;
  if (damage.amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    spell.mechanics.level === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL,
    spellHasActionCastingTime(spell),
    spell.mechanics.range.feet === SMALL_THUNDER_SPHERE_RANGE_FEET,
    spell.mechanics.duration.kind === "instantaneous",
    phase.ability === "con",
    phase.dc.kind === "caster_spell_save_dc",
    phase.onSuccess.kind === "half_damage",
    phase.attachment.value.shape.radiusFeet ===
      SMALL_THUNDER_SPHERE_RADIUS_FEET,
    damage.damageType === "thunder",
    damage.amount.axis === "slot",
    damage.amount.startingAtLevel === SMALL_THUNDER_SPHERE_BASE_SPELL_LEVEL,
    damage.amount.base.dice === SMALL_THUNDER_SPHERE_BASE_DAMAGE_DICE,
    damage.amount.base.dieSize === SMALL_THUNDER_SPHERE_DAMAGE_DIE_SIZE,
    damage.amount.perLevel.dice ===
      SMALL_THUNDER_SPHERE_SLOT_DAMAGE_DICE_INCREMENT,
    damage.amount.perLevel.dieSize === undefined,
    damage.amount.base.flat === undefined,
    damage.amount.base.spellcastingMod === undefined,
    damage.amount.base.abilityModifier === undefined,
    damage.amount.perLevel.flat === undefined,
  );
}

function forcedMovementCubeBurstPostSaveAreaEffect(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  directPhase: SpellActivationPhase | undefined,
): SpellPostSaveAreaEffect | null {
  if (
    spell.mechanics.level !== 1 ||
    !spellHasActionCastingTime(spell) ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    phase.ability !== "con" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.attachment.shape.kind !== "cube" ||
    phase.attachment.shape.sideFeet !== 15 ||
    directPhase?.kind !== "direct" ||
    directPhase.attachment.kind !== "area" ||
    directPhase.attachment.origin.kind !== "self" ||
    directPhase.attachment.shape.kind !== "cube" ||
    directPhase.attachment.shape.sideFeet !== 15 ||
    directPhase.effects?.length !== 2
  ) {
    return null;
  }
  const [objectPush, audibleBoom] = directPhase.effects;
  if (
    objectPush?.kind !== "push_unsecured_objects" ||
    objectPush.objectLocation !== "entirely_within_area" ||
    objectPush.originDirection !== "away_from_caster" ||
    objectPush.distanceFeet !== 10 ||
    audibleBoom?.kind !== "audible" ||
    audibleBoom.sound !== "thunderous boom" ||
    audibleBoom.audibleRadiusFeet !== 300
  ) {
    return null;
  }
  return {
    kind: "selfOriginCubePush",
    creaturePush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
    },
    unsecuredObjectPush: {
      distanceFeet: movementFeet(10),
      originDirection: "away_from_caster",
      objectLocation: "entirely_within_area",
    },
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: movementFeet(300),
    },
  };
}

function isSelfOriginCubeCreaturePushRiderShape(
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
  effect: SaveGateFailureEffect,
): boolean {
  return (
    phase.ability === "con" &&
    phase.onSuccess.kind === "half_damage" &&
    effect.kind === "force_move" &&
    effect.movementKind === "push" &&
    effect.originDirection === "away_from_caster" &&
    effect.distanceFeet === 10
  );
}

function isSelfOriginCubeFailedSaveDamageShape(
  effect: Extract<SaveGateFailureEffect, { readonly kind: "damage" }>,
): boolean {
  const amount = effect.amount;
  if (amount.kind !== "linear_per_level") return false;
  return allAdmissionFactsHold(
    effect.damageType === "thunder",
    amount.axis === "slot",
    amount.startingAtLevel === 1,
    amount.base.dice === 2,
    amount.base.dieSize === 8,
    amount.base.flat === undefined,
    amount.base.spellcastingMod === undefined,
    amount.base.abilityModifier === undefined,
    amount.perLevel.dice === 1,
    amount.perLevel.dieSize === undefined,
    amount.perLevel.flat === undefined,
  );
}

export function isPsychicDamageNextAttackDisadvantageRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "save_gate" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.ability === "wis" &&
    phase.onSuccess.kind === "none"
  );
}
