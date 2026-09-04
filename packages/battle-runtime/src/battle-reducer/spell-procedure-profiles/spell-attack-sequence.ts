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
import { Schema } from "effect";

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

export const SPELL_ATTACK_SEQUENCE_FAILED_FACTS = [
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

function spellAttackSequenceCandidatePhase(
  phase: SpellAttackSequenceActivationPhase,
): boolean {
  return (
    phase.kind === "attack_roll" &&
    phase.attackKind === "ranged_spell_attack" &&
    phase.onHit.some((effect) => effect.kind === "damage")
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

function spellAttackSequenceSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    mechanics.phases.some(spellAttackSequenceCandidatePhase)
  );
}

function spellAttackSequenceDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "activation" &&
    (mechanics.level === 0 || mechanics.level === 2) &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 120 &&
    mechanics.duration.kind === "instantaneous"
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
  level: number,
): SpellAttackSequenceCountFacts | undefined {
  if (
    selection.mode !== "choose_up_to" ||
    selection.repeatsAllowed !== true ||
    selection.count === undefined
  ) {
    return undefined;
  }
  const count = selection.count;
  if (
    level === 0 &&
    count !== null &&
    typeof count === "object" &&
    count.kind === "threshold_tiers" &&
    spellMechanicsObjectHasOnlyKeys(
      count,
      SPELL_ATTACK_SEQUENCE_CHARACTER_COUNT_FIELDS,
    ) &&
    count.axis === "character" &&
    count.base === CHARACTER_LEVEL_SCALED_SPELL_ATTACK_COUNTS[0]
  ) {
    const base = multiBeamSpellAttackBeamCount(count.base);
    const parsedTiers = count.tiers.flatMap((tier) => {
      const atLevel = spellCharacterLevelFromSurface(tier.atLevel);
      const value = multiBeamSpellAttackBeamCount(tier.value);
      return spellMechanicsObjectHasOnlyKeys(
        tier,
        SPELL_ATTACK_SEQUENCE_COUNT_TIER_FIELDS,
      ) &&
        atLevel !== undefined &&
        value !== null
        ? [{ ...tier, atLevel, value }]
        : [];
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
    if (base !== null && tiers !== undefined) {
      return { kind: "character", base, tiers };
    }
  }
  if (
    level === 2 &&
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
  ) {
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
  return undefined;
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

function admitSpellAttackSequenceMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "spellAttackSequence",
  SpellAttackSequenceMechanicsFacts,
  SpellAttackSequenceInvocation,
  ReturnType<typeof spellAttackSequenceIssueResult>
> {
  if (
    !spellAttackSequenceSemanticCandidate(source.mechanics) &&
    !spellAttackSequenceDistinctiveHeaderFallback(source.mechanics)
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(
    (phase) => phase.kind === "attack_roll",
  );
  const inspectedPhaseIndex = phaseIndex >= 0 ? phaseIndex : 0;
  const phase = mechanics.phases[inspectedPhaseIndex];
  const attackPhase = phase?.kind === "attack_roll" ? phase : undefined;
  const hitEffectIndex =
    attackPhase?.onHit.findIndex((effect) => effect.kind === "damage") ?? -1;
  const hitEffect =
    hitEffectIndex >= 0 ? attackPhase?.onHit[hitEffectIndex] : undefined;
  const damageEffect = hitEffect?.kind === "damage" ? hitEffect : undefined;
  const cantripDamageAmount =
    mechanics.level === 0 &&
    damageEffect !== undefined &&
    spellAttackSequenceDamageAmountIsCanonical(damageEffect.amount, 1, 10)
      ? damageEffect.amount
      : undefined;
  const rayDamageAmount =
    mechanics.level === 2 &&
    damageEffect !== undefined &&
    spellAttackSequenceDamageAmountIsCanonical(damageEffect.amount, 2, 6)
      ? damageEffect.amount
      : undefined;
  const damageAmount = cantripDamageAmount ?? rayDamageAmount;
  const cantripDamageType =
    mechanics.level === 0 && damageEffect?.damageType === "force"
      ? damageEffect.damageType
      : undefined;
  const rayDamageType =
    mechanics.level === 2 && damageEffect?.damageType === "fire"
      ? damageEffect.damageType
      : undefined;
  const damageType = cantripDamageType ?? rayDamageType;
  const missEffect = attackPhase?.onMiss[0];
  const targetAttachmentAdmission =
    attackPhase === undefined
      ? undefined
      : admitSpellTargetAttachment(
          attackPhase.attachment,
          SPELL_ATTACK_SEQUENCE_TARGET_SELECTION_FIELDS,
        );
  const selection =
    attackPhase === undefined
      ? undefined
      : spellAttackSequenceTargetSelection(attackPhase.attachment);
  const count =
    selection === undefined
      ? undefined
      : spellAttackSequenceCountFacts(selection, mechanics.level);
  const issues: SpellAttackSequenceMechanicsIssue[] = [];
  const push = (
    failedFact: SpellAttackSequenceFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ) => issues.push({ failedFact, mechanicsPath });
  if (mechanics.level !== 0 && mechanics.level !== 2) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (
    !spellMechanicsObjectHasOnlyKeys(
      mechanics,
      SPELL_ATTACK_SEQUENCE_ROOT_FIELDS,
    )
  ) {
    push("phase", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.school !== "evocation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 120 ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.range,
      SPELL_ATTACK_SEQUENCE_RANGE_FIELDS,
    )
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.components,
      SPELL_ATTACK_SEQUENCE_COMPONENT_FIELDS,
    )
  ) {
    push("components", spellMechanicsHeaderPath("components"));
  }
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.duration,
      SPELL_ATTACK_SEQUENCE_DURATION_FIELDS,
    )
  ) {
    push("duration", spellMechanicsHeaderPath("duration"));
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    mechanics.castingTime.ritual !== undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      mechanics.castingTime,
      SPELL_ATTACK_SEQUENCE_CASTING_TIME_FIELDS,
    )
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      push("phaseCount", spellActivationPhasePath(PositiveInteger(index + 1)));
    }
    if (mechanics.phases.length === 0) {
      push("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  const phaseOrdinal = PositiveInteger(inspectedPhaseIndex + 1);
  if (phaseIndex < 0) {
    push("phase", spellActivationPhasePath(phaseOrdinal));
  } else if (phaseIndex !== 0) {
    push("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  if (
    attackPhase === undefined ||
    !spellMechanicsObjectHasOnlyKeys(
      attackPhase,
      SPELL_ATTACK_SEQUENCE_PHASE_FIELDS,
    ) ||
    attackPhase.continue !== undefined ||
    attackPhase.attackKind !== "ranged_spell_attack"
  ) {
    push("attackKind", spellActivationPhasePath(phaseOrdinal));
  }
  if (
    targetAttachmentAdmission === undefined ||
    (targetAttachmentAdmission.tag === "rejected" &&
      targetAttachmentAdmission.reason !== "targetSelectionConstraint")
  ) {
    push("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  if (selection === undefined || count === undefined) {
    push("targeting", spellActivationAttachmentPath(phaseOrdinal));
  }
  const hitEffects = attackPhase?.onHit ?? [];
  if (hitEffects.length !== 1) {
    for (const [index] of hitEffects.entries()) {
      if (index === hitEffectIndex) continue;
      push(
        "hitDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
      );
    }
    if (hitEffects.length === 0) {
      push(
        "hitDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
  }
  if (damageEffect === undefined || hitEffectIndex < 0) {
    push(
      "hitDamage",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  } else if (
    !spellMechanicsObjectHasOnlyKeys(
      damageEffect,
      SPELL_ATTACK_SEQUENCE_DAMAGE_EFFECT_FIELDS,
    ) ||
    damageEffect.timing !== undefined ||
    damageAmount === undefined
  ) {
    push(
      "damageAmount",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(hitEffectIndex + 1),
      ),
    );
  }
  if (
    attackPhase === undefined ||
    attackPhase.onMiss.length !== 1 ||
    missEffect?.kind !== "none" ||
    !spellMechanicsObjectHasOnlyKeys(
      missEffect,
      SPELL_ATTACK_SEQUENCE_NONE_EFFECT_FIELDS,
    )
  ) {
    push("missEffect", spellActivationPhasePath(phaseOrdinal));
  }
  if (damageType === undefined) {
    push(
      "damageType",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(Math.max(1, hitEffectIndex + 1)),
      ),
    );
  }
  const rangeFeet = spellDefinitionPointRangeFeet(
    source.spellDefinitionRuleFacts.range,
  );
  if (rangeFeet === undefined) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  const facts: SpellAttackSequenceMechanicsFacts | undefined =
    rangeFeet !== undefined &&
    mechanics.level === 0 &&
    count?.kind === "character" &&
    cantripDamageType !== undefined &&
    cantripDamageAmount !== undefined
      ? {
          ...source.spellDefinitionRuleFacts,
          level: mechanics.level,
          rangeFeet,
          attackKind: "ranged_spell_attack",
          damageAmount: cantripDamageAmount,
          damageType: cantripDamageType,
          count,
        }
      : rangeFeet !== undefined &&
          mechanics.level === 2 &&
          count?.kind === "slot" &&
          rayDamageType !== undefined &&
          rayDamageAmount !== undefined
        ? {
            ...source.spellDefinitionRuleFacts,
            level: mechanics.level,
            rangeFeet,
            attackKind: "ranged_spell_attack",
            damageAmount: rayDamageAmount,
            damageType: rayDamageType,
            count,
          }
        : undefined;
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
