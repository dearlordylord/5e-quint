import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-make-stable
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAKE_STABLE_LIFECYCLE
//
// The makeStable Spell Procedure Profile: a cantrip-access spell (today Spare
// the Dying) that makes one zero-Hit-Point non-dead creature Stable.
//
// What lives here:
//   - admit()              - was supportedCantripMakeStableSpellProfile in
//                            spells-profiles.ts
//   - spareTheDyingRangeFeet - was private to spells-profiles.ts
//   - discoverCastAct()    - was the generic single-target action-spell
//                            discovery path in spells-discovery.ts
//   - castSummary()        - was the makeStable branch in
//                            spells-discovery.ts:spellInvocationCastSummary
//                            spells-invocation-ref.ts
//   - resolve()            - was resolveMakeStableSpellAct in
//                            spells-resolve-support-effects.ts
//
// What stays in shared infrastructure:
//   - spellTargetIsLegal's zero-HP/non-dead target predicate remains in
//     spells-targeting.ts until target legality dispatch migrates to profiles.

import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import { isThresholdTierPointRange } from "@dnd/surface/surface/types";
import type { CombatantId } from "../../identity.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";

import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTarget } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import {
  CantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type MakeStableInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "makeStable" }
>;

function spareTheDyingRangeFeet(
  range: BattleSpellAdmissionSource["mechanics"]["range"],
  characterLevel: number,
): MovementFeet | null {
  if (!isThresholdTierPointRange(range) || range.feet.axis !== "character") {
    return null;
  }
  return movementFeet(
    range.feet.tiers.reduce(
      (current, tier) =>
        characterLevel >= tier.atLevel ? tier.value : current,
      range.feet.base,
    ),
  );
}

function admitMakeStable(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MakeStableInvocation[] {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  const targetSelection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  const rangeFeet = spareTheDyingRangeFeet(
    spell.mechanics.range,
    spellAdmissionCharacterLevel(ctx),
  );
  const stateFilter =
    targetSelection !== null &&
    "stateFilter" in targetSelection &&
    Array.isArray(targetSelection.stateFilter)
      ? targetSelection.stateFilter
      : [];
  if (
    targetSelection === null ||
    targetSelection.mode !== "one" ||
    !sameStringSet(targetSelection.targetKinds ?? [], ["creature"]) ||
    !sameStringSet(stateFilter, ["zero_hp_not_dead"]) ||
    phase?.kind !== "direct" ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "make_stable" ||
    rangeFeet === null
  ) {
    return [];
  }
  return [
    {
      access: cantripSpellAccessFor(spell.castingSource),
      resource: { tag: "none" },
      procedure: "makeStable",
      spell,
      actionCost: "magicAction",
      rangeFeet,
    },
  ];
}

function discoverMakeStableCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MakeStableInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveMakeStable(
  input: SpellProcedureProfileResolveInput<MakeStableInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [ATTACK_TARGET_HOLE_ID])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Stable cantrips use one zero-Hit-Point target fill.",
    );
  }
  /* v8 ignore stop */
  const targetSelection = selectSingleSpellTarget({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    invalidTargetMessage:
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    [targetSelection.targetId],
    { kind: "magicAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const target = targetSelection.target;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop */

  const nextTarget = {
    ...target,
    zeroHpLifecycle: {
      ...target.zeroHpLifecycle,
      deathSaves: { ...resetDeathSaveRuntimeState(), stable: true },
    },
  };
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
  };
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

const MakeStableInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("makeStable"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    rangeFeet: MovementFeet,
  }),
);
export const makeStableProfile: SpellProcedureDeclaration<
  "makeStable",
  MakeStableInvocation
> = {
  procedure: "makeStable",
  executionSchema: MakeStableInvocationSchema,
  admit: admitMakeStable,
  discoverCastAct: discoverMakeStableCastAct,
  resolve: resolveMakeStable,
};
