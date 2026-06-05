// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-jump-movement-replacement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
//
// The jumpMovementReplacement Spell Procedure Profile: a prepared Bonus Action
// spell that attaches a one-minute, once-on-each-target-turn movement spend
// replacement to touched willing creatures.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Jump": Bonus Action, Touch, 1 minute; one willing
//     creature can jump up to 30 feet by spending 10 feet of Movement once on
//     each of its turns; higher slots add one target per slot level above 1.
//   - SRD 5.2.1 Rules Glossary "Long Jump": each foot jumped costs a foot of
//     Movement, and landing in Difficult Terrain can impose Prone after a
//     failed DC 10 Dexterity (Acrobatics) check.
//   - UBIQUITOUS_LANGUAGE.md: Speed is capacity; Movement is consumption.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type SpellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "../spells-profile-shared.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type JumpMovementReplacementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "jumpMovementReplacement" }
>;
type JumpMovementReplacementResolveInput = SpellProcedureProfileResolveInput<
  JumpMovementReplacementInvocation,
  BonusActionSpellBattleResolutionInput
>;

function admitJumpMovementReplacement(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly JumpMovementReplacementInvocation[] {
  const projection = jumpMovementReplacementSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly JumpMovementReplacementInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const maxTargets = jumpMovementReplacementTargetCount(
        spell,
        slot.spellLevel,
      );
      return maxTargets === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "jumpMovementReplacement",
              spell,
              actionCost: "bonusAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets,
              },
              ...projection,
            },
          ];
    },
  );
}

function jumpMovementReplacementSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  JumpMovementReplacementInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    selection?.mode !== "choose_up_to" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "jump_movement_replacement" ||
    effect.frequency !== "once_on_each_target_turn" ||
    effect.maxJumpDistanceFeet !== 30 ||
    effect.movementCostFeet !== 10
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "jumpMovementReplacement",
          sourceSpellId: spell.id,
          sourceCombatantId: actorId,
          movementCostFeet: movementFeet(effect.movementCostFeet),
          maxJumpDistanceFeet: movementFeet(effect.maxJumpDistanceFeet),
          usedThisTurn: false,
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      };
}

function jumpMovementReplacementTargetCount(
  spell: SpellRecord,
  slotLevel: SpellSlotLevel,
): number | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return null;
  }
  return scalarBuffSpellTargetCount(
    phase.attachment.value.selection,
    spell.mechanics.level,
    slotLevel,
  );
}

function discoverJumpMovementReplacementCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: JumpMovementReplacementInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: jumpMovementReplacementInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: jumpMovementReplacementCastSummary(invocation),
          initialHoles: [targetHole],
        },
      ];
}

function jumpMovementReplacementInvocationRef(
  invocation: JumpMovementReplacementInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "jumpMovementReplacement",
  };
}

function jumpMovementReplacementCastSummary(
  invocation: JumpMovementReplacementInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveJumpMovementReplacement(
  input: JumpMovementReplacementResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Jump uses a target-list fill only.",
    );
  }

  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: input.fillSet.targetList.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyJumpMovementReplacementSpellEffect(
    input.input.state,
    input.actorId,
    input.fillSet.targetList.targetIds,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

function applyJumpMovementReplacementSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: JumpMovementReplacementInvocation,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "jumpMovementReplacement" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...target,
        activeEffects,
      }),
    };
  }, state);
}

const JumpMovementReplacementInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "jumpMovementReplacement" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("jumpMovementReplacement"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);
export const jumpMovementReplacementProfile = {
  procedure: "jumpMovementReplacement",
  invocationSchema: JumpMovementReplacementInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitJumpMovementReplacement,
  discoverCastAct: discoverJumpMovementReplacementCastAct,
  castSummary: jumpMovementReplacementCastSummary,
  invocationRef: jumpMovementReplacementInvocationRef,
  resolve: resolveJumpMovementReplacement,
} satisfies SpellProcedureProfile<
  "jumpMovementReplacement",
  JumpMovementReplacementInvocation,
  BonusActionSpellBattleResolutionInput
>;
