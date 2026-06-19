// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chosen-damage-resistance
//
// The chosenDamageResistance Spell Procedure Profile: a prepared action spell
// that targets one willing touched creature, accepts a caster-selected damage
// type from the authored spell choices, and records a Concentration-owned
// target-side damage Resistance active effect.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { DamageType, SpellRecord } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type ChosenDamageResistanceSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { maybeOpenInterruptWindow } from "../dispatcher.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-targeting.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import {
  BattleRuntimeObjectSchema,
  DamageTypeSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";

const CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;

type ChosenDamageResistanceResolveInput = SpellProcedureProfileResolveInput<
  ChosenDamageResistanceSpellInvocation,
  ActionSpellBattleResolutionInput
>;

function admitChosenDamageResistance(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ChosenDamageResistanceSpellInvocation[] {
  const projection = chosenDamageResistanceSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly ChosenDamageResistanceSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "chosenDamageResistance",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function chosenDamageResistanceSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  ChosenDamageResistanceSpellInvocation,
  "damageTypeChoices" | "expiresAt" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  if (Either.isLeft(durationTicks)) {
    return null;
  }

  const phase = spell.mechanics.phases[0];
  const selection =
    phase?.kind === "direct" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const damageType =
    effect?.kind === "grant_resistance" ? effect.damageType : null;
  const choice =
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "hole" &&
    typeof damageType.value === "object" &&
    damageType.value.kind === "choice"
      ? damageType.value
      : null;
  const choices =
    choice?.options.filter((option): option is DamageType =>
      Schema.is(DamageTypeSchema)(option),
    ) ?? [];
  if (
    phase?.kind !== "direct" ||
    selection === null ||
    selection.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    effects.length !== 1 ||
    effect?.kind !== "grant_resistance" ||
    effect.sourceFilter !== undefined ||
    choice === null ||
    choices.length !== choice.options.length ||
    !sameStringSet(choices, CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES)
  ) {
    return null;
  }

  return {
    targeting: {
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    },
    damageTypeChoices: choices,
    expiresAt: {
      kind: "concentration",
      combatantId: actorId,
      durationTicks: durationTicks.right,
    },
    rangeFeet: movementFeet(5),
  };
}

function discoverChosenDamageResistanceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ChosenDamageResistanceSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        invocation: chosenDamageResistanceInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: chosenDamageResistanceCastSummary(invocation),
      initialHoles: [targetHole, spellDamageTypeChoiceHole(invocation)],
    },
  ];
}

function chosenDamageResistanceInvocationRef(
  invocation: ChosenDamageResistanceSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "chosenDamageResistance",
  };
}

function chosenDamageResistanceCastSummary(
  invocation: ChosenDamageResistanceSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveChosenDamageResistance(
  input: ChosenDamageResistanceResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.objectContactTargets !== undefined ||
    input.fillSet.objectContactSavingThrowOutcome !== undefined ||
    input.fillSet.objectDropResolution !== undefined ||
    input.fillSet.magicWeaponTargetItem !== undefined ||
    input.fillSet.ongoingSpellTarget !== undefined ||
    input.fillSet.ongoingSpellAbilityChecks.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.remarkableAthleteCriticalHitMovementDecision !== undefined ||
    input.fillSet.remarkableAthleteCriticalHitMovement !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.selfTransformationModeChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.levitateInitialRiseFeet !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.spiritualWeaponForcePosition !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.mirrorImageDuplicateRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.sourceDamageRollPenaltyRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chosen damage Resistance spells use one target fill and one damage type choice.",
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
      "Chosen damage Resistance spell target must be a willing combatant within the selected spell's supported range.",
    );
  }

  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chosen damage Resistance spell damage type must be one of the selected spell's choices.",
    );
  }

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
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
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyChosenDamageResistanceEffect({
    state: concentrationBase,
    actorId: input.actorId,
    targetId: input.fillSet.targetId,
    damageType: input.fillSet.damageTypeChoice.value,
    invocation: input.invocation,
  });
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

function applyChosenDamageResistanceEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageType: DamageType;
  readonly invocation: ChosenDamageResistanceSpellInvocation;
}): BattleState {
  const target = input.state.combatants.get(input.targetId);
  if (target === undefined) {
    return input.state;
  }
  const nextEffect = {
    kind: "damageResistance" as const,
    sourceSpellId: input.invocation.spell.id,
    sourceCombatantId: input.actorId,
    damageType: input.damageType,
    expiresAt: input.invocation.expiresAt,
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "damageResistance" }
  >;
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "damageResistance" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    nextEffect,
  ];
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.targetId, {
      ...target,
      activeEffects,
    }),
  };
}

const ChosenDamageResistanceInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chosenDamageResistance" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("chosenDamageResistance"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    damageTypeChoices: Schema.Array(DamageTypeSchema),
    expiresAt: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);

export const chosenDamageResistanceProfile: SpellProcedureProfile<
  "chosenDamageResistance",
  ChosenDamageResistanceSpellInvocation
> = {
  procedure: "chosenDamageResistance",
  invocationSchema: ChosenDamageResistanceInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitChosenDamageResistance,
  discoverCastAct: discoverChosenDamageResistanceCastAct,
  castSummary: chosenDamageResistanceCastSummary,
  invocationRef: chosenDamageResistanceInvocationRef,
  resolve: resolveChosenDamageResistance,
};
