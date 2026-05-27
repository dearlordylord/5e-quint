// The persistentArmorEffect Spell Procedure Profile: a touch spell that
// creates a timed Spell Effect setting the willing unarmored target's base
// Armor Class to a fixed base plus Dexterity modifier.
//
// What lives here:
//   - admit()           - was supportedPreparedPersistentSpellProfile in
//                         spells-profiles.ts
//   - admitInvocationSpellAccess() - was
//                         supportedInvocationPersistentSpellProfile in
//                         spells-profiles.ts
//   - discoverCastAct() - was the generic target-bearing action-spell branch
//                         in spells-discovery.ts
//   - castSummary()     - was the persistentArmorEffect branch in
//                         spells-discovery.ts
//   - invocationRef()   - was the persistentArmorEffect branch in
//                         spells-invocation-ref.ts
//   - resolve()         - was the persistentArmorEffect branch in
//                         spells-resolve.ts
//   - applyEffect()     - was applyPersistentSpellActiveEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - Known-willing target checks and unarmored target legality stay in
//     spells-targeting.ts until targeting classification migrates.
//   - The Armor of Shadows Spell Access parser stays in
//     character-battle-resources.ts.
//   - The central codec branch in battle-codecs.ts still owns the Schema
//     literal for this invocation - see the TODO in profile.ts.

import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either, Match } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { armorOfShadowsSpellInvocationRef } from "../../battle-subjects.ts";
import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
  type ActionSpellBattleResolutionInput,
} from "../../battle-reducer.ts";
import type { CharacterBattleInvocationSpellAccessState } from "../../character-battle-resources.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { combatantWearingArmor } from "../creature-state-leaves.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTargetHole,
  spellTargetIsLegal,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type PersistentArmorInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentArmorEffect" }
>;
type PersistentArmorEffectResolutionInput = ActionSpellBattleResolutionInput & {
  readonly castingState: BattleState;
};
type PersistentArmorSpellSource =
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "prepared" } }
      >,
      "access" | "resource"
    >
  | Pick<
      Extract<
        PersistentArmorInvocation,
        { readonly access: { readonly tag: "armorOfShadows" } }
      >,
      "access" | "resource"
    >;

function persistentArmorEffectShape(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<PersistentArmorInvocation, "rangeFeet" | "activeEffect"> | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.duration.kind !== "timed"
  ) {
    return null;
  }
  const operation = spell.mechanics.operations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.value,
  );
  const requiredDurationTicks = elapsedTimeTicksFromHours(8);
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    Either.isLeft(durationTicks) ||
    Either.isLeft(requiredDurationTicks) ||
    Number(durationTicks.right) !== Number(requiredDurationTicks.right) ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return null;
  }

  return {
    rangeFeet: movementFeet(5),
    activeEffect: {
      kind: "spellBaseArmorClass",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      base: operation.effect.formula.base,
      ability: "dex",
      expiresAt: { kind: "duration", durationTicks: durationTicks.right },
      earlyEnds: [{ kind: "targetDonsArmor" }],
    },
  };
}

function buildPersistentArmorEffectInvocation(
  actorId: CombatantId,
  spell: SpellRecord,
  source: PersistentArmorSpellSource,
): readonly PersistentArmorInvocation[] {
  const shape = persistentArmorEffectShape(actorId, spell);
  if (shape === null) {
    return [];
  }
  return [
    {
      ...source,
      procedure: "persistentArmorEffect",
      spell,
      ...shape,
    },
  ];
}

function admitPersistentArmorEffect(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly PersistentArmorInvocation[] {
  return buildPersistentArmorEffectInvocation(ctx.actor.combatantId, spell, {
    access: { tag: "prepared" },
    resource: { tag: "spellSlot", slotLevel: spellSlotLevel(1) },
  });
}

export function admitPersistentArmorEffectInvocationSpellAccess(
  actorId: CombatantId,
  access: CharacterBattleInvocationSpellAccessState,
): readonly PersistentArmorInvocation[] {
  return Match.value(access).pipe(
    Match.when({ tag: "armorOfShadowsMageArmor" }, (armorOfShadows) =>
      buildPersistentArmorEffectInvocation(actorId, armorOfShadows.spell, {
        access: { tag: "armorOfShadows" },
        resource: { tag: "none" },
      }),
    ),
    Match.when({ tag: "pactOfTheChainFindFamiliar" }, () => []),
    Match.exhaustive,
  );
}

function discoverPersistentArmorEffectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: PersistentArmorInvocation,
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
        invocation: persistentArmorEffectInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: persistentArmorEffectCastSummary(invocation),
      initialHoles: [targetHole],
    },
  ];
}

function persistentArmorEffectInvocationRef(
  invocation: PersistentArmorInvocation,
): SpellInvocationRef {
  return invocation.resource.tag === "none"
    ? armorOfShadowsSpellInvocationRef(invocation.spell.id)
    : {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "persistentArmorEffect",
      };
}

function persistentArmorEffectCastSummary(
  invocation: PersistentArmorInvocation,
): string {
  return invocation.resource.tag === "none"
    ? `Cast ${invocation.spell.name} using Armor of Shadows.`
    : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function applyPersistentArmorEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: PersistentArmorInvocation,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || combatantWearingArmor(target)) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

function resolvePersistentArmorEffect(
  input: SpellProcedureProfileResolveInput<
    PersistentArmorInvocation,
    PersistentArmorEffectResolutionInput
  >,
): BattleResolutionResult {
  const originalState = input.input.state;
  const castingState = input.input.castingState;

  if (
    input.fillSet.targetId !== undefined &&
    input.fillSet.objectTarget !== undefined
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  if (
    input.fillSet.targetId === undefined &&
    input.fillSet.objectTarget === undefined
  ) {
    return needsHolesResult(originalState, input.input.subject, [
      spellTargetHole(originalState, input.actorId, input.invocation),
    ]);
  }
  if (input.fillSet.objectTarget !== undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Object target fill does not match this spell act.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  const target = originalState.combatants.get(input.fillSet.targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      originalState,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (
    input.fillSet.attackRoll != null ||
    input.fillSet.damageRoll != null ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      originalState,
      "invalidFill",
      "Persistent spell effects do not use attack or damage fills.",
    );
  }

  const effected = applyPersistentArmorEffect(
    castingState,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: originalState,
    startConcentration: false,
  });
}

export const persistentArmorEffectProfile: SpellProcedureProfile<
  "persistentArmorEffect",
  PersistentArmorInvocation,
  PersistentArmorEffectResolutionInput
> = {
  procedure: "persistentArmorEffect",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitPersistentArmorEffect,
  discoverCastAct: discoverPersistentArmorEffectCastAct,
  castSummary: persistentArmorEffectCastSummary,
  invocationRef: persistentArmorEffectInvocationRef,
  resolve: resolvePersistentArmorEffect,
};
