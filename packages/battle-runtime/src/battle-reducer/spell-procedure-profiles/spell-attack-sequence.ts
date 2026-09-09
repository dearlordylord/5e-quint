import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-independent-attack-sequence
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The spellAttackSequence Spell Procedure Profile: an action-time spell attack
// that resolves multiple independent spell attack parts from one spell
// invocation.
//
// RAW anchors:
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls" and "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - SRD 5.2.1 spell text for Eldritch Blast and Scorching Ray.
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll,
//     Damage Type, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { spellCastSelectionSubject } from "../spells-discovery.ts";
import type { SpellAttackSequenceInvocation } from "../spells-profiles-attack-damage.ts";
import { resolveSpellAttackSequenceAct } from "../spells-resolve-attack-sequence.ts";
import {
  spellAttackSequencePartObjectTargetHole,
  spellAttackSequencePartTargetHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  AttackBonus,
  CantripSpellAttackSequenceTargetingSchema,
  CantripSpellAccessSchema,
  DamageTypeSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  PreparedSpellAttackSequenceTargetingSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
  CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNT_TIERS,
  multiBeamSpellAttackBeamCount,
  multiRaySpellAttackRayCount,
  SLOT_LEVEL_SCALED_SPELL_ATTACK_BASE_SLOT_LEVEL,
  SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNT_PER_SLOT,
  SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS,
  type MultiBeamSpellAttackBeamCount,
  type MultiRaySpellAttackRayCount,
} from "../domain-constants.ts";
import {
  cantripSpellAccessFor,
  spellAdmissionCharacterLevel,
  spellInvocationResourceForCastOption,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type {
  Attachment,
  DiceAmount,
  DiceExpr,
  EffectAtom,
  SpellLevel,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  admitSpellTargetAttachment,
  spellConsumedMaterialEvidencePaths,
  spellDefinitionPointRangeFeet,
  spellCharacterLevelFromSurface,
  spellMechanicsFixedTableEntries,
  spellMechanicsObjectHasOnlyKeys,
  spellPositiveIntegerFromSurface,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellSlotLevelFromSurface,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  PositiveInteger,
  attackBonus,
  type CharacterLevel,
  type MovementFeet as MovementFeetType,
  type ReadonlyNonEmptyArray,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { Match, Schema } from "effect";

type SpellAttackSequenceResolveInput =
  SpellProcedureProfileResolveInput<SpellAttackSequenceInvocation>;

type SpellAttackSequenceCountFacts =
  | {
      readonly kind: "character";
      readonly base: MultiBeamSpellAttackBeamCount;
      readonly tiers: ReadonlyNonEmptyArray<{
        readonly atLevel: CharacterLevel;
        readonly value: MultiBeamSpellAttackBeamCount;
      }>;
    }
  | {
      readonly kind: "slot";
      readonly base: MultiRaySpellAttackRayCount;
      readonly baseLevel: SpellSlotLevel;
      readonly perSlotAboveBase: PositiveInteger;
    };
type SpellAttackSequenceCharacterCountFacts = Extract<
  SpellAttackSequenceCountFacts,
  { readonly kind: "character" }
>;
type SpellAttackSequenceSlotCountFacts = Extract<
  SpellAttackSequenceCountFacts,
  { readonly kind: "slot" }
>;
type SpellAttackSequenceCanonicalDiceExpr<
  Dice extends number,
  DieSize extends number,
> = DiceExpr & {
  readonly dice: Dice;
  readonly dieSize: DieSize;
  readonly flat?: undefined;
  readonly spellcastingMod?: undefined;
  readonly abilityModifier?: undefined;
};
type SpellAttackSequenceCanonicalDamageAmount<
  Dice extends number,
  DieSize extends number,
> = Extract<DiceAmount, { readonly kind: "fixed" }> & {
  readonly expr: SpellAttackSequenceCanonicalDiceExpr<Dice, DieSize>;
};
type SpellAttackSequenceMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "level"
> & {
  readonly rangeFeet: MovementFeetType;
  readonly attackKind: "ranged_spell_attack";
} & (
    | {
        readonly level: 0;
        readonly damageAmount: SpellAttackSequenceCanonicalDamageAmount<1, 10>;
        readonly damageType: "force";
        readonly count: SpellAttackSequenceCharacterCountFacts;
      }
    | {
        readonly level: 2;
        readonly damageAmount: SpellAttackSequenceCanonicalDamageAmount<2, 6>;
        readonly damageType: "fire";
        readonly count: SpellAttackSequenceSlotCountFacts;
      }
  );
type SpellAttackSequenceMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
const SPELL_ATTACK_SEQUENCE_LEVELS = [
  0, 2,
] as const satisfies readonly SpellLevel[];
type SpellAttackSequenceLevel = (typeof SPELL_ATTACK_SEQUENCE_LEVELS)[number];
type SpellAttackSequenceActivationPhase =
  SpellAttackSequenceMechanics["phases"][number];
type SpellAttackSequenceTargetSelection = Extract<
  TargetSelection,
  { readonly mode: "choose_up_to" }
>;
type SpellAttackSequenceAttackPhase = Extract<
  SpellAttackSequenceActivationPhase,
  { readonly kind: "attack_roll" }
>;
type SpellAttackSequenceCharacterCount = Extract<
  SpellAttackSequenceTargetSelection["count"],
  { readonly kind: "threshold_tiers" }
>;
type SpellAttackSequenceSlotCount = Extract<
  SpellAttackSequenceTargetSelection["count"],
  { readonly kind: "linear" }
>;
type SpellAttackSequenceCountTier =
  SpellAttackSequenceCharacterCount["tiers"][number];
type SpellAttackSequenceCastingTime = Extract<
  SpellAttackSequenceMechanics["castingTime"],
  { readonly kind: "action" }
>;
type SpellAttackSequenceRange = Extract<
  SpellMechanics["range"],
  { readonly kind: "point" }
>;
type SpellAttackSequenceDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: "instantaneous" }
>;
type SpellAttackSequenceDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
>;
type SpellAttackSequenceDamageAmount = Extract<
  DiceAmount,
  { readonly kind: "fixed" }
>;
type SpellAttackSequenceDamageProjection =
  | {
      readonly kind: "character";
      readonly damageAmount:
        | SpellAttackSequenceCanonicalDamageAmount<1, 10>
        | undefined;
      readonly damageType: "force" | undefined;
    }
  | {
      readonly kind: "slot";
      readonly damageAmount:
        | SpellAttackSequenceCanonicalDamageAmount<2, 6>
        | undefined;
      readonly damageType: "fire" | undefined;
    };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for SpellAttackSequenceFailedFact.
const SPELL_ATTACK_SEQUENCE_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "phase",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "targeting",
  "attackKind",
  "hitDamage",
  "damageAmount",
  "damageType",
  "missEffect",
] as const;
type SpellAttackSequenceFailedFact =
  (typeof SPELL_ATTACK_SEQUENCE_FAILED_FACTS)[number];
type SpellAttackSequenceMechanicsIssue = {
  readonly failedFact: SpellAttackSequenceFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

const SPELL_ATTACK_SEQUENCE_PHASE_FIELDS = [
  "kind",
  "attachment",
  "attackKind",
  "onHit",
  "onMiss",
  "continue",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceAttackPhase>;
const SPELL_ATTACK_SEQUENCE_ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceMechanics>;
const SPELL_ATTACK_SEQUENCE_TARGET_SELECTION_FIELDS = [
  "mode",
  "count",
  "repeatsAllowed",
  "targetKinds",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceTargetSelection>;
const SPELL_ATTACK_SEQUENCE_CHARACTER_COUNT_FIELDS = [
  "kind",
  "axis",
  "base",
  "tiers",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceCharacterCount>;
const SPELL_ATTACK_SEQUENCE_SLOT_COUNT_FIELDS = [
  "kind",
  "base",
  "perSlotAboveBase",
  "baseLevel",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceSlotCount>;
const SPELL_ATTACK_SEQUENCE_COUNT_TIER_FIELDS = [
  "atLevel",
  "value",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceCountTier>;
const SPELL_ATTACK_SEQUENCE_CASTING_TIME_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceCastingTime>;
const SPELL_ATTACK_SEQUENCE_RANGE_FIELDS = [
  "kind",
  "feet",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceRange>;
const SPELL_ATTACK_SEQUENCE_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof SpellMechanics["components"]>;
const SPELL_ATTACK_SEQUENCE_DURATION_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceDuration>;
const SPELL_ATTACK_SEQUENCE_DAMAGE_EFFECT_FIELDS = [
  "kind",
  "damageType",
  "amount",
  "timing",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceDamageEffect>;
const SPELL_ATTACK_SEQUENCE_DAMAGE_AMOUNT_FIELDS = [
  "kind",
  "expr",
] as const satisfies ReadonlyArray<keyof SpellAttackSequenceDamageAmount>;
const SPELL_ATTACK_SEQUENCE_DICE_EXPR_FIELDS = [
  "dice",
  "dieSize",
  "flat",
  "spellcastingMod",
  "abilityModifier",
] as const satisfies ReadonlyArray<keyof DiceExpr>;
const SPELL_ATTACK_SEQUENCE_NONE_EFFECT_FIELDS = [
  "kind",
] as const satisfies ReadonlyArray<
  keyof Extract<EffectAtom, { readonly kind: "none" }>
>;

function spellAttackSequenceAttackPhaseHasCanonicalDamage(
  phase: SpellAttackSequenceActivationPhase,
  level: SpellAttackSequenceLevel | null,
): boolean {
  if (phase.kind !== "attack_roll") {
    return false;
  }
  const damage = phase.onHit.find((effect) => effect.kind === "damage");
  if (damage === undefined) return false;
  const projection = spellAttackSequenceDamageProjection(damage, level);
  return (
    projection !== undefined &&
    projection.damageAmount !== undefined &&
    projection.damageType !== undefined
  );
}

function spellAttackSequenceIssueResult(
  issue: SpellAttackSequenceMechanicsIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "spellAttackSequence" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported spellAttackSequence mechanics fact: ${issue.failedFact}.`,
  };
}

function spellAttackSequenceCastingTimeIsCanonical(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return (
    mechanics.castingTime.kind === "action" &&
    mechanics.castingTime.ritual === undefined &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SPELL_ATTACK_SEQUENCE_CASTING_TIME_FIELDS,
    )
  );
}

function spellAttackSequenceRangeIsCanonical(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return (
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 120 &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      SPELL_ATTACK_SEQUENCE_RANGE_FIELDS,
    )
  );
}

function spellAttackSequenceDurationIsCanonical(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return (
    mechanics.duration.kind === "instantaneous" &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      SPELL_ATTACK_SEQUENCE_DURATION_FIELDS,
    )
  );
}

function spellAttackSequenceComponentsAreCanonical(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return (
    mechanics.components.v === true &&
    mechanics.components.s === true &&
    mechanics.components.m === false &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      SPELL_ATTACK_SEQUENCE_COMPONENT_FIELDS,
    )
  );
}

function spellAttackSequenceLevel(
  level: SpellLevel,
): SpellAttackSequenceLevel | null {
  return (
    SPELL_ATTACK_SEQUENCE_LEVELS.find((candidate) => candidate === level) ??
    null
  );
}

function spellAttackSequenceHeaderEnvelopeIsCanonical(
  mechanics: SpellMechanics,
): boolean {
  if (mechanics.family !== "activation") return false;
  return (
    spellAttackSequenceLevel(mechanics.level) !== null &&
    mechanics.school === "evocation" &&
    spellAttackSequenceCastingTimeIsCanonical(mechanics) &&
    spellAttackSequenceRangeIsCanonical(mechanics) &&
    spellAttackSequenceDurationIsCanonical(mechanics) &&
    spellAttackSequenceComponentsAreCanonical(mechanics) &&
    spellMechanicsObjectHasOnlyKeys(
      mechanics,
      SPELL_ATTACK_SEQUENCE_ROOT_FIELDS,
    )
  );
}

function spellAttackSequencePhaseHasMultiAttackTargeting(
  phase: SpellAttackSequenceActivationPhase,
  level: SpellAttackSequenceLevel | null,
): boolean {
  if (phase.kind !== "attack_roll") return false;
  const selection = spellAttackSequenceTargetSelection(phase.attachment);
  return (
    selection !== undefined &&
    spellAttackSequenceCountFacts(selection, level) !== undefined
  );
}

function spellAttackSequenceIsRepresented(mechanics: SpellMechanics): boolean {
  if (mechanics.family !== "activation") return false;
  const canonicalHeaderEnvelope =
    spellAttackSequenceHeaderEnvelopeIsCanonical(mechanics);
  const level = spellAttackSequenceLevel(mechanics.level);
  return mechanics.phases.some((phase) =>
    spellProcedureHasRedundantSignature({
      kind: "oneWitnessMayBeMissing",
      witnesses: [
        {
          name: "canonicalHeaderEnvelope",
          present: canonicalHeaderEnvelope,
        },
        {
          name: "multiAttackTargeting",
          present: spellAttackSequencePhaseHasMultiAttackTargeting(
            phase,
            level,
          ),
        },
        {
          name: "canonicalDamage",
          present: spellAttackSequenceAttackPhaseHasCanonicalDamage(
            phase,
            level,
          ),
        },
      ],
    }),
  );
}

function spellAttackSequenceTargetSelection(
  attachment: Attachment | undefined,
): TargetSelection | undefined {
  if (attachment?.kind !== "hole") {
    return undefined;
  }
  const admitted = admitSpellTargetAttachment(
    attachment,
    SPELL_ATTACK_SEQUENCE_TARGET_SELECTION_FIELDS,
  );
  if (admitted.tag !== "admitted") return undefined;
  const selection = admitted.attachment.value.selection;
  return selection.targetKinds !== undefined &&
    sameStringSet(selection.targetKinds, ["creature", "object"])
    ? selection
    : undefined;
}

function spellAttackSequenceCountFacts(
  selection: TargetSelection,
  level: SpellAttackSequenceLevel | null,
): SpellAttackSequenceCountFacts | undefined {
  if (
    selection.mode !== "choose_up_to" ||
    selection.repeatsAllowed !== true ||
    selection.count === undefined
  ) {
    return undefined;
  }
  const count = selection.count;
  return Match.value(level).pipe(
    Match.when(0, () => spellAttackSequenceCharacterCountFacts(count)),
    Match.when(2, () => spellAttackSequenceSlotCountFacts(count)),
    Match.when(null, () => undefined),
    Match.exhaustive,
  );
}

type SpellAttackSequenceAuthoredCount =
  SpellAttackSequenceTargetSelection["count"];
type SpellAttackSequenceCharacterCountEnvelope =
  SpellAttackSequenceCharacterCount & {
    readonly axis: "character";
    readonly base: (typeof CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS)[0];
  };
type SpellAttackSequenceSlotCountEnvelope = SpellAttackSequenceSlotCount & {
  readonly base: (typeof SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS)[0];
  readonly baseLevel: typeof SLOT_LEVEL_SCALED_SPELL_ATTACK_BASE_SLOT_LEVEL;
  readonly perSlotAboveBase: typeof SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNT_PER_SLOT;
};

function isSpellAttackSequenceCharacterCountEnvelope(
  count: SpellAttackSequenceAuthoredCount,
): count is SpellAttackSequenceCharacterCountEnvelope {
  return (
    count !== null &&
    typeof count === "object" &&
    count.kind === "threshold_tiers" &&
    spellMechanicsObjectHasOnlyKeys(
      count,
      SPELL_ATTACK_SEQUENCE_CHARACTER_COUNT_FIELDS,
    ) &&
    count.axis === "character" &&
    count.base === CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS[0]
  );
}

function spellAttackSequenceCharacterCountTier(
  tier: SpellAttackSequenceCountTier,
): SpellAttackSequenceCharacterCountFacts["tiers"][number] | undefined {
  const atLevel = spellCharacterLevelFromSurface(tier.atLevel);
  const value = multiBeamSpellAttackBeamCount(tier.value);
  return spellMechanicsObjectHasOnlyKeys(
    tier,
    SPELL_ATTACK_SEQUENCE_COUNT_TIER_FIELDS,
  ) &&
    atLevel !== undefined &&
    value !== null
    ? { ...tier, atLevel, value }
    : undefined;
}

function spellAttackSequenceCharacterCountFacts(
  count: SpellAttackSequenceAuthoredCount,
): SpellAttackSequenceCharacterCountFacts | undefined {
  if (!isSpellAttackSequenceCharacterCountEnvelope(count)) return undefined;
  const base = multiBeamSpellAttackBeamCount(count.base);
  const parsedTiers = count.tiers.flatMap((tier) => {
    const parsed = spellAttackSequenceCharacterCountTier(tier);
    return parsed === undefined ? [] : [parsed];
  });
  const orderedTiers = spellMechanicsFixedTableEntries(
    parsedTiers,
    CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNT_TIERS,
    (actual, expected) =>
      Number(actual.atLevel) === expected.atLevel &&
      actual.value === expected.value,
  );
  const tiers =
    parsedTiers.length === count.tiers.length && orderedTiers !== undefined
      ? spellProcedureNonEmpty(orderedTiers)
      : undefined;
  return base === null || tiers === undefined
    ? undefined
    : { kind: "character", base, tiers };
}

function isSpellAttackSequenceSlotCountEnvelope(
  count: SpellAttackSequenceAuthoredCount,
): count is SpellAttackSequenceSlotCountEnvelope {
  return (
    count !== null &&
    typeof count === "object" &&
    count.kind === "linear" &&
    spellMechanicsObjectHasOnlyKeys(
      count,
      SPELL_ATTACK_SEQUENCE_SLOT_COUNT_FIELDS,
    ) &&
    count.base === SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNTS[0] &&
    count.baseLevel === SLOT_LEVEL_SCALED_SPELL_ATTACK_BASE_SLOT_LEVEL &&
    count.perSlotAboveBase === SLOT_LEVEL_SCALED_SPELL_ATTACK_COUNT_PER_SLOT
  );
}

function spellAttackSequenceSlotCountFacts(
  count: SpellAttackSequenceAuthoredCount,
): SpellAttackSequenceSlotCountFacts | undefined {
  if (!isSpellAttackSequenceSlotCountEnvelope(count)) return undefined;
  const base = multiRaySpellAttackRayCount(count.base);
  const baseLevel = spellSlotLevelFromSurface(count.baseLevel);
  const perSlotAboveBase = spellPositiveIntegerFromSurface(
    count.perSlotAboveBase,
  );
  return base === null ||
    baseLevel === undefined ||
    perSlotAboveBase === undefined
    ? undefined
    : { kind: "slot", base, baseLevel, perSlotAboveBase };
}

function spellAttackSequenceDamageAmountIsCanonical<
  const Dice extends number,
  const DieSize extends number,
>(
  amount: DiceAmount,
  dice: Dice,
  dieSize: DieSize,
): amount is SpellAttackSequenceCanonicalDamageAmount<Dice, DieSize> {
  if (amount.kind !== "fixed") return false;
  return (
    spellMechanicsObjectHasOnlyKeys(
      amount,
      SPELL_ATTACK_SEQUENCE_DAMAGE_AMOUNT_FIELDS,
    ) &&
    spellMechanicsObjectHasOnlyKeys(
      amount.expr,
      SPELL_ATTACK_SEQUENCE_DICE_EXPR_FIELDS,
    ) &&
    amount.expr.dice === dice &&
    amount.expr.dieSize === dieSize &&
    amount.expr.flat === undefined &&
    amount.expr.spellcastingMod === undefined &&
    amount.expr.abilityModifier === undefined
  );
}

function spellAttackSequenceDamageProjection(
  damage: SpellAttackSequenceDamageEffect,
  level: SpellAttackSequenceLevel | null,
): SpellAttackSequenceDamageProjection | undefined {
  return Match.value(level).pipe(
    Match.when(
      0,
      () =>
        ({
          kind: "character",
          damageAmount: spellAttackSequenceDamageAmountIsCanonical(
            damage.amount,
            1,
            10,
          )
            ? damage.amount
            : undefined,
          damageType:
            damage.damageType === "force" ? damage.damageType : undefined,
        }) as const,
    ),
    Match.when(
      2,
      () =>
        ({
          kind: "slot",
          damageAmount: spellAttackSequenceDamageAmountIsCanonical(
            damage.amount,
            2,
            6,
          )
            ? damage.amount
            : undefined,
          damageType:
            damage.damageType === "fire" ? damage.damageType : undefined,
        }) as const,
    ),
    Match.when(null, () => undefined),
    Match.exhaustive,
  );
}

type SpellAttackSequenceFactsInput = Readonly<{
  spellDefinitionRuleFacts: SpellMechanicsAdmissionSource["spellDefinitionRuleFacts"];
  rangeFeet: MovementFeetType | undefined;
  count: SpellAttackSequenceCountFacts | undefined;
  damage: SpellAttackSequenceDamageProjection | undefined;
}>;

function spellAttackSequenceCharacterFacts({
  spellDefinitionRuleFacts,
  rangeFeet,
  count,
  damage,
}: SpellAttackSequenceFactsInput):
  | Extract<SpellAttackSequenceMechanicsFacts, { readonly level: 0 }>
  | undefined {
  return rangeFeet !== undefined &&
    count?.kind === "character" &&
    damage?.kind === "character" &&
    damage.damageAmount !== undefined &&
    damage.damageType !== undefined
    ? {
        ...spellDefinitionRuleFacts,
        level: 0,
        rangeFeet,
        attackKind: "ranged_spell_attack",
        damageAmount: damage.damageAmount,
        damageType: damage.damageType,
        count,
      }
    : undefined;
}

function spellAttackSequenceSlotFacts({
  spellDefinitionRuleFacts,
  rangeFeet,
  count,
  damage,
}: SpellAttackSequenceFactsInput):
  | Extract<SpellAttackSequenceMechanicsFacts, { readonly level: 2 }>
  | undefined {
  return rangeFeet !== undefined &&
    count?.kind === "slot" &&
    damage?.kind === "slot" &&
    damage.damageAmount !== undefined &&
    damage.damageType !== undefined
    ? {
        ...spellDefinitionRuleFacts,
        level: 2,
        rangeFeet,
        attackKind: "ranged_spell_attack",
        damageAmount: damage.damageAmount,
        damageType: damage.damageType,
        count,
      }
    : undefined;
}

function spellAttackSequenceFacts(
  level: SpellAttackSequenceLevel | null,
  input: SpellAttackSequenceFactsInput,
): SpellAttackSequenceMechanicsFacts | undefined {
  return Match.value(level).pipe(
    Match.when(0, () => spellAttackSequenceCharacterFacts(input)),
    Match.when(2, () => spellAttackSequenceSlotFacts(input)),
    Match.when(null, () => undefined),
    Match.exhaustive,
  );
}

function spellAttackSequenceMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
  effectIndex: number,
): SpellProcedureMechanicsEvidence {
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    spellActivationEffectPath(phaseOrdinal, PositiveInteger(effectIndex + 1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function spellAttackSequenceIssueIf(
  supported: boolean,
  failedFact: SpellAttackSequenceFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly SpellAttackSequenceMechanicsIssue[] {
  return supported ? [] : [{ failedFact, mechanicsPath }];
}

function spellAttackSequenceHeaderIssues(
  mechanics: SpellAttackSequenceMechanics,
  level: SpellAttackSequenceLevel | null,
): readonly SpellAttackSequenceMechanicsIssue[] {
  return [
    ...spellAttackSequenceIssueIf(
      level !== null,
      "level",
      spellMechanicsHeaderPath("level"),
    ),
    ...spellAttackSequenceIssueIf(
      spellMechanicsObjectHasOnlyKeys(
        mechanics,
        SPELL_ATTACK_SEQUENCE_ROOT_FIELDS,
      ),
      "phase",
      spellMechanicsHeaderPath("family"),
    ),
    ...spellAttackSequenceIssueIf(
      mechanics.school === "evocation",
      "school",
      spellMechanicsHeaderPath("school"),
    ),
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceRangeIsCanonical(mechanics),
      "range",
      spellMechanicsHeaderPath("range"),
    ),
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceComponentsAreCanonical(mechanics),
      "components",
      spellMechanicsHeaderPath("components"),
    ),
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceDurationIsCanonical(mechanics),
      "duration",
      spellMechanicsHeaderPath("duration"),
    ),
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceCastingTimeIsCanonical(mechanics),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ),
  ];
}

function spellAttackSequencePhaseCountIssues(
  mechanics: SpellAttackSequenceMechanics,
  phaseIndex: number,
): readonly SpellAttackSequenceMechanicsIssue[] {
  if (mechanics.phases.length === 1) return [];
  const extraIssues = mechanics.phases.flatMap(
    (_phase, index): readonly SpellAttackSequenceMechanicsIssue[] =>
      index === phaseIndex
        ? []
        : [
            {
              failedFact: "phaseCount",
              mechanicsPath: spellActivationPhasePath(
                PositiveInteger(index + 1),
              ),
            },
          ],
  );
  return mechanics.phases.length === 0
    ? [
        {
          failedFact: "phaseCount",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
        },
      ]
    : extraIssues;
}

function spellAttackSequenceAttackPhaseSupported(
  attackPhase: SpellAttackSequenceAttackPhase | undefined,
): boolean {
  return (
    attackPhase !== undefined &&
    spellMechanicsObjectHasOnlyKeys(
      attackPhase,
      SPELL_ATTACK_SEQUENCE_PHASE_FIELDS,
    ) &&
    attackPhase.continue === undefined &&
    attackPhase.attackKind === "ranged_spell_attack"
  );
}

function spellAttackSequenceAttachmentSupported(
  attackPhase: SpellAttackSequenceAttackPhase | undefined,
): boolean {
  if (attackPhase === undefined) return false;
  const admission = admitSpellTargetAttachment(
    attackPhase.attachment,
    SPELL_ATTACK_SEQUENCE_TARGET_SELECTION_FIELDS,
  );
  return (
    admission.tag === "admitted" ||
    admission.reason === "targetSelectionConstraint"
  );
}

function spellAttackSequencePhaseIssues(input: {
  readonly phaseIndex: number;
  readonly phaseOrdinal: ReturnType<typeof PositiveInteger>;
  readonly attackPhase: SpellAttackSequenceAttackPhase | undefined;
  readonly selection: TargetSelection | undefined;
  readonly count: SpellAttackSequenceCountFacts | undefined;
}): readonly SpellAttackSequenceMechanicsIssue[] {
  const phasePositionIssues =
    input.phaseIndex < 0
      ? [
          {
            failedFact: "phase" as const,
            mechanicsPath: spellActivationPhasePath(input.phaseOrdinal),
          },
        ]
      : spellAttackSequenceIssueIf(
          input.phaseIndex === 0,
          "phaseOrder",
          spellActivationPhasePath(input.phaseOrdinal),
        );
  return [
    ...phasePositionIssues,
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceAttackPhaseSupported(input.attackPhase),
      "attackKind",
      spellActivationPhasePath(input.phaseOrdinal),
    ),
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceAttachmentSupported(input.attackPhase),
      "attachment",
      spellActivationAttachmentPath(input.phaseOrdinal),
    ),
    ...spellAttackSequenceIssueIf(
      input.selection !== undefined && input.count !== undefined,
      "targeting",
      spellActivationAttachmentPath(input.phaseOrdinal),
    ),
  ];
}

function spellAttackSequenceHitCountIssues(
  hitEffects: readonly EffectAtom[],
  hitEffectIndex: number,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly SpellAttackSequenceMechanicsIssue[] {
  if (hitEffects.length === 1) return [];
  const extraIssues = hitEffects.flatMap(
    (_effect, index): readonly SpellAttackSequenceMechanicsIssue[] =>
      index === hitEffectIndex
        ? []
        : [
            {
              failedFact: "hitDamage",
              mechanicsPath: spellActivationEffectPath(
                phaseOrdinal,
                PositiveInteger(index + 1),
              ),
            },
          ],
  );
  return hitEffects.length === 0
    ? [
        {
          failedFact: "hitDamage",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(1),
          ),
        },
      ]
    : extraIssues;
}

function spellAttackSequenceDamageAmountSupported(
  damageEffect: SpellAttackSequenceDamageEffect,
  damageProjection: SpellAttackSequenceDamageProjection | undefined,
): boolean {
  return (
    spellMechanicsObjectHasOnlyKeys(
      damageEffect,
      SPELL_ATTACK_SEQUENCE_DAMAGE_EFFECT_FIELDS,
    ) &&
    damageEffect.timing === undefined &&
    damageProjection?.damageAmount !== undefined
  );
}

type SpellAttackSequenceDamageInspection = Readonly<{
  readonly attackPhase: SpellAttackSequenceAttackPhase | undefined;
  readonly hitEffectIndex: number;
  readonly damageEffect: SpellAttackSequenceDamageEffect | undefined;
  readonly damageProjection: SpellAttackSequenceDamageProjection | undefined;
  readonly phaseOrdinal: ReturnType<typeof PositiveInteger>;
}>;

function spellAttackSequenceHitDamageIssues(
  input: SpellAttackSequenceDamageInspection,
): readonly SpellAttackSequenceMechanicsIssue[] {
  const damagePath = spellActivationEffectPath(
    input.phaseOrdinal,
    PositiveInteger(Math.max(1, input.hitEffectIndex + 1)),
  );
  const hitDamageIssues =
    input.damageEffect === undefined || input.hitEffectIndex < 0
      ? [
          {
            failedFact: "hitDamage" as const,
            mechanicsPath: spellActivationEffectPath(
              input.phaseOrdinal,
              PositiveInteger(1),
            ),
          },
        ]
      : spellAttackSequenceIssueIf(
          spellAttackSequenceDamageAmountSupported(
            input.damageEffect,
            input.damageProjection,
          ),
          "damageAmount",
          damagePath,
        );
  return [
    ...spellAttackSequenceHitCountIssues(
      input.attackPhase?.onHit ?? [],
      input.hitEffectIndex,
      input.phaseOrdinal,
    ),
    ...hitDamageIssues,
  ];
}

function spellAttackSequenceMissEffectSupported(
  attackPhase: SpellAttackSequenceAttackPhase | undefined,
): boolean {
  if (attackPhase === undefined || attackPhase.onMiss.length !== 1)
    return false;
  const missEffect = attackPhase.onMiss[0];
  return (
    missEffect?.kind === "none" &&
    spellMechanicsObjectHasOnlyKeys(
      missEffect,
      SPELL_ATTACK_SEQUENCE_NONE_EFFECT_FIELDS,
    )
  );
}

function spellAttackSequenceDamageTailIssues(
  input: SpellAttackSequenceDamageInspection,
): readonly SpellAttackSequenceMechanicsIssue[] {
  const damagePath = spellActivationEffectPath(
    input.phaseOrdinal,
    PositiveInteger(Math.max(1, input.hitEffectIndex + 1)),
  );
  return [
    ...spellAttackSequenceIssueIf(
      spellAttackSequenceMissEffectSupported(input.attackPhase),
      "missEffect",
      spellActivationPhasePath(input.phaseOrdinal),
    ),
    ...spellAttackSequenceIssueIf(
      input.damageProjection?.damageType !== undefined,
      "damageType",
      damagePath,
    ),
  ];
}

type SpellAttackSequencePhaseInspection = Readonly<{
  phaseIndex: number;
  inspectedPhaseIndex: number;
  attackPhase: SpellAttackSequenceAttackPhase | undefined;
}>;

function spellAttackSequencePhaseInspection(
  mechanics: SpellAttackSequenceMechanics,
): SpellAttackSequencePhaseInspection {
  const phaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "attack_roll",
  );
  const inspectedPhaseIndex = phaseIndex >= 0 ? phaseIndex : 0;
  const phase = mechanics.phases[inspectedPhaseIndex];
  return {
    phaseIndex,
    inspectedPhaseIndex,
    attackPhase: phase?.kind === "attack_roll" ? phase : undefined,
  };
}

type SpellAttackSequenceHitInspection = Readonly<{
  hitEffectIndex: number;
  damageEffect: SpellAttackSequenceDamageEffect | undefined;
  damageProjection: SpellAttackSequenceDamageProjection | undefined;
}>;

function spellAttackSequenceHitInspection(
  attackPhase: SpellAttackSequenceAttackPhase | undefined,
  level: SpellAttackSequenceLevel | null,
): SpellAttackSequenceHitInspection {
  const hitEffectIndex =
    attackPhase?.onHit.findIndex((effect) => effect.kind === "damage") ?? -1;
  const hitEffect =
    hitEffectIndex >= 0 ? attackPhase?.onHit[hitEffectIndex] : undefined;
  const damageEffect = hitEffect?.kind === "damage" ? hitEffect : undefined;
  return {
    hitEffectIndex,
    damageEffect,
    damageProjection:
      damageEffect === undefined
        ? undefined
        : spellAttackSequenceDamageProjection(damageEffect, level),
  };
}

type SpellAttackSequenceTargetInspection = Readonly<{
  selection: TargetSelection | undefined;
  count: SpellAttackSequenceCountFacts | undefined;
}>;

function spellAttackSequenceTargetInspection(
  attackPhase: SpellAttackSequenceAttackPhase | undefined,
  level: SpellAttackSequenceLevel | null,
): SpellAttackSequenceTargetInspection {
  const selection =
    attackPhase === undefined
      ? undefined
      : spellAttackSequenceTargetSelection(attackPhase.attachment);
  return {
    selection,
    count:
      selection === undefined
        ? undefined
        : spellAttackSequenceCountFacts(selection, level),
  };
}

function admitSpellAttackSequenceMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellAttackSequence",
  SpellAttackSequenceMechanicsFacts,
  SpellAttackSequenceInvocation,
  ReturnType<typeof spellAttackSequenceIssueResult>
> {
  if (!spellAttackSequenceIsRepresented(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const level = spellAttackSequenceLevel(mechanics.level);
  const { phaseIndex, inspectedPhaseIndex, attackPhase } =
    spellAttackSequencePhaseInspection(mechanics);
  const { hitEffectIndex, damageEffect, damageProjection } =
    spellAttackSequenceHitInspection(attackPhase, level);
  const { selection, count } = spellAttackSequenceTargetInspection(
    attackPhase,
    level,
  );
  const phaseOrdinal = PositiveInteger(inspectedPhaseIndex + 1);
  const issues = [
    ...spellAttackSequenceHeaderIssues(mechanics, level),
    ...spellAttackSequencePhaseCountIssues(mechanics, phaseIndex),
    ...spellAttackSequencePhaseIssues({
      phaseIndex,
      phaseOrdinal,
      attackPhase,
      selection,
      count,
    }),
    ...spellAttackSequenceHitDamageIssues({
      attackPhase,
      hitEffectIndex,
      damageEffect,
      damageProjection,
      phaseOrdinal,
    }),
    ...spellAttackSequenceDamageTailIssues({
      attackPhase,
      hitEffectIndex,
      damageEffect,
      damageProjection,
      phaseOrdinal,
    }),
  ];
  const rangeFeet = spellDefinitionPointRangeFeet(
    source.spellDefinitionRuleFacts.range,
  );
  if (rangeFeet === undefined) {
    issues.push({
      failedFact: "range",
      mechanicsPath: spellMechanicsHeaderPath("range"),
    });
  }
  const facts = spellAttackSequenceFacts(level, {
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    rangeFeet,
    count,
    damage: damageProjection,
  });
  const uniqueIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (uniqueIssues !== undefined) {
    const [first, ...rest] = uniqueIssues.map(spellAttackSequenceIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    attackPhase === undefined ||
    selection === undefined ||
    facts === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        spellAttackSequenceIssueResult({
          failedFact: "targeting",
          mechanicsPath: spellActivationAttachmentPath(phaseOrdinal),
        }),
      ],
    };
  }
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "spellAttackSequence",
      facts,
      evidence: spellAttackSequenceMechanicsEvidence(
        mechanics,
        inspectedPhaseIndex,
        hitEffectIndex,
      ),
      admit: (executionSource, ctx) =>
        admitSpellAttackSequence(executionSource, ctx, facts),
    },
  };
}

function admitSpellAttackSequence(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: SpellAttackSequenceMechanicsFacts,
): readonly SpellAttackSequenceInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  const attackBonusValue = attackBonus(
    Number(ctx.castingSource.abilityModifier) +
      Number(spellcasting.proficiencyBonus),
  );
  if (facts.level === 0) {
    const characterLevel = spellAdmissionCharacterLevel(ctx);
    const attackCount = facts.count.tiers.reduce<MultiBeamSpellAttackBeamCount>(
      (current, tier) =>
        Number(characterLevel) >= Number(tier.atLevel) ? tier.value : current,
      facts.count.base,
    );
    return [
      {
        access: cantripSpellAccessFor(spell.castingSource),
        resource: { tag: "none" },
        procedure: "spellAttackSequence",
        spell,
        targeting: {
          kind: "spellAttackSequenceCreatureOrObject",
          countSource: "characterLevel",
          attackCount,
        },
        damage: {
          expr: facts.damageAmount.expr,
          damageType: facts.damageType,
        },
        rangeFeet: facts.rangeFeet,
        attackKind: facts.attackKind,
        attackBonus: attackBonusValue,
      },
    ];
  }
  const slotCount = facts.count;
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SpellAttackSequenceInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const attackCount = multiRaySpellAttackRayCount(
        Number(slotCount.base) +
          (Number(slot.spellLevel) - Number(slotCount.baseLevel)) *
            Number(slotCount.perSlotAboveBase),
      );
      if (attackCount === null) return [];
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "spellAttackSequence",
          spell,
          targeting: {
            kind: "spellAttackSequenceCreatureOrObject",
            countSource: "spellSlotLevel",
            attackCount,
          },
          damage: {
            expr: facts.damageAmount.expr,
            damageType: facts.damageType,
          },
          rangeFeet: facts.rangeFeet,
          attackKind: facts.attackKind,
          attackBonus: attackBonusValue,
        },
      ];
    },
  );
}

function discoverSpellAttackSequenceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SpellAttackSequenceInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const initialHoles = Array.from(
    { length: invocation.targeting.attackCount },
    (_, partIndex) => [
      spellAttackSequencePartTargetHole(state, actorId, invocation, partIndex),
      spellAttackSequencePartObjectTargetHole(invocation, partIndex),
    ],
  ).flat();
  return [
    {
      subject: spellCastSelectionSubject(actorId, invocation),
      initialHoles,
    },
  ];
}

function resolveSpellAttackSequence(
  input: SpellAttackSequenceResolveInput,
): BattleResolutionResult {
  return resolveSpellAttackSequenceAct(spellProcedureResolutionContext(input));
}

const SpellAttackSequenceInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union([
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackSequence"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: CantripSpellAttackSequenceTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackSequence"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: PreparedSpellAttackSequenceTargetingSchema,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
  ]),
);
export const spellAttackSequenceProfile: SpellProcedureDeclaration<
  "spellAttackSequence",
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >
> = {
  procedure: "spellAttackSequence",
  executionSchema: SpellAttackSequenceInvocationSchema,
  admitMechanics: admitSpellAttackSequenceMechanics,
  discoverCastAct: discoverSpellAttackSequenceCastAct,
  resolve: resolveSpellAttackSequence,
};
