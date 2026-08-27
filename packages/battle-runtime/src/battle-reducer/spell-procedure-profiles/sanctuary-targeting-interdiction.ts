import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sanctuary-targeting-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
//
// The sanctuaryTargetingInterdiction Spell Procedure Profile: a prepared Bonus
// Action spell that wards one creature, asks for a Wisdom Saving Throw when a
// direct attack roll or damaging spell targets that creature, and removes the
// ward when the warded creature makes an attack roll, casts a spell, or deals
// damage.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Sanctuary": Bonus Action, 30 feet, 1 minute; ward one
//     creature; direct attack-roll and damaging-spell targeting require a
//     Wisdom Saving Throw; failure chooses a new target or loses the attack or
//     spell; areas of effect are excluded; the spell ends when the warded
//     creature makes an attack roll, casts a spell, or deals damage.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Attack Roll, Saving Throw, Spell
//     Slot, Spell Invocation, Spell Effect, and Spell Save DC.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Result } from "effect";

import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SanctuaryTargetingInterdictionSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  combatantWithSanctuaryWard,
} from "../sanctuary-targeting-interdiction.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetIsLegal,
  spellTargetListHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  preparedSpellSlotInvocations,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const SanctuaryWardTemplateSchema = Schema.Struct({
  sourceCombatantId: CombatantId,
  kind: Schema.Literal("sanctuaryWard"),
  save: Schema.Struct({
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
  }),
  expiresAt: DurationBattleActiveEffectExpirationSchema,
});

type SanctuaryTargetingInterdictionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "sanctuaryTargetingInterdiction" }
>;
type SanctuaryTargetingInterdictionResolveInput =
  SpellProcedureProfileResolveInput<SanctuaryTargetingInterdictionInvocation>;

function admitSanctuaryTargetingInterdiction(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly SanctuaryTargetingInterdictionInvocation[] {
  const projection = sanctuaryTargetingInterdictionProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return preparedSpellSlotInvocations(spell, ctx, (base) => ({
    ...base,
    procedure: "sanctuaryTargetingInterdiction",
    actionCost: "bonusAction",
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    ...projection,
  }));
}

function sanctuaryTargetingInterdictionProjection(
  actorId: CombatantId,
  spell: BattleSpellAdmissionSource,
): Pick<
  SanctuaryTargetingInterdictionSpellInvocation,
  "activeEffect" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 1
  ) {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const targetSelection =
    attachment.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const operation = spell.mechanics.operations[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    targetSelection?.mode !== "one" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    operation?.trigger.kind !== "on_attached_targeted" ||
    operation.trigger.excludes !== "area_of_effect" ||
    !sameStringSet(operation.trigger.targeting, [
      "attack_roll",
      "damaging_spell",
    ]) ||
    operation.effect.kind !== "save_gate" ||
    operation.effect.ability !== "wis" ||
    operation.effect.dc.kind !== "caster_spell_save_dc" ||
    operation.effect.onSuccess.kind !== "none" ||
    operation.effect.onFail.kind !== "choose_new_target_or_lose" ||
    operation.effect.onFail.subject !== "triggering_attack_or_spell" ||
    !sameStringSet(
      earlyEnd.map((end) => end.kind),
      ["target_makes_attack_roll", "target_casts_spell", "target_deals_damage"],
    )
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        rangeFeet: movementFeet(30),
        activeEffect: {
          kind: "sanctuaryWard",
          sourceCombatantId: actorId,
          save: { ability: "wis", dc: operation.effect.dc },
          expiresAt: { kind: "duration", durationTicks: durationTicks.success },
        },
      };
}

function discoverSanctuaryTargetingInterdictionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SanctuaryTargetingInterdictionInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveSanctuaryTargetingInterdiction(
  input: SanctuaryTargetingInterdictionResolveInput,
): BattleResolutionResult {
  const targetList = input.fillSet.targetList;
  if (targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetList.targetIds.length !== 1) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sanctuary must target exactly one creature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const targetId = targetList.targetIds[0]!;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.actorId,
  );
  const target = spellCastState.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      spellCastState,
      input.actorId,
      targetId,
      input.invocation,
      targetList.spatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sanctuary target must be a combatant within range.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const combatants = new Map(spellCastState.combatants).set(
    targetId,
    combatantWithSanctuaryWard(target, input.invocation),
  );
  return spendSpellCastResources({
    state: { ...spellCastState, combatants },
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    skipTargetActionSpellCastEarlyEnd: true,
  });
}

const SanctuaryTargetingInterdictionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("sanctuaryTargetingInterdiction"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
      }),
      activeEffect: SanctuaryWardTemplateSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const sanctuaryTargetingInterdictionProfile = {
  procedure: "sanctuaryTargetingInterdiction",
  executionSchema: SanctuaryTargetingInterdictionInvocationSchema,
  admit: admitSanctuaryTargetingInterdiction,
  discoverCastAct: discoverSanctuaryTargetingInterdictionCastAct,
  resolve: resolveSanctuaryTargetingInterdiction,
} satisfies SpellProcedureDeclaration<
  "sanctuaryTargetingInterdiction",
  SanctuaryTargetingInterdictionInvocation
>;
