// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-damage
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
//   - The attack-hit Reaction window and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The metamagic table entry remains Wave 9 migration work.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import type { CreatureType } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { BattleReactionTrigger } from "../../battle-reaction-triggers.ts";
import {
  classFeatureFreeCastSpellInvocationRef,
  type SpellInvocationRef,
  type BattleSubject,
} from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AfterHitDamageSpellInvocation,
  type AttackSpellDamageAddition,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleInterruptedProcedure,
  type BattleReactionFrame,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleState,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  characterResourceIsClassFeatureFreeCastForSpell,
  resourceHasUsesRemaining,
} from "../../character-battle-resources.ts";
import {
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastReactionWindowWithTriggeredSpellChoices,
  reactionInterruptFrame,
} from "../dispatcher.ts";
import { battleCreatureType } from "../domain-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-profile-shared.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import {
  spendClassFeatureFreeCastResource,
  spendSpellCastResources,
  type SpellCastResourceSpendResult,
} from "../spells-resolve-resources.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  ClassFeatureFreeCastInvocationResourceSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitDamageInvocation = AfterHitDamageSpellInvocation;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AttackHitDamageReplayFrame = Extract<
  BattleReactionFrame,
  { readonly trigger: "attackHit" }
> & {
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
};
type AfterHitDamageBattleResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly frame: AttackHitDamageReplayFrame;
    readonly target: BattleCreatureState;
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  };
type AfterHitDamageResolveInput = SpellProcedureProfileResolveInput<
  AfterHitDamageInvocation,
  AfterHitDamageBattleResolutionInput
>;

function admitAfterHitDamage(
  spell: SpellRecord,
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
      : ctx.actor.origin.resources.flatMap(
          (resource): readonly AfterHitDamageInvocation[] =>
            characterResourceIsClassFeatureFreeCastForSpell(
              resource,
              spell.id,
            ) && resourceHasUsesRemaining(resource)
              ? [
                  {
                    access: { tag: "prepared" },
                    resource: {
                      tag: "classFeatureFreeCast",
                      resourceUnitId: resource.unit.id,
                    },
                    procedure: "afterHitDamage",
                    spell,
                    actionCost: "bonusAction",
                    damage: {
                      expr: freeCastDamageExpr,
                      damageType: projection.damageType,
                    },
                    conditionalBonusDamage: {
                      targetCreatureTypes:
                        projection.conditionalBonusTargetTypes,
                      expr: projection.conditionalBonusExpr,
                      damageType: projection.conditionalBonusDamageType,
                    },
                  },
                ]
              : [],
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

function afterHitDamageSpellProjection(spell: SpellRecord): {
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

function afterHitDamageInvocationRef(
  invocation: AfterHitDamageInvocation,
): SpellInvocationRef {
  if (invocation.resource.tag === "classFeatureFreeCast") {
    return classFeatureFreeCastSpellInvocationRef(
      invocation.spell.id,
      invocation.resource.resourceUnitId,
      "afterHitDamage",
    );
  }
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "afterHitDamage",
  };
}

function afterHitDamageCastSummary(
  invocation: AfterHitDamageInvocation,
): string {
  return invocation.resource.tag === "classFeatureFreeCast"
    ? `Cast ${invocation.spell.name} using a class feature free cast after a qualifying hit.`
    : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
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

  const spellCastFrame = spellCastReactionFrame({
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
    maybeOpenSpellCastReactionWindowWithTriggeredSpellChoices(
      input.input.state,
      spellCastFrame,
      input.input.suppressedReactionTrigger,
    );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const resourced =
    input.invocation.resource.tag === "classFeatureFreeCast"
      ? spendAfterHitDamageFreeCastResource(
          input.input.state,
          input.input.subject.casterId,
          input.invocation.resource.resourceUnitId,
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
    sourceSpellId: input.invocation.spell.id,
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
      ...input.input.frame.continuation,
      attackDamageAdditions: [
        ...(input.input.frame.continuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
  const nextState: BattleState = {
    ...resourced.state,
    interruptStack: [
      ...resourced.state.interruptStack.slice(0, -1),
      reactionInterruptFrame(nextFrame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    spellId: input.invocation.spell.id,
    targetIds: [input.input.target.combatantId],
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
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
  resourceUnitId: string,
  invocation: AfterHitDamageInvocation,
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
    resourceUnitId,
    invocation,
    state,
  );
}

const AfterHitDamageInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "afterHitDamage" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: Schema.Union(
      SpellSlotInvocationResourceSchema,
      ClassFeatureFreeCastInvocationResourceSchema,
    ),
    procedure: Schema.Literal("afterHitDamage"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("bonusAction"),
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: DamageTypeSchema,
    }),
    conditionalBonusDamage: Schema.Struct({
      targetCreatureTypes: Schema.Array(Schema.String),
      expr: BattleRuntimeObjectSchema,
      damageType: DamageTypeSchema,
    }),
  }),
);
export const afterHitDamageProfile = {
  procedure: "afterHitDamage",
  invocationSchema: AfterHitDamageInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitAfterHitDamage,
  discoverCastAct: discoverAfterHitDamageCastAct,
  castSummary: afterHitDamageCastSummary,
  invocationRef: afterHitDamageInvocationRef,
  resolve: resolveAfterHitDamage,
} satisfies SpellProcedureProfile<
  "afterHitDamage",
  AfterHitDamageInvocation,
  AfterHitDamageBattleResolutionInput,
  OkSpellFillSet
>;
