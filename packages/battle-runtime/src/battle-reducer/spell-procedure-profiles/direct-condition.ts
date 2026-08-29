import { spellInvocationResourceForCastOption } from "./profile.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
//
// The directCondition Spell Procedure Profile: a prepared Magic Action spell
// that applies a spell-owned condition to touched creature targets, with
// Concentration duration and target-action early end.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { TargetSelection } from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type DirectConditionSpellInvocation,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { CombatantId } from "../../identity.ts";
import { applyDirectConditionSpellEffects } from "../direct-condition-lifecycle.ts";

import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import {
  maybeOpenConfiguredSpellCastReactionWindow,
  spendConfiguredSpellCastResources,
} from "../spell-active-effect-resolution.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "../spells-execution-facts.ts";
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

type DirectConditionResolveInput =
  SpellProcedureProfileResolveInput<DirectConditionSpellInvocation>;

const DIRECT_CONDITION_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_deals_damage",
  "target_casts_spell",
] as const;

function admitDirectCondition(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly DirectConditionSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly DirectConditionSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const projection = directConditionProjection(
        ctx.actor.combatantId,
        spell,
      );
      if (projection === null) {
        return [];
      }
      const maxTargets = scalarBuffSpellTargetCount(
        projection.selection,
        spell.mechanics.level,
        slot.spellLevel,
      );
      return maxTargets === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "directCondition",
              spell,
              actionCost: "magicAction",
              targeting: { kind: "targetList", minTargets: 1, maxTargets },
              activeEffect: projection.activeEffect,
              rangeFeet: projection.rangeFeet,
            },
          ];
    },
  );
}

function directConditionProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
):
  | (Pick<DirectConditionSpellInvocation, "activeEffect" | "rangeFeet"> & {
      readonly selection: TargetSelection;
    })
  | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const [phase] = spell.mechanics.phases;
  const attachment = phase?.kind === "direct" ? phase.attachment : null;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const [effect, extraEffect] = effects;
  if (
    selection === null ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"]) ||
    effect?.kind !== "apply_condition" ||
    effect.condition !== "invisible" ||
    extraEffect !== undefined ||
    !sameStringSet(
      (spell.mechanics.duration.earlyEnd ?? []).map((end) => end.kind),
      DIRECT_CONDITION_EARLY_END_KINDS,
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        selection,
        rangeFeet: movementFeet(5),
        activeEffect: {
          kind: "targetActionEndedSpellCondition",
          sourceCombatantId: actorId,
          condition: "invisible",
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.success,
          },
        },
      };
}

function discoverDirectConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveDirectCondition(
  input: DirectConditionResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    invalidFillMessage: "Direct condition spells use a target-list fill only.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const { targetIds } = targetSelection;

  const spellCastReactionWindow = maybeOpenConfiguredSpellCastReactionWindow({
    resolution: input,
    targetIds,
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (input.storedGlyphRelease !== undefined) {
    const effected = applyDirectConditionSpellEffects(
      input.input.state,
      input.actorId,
      targetIds,
      input.invocation,
    );
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
  }
  const resourced = spendConfiguredSpellCastResources({
    resolution: input,
    state: input.input.state,
    ...(input.storedGlyphRelease === undefined
      ? {}
      : { startConcentration: false }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyDirectConditionSpellEffects(
    resourced.state,
    input.actorId,
    targetIds,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

const DirectConditionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    activeEffect: Schema.Struct({
      ...BattleEffectOccurrenceTemplateSchemaFields,
      kind: Schema.Literal("targetActionEndedSpellCondition"),
      sourceCombatantId: CombatantId,
      condition: Schema.Literal("invisible"),
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
    }),
    rangeFeet: MovementFeet,
  }),
);
export const directConditionProfile: SpellProcedureDeclaration<
  "directCondition",
  DirectConditionSpellInvocation
> = {
  procedure: "directCondition",
  executionSchema: DirectConditionInvocationSchema,
  admit: admitDirectCondition,
  discoverCastAct: discoverDirectConditionCastAct,
  resolve: resolveDirectCondition,
};
