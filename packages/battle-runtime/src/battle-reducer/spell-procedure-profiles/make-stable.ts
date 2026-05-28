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
//   - invocationRef()      - was the makeStable branch in
//                            spells-invocation-ref.ts
//   - resolve()            - was resolveMakeStableSpellAct in
//                            spells-resolve-support-effects.ts
//
// What stays in shared infrastructure:
//   - spellTargetIsLegal's zero-HP/non-dead target predicate remains in
//     spells-targeting.ts until target legality dispatch migrates to profiles.

import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { spellId } from "../../identity.ts";
import type { CombatantId } from "../../identity.ts";
import {
  maybeOpenReactionWindow,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type MakeStableInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "makeStable" }
>;

function spareTheDyingRangeFeet(
  range: SpellRecord["mechanics"]["range"],
  characterLevel: number,
): MovementFeet | null {
  if (
    range.kind !== "point" ||
    typeof range.feet !== "object" ||
    range.feet.kind !== "threshold_tiers" ||
    range.feet.axis !== "character"
  ) {
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
  spell: SpellRecord,
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
      access: { tag: "classCantrip" },
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
  invocation: MakeStableInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: makeStableInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: makeStableCastSummary(invocation),
      initialHoles: [targetHole],
    },
  ];
}

function makeStableInvocationRef(
  invocation: MakeStableInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "makeStable",
  };
}

function makeStableCastSummary(invocation: MakeStableInvocation): string {
  return `Cast ${invocation.spell.name} as a cantrip.`;
}

function resolveMakeStable(
  input: SpellProcedureProfileResolveInput<MakeStableInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Stable cantrips use one zero-Hit-Point target fill.",
    );
  }
  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.fillSet.targetId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const target = input.input.state.combatants.get(input.fillSet.targetId);
  if (
    target === undefined ||
    target.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }

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

const MakeStableInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "makeStable" }>
>(
  Schema.Struct({
    access: ClassCantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("makeStable"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    rangeFeet: MovementFeet,
  }),
);
export const makeStableProfile: SpellProcedureProfile<
  "makeStable",
  MakeStableInvocation
> = {
  procedure: "makeStable",
  invocationSchema: MakeStableInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMakeStable,
  discoverCastAct: discoverMakeStableCastAct,
  castSummary: makeStableCastSummary,
  invocationRef: makeStableInvocationRef,
  resolve: resolveMakeStable,
};
