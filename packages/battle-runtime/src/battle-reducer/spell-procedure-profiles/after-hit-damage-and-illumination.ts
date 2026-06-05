// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-damage-illumination
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitDamageAndIllumination Spell Procedure Profile: a Bonus Action
// spell cast immediately after a qualifying melee weapon or Unarmed Strike hit,
// adding spell damage to the triggering attack and applying a Concentration
// illumination effect to the struck target.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Shining Smite":
//     Bonus Action immediately after a Melee weapon or Unarmed Strike hit;
//     Self; Concentration up to 1 minute; extra Radiant damage from the
//     attack; target sheds Bright Light, attack rolls against it have
//     Advantage, and it can't benefit from Invisible.
//   - SRD 5.2.1 Rules Glossary "Concentration", "Bright Light", and
//     "Invisible [Condition]".
//   - SRD 5.2.1 Playing the Game "Damage Rolls".
//   - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Bonus Action, Attack Roll,
//     Damage Roll, Spell Slot, Concentration, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The Shining Smite light-emitter projection constant stays in
//     spells-active-effects.ts with the light-emitter projection code.
//   - The metamagic table entry remains Wave 9 migration work.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  DamageType,
  DiceAmount as SurfaceDiceAmount,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { BattleInterruptTrigger } from "../../battle-interrupt-triggers.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type AfterHitDamageAndIlluminationSpellInvocation,
  type AttackSpellDamageAddition,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleInterruptedProcedure,
  type BattleInterruptCheckpoint,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  interruptCheckpointFrame,
} from "../dispatcher.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET } from "../spells-active-effects.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-profile-shared.ts";
import { spellFillSetContainsOnlySpellCastReactionFacts } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AfterHitDamageAndIlluminationInvocation =
  AfterHitDamageAndIlluminationSpellInvocation;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AttackHitDamageReplayFrame = Extract<
  BattleInterruptCheckpoint,
  { readonly trigger: "attackHit" }
> & {
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
};
type AfterHitDamageAndIlluminationBattleResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly frame: AttackHitDamageReplayFrame;
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
type AfterHitDamageAndIlluminationResolveInput =
  SpellProcedureProfileResolveInput<
    AfterHitDamageAndIlluminationInvocation,
    AfterHitDamageAndIlluminationBattleResolutionInput
  >;

function admitAfterHitDamageAndIllumination(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly AfterHitDamageAndIlluminationInvocation[] {
  const projection = afterHitDamageAndIlluminationSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly AfterHitDamageAndIlluminationInvocation[] => {
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
          procedure: "afterHitDamageAndIllumination",
          spell,
          actionCost: "bonusAction",
          damage: {
            expr: damageExpr,
            damageType: projection.damageType,
          },
          activeEffect: {
            kind: "shiningSmiteIllumination",
            sourceSpellId: spell.id,
            sourceCombatantId: ctx.actor.combatantId,
            expiresAt: projection.expiresAt,
          },
        },
      ];
    },
  );
}

function afterHitDamageAndIlluminationSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): {
  readonly damageAmount: SurfaceDiceAmount;
  readonly damageType: Extract<DamageType, "radiant">;
  readonly expiresAt: AfterHitDamageAndIlluminationSpellInvocation["activeEffect"]["expiresAt"];
} | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.castingTime.trigger?.kind !== "after_hit_with" ||
    spell.mechanics.castingTime.trigger.attack !==
      "melee_weapon_or_unarmed_strike" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.attachment.kind !== "hole" ||
    spell.mechanics.attachment.value.kind !== "target" ||
    spell.mechanics.attachment.value.selection.mode !== "one" ||
    spell.mechanics.operations.length !== 3 ||
    !spell.mechanics.operations.every(
      (operation) => operation.trigger.kind === "passive",
    )
  ) {
    return null;
  }

  const initialPhase = spell.mechanics.initialPhase;
  const damage =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const operationEffects = spell.mechanics.operations.map(
    (operation) => operation.effect,
  );
  const light = operationEffects.find((effect) => effect.kind === "emit_light");
  const attackAdvantage = operationEffects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const suppressInvisible = operationEffects.find(
    (effect) => effect.kind === "suppress_condition_benefit",
  );
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.effects?.length !== 1 ||
    damage?.kind !== "damage" ||
    damage.damageType !== "radiant" ||
    damage.amount === undefined ||
    light?.kind !== "emit_light" ||
    light.brightRadiusFeet !== SHINING_SMITE_BRIGHT_LIGHT_RADIUS_FEET ||
    (light.dimAdditionalFeet ?? 0) !== 0 ||
    attackAdvantage?.kind !== "modify_roll_advantage" ||
    attackAdvantage.mode !== "advantage" ||
    attackAdvantage.affects !== "rolls_against_self" ||
    attackAdvantage.on === undefined ||
    !sameStringSet(attackAdvantage.on, ["attack_roll"]) ||
    suppressInvisible?.kind !== "suppress_condition_benefit" ||
    suppressInvisible.condition !== "invisible" ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    damageAmount: damage.amount,
    damageType: "radiant",
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks: durationTicks.right,
    },
  };
}

function discoverAfterHitDamageAndIlluminationCastAct(
  _state: BattleState,
  _actorId: CombatantId,
  _invocation: AfterHitDamageAndIlluminationInvocation,
): readonly AvailableBattleAct[] {
  return [];
}

function afterHitDamageAndIlluminationInvocationRef(
  invocation: AfterHitDamageAndIlluminationInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "afterHitDamageAndIllumination",
  };
}

function afterHitDamageAndIlluminationCastSummary(
  invocation: AfterHitDamageAndIlluminationInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
}

function applyAfterHitDamageAndIlluminationSpellEffect(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "afterHitDamageAndIllumination" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const replacing = target.activeEffects.filter(
    (effect) =>
      effect.kind === "shiningSmiteIllumination" &&
      effect.sourceSpellId === invocation.spell.id &&
      effect.sourceCombatantId === invocation.activeEffect.sourceCombatantId,
  );
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replacing.includes(effect)),
    invocation.activeEffect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

function resolveAfterHitDamageAndIllumination(
  input: AfterHitDamageAndIlluminationResolveInput,
): BattleResolutionResult {
  if (!spellFillSetContainsOnlySpellCastReactionFacts(input.fillSet, {})) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
    );
  }

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

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.input.subject.casterId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }

  const damageAddition: AttackSpellDamageAddition = {
    kind: "attackSpellDamageAddition",
    sourceSpellId: input.invocation.spell.id,
    sourceCombatantId: input.input.subject.casterId,
    damage: {
      expr: input.invocation.damage.expr,
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
  const effected = applyAfterHitDamageAndIlluminationSpellEffect(
    resourced.state,
    input.input.target.combatantId,
    input.invocation,
  );
  const nextState: BattleState = {
    ...effected,
    interruptStack: [
      ...effected.interruptStack.slice(0, -1),
      interruptCheckpointFrame(nextFrame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    spellId: input.invocation.spell.id,
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

const AfterHitDamageAndIlluminationInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "afterHitDamageAndIllumination" }
    >
  >(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitDamageAndIllumination"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      activeEffect: BattleRuntimeObjectSchema,
    }),
  );
export const afterHitDamageAndIlluminationProfile = {
  procedure: "afterHitDamageAndIllumination",
  invocationSchema: AfterHitDamageAndIlluminationInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitAfterHitDamageAndIllumination,
  discoverCastAct: discoverAfterHitDamageAndIlluminationCastAct,
  castSummary: afterHitDamageAndIlluminationCastSummary,
  invocationRef: afterHitDamageAndIlluminationInvocationRef,
  resolve: resolveAfterHitDamageAndIllumination,
} satisfies SpellProcedureProfile<
  "afterHitDamageAndIllumination",
  AfterHitDamageAndIlluminationInvocation,
  AfterHitDamageAndIlluminationBattleResolutionInput,
  OkSpellFillSet
>;
