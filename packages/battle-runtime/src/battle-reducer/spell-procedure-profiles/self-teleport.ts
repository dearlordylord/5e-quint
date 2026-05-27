// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-teleport
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE
//
// The selfTeleport Spell Procedure Profile: a prepared Bonus Action spell that
// requires a caller-supplied table destination witness and emits a teleport
// outcome rather than spending Movement.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Misty Step": Bonus Action, Self, Instantaneous;
//     teleport up to 30 feet to an unoccupied space the caster can see.
//   - SRD 5.2.1 Rules Glossary "Teleportation": teleportation does not expend
//     Movement, never provokes Opportunity Attacks, and transports worn and
//     carried equipment.
//   - SRD 5.2.1 Playing the Game "Bonus Actions" and "Opportunity Attacks":
//     one Bonus Action on a turn, and teleportation avoids Opportunity Attacks.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Slot, Movement, Opportunity
//     Attack, and Teleportation.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type AvailableBattleAct,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleTeleportDestination,
  type BattleTeleportDestinationFact,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import {
  spellTeleportDestinationHole,
  spellTeleportDestinationHoleId,
} from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type SelfTeleportInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "selfTeleport" }
>;
type SelfTeleportResolveInput = SpellProcedureProfileResolveInput<
  SelfTeleportInvocation,
  BonusActionSpellBattleResolutionInput
>;

function admitSelfTeleport(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SelfTeleportInvocation[] {
  const projection = selfTeleportSpellProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SelfTeleportInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "selfTeleport",
              spell,
              actionCost: "bonusAction",
              ...projection,
            },
          ],
  );
}

function selfTeleportSpellProjection(
  spell: SpellRecord,
): Pick<SelfTeleportInvocation, "maxDistanceFeet"> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects?.length !== 1 ||
    effect?.kind !== "teleport" ||
    effect.destination !== "unoccupied_visible_space" ||
    effect.maxFeet !== 30
  ) {
    return null;
  }
  return { maxDistanceFeet: movementFeet(effect.maxFeet) };
}

function discoverSelfTeleportCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: SelfTeleportInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "bonusActionSpell" as const,
        actorId,
        invocation: selfTeleportInvocationRef(invocation),
        mode: { tag: "cast" as const },
      },
      label: invocation.spell.name,
      summary: selfTeleportCastSummary(invocation),
      initialHoles: [spellTeleportDestinationHole(invocation, actorId)],
    },
  ];
}

function selfTeleportInvocationRef(
  invocation: SelfTeleportInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "selfTeleport",
  };
}

function selfTeleportCastSummary(invocation: SelfTeleportInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot and teleport to a caller-supplied unoccupied visible destination within ${invocation.maxDistanceFeet} feet.`;
}

function resolveSelfTeleport(
  input: SelfTeleportResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Self-teleport spells use a teleport-destination fill only.",
    );
  }

  if (input.fillSet.teleportDestination === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTeleportDestinationHole(input.invocation, input.actorId),
    ]);
  }
  const destinationFill = input.fillSet.teleportDestination;
  const destination = destinationFill.value;
  const validation = validateSelfTeleportDestination(
    input.invocation,
    input.actorId,
    destinationFill,
    destination,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
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

  const resourced = spendSpellCastResources({
    state: input.input.state,
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
        teleports: [
          {
            kind: "selfTeleport",
            actorId: input.actorId,
            sourceSpellId: spellId(input.invocation.spell.id),
            destination: selfTeleportOutcomeDestination(destination),
            spendsMovement: false,
            provokesOpportunityAttacks: false,
            transportsWornAndCarriedEquipment: true,
          },
        ],
      };
}

function selfTeleportOutcomeDestination(
  destination: BattleTeleportDestinationFact,
): BattleTeleportDestination {
  return {
    kind: destination.kind,
    destinationId: destination.destinationId,
    distanceFeet: destination.distanceFeet,
  };
}

function validateSelfTeleportDestination(
  invocation: SelfTeleportInvocation,
  actorId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "teleportDestination" }>,
  destination: BattleTeleportDestinationFact,
): string | null {
  if (fill.holeId !== spellTeleportDestinationHoleId(invocation, actorId)) {
    return "Teleport destination must use the selected spell act destination hole.";
  }
  if (destination.actorId !== actorId) {
    return "Teleport destination table fact must match the caster.";
  }
  if (destination.spellId !== spellId(invocation.spell.id)) {
    return "Teleport destination table fact must match the spell.";
  }
  if (destination.distanceFeet <= 0) {
    return "Teleport destination must be more than 0 feet away.";
  }
  if (destination.distanceFeet > invocation.maxDistanceFeet) {
    return `${invocation.spell.name} destination must be within ${invocation.maxDistanceFeet} feet.`;
  }
  return null;
}

export const selfTeleportProfile = {
  procedure: "selfTeleport",
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSelfTeleport,
  discoverCastAct: discoverSelfTeleportCastAct,
  castSummary: selfTeleportCastSummary,
  invocationRef: selfTeleportInvocationRef,
  resolve: resolveSelfTeleport,
} satisfies SpellProcedureProfile<
  "selfTeleport",
  SelfTeleportInvocation,
  BonusActionSpellBattleResolutionInput
>;
