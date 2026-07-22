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
import type { SpellRecord, TargetSelection } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type DirectConditionSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { applyDirectConditionSpellEffects } from "../direct-condition-lifecycle.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "../spell-cast-interrupt-frame.ts";
import {
  sameStringSet,
  scalarBuffSpellTargetCount,
} from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetListHole,
  validateSpellTargetList,
} from "../spells-targeting.ts";
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
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type DirectConditionResolveInput =
  SpellProcedureProfileResolveInput<DirectConditionSpellInvocation>;

const DIRECT_CONDITION_EARLY_END_KINDS = [
  "target_makes_attack_roll",
  "target_deals_damage",
  "target_casts_spell",
] as const;

function admitDirectCondition(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DirectConditionSpellInvocation[] {
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
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
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
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
  spell: SpellRecord,
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
  return Either.isLeft(durationTicks)
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
            durationTicks: durationTicks.right,
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
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [targetHole],
        },
      ];
}

function resolveDirectCondition(
  input: DirectConditionResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Direct condition spells use a target-list fill only.",
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

  if (input.storedGlyphRelease === undefined) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: input.fillSet.targetList.targetIds,
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource:
          input.actionCostOverride === "bonusAction" ||
          input.input.subject.tag === "bonusActionSpell"
            ? { kind: "bonusAction" }
            : { kind: "magicAction" },
        ...spellCastMetamagicApplicationsInput(
          input.metamagicApplications ?? [],
        ),
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
  }

  if (input.storedGlyphRelease !== undefined) {
    const effected = applyDirectConditionSpellEffects(
      input.input.state,
      input.actorId,
      input.fillSet.targetList.targetIds,
      input.invocation,
    );
    return {
      tag: "resolved",
      state: effected,
      snapshot: snapshotBattle(effected),
    };
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.storedGlyphRelease !== undefined
      ? { startConcentration: false }
      : {}),
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyDirectConditionSpellEffects(
    resourced.state,
    input.actorId,
    input.fillSet.targetList.targetIds,
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
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("directCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    activeEffect: Schema.Struct({
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
  metamagicCompatibility: "bonusActionRewrite",
  admit: admitDirectCondition,
  discoverCastAct: discoverDirectConditionCastAct,
  resolve: resolveDirectCondition,
};
