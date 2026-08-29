import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-dancing-lights-movable-dim-light
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOVABLE_LIGHT_EMITTER_LIFECYCLE
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
// interrupt checkpoints, active-effect commit, spell-resource spend, and placement
// validation for held-light and other release-style spells too.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { MovementFeet, movementFeet } from "@dnd/shared/types";
import { Match, Result } from "effect";

import {
  type BattleActDiscoveryCandidate,
  type ActionSpellBattleResolutionInput,
  type BattleExecutableSpellInvocation,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import {
  MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET,
  movableLightFromEffect,
} from "../spells-active-effects.ts";
import {
  resolveMovableLightCastSpellAct,
  resolveMovableLightRepositionSpellAct,
} from "../spells-resolve-release.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellMovableLightPlacementHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const MovableLightExpirationSchema = Schema.Struct({
  kind: Schema.Literal("concentration"),
  combatantId: CombatantId,
  durationTicks: ElapsedTimeTicksSchema,
});

const MOVABLE_LIGHT_RANGE_FEET = 120;
const MOVABLE_LIGHT_DURATION_MINUTES = 1;
const MOVABLE_LIGHT_REPOSITION_MAX_FEET = 60;
const MOVABLE_LIGHT_SPACING_FEET = 20;

type MovableLightSeparateCastInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
    readonly form: "separateLights";
  }
>;
type MovableLightCombinedCastInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "create";
    readonly form: "combinedMediumForm";
  }
>;
type MovableLightRepositionInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "movableLightManifestation";
    readonly operation: "reposition";
  }
>;
type MovableLightCastInvocation =
  | MovableLightSeparateCastInvocation
  | MovableLightCombinedCastInvocation;
type MovableLightCastResolveInput =
  SpellProcedureProfileResolveInput<MovableLightCastInvocation>;
type MovableLightRepositionResolveInput =
  SpellProcedureProfileResolveInput<MovableLightRepositionInvocation>;
type ExecutableMovableLightManifestationInvocation = Extract<
  BattleExecutableSpellInvocation,
  { readonly procedure: "movableLightManifestation" }
>;
type ExecutableMovableLightCastInvocation = Extract<
  ExecutableMovableLightManifestationInvocation,
  { readonly operation: "create" }
>;
type ExecutableMovableLightRepositionInvocation = Extract<
  ExecutableMovableLightManifestationInvocation,
  { readonly operation: "reposition" }
>;

function admitMovableLightSeparateCast(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MovableLightSeparateCastInvocation[] {
  const profile = movableLightSpell(spell);
  return profile === null
    ? []
    : [
        {
          ...movableLightCantripBase(spell, profile),
          procedure: "movableLightManifestation",
          operation: "create",
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

function admitMovableLightCombinedCast(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MovableLightCombinedCastInvocation[] {
  const profile = movableLightSpell(spell);
  return profile === null
    ? []
    : [
        {
          ...movableLightCantripBase(spell, profile),
          procedure: "movableLightManifestation",
          operation: "create",
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

function movableLightCantripBase(
  spell: BattleSpellAdmissionSource,
  profile: MovableLightSpellProfile,
) {
  return {
    access: cantripSpellAccessFor(spell.castingSource),
    resource: { tag: "none" as const },
    spell,
    dimRadiusFeet: profile.dimRadiusFeet,
    rangeFeet: profile.rangeFeet,
    maxMoveFeet: profile.maxMoveFeet,
    spacingFeet: profile.spacingFeet,
  };
}

type MovableLightSpellProfile = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly dimRadiusFeet: MovementFeet;
  readonly rangeFeet: MovementFeet;
  readonly maxMoveFeet: MovementFeet;
  readonly spacingFeet: MovementFeet;
};

function movableLightSpell(
  spell: BattleSpellAdmissionSource,
): MovableLightSpellProfile | null {
  if (
    spell.mechanics.family !== "ongoing_effect" ||
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== MOVABLE_LIGHT_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== MOVABLE_LIGHT_DURATION_MINUTES
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
      Number(MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !== MOVABLE_LIGHT_REPOSITION_MAX_FEET
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  return Result.isFailure(durationTicks)
    ? null
    : {
        durationTicks: durationTicks.success,
        dimRadiusFeet: MOVABLE_LIGHT_DIM_LIGHT_RADIUS_FEET,
        rangeFeet: movementFeet(spell.mechanics.range.feet),
        maxMoveFeet: movementFeet(repositionOperation.effect.maxMoveFeet),
        spacingFeet: movementFeet(MOVABLE_LIGHT_SPACING_FEET),
      };
}

function discoverMovableLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightManifestationInvocation,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.operation !== "create") return [];
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [
        spellMovableLightPlacementHole(invocation, invocation.form, []),
      ],
    },
  ];
}

function discoverMovableLightRepositionAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightManifestationInvocation,
): readonly BattleActDiscoveryCandidate[] {
  if (invocation.operation !== "reposition") return [];
  const activeEffect = activeMovableLightEffect(state, actorId, invocation);
  return activeEffect === undefined
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [
            spellMovableLightPlacementHole(
              invocation,
              activeEffect.form,
              movableLightFromEffect(activeEffect).map(
                (light) => light.lightId,
              ),
            ),
          ],
        },
      ];
}

function activeMovableLightEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: ExecutableMovableLightRepositionInvocation,
):
  | Extract<BattleActiveEffect, { readonly kind: "movableLightManifestation" }>
  | undefined {
  return state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "movableLightManifestation" }
      > =>
        effect.kind === "movableLightManifestation" &&
        effect.effectRef === invocation.activeEffectRef &&
        effect.sourceProcedureRef ===
          invocation.sourceManifestationProcedureRef &&
        effect.sourceCombatantId === actorId,
    );
}

function resolveMovableLightCast(
  input: MovableLightCastResolveInput,
): BattleResolutionResult {
  if (
    input.invocation.operation !== "create" ||
    input.input.subject.tag !== "actionSpell"
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Movable-light creation is no longer available.",
    );
  }
  return resolveMovableLightCastSpellAct({
    ...input,
    input: input.input as ActionSpellBattleResolutionInput,
    invocation: input.invocation as ExecutableMovableLightCastInvocation,
  });
}

function resolveMovableLightReposition(
  input: MovableLightRepositionResolveInput,
): BattleResolutionResult {
  if (
    input.invocation.operation !== "reposition" ||
    input.input.subject.tag !== "bonusActionSpell"
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Movable-light reposition is no longer available.",
    );
  }
  return resolveMovableLightRepositionSpellAct({
    ...input,
    input: input.input as BonusActionSpellBattleResolutionInput,
    invocation: input.invocation as ExecutableMovableLightRepositionInvocation,
  });
}

const MovableLightSeparateCastInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("create"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    form: Schema.Literal("separateLights"),
    dimRadiusFeet: MovementFeet,
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    expiresAt: MovableLightExpirationSchema,
  }),
);

const MovableLightCombinedCastInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("create"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    form: Schema.Literal("combinedMediumForm"),
    dimRadiusFeet: MovementFeet,
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    expiresAt: MovableLightExpirationSchema,
  }),
);

const MovableLightRepositionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: CantripSpellAccessSchema,
    resource: NoSpellInvocationResourceSchema,
    procedure: Schema.Literal("movableLightManifestation"),
    operation: Schema.Literal("reposition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffectRef: BattleEffectExecutionRef,
    sourceManifestationProcedureRef: BattleProcedureExecutionRef,
    maxMoveFeet: MovementFeet,
    rangeFeet: MovementFeet,
    spacingFeet: MovementFeet,
  }),
);
export const movableLightManifestationProfile = {
  procedure: "movableLightManifestation",
  executionSchema: Schema.Union([
    MovableLightSeparateCastInvocationSchema,
    MovableLightCombinedCastInvocationSchema,
    MovableLightRepositionInvocationSchema,
  ]),
  admit: (spell, context) => [
    ...admitMovableLightSeparateCast(spell, context),
    ...admitMovableLightCombinedCast(spell, context),
  ],
  discoverCastAct: (state, actorId, invocation) =>
    Match.value(invocation).pipe(
      Match.when({ operation: "create" }, (createInvocation) =>
        discoverMovableLightCastAct(state, actorId, createInvocation),
      ),
      Match.when({ operation: "reposition" }, (repositionInvocation) =>
        discoverMovableLightRepositionAct(state, actorId, repositionInvocation),
      ),
      Match.exhaustive,
    ),
  resolve: (input) =>
    Match.value(input.invocation).pipe(
      Match.when({ operation: "create" }, (invocation) =>
        resolveMovableLightCast({ ...input, invocation }),
      ),
      Match.when({ operation: "reposition" }, (invocation) =>
        resolveMovableLightReposition({ ...input, invocation }),
      ),
      Match.exhaustive,
    ),
} satisfies SpellProcedureDeclaration<
  "movableLightManifestation",
  | MovableLightSeparateCastInvocation
  | MovableLightCombinedCastInvocation
  | MovableLightRepositionInvocation
>;
