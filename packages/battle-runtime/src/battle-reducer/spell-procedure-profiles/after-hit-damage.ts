import { optionalProperty } from "../../optional-property.ts";
import {
  completeAfterHitSpellDamageCast,
  maybeOpenAfterHitSpellCastInterrupt,
} from "../after-hit-spell-resolution.ts";
import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-damage
import {
  CreatureTypeSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitDamage Spell Procedure Profile: a Bonus Action spell cast
// immediately after a qualifying melee weapon or Unarmed Strike hit, adding
// spell damage to the triggering attack.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Divine Smite": Bonus Action immediately after a
//     Melee weapon or Unarmed Strike hit; Self; instantaneous; extra Radiant
//     damage from the attack, with extra dice against Fiends and Undead and
//     higher-level slot scaling.
//   - SRD 5.2.1 Playing the Game "Making an Attack": on a hit, roll damage;
//     some attacks cause special effects in addition to or instead of damage.
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Spell Slot, and Spell Invocation.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The metamagic table entry remains Wave 9 migration work.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import { Result, Match } from "effect";

import {
  type AttackSpellDamageAddition,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import {
  type BattleResourcePoolExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import { battleCreatureType } from "../domain-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { supportedSpellSlotDamageFacts } from "../../procedure-admission/spell-slot-damage-facts.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import {
  spendSpellAccessFreeCastResource,
  spendSpellCastResources,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  spellConsumedMaterialEvidencePaths,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  afterHitAdmissionRejection,
  afterHitMechanicsIssue,
  afterHitRequiredFactIssues,
  type AfterHitMechanicsIssue,
} from "./after-hit-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { PositiveInteger } from "@dnd/shared/types";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "afterHitDamage" }
>;
type AfterHitDamageMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: DamageType;
  readonly conditionalBonusTargetTypes: readonly CreatureType[];
  readonly conditionalBonusExpr: DiceExpr;
  readonly conditionalBonusDamageType: DamageType;
};
type AfterHitDamageResolveInput =
  SpellProcedureProfileResolveInput<AfterHitDamageInvocation>;

function admitAfterHitDamage(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: AfterHitDamageMechanicsFacts,
): readonly AfterHitDamageInvocation[] {
  const slotInvocations = supportedSpellSlotDamageFacts({
    slots: ctx.spellCastOptions,
    amount: facts.damageAmount,
    spellLevel: facts.level,
  }).map(
    ({ slotLevel, damageExpr, payment }): AfterHitDamageInvocation => ({
      access: { tag: "prepared" },
      resource: spellInvocationResourceForCastOption({
        spellLevel: slotLevel,
        payment,
      }),
      procedure: "afterHitDamage",
      spell,
      actionCost: "bonusAction",
      damage: {
        expr: damageExpr,
        damageType: facts.damageType,
      },
      conditionalBonusDamage: {
        targetCreatureTypes: facts.conditionalBonusTargetTypes,
        expr: facts.conditionalBonusExpr,
        damageType: facts.conditionalBonusDamageType,
      },
    }),
  );
  return slotInvocations;
}

export const AFTER_HIT_DAMAGE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "phaseCount",
  "attachment",
  "effects",
  "damage",
  "conditionalBonusDamage",
] as const;
type AfterHitDamageFailedFact = (typeof AFTER_HIT_DAMAGE_FAILED_FACTS)[number];

type AfterHitDamageMechanicsIssue =
  AfterHitMechanicsIssue<AfterHitDamageFailedFact>;
type AfterHitDamageAdmissionIssue = SpellProcedureAdmissionIssue<
  "afterHitDamage",
  AfterHitDamageFailedFact
>;

function afterHitDamageMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

type AfterHitDamageCandidate = {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >;
  readonly phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >;
  readonly phaseIndex: number;
};

function afterHitDamageCandidate(
  source: SpellMechanicsAdmissionSource,
): AfterHitDamageCandidate | undefined {
  if (source.mechanics.family !== "activation") return undefined;
  const phaseIndex = source.mechanics.phases.findIndex(
    (candidate) => candidate.kind === "direct",
  );
  const phase = source.mechanics.phases[phaseIndex];
  if (phase?.kind !== "direct") return undefined;
  const castingTime = source.mechanics.castingTime;
  if (castingTime.kind !== "bonus_action") return undefined;
  if (castingTime.trigger?.kind !== "after_hit_with") return undefined;
  if (castingTime.trigger.attack !== "melee_weapon_or_unarmed_strike") {
    return undefined;
  }
  return { mechanics: source.mechanics, phase, phaseIndex };
}

function afterHitDamageHeaderIssues(
  candidate: AfterHitDamageCandidate,
): readonly AfterHitDamageMechanicsIssue[] {
  const issues: AfterHitDamageMechanicsIssue[] = [];
  if (candidate.mechanics.level !== 1) {
    issues.push(
      afterHitMechanicsIssue("level", spellMechanicsHeaderPath("level")),
    );
  }
  if (candidate.mechanics.range.kind !== "self") {
    issues.push(
      afterHitMechanicsIssue("range", spellMechanicsHeaderPath("range")),
    );
  }
  if (candidate.mechanics.duration.kind !== "instantaneous") {
    issues.push(
      afterHitMechanicsIssue("duration", spellMechanicsHeaderPath("duration")),
    );
  }
  return issues;
}

function afterHitDamagePhaseIssues(
  candidate: AfterHitDamageCandidate,
): readonly AfterHitDamageMechanicsIssue[] {
  const issues: AfterHitDamageMechanicsIssue[] = [];
  for (const [index] of candidate.mechanics.phases.entries()) {
    if (
      candidate.mechanics.phases.length === 1 &&
      index === candidate.phaseIndex
    )
      continue;
    if (index === candidate.phaseIndex && candidate.phaseIndex === 0) continue;
    issues.push(
      afterHitMechanicsIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 1)),
      ),
    );
  }
  return issues;
}

function afterHitDamageAttachmentIssues(
  candidate: AfterHitDamageCandidate,
  phaseOrdinal: PositiveInteger,
): readonly AfterHitDamageMechanicsIssue[] {
  const attachment = candidate.phase.attachment;
  return attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    attachment.value.selection.mode === "one"
    ? []
    : [
        afterHitMechanicsIssue(
          "attachment",
          spellActivationAttachmentPath(phaseOrdinal),
        ),
      ];
}

function afterHitDamageEffectCountIssues(
  effectCount: number,
  phaseOrdinal: PositiveInteger,
): readonly AfterHitDamageMechanicsIssue[] {
  if (effectCount === 2) return [];
  const ordinals =
    effectCount > 2
      ? Array.from({ length: effectCount - 2 }, (_unused, index) => index + 3)
      : effectCount === 1
        ? [2]
        : [1, 2];
  return ordinals.map((ordinal) =>
    afterHitMechanicsIssue(
      "effects",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(ordinal)),
    ),
  );
}

function fixedRadiantD8Bonus(
  amount: Extract<
    Extract<
      AfterHitDamageCandidate["phase"]["effects"],
      readonly unknown[]
    >[number],
    { readonly kind: "conditional_bonus_damage" }
  >["amount"],
): amount is Extract<typeof amount, { readonly kind: "fixed" }> {
  return (
    amount.kind === "fixed" &&
    amount.expr.dice === 1 &&
    amount.expr.dieSize === 8 &&
    (amount.expr.flat ?? 0) === 0
  );
}

function afterHitDamageProjections(
  candidate: AfterHitDamageCandidate,
  phaseOrdinal: PositiveInteger,
) {
  const effects = candidate.phase.effects ?? [];
  const baseDamageProjection = afterHitBaseDamageProjection(effects[0]);
  const conditionalBonusProjection = afterHitConditionalBonusProjection(
    effects[1],
  );
  const issues = [
    ...afterHitRequiredFactIssues(
      baseDamageProjection !== null,
      "damage",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
    ),
    ...afterHitRequiredFactIssues(
      conditionalBonusProjection !== null,
      "conditionalBonusDamage",
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(2)),
    ),
  ];
  return { baseDamageProjection, conditionalBonusProjection, issues };
}

function afterHitBaseDamageProjection(
  effect:
    | NonNullable<AfterHitDamageCandidate["phase"]["effects"]>[number]
    | undefined,
) {
  return effect?.kind === "damage" && effect.damageType === "radiant"
    ? { amount: effect.amount }
    : null;
}

function afterHitConditionalBonusProjection(
  effect:
    | NonNullable<AfterHitDamageCandidate["phase"]["effects"]>[number]
    | undefined,
) {
  return effect?.kind === "conditional_bonus_damage" &&
    effect.damageType === "radiant" &&
    effect.when?.kind === "target_creature_type" &&
    sameCreatureTypeSet(effect.when.types, ["fiend", "undead"]) &&
    fixedRadiantD8Bonus(effect.amount)
    ? { targetTypes: effect.when.types, expr: effect.amount.expr }
    : null;
}

function admitAfterHitDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitDamage",
  AfterHitDamageMechanicsFacts,
  AfterHitDamageInvocation,
  AfterHitDamageAdmissionIssue
> {
  const candidate = afterHitDamageCandidate(source);
  if (candidate === undefined) return { tag: "notRepresented" };
  const phaseOrdinal = PositiveInteger(candidate.phaseIndex + 1);
  const projections = afterHitDamageProjections(candidate, phaseOrdinal);
  const issues = [
    ...afterHitDamageHeaderIssues(candidate),
    ...afterHitDamagePhaseIssues(candidate),
    ...afterHitDamageAttachmentIssues(candidate, phaseOrdinal),
    ...afterHitDamageEffectCountIssues(
      candidate.phase.effects?.length ?? 0,
      phaseOrdinal,
    ),
    ...projections.issues,
  ];
  const rejection = afterHitAdmissionRejection("afterHitDamage", issues);
  if (rejection !== undefined) return rejection;
  if (
    projections.baseDamageProjection === null ||
    projections.conditionalBonusProjection === null
  ) {
    return { tag: "notRepresented" };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    damageAmount: projections.baseDamageProjection.amount,
    damageType: "radiant",
    conditionalBonusTargetTypes:
      projections.conditionalBonusProjection.targetTypes,
    conditionalBonusExpr: projections.conditionalBonusProjection.expr,
    conditionalBonusDamageType: "radiant",
  } satisfies AfterHitDamageMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "afterHitDamage",
      facts,
      evidence: afterHitDamageMechanicsEvidence(
        candidate.mechanics,
        candidate.phase,
      ),
      admit: (executionSource, ctx) =>
        admitAfterHitDamage(executionSource, ctx, facts),
    },
  };
}

function sameCreatureTypeSet(
  left: readonly CreatureType[],
  right: readonly CreatureType[],
): boolean {
  return sameStringSet(left, right);
}

function discoverAfterHitDamageCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function resolveAfterHitDamage(
  input: AfterHitDamageResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellCastReactionWindow = maybeOpenAfterHitSpellCastInterrupt({
    input: input.input,
    invocation: input.invocation,
    fillSet: input.fillSet,
    casterId: input.input.subject.casterId,
    targetId: input.input.target.combatantId,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const resourced = Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) =>
      spendAfterHitDamageFreeCastResource(
        input.input.state,
        input.input.subject.casterId,
        resourcePoolRef,
        input.invocation,
      ),
    ),
    Match.when({ tag: "spellSlot" }, () =>
      spendSpellCastResources({
        state: input.input.state,
        actorId: input.input.subject.casterId,
        invocation: input.invocation,
        errorState: input.input.state,
      }),
    ),
    Match.exhaustive,
  );
  if (resourced.tag === "invalid") {
    return resourced;
  }

  const targetCreatureType = battleCreatureType(input.input.target);
  const conditionalBonusApplies =
    targetCreatureType !== null &&
    input.invocation.conditionalBonusDamage.targetCreatureTypes.includes(
      targetCreatureType,
    );
  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceProcedure: "afterHitDamage",
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: {
        ...input.invocation.damage.expr,
        dice:
          input.invocation.damage.expr.dice +
          (conditionalBonusApplies
            ? input.invocation.conditionalBonusDamage.expr.dice
            : 0),
      },
      damageType: input.invocation.damage.damageType,
    },
  };
  return completeAfterHitSpellDamageCast({
    state: resourced.state,
    frame: input.input.frame,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetId: input.input.target.combatantId,
    damageAddition,
    ...optionalProperty(
      "handledInterruptTrigger",
      input.input.handledInterruptTrigger,
    ),
  });
}

function spendAfterHitDamageFreeCastResource(
  state: BattleState,
  casterId: CombatantId,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  invocation: AfterHitDamageResolveInput["invocation"],
): SpellCastResourceSpendResult {
  const spentBonusAction = spendActivationResource(state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Result.isFailure(spentBonusAction)) {
    return invalidResult(
      state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  return spendSpellAccessFreeCastResource(
    {
      ...state,
      currentTurnResources: spentBonusAction.success,
    },
    casterId,
    resourcePoolRef,
    invocation,
    state,
  );
}

const AfterHitDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("afterHitDamage"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    conditionalBonusDamage: Schema.Struct({
      targetCreatureTypes: Schema.Array(CreatureTypeSchema),
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
  }),
);
export const afterHitDamageProfile = {
  procedure: "afterHitDamage",
  executionSchema: AfterHitDamageInvocationSchema,
  admitMechanics: admitAfterHitDamageMechanics,
  discoverCastAct: discoverAfterHitDamageCastAct,
  resolve: resolveAfterHitDamage,
} satisfies SpellProcedureDeclaration<
  "afterHitDamage",
  AfterHitDamageInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
