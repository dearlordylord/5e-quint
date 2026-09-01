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
import {
  sameStringSet,
  supportedSpellSlotDamageFacts,
} from "../spells-execution-facts.ts";
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
import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
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

type AfterHitDamageMechanicsIssue = {
  readonly failedFact: AfterHitDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function afterHitDamageMechanicsIssue(
  failedFact: AfterHitDamageMechanicsIssue["failedFact"],
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitDamageMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function afterHitDamageIssueResult(issue: AfterHitDamageMechanicsIssue): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "afterHitDamage";
  readonly failedFact: AfterHitDamageFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "afterHitDamage",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported afterHitDamage mechanics fact: ${issue.failedFact}.`,
  };
}

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

function afterHitDamageNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

function afterHitDamageUniqueIssues(
  issues: readonly AfterHitDamageMechanicsIssue[],
): readonly AfterHitDamageMechanicsIssue[] {
  const issueKeys = new Set<string>();
  return issues.filter((issue) => {
    const key = JSON.stringify([issue.failedFact, issue.mechanicsPath.nodes]);
    if (issueKeys.has(key)) return false;
    issueKeys.add(key);
    return true;
  });
}

function admitAfterHitDamageMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitDamage",
  AfterHitDamageMechanicsFacts,
  AfterHitDamageInvocation,
  ReturnType<typeof afterHitDamageIssueResult>
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const phase = source.mechanics.phases.find(
    (candidate) => candidate.kind === "direct",
  );
  if (phase?.kind !== "direct") {
    return { tag: "notRepresented" };
  }
  if (
    source.mechanics.castingTime.kind !== "bonus_action" ||
    source.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    source.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike"
  ) {
    return { tag: "notRepresented" };
  }
  const issues: AfterHitDamageMechanicsIssue[] = [];
  const phaseIndex = source.mechanics.phases.findIndex(
    (candidate) => candidate.kind === "direct",
  );
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  if (source.mechanics.level !== 1) {
    issues.push(
      afterHitDamageMechanicsIssue("level", spellMechanicsHeaderPath("level")),
    );
  }
  if (source.mechanics.range.kind !== "self") {
    issues.push(
      afterHitDamageMechanicsIssue("range", spellMechanicsHeaderPath("range")),
    );
  }
  if (source.mechanics.duration.kind !== "instantaneous") {
    issues.push(
      afterHitDamageMechanicsIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
  }
  if (source.mechanics.castingTime.kind !== "bonus_action") {
    issues.push(
      afterHitDamageMechanicsIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  }
  if (source.mechanics.phases.length !== 1 || phaseIndex !== 0) {
    if (phaseIndex !== 0) {
      issues.push(
        afterHitDamageMechanicsIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
        ),
      );
    }
    for (const [index] of source.mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      issues.push(
        afterHitDamageMechanicsIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
  }
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one"
  ) {
    issues.push(
      afterHitDamageMechanicsIssue(
        "attachment",
        spellActivationAttachmentPath(phaseOrdinal),
      ),
    );
  }
  const effects = phase.effects ?? [];
  if (effects.length !== 2) {
    const effectOrdinals =
      effects.length > 2
        ? effects.slice(2).map((_effect, index) => index + 3)
        : effects.length === 1
          ? [2]
          : [1, 2];
    for (const ordinal of effectOrdinals) {
      issues.push(
        afterHitDamageMechanicsIssue(
          "effects",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(ordinal)),
        ),
      );
    }
  }
  const baseDamage = effects[0];
  const baseDamageProjection =
    baseDamage?.kind === "damage" && baseDamage.damageType === "radiant"
      ? { amount: baseDamage.amount }
      : null;
  if (baseDamageProjection === null) {
    issues.push(
      afterHitDamageMechanicsIssue(
        "damage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
      ),
    );
  }
  const conditionalBonus = effects[1];
  const conditionalBonusProjection =
    conditionalBonus?.kind === "conditional_bonus_damage" &&
    conditionalBonus.damageType === "radiant" &&
    conditionalBonus.when?.kind === "target_creature_type" &&
    sameCreatureTypeSet(conditionalBonus.when.types, ["fiend", "undead"]) &&
    conditionalBonus.amount.kind === "fixed" &&
    conditionalBonus.amount.expr.dice === 1 &&
    conditionalBonus.amount.expr.dieSize === 8 &&
    (conditionalBonus.amount.expr.flat ?? 0) === 0
      ? {
          targetTypes: conditionalBonus.when.types,
          expr: conditionalBonus.amount.expr,
        }
      : null;
  if (conditionalBonusProjection === null) {
    issues.push(
      afterHitDamageMechanicsIssue(
        "conditionalBonusDamage",
        spellActivationEffectPath(phaseOrdinal, PositiveInteger(2)),
      ),
    );
  }
  const nonEmptyIssues = afterHitDamageNonEmpty(
    afterHitDamageUniqueIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmptyIssues.map(
      afterHitDamageIssueResult,
    );
    return {
      tag: "unsupported",
      issues: [firstIssue, ...remainingIssues],
    };
  }
  if (baseDamageProjection === null || conditionalBonusProjection === null) {
    return {
      tag: "unsupported",
      issues: [
        afterHitDamageIssueResult(
          afterHitDamageMechanicsIssue(
            "damage",
            spellActivationEffectPath(phaseOrdinal, PositiveInteger(1)),
          ),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    damageAmount: baseDamageProjection.amount,
    damageType: "radiant",
    conditionalBonusTargetTypes: conditionalBonusProjection.targetTypes,
    conditionalBonusExpr: conditionalBonusProjection.expr,
    conditionalBonusDamageType: "radiant",
  } satisfies AfterHitDamageMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "afterHitDamage",
      facts,
      evidence: afterHitDamageMechanicsEvidence(source.mechanics, phase),
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
