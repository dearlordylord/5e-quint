// Spell attack damage profile projections extracted from spells-profiles.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

import {
  DAMAGE_TYPES,
  attackBonus,
  movementDeltaFeet,
  movementFeet,
  PositiveInteger,
  type ReadonlyNonEmptyArray,
  type AbilityModifier,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  isFixedDistancePointRange,
  type Attachment,
  type DamageType,
  type SpellMechanics,
  type TargetSelection,
} from "@dnd/surface/surface/types";
import type {
  BattleSpellAdmissionSource,
  BattleSpellExecutionSource,
} from "../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  type SpellProcedureMechanicsEvidence,
} from "./spell-procedure-profiles/spell-mechanics-admission.ts";
import { Match } from "effect";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  cantripSpellAccessForCastingSource,
  isCantripSpellAccess,
} from "../procedure-execution/spell-invocation-vocabulary.ts";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type CantripSpellAttackSequenceTargeting,
  type DamageSpellSource,
  type PreparedDamageSpellSource,
  type PreparedSpellAttackSequenceTargeting,
  type SpellActivationPhase,
  type SpellAttackDamageTargeting,
  type SpellAttackHitEffect,
  type SpellAttackKind,
  type SpellObjectHitEffect,
  type SpellPostDamageRider,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleSpellcastingExecutionState } from "../character-battle-resource-execution.ts";
import {
  CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS,
  CHAINED_DAMAGE_TYPE_ATTACK_DAMAGE_TYPES as CHAINED_SPELL_ATTACK_DAMAGE_TYPES,
  CHAINED_SPELL_ATTACK_LEAP_RANGE_FEET,
  CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNT_TIERS as CANTRIP_MULTI_BEAM_COUNT_TIERS,
  multiRaySpellAttackRayCount,
  type MultiBeamSpellAttackBeamCount,
  type MultiRaySpellAttackRayCount,
} from "./domain-constants.ts";
import {
  sameDiceExpr,
  sameStringSet,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  targetSelectionFromAttachment,
} from "./spells-execution-facts.ts";

export type SpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
>;
export type SpellAttackSequenceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackSequence" }
>;
export type AttackBurstSaveDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "attackBurstSaveDamage" }
>;

type SpellMechanicsSource = Pick<BattleSpellAdmissionSource, "mechanics">;
type SpellAttackDamageEffect = Extract<
  SpellAttackHitEffect,
  { readonly kind: "damage" }
>;

export type SpellAttackDamageMechanicsDamageType =
  | {
      readonly kind: "fixed";
      readonly damageType: DamageType;
    }
  | {
      readonly kind: "choice";
      readonly damageTypes: readonly [DamageType, ...DamageType[]];
      readonly maxAdditionalDiceSource: "spellcasting_ability_modifier";
    };

/**
 * Mechanics-only facts retained by the spellAttackDamage owner. Dice amounts
 * remain Surface facts because their final expression depends on cast-time
 * slot or character level; no authored record identity or cast context lives
 * in this projection.
 */
export type SpellAttackDamageMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly targeting: SpellAttackDamageTargeting;
  readonly rangeFeet: MovementFeet;
  readonly attackKind: SpellAttackKind;
  readonly missDamage: SpellAttackDamageInvocation["missDamage"];
  readonly damageAmount: SpellAttackDamageEffect["amount"];
  readonly damageType: SpellAttackDamageMechanicsDamageType;
  readonly laterDamage: {
    readonly amount: SpellAttackDamageEffect["amount"];
    readonly damageType: DamageType;
  } | null;
  readonly postDamageRiders: readonly SpellPostDamageRider[];
  readonly objectHitEffect: SpellObjectHitEffect;
};

const SPELL_ATTACK_DAMAGE_PHASE_ORDINAL = PositiveInteger(1);

export const SPELL_ATTACK_DAMAGE_FAILED_FACTS = [
  "header",
  "range",
  "duration",
  "material",
  "castingTime",
  "activationPhase",
  "phaseCount",
  "attachment",
  "attackKind",
  "hitDamage",
  "missDamage",
  "laterDamage",
  "damageType",
  "objectHitEffect",
  "postDamageRiders",
  "damageAmount",
  "laterDamageAmount",
] as const;
export type SpellAttackDamageFailedFact =
  (typeof SPELL_ATTACK_DAMAGE_FAILED_FACTS)[number];

export type SpellAttackDamageMechanicsIssue = {
  readonly failedFact: SpellAttackDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
};

export type SpellAttackDamageMechanicsProjection = Omit<
  SpellAttackDamageMechanicsFacts,
  keyof SpellDefinitionRuleFacts
>;

type SpellAttackDamagePhase = Extract<
  SpellActivationPhase,
  { readonly kind: "attack_roll" }
>;

type SpellAttackDamageLaterEffect = SpellAttackDamageEffect & {
  readonly damageType: DamageType;
};

type SpellAttackDamageIndexedEffect<
  Effect extends SpellAttackHitEffect = SpellAttackHitEffect,
> = {
  readonly effect: Effect;
  readonly index: number;
};

type SpellAttackDamageLaterProjection = {
  readonly laterDamage: SpellAttackDamageIndexedEffect<SpellAttackDamageLaterEffect> | null;
  readonly postDamageEffects: readonly SpellAttackDamageIndexedEffect[];
  readonly invalidLaterDamageEffects: readonly SpellAttackDamageIndexedEffect[];
  readonly duplicateLaterDamageEffects: readonly SpellAttackDamageIndexedEffect<SpellAttackDamageLaterEffect>[];
  readonly invalidLaterDamageAmountEffects: readonly SpellAttackDamageIndexedEffect[];
};

type SpellAttackDamageRiderProjection = {
  readonly riders: readonly SpellPostDamageRider[];
  readonly unsupportedEffects: readonly SpellAttackDamageIndexedEffect[];
};

type SpellAttackDamageInitialDamageEvaluation =
  | {
      readonly tag: "supported";
      readonly effect: SpellAttackDamageEffect;
      readonly damageType: SpellAttackDamageMechanicsDamageType;
    }
  | {
      readonly tag: "unsupportedDamageType";
      readonly effect: SpellAttackDamageEffect;
      readonly damageTypeIssue: SpellAttackDamageMechanicsIssue;
    }
  | {
      readonly tag: "unsupportedDamageAmount";
      readonly effect: SpellAttackDamageEffect;
      readonly damageType: SpellAttackDamageMechanicsDamageType;
      readonly damageAmountIssue: SpellAttackDamageMechanicsIssue;
    }
  | {
      readonly tag: "unsupportedDamageTypeAndAmount";
      readonly effect: SpellAttackDamageEffect;
      readonly damageTypeIssue: SpellAttackDamageMechanicsIssue;
      readonly damageAmountIssue: SpellAttackDamageMechanicsIssue;
    };

type SpellAttackDamageInitialProjection =
  | {
      readonly tag: "missingDamageEffect";
      readonly issue: SpellAttackDamageMechanicsIssue;
    }
  | {
      readonly tag: "damageEffect";
      readonly evaluation: SpellAttackDamageInitialDamageEvaluation;
    };

type SpellAttackDamagePhaseEvaluation = {
  readonly initialDamage: SpellAttackDamageInitialProjection;
  readonly miss: SpellAttackDamageMissProjection;
  readonly laterDamage: SpellAttackDamageLaterProjection;
  readonly riders: SpellAttackDamageRiderProjection;
  readonly objectHit: ReturnType<typeof supportedSpellObjectHitEffect>;
};
type SpellAttackDamageSupportedMissEvaluation = Omit<
  SpellAttackDamagePhaseEvaluation,
  "miss"
> & {
  readonly miss: Extract<
    SpellAttackDamageMissProjection,
    { readonly tag: "supported" }
  >;
};

type SpellAttackDamageLaterEffectClassification =
  | { readonly tag: "initialDamage" }
  | {
      readonly tag: "postDamage";
      readonly occurrence: SpellAttackDamageIndexedEffect;
    }
  | {
      readonly tag: "laterDamage";
      readonly occurrence: SpellAttackDamageIndexedEffect<SpellAttackDamageLaterEffect>;
      readonly amountIsRepresented: boolean;
    }
  | {
      readonly tag: "invalidLaterDamage";
      readonly occurrence: SpellAttackDamageIndexedEffect;
      readonly amountIsRepresented: boolean;
    };

type SpellAttackDamageMissProjection =
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SpellAttackDamageMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly missDamage: SpellAttackDamageInvocation["missDamage"];
      readonly extraIssues: readonly SpellAttackDamageMechanicsIssue[];
    };

type SpellAttackDamagePhaseProjection =
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SpellAttackDamageMechanicsIssue>;
    }
  | {
      readonly tag: "supported";
      readonly damageEffect: SpellAttackDamageEffect;
      readonly missDamage: SpellAttackDamageInvocation["missDamage"];
      readonly damageType: SpellAttackDamageMechanicsDamageType;
      readonly laterDamage: SpellAttackDamageLaterEffect | null;
      readonly postDamageRiders: readonly SpellPostDamageRider[];
      readonly objectHitEffect: SpellObjectHitEffect;
    };

export type SpellAttackDamageMechanicsInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "supported";
      readonly facts: SpellAttackDamageMechanicsProjection;
      readonly evidence: SpellProcedureMechanicsEvidence;
    }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        SpellAttackDamageMechanicsIssue,
        ...SpellAttackDamageMechanicsIssue[],
      ];
    };

const EXPLODING_CANTRIP_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
  "psychic",
  "thunder",
] as const satisfies readonly DamageType[];
const PREPARED_MULTI_RAY_DAMAGE_TYPE = "fire" as const satisfies DamageType;
const PREPARED_MULTI_RAY_RANGE_FEET = 120;
const PREPARED_MULTI_RAY_ATTACK_KIND = "ranged_spell_attack" as const;
const PREPARED_MULTI_RAY_BASE_LEVEL = 2;
const PREPARED_MULTI_RAY_BASE_COUNT = 3;
const PREPARED_MULTI_RAY_COUNT_PER_SLOT_ABOVE_BASE = 1;
type MultiRayCountProgression = {
  readonly kind: "linear";
  readonly base: typeof PREPARED_MULTI_RAY_BASE_COUNT;
  readonly baseLevel: typeof PREPARED_MULTI_RAY_BASE_LEVEL;
  readonly perSlotAboveBase: typeof PREPARED_MULTI_RAY_COUNT_PER_SLOT_ABOVE_BASE;
};

export function supportedSpellAttackKind(
  attackKind: string,
): attackKind is SpellAttackKind {
  return (
    attackKind === "melee_spell_attack" || attackKind === "ranged_spell_attack"
  );
}

function spellAttackDamageMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SpellAttackDamagePhase,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellAttackDamageDurationPaths(mechanics.duration),
    spellActivationPhasePath(SPELL_ATTACK_DAMAGE_PHASE_ORDINAL),
    spellActivationAttachmentPath(SPELL_ATTACK_DAMAGE_PHASE_ORDINAL),
    ...phase.onHit.map((_effect, index) =>
      spellActivationEffectPath(
        SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
        PositiveInteger(index + 1),
      ),
    ),
    ...phase.onMiss.map((_effect, index) =>
      spellActivationEffectPath(
        SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
        PositiveInteger(phase.onHit.length + index + 1),
      ),
    ),
  ];
  consumed.push(...spellConsumedMaterialEvidencePaths(mechanics.components));
  return { consumed, unowned: [] };
}

function spellAttackDamageDurationPaths(
  duration: BattleSpellAdmissionSource["mechanics"]["duration"],
): readonly SpellMechanicsBranchPath[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, (timed) => [
      spellDurationValuePath(),
      ...(timed.value.upcastTiers ?? []).map((_tier, index) =>
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      ),
      ...(timed.earlyEnd ?? []).map((_trigger, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
      ...(timed.permanentAfter === undefined
        ? []
        : [
            spellDurationEndingPath(
              PositiveInteger((timed.earlyEnd?.length ?? 0) + 1),
            ),
          ]),
    ]),
    Match.when({ kind: "concentration" }, (concentration) => [
      spellDurationValuePath(),
      ...(concentration.earlyEnd ?? []).map((_trigger, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
      ...(concentration.permanentIfMaintainedFull === true
        ? [
            spellDurationEndingPath(
              PositiveInteger((concentration.earlyEnd?.length ?? 0) + 1),
            ),
          ]
        : []),
    ]),
    Match.when({ kind: "permanent" }, (permanent) =>
      (permanent.endsOn ?? []).map((_trigger, index) =>
        spellDurationEndingPath(PositiveInteger(index + 1)),
      ),
    ),
    Match.when({ kind: "slot_tiered" }, (slotTiered) => [
      ...spellAttackDamageDurationPaths(slotTiered.base),
      ...slotTiered.tiers.map((_tier, index) =>
        spellDurationExtensionPath(PositiveInteger(index + 1)),
      ),
    ]),
    Match.exhaustive,
  );
}

function spellAttackDamageNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function spellAttackDamageCombineIssues(
  leading: readonly SpellAttackDamageMechanicsIssue[],
  trailing: ReadonlyNonEmptyArray<SpellAttackDamageMechanicsIssue>,
): ReadonlyNonEmptyArray<SpellAttackDamageMechanicsIssue> {
  const firstLeading = leading[0];
  return firstLeading === undefined
    ? trailing
    : [firstLeading, ...leading.slice(1), ...trailing];
}

function spellAttackDamageSiblingShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SpellAttackDamagePhase,
): boolean {
  const selection = targetSelectionFromAttachment(phase.attachment);
  if (selection?.mode === "choose_up_to" || phase.continue !== undefined) {
    return true;
  }
  return mechanics.phases[1]?.kind === "save_gate";
}

export function inspectSpellAttackDamageMechanics(
  source: SpellMechanicsSource,
): SpellAttackDamageMechanicsInspection {
  const candidate = spellAttackDamageCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const { mechanics, phase } = candidate;
  const issues = spellAttackDamageHeaderIssues(mechanics);
  const targeting = spellAttackDamageTargeting(phase.attachment);
  const rangeFeet = singleSpellAttackDamageRangeFeet(
    targeting,
    mechanics.range,
  );
  if (!supportedSpellAttackKind(phase.attackKind)) {
    issues.push(
      spellAttackDamageMechanicsIssue(
        "attackKind",
        spellActivationPhasePath(SPELL_ATTACK_DAMAGE_PHASE_ORDINAL),
      ),
    );
  }
  const phaseProjection = spellAttackDamagePhaseProjection(
    source,
    phase,
    targeting,
  );
  return spellAttackDamageMechanicsResult({
    mechanics,
    phase,
    targeting,
    rangeFeet,
    phaseProjection,
    issues,
  });
}

function spellAttackDamageMechanicsResult(input: {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >;
  readonly phase: SpellAttackDamagePhase;
  readonly targeting: SpellAttackDamageTargeting | null;
  readonly rangeFeet: MovementFeet | null;
  readonly phaseProjection: SpellAttackDamagePhaseProjection;
  readonly issues: readonly SpellAttackDamageMechanicsIssue[];
}): SpellAttackDamageMechanicsInspection {
  if (input.targeting === null) {
    const attachmentIssue = spellAttackDamageMechanicsIssue(
      "attachment",
      spellActivationAttachmentPath(SPELL_ATTACK_DAMAGE_PHASE_ORDINAL),
    );
    const rangeIssue = spellAttackDamageMechanicsIssue(
      "range",
      spellMechanicsHeaderPath("range"),
    );
    return {
      tag: "unsupported",
      issues: [
        attachmentIssue,
        ...(input.rangeFeet === null ? [rangeIssue] : []),
        ...input.issues,
        ...(input.phaseProjection.tag === "unsupported"
          ? input.phaseProjection.issues
          : []),
      ],
    };
  }
  if (input.rangeFeet === null) {
    const rangeIssue = spellAttackDamageMechanicsIssue(
      "range",
      spellMechanicsHeaderPath("range"),
    );
    return {
      tag: "unsupported",
      issues: [
        rangeIssue,
        ...input.issues,
        ...(input.phaseProjection.tag === "unsupported"
          ? input.phaseProjection.issues
          : []),
      ],
    };
  }
  if (input.phaseProjection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: spellAttackDamageCombineIssues(
        input.issues,
        input.phaseProjection.issues,
      ),
    };
  }
  const allIssues = spellAttackDamageNonEmpty(input.issues);
  if (allIssues !== undefined) {
    return { tag: "unsupported", issues: allIssues };
  }

  return {
    tag: "supported",
    facts: {
      targeting: input.targeting,
      rangeFeet: input.rangeFeet,
      attackKind: input.phase.attackKind,
      missDamage: input.phaseProjection.missDamage,
      damageAmount: input.phaseProjection.damageEffect.amount,
      damageType: input.phaseProjection.damageType,
      laterDamage: spellAttackLaterDamageFacts(input.phaseProjection),
      postDamageRiders: input.phaseProjection.postDamageRiders,
      objectHitEffect: input.phaseProjection.objectHitEffect,
    },
    evidence: spellAttackDamageMechanicsEvidence(input.mechanics, input.phase),
  };
}

function spellAttackLaterDamageFacts(
  projection: Extract<
    SpellAttackDamagePhaseProjection,
    { readonly tag: "supported" }
  >,
): SpellAttackDamageMechanicsFacts["laterDamage"] {
  return projection.laterDamage === null
    ? null
    : {
        amount: projection.laterDamage.amount,
        damageType: projection.laterDamage.damageType,
      };
}

function spellAttackDamageCandidate(mechanics: SpellMechanics): {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >;
  readonly phase: SpellAttackDamagePhase;
} | null {
  if (mechanics.family !== "activation") return null;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "attack_roll") return null;
  return spellAttackDamageSiblingShape(mechanics, phase)
    ? null
    : { mechanics, phase };
}

function spellAttackDamageHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SpellAttackDamageMechanicsIssue[] {
  return [
    ...(mechanics.castingTime.kind === "action"
      ? []
      : [
          spellAttackDamageMechanicsIssue(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
    ...mechanics.phases
      .slice(1)
      .map((_phase, index) =>
        spellAttackDamageMechanicsIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 2)),
        ),
      ),
  ];
}

function spellAttackDamagePhaseProjection(
  source: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  targeting: SpellAttackDamageTargeting | null,
): SpellAttackDamagePhaseProjection {
  const initialDamage = spellAttackDamageInitialProjection(
    source,
    phase.onHit[0],
  );
  const miss = spellAttackDamageMissProjection(phase);
  const laterDamage = supportedSpellAttackLaterDamage(phase);
  const objectHitProjection = spellAttackObjectHitProjection({
    source,
    phase,
    targeting,
    initialDamage,
    laterDamage,
  });
  const riders = inspectSpellPostDamageRiders(
    source,
    phase,
    objectHitProjection.postDamageEffects,
  );
  return spellAttackDamagePhaseResult({
    initialDamage,
    miss,
    laterDamage,
    riders,
    objectHit: objectHitProjection,
  });
}

function spellAttackDamageInitialProjection(
  source: SpellMechanicsSource,
  effect: SpellAttackHitEffect | undefined,
): SpellAttackDamageInitialProjection {
  const effectPath = spellActivationEffectPath(
    SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
    PositiveInteger(1),
  );
  if (effect?.kind !== "damage") {
    return {
      tag: "missingDamageEffect",
      issue: spellAttackDamageMechanicsIssue("hitDamage", effectPath),
    };
  }
  return {
    tag: "damageEffect",
    evaluation: spellAttackDamageInitialDamageEvaluation(
      source,
      effect,
      effectPath,
    ),
  };
}

function spellAttackDamageInitialDamageEvaluation(
  source: SpellMechanicsSource,
  effect: SpellAttackDamageEffect,
  effectPath: SpellMechanicsBranchPath,
): SpellAttackDamageInitialDamageEvaluation {
  const damageType = spellAttackDamageTypeProjection(source, effect);
  const amountIsRepresented = spellAttackDamageAmountIsRepresented(
    effect.amount,
  );
  if (damageType === null) {
    const damageTypeIssue = spellAttackDamageMechanicsIssue(
      "damageType",
      effectPath,
    );
    return amountIsRepresented
      ? { tag: "unsupportedDamageType", effect, damageTypeIssue }
      : {
          tag: "unsupportedDamageTypeAndAmount",
          effect,
          damageTypeIssue,
          damageAmountIssue: spellAttackDamageMechanicsIssue(
            "damageAmount",
            effectPath,
          ),
        };
  }
  return amountIsRepresented
    ? { tag: "supported", effect, damageType }
    : {
        tag: "unsupportedDamageAmount",
        effect,
        damageType,
        damageAmountIssue: spellAttackDamageMechanicsIssue(
          "damageAmount",
          effectPath,
        ),
      };
}

function spellAttackFixedDamageType(
  effect: SpellAttackDamageEffect,
): DamageType | null {
  return typeof effect.damageType === "string" ? effect.damageType : null;
}

function spellAttackDamageTypeProjection(
  source: SpellMechanicsSource,
  effect: SpellAttackDamageEffect,
): SpellAttackDamageMechanicsDamageType | null {
  if (supportedExplodingCantripProjection(source.mechanics, effect) !== null) {
    return {
      kind: "choice",
      damageTypes: EXPLODING_CANTRIP_DAMAGE_TYPES,
      maxAdditionalDiceSource: "spellcasting_ability_modifier",
    };
  }
  const fixedDamageType = spellAttackFixedDamageType(effect);
  return fixedDamageType === null
    ? null
    : { kind: "fixed", damageType: fixedDamageType };
}

function spellAttackLaterDamageIssues(
  projection: SpellAttackDamageLaterProjection,
  initialDamage: SpellAttackDamageInitialProjection,
): readonly SpellAttackDamageMechanicsIssue[] {
  const issueForIndex = (
    failedFact: "laterDamage" | "laterDamageAmount",
    index: number,
  ) =>
    spellAttackDamageMechanicsIssue(
      failedFact,
      spellActivationEffectPath(
        SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
        PositiveInteger(index + 1),
      ),
    );
  const mismatchedTypeIndex = spellAttackLaterDamageTypeMismatchIndex(
    projection,
    initialDamage,
  );
  return [
    ...projection.invalidLaterDamageEffects.map(({ index }) =>
      issueForIndex("laterDamage", index),
    ),
    ...projection.duplicateLaterDamageEffects.map(({ index }) =>
      issueForIndex("laterDamage", index),
    ),
    ...projection.invalidLaterDamageAmountEffects.map(({ index }) =>
      issueForIndex("laterDamageAmount", index),
    ),
    ...(mismatchedTypeIndex === null
      ? []
      : [issueForIndex("laterDamage", mismatchedTypeIndex)]),
  ];
}

function spellAttackLaterDamageTypeMismatchIndex(
  projection: SpellAttackDamageLaterProjection,
  initialDamage: SpellAttackDamageInitialProjection,
): number | null {
  return Match.value(initialDamage).pipe(
    Match.when({ tag: "missingDamageEffect" }, () => null),
    Match.when({ tag: "damageEffect" }, ({ evaluation }) => {
      const fixedDamageType = spellAttackFixedDamageType(evaluation.effect);
      return projection.laterDamage !== null &&
        (fixedDamageType === null ||
          projection.laterDamage.effect.damageType !== fixedDamageType)
        ? projection.laterDamage.index
        : null;
    }),
    Match.exhaustive,
  );
}

function spellAttackObjectHitProjection(input: {
  readonly source: SpellMechanicsSource;
  readonly phase: SpellAttackDamagePhase;
  readonly targeting: SpellAttackDamageTargeting | null;
  readonly initialDamage: SpellAttackDamageInitialProjection;
  readonly laterDamage: SpellAttackDamageLaterProjection;
}): ReturnType<typeof supportedSpellObjectHitEffect> {
  const damageEffect = Match.value(input.initialDamage).pipe(
    Match.when({ tag: "missingDamageEffect" }, () => null),
    Match.when({ tag: "damageEffect" }, ({ evaluation }) => evaluation.effect),
    Match.exhaustive,
  );
  if (damageEffect === null || input.targeting === null) {
    return {
      objectHitEffect: { kind: "none" },
      postDamageEffects: input.laterDamage.postDamageEffects,
    };
  }
  return supportedSpellObjectHitEffect({
    spell: input.source,
    phase: input.phase,
    targeting: input.targeting,
    damageEffect,
    postDamageEffects: input.laterDamage.postDamageEffects,
  });
}

function spellAttackDamageRiderIssues(
  projection: SpellAttackDamageRiderProjection,
): readonly SpellAttackDamageMechanicsIssue[] {
  return projection.unsupportedEffects.map(({ index }) =>
    spellAttackDamageMechanicsIssue(
      "postDamageRiders",
      spellActivationEffectPath(
        SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
        PositiveInteger(index + 1),
      ),
    ),
  );
}

function spellAttackMissDamageIssues(
  projection: SpellAttackDamageMissProjection,
): readonly SpellAttackDamageMechanicsIssue[] {
  return Match.value(projection).pipe(
    Match.when({ tag: "unsupported" }, ({ issues }) => issues),
    Match.when({ tag: "supported" }, ({ extraIssues }) => extraIssues),
    Match.exhaustive,
  );
}

function spellAttackDamageTypeIssues(
  projection: SpellAttackDamageInitialProjection,
): readonly SpellAttackDamageMechanicsIssue[] {
  return Match.value(projection).pipe(
    Match.when({ tag: "missingDamageEffect" }, () => []),
    Match.when({ tag: "damageEffect" }, ({ evaluation }) =>
      Match.value(evaluation).pipe(
        Match.when({ tag: "supported" }, () => []),
        Match.when({ tag: "unsupportedDamageType" }, ({ damageTypeIssue }) => [
          damageTypeIssue,
        ]),
        Match.when({ tag: "unsupportedDamageAmount" }, () => []),
        Match.when(
          { tag: "unsupportedDamageTypeAndAmount" },
          ({ damageTypeIssue }) => [damageTypeIssue],
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function spellAttackDamageAmountIssues(
  projection: SpellAttackDamageInitialProjection,
): readonly SpellAttackDamageMechanicsIssue[] {
  return Match.value(projection).pipe(
    Match.when({ tag: "missingDamageEffect" }, () => []),
    Match.when({ tag: "damageEffect" }, ({ evaluation }) =>
      Match.value(evaluation).pipe(
        Match.when({ tag: "supported" }, () => []),
        Match.when({ tag: "unsupportedDamageType" }, () => []),
        Match.when(
          { tag: "unsupportedDamageAmount" },
          ({ damageAmountIssue }) => [damageAmountIssue],
        ),
        Match.when(
          { tag: "unsupportedDamageTypeAndAmount" },
          ({ damageAmountIssue }) => [damageAmountIssue],
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function spellAttackOrderedPhaseIssues(
  evaluation: SpellAttackDamagePhaseEvaluation,
): readonly SpellAttackDamageMechanicsIssue[] {
  return [
    ...spellAttackMissDamageIssues(evaluation.miss),
    ...spellAttackLaterDamageIssues(
      evaluation.laterDamage,
      evaluation.initialDamage,
    ),
    ...spellAttackDamageTypeIssues(evaluation.initialDamage),
    ...spellAttackDamageAmountIssues(evaluation.initialDamage),
    ...spellAttackDamageRiderIssues(evaluation.riders),
  ];
}

function spellAttackOrderedPhaseIssuesWithoutDamageType(
  evaluation: SpellAttackDamagePhaseEvaluation,
): readonly SpellAttackDamageMechanicsIssue[] {
  return [
    ...spellAttackMissDamageIssues(evaluation.miss),
    ...spellAttackLaterDamageIssues(
      evaluation.laterDamage,
      evaluation.initialDamage,
    ),
    ...spellAttackDamageAmountIssues(evaluation.initialDamage),
    ...spellAttackDamageRiderIssues(evaluation.riders),
  ];
}

function spellAttackDamagePhaseResult(
  evaluation: SpellAttackDamagePhaseEvaluation,
): SpellAttackDamagePhaseProjection {
  return Match.value(evaluation.initialDamage).pipe(
    Match.when({ tag: "missingDamageEffect" }, ({ issue }) =>
      spellAttackUnsupportedPhaseProjection([
        issue,
        ...spellAttackOrderedPhaseIssues(evaluation),
      ]),
    ),
    Match.when({ tag: "damageEffect" }, ({ evaluation: initialDamage }) =>
      spellAttackDamageEffectPhaseResult(evaluation, initialDamage),
    ),
    Match.exhaustive,
  );
}

function spellAttackDamageEffectPhaseResult(
  evaluation: SpellAttackDamagePhaseEvaluation,
  initialDamage: SpellAttackDamageInitialDamageEvaluation,
): SpellAttackDamagePhaseProjection {
  const orderedIssues = spellAttackOrderedPhaseIssues(evaluation);
  return Match.value(evaluation.miss).pipe(
    Match.when({ tag: "unsupported" }, ({ issues }) =>
      spellAttackUnsupportedPhaseProjection(
        spellAttackDamageNonEmpty(orderedIssues) ?? issues,
      ),
    ),
    Match.when({ tag: "supported" }, (miss) =>
      spellAttackDamageSupportedMissPhaseResult(
        { ...evaluation, miss },
        initialDamage,
        orderedIssues,
      ),
    ),
    Match.exhaustive,
  );
}

function spellAttackDamageSupportedMissPhaseResult(
  evaluation: SpellAttackDamageSupportedMissEvaluation,
  initialDamage: SpellAttackDamageInitialDamageEvaluation,
  orderedIssues: readonly SpellAttackDamageMechanicsIssue[],
): SpellAttackDamagePhaseProjection {
  return Match.value(initialDamage).pipe(
    Match.when({ tag: "unsupportedDamageType" }, ({ damageTypeIssue }) =>
      spellAttackUnsupportedDamageTypePhaseResult(evaluation, damageTypeIssue),
    ),
    Match.when(
      { tag: "unsupportedDamageTypeAndAmount" },
      ({ damageTypeIssue }) =>
        spellAttackUnsupportedDamageTypePhaseResult(
          evaluation,
          damageTypeIssue,
        ),
    ),
    Match.when({ tag: "unsupportedDamageAmount" }, ({ damageAmountIssue }) =>
      spellAttackUnsupportedPhaseProjection(
        spellAttackDamageNonEmpty(orderedIssues) ?? [damageAmountIssue],
      ),
    ),
    Match.when({ tag: "supported" }, (supportedInitialDamage) => {
      const nonEmptyIssues = spellAttackDamageNonEmpty(orderedIssues);
      return nonEmptyIssues === undefined
        ? spellAttackSupportedDamagePhaseResult(
            evaluation,
            supportedInitialDamage,
          )
        : spellAttackUnsupportedPhaseProjection(nonEmptyIssues);
    }),
    Match.exhaustive,
  );
}

function spellAttackUnsupportedDamageTypePhaseResult(
  evaluation: SpellAttackDamageSupportedMissEvaluation,
  damageTypeIssue: SpellAttackDamageMechanicsIssue,
): Extract<SpellAttackDamagePhaseProjection, { readonly tag: "unsupported" }> {
  return spellAttackUnsupportedPhaseProjection([
    damageTypeIssue,
    ...spellAttackOrderedPhaseIssuesWithoutDamageType(evaluation),
  ]);
}

function spellAttackUnsupportedPhaseProjection(
  issues: ReadonlyNonEmptyArray<SpellAttackDamageMechanicsIssue>,
): Extract<SpellAttackDamagePhaseProjection, { readonly tag: "unsupported" }> {
  return { tag: "unsupported", issues };
}

function spellAttackSupportedDamagePhaseResult(
  evaluation: SpellAttackDamageSupportedMissEvaluation,
  initialDamage: Extract<
    SpellAttackDamageInitialDamageEvaluation,
    { readonly tag: "supported" }
  >,
): Extract<SpellAttackDamagePhaseProjection, { readonly tag: "supported" }> {
  return {
    tag: "supported",
    damageEffect: initialDamage.effect,
    missDamage: evaluation.miss.missDamage,
    damageType: initialDamage.damageType,
    laterDamage:
      evaluation.laterDamage.laterDamage === null
        ? null
        : evaluation.laterDamage.laterDamage.effect,
    postDamageRiders: evaluation.riders.riders,
    objectHitEffect: evaluation.objectHit.objectHitEffect,
  };
}

function spellAttackDamageAmountIsRepresented(
  amount: SpellAttackDamageEffect["amount"],
): boolean {
  if (amount.kind === "fixed") {
    return true;
  }
  if (
    amount.kind === "threshold_tiers" ||
    amount.kind === "threshold_tiers_exploding_max_die"
  ) {
    return amount.axis === "character";
  }
  if (amount.kind === "linear_per_level") {
    return (
      amount.axis === "slot" &&
      amount.base.dieSize !== undefined &&
      amount.startingAtLevel > 0
    );
  }
  return false;
}

function spellAttackDamageMechanicsIssue(
  failedFact: SpellAttackDamageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): SpellAttackDamageMechanicsIssue {
  return {
    failedFact,
    mechanicsPath,
    message: `Unsupported spellAttackDamage mechanics fact: ${failedFact}.`,
  };
}

export function supportedSpellPostDamageRiders(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effects: readonly SpellAttackHitEffect[],
): readonly SpellPostDamageRider[] | null {
  const projection = inspectSpellPostDamageRiders(
    spell,
    phase,
    effects.map((effect, index) => ({ effect, index })),
  );
  return projection.unsupportedEffects.length === 0 ? projection.riders : null;
}

function inspectSpellPostDamageRiders(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effects: readonly SpellAttackDamageIndexedEffect[],
): SpellAttackDamageRiderProjection {
  const riders: SpellPostDamageRider[] = [];
  const unsupportedEffects: SpellAttackDamageIndexedEffect[] = [];
  for (const occurrence of effects) {
    const { effect } = occurrence;
    const rider = spellPostDamageRider(spell, phase, effect);
    if (rider === null) unsupportedEffects.push(occurrence);
    else riders.push(rider);
  }
  return { riders, unsupportedEffects };
}

const SPELL_POST_DAMAGE_RIDER_EFFECT_KINDS = [
  "modify_speed",
  "apply_condition",
  "deny_opportunity_attack",
  "modify_roll_advantage",
  "prevent_hit_point_regain",
  "emit_dim_illumination_until_end_of_caster_next_turn",
  "suppress_condition_benefit",
] as const satisfies readonly SpellAttackHitEffect["kind"][];
type SpellPostDamageRiderEffectKind =
  (typeof SPELL_POST_DAMAGE_RIDER_EFFECT_KINDS)[number];
type SpellPostDamageRiderEffect = Extract<
  SpellAttackHitEffect,
  { readonly kind: SpellPostDamageRiderEffectKind }
>;

function isSpellPostDamageRiderEffect(
  effect: SpellAttackHitEffect,
): effect is SpellPostDamageRiderEffect {
  return SPELL_POST_DAMAGE_RIDER_EFFECT_KINDS.some(
    (kind) => kind === effect.kind,
  );
}

function spellPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: SpellAttackHitEffect,
): SpellPostDamageRider | null {
  if (!isSpellPostDamageRiderEffect(effect)) return null;
  return Match.value(effect).pipe(
    Match.discriminatorsExhaustive("kind")({
      modify_speed: speedDeltaPostDamageRider,
      apply_condition: (candidate) =>
        poisonedPostDamageRider(spell, phase, candidate),
      deny_opportunity_attack: () =>
        opportunityAttackPostDamageRider(spell, phase),
      modify_roll_advantage: (candidate) =>
        nextAttackAdvantagePostDamageRider(spell, phase, candidate),
      prevent_hit_point_regain: (candidate) =>
        hitPointRegainPostDamageRider(spell, phase, candidate),
      emit_dim_illumination_until_end_of_caster_next_turn: (candidate) =>
        dimLightPostDamageRider(spell, phase, candidate),
      suppress_condition_benefit: (candidate) =>
        invisibleBenefitPostDamageRider(spell, phase, candidate),
    }),
  );
}

function speedDeltaPostDamageRider(
  effect: Extract<
    SpellPostDamageRiderEffect,
    { readonly kind: "modify_speed" }
  >,
): SpellPostDamageRider | null {
  if (effect.unit !== "feet" || effect.delta >= 0) return null;
  return { kind: "speedDelta", deltaFeet: movementDeltaFeet(effect.delta) };
}

function poisonedPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: Extract<
    SpellPostDamageRiderEffect,
    { readonly kind: "apply_condition" }
  >,
): SpellPostDamageRider | null {
  if (
    effect.condition !== "poisoned" ||
    effect.duration !== "end_of_caster_next_turn" ||
    !isPoisonedConditionRiderShape(spell, phase)
  )
    return null;
  return {
    kind: "condition",
    condition: effect.condition,
    expiresAt: "endOfCasterNextTurn",
  };
}

function opportunityAttackPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
): SpellPostDamageRider | null {
  if (!isOpportunityAttackPreventionRiderShape(spell, phase)) return null;
  return {
    kind: "opportunityAttackDenied",
    expiresAt: "startOfTargetNextTurn",
  };
}

function nextAttackAdvantagePostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: Extract<
    SpellPostDamageRiderEffect,
    { readonly kind: "modify_roll_advantage" }
  >,
): SpellPostDamageRider | null {
  if (
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on ?? [], ["attack_roll"]) ||
    !isNextAttackAdvantageRiderShape(spell, phase)
  )
    return null;
  return {
    kind: "nextAttackRollAgainstTarget",
    mode: "advantage",
    expiresAt: "endOfCasterNextTurn",
  };
}

function hitPointRegainPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: Extract<
    SpellPostDamageRiderEffect,
    { readonly kind: "prevent_hit_point_regain" }
  >,
): SpellPostDamageRider | null {
  if (
    effect.expiresAt !== "end_of_caster_next_turn" ||
    !isHitPointRegainPreventionRiderShape(spell, phase)
  )
    return null;
  return {
    kind: "hitPointRegainPrevented",
    expiresAt: "endOfCasterNextTurn",
  };
}

function dimLightPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: Extract<
    SpellPostDamageRiderEffect,
    {
      readonly kind: "emit_dim_illumination_until_end_of_caster_next_turn";
    }
  >,
): SpellPostDamageRider | null {
  if (effect.radiusFeet !== 10 || !isDimLightEmissionRiderShape(spell, phase))
    return null;
  return {
    kind: "lightEmission",
    emission: { kind: "dim", radiusFeet: movementFeet(effect.radiusFeet) },
    expiresAt: "endOfCasterNextTurn",
  };
}

function invisibleBenefitPostDamageRider(
  spell: SpellMechanicsSource,
  phase: SpellAttackDamagePhase,
  effect: Extract<
    SpellPostDamageRiderEffect,
    { readonly kind: "suppress_condition_benefit" }
  >,
): SpellPostDamageRider | null {
  if (
    effect.condition !== "invisible" ||
    !isInvisibleTargetBenefitDenialRiderShape(spell, phase)
  )
    return null;
  return {
    kind: "invisibleBenefitDenied",
    expiresAt: "endOfCasterNextTurn",
  };
}

function supportedSpellAttackMissDamage(
  effect: SpellAttackHitEffect | undefined,
): SpellAttackDamageInvocation["missDamage"] | null {
  if (effect?.kind === "none") {
    return "none";
  }
  if (effect?.kind === "half_initial_damage_only") {
    return "halfInitialOnly";
  }
  return null;
}

function spellAttackDamageMissProjection(
  phase: SpellAttackDamagePhase,
): SpellAttackDamageMissProjection {
  const firstMissEffect = phase.onMiss[0];
  const firstMissPath = spellActivationEffectPath(
    SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
    PositiveInteger(phase.onHit.length + 1),
  );
  const extraIssues = phase.onMiss
    .slice(1)
    .map((_effect, index) =>
      spellAttackDamageMechanicsIssue(
        "missDamage",
        spellActivationEffectPath(
          SPELL_ATTACK_DAMAGE_PHASE_ORDINAL,
          PositiveInteger(phase.onHit.length + index + 2),
        ),
      ),
    );
  if (firstMissEffect === undefined) {
    return {
      tag: "unsupported",
      issues: [spellAttackDamageMechanicsIssue("missDamage", firstMissPath)],
    };
  }
  const missDamage = supportedSpellAttackMissDamage(firstMissEffect);
  if (missDamage === null) {
    return {
      tag: "unsupported",
      issues: [
        spellAttackDamageMechanicsIssue("missDamage", firstMissPath),
        ...extraIssues,
      ],
    };
  }
  return { tag: "supported", missDamage, extraIssues };
}

function supportedSpellAttackLaterDamage(
  phase: SpellAttackDamagePhase,
): SpellAttackDamageLaterProjection {
  const laterDamageEffects: SpellAttackDamageIndexedEffect<SpellAttackDamageLaterEffect>[] =
    [];
  const invalidLaterDamageEffects: SpellAttackDamageIndexedEffect[] = [];
  const invalidLaterDamageAmountEffects: SpellAttackDamageIndexedEffect[] = [];
  const postDamageEffects: SpellAttackDamageIndexedEffect[] = [];
  for (const [index, effect] of phase.onHit.entries()) {
    Match.value(classifySpellAttackLaterDamageEffect(effect, index)).pipe(
      Match.when({ tag: "initialDamage" }, () => undefined),
      Match.when({ tag: "postDamage" }, ({ occurrence }) => {
        postDamageEffects.push(occurrence);
      }),
      Match.when(
        { tag: "laterDamage" },
        ({ occurrence, amountIsRepresented }) => {
          laterDamageEffects.push(occurrence);
          if (!amountIsRepresented) {
            invalidLaterDamageAmountEffects.push(occurrence);
          }
        },
      ),
      Match.when(
        { tag: "invalidLaterDamage" },
        ({ occurrence, amountIsRepresented }) => {
          invalidLaterDamageEffects.push(occurrence);
          if (!amountIsRepresented) {
            invalidLaterDamageAmountEffects.push(occurrence);
          }
        },
      ),
      Match.exhaustive,
    );
  }
  return {
    laterDamage: laterDamageEffects[0] ?? null,
    postDamageEffects,
    invalidLaterDamageEffects,
    duplicateLaterDamageEffects: laterDamageEffects.slice(1),
    invalidLaterDamageAmountEffects,
  };
}

function classifySpellAttackLaterDamageEffect(
  effect: SpellAttackHitEffect,
  index: number,
): SpellAttackDamageLaterEffectClassification {
  if (index === 0) return { tag: "initialDamage" };
  const occurrence = { effect, index };
  if (effect.kind !== "damage" || effect.timing !== "end_of_next_turn") {
    return { tag: "postDamage", occurrence };
  }
  const amountIsRepresented = spellAttackDamageAmountIsRepresented(
    effect.amount,
  );
  return isSpellAttackLaterDamageEffect(effect)
    ? { tag: "laterDamage", occurrence: { effect, index }, amountIsRepresented }
    : { tag: "invalidLaterDamage", occurrence, amountIsRepresented };
}

function isSpellAttackLaterDamageEffect(
  effect: SpellAttackHitEffect,
): effect is SpellAttackDamageLaterEffect {
  return (
    effect.kind === "damage" &&
    effect.timing === "end_of_next_turn" &&
    isConcreteDamageType(effect.damageType)
  );
}

function isConcreteDamageType(value: unknown): value is DamageType {
  return (
    typeof value === "string" && DAMAGE_TYPES.some((type) => type === value)
  );
}

export function isInvisibleTargetBenefitDenialRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return isDimLightEmissionRiderShape(spell, phase);
}

export function isDimLightEmissionRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isHitPointRegainPreventionRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isPoisonedConditionRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function isOpportunityAttackPreventionRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 0 &&
    spell.mechanics.duration.kind === "instantaneous" &&
    phase.attackKind === "melee_spell_attack"
  );
}

export function isNextAttackAdvantageRiderShape(
  spell: SpellMechanicsSource,
  phase: Extract<SpellActivationPhase, { readonly kind: "attack_roll" }>,
): boolean {
  return (
    spell.mechanics.level === 1 &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "round" &&
    spell.mechanics.duration.value.amount === 1 &&
    phase.attackKind === "ranged_spell_attack"
  );
}

export function supportedPreparedSpellAttackSequenceProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SpellAttackSequenceInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  const countProgression =
    phase?.kind === "attack_roll"
      ? multiRayCountProgressionFromAttachment(phase.attachment)
      : null;
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== PREPARED_MULTI_RAY_BASE_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    range.kind !== "point" ||
    range.feet !== PREPARED_MULTI_RAY_RANGE_FEET ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== PREPARED_MULTI_RAY_ATTACK_KIND ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== PREPARED_MULTI_RAY_DAMAGE_TYPE ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none" ||
    countProgression === null
  ) {
    return [];
  }
  return spellSlots.flatMap(
    (slot): readonly SpellAttackSequenceInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const targeting = spellAttackSequenceSlotTargeting(
        countProgression,
        slot.spellLevel,
      );
      const damageExpr = supportedDamageAmountExpr({
        amount: damageEffect.amount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (targeting === null || damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: {
            tag: "spellSlot",
            slotLevel: slot.spellLevel,
          },
          procedure: "spellAttackSequence",
          spell,
          targeting,
          damage: {
            expr: damageExpr,
            damageType: PREPARED_MULTI_RAY_DAMAGE_TYPE,
          },
          rangeFeet: movementFeet(PREPARED_MULTI_RAY_RANGE_FEET),
          attackKind: PREPARED_MULTI_RAY_ATTACK_KIND,
          attackBonus: attackBonus(
            Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
          ),
        },
      ];
    },
  );
}

export function supportedPreparedChainedSpellAttackDamageProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellInvocation[] {
  const range = spell.mechanics.range;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    !isFixedDistancePointRange(range) ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const rangeFeet = movementFeet(range.feet);
  const phase = spell.mechanics.phases[0];
  const continuation = phase?.kind === "attack_roll" ? phase.continue : null;
  const leapPhase =
    continuation?.kind === "repeat" ? continuation.next[0] : undefined;
  const hitDamage = phase?.kind === "attack_roll" ? phase.onHit[0] : undefined;
  const leapHitDamage =
    leapPhase?.kind === "attack_roll" ? leapPhase.onHit[0] : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(phase.attachment)
      : null;
  const leapTargeting =
    leapPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(leapPhase.attachment)
      : null;
  if (
    phase?.kind !== "attack_roll" ||
    leapPhase?.kind !== "attack_roll" ||
    !supportedSpellAttackKind(phase.attackKind) ||
    !supportedSpellAttackKind(leapPhase.attackKind) ||
    phase.attackKind !== leapPhase.attackKind ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    leapTargeting === null ||
    leapTargeting.kind !== "singleCombatant" ||
    phase.onHit.length !== 1 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none" ||
    leapPhase.onHit.length !== 1 ||
    leapPhase.onMiss.length !== 1 ||
    leapPhase.onMiss[0]?.kind !== "none" ||
    continuation?.kind !== "repeat" ||
    continuation.when.kind !== "damage_roll_has_duplicate_faces" ||
    continuation.when.minimumMultiplicity !== 2 ||
    continuation.next.length !== 1 ||
    !isBouncingAttackContinuationLimitSetShape(continuation.limits) ||
    hitDamage?.kind !== "damage" ||
    leapHitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "object" ||
    hitDamage.damageType.kind !== "hole" ||
    typeof hitDamage.damageType.value !== "object" ||
    hitDamage.damageType.value.kind !== "choice" ||
    !sameStringSet(hitDamage.damageType.value.options, [
      ...CHAINED_SPELL_ATTACK_DAMAGE_TYPES,
    ]) ||
    typeof leapHitDamage.damageType !== "object" ||
    leapHitDamage.damageType.kind !== "same_choice_as" ||
    leapHitDamage.damageType.holeId !== hitDamage.damageType.holeId
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: hitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    const leapDamageExpr = supportedDamageAmountExpr({
      amount: leapHitDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    if (
      damageExpr === null ||
      leapDamageExpr === null ||
      !sameDiceExpr(damageExpr, leapDamageExpr)
    ) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: {
          tag: "spellSlot",
          slotLevel: slot.spellLevel,
        },
        procedure: "chainedSpellAttackDamage",
        spell,
        targeting,
        damage: { expr: damageExpr },
        damageTypeChoices: CHAINED_SPELL_ATTACK_DAMAGE_TYPES,
        rangeFeet,
        leapRangeFeet: CHAINED_SPELL_ATTACK_LEAP_RANGE_FEET,
        attackKind: phase.attackKind,
        attackBonus: attackBonus(
          Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
        ),
      },
    ];
  });
}

export function isBouncingAttackContinuationLimitSetShape(
  limits: readonly { readonly kind: string }[],
): boolean {
  return (
    limits.length === CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS.length &&
    CHAINED_SPELL_ATTACK_CONTINUATION_LIMIT_KINDS.every((requiredKind) =>
      limits.some((limit) => limit.kind === requiredKind),
    )
  );
}

export function supportedPreparedAttackBurstSaveDamageProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: CharacterBattleSpellcastingExecutionState["spellSlots"],
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
): readonly AttackBurstSaveDamageInvocation[] {
  return spellSlots.flatMap(
    (slot): readonly AttackBurstSaveDamageInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return supportedAttackBurstSaveDamageProfile({
        spell,
        access: { tag: "prepared" },
        resource: {
          tag: "spellSlot",
          slotLevel: slot.spellLevel,
        },
        spellcastingAbilityModifier,
        proficiencyBonus,
        slotLevel: slot.spellLevel,
      });
    },
  );
}

export function supportedAttackBurstSaveDamageProfile(
  input: {
    readonly spell: BattleSpellAdmissionSource;
    readonly spellcastingAbilityModifier: AbilityModifier;
    readonly proficiencyBonus: ProficiencyBonusType;
    readonly slotLevel: SpellSlotLevel;
  } & PreparedDamageSpellSource,
): readonly AttackBurstSaveDamageInvocation[] {
  const spell = input.spell;
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const [attackPhase, burstPhase] = spell.mechanics.phases;
  const targeting =
    attackPhase?.kind === "attack_roll"
      ? spellAttackDamageTargeting(attackPhase.attachment)
      : null;
  const burstTargeting =
    burstPhase?.kind === "save_gate"
      ? primaryTargetOriginEmanationTargeting(burstPhase.attachment)
      : null;
  const rangeFeet =
    targeting?.kind === "singleCombatant"
      ? singleTargetSpellRangeFeet(spell.mechanics.range)
      : null;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    rangeFeet === null ||
    spell.mechanics.phases.length !== 2 ||
    attackPhase?.kind !== "attack_roll" ||
    burstPhase?.kind !== "save_gate" ||
    !supportedSpellAttackKind(attackPhase.attackKind) ||
    targeting === null ||
    targeting.kind !== "singleCombatant" ||
    burstTargeting === null ||
    attackPhase.onHit.length !== 1 ||
    attackPhase.onMiss.length !== 1 ||
    attackPhase.onMiss[0]?.kind !== "none" ||
    burstPhase.ability !== "dex" ||
    burstPhase.dc.kind !== "caster_spell_save_dc" ||
    burstPhase.onSuccess.kind !== "none" ||
    burstPhase.onFail.kind !== "damage" ||
    typeof burstPhase.onFail.damageType !== "string"
  ) {
    return [];
  }
  const hitDamage = attackPhase.onHit[0];
  if (
    hitDamage?.kind !== "damage" ||
    typeof hitDamage.damageType !== "string"
  ) {
    return [];
  }
  const hitDamageExpr = supportedDamageAmountExpr({
    amount: hitDamage.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  const burstDamageExpr = supportedDamageAmountExpr({
    amount: burstPhase.onFail.amount,
    spellLevel: spell.mechanics.level,
    slotLevel: input.slotLevel,
  });
  if (hitDamageExpr === null || burstDamageExpr === null) {
    return [];
  }

  return [
    {
      access: input.access,
      resource: input.resource,
      procedure: "attackBurstSaveDamage",
      spell,
      targeting,
      attackKind: attackPhase.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
      damage: {
        expr: hitDamageExpr,
        damageType: hitDamage.damageType,
      },
      burst: {
        ability: burstPhase.ability,
        dc: burstPhase.dc,
        targeting: burstTargeting,
        damage: {
          expr: burstDamageExpr,
          damageType: burstPhase.onFail.damageType,
        },
        successDamage: "none",
      },
      rangeFeet,
    },
  ];
}

type SpellAttackDamageInvocationInput = {
  readonly spell: BattleSpellExecutionSource;
  readonly facts: SpellAttackDamageMechanicsFacts;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
  readonly slotLevel?: SpellSlotLevel;
  readonly characterLevel?: number;
} & DamageSpellSource;

export function spellAttackDamageInvocationsFromFacts(
  input: SpellAttackDamageInvocationInput,
): readonly SpellAttackDamageInvocation[] {
  if (!spellAttackDamageLevelIsRepresented(input)) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: input.facts.damageAmount,
    spellLevel: input.facts.level,
    slotLevel: input.slotLevel,
    characterLevel: input.characterLevel,
  });
  if (damageExpr === null) {
    return [];
  }
  const laterDamageExpr = spellAttackLaterDamageExpr(input);
  if (input.facts.laterDamage !== null && laterDamageExpr === null) {
    return [];
  }
  const damage = spellAttackInvocationDamage(input, damageExpr);
  const attackDamageInvocation = {
    procedure: "spellAttackDamage" as const,
    spell: input.spell,
    targeting: input.facts.targeting,
    damage,
    rangeFeet: input.facts.rangeFeet,
    attackKind: input.facts.attackKind,
    attackBonus: attackBonus(
      Number(input.spellcastingAbilityModifier) +
        Number(input.proficiencyBonus),
    ),
    missDamage: input.facts.missDamage,
    laterDamage:
      laterDamageExpr === null || input.facts.laterDamage === null
        ? null
        : {
            expr: laterDamageExpr,
            damageType: input.facts.laterDamage.damageType,
          },
    postDamageRiders: input.facts.postDamageRiders,
    objectHitEffect: input.facts.objectHitEffect,
  };

  return spellAttackDamageInvocationForAccess(input, attackDamageInvocation);
}

function spellAttackDamageLevelIsRepresented(
  input: SpellAttackDamageInvocationInput,
): boolean {
  return isCantripSpellAccess(input.access)
    ? input.facts.level === 0
    : input.facts.level >= 1;
}

function spellAttackLaterDamageExpr(input: SpellAttackDamageInvocationInput) {
  return input.facts.laterDamage === null
    ? null
    : supportedDamageAmountExpr({
        amount: input.facts.laterDamage.amount,
        spellLevel: input.facts.level,
        slotLevel: input.slotLevel,
        characterLevel: input.characterLevel,
      });
}

function spellAttackInvocationDamage(
  input: SpellAttackDamageInvocationInput,
  damageExpr: NonNullable<ReturnType<typeof supportedDamageAmountExpr>>,
): SpellAttackDamageInvocation["damage"] {
  return Match.value(input.facts.damageType).pipe(
    Match.discriminatorsExhaustive("kind")({
      fixed: ({ damageType }) => ({
        kind: "fixedSpellAttackDamage" as const,
        expr: damageExpr,
        damageType,
      }),
      choice: ({ damageTypes }) => ({
        kind: "spellAttackDamageTypeChoice" as const,
        expr: damageExpr,
        damageTypeChoices: damageTypes,
        maxDieAdditionalDiceLimit: Math.max(
          0,
          Number(input.spellcastingAbilityModifier),
        ),
      }),
    }),
  );
}

function spellAttackDamageInvocationForAccess(
  input: SpellAttackDamageInvocationInput,
  invocation: Omit<SpellAttackDamageInvocation, "access" | "resource">,
): readonly SpellAttackDamageInvocation[] {
  if (isCantripSpellAccess(input.access) && input.resource.tag === "none") {
    return [{ access: input.access, resource: { tag: "none" }, ...invocation }];
  }
  if (input.access.tag !== "prepared" || input.resource.tag !== "spellSlot") {
    return [];
  }
  return [
    { access: { tag: "prepared" }, resource: input.resource, ...invocation },
  ];
}

function supportedExplodingCantripProjection(
  mechanics: SpellMechanics,
  damageEffect: SpellAttackHitEffect,
): {
  readonly damageTypes: readonly [DamageType, ...DamageType[]];
} | null {
  if (
    damageEffect.kind !== "damage" ||
    mechanics.level !== 0 ||
    mechanics.duration.kind !== "instantaneous" ||
    typeof damageEffect.damageType !== "object" ||
    damageEffect.damageType.kind !== "hole" ||
    typeof damageEffect.damageType.value !== "object" ||
    damageEffect.damageType.value.kind !== "choice" ||
    !sameStringSet(damageEffect.damageType.value.options, [
      ...EXPLODING_CANTRIP_DAMAGE_TYPES,
    ]) ||
    damageEffect.amount.kind !== "threshold_tiers_exploding_max_die" ||
    damageEffect.amount.axis !== "character" ||
    damageEffect.amount.baseDice !== 1 ||
    damageEffect.amount.dieSize !== 8 ||
    damageEffect.amount.maxAdditionalDice !== "spellcasting_ability_modifier"
  ) {
    return null;
  }
  return {
    damageTypes: EXPLODING_CANTRIP_DAMAGE_TYPES,
  };
}

export function supportedCantripSpellAttackSequenceProfile(
  spell: BattleSpellAdmissionSource,
  spellcastingAbilityModifier: AbilityModifier,
  proficiencyBonus: ProficiencyBonusType,
  characterLevel: number,
): readonly SpellAttackSequenceInvocation[] {
  const phase =
    spell.mechanics.family === "activation"
      ? spell.mechanics.phases[0]
      : undefined;
  const targeting =
    phase?.kind === "attack_roll"
      ? spellAttackSequenceTargeting(phase.attachment, characterLevel)
      : null;
  const damageEffect = phase?.kind === "attack_roll" ? phase.onHit[0] : null;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 120 ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== "ranged_spell_attack" ||
    targeting === null ||
    phase.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.damageType !== "force" ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr({
    amount: damageEffect.amount,
    spellLevel: spell.mechanics.level,
    characterLevel,
  });
  if (damageExpr === null) {
    return [];
  }
  return [
    {
      access: cantripSpellAccessForCastingSource(spell.castingSource),
      resource: { tag: "none" },
      procedure: "spellAttackSequence",
      spell,
      targeting,
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: movementFeet(spell.mechanics.range.feet),
      attackKind: phase.attackKind,
      attackBonus: attackBonus(
        Number(spellcastingAbilityModifier) + Number(proficiencyBonus),
      ),
    },
  ];
}

function spellAttackSequenceTargeting(
  attachment: Attachment,
  characterLevel: number,
): CantripSpellAttackSequenceTargeting | null {
  const selection = creatureOrObjectTargetSelectionFromAttachment(attachment);
  if (selection === null) {
    return null;
  }
  const beamCount = cantripMultiBeamCount(selection, characterLevel);
  return beamCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "characterLevel",
        attackCount: beamCount,
      };
}

function spellAttackSequenceSlotTargeting(
  countProgression: MultiRayCountProgression,
  slotLevel: SpellSlotLevel,
): PreparedSpellAttackSequenceTargeting | null {
  const attackCount = preparedMultiRayAttackCount(countProgression, slotLevel);
  return attackCount === null
    ? null
    : {
        kind: "spellAttackSequenceCreatureOrObject",
        countSource: "spellSlotLevel",
        attackCount,
      };
}

function creatureOrObjectTargetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  const selection = targetSelectionFromAttachment(attachment);
  return selection !== null &&
    sameStringSet(selection.targetKinds ?? [], ["creature", "object"])
    ? selection
    : null;
}

function multiRayCountProgressionFromAttachment(
  attachment: Attachment,
): MultiRayCountProgression | null {
  const selection = creatureOrObjectTargetSelectionFromAttachment(attachment);
  return selection !== null && multiRaySelectionIsCanonical(selection)
    ? selection.count
    : null;
}

function multiRaySelectionIsCanonical(
  selection: TargetSelection,
): selection is TargetSelection & {
  readonly mode: "choose_up_to";
  readonly repeatsAllowed: true;
  readonly count: MultiRayCountProgression;
} {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return false;
  }
  const count = selection.count;
  return (
    typeof count === "object" &&
    count.kind === "linear" &&
    count.base === PREPARED_MULTI_RAY_BASE_COUNT &&
    count.baseLevel === PREPARED_MULTI_RAY_BASE_LEVEL &&
    count.perSlotAboveBase === PREPARED_MULTI_RAY_COUNT_PER_SLOT_ABOVE_BASE
  );
}

function preparedMultiRayAttackCount(
  countProgression: MultiRayCountProgression,
  slotLevel: SpellSlotLevel,
): MultiRaySpellAttackRayCount | null {
  const slotOffset = Number(slotLevel) - countProgression.baseLevel;
  if (slotOffset < 0) {
    return null;
  }
  return multiRaySpellAttackRayCount(
    countProgression.base + slotOffset * countProgression.perSlotAboveBase,
  );
}

function cantripMultiBeamCount(
  selection: TargetSelection,
  characterLevel: number,
): MultiBeamSpellAttackBeamCount | null {
  if (selection.mode !== "choose_up_to" || selection.repeatsAllowed !== true) {
    return null;
  }
  const count = selection.count;
  if (
    typeof count !== "object" ||
    count.kind !== "threshold_tiers" ||
    count.axis !== "character"
  ) {
    return null;
  }
  if (
    count.base !== 1 ||
    count.tiers.length !== CANTRIP_MULTI_BEAM_COUNT_TIERS.length ||
    !count.tiers.every((tier, index) => {
      const expected = CANTRIP_MULTI_BEAM_COUNT_TIERS[index];
      return (
        expected !== undefined &&
        tier.atLevel === expected.atLevel &&
        tier.value === expected.value
      );
    })
  ) {
    return null;
  }
  return CANTRIP_MULTI_BEAM_COUNT_TIERS.reduce<MultiBeamSpellAttackBeamCount>(
    (current, tier) => (characterLevel >= tier.atLevel ? tier.value : current),
    count.base,
  );
}

function supportedSpellObjectHitEffect(input: {
  readonly spell: SpellMechanicsSource;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly targeting: SpellAttackDamageTargeting;
  readonly damageEffect: SpellAttackDamageEffect;
  readonly postDamageEffects: readonly SpellAttackDamageIndexedEffect[];
}): {
  readonly objectHitEffect: SpellObjectHitEffect;
  readonly postDamageEffects: readonly SpellAttackDamageIndexedEffect[];
} {
  if (
    input.targeting.kind === "singleCreatureOrObject" &&
    isFireDamageObjectIgnitionShape(input)
  ) {
    return {
      objectHitEffect: { kind: "igniteFlammableUnattended" },
      postDamageEffects: [],
    };
  }
  return {
    objectHitEffect: { kind: "none" },
    postDamageEffects: input.postDamageEffects,
  };
}

function isFireDamageObjectIgnitionShape(input: {
  readonly spell: SpellMechanicsSource;
  readonly phase: Extract<
    SpellActivationPhase,
    { readonly kind: "attack_roll" }
  >;
  readonly damageEffect: SpellAttackDamageEffect;
  readonly postDamageEffects: readonly SpellAttackDamageIndexedEffect[];
}): boolean {
  return (
    input.spell.mechanics.level === 0 &&
    input.spell.mechanics.duration.kind === "instantaneous" &&
    input.phase.attackKind === "ranged_spell_attack" &&
    input.damageEffect.damageType === "fire" &&
    input.postDamageEffects.length === 1 &&
    input.postDamageEffects[0]?.effect.kind === "ignite_objects" &&
    input.postDamageEffects[0].effect.filter.material === "flammable" &&
    input.postDamageEffects[0].effect.filter.targetRelation ===
      "not_worn_or_carried"
  );
}

export function spellAttackDamageTargeting(
  attachment: Attachment,
): SpellAttackDamageTargeting | null {
  const selection = targetSelectionFromAttachment(attachment);
  if (selection === null || selection.mode !== "one") {
    return null;
  }
  const targetKinds = selection.targetKinds;
  if (targetKinds === undefined || sameStringSet(targetKinds, ["creature"])) {
    return { kind: "singleCombatant" };
  }
  if (sameStringSet(targetKinds, ["creature", "object"])) {
    return { kind: "singleCreatureOrObject" };
  }
  return null;
}

export function singleSpellAttackDamageRangeFeet(
  targeting: SpellAttackDamageTargeting | null,
  range: BattleSpellAdmissionSource["mechanics"]["range"],
): ReturnType<typeof singleTargetSpellRangeFeet> {
  if (targeting === null) {
    return null;
  }
  return singleTargetSpellRangeFeet(range);
}

export function primaryTargetOriginEmanationTargeting(
  attachment: Attachment,
): Extract<
  SpellTargeting,
  { readonly kind: "primaryTargetOriginEmanation" }
> | null {
  const value = attachment.kind === "hole" ? attachment.value : attachment;
  if (
    value.kind === "area" &&
    value.origin.kind === "on_primary_target" &&
    value.shape.kind === "emanation" &&
    value.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  ) {
    return {
      kind: "primaryTargetOriginEmanation",
      radiusFeet: movementFeet(value.shape.radiusFeet),
    };
  }
  return null;
}
