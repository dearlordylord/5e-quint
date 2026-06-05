// UNIT-PROFILE-COVERAGE: runtime-owner spell.creature-type-protection-and-charm
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
//
// The creatureTypeProtection Spell Procedure Profile: a prepared action spell
// that gives one touched willing creature protection against scoped Creature
// Types for attack rolls, Charmed/Frightened application, possession attempts,
// and relevant-effect repeat saves.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CreatureTypeProtectionSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import {
  PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
  PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
} from "../domain-constants.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import {
  scalarBuffActiveEffectExpiration,
  sameCreatureTypeSet,
} from "../spells-profiles-support.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import type { SupportedSpellInvocation } from "../../battle-reducer.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type CreatureTypeProtectionTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitCreatureTypeProtection(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly CreatureTypeProtectionSpellInvocation[] {
  const projection = creatureTypeProtectionSpellProjection(
    ctx.actor.combatantId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly CreatureTypeProtectionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "creatureTypeProtection",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function creatureTypeProtectionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  CreatureTypeProtectionSpellInvocation,
  "activeEffect" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const effect = effects[0];
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    effects.length !== 1 ||
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "disadvantage" ||
    effect.on.length !== 1 ||
    effect.on[0] !== "attack_roll" ||
    effect.attackerTypeFilter === undefined ||
    !sameCreatureTypeSet(
      effect.attackerTypeFilter,
      PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
    ) ||
    expiresAt === null
  ) {
    return null;
  }

  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    activeEffect: {
      kind: "creatureTypeProtection",
      sourceSpellId: spell.id,
      sourceCombatantId: actorId,
      attackRollMode: "disadvantage",
      protectedAgainstCreatureTypes: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_CREATURE_TYPES,
      ],
      preventedConditions: [
        ...PROTECTION_FROM_EVIL_AND_GOOD_PREVENTED_CONDITIONS,
      ],
      preventsPossession: true,
      expiresAt,
    },
    rangeFeet: movementFeet(5),
  };
}

function discoverCreatureTypeProtectionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: CreatureTypeProtectionSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: creatureTypeProtectionInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: creatureTypeProtectionCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function creatureTypeProtectionInvocationRef(
  invocation: CreatureTypeProtectionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "creatureTypeProtection",
  };
}

function creatureTypeProtectionCastSummary(
  invocation: CreatureTypeProtectionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveCreatureTypeProtection(
  input: SpellProcedureProfileResolveInput<
    CreatureTypeProtectionSpellInvocation,
    ActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  }

  const targetSelection = creatureTypeProtectionSpellTargetSelection(input);
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

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
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
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyCreatureTypeProtectionEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
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

function creatureTypeProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: CreatureTypeProtectionSpellInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): CreatureTypeProtectionTargetSelection {
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Creature-type protection spells require one target choice.",
    };
  }
  if (input.fillSet.targetId === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetHole(input.input.state, input.actorId, input.invocation),
    };
  }
  return spellTargetIsLegal(
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  )
    ? { tag: "ok", targetIds: [input.fillSet.targetId] }
    : {
        tag: "invalid",
        message:
          "Creature-type protection spell target must be a combatant within the selected spell's supported range.",
      };
}

function applyCreatureTypeProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: CreatureTypeProtectionSpellInvocation,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffect = {
      ...invocation.activeEffect,
      sourceCombatantId: actorId,
    };
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "creatureTypeProtection" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      nextEffect,
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

const CreatureTypeProtectionInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("creatureTypeProtection"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    activeEffect: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
  }),
);
export const creatureTypeProtectionProfile: SpellProcedureProfile<
  "creatureTypeProtection",
  CreatureTypeProtectionSpellInvocation
> = {
  procedure: "creatureTypeProtection",
  invocationSchema: CreatureTypeProtectionInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitCreatureTypeProtection,
  discoverCastAct: discoverCreatureTypeProtectionCastAct,
  castSummary: creatureTypeProtectionCastSummary,
  invocationRef: creatureTypeProtectionInvocationRef,
  resolve: resolveCreatureTypeProtection,
};
