import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
//
// The repeatedDamageAllocation Spell Procedure Profile: an action-time Spell
// Slot spell whose repeated damage applications are allocated among one or
// several creature targets.
//
// RAW anchors:
//   - SRD 5.2.1 Magic Missile: three simultaneous Force darts, each dealing
//     1d4 + 1 damage, directed at one creature or several, plus one dart per
//     slot level above 1.
//   - SRD 5.2.1 Playing-the-Game "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Ready [Action]".
//   - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Damage Roll, Damage Type,
//     Spell Slot, and Readied Spell Response.
//
// What stays in shared infrastructure: the resolver body remains in
// spells-resolve-prepared-slot.ts because it owns repeated damage allocation,
// Shield negation, Sanctuary replacement, after-damage interrupt checkpoints, and
// Readied Spell release continuation sequencing.

import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import type {
  DamageType,
  DiceExpr,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import {
  readiedSpellAct,
  spellCastSelectionSubject,
} from "../spells-discovery.ts";
import { resolvePreparedSlotSpellAct } from "../spells-resolve-prepared-slot.ts";
import { spellTargetAllocationHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { repeatedDamageAllocationAdmissionFacts } from "./repeated-damage-allocation-facts.ts";
import {
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type RepeatedDamageAllocationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "repeatedDamageAllocation" }
>;

type RepeatedDamageAllocationResolveInput =
  SpellProcedureProfileResolveInput<RepeatedDamageAllocationInvocation>;

type ActivationMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;
type DirectPhase = Extract<
  ActivationMechanics["phases"][number],
  { readonly kind: "direct" }
>;
type DirectPhaseEffect = NonNullable<DirectPhase["effects"]>[number];

const REPEATED_DAMAGE_ALLOCATION_LEVEL = 1 as const;
const REPEATED_DAMAGE_ALLOCATION_RANGE_FEET = 120 as const;
const REPEATED_DAMAGE_ALLOCATION_BASE_EFFECT_COUNT = 3 as const;
const REPEATED_DAMAGE_ALLOCATION_BASE_SLOT_LEVEL = 1 as const;
const REPEATED_DAMAGE_ALLOCATION_EFFECTS_PER_SLOT_LEVEL = 1 as const;
const REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE = {
  dice: 1,
  dieSize: 4,
  flat: 1,
  damageType: "force",
} as const;

type RepeatedDamageAllocationMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly repeatedEffectCount: {
    readonly base: typeof REPEATED_DAMAGE_ALLOCATION_BASE_EFFECT_COUNT;
    readonly baseLevel: typeof REPEATED_DAMAGE_ALLOCATION_BASE_SLOT_LEVEL;
    readonly perSlotAboveBase: typeof REPEATED_DAMAGE_ALLOCATION_EFFECTS_PER_SLOT_LEVEL;
  };
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for RepeatedDamageAllocationFailedFact.
const REPEATED_DAMAGE_ALLOCATION_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "castingTime",
  "range",
  "components",
  "duration",
  "phaseCount",
  "phase",
  "attachment",
  "selection",
  "repeatedEffectCount",
  "damageEffect",
  "damageAmount",
  "damageType",
] as const;
type RepeatedDamageAllocationFailedFact =
  (typeof REPEATED_DAMAGE_ALLOCATION_FAILED_FACTS)[number];
type RepeatedDamageAllocationAdmissionIssue = SpellProcedureAdmissionIssue<
  "repeatedDamageAllocation",
  RepeatedDamageAllocationFailedFact,
  UnitMechanicsPath
>;
type RepeatedDamageAllocationMechanicsIssue = Pick<
  RepeatedDamageAllocationAdmissionIssue,
  "failedFact" | "mechanicsPath"
>;
type RepeatedDamageAllocationMechanicsInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        RepeatedDamageAllocationMechanicsIssue,
        ...RepeatedDamageAllocationMechanicsIssue[],
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: RepeatedDamageAllocationMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type RepeatedEffectCount = Exclude<
  Extract<TargetSelection, { readonly mode: "choose_up_to" }>["count"],
  number
> & {
  readonly kind: "linear";
  readonly base: typeof REPEATED_DAMAGE_ALLOCATION_BASE_EFFECT_COUNT;
  readonly baseLevel: typeof REPEATED_DAMAGE_ALLOCATION_BASE_SLOT_LEVEL;
  readonly perSlotAboveBase: typeof REPEATED_DAMAGE_ALLOCATION_EFFECTS_PER_SLOT_LEVEL;
};
type RepeatedDamageEffect = Extract<
  DirectPhaseEffect,
  { readonly kind: "damage" }
> & {
  readonly damageType: typeof REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.damageType;
  readonly amount: Extract<
    Extract<DirectPhaseEffect, { readonly kind: "damage" }>["amount"],
    { readonly kind: "fixed" }
  > & {
    readonly expr: DiceExpr & {
      readonly dice: typeof REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.dice;
      readonly dieSize: typeof REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.dieSize;
      readonly flat: typeof REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.flat;
    };
  };
};

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "phases",
] as const satisfies ReadonlyArray<keyof ActivationMechanics>;
const CASTING_TIME_FIELDS = ["kind"] as const;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const DURATION_FIELDS = ["kind"] as const;
const PHASE_FIELDS = ["kind", "attachment", "effects"] as const;
const ATTACHMENT_FIELDS = ["kind", "holeId", "label", "value"] as const;
const ATTACHMENT_VALUE_FIELDS = ["kind", "selection"] as const;
const SELECTION_FIELDS = ["mode", "count", "repeatsAllowed"] as const;
const COUNT_FIELDS = ["kind", "base", "baseLevel", "perSlotAboveBase"] as const;
const EFFECT_FIELDS = ["kind", "amount", "damageType"] as const;
const AMOUNT_FIELDS = ["kind", "expr"] as const;
const DICE_EXPR_FIELDS = ["dice", "dieSize", "flat"] as const;

function isRepeatedEffectCount(value: unknown): value is RepeatedEffectCount {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "linear" &&
    "base" in value &&
    value.base === REPEATED_DAMAGE_ALLOCATION_BASE_EFFECT_COUNT &&
    "baseLevel" in value &&
    value.baseLevel === REPEATED_DAMAGE_ALLOCATION_BASE_SLOT_LEVEL &&
    "perSlotAboveBase" in value &&
    value.perSlotAboveBase ===
      REPEATED_DAMAGE_ALLOCATION_EFFECTS_PER_SLOT_LEVEL &&
    spellMechanicsObjectHasOnlyKeys(value, COUNT_FIELDS)
  );
}

function repeatedDamageAmountMatchesSignature(
  effect: DirectPhaseEffect | undefined,
): effect is Extract<DirectPhaseEffect, { readonly kind: "damage" }> & {
  readonly amount: Extract<
    Extract<DirectPhaseEffect, { readonly kind: "damage" }>["amount"],
    { readonly kind: "fixed" }
  >;
} {
  if (effect?.kind !== "damage" || effect.amount.kind !== "fixed") return false;
  const expr = effect.amount.expr;
  return (
    expr.dice === REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.dice &&
    expr.dieSize === REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.dieSize &&
    expr.flat === REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.flat
  );
}

function isRepeatedDamageEffect(
  effect: DirectPhaseEffect | undefined,
): effect is RepeatedDamageEffect {
  return (
    repeatedDamageAmountMatchesSignature(effect) &&
    effect.damageType ===
      REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.damageType &&
    spellMechanicsObjectHasOnlyKeys(effect, EFFECT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(effect.amount, AMOUNT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(effect.amount.expr, DICE_EXPR_FIELDS)
  );
}

function repeatedDamageAllocationIssue(
  failedFact: RepeatedDamageAllocationFailedFact,
  mechanicsPath: UnitMechanicsPath,
): RepeatedDamageAllocationAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "repeatedDamageAllocation",
    failedFact,
    mechanicsPath,
    message: `Unsupported repeatedDamageAllocation mechanics fact: ${failedFact}.`,
  };
}

function repeatedDamageAllocationRepresentation(
  mechanics: SpellMechanics,
): ActivationMechanics | undefined {
  if (mechanics.family !== "activation") return undefined;
  const phase = mechanics.phases[0];
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : undefined;
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present:
          mechanics.level === REPEATED_DAMAGE_ALLOCATION_LEVEL &&
          mechanics.school === "evocation" &&
          mechanics.castingTime.kind === "action",
      },
      {
        name: "rangeAndDuration",
        present:
          mechanics.range.kind === "point" &&
          mechanics.range.feet === REPEATED_DAMAGE_ALLOCATION_RANGE_FEET &&
          mechanics.duration.kind === "instantaneous",
      },
      {
        name: "components",
        present:
          mechanics.components.v === true &&
          mechanics.components.s === true &&
          mechanics.components.m === false,
      },
      {
        name: "repeatedTargetAllocation",
        present:
          selection?.mode === "choose_up_to" &&
          selection.repeatsAllowed === true,
      },
      {
        name: "damage",
        present: isRepeatedDamageEffect(effect),
      },
    ],
  })
    ? mechanics
    : undefined;
}

function directPhase(
  phase: ActivationMechanics["phases"][number] | undefined,
): DirectPhase | undefined {
  return phase?.kind === "direct" ? phase : undefined;
}

function inspectRepeatedDamageAllocationMechanics(
  source: SpellMechanicsAdmissionSource,
): RepeatedDamageAllocationMechanicsInspection {
  const mechanics = repeatedDamageAllocationRepresentation(source.mechanics);
  if (mechanics === undefined) return { tag: "notRepresented" };

  const phaseOrdinal = PositiveInteger(1);
  const effectOrdinal = PositiveInteger(1);
  const phase = directPhase(mechanics.phases[0]);
  const issues: Array<{
    readonly failedFact: RepeatedDamageAllocationFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: RepeatedDamageAllocationFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    pushIssue("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== REPEATED_DAMAGE_ALLOCATION_LEVEL)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "evocation")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));
  const parsedRangeFeet =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === REPEATED_DAMAGE_ALLOCATION_RANGE_FEET &&
    spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
      ? movementFeet(mechanics.range.feet)
      : undefined;
  const rangeSupported = parsedRangeFeet !== undefined;
  if (!rangeSupported) pushIssue("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    pushIssue("components", spellMechanicsHeaderPath("components"));
  if (
    mechanics.duration.kind !== "instantaneous" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS)
  )
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  if (mechanics.phases.length === 0)
    pushIssue("phaseCount", spellActivationPhasePath(phaseOrdinal));
  for (const [index] of mechanics.phases.entries()) {
    if (index > 0)
      pushIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      );
  }
  if (
    phase === undefined ||
    !spellMechanicsObjectHasOnlyKeys(phase, PHASE_FIELDS) ||
    phase.effects?.length !== 1
  )
    pushIssue("phase", spellActivationPhasePath(phaseOrdinal));

  const attachment = phase?.attachment;
  const targetValue =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value
      : undefined;
  const selection = targetValue?.selection;
  const repeatedSelection =
    selection?.mode === "choose_up_to" ? selection : undefined;
  if (
    attachment?.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS) ||
    targetValue === undefined ||
    !spellMechanicsObjectHasOnlyKeys(targetValue, ATTACHMENT_VALUE_FIELDS)
  )
    pushIssue("attachment", spellActivationAttachmentPath(phaseOrdinal));
  if (
    repeatedSelection === undefined ||
    repeatedSelection.repeatsAllowed !== true ||
    !spellMechanicsObjectHasOnlyKeys(repeatedSelection, SELECTION_FIELDS)
  )
    pushIssue("selection", spellActivationAttachmentPath(phaseOrdinal));
  const count = repeatedSelection?.count;
  const linearCount = isRepeatedEffectCount(count) ? count : undefined;
  const parsedRepeatedEffectCount =
    linearCount === undefined
      ? undefined
      : {
          base: linearCount.base,
          baseLevel: linearCount.baseLevel,
          perSlotAboveBase: linearCount.perSlotAboveBase,
        };
  const repeatedEffectCountSupported = parsedRepeatedEffectCount !== undefined;
  if (!repeatedEffectCountSupported)
    pushIssue(
      "repeatedEffectCount",
      spellActivationAttachmentPath(phaseOrdinal),
    );

  const effect = phase?.effects?.[0];
  if (
    effect?.kind !== "damage" ||
    !spellMechanicsObjectHasOnlyKeys(effect, EFFECT_FIELDS)
  )
    pushIssue(
      "damageEffect",
      spellActivationEffectPath(phaseOrdinal, effectOrdinal),
    );
  const damageAmountSupported =
    repeatedDamageAmountMatchesSignature(effect) &&
    spellMechanicsObjectHasOnlyKeys(effect.amount, AMOUNT_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(effect.amount.expr, DICE_EXPR_FIELDS);
  if (!damageAmountSupported)
    pushIssue(
      "damageAmount",
      spellActivationEffectPath(phaseOrdinal, effectOrdinal),
    );
  const damageTypeSupported =
    effect?.kind === "damage" &&
    effect.damageType ===
      REPEATED_DAMAGE_ALLOCATION_DAMAGE_SIGNATURE.damageType;
  if (!damageTypeSupported)
    pushIssue(
      "damageType",
      spellActivationEffectPath(phaseOrdinal, effectOrdinal),
    );

  const parsedDamage = isRepeatedDamageEffect(effect)
    ? { expr: effect.amount.expr, damageType: effect.damageType }
    : undefined;
  const uniqueIssues = spellUniqueMechanicsIssues(issues);
  if (parsedRangeFeet === undefined) {
    const rangeIssue = {
      failedFact: "range" as const,
      mechanicsPath: spellMechanicsHeaderPath("range"),
    };
    return {
      tag: "unsupported",
      issues: [
        rangeIssue,
        ...uniqueIssues.filter(
          (issue) => issue.failedFact !== rangeIssue.failedFact,
        ),
      ],
    };
  }
  if (parsedRepeatedEffectCount === undefined) {
    const countIssue = {
      failedFact: "repeatedEffectCount" as const,
      mechanicsPath: spellActivationAttachmentPath(phaseOrdinal),
    };
    return {
      tag: "unsupported",
      issues: [
        countIssue,
        ...uniqueIssues.filter(
          (issue) => issue.failedFact !== countIssue.failedFact,
        ),
      ],
    };
  }
  if (parsedDamage === undefined) {
    const damageIssue = {
      failedFact: damageAmountSupported
        ? ("damageType" as const)
        : ("damageAmount" as const),
      mechanicsPath: spellActivationEffectPath(phaseOrdinal, effectOrdinal),
    };
    return {
      tag: "unsupported",
      issues: [
        damageIssue,
        ...uniqueIssues.filter(
          (issue) => issue.failedFact !== damageIssue.failedFact,
        ),
      ],
    };
  }
  const failures = spellProcedureNonEmpty(uniqueIssues);
  if (failures !== undefined)
    return {
      tag: "unsupported",
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          repeatedDamageAllocationIssue(failedFact, mechanicsPath),
      ),
    };

  const facts = {
    ...source.spellDefinitionRuleFacts,
    rangeFeet: parsedRangeFeet,
    repeatedEffectCount: parsedRepeatedEffectCount,
    damage: parsedDamage,
  } satisfies RepeatedDamageAllocationMechanicsFacts;
  return {
    tag: "parsed",
    facts,
    evidence: {
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellActivationPhasePath(phaseOrdinal),
        spellActivationAttachmentPath(phaseOrdinal),
        spellActivationEffectPath(phaseOrdinal, effectOrdinal),
      ],
      unowned: [],
    } satisfies SpellProcedureMechanicsEvidence,
  };
}

function admitRepeatedDamageAllocationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "repeatedDamageAllocation",
  RepeatedDamageAllocationMechanicsFacts,
  RepeatedDamageAllocationInvocation,
  RepeatedDamageAllocationAdmissionIssue
> {
  return Match.value(inspectRepeatedDamageAllocationMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          repeatedDamageAllocationIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "repeatedDamageAllocation" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitRepeatedDamageAllocation(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitRepeatedDamageAllocation(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: RepeatedDamageAllocationMechanicsFacts,
): readonly RepeatedDamageAllocationInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly RepeatedDamageAllocationInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      const repeatedEffectCount =
        facts.repeatedEffectCount.base +
        Math.max(
          0,
          Number(slot.spellLevel) - facts.repeatedEffectCount.baseLevel,
        ) *
          facts.repeatedEffectCount.perSlotAboveBase;
      const admissionFacts = repeatedDamageAllocationAdmissionFacts({
        selectedSlotLevel: slot.spellLevel,
        repeatedEffectCount,
      });
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption({
            spellLevel: admissionFacts.selectedSlotLevel,
            payment: slot.payment,
          }),
          procedure: "repeatedDamageAllocation",
          spell,
          targeting: {
            kind: "repeatedEffectTargetAllocation",
            repeatedEffectCount: admissionFacts.repeatedEffectCount,
          },
          damage: facts.damage,
          rangeFeet: facts.rangeFeet,
        },
      ];
    },
  );
}

function discoverRepeatedDamageAllocationCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<RepeatedDamageAllocationInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetAllocationHole = spellTargetAllocationHole(
    state,
    actorId,
    invocation,
  );
  const castActs =
    targetAllocationHole.choices.length === 0
      ? []
      : [
          {
            subject: spellCastSelectionSubject(actorId, invocation),
            initialHoles: [targetAllocationHole],
          },
        ];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveRepeatedDamageAllocation(
  input: RepeatedDamageAllocationResolveInput,
): BattleResolutionResult {
  return resolvePreparedSlotSpellAct(input);
}

const RepeatedDamageAllocationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("repeatedDamageAllocation"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("repeatedEffectTargetAllocation"),
      repeatedEffectCount: Schema.Number,
    }),
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const repeatedDamageAllocationProfile: SpellProcedureDeclaration<
  "repeatedDamageAllocation",
  RepeatedDamageAllocationInvocation,
  RepeatedDamageAllocationMechanicsFacts,
  RepeatedDamageAllocationAdmissionIssue
> = {
  procedure: "repeatedDamageAllocation",
  executionSchema: RepeatedDamageAllocationInvocationSchema,
  admitMechanics: admitRepeatedDamageAllocationMechanics,
  discoverCastAct: discoverRepeatedDamageAllocationCastAct,
  resolve: resolveRepeatedDamageAllocation,
};
import { spellInvocationResourceForCastOption } from "./profile.ts";
