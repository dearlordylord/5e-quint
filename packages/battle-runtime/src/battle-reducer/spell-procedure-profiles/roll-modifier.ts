// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-roll-modifier
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The rollModifier Spell Procedure Profile: SRD spells (Bless, Bane, Guidance,
// Resistance, Shield of Faith and similar) that grant a persistent d20-roll
// modifier or a roll-mode rider on one or more targets, with either cantrip
// access (Guidance, Resistance) or prepared+slot access (Bless, Bane).
//
// What lives here (the public face of the profile):
//   - admit()           — combines cantrip and prepared admission. Was
//                         supportedCantripRollModifierSpellProfile and
//                         supportedPreparedRollModifierSpellProfile in
//                         spells-profiles-support.ts.
//   - resolve()         — was resolveRollModifierSpellAct in
//                         spells-resolve-support-effects.ts.
//   - applyEffect       — both same-effect-for-targets and per-target
//                         variants. Were applyRollModifierSpellEffect and
//                         applyRollModifierSpellEffectsByTarget in
//                         spells-active-effects.ts.
//   - discoverCastAct() — was the rollModifier branch in
//                         spells-discovery.ts:discoverBattleActs.
//   - castSummary()     — was the rollModifier branch in
//                         spellInvocationCastSummary.
//   - invocationRef()   — was the rollModifier Match case in
//                         supportedSpellInvocationRef.
//
// What stays in shared infrastructure files (imported back here):
//   - rollModifierSpellProjection + projection sub-helpers
//     (rollModifierActiveEffect, rollModifierAbilityCheckRollModeEffect,
//     rollModifierSpellTargeting, rollModifierSkillFilter) — entangled with
//     scalarBuff and thaumaturgyBoomingVoice; full extraction is a separate
//     sweep.
//   - rollModifierSpellTargetSelection / EffectSelection / AffectedTargets —
//     ~400 lines in spells-resolve-target-selection.ts. Moveable later.
//   - Hole builders (spellRollModifierSkillChoiceHole etc.) in
//     spells-damage-fills.ts — moveable later when the hole subsystem migrates.
//   - The metamagic table entry — same migration story as damageReduction.

import { spellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { spellId } from "../../identity.ts";
import type { CombatantId } from "../../identity.ts";
import {
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SelectedRollModifierSpellEffect,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenReactionWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import {
  rollModifierUsesTargetAbilityChoices,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierSkillChoiceHole,
  spellRollModifierTargetAbilityChoicesHole,
} from "../spells-damage-fills.ts";
import { targetListSpellUsesTargetListHole } from "../spells-discovery.ts";
import {
  isD20RollModifierSpellProjection,
  rollModifierSpellProjection,
} from "../spells-profiles-support.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import {
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
} from "../spells-resolve-target-selection.ts";
import { spellTargetHole, spellTargetListHole } from "../spells-targeting.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BATTLE_SURFACE_ABILITIES,
  BATTLE_SURFACE_SKILLS,
  RollModifierSpellInvocationBaseSchemaFields,
} from "../codec-building-blocks.ts";
import { KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS } from "../known-willing-target-spell-ids.ts";

type RollModifierInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "rollModifier" }
>;

function admitRollModifier(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly RollModifierInvocation[] {
  const out: RollModifierInvocation[] = [];
  if (spell.mechanics.level === 0) {
    const projection = rollModifierSpellProjection(
      ctx.actor.combatantId,
      spell,
      spellSlotLevel(0),
    );
    if (projection !== null) {
      out.push(
        buildRollModifierInvocation(
          spell,
          { tag: "classCantrip" },
          { tag: "none" },
          projection,
        ),
      );
    }
  }
  if (spell.mechanics.level >= 1) {
    for (const slot of ctx.actor.origin.spellcasting.spellSlots) {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        continue;
      }
      const projection = rollModifierSpellProjection(
        ctx.actor.combatantId,
        spell,
        slot.spellLevel,
      );
      if (projection !== null) {
        out.push(
          buildRollModifierInvocation(
            spell,
            { tag: "prepared" },
            { tag: "spellSlot", slotLevel: slot.spellLevel },
            projection,
          ),
        );
      }
    }
  }
  return out;
}

// The casts below are warranted: RollModifierInvocation is a union whose
// branches are discriminated by which of `skillChoices`/`abilityChoices` is
// non-null and whether `abilityChoiceApplication` is present, rather than by a
// single tag field. TypeScript cannot narrow the spread of `base` plus
// variant-specific fields against that union, so we assert at the point where
// `isD20RollModifierSpellProjection(projection)` has already discriminated
// the projection variant. Matches the original branching in the deleted
// supportedCantripRollModifierSpellProfile / supportedPreparedRollModifier
// SpellProfile predicates one-for-one.
function buildRollModifierInvocation(
  spell: SpellRecord,
  access: RollModifierInvocation["access"],
  resource: RollModifierInvocation["resource"],
  projection: NonNullable<ReturnType<typeof rollModifierSpellProjection>>,
): RollModifierInvocation {
  const base = {
    access,
    resource,
    procedure: "rollModifier" as const,
    spell,
    actionCost: "magicAction" as const,
    targeting: projection.targeting,
    rangeFeet: projection.rangeFeet,
    saveGate: projection.saveGate,
  } as const;
  return isD20RollModifierSpellProjection(projection)
    ? ({
        ...base,
        effect: projection.effect,
        skillChoices: projection.skillChoices,
        abilityChoices: null,
      } as RollModifierInvocation)
    : ({
        ...base,
        effect: projection.effect,
        skillChoices: null,
        abilityChoices: projection.abilityChoices,
        abilityChoiceApplication: projection.abilityChoiceApplication,
      } as RollModifierInvocation);
}

function applyRollModifierEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  selectedEffect: SelectedRollModifierSpellEffect,
): BattleState {
  return applyRollModifierEffectsByTarget(
    state,
    targetIds.map((targetId) => ({ targetId, effect: selectedEffect })),
  );
}

function applyRollModifierEffectsByTarget(
  state: BattleState,
  targetEffects: readonly {
    readonly targetId: CombatantId;
    readonly effect: SelectedRollModifierSpellEffect;
  }[],
): BattleState {
  return targetEffects.reduce((nextState, targetEffect) => {
    const { targetId, effect: selectedEffect } = targetEffect;
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === selectedEffect.kind &&
            effect.sourceSpellId === selectedEffect.sourceSpellId
          ),
      ),
      selectedEffect,
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

function discoverRollModifierCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: RollModifierInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = targetListSpellUsesTargetListHole(invocation)
    ? spellTargetListHole(state, actorId, invocation)
    : spellTargetHole(state, actorId, invocation);
  const initialHoles =
    targetHole.choices.length === 0
      ? []
      : [
          targetHole,
          ...(invocation.skillChoices === null
            ? []
            : [spellRollModifierSkillChoiceHole(invocation)]),
          ...(invocation.abilityChoices === null
            ? []
            : rollModifierUsesTargetAbilityChoices(invocation)
              ? [spellRollModifierTargetAbilityChoicesHole(invocation)]
              : [spellRollModifierAbilityChoiceHole(invocation)]),
        ];
  if (initialHoles.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: rollModifierInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: rollModifierCastSummary(invocation),
      initialHoles,
    },
  ];
}

function rollModifierInvocationRef(
  invocation: RollModifierInvocation,
): SpellInvocationRef {
  return invocation.resource.tag === "none"
    ? {
        tag: "cantrip",
        spellId: spellId(invocation.spell.id),
        procedure: "rollModifier",
      }
    : {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "rollModifier",
      };
}

function rollModifierCastSummary(invocation: RollModifierInvocation): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

function resolveRollModifier(
  input: SpellProcedureProfileResolveInput<RollModifierInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill or ability, and optional Saving Throw fills.",
    );
  }

  const targetSelection = rollModifierSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const effectSelection = rollModifierSpellEffectSelection({
    ...input,
    targetIds: targetSelection.targetIds,
  });
  if (effectSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      effectSelection.hole,
    ]);
  }
  if (effectSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      effectSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
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

  const affectedTargets = rollModifierSpellAffectedTargets(input);
  if (affectedTargets.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      affectedTargets.hole,
    ]);
  }
  if (affectedTargets.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      affectedTargets.message,
    );
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const affectedTargetIds = new Set(affectedTargets.targetIds);
  const effected =
    effectSelection.selection.kind === "sameForTargets"
      ? applyRollModifierEffect(
          concentrationBase,
          affectedTargets.targetIds,
          effectSelection.selection.effect,
        )
      : applyRollModifierEffectsByTarget(
          concentrationBase,
          effectSelection.selection.targetEffects.filter((targetEffect) =>
            affectedTargetIds.has(targetEffect.targetId),
          ),
        );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

const RollModifierInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>
>(
  Schema.Union(
    Schema.Struct({
      ...RollModifierSpellInvocationBaseSchemaFields,
      skillChoices: Schema.NullOr(
        Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
      ),
      abilityChoices: Schema.Literal(null),
      abilityChoiceApplication: Schema.optionalWith(Schema.Never, {
        exact: true,
      }),
    }),
    Schema.Struct({
      ...RollModifierSpellInvocationBaseSchemaFields,
      skillChoices: Schema.Literal(null),
      abilityChoices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_ABILITIES)),
      abilityChoiceApplication: Schema.Literal("single", "perTarget"),
    }),
  ),
);
export const rollModifierProfile: SpellProcedureProfile<
  "rollModifier",
  RollModifierInvocation
> = {
  procedure: "rollModifier",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: KNOWN_WILLING_TARGET_ROLL_MODIFIER_SPELL_IDS,
  admit: admitRollModifier,

  discoverCastAct: discoverRollModifierCastAct,
  castSummary: rollModifierCastSummary,
  invocationRef: rollModifierInvocationRef,
  invocationSchema: RollModifierInvocationSchema,
  resolve: resolveRollModifier,
};
