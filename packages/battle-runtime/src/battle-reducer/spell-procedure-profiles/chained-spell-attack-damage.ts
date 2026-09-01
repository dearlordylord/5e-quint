import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chained-attack-damage
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
//
// The chainedSpellAttackDamage Spell Procedure Profile: a Spell Slot action
// spell that chooses one damage type, makes a Spell Attack, rolls spell
// damage, and can continue to distinct later targets when the damage dice
// satisfy the spell's duplicate-face continuation rule.
//
// RAW anchors:
//   - SRD 5.2.1 Chromatic Orb: damage-type choice, ranged spell attack,
//     duplicate d8 leap, higher-level leap cap, and one targeting per creature.
//   - SRD 5.2.1 Playing-the-Game "Attack Rolls" and "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Spell Attack".
//   - UBIQUITOUS_LANGUAGE.md: Spell Attack, Attack Roll, Damage Roll,
//     Damage Type, and Spell Invocation.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  CHAINED_DAMAGE_TYPE_ATTACK_DAMAGE_TYPES,
  CHAINED_SPELL_ATTACK_LEAP_RANGE_FEET,
} from "../domain-constants.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
} from "../spells-discovery.ts";
import {
  isBouncingAttackContinuationLimitSetShape,
  spellAttackDamageTargeting,
  supportedSpellAttackKind,
} from "../spells-profiles-attack-damage.ts";
import {
  attachmentValueHasOnlyKeys,
  sameStringSet,
  targetSelectionHasOnlyKeys,
  targetSelectionFromAttachment,
} from "../spells-execution-facts.ts";
import { resolveChainedSpellAttackDamageAct } from "../spells-resolve-chained.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
  spellProcedureResolutionContext,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  spellDurationEvidencePaths,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  isFixedDistancePointRange,
  type Attachment,
  type DamageTypeRef,
  type DiceExpr,
  type DiceExprDelta,
  type EffectAtom,
  type SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  attackBonus,
  movementFeet,
  PositiveInteger,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  AttackBonus,
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type ChainedSpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "chainedSpellAttackDamage" }
>;
type ChainedDamageTypeChoice = Extract<
  Extract<DamageTypeRef, { readonly kind: "hole" }>["value"],
  { readonly kind: "choice" }
>;
type ChainedDamageTypeHole = Extract<
  DamageTypeRef,
  { readonly kind: "hole" }
> & {
  readonly value: ChainedDamageTypeChoice;
};
type SameChoiceDamageType = Extract<
  DamageTypeRef,
  { readonly kind: "same_choice_as" }
>;
type ChainedSpellAttackDamageRange = Extract<
  SpellDefinitionRuleFacts["range"],
  { readonly kind: "point" }
> & { readonly feet: number };
type ChainedSpellAttackDamageDuration = Extract<
  SpellDefinitionRuleFacts["duration"],
  { readonly kind: "instantaneous" }
>;
type ChainedSpellAttackDamageSupportedDiceExpr = Omit<
  DiceExpr,
  "spellcastingMod" | "abilityModifier"
> & {
  readonly spellcastingMod?: never;
  readonly abilityModifier?: never;
};
type ChainedSpellAttackDamageSupportedPerLevel = Omit<
  DiceExprDelta,
  "dieSize" | "flat"
> & {
  readonly dieSize?: never;
  readonly flat?: never;
};
type ChainedSpellAttackDamageFixedAmount = Extract<
  Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
  { readonly kind: "fixed" }
> & {
  readonly expr: ChainedSpellAttackDamageSupportedDiceExpr;
};
type ChainedSpellAttackDamageLinearAmount = Extract<
  Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
  { readonly kind: "linear_per_level" }
> & {
  readonly axis: "slot";
  readonly base: ChainedSpellAttackDamageSupportedDiceExpr;
  readonly perLevel: ChainedSpellAttackDamageSupportedPerLevel;
};
type ChainedSpellAttackDamageAmount =
  | ChainedSpellAttackDamageFixedAmount
  | ChainedSpellAttackDamageLinearAmount;
type ChainedSpellAttackDamageTargeting = Extract<
  ChainedSpellAttackDamageInvocation["targeting"],
  { readonly kind: "singleCombatant" }
>;
type ChainedSpellAttackDamageMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: ChainedSpellAttackDamageRange;
  readonly duration: ChainedSpellAttackDamageDuration;
  readonly targeting: ChainedSpellAttackDamageTargeting;
  readonly attackKind: ChainedSpellAttackDamageInvocation["attackKind"];
  readonly damageAmount: ChainedSpellAttackDamageAmount;
};

type ChainedSpellAttackDamageResolveInput =
  SpellProcedureProfileResolveInput<ChainedSpellAttackDamageInvocation>;

const CHAINED_SPELL_ATTACK_DAMAGE_TARGET_SELECTION_KEYS = [
  "mode",
  "targetKinds",
] as const;
const CHAINED_SPELL_ATTACK_DAMAGE_TARGET_ATTACHMENT_KEYS = [
  "kind",
  "selection",
] as const;

function chainedSpellAttackDamageTargeting(
  attachment: Attachment,
): ReturnType<typeof spellAttackDamageTargeting> {
  const selection = targetSelectionFromAttachment(attachment);
  return selection === null ||
    !attachmentValueHasOnlyKeys(
      attachment,
      CHAINED_SPELL_ATTACK_DAMAGE_TARGET_ATTACHMENT_KEYS,
    ) ||
    !targetSelectionHasOnlyKeys(
      selection,
      CHAINED_SPELL_ATTACK_DAMAGE_TARGET_SELECTION_KEYS,
    )
    ? null
    : spellAttackDamageTargeting(attachment);
}

function admitChainedSpellAttackDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ChainedSpellAttackDamageMechanicsFacts,
): readonly ChainedSpellAttackDamageInvocation[] {
  const rangeFeet = chainedSpellAttackDamageRangeFeet(facts.range);
  const proficiencyBonus = ctx.actor.origin.spellcasting.proficiencyBonus;
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ChainedSpellAttackDamageInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const damageExpr = chainedSpellAttackDamageAmountExpr(
        facts.damageAmount,
        facts.level,
        slot.spellLevel,
      );
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "chainedSpellAttackDamage",
          spell,
          targeting: facts.targeting,
          damage: { expr: damageExpr },
          damageTypeChoices: CHAINED_DAMAGE_TYPE_ATTACK_DAMAGE_TYPES,
          rangeFeet,
          leapRangeFeet: CHAINED_SPELL_ATTACK_LEAP_RANGE_FEET,
          attackKind: facts.attackKind,
          attackBonus: attackBonus(
            Number(ctx.castingSource.abilityModifier) +
              Number(proficiencyBonus),
          ),
        },
      ];
    },
  );
}

export const CHAINED_SPELL_ATTACK_DAMAGE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "attackKind",
  "hitDamage",
  "missDamage",
  "continuation",
  "leapPhase",
  "leapAttachment",
  "leapAttackKind",
  "leapHitDamage",
  "leapMissDamage",
  "damageType",
  "damageAmount",
  "leapDamageAmount",
] as const;
type ChainedSpellAttackDamageFailedFact =
  (typeof CHAINED_SPELL_ATTACK_DAMAGE_FAILED_FACTS)[number];

type ChainedSpellAttackDamageMechanicsIssue = {
  readonly failedFact: ChainedSpellAttackDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function chainedSpellAttackDamageIssueResult(
  issue: ChainedSpellAttackDamageMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "chainedSpellAttackDamage";
  readonly failedFact: ChainedSpellAttackDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "chainedSpellAttackDamage",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported chainedSpellAttackDamage mechanics fact: ${issue.failedFact}.`,
  };
}

function chainedSpellAttackDamageRangeFeet(
  range: ChainedSpellAttackDamageMechanicsFacts["range"],
): ReturnType<typeof movementFeet> {
  return movementFeet(range.feet);
}

function chainedSpellAttackDamageAmountProjection(
  amount: Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
  spellLevel: number,
): ChainedSpellAttackDamageAmount | null {
  if (amount.kind === "fixed") {
    const expr = isChainedSpellAttackDamageSupportedDiceExpr(amount.expr)
      ? amount.expr
      : null;
    return expr === null ? null : { kind: "fixed", expr };
  }
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    (amount.startingAtLevel !== spellLevel &&
      amount.startingAtLevel !== spellLevel + 1) ||
    amount.base.dieSize === undefined
  ) {
    return null;
  }
  const base = isChainedSpellAttackDamageSupportedDiceExpr(amount.base)
    ? amount.base
    : null;
  const perLevel = isChainedSpellAttackDamageSupportedPerLevel(amount.perLevel)
    ? amount.perLevel
    : null;
  if (base === null || perLevel === null) return null;
  return {
    kind: "linear_per_level",
    axis: "slot",
    base,
    perLevel,
    startingAtLevel: amount.startingAtLevel,
  };
}

function isChainedSpellAttackDamageSupportedDiceExpr(
  expr: DiceExpr,
): expr is ChainedSpellAttackDamageSupportedDiceExpr {
  return (
    expr.spellcastingMod === undefined && expr.abilityModifier === undefined
  );
}

function isChainedSpellAttackDamageSupportedPerLevel(
  delta: DiceExprDelta,
): delta is ChainedSpellAttackDamageSupportedPerLevel {
  return delta.dieSize === undefined && delta.flat === undefined;
}

function sameChainedSpellAttackDamageAmount(
  left: ChainedSpellAttackDamageAmount,
  right: ChainedSpellAttackDamageAmount,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "fixed" && right.kind === "fixed") {
    return sameChainedDiceExpr(left.expr, right.expr);
  }
  if (left.kind !== "linear_per_level" || right.kind !== "linear_per_level") {
    return false;
  }
  return (
    left.axis === right.axis &&
    left.startingAtLevel === right.startingAtLevel &&
    sameChainedDiceExpr(left.base, right.base) &&
    sameChainedDiceExprDelta(left.perLevel, right.perLevel)
  );
}

function sameChainedDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat &&
    left.spellcastingMod === right.spellcastingMod &&
    left.abilityModifier === right.abilityModifier
  );
}

function sameChainedDiceExprDelta(
  left: DiceExprDelta,
  right: DiceExprDelta,
): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    left.flat === right.flat
  );
}

function chainedSpellAttackDamageAmountExpr(
  amount: ChainedSpellAttackDamageAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): DiceExpr {
  if (amount.kind === "fixed") return amount.expr;
  const firstIncreasedSlot = amount.startingAtLevel === spellLevel + 1;
  const slotDelta = Math.max(
    0,
    Number(slotLevel) - amount.startingAtLevel + (firstIncreasedSlot ? 1 : 0),
  );
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    ...(amount.base.flat === undefined ? {} : { flat: amount.base.flat }),
  };
}

function isChainedDamageTypeChoice(
  damageType: DamageTypeRef,
): damageType is ChainedDamageTypeHole {
  return (
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value !== null &&
    damageType.value.kind === "choice" &&
    sameStringSet(
      damageType.value.options,
      CHAINED_DAMAGE_TYPE_ATTACK_DAMAGE_TYPES,
    )
  );
}

function isSameChoiceDamageType(
  damageType: DamageTypeRef,
): damageType is SameChoiceDamageType {
  return (
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "same_choice_as"
  );
}

function chainedSpellAttackDamageMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseOrdinal: PositiveInteger,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "attack_roll" }
  >,
  leapRepeatOrdinal: PositiveInteger,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...phase.onHit.map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...phase.onMiss.map((_effect, index) =>
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(phase.onHit.length + index + 1),
      ),
    ),
    spellActivationRepeatPath(phaseOrdinal, leapRepeatOrdinal),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitChainedSpellAttackDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "chainedSpellAttackDamage",
  ChainedSpellAttackDamageMechanicsFacts,
  ChainedSpellAttackDamageInvocation,
  ReturnType<typeof chainedSpellAttackDamageIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const attackPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "attack_roll" &&
      (phase.continue?.when.kind === "damage_roll_has_duplicate_faces" ||
        phase.onHit.some(
          (effect) =>
            effect.kind === "damage" &&
            isChainedDamageTypeChoice(effect.damageType),
        )),
  );
  const attackPhase =
    attackPhaseIndex < 0 ? undefined : mechanics.phases[attackPhaseIndex];
  if (attackPhase?.kind !== "attack_roll") {
    return { tag: "notRepresented" };
  }
  const phaseOrdinal = PositiveInteger(attackPhaseIndex + 1);
  const continuation = attackPhase.continue;
  const leapPhaseIndex =
    continuation?.kind === "repeat"
      ? continuation.next.findIndex((phase) => phase.kind === "attack_roll")
      : -1;
  const leapRepeatOrdinal = PositiveInteger(
    leapPhaseIndex < 0 ? 1 : leapPhaseIndex + 1,
  );
  const leapRepeatPath = spellActivationRepeatPath(
    phaseOrdinal,
    leapRepeatOrdinal,
  );
  const leapPhase =
    leapPhaseIndex < 0 || continuation?.kind !== "repeat"
      ? undefined
      : continuation.next[leapPhaseIndex];
  const issues: ChainedSpellAttackDamageMechanicsIssue[] = [];
  const pushIssue = (
    failedFact: ChainedSpellAttackDamageFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };
  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.castingTime.kind !== "action") {
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  const targetingCandidate = chainedSpellAttackDamageTargeting(
    attackPhase.attachment,
  );
  const targeting =
    targetingCandidate?.kind === "singleCombatant" ? targetingCandidate : null;
  const range = isFixedDistancePointRange(mechanics.range)
    ? mechanics.range
    : null;
  if (range === null) {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "instantaneous") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const path of spellDurationEvidencePaths(mechanics.duration)) {
      pushIssue("duration", path);
    }
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === attackPhaseIndex) continue;
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
    }
  }
  if (attackPhaseIndex !== 0) {
    pushIssue("phaseOrder", spellActivationPhasePath(phaseOrdinal));
  }
  if (targeting === null) {
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  }
  const attackKind = supportedSpellAttackKind(attackPhase.attackKind)
    ? attackPhase.attackKind
    : null;
  if (attackKind === null) {
    pushIssue("attackKind", spellActivationPhasePath(phaseOrdinal));
  }
  const hitDamage = attackPhase.onHit[0];
  if (hitDamage?.kind !== "damage") {
    pushIssue(
      "hitDamage",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  }
  if (attackPhase.onHit.length > 1) {
    for (const [index] of attackPhase.onHit.slice(1).entries()) {
      pushIssue(
        "hitDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 2)),
      );
    }
  }
  if (attackPhase.onMiss[0]?.kind !== "none") {
    pushIssue(
      "missDamage",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(attackPhase.onHit.length + 1),
      ),
    );
  }
  for (const [index] of attackPhase.onMiss.slice(1).entries()) {
    pushIssue(
      "missDamage",
      spellActivationEffectPath(
        phaseOrdinal,
        PositiveInteger(attackPhase.onHit.length + index + 2),
      ),
    );
  }
  if (
    continuation?.kind !== "repeat" ||
    continuation.when.kind !== "damage_roll_has_duplicate_faces" ||
    continuation.when.minimumMultiplicity !== 2 ||
    continuation.next.length === 0 ||
    !isBouncingAttackContinuationLimitSetShape(continuation.limits)
  ) {
    pushIssue(
      "continuation",
      spellActivationRepeatPath(phaseOrdinal, PositiveInteger(1)),
    );
  }
  if (
    continuation?.kind !== "repeat" ||
    continuation.next.length !== 1 ||
    leapPhaseIndex < 0
  ) {
    if (continuation?.kind === "repeat") {
      for (const [index] of continuation.next.entries()) {
        if (index === leapPhaseIndex) continue;
        pushIssue(
          "leapPhase",
          spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
        );
      }
    }
    if (continuation?.kind !== "repeat" || continuation.next.length === 0) {
      pushIssue(
        "leapPhase",
        spellActivationRepeatPath(phaseOrdinal, PositiveInteger(1)),
      );
    }
  }
  const leapAttack = leapPhase?.kind === "attack_roll" ? leapPhase : null;
  const leapTargeting =
    leapAttack === null
      ? null
      : chainedSpellAttackDamageTargeting(leapAttack.attachment);
  if (leapTargeting?.kind !== "singleCombatant") {
    pushIssue("leapAttachment", leapRepeatPath);
  }
  if (leapAttack !== null && !supportedSpellAttackKind(leapAttack.attackKind)) {
    pushIssue("leapAttackKind", leapRepeatPath);
  }
  if (
    leapAttack !== null &&
    supportedSpellAttackKind(attackPhase.attackKind) &&
    leapAttack.attackKind !== attackPhase.attackKind
  ) {
    pushIssue("leapAttackKind", leapRepeatPath);
  }
  if (leapAttack !== null && leapAttack.onHit[0]?.kind !== "damage") {
    pushIssue("leapHitDamage", leapRepeatPath);
  }
  if (leapAttack !== null && leapAttack.onHit.length > 1) {
    pushIssue("leapHitDamage", leapRepeatPath);
  }
  if (leapAttack !== null && leapAttack.onMiss[0]?.kind !== "none") {
    pushIssue("leapMissDamage", leapRepeatPath);
  }
  if (leapAttack !== null && leapAttack.onMiss.length > 1) {
    pushIssue("leapMissDamage", leapRepeatPath);
  }
  const hitDamageType =
    hitDamage?.kind === "damage" &&
    isChainedDamageTypeChoice(hitDamage.damageType)
      ? hitDamage.damageType
      : null;
  const damageTypeSupported = hitDamageType !== null;
  if (!damageTypeSupported) {
    pushIssue(
      "damageType",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  }
  const leapHitDamage = leapAttack?.onHit[0];
  if (
    hitDamage?.kind !== "damage" ||
    leapHitDamage?.kind !== "damage" ||
    hitDamageType === null ||
    !isSameChoiceDamageType(leapHitDamage.damageType) ||
    leapHitDamage.damageType.holeId !== hitDamageType.holeId
  ) {
    pushIssue("leapHitDamage", leapRepeatPath);
  }
  const hitDamageAmount =
    hitDamage?.kind === "damage"
      ? chainedSpellAttackDamageAmountProjection(
          hitDamage.amount,
          Number(mechanics.level),
        )
      : null;
  if (hitDamage?.kind === "damage" && hitDamageAmount === null) {
    pushIssue(
      "damageAmount",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    );
  }
  const leapDamageAmount =
    leapHitDamage?.kind === "damage"
      ? chainedSpellAttackDamageAmountProjection(
          leapHitDamage.amount,
          Number(mechanics.level),
        )
      : null;
  if (leapHitDamage?.kind === "damage" && leapDamageAmount === null) {
    pushIssue("leapDamageAmount", leapRepeatPath);
  }
  const damageAmount =
    hitDamageAmount !== null &&
    leapDamageAmount !== null &&
    sameChainedSpellAttackDamageAmount(hitDamageAmount, leapDamageAmount)
      ? hitDamageAmount
      : null;
  if (
    hitDamageAmount !== null &&
    leapDamageAmount !== null &&
    !sameChainedSpellAttackDamageAmount(hitDamageAmount, leapDamageAmount)
  ) {
    pushIssue("leapDamageAmount", leapRepeatPath);
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      chainedSpellAttackDamageIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  if (
    hitDamage?.kind !== "damage" ||
    leapHitDamage?.kind !== "damage" ||
    targeting === null ||
    attackKind === null ||
    range === null ||
    mechanics.duration.kind !== "instantaneous" ||
    damageAmount === null ||
    leapAttack === null ||
    !supportedSpellAttackKind(leapAttack.attackKind)
  ) {
    return {
      tag: "unsupported",
      issues: [
        chainedSpellAttackDamageIssueResult({
          failedFact: "hitDamage",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(1),
          ),
        }),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range,
    duration: mechanics.duration,
    targeting,
    attackKind,
    damageAmount,
  } satisfies ChainedSpellAttackDamageMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "chainedSpellAttackDamage",
      facts,
      evidence: chainedSpellAttackDamageMechanicsEvidence(
        mechanics,
        phaseOrdinal,
        attackPhase,
        leapRepeatOrdinal,
      ),
      admit: (executionSource, ctx) =>
        admitChainedSpellAttackDamage(executionSource, ctx, facts),
    },
  };
}

function discoverChainedSpellAttackDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ChainedSpellAttackDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const castActs = [
    {
      subject: spellCastSelectionSubject(actorId, invocation),
      initialHoles: [spellDamageTypeChoiceHole(invocation)],
    },
  ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveChainedSpellAttackDamage(
  input: ChainedSpellAttackDamageResolveInput,
): BattleResolutionResult {
  return resolveChainedSpellAttackDamageAct(
    spellProcedureResolutionContext(input),
  );
}

export const ChainedSpellAttackDamageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("chainedSpellAttackDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: DiceExprSchema,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      rangeFeet: MovementFeet,
      leapRangeFeet: MovementFeet,
      attackKind: Schema.Literals([
        "melee_spell_attack",
        "ranged_spell_attack",
      ]),
      attackBonus: AttackBonus,
    }),
  );
export const chainedSpellAttackDamageProfile: SpellProcedureDeclaration<
  "chainedSpellAttackDamage",
  ChainedSpellAttackDamageInvocation
> = {
  procedure: "chainedSpellAttackDamage",
  executionSchema: ChainedSpellAttackDamageInvocationSchema,
  admitMechanics: admitChainedSpellAttackDamageMechanics,
  discoverCastAct: discoverChainedSpellAttackDamageCastAct,
  resolve: resolveChainedSpellAttackDamage,
};
