import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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
import { spellSlotLevel } from "@dnd/shared/types";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  type AfterHitDamageSpellInvocation,
  type AttackSpellDamageAddition,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../dispatcher.ts";
import {
  type BattleResourcePoolExecutionRef,
  type CombatantId,
} from "../../identity.ts";
import {
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  interruptCheckpointFrame,
} from "../dispatcher.ts";
import { battleCreatureType } from "../domain-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import {
  spendClassFeatureFreeCastResource,
  spendSpellCastResources,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  ClassFeatureFreeCastExecutionResourceSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitDamageInvocation = AfterHitDamageSpellInvocation;
type AfterHitDamageResolveInput =
  SpellProcedureProfileResolveInput<AfterHitDamageInvocation>;

function admitAfterHitDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly AfterHitDamageInvocation[] {
  const projection = afterHitDamageSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  const freeCastSlotLevel = spellSlotLevel(spell.mechanics.level);
  const freeCastDamageExpr = supportedDamageAmountExpr({
    amount: projection.damageAmount,
    spellLevel: spell.mechanics.level,
    slotLevel: freeCastSlotLevel,
  });
  const freeCastInvocations: readonly AfterHitDamageInvocation[] =
    freeCastDamageExpr === null
      ? []
      : spell.classFeatureFreeCastResourcePoolRefs.map(
          (resourcePoolRef): AfterHitDamageInvocation => ({
            access: { tag: "prepared" },
            resource: {
              tag: "classFeatureFreeCast",
              resourcePoolRef,
            },
            procedure: "afterHitDamage",
            spell,
            actionCost: "bonusAction",
            damage: {
              expr: freeCastDamageExpr,
              damageType: projection.damageType,
            },
            conditionalBonusDamage: {
              targetCreatureTypes: projection.conditionalBonusTargetTypes,
              expr: projection.conditionalBonusExpr,
              damageType: projection.conditionalBonusDamageType,
            },
          }),
        );
  const slotInvocations = ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly AfterHitDamageInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: projection.damageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "afterHitDamage",
          spell,
          actionCost: "bonusAction",
          damage: {
            expr: damageExpr,
            damageType: projection.damageType,
          },
          conditionalBonusDamage: {
            targetCreatureTypes: projection.conditionalBonusTargetTypes,
            expr: projection.conditionalBonusExpr,
            damageType: projection.conditionalBonusDamageType,
          },
        },
      ];
    },
  );
  return [...freeCastInvocations, ...slotInvocations];
}

function afterHitDamageSpellProjection(spell: BattleSpellAdmissionSource): {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: DamageType;
  readonly conditionalBonusTargetTypes: readonly CreatureType[];
  readonly conditionalBonusExpr: DiceExpr;
  readonly conditionalBonusDamageType: DamageType;
} | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const baseDamage = effects[0];
  const conditionalBonus = effects[1];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    effects.length !== 2 ||
    baseDamage?.kind !== "damage" ||
    baseDamage.damageType !== "radiant" ||
    conditionalBonus?.kind !== "conditional_bonus_damage" ||
    conditionalBonus.damageType !== "radiant" ||
    conditionalBonus.when?.kind !== "target_creature_type" ||
    !sameCreatureTypeSet(conditionalBonus.when.types, ["fiend", "undead"]) ||
    conditionalBonus.amount.kind !== "fixed" ||
    conditionalBonus.amount.expr.dice !== 1 ||
    conditionalBonus.amount.expr.dieSize !== 8 ||
    (conditionalBonus.amount.expr.flat ?? 0) !== 0
  ) {
    return null;
  }
  return {
    damageAmount: baseDamage.amount,
    damageType: "radiant",
    conditionalBonusTargetTypes: conditionalBonus.when.types,
    conditionalBonusExpr: conditionalBonus.amount.expr,
    conditionalBonusDamageType: "radiant",
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
  if (!spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {})) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  const attackContinuation = input.input.frame.continuation;
  const spellCastFrame = spellCastInterruptFrame({
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetIds: [input.input.target.combatantId],
    reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
    castingResource: { kind: "bonusAction" },
    continuation: {
      kind: "replay",
      subject: input.input.subject,
      fills: input.input.fills,
    },
  });
  const spellCastReactionWindow =
    maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
      input.input.state,
      spellCastFrame,
      input.input.handledInterruptTrigger,
    );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const resourced =
    input.invocation.resource.tag === "classFeatureFreeCast"
      ? spendAfterHitDamageFreeCastResource(
          input.input.state,
          input.input.subject.casterId,
          input.invocation.resource.resourcePoolRef,
          input.invocation,
        )
      : spendSpellCastResources({
          state: input.input.state,
          actorId: input.input.subject.casterId,
          invocation: input.invocation,
          errorState: input.input.state,
        });
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
  const nextFrame = {
    ...input.input.frame,
    continuation: {
      ...attackContinuation,
      attackDamageAdditions: [
        ...(attackContinuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
  const nextState: BattleState = {
    ...resourced.state,
    interruptStack: [
      ...resourced.state.interruptStack.slice(0, -1),
      interruptCheckpointFrame(nextFrame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    targetIds: [input.input.target.combatantId],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
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
  if (Either.isLeft(spentBonusAction)) {
    return invalidResult(
      state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  return spendClassFeatureFreeCastResource(
    {
      ...state,
      currentTurnResources: spentBonusAction.right,
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
    resource: Schema.Union(
      SpellSlotInvocationResourceSchema,
      ClassFeatureFreeCastExecutionResourceSchema,
    ),
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
  admit: admitAfterHitDamage,
  discoverCastAct: discoverAfterHitDamageCastAct,
  resolve: resolveAfterHitDamage,
} satisfies SpellProcedureDeclaration<
  "afterHitDamage",
  AfterHitDamageInvocation
>;
