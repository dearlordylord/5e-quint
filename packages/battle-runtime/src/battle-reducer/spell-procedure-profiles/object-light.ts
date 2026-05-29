// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-light
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE
//
// The objectLight Spell Procedure Profile: an action spell that attaches a
// Bright Light and Dim Light emitter to a touched object.
//
// What lives here:
//   - admit()           - was supportedCantripObjectLightSpellProfile and
//                         supportedPreparedObjectLightSpellProfile in
//                         spells-profiles.ts
//   - discoverCastAct() - was the objectLight branch in spells-discovery.ts
//   - castSummary()     - was the objectLight branch in spells-discovery.ts
//   - invocationRef()   - was the objectLight branch in
//                         spells-invocation-ref.ts
//   - resolve()         - was resolveObjectLightSpellAct in
//                         spells-resolve-release.ts
//   - applyEffect()     - was applyObjectLightSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - spellObjectLightTargetFact and spellObjectTargetHole stay in
//     spells-targeting.ts until target legality and hole dispatch migrate.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  battleSpellEffectOccurrenceId,
  spellId,
  type BattleObjectId,
  type CombatantId,
} from "../../identity.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../../character-battle-resources.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spellInvocationEffectiveSpellLevel } from "../spells-effective-level.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellObjectLightTargetFact,
  spellObjectTargetHole,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SizeSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const LIGHT_OBJECT_MAX_SIZE = "large" as const;

type ActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];
type LightCantripObjectLightDirectPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
> & {
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "object";
      readonly count: 1;
      readonly filter: {
        readonly targetRelation: "not_worn_or_carried";
        readonly maxSize: typeof LIGHT_OBJECT_MAX_SIZE;
      };
    };
  };
};
type TouchedObjectLightDirectPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
> & {
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "object";
      readonly count: 1;
      readonly filter?: undefined;
    };
  };
};

type ObjectLightInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectLight" }
>;

function isLightObjectSpell(spell: SpellRecord): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "activation" }
  >;
} {
  const earlyEnd =
    spell.mechanics.duration.kind === "timed"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 0 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "timed" &&
    spell.mechanics.duration.value.unit === "hour" &&
    spell.mechanics.duration.value.amount === 1 &&
    earlyEnd.length === 1 &&
    earlyEnd[0]?.kind === "caster_recasts_spell"
  );
}

function isObjectLightDirectPhase(
  phase: ActivationPhase,
): phase is LightCantripObjectLightDirectPhase {
  return (
    phase.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "object" &&
    phase.attachment.value.count === 1 &&
    phase.attachment.value.filter?.targetRelation === "not_worn_or_carried" &&
    phase.attachment.value.filter?.maxSize === LIGHT_OBJECT_MAX_SIZE &&
    phase.effects?.some((effect) => effect.kind === "emit_light") === true
  );
}

function admitCantripObjectLight(
  spell: SpellRecord,
): readonly ObjectLightInvocation[] {
  if (!isLightObjectSpell(spell)) {
    return [];
  }
  const lightPhase = spell.mechanics.phases.find(isObjectLightDirectPhase);
  const maxObjectSize = lightPhase?.attachment.value.filter?.maxSize;
  const lightEffects =
    lightPhase === undefined || !("effects" in lightPhase)
      ? undefined
      : lightPhase.effects;
  const lightEffect = lightEffects?.find(
    (effect) => effect.kind === "emit_light",
  );
  if (
    lightEffect === undefined ||
    lightEffect.kind !== "emit_light" ||
    maxObjectSize === undefined ||
    lightEffect.brightRadiusFeet !== 20 ||
    lightEffect.dimAdditionalFeet !== 20
  ) {
    return [];
  }
  const duration = spell.mechanics.duration;
  if (duration.kind !== "timed") {
    return [];
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(duration.value);
  return Either.isLeft(durationTicks)
    ? []
    : [
        {
          access: { tag: "classCantrip" },
          resource: { tag: "none" },
          procedure: "objectLight",
          spell,
          actionCost: "magicAction",
          targeting: {
            kind: "singleObject",
            object: {
              kind: "lightCantripObject",
              maxSize: maxObjectSize,
            },
          },
          light: {
            kind: "brightAndDim",
            brightRadiusFeet: movementFeet(lightEffect.brightRadiusFeet),
            dimAdditionalFeet: movementFeet(lightEffect.dimAdditionalFeet),
          },
          expiresAt: { kind: "duration", durationTicks: durationTicks.right },
        },
      ];
}

function isContinualFlameObjectSpell(
  spell: SpellRecord,
): spell is SpellRecord & {
  readonly mechanics: Extract<
    SpellRecord["mechanics"],
    { family: "activation" }
  >;
} {
  const components = spell.mechanics.components;
  const endsOn =
    spell.mechanics.duration.kind === "permanent"
      ? (spell.mechanics.duration.endsOn ?? [])
      : [];
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.level === 2 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.range.kind === "touch" &&
    spell.mechanics.duration.kind === "permanent" &&
    endsOn.length === 1 &&
    endsOn[0] === "dispel" &&
    components.v === true &&
    components.s === true &&
    components.m !== false &&
    "materialConsumed" in components &&
    components.materialConsumed === true &&
    "materialCostGp" in components &&
    components.materialCostGp === 50
  );
}

function isTouchedObjectLightDirectPhase(
  phase: ActivationPhase,
): phase is TouchedObjectLightDirectPhase {
  return (
    phase.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "object" &&
    phase.attachment.value.count === 1 &&
    phase.attachment.value.filter === undefined &&
    phase.effects?.some((effect) => effect.kind === "emit_light") === true
  );
}

function admitPreparedObjectLight(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly ObjectLightInvocation[] {
  if (!isContinualFlameObjectSpell(spell)) {
    return [];
  }
  const lightPhase = spell.mechanics.phases.find(
    isTouchedObjectLightDirectPhase,
  );
  const lightEffects =
    lightPhase === undefined || !("effects" in lightPhase)
      ? undefined
      : lightPhase.effects;
  const lightEffect = lightEffects?.find(
    (effect) => effect.kind === "emit_light",
  );
  const brightRadiusFeet = lightEffect?.brightRadiusFeet;
  const dimAdditionalFeet = lightEffect?.dimAdditionalFeet;
  if (
    lightEffect === undefined ||
    lightEffect.kind !== "emit_light" ||
    brightRadiusFeet !== 20 ||
    dimAdditionalFeet !== 20
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly ObjectLightInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "objectLight",
            spell,
            actionCost: "magicAction",
            targeting: {
              kind: "singleObject",
              object: { kind: "touchedObject" },
            },
            light: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(brightRadiusFeet),
              dimAdditionalFeet: movementFeet(dimAdditionalFeet),
            },
            expiresAt: { kind: "untilDispelled" },
          },
        ],
  );
}

function admitObjectLight(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ObjectLightInvocation[] {
  return [
    ...admitCantripObjectLight(spell),
    ...admitPreparedObjectLight(
      spell,
      ctx.actor.origin.spellcasting.spellSlots,
    ),
  ];
}

function discoverObjectLightCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: ObjectLightInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: objectLightInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: objectLightCastSummary(invocation),
      initialHoles: [spellObjectTargetHole(invocation)],
    },
  ];
}

function objectLightInvocationRef(
  invocation: ObjectLightInvocation,
): SpellInvocationRef {
  if (invocation.resource.tag === "spellSlot") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "objectLight",
    };
  }
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: "objectLight",
  };
}

function objectLightCastSummary(invocation: ObjectLightInvocation): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

function applyObjectLightEffect(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: ObjectLightInvocation,
): BattleState {
  const retainedEmitters =
    invocation.targeting.object.kind === "lightCantripObject"
      ? state.lightEmitters.filter(
          (emitter) =>
            !(
              emitter.sourceSpellId === invocation.spell.id &&
              emitter.sourceCombatantId === actorId
            ),
        )
      : state.lightEmitters;
  return {
    ...state,
    lightEmitters: [
      ...retainedEmitters,
      {
        kind: "spellLightEmitter",
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        sourceEffectId: objectLightSpellEffectOccurrenceId(
          state,
          actorId,
          objectId,
          invocation,
        ),
        sourceSpellLevel: spellInvocationEffectiveSpellLevel(invocation),
        attachment: { kind: "object", objectId },
        emission: invocation.light,
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: invocation.expiresAt,
      },
    ],
  };
}

function objectLightSpellEffectOccurrenceId(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: ObjectLightInvocation,
) {
  const prefix = `${actorId}:${invocation.spell.id}:${objectId}:object-light:`;
  const nextOrdinal =
    Math.max(
      0,
      ...state.lightEmitters.flatMap((emitter) => {
        if (
          emitter.kind !== "spellLightEmitter" ||
          !("sourceEffectId" in emitter) ||
          !emitter.sourceEffectId.startsWith(prefix)
        ) {
          return [];
        }
        const ordinal = Number(emitter.sourceEffectId.slice(prefix.length));
        return Number.isInteger(ordinal) && ordinal > 0 ? [ordinal] : [];
      }),
    ) + 1;
  return battleSpellEffectOccurrenceId(`${prefix}${nextOrdinal}`);
}

function resolveObjectLight(
  input: SpellProcedureProfileResolveInput<ObjectLightInvocation>,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object light spells use only an object target fill.",
    );
  }
  if (input.fillSet.objectTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectTargetHole(input.invocation),
    ]);
  }
  const objectTarget = input.fillSet.objectTarget;
  const lightFact = spellObjectLightTargetFact(
    objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof objectTarget.spatialFacts)[number],
        {
          readonly kind: "spellObjectLightTarget" | "spellTouchedObjectTarget";
        }
      > =>
        fact.kind === "spellObjectLightTarget" ||
        fact.kind === "spellTouchedObjectTarget",
    ),
    input.actorId,
    objectTarget.objectId,
    input.invocation,
  );
  if (lightFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object light target does not satisfy the selected spell's object targeting requirements.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
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

  const effected = applyObjectLightEffect(
    input.input.state,
    input.actorId,
    objectTarget.objectId,
    input.invocation,
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

const ObjectLightInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "objectLight" }>
>(
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("objectLight"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleObject"),
        object: Schema.Struct({
          kind: Schema.Literal("lightCantripObject"),
          maxSize: SizeSchema,
        }),
      }),
      light: Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("objectLight"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleObject"),
        object: Schema.Struct({
          kind: Schema.Literal("touchedObject"),
        }),
      }),
      light: Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleRuntimeObjectSchema,
    }),
  ),
);
export const objectLightProfile: SpellProcedureProfile<
  "objectLight",
  ObjectLightInvocation
> = {
  procedure: "objectLight",
  invocationSchema: ObjectLightInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitObjectLight,
  discoverCastAct: discoverObjectLightCastAct,
  castSummary: objectLightCastSummary,
  invocationRef: objectLightInvocationRef,
  resolve: resolveObjectLight,
};
