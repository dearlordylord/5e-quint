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
import { Match, Schema } from "effect";
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
  type SpellLevel,
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
  spellLevel: SpellLevel,
): ChainedSpellAttackDamageAmount | null {
  if (amount.kind === "fixed") {
    return chainedSpellAttackDamageFixedAmountProjection(amount);
  }
  if (amount.kind !== "linear_per_level") return null;
  return chainedSpellAttackDamageLinearAmountProjection(amount, spellLevel);
}

function chainedSpellAttackDamageFixedAmountProjection(
  amount: Extract<
    Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
    { readonly kind: "fixed" }
  >,
): ChainedSpellAttackDamageFixedAmount | null {
  return isChainedSpellAttackDamageSupportedDiceExpr(amount.expr)
    ? { kind: "fixed", expr: amount.expr }
    : null;
}

function chainedSpellAttackDamageLinearAmountProjection(
  amount: Extract<
    Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
    { readonly kind: "linear_per_level" }
  >,
  spellLevel: SpellLevel,
): ChainedSpellAttackDamageLinearAmount | null {
  if (amount.axis !== "slot") return null;
  if (!chainedSpellAttackDamageStartingLevelIsSupported(amount, spellLevel))
    return null;
  if (amount.base.dieSize === undefined) return null;
  const base = chainedSpellAttackDamageDiceExprProjection(amount.base);
  const perLevel = chainedSpellAttackDamagePerLevelProjection(amount.perLevel);
  if (base === null) return null;
  if (perLevel === null) return null;
  return {
    kind: "linear_per_level",
    axis: "slot",
    base,
    perLevel,
    startingAtLevel: amount.startingAtLevel,
  };
}

function chainedSpellAttackDamageStartingLevelIsSupported(
  amount: Extract<
    Extract<EffectAtom, { readonly kind: "damage" }>["amount"],
    { readonly kind: "linear_per_level" }
  >,
  spellLevel: SpellLevel,
): boolean {
  return [spellLevel, spellLevel + 1].includes(amount.startingAtLevel);
}

function chainedSpellAttackDamageDiceExprProjection(
  expr: DiceExpr,
): ChainedSpellAttackDamageSupportedDiceExpr | null {
  return isChainedSpellAttackDamageSupportedDiceExpr(expr) ? expr : null;
}

function chainedSpellAttackDamagePerLevelProjection(
  delta: DiceExprDelta,
): ChainedSpellAttackDamageSupportedPerLevel | null {
  return isChainedSpellAttackDamageSupportedPerLevel(delta) ? delta : null;
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
  return Match.value(left).pipe(
    Match.when({ kind: "fixed" }, (fixed) =>
      right.kind === "fixed"
        ? sameChainedDiceExpr(fixed.expr, right.expr)
        : false,
    ),
    Match.when({ kind: "linear_per_level" }, (linear) =>
      right.kind === "linear_per_level"
        ? sameChainedSpellAttackDamageLinearAmount(linear, right)
        : false,
    ),
    Match.exhaustive,
  );
}

function sameChainedSpellAttackDamageLinearAmount(
  left: ChainedSpellAttackDamageLinearAmount,
  right: ChainedSpellAttackDamageLinearAmount,
): boolean {
  return [
    left.axis === right.axis,
    left.startingAtLevel === right.startingAtLevel,
    sameChainedDiceExpr(left.base, right.base),
    sameChainedDiceExprDelta(left.perLevel, right.perLevel),
  ].every(Boolean);
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
  spellLevel: SpellLevel,
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

type ChainedSpellAttackDamageActivationMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type ChainedSpellAttackDamageAttackPhase = Extract<
  ChainedSpellAttackDamageActivationMechanics["phases"][number],
  { readonly kind: "attack_roll" }
>;
type ChainedSpellAttackDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
>;
type ChainedSpellAttackDamagePhaseOccurrence =
  | {
      readonly tag: "found";
      readonly index: number;
      readonly phase: ChainedSpellAttackDamageAttackPhase;
    }
  | { readonly tag: "missing"; readonly ordinal: PositiveInteger };
type ChainedSpellAttackDamageSupportedLeapOccurrence = Extract<
  ChainedSpellAttackDamagePhaseOccurrence,
  { readonly tag: "found" }
> & {
  readonly phase: ChainedSpellAttackDamageAttackPhase & {
    readonly attackKind: ChainedSpellAttackDamageInvocation["attackKind"];
  };
};

function chainedSpellAttackDamageIssue(
  failedFact: ChainedSpellAttackDamageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): ChainedSpellAttackDamageMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function chainedSpellAttackDamageIssueWhen(
  unsupported: boolean,
  failedFact: ChainedSpellAttackDamageFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  return unsupported
    ? [chainedSpellAttackDamageIssue(failedFact, mechanicsPath)]
    : [];
}

function chainedSpellAttackDamageCandidatePhase(
  mechanics: ChainedSpellAttackDamageActivationMechanics,
): ChainedSpellAttackDamagePhaseOccurrence {
  const found = Array.from(mechanics.phases.entries()).find(([, phase]) =>
    chainedSpellAttackDamagePhaseIsCandidate(phase),
  );
  if (found === undefined || found[1].kind !== "attack_roll") {
    return { tag: "missing", ordinal: PositiveInteger(1) };
  }
  return { tag: "found", index: found[0], phase: found[1] };
}

function chainedSpellAttackDamagePhaseIsCandidate(
  phase: ChainedSpellAttackDamageActivationMechanics["phases"][number],
): boolean {
  if (phase.kind !== "attack_roll") return false;
  return [
    phase.continue?.when.kind === "damage_roll_has_duplicate_faces",
    phase.onHit.some(
      (effect) =>
        effect.kind === "damage" &&
        isChainedDamageTypeChoice(effect.damageType),
    ),
  ].some(Boolean);
}

function chainedSpellAttackDamageLeapPhase(
  attackPhase: ChainedSpellAttackDamageAttackPhase,
): ChainedSpellAttackDamagePhaseOccurrence {
  const continuation = attackPhase.continue;
  if (continuation?.kind !== "repeat") {
    return { tag: "missing", ordinal: PositiveInteger(1) };
  }
  const found = Array.from(continuation.next.entries()).find(
    ([, phase]) => phase.kind === "attack_roll",
  );
  if (found === undefined || found[1].kind !== "attack_roll") {
    return { tag: "missing", ordinal: PositiveInteger(1) };
  }
  return { tag: "found", index: found[0], phase: found[1] };
}

function chainedSpellAttackDamagePhaseOrdinal(
  occurrence: ChainedSpellAttackDamagePhaseOccurrence,
): PositiveInteger {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, ({ index }) => PositiveInteger(index + 1)),
    Match.when({ tag: "missing" }, ({ ordinal }) => ordinal),
    Match.exhaustive,
  );
}

function chainedSpellAttackDamagePhaseFromOccurrence(
  occurrence: ChainedSpellAttackDamagePhaseOccurrence,
): ChainedSpellAttackDamageAttackPhase | null {
  return Match.value(occurrence).pipe(
    Match.when({ tag: "found" }, ({ phase }) => phase),
    Match.when({ tag: "missing" }, () => null),
    Match.exhaustive,
  );
}

type ChainedSpellAttackDamageAdmissionProjection = {
  readonly attack: Extract<
    ChainedSpellAttackDamagePhaseOccurrence,
    { readonly tag: "found" }
  >;
  readonly leap: ChainedSpellAttackDamagePhaseOccurrence;
  readonly targeting: ChainedSpellAttackDamageTargeting | null;
  readonly range: ChainedSpellAttackDamageRange | null;
  readonly attackKind: ChainedSpellAttackDamageInvocation["attackKind"] | null;
  readonly hitDamage: ChainedSpellAttackDamageEffect | null;
  readonly leapHitDamage: ChainedSpellAttackDamageEffect | null;
  readonly hitDamageType: ChainedDamageTypeHole | null;
  readonly hitDamageAmount: ChainedSpellAttackDamageAmount | null;
  readonly leapDamageAmount: ChainedSpellAttackDamageAmount | null;
  readonly damageAmount: ChainedSpellAttackDamageAmount | null;
};

type CompleteChainedSpellAttackDamageAdmissionProjection = Omit<
  ChainedSpellAttackDamageAdmissionProjection,
  | "leap"
  | "targeting"
  | "range"
  | "attackKind"
  | "hitDamage"
  | "leapHitDamage"
  | "hitDamageType"
  | "hitDamageAmount"
  | "leapDamageAmount"
  | "damageAmount"
> & {
  readonly leap: ChainedSpellAttackDamageSupportedLeapOccurrence;
  readonly targeting: ChainedSpellAttackDamageTargeting;
  readonly range: ChainedSpellAttackDamageRange;
  readonly attackKind: ChainedSpellAttackDamageInvocation["attackKind"];
  readonly hitDamage: ChainedSpellAttackDamageEffect;
  readonly leapHitDamage: ChainedSpellAttackDamageEffect;
  readonly hitDamageType: ChainedDamageTypeHole;
  readonly hitDamageAmount: ChainedSpellAttackDamageAmount;
  readonly leapDamageAmount: ChainedSpellAttackDamageAmount;
  readonly damageAmount: ChainedSpellAttackDamageAmount;
};

function chainedSpellAttackDamageAdmissionProjection(
  mechanics: ChainedSpellAttackDamageActivationMechanics,
  attack: Extract<
    ChainedSpellAttackDamagePhaseOccurrence,
    { readonly tag: "found" }
  >,
): ChainedSpellAttackDamageAdmissionProjection {
  const attackPhase = attack.phase;
  const leap = chainedSpellAttackDamageLeapPhase(attackPhase);
  const leapAttack = chainedSpellAttackDamagePhaseFromOccurrence(leap);
  const targetingCandidate = chainedSpellAttackDamageTargeting(
    attackPhase.attachment,
  );
  const hitDamage = chainedSpellAttackDamageEffect(attackPhase.onHit[0]);
  const leapHitDamage = chainedSpellAttackDamageEffect(leapAttack?.onHit[0]);
  const hitDamageAmount = chainedSpellAttackDamageProjectedAmount(
    hitDamage,
    mechanics.level,
  );
  const leapDamageAmount = chainedSpellAttackDamageProjectedAmount(
    leapHitDamage,
    mechanics.level,
  );
  return {
    attack,
    leap,
    targeting: chainedSpellAttackDamageTargetingProjection(targetingCandidate),
    range: chainedSpellAttackDamageRangeProjection(mechanics.range),
    attackKind: chainedSpellAttackDamageAttackKindProjection(
      attackPhase.attackKind,
    ),
    hitDamage,
    leapHitDamage,
    hitDamageType: chainedSpellAttackDamageTypeProjection(hitDamage),
    hitDamageAmount,
    leapDamageAmount,
    damageAmount: chainedSpellAttackDamageMatchingAmount(
      hitDamageAmount,
      leapDamageAmount,
    ),
  };
}

function chainedSpellAttackDamageTargetingProjection(
  targeting: ReturnType<typeof chainedSpellAttackDamageTargeting>,
): ChainedSpellAttackDamageTargeting | null {
  return targeting?.kind === "singleCombatant" ? targeting : null;
}

function chainedSpellAttackDamageRangeProjection(
  range: SpellMechanics["range"],
): ChainedSpellAttackDamageRange | null {
  return isFixedDistancePointRange(range) ? range : null;
}

function chainedSpellAttackDamageAttackKindProjection(
  attackKind: ChainedSpellAttackDamageAttackPhase["attackKind"],
): ChainedSpellAttackDamageInvocation["attackKind"] | null {
  return supportedSpellAttackKind(attackKind) ? attackKind : null;
}

function chainedSpellAttackDamageTypeProjection(
  damage: ChainedSpellAttackDamageEffect | null,
): ChainedDamageTypeHole | null {
  if (damage === null) return null;
  return isChainedDamageTypeChoice(damage.damageType)
    ? damage.damageType
    : null;
}

function chainedSpellAttackDamageMatchingAmount(
  hit: ChainedSpellAttackDamageAmount | null,
  leap: ChainedSpellAttackDamageAmount | null,
): ChainedSpellAttackDamageAmount | null {
  if (hit === null) return null;
  if (leap === null) return null;
  return sameChainedSpellAttackDamageAmount(hit, leap) ? hit : null;
}

function chainedSpellAttackDamageEffect(
  effect: EffectAtom | undefined,
): ChainedSpellAttackDamageEffect | null {
  return effect?.kind === "damage" ? effect : null;
}

function chainedSpellAttackDamageProjectedAmount(
  damage: ChainedSpellAttackDamageEffect | null,
  level: SpellLevel,
): ChainedSpellAttackDamageAmount | null {
  return damage === null
    ? null
    : chainedSpellAttackDamageAmountProjection(damage.amount, level);
}

function chainedSpellAttackDamageDefinitionIssues(
  mechanics: ChainedSpellAttackDamageActivationMechanics,
  projection: ChainedSpellAttackDamageAdmissionProjection,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const issues: ChainedSpellAttackDamageMechanicsIssue[] = [];
  if (mechanics.level !== 1)
    issues.push(
      chainedSpellAttackDamageIssue("level", spellMechanicsHeaderPath("level")),
    );
  if (mechanics.castingTime.kind !== "action")
    issues.push(
      chainedSpellAttackDamageIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  if (projection.range === null)
    issues.push(
      chainedSpellAttackDamageIssue("range", spellMechanicsHeaderPath("range")),
    );
  if (mechanics.duration.kind !== "instantaneous") {
    issues.push(
      chainedSpellAttackDamageIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    for (const path of spellDurationEvidencePaths(mechanics.duration))
      issues.push(chainedSpellAttackDamageIssue("duration", path));
  }
  return issues;
}

function chainedSpellAttackDamagePrimaryPhaseIssues(
  mechanics: ChainedSpellAttackDamageActivationMechanics,
  projection: ChainedSpellAttackDamageAdmissionProjection,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const issues: ChainedSpellAttackDamageMechanicsIssue[] = [];
  const phaseOrdinal = chainedSpellAttackDamagePhaseOrdinal(projection.attack);
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === projection.attack.index) continue;
      issues.push(
        chainedSpellAttackDamageIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
  }
  if (projection.attack.index !== 0)
    issues.push(
      chainedSpellAttackDamageIssue(
        "phaseOrder",
        spellActivationPhasePath(phaseOrdinal),
      ),
    );
  if (projection.targeting === null)
    issues.push(
      chainedSpellAttackDamageIssue(
        "attachment",
        spellActivationAttachmentPath(phaseOrdinal),
      ),
    );
  if (projection.attackKind === null)
    issues.push(
      chainedSpellAttackDamageIssue(
        "attackKind",
        spellActivationPhasePath(phaseOrdinal),
      ),
    );
  issues.push(
    ...chainedSpellAttackDamagePrimaryEffectIssues(
      projection.attack.phase,
      phaseOrdinal,
    ),
  );
  return issues;
}

function chainedSpellAttackDamagePrimaryEffectIssues(
  phase: ChainedSpellAttackDamageAttackPhase,
  phaseOrdinal: PositiveInteger,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const issues: ChainedSpellAttackDamageMechanicsIssue[] = [];
  if (phase.onHit[0]?.kind !== "damage")
    issues.push(
      chainedSpellAttackDamageIssue(
        "hitDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      ),
    );
  for (const [index] of phase.onHit.slice(1).entries())
    issues.push(
      chainedSpellAttackDamageIssue(
        "hitDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 2)),
      ),
    );
  if (phase.onMiss[0]?.kind !== "none")
    issues.push(
      chainedSpellAttackDamageIssue(
        "missDamage",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(phase.onHit.length + 1),
        ),
      ),
    );
  for (const [index] of phase.onMiss.slice(1).entries())
    issues.push(
      chainedSpellAttackDamageIssue(
        "missDamage",
        spellActivationEffectPath(
          phaseOrdinal,
          PositiveInteger(phase.onHit.length + index + 2),
        ),
      ),
    );
  return issues;
}

function chainedSpellAttackDamageContinuationIssues(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const continuation = projection.attack.phase.continue;
  const phaseOrdinal = chainedSpellAttackDamagePhaseOrdinal(projection.attack);
  const firstRepeatPath = spellActivationRepeatPath(
    phaseOrdinal,
    PositiveInteger(1),
  );
  const continuationIssues = chainedSpellAttackDamageIssueWhen(
    !chainedSpellAttackDamageContinuationIsSupported(continuation),
    "continuation",
    firstRepeatPath,
  );
  if (continuation?.kind !== "repeat") {
    return [
      ...continuationIssues,
      chainedSpellAttackDamageIssue("leapPhase", firstRepeatPath),
    ];
  }
  return [
    ...continuationIssues,
    ...chainedSpellAttackDamageLeapPhaseIssues(
      continuation,
      projection.leap,
      phaseOrdinal,
    ),
  ];
}

function chainedSpellAttackDamageLeapPhaseIssues(
  continuation: Extract<
    ChainedSpellAttackDamageAttackPhase["continue"],
    { readonly kind: "repeat" }
  >,
  leap: ChainedSpellAttackDamagePhaseOccurrence,
  phaseOrdinal: PositiveInteger,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  if (continuation.next.length === 1 && leap.tag === "found") return [];
  const issues = Array.from(continuation.next.entries()).flatMap(([index]) =>
    leap.tag === "found" && index === leap.index
      ? []
      : [
          chainedSpellAttackDamageIssue(
            "leapPhase",
            spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
          ),
        ],
  );
  return continuation.next.length === 0
    ? [
        ...issues,
        chainedSpellAttackDamageIssue(
          "leapPhase",
          spellActivationRepeatPath(phaseOrdinal, PositiveInteger(1)),
        ),
      ]
    : issues;
}

function chainedSpellAttackDamageContinuationIsSupported(
  continuation: ChainedSpellAttackDamageAttackPhase["continue"],
): boolean {
  if (continuation?.kind !== "repeat") return false;
  return [
    continuation.when.kind === "damage_roll_has_duplicate_faces",
    continuation.when.kind === "damage_roll_has_duplicate_faces" &&
      continuation.when.minimumMultiplicity === 2,
    continuation.next.length > 0,
    isBouncingAttackContinuationLimitSetShape(continuation.limits),
  ].every(Boolean);
}

function chainedSpellAttackDamageLeapIssues(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const leapPath = spellActivationRepeatPath(
    chainedSpellAttackDamagePhaseOrdinal(projection.attack),
    chainedSpellAttackDamagePhaseOrdinal(projection.leap),
  );
  const leapAttack = chainedSpellAttackDamagePhaseFromOccurrence(
    projection.leap,
  );
  if (leapAttack === null)
    return [chainedSpellAttackDamageIssue("leapAttachment", leapPath)];
  const leapTargeting = chainedSpellAttackDamageTargeting(
    leapAttack.attachment,
  );
  return [
    ...chainedSpellAttackDamageIssueWhen(
      leapTargeting?.kind !== "singleCombatant",
      "leapAttachment",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      !supportedSpellAttackKind(leapAttack.attackKind),
      "leapAttackKind",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      chainedSpellAttackDamageAttackKindsDiffer(
        projection.attack.phase,
        leapAttack,
      ),
      "leapAttackKind",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      !chainedSpellAttackDamageLeapHitShapeIsSupported(leapAttack),
      "leapHitDamage",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      !chainedSpellAttackDamageLeapMissShapeIsSupported(leapAttack),
      "leapMissDamage",
      leapPath,
    ),
  ];
}

function chainedSpellAttackDamageAttackKindsDiffer(
  attack: ChainedSpellAttackDamageAttackPhase,
  leapAttack: ChainedSpellAttackDamageAttackPhase,
): boolean {
  return (
    supportedSpellAttackKind(attack.attackKind) &&
    leapAttack.attackKind !== attack.attackKind
  );
}

function chainedSpellAttackDamageLeapHitShapeIsSupported(
  leapAttack: ChainedSpellAttackDamageAttackPhase,
): boolean {
  return [
    leapAttack.onHit[0]?.kind === "damage",
    leapAttack.onHit.length <= 1,
  ].every(Boolean);
}

function chainedSpellAttackDamageLeapMissShapeIsSupported(
  leapAttack: ChainedSpellAttackDamageAttackPhase,
): boolean {
  return [
    leapAttack.onMiss[0]?.kind === "none",
    leapAttack.onMiss.length <= 1,
  ].every(Boolean);
}

function chainedSpellAttackDamageCorrelatedDamageIssues(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): readonly ChainedSpellAttackDamageMechanicsIssue[] {
  const phaseOrdinal = chainedSpellAttackDamagePhaseOrdinal(projection.attack);
  const leapPath = spellActivationRepeatPath(
    phaseOrdinal,
    chainedSpellAttackDamagePhaseOrdinal(projection.leap),
  );
  return [
    ...chainedSpellAttackDamageIssueWhen(
      projection.hitDamageType === null,
      "damageType",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ),
    ...chainedSpellAttackDamageIssueWhen(
      !chainedSpellAttackDamageLeapDamageReferencesChoice(projection),
      "leapHitDamage",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      chainedSpellAttackDamageProjectedAmountIsUnsupported(
        projection.hitDamage,
        projection.hitDamageAmount,
      ),
      "damageAmount",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ),
    ...chainedSpellAttackDamageIssueWhen(
      chainedSpellAttackDamageProjectedAmountIsUnsupported(
        projection.leapHitDamage,
        projection.leapDamageAmount,
      ),
      "leapDamageAmount",
      leapPath,
    ),
    ...chainedSpellAttackDamageIssueWhen(
      chainedSpellAttackDamageAmountsDiffer(projection),
      "leapDamageAmount",
      leapPath,
    ),
  ];
}

function chainedSpellAttackDamageProjectedAmountIsUnsupported(
  damage: ChainedSpellAttackDamageEffect | null,
  amount: ChainedSpellAttackDamageAmount | null,
): boolean {
  return damage !== null && amount === null;
}

function chainedSpellAttackDamageAmountsDiffer(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): boolean {
  if (projection.hitDamageAmount === null) return false;
  if (projection.leapDamageAmount === null) return false;
  return !sameChainedSpellAttackDamageAmount(
    projection.hitDamageAmount,
    projection.leapDamageAmount,
  );
}

function chainedSpellAttackDamageLeapDamageReferencesChoice(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): boolean {
  if (projection.hitDamage === null) return false;
  if (projection.leapHitDamage === null) return false;
  if (projection.hitDamageType === null) return false;
  if (!isSameChoiceDamageType(projection.leapHitDamage.damageType))
    return false;
  return (
    projection.leapHitDamage.damageType.holeId ===
    projection.hitDamageType.holeId
  );
}

function chainedSpellAttackDamageFacts(
  source: SpellMechanicsAdmissionSource,
  mechanics: ChainedSpellAttackDamageActivationMechanics,
  projection: ChainedSpellAttackDamageAdmissionProjection,
): ChainedSpellAttackDamageMechanicsFacts | null {
  if (mechanics.duration.kind !== "instantaneous") return null;
  if (!chainedSpellAttackDamageProjectionIsComplete(projection)) return null;
  return {
    ...source.spellDefinitionRuleFacts,
    range: projection.range,
    duration: mechanics.duration,
    targeting: projection.targeting,
    attackKind: projection.attackKind,
    damageAmount: projection.damageAmount,
  };
}

function chainedSpellAttackDamageProjectionIsComplete(
  projection: ChainedSpellAttackDamageAdmissionProjection,
): projection is CompleteChainedSpellAttackDamageAdmissionProjection {
  return [
    projection.hitDamage !== null,
    projection.leapHitDamage !== null,
    projection.hitDamageType !== null,
    projection.hitDamageAmount !== null,
    projection.leapDamageAmount !== null,
    projection.targeting !== null,
    projection.attackKind !== null,
    projection.range !== null,
    projection.damageAmount !== null,
    chainedSpellAttackDamageLeapIsSupported(projection.leap),
  ].every(Boolean);
}

function chainedSpellAttackDamageLeapIsSupported(
  leap: ChainedSpellAttackDamagePhaseOccurrence,
): leap is ChainedSpellAttackDamageSupportedLeapOccurrence {
  return Match.value(leap).pipe(
    Match.when({ tag: "found" }, ({ phase }) =>
      supportedSpellAttackKind(phase.attackKind),
    ),
    Match.when({ tag: "missing" }, () => false),
    Match.exhaustive,
  );
}

function admitChainedSpellAttackDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "chainedSpellAttackDamage",
  ChainedSpellAttackDamageMechanicsFacts,
  ChainedSpellAttackDamageInvocation,
  ReturnType<typeof chainedSpellAttackDamageIssueResult>
> {
  if (source.mechanics.family !== "activation")
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  return Match.value(chainedSpellAttackDamageCandidatePhase(mechanics)).pipe(
    Match.when({ tag: "missing" }, () => ({ tag: "notRepresented" as const })),
    Match.when({ tag: "found" }, (attack) =>
      admitChainedSpellAttackDamageCandidate(source, mechanics, attack),
    ),
    Match.exhaustive,
  );
}

function admitChainedSpellAttackDamageCandidate(
  source: SpellMechanicsAdmissionSource,
  mechanics: ChainedSpellAttackDamageActivationMechanics,
  attack: Extract<
    ChainedSpellAttackDamagePhaseOccurrence,
    { readonly tag: "found" }
  >,
): Exclude<
  ReturnType<typeof admitChainedSpellAttackDamageMechanics>,
  { readonly tag: "notRepresented" }
> {
  const projection = chainedSpellAttackDamageAdmissionProjection(
    mechanics,
    attack,
  );
  const issues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues([
      ...chainedSpellAttackDamageDefinitionIssues(mechanics, projection),
      ...chainedSpellAttackDamagePrimaryPhaseIssues(mechanics, projection),
      ...chainedSpellAttackDamageContinuationIssues(projection),
      ...chainedSpellAttackDamageLeapIssues(projection),
      ...chainedSpellAttackDamageCorrelatedDamageIssues(projection),
    ]),
  );
  if (issues !== undefined) {
    const [first, ...rest] = issues.map(chainedSpellAttackDamageIssueResult);
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  const facts = chainedSpellAttackDamageFacts(source, mechanics, projection);
  if (facts === null)
    return {
      tag: "unsupported",
      issues: [
        chainedSpellAttackDamageIssueResult(
          chainedSpellAttackDamageIssue(
            "hitDamage",
            spellActivationEffectPath(
              chainedSpellAttackDamagePhaseOrdinal(attack),
              PositiveInteger(1),
            ),
          ),
        ),
      ],
    };
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "chainedSpellAttackDamage",
      facts,
      evidence: chainedSpellAttackDamageMechanicsEvidence(
        mechanics,
        chainedSpellAttackDamagePhaseOrdinal(attack),
        attack.phase,
        chainedSpellAttackDamagePhaseOrdinal(projection.leap),
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
