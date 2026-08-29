import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dragons-breath-initial
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
//
// The grantedAreaSaveDamageAction Spell Procedure Profile: a prepared Bonus Action
// spell that attaches a Concentration-owned Spell Effect to one willing touched
// creature and stores the chosen damage type plus caster Spell Save DC for the
// target-granted Magic Action.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Dragon's Breath": Bonus Action, Touch,
//     Concentration up to 1 minute; choose Acid, Cold, Fire, Lightning, or
//     Poison; one willing creature can take a Magic Action to exhale a 15-foot
//     Cone; Dexterity Saving Throw for half damage.
//   - The same spell's "Using a Higher-Level Spell Slot" section: damage
//     increases by 1d6 for each Spell Slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Magic Action, Concentration,
//     Spell Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, SpellSlotLevel } from "@dnd/shared/types";
import { Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type GrantedAreaSaveDamageActionSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { spellSaveDcForCaster } from "../spell-save-dc.ts";
import { breakBattleConcentration } from "../damage-apply.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { applyGrantedAreaSaveDamageActionSpellEffect } from "../spells-active-effects.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
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
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type GrantedAreaSaveDamageActionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "grantedAreaSaveDamageAction" }
>;
type GrantedAreaSaveDamageActionResolveInput =
  SpellProcedureProfileResolveInput<GrantedAreaSaveDamageActionInvocation>;

function admitGrantedAreaSaveDamageAction(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly GrantedAreaSaveDamageActionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly GrantedAreaSaveDamageActionInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const projection = grantedAreaSaveDamageActionSpellProjection(
        ctx.actor.combatantId,
        spell,
        slot.spellLevel,
      );
      return projection === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "grantedAreaSaveDamageAction",
              spell,
              actionCost: "bonusAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: 1,
              },
              ...projection,
            },
          ];
    },
  );
}

function grantedAreaSaveDamageActionSpellProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
  slotLevel: SpellSlotLevel,
): Pick<
  GrantedAreaSaveDamageActionSpellInvocation,
  "activeEffect" | "damageTypeChoices" | "rangeFeet"
> | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const operation = mechanics.operations[0];
  const selection =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "target"
      ? mechanics.attachment.value.selection
      : null;
  const effect = operation?.effect;
  const attachment = effect?.kind === "save_gate" ? effect.attachment : null;
  const damage = effect?.kind === "save_gate" ? effect.onFail : null;
  const damageType = damage?.kind === "damage" ? damage.damageType : null;
  const damageTypeChoice =
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value.kind === "choice"
      ? damageType.value
      : null;
  if (
    mechanics.level !== 2 ||
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "touch" ||
    mechanics.duration.kind !== "concentration" ||
    mechanics.duration.upTo.unit !== "minute" ||
    mechanics.duration.upTo.amount !== 1 ||
    selection?.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    mechanics.operations.length !== 1 ||
    operation === undefined ||
    operation.trigger.kind !== "on_attached_spends_action" ||
    operation.trigger.cost.kind !== "standard_action" ||
    operation.trigger.cost.action !== "magic" ||
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    attachment?.kind !== "area" ||
    !("origin" in attachment) ||
    attachment.origin.kind !== "on_attached_creature" ||
    !("shape" in attachment) ||
    attachment.shape.kind !== "cone" ||
    attachment.shape.lengthFeet !== 15 ||
    effect.onSuccess.kind !== "half_damage" ||
    damage?.kind !== "damage" ||
    damage.amount.kind !== "linear_per_level" ||
    damage.amount.axis !== "slot" ||
    damage.amount.base.dice !== 3 ||
    damage.amount.base.dieSize !== 6 ||
    damage.amount.perLevel.dice !== 1 ||
    damage.amount.startingAtLevel !== 2 ||
    damageTypeChoice === null
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(5),
        damageTypeChoices: damageTypeChoice.options,
        activeEffect: {
          kind: "grantedAreaSaveDamageAction",
          sourceCombatantId: actorId,
          originalSlotLevel: slotLevel,
          expiresAt: {
            kind: "concentration",
            combatantId: actorId,
            durationTicks: durationTicks.success,
          },
        },
      };
}

function discoverGrantedAreaSaveDamageActionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<GrantedAreaSaveDamageActionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveGrantedAreaSaveDamageAction(
  input: GrantedAreaSaveDamageActionResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    additionalHoleIds: [spellDamageTypeChoiceHole(input.invocation).holeId],
    invalidFillMessage:
      "Granted area Save damage uses one target-list fill and one damage type choice.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const targetId = targetSelection.targetIds[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetId === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Granted area Save damage must target one willing creature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Granted area Save damage type must be one of the selected spell's choices.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellSaveDc = spellSaveDcForCaster(input.input.state, input.actorId);
  if (spellSaveDc === null) {
    return invalidResult(
      input.input.state,
      "unsupportedSubject",
      "Granted area Save damage requires a caster Spell Save DC.",
    );
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetSelection.targetIds,
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyGrantedAreaSaveDamageActionSpellEffect(
    concentrationBase,
    input.actorId,
    targetId,
    input.fillSet.damageTypeChoice.value,
    spellSaveDc,
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

export const GrantedAreaSaveDamageActionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("grantedAreaSaveDamageAction"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("grantedAreaSaveDamageAction"),
        sourceCombatantId: CombatantId,
        originalSlotLevel: SpellSlotLevel,
        expiresAt: Schema.Struct({
          kind: Schema.Literal("concentration"),
          combatantId: CombatantId,
          durationTicks: ElapsedTimeTicksSchema,
        }),
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      rangeFeet: MovementFeet,
    }),
  );
export const grantedAreaSaveDamageActionProfile = {
  procedure: "grantedAreaSaveDamageAction",
  executionSchema: GrantedAreaSaveDamageActionInvocationSchema,
  admit: admitGrantedAreaSaveDamageAction,
  discoverCastAct: discoverGrantedAreaSaveDamageActionCastAct,
  resolve: resolveGrantedAreaSaveDamageAction,
} satisfies SpellProcedureDeclaration<
  "grantedAreaSaveDamageAction",
  GrantedAreaSaveDamageActionInvocation
>;
