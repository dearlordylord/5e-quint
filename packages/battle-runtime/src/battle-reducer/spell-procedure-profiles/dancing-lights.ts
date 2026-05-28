// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dancing-lights-movable-dim-light
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE
//
// The Dancing Lights profile family: a Magic Action cantrip cast creates either
// one combined Medium form or one to four separate movable Dim Light emitters,
// and later Bonus Actions reposition the active lights while Concentration
// persists.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Dancing Lights":
//     Action; 120 feet; Concentration up to 1 minute; up to four
//     torch-size lights or one combined Medium form; each sheds Dim Light in a
//     10-foot radius; Bonus Action movement up to 60 feet; each light must be
//     within 20 feet of another light; a light vanishes if it exceeds range.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration,
//     Spell Invocation, Spell Effect, Illumination, and Dim.
//
// What stays in shared infrastructure: the resolver body remains in
// spells-resolve-release.ts because the release resolver owns spell-cast
// Reaction windows, active-effect commit, spell-resource spend, and placement
// validation for held-light and other release-style spells too.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { MovementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET,
  dancingLightsFromEffect,
} from "../spells-active-effects.ts";
import {
  resolveDancingLightsCastSpellAct,
  resolveDancingLightsRepositionSpellAct,
} from "../spells-resolve-release.ts";
import { spellDancingLightsPlacementHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

const DANCING_LIGHTS_RANGE_FEET = 120;
const DANCING_LIGHTS_DURATION_MINUTES = 1;
const DANCING_LIGHTS_REPOSITION_MAX_FEET = 60;
const DANCING_LIGHTS_SPACING_FEET = 20;

type DancingLightsSeparateCastInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "dancingLightsSeparateCast" }
>;
type DancingLightsCombinedCastInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "dancingLightsCombinedCast" }
>;
type DancingLightsRepositionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "dancingLightsReposition" }
>;
type DancingLightsCastInvocation =
  | DancingLightsSeparateCastInvocation
  | DancingLightsCombinedCastInvocation;
type DancingLightsCastResolveInput = SpellProcedureProfileResolveInput<
  DancingLightsCastInvocation,
  ActionSpellBattleResolutionInput
>;
type DancingLightsRepositionResolveInput = SpellProcedureProfileResolveInput<
  DancingLightsRepositionInvocation,
  BonusActionSpellBattleResolutionInput
>;

function admitDancingLightsSeparateCast(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DancingLightsSeparateCastInvocation[] {
  const profile = dancingLightsSpell(spell);
  return profile === null
    ? []
    : [
        {
          ...dancingLightsCantripBase(spell, profile),
          procedure: "dancingLightsSeparateCast",
          actionCost: "magicAction",
          form: "separateLights",
          expiresAt: {
            kind: "concentration",
            combatantId: ctx.actor.combatantId,
            durationTicks: profile.durationTicks,
          },
        },
      ];
}

function admitDancingLightsCombinedCast(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DancingLightsCombinedCastInvocation[] {
  const profile = dancingLightsSpell(spell);
  return profile === null
    ? []
    : [
        {
          ...dancingLightsCantripBase(spell, profile),
          procedure: "dancingLightsCombinedCast",
          actionCost: "magicAction",
          form: "combinedMediumForm",
          expiresAt: {
            kind: "concentration",
            combatantId: ctx.actor.combatantId,
            durationTicks: profile.durationTicks,
          },
        },
      ];
}

function admitDancingLightsReposition(
  spell: SpellRecord,
  _ctx: SpellAdmissionContext,
): readonly DancingLightsRepositionInvocation[] {
  const profile = dancingLightsSpell(spell);
  return profile === null
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "dancingLightsReposition",
          spell,
          actionCost: "bonusAction",
          maxMoveFeet: profile.maxMoveFeet,
          rangeFeet: profile.rangeFeet,
          spacingFeet: profile.spacingFeet,
        },
      ];
}

function dancingLightsCantripBase(
  spell: SpellRecord,
  profile: DancingLightsSpellProfile,
) {
  return {
    access: { tag: "classCantrip" as const },
    resource: { tag: "none" as const },
    spell,
    dimRadiusFeet: profile.dimRadiusFeet,
    rangeFeet: profile.rangeFeet,
    maxMoveFeet: profile.maxMoveFeet,
    spacingFeet: profile.spacingFeet,
  };
}

type DancingLightsSpellProfile = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly dimRadiusFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
  readonly maxMoveFeet: MovementFeet;
  readonly spacingFeet: MovementFeet;
};

function dancingLightsSpell(
  spell: SpellRecord,
): DancingLightsSpellProfile | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== DANCING_LIGHTS_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== DANCING_LIGHTS_DURATION_MINUTES
  ) {
    return null;
  }
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );
  if (
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !== 0 ||
    lightOperation.effect.dimAdditionalFeet !==
      Number(DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !== DANCING_LIGHTS_REPOSITION_MAX_FEET
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Either.isLeft(durationTicks)
    ? null
    : {
        durationTicks: durationTicks.right,
        dimRadiusFeet: DANCING_LIGHTS_DIM_LIGHT_RADIUS_FEET,
        rangeFeet: movementFeet(spell.mechanics.range.feet),
        maxMoveFeet: movementFeet(repositionOperation.effect.maxMoveFeet),
        spacingFeet: movementFeet(DANCING_LIGHTS_SPACING_FEET),
      };
}

function discoverDancingLightsCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: DancingLightsCastInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: dancingLightsCastInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: dancingLightsCastSummary(invocation),
      initialHoles: [
        spellDancingLightsPlacementHole(invocation, invocation.form, []),
      ],
    },
  ];
}

function discoverDancingLightsRepositionAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: DancingLightsRepositionInvocation,
): readonly AvailableBattleAct[] {
  const activeEffect = activeDancingLightsEffect(state, actorId, invocation);
  return activeEffect === undefined
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell",
            actorId,
            invocation: dancingLightsRepositionInvocationRef(invocation),
            mode: { tag: "cast" },
          },
          label: `${invocation.spell.name} movement`,
          summary: dancingLightsRepositionCastSummary(invocation),
          initialHoles: [
            spellDancingLightsPlacementHole(
              invocation,
              activeEffect.form,
              dancingLightsFromEffect(activeEffect).map(
                (light) => light.lightId,
              ),
            ),
          ],
        },
      ];
}

function activeDancingLightsEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: DancingLightsRepositionInvocation,
):
  | Extract<BattleActiveEffect, { readonly kind: "dancingLights" }>
  | undefined {
  return state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "dancingLights" }
      > =>
        effect.kind === "dancingLights" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actorId,
    );
}

function dancingLightsCastInvocationRef(
  invocation: DancingLightsCastInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: invocation.procedure,
  };
}

function dancingLightsRepositionInvocationRef(
  invocation: DancingLightsRepositionInvocation,
): SpellInvocationRef {
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "dancingLightsReposition",
  };
}

function dancingLightsCastSummary(invocation: DancingLightsCastInvocation) {
  return `Cast ${invocation.spell.name} as a cantrip.`;
}

function dancingLightsRepositionCastSummary(
  invocation: DancingLightsRepositionInvocation,
) {
  return `Move ${invocation.spell.name} with a Bonus Action.`;
}

function resolveDancingLightsCast(
  input: DancingLightsCastResolveInput,
): BattleResolutionResult {
  return resolveDancingLightsCastSpellAct(input);
}

function resolveDancingLightsReposition(
  input: DancingLightsRepositionResolveInput,
): BattleResolutionResult {
  return resolveDancingLightsRepositionSpellAct(input);
}

export const dancingLightsSeparateCastProfile: SpellProcedureProfile<
  "dancingLightsSeparateCast",
  DancingLightsSeparateCastInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "dancingLightsSeparateCast",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDancingLightsSeparateCast,
  discoverCastAct: discoverDancingLightsCastAct,
  castSummary: dancingLightsCastSummary,
  invocationRef: dancingLightsCastInvocationRef,
  resolve: resolveDancingLightsCast,
};

export const dancingLightsCombinedCastProfile: SpellProcedureProfile<
  "dancingLightsCombinedCast",
  DancingLightsCombinedCastInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "dancingLightsCombinedCast",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDancingLightsCombinedCast,
  discoverCastAct: discoverDancingLightsCastAct,
  castSummary: dancingLightsCastSummary,
  invocationRef: dancingLightsCastInvocationRef,
  resolve: resolveDancingLightsCast,
};

export const dancingLightsRepositionProfile: SpellProcedureProfile<
  "dancingLightsReposition",
  DancingLightsRepositionInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "dancingLightsReposition",
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDancingLightsReposition,
  discoverCastAct: discoverDancingLightsRepositionAct,
  castSummary: dancingLightsRepositionCastSummary,
  invocationRef: dancingLightsRepositionInvocationRef,
  resolve: resolveDancingLightsReposition,
};
