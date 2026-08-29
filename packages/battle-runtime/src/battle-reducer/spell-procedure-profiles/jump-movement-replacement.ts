import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
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
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";

import { replaceAllocatedTargetSpellActiveEffects } from "../active-effect-replacement.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type JumpMovementReplacementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "jumpMovementReplacement" }
>;
type JumpMovementReplacementResolveInput =
  SpellProcedureProfileResolveInput<JumpMovementReplacementInvocation>;

function admitJumpMovementReplacement(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly JumpMovementReplacementInvocation[] {
  const projection = jumpMovementReplacementSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
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
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "jumpMovementReplacement",
              spell,
              actionCost: "bonusAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets,
                requiredTargetDisposition: "willing",
              },
              ...projection,
            },
          ];
    },
  );
}

function jumpMovementReplacementSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
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
  return Result.isFailure(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "jumpMovementReplacement",
          sourceCombatantId: actorId,
          movementCostFeet: movementFeet(effect.movementCostFeet),
          maxJumpDistanceFeet: movementFeet(effect.maxJumpDistanceFeet),
          usedThisTurn: false,
          expiresAt: { kind: "duration", durationTicks: durationTicks.success },
        },
      };
}

function jumpMovementReplacementTargetCount(
  spell: BattleSpellAdmissionSource,
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
  invocation: BattleExecutableSpellInvocation<JumpMovementReplacementInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveJumpMovementReplacement(
  input: JumpMovementReplacementResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    invalidFillMessage: "Jump uses a target-list fill only.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const { targetIds } = targetSelection;

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetIds,
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyJumpMovementReplacementSpellEffect(
    input.input.state,
    input.actorId,
    targetIds,
    input.invocation,
    input.input.subject.procedureRef,
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
  invocation: JumpMovementReplacementResolveInput["invocation"],
  procedureRef: BonusActionSpellBattleResolutionInput["subject"]["procedureRef"],
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceAllocatedTargetSpellActiveEffects(
        nextState,
        targetId,
        (effect) =>
          effect.kind === "jumpMovementReplacement" &&
          effect.sourceProcedureRef === procedureRef &&
          effect.sourceCombatantId === actorId,
        [
          {
            ...invocation.activeEffect,
            sourceCombatantId: actorId,
            sourceProcedureRef: procedureRef,
          },
        ],
      ),
    state,
  );
}

const JumpMovementReplacementInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("jumpMovementReplacement"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    activeEffect: Schema.Struct({
      ...BattleEffectOccurrenceTemplateSchemaFields,
      kind: Schema.Literal("jumpMovementReplacement"),
      sourceCombatantId: CombatantId,
      movementCostFeet: MovementFeet,
      maxJumpDistanceFeet: MovementFeet,
      usedThisTurn: Schema.Literal(false),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
    rangeFeet: MovementFeet,
  }),
);
export const jumpMovementReplacementProfile = {
  procedure: "jumpMovementReplacement",
  executionSchema: JumpMovementReplacementInvocationSchema,
  admit: admitJumpMovementReplacement,
  discoverCastAct: discoverJumpMovementReplacementCastAct,
  resolve: resolveJumpMovementReplacement,
} satisfies SpellProcedureDeclaration<
  "jumpMovementReplacement",
  JumpMovementReplacementInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
