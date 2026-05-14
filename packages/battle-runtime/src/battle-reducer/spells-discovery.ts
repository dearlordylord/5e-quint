// Spell discovery (Cluster K). Mechanical extraction from battle-reducer.ts.
// Discovers per-actor SupportedSpellInvocation acts, computes cast-summary
// strings, classifies invocations, and synthesises the optional readied-spell
// variant for each cast act.
//
// Dependencies on profile predicates (cluster O) and hole/fill helpers
// (cluster P) currently round-trip through `../battle-reducer.ts`; they will
// be retargeted after Pass 11/12 land. Likewise `reactionTriggerLabel` and
// `activeOngoingFeaturesPreventSpellcasting` stay in `../battle-reducer.ts`
// pending the dispatcher merge (Pass 19, cycle #25).

import type { SpellRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import { BATTLE_READIED_SPELL_TRIGGERS } from "../battle-reaction-triggers.ts";
import {
  activeOngoingFeaturesPreventSpellcasting,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  reactionTriggerLabel,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleState,
  type ReadiedSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import {
  scalarBuffInitialHoles,
  commandOptionChoiceHole,
  spellDamageTypeChoiceHole,
  spellBeamObjectTargetHole,
  spellBeamTargetHole,
  spellObjectTargetHole,
  spellRollModifierSkillChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellTargetAllocationHole,
  spellTargetHole,
  spellTargetListHole,
  supportedSpellInvocationRef,
} from "./spells-holes-fills.ts";
import { attackTargetHole } from "./hole-helpers.ts";

export function discoverSupportedSpellInvocations(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  const spellcastingPrevented = activeOngoingFeaturesPreventSpellcasting(actor);
  return supportedSpellActs(actor).flatMap(
    (invocation): readonly AvailableBattleAct[] => {
      if (invocation.procedure === "shieldReaction") {
        return [];
      }
      if (invocation.spell.mechanics.family === "triggered_reaction") {
        return [];
      }
      if (spellcastingPrevented && spellInvocationIsSpellcasting(invocation)) {
        return [];
      }
      if (!spellHasAvailableSpend(actor, invocation)) {
        return [];
      }
      if (!spellInvocationCasterPrerequisiteIsMet(actor, invocation)) {
        return [];
      }
      if (
        !spellActTurnResourceAvailable(state.currentTurnResources, invocation)
      ) {
        return [];
      }
      if (invocation.procedure === "command") {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "actionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: `${spellActivationInvocationCastSummary(invocation)} Failed targets follow the selected command on their next turns.`,
                initialHoles: [targetHole, commandOptionChoiceHole(invocation)],
              },
            ];
      }
      if (
        invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage" ||
        invocation.procedure === "sleepTargetAdmission" ||
        invocation.procedure === "greaseGroundHazard"
      ) {
        if (
          invocation.targeting.kind === "singleCombatant" ||
          (invocation.procedure === "saveGatedCondition" &&
            invocation.targeting.kind === "targetList")
        ) {
          const targetHole =
            invocation.targeting.kind === "singleCombatant"
              ? spellTargetHole(state, actorId, invocation)
              : isTargetListSpellInvocation(invocation)
                ? spellTargetListHole(state, actorId, invocation)
                : null;
          if (targetHole === null) {
            return [];
          }
          if (targetHole.choices.length === 0) {
            return [];
          }
          const castActs = [
            {
              subject: {
                tag: "actionSpell" as const,
                actorId,
                invocation: supportedSpellInvocationRef(invocation),
                mode: { tag: "cast" as const },
              },
              label: invocation.spell.name,
              summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
              initialHoles: [targetHole],
            },
          ];
          return invocation.procedure === "greaseGroundHazard"
            ? castActs
            : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
        }
        const initialHole = spellSavingThrowOutcomeHole(
          state,
          actorId,
          invocation,
        );
        const castActs = [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: `${spellActivationInvocationCastSummary(invocation)} Table-supplied affected targets make ${spellSavingThrowAbility(invocation).toUpperCase()} Saving Throws.`,
            initialHoles: [initialHole],
          },
        ];
        return invocation.procedure === "greaseGroundHazard"
          ? castActs
          : [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "rollModifier") {
        const targetHole =
          invocation.targeting.maxTargets > 1
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
              ];
        const castActs =
          initialHoles.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles,
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "creatureTypeProtection") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "damageReduction") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [
                    targetHole,
                    spellDamageTypeChoiceHole(invocation),
                  ],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "heldLight") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (invocation.procedure === "objectLight") {
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [spellObjectTargetHole(invocation)],
          },
        ];
      }
      if (invocation.procedure === "weaponDamageRider") {
        return [
          {
            subject: {
              tag: "bonusActionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [],
          },
        ];
      }
      if (
        invocation.procedure === "afterHitDamage" ||
        invocation.procedure === "afterHitSaveGatedCondition" ||
        invocation.procedure === "afterHitTimedDamageAndSave"
      ) {
        return [];
      }
      if (invocation.procedure === "markedDamageRider") {
        const targetHole = spellTargetHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "bonusActionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      }
      if (invocation.procedure === "expeditiousRetreatDash") {
        return representedMovementSpeedKinds(actor).map((speedKind) => ({
          subject: {
            tag: "bonusActionDashSpell" as const,
            actorId,
            invocation: supportedSpellInvocationRef(invocation),
            mode: { tag: "cast" as const },
            speedKind,
          },
          label: invocation.spell.name,
          summary: spellInvocationCastSummary(invocation),
          initialHoles: [],
        }));
      }
      if (invocation.procedure === "jumpMovementReplacement") {
        const targetHole = spellTargetListHole(state, actorId, invocation);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "bonusActionSpell" as const,
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      }
      if (invocation.procedure === "chainedSpellAttackDamage") {
        const castActs = [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: [spellDamageTypeChoiceHole(invocation)],
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "spellHostedWeaponAttack") {
        const targetHole = attackTargetHole(
          state,
          actorId,
          invocation.componentWeapon.attack,
        );
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                    componentWeaponItemId: invocation.componentWeapon.itemId,
                  },
                  label: `${invocation.spell.name} (${invocation.componentWeapon.attack.weapon.name})`,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [
                    spellDamageTypeChoiceHole(invocation),
                    targetHole,
                  ],
                },
              ];
        return castActs;
      }
      if (invocation.procedure === "spellAttackBeamSequence") {
        const initialHoles = Array.from(
          { length: invocation.targeting.beamCount },
          (_, beamIndex) => [
            spellBeamTargetHole(state, actorId, invocation, beamIndex),
            spellBeamObjectTargetHole(invocation, beamIndex),
          ],
        ).flat();
        return [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles,
          },
        ];
      }
      if (
        invocation.procedure === "scalarBuff" &&
        invocation.targeting.kind === "self"
      ) {
        const castActs = [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles: scalarBuffInitialHoles(invocation),
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (invocation.procedure === "scalarBuff") {
        if (!isScalarBuffTargetListInvocation(invocation)) {
          return [];
        }
        const targetHole =
          invocation.targeting.maxTargets > 1
            ? spellTargetListHole(state, actorId, invocation)
            : spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: spellSubjectTagForInvocation(invocation),
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      if (
        invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints"
      ) {
        const targetHole =
          invocation.targeting.maxTargets > 1
            ? spellTargetListHole(state, actorId, invocation)
            : spellTargetHole(state, actorId, invocation);
        const castActs =
          targetHole.choices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    invocation: supportedSpellInvocationRef(invocation),
                    mode: { tag: "cast" as const },
                  },
                  label: invocation.spell.name,
                  summary: spellInvocationCastSummary(invocation),
                  initialHoles: [targetHole],
                },
              ];
        return castActs;
      }
      if (
        (invocation.procedure === "heldLightHurl" ||
          invocation.procedure === "spellAttackDamage") &&
        invocation.targeting.kind === "singleCreatureOrObject"
      ) {
        const targetHole = spellTargetHole(state, actorId, invocation);
        const initialHoles = [
          ...(targetHole.choices.length === 0 ? [] : [targetHole]),
          spellObjectTargetHole(invocation),
        ];
        const castActs = [
          {
            subject: {
              tag: spellSubjectTagForInvocation(invocation),
              actorId,
              invocation: supportedSpellInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: spellInvocationCastSummary(invocation),
            initialHoles,
          },
        ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      const targetHole =
        invocation.procedure === "repeatedDamageAllocation"
          ? spellTargetAllocationHole(state, actorId, invocation)
          : invocation.procedure === "directHitPointRestoration" &&
              invocation.targeting.maxTargets > 1
            ? spellTargetListHole(state, actorId, invocation)
            : spellTargetHole(state, actorId, invocation);
      const castActs =
        targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: spellSubjectTagForInvocation(invocation),
                  actorId,
                  invocation: supportedSpellInvocationRef(invocation),
                  mode: { tag: "cast" as const },
                },
                label: invocation.spell.name,
                summary: spellInvocationCastSummary(invocation),
                initialHoles: [targetHole],
              },
            ];
      return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
    },
  );
}

export function spellInvocationCastSummary(
  invocation: SupportedSpellInvocation,
): string {
  if (invocation.procedure === "heldLight") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "objectLight") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "heldLightHurl") {
    return `Take a Magic action to hurl ${invocation.spell.name}.`;
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, allocating ${invocation.targeting.repeatedEffectCount} repeated effects among targets.`;
  }
  if (invocation.procedure === "directHitPointRestoration") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "scalarBuff") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "rollModifier") {
    return invocation.resource.tag === "spellSlot"
      ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
      : `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "damageReduction") {
    return `Cast ${invocation.spell.name} as a cantrip.`;
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return `Cast ${invocation.spell.name} as a cantrip using ${invocation.componentWeapon.attack.weapon.name}.`;
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "weaponDamageRider") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "afterHitDamage") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot after a qualifying hit.`;
  }
  if (invocation.procedure === "markedDamageRider") {
    if (invocation.action === "transfer") {
      return `Move ${invocation.spell.name} to a new target.`;
    }
    return invocation.resource.tag === "classFeatureFreeCast"
      ? `Cast ${invocation.spell.name} using Favored Enemy.`
      : `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "expeditiousRetreatDash") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot, immediately Dash, and keep Dash available as a Bonus Action while Concentration lasts.`;
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "featherFallMitigation") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "persistentArmorEffect") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "shieldReaction") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  if (invocation.procedure === "spellAttackDamage") {
    return spellActivationInvocationCastSummary(invocation);
  }
  if (invocation.procedure === "spellAttackBeamSequence") {
    return `Cast ${invocation.spell.name} as a cantrip, resolving ${invocation.targeting.beamCount} beams.`;
  }
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
  }
  return spellActivationInvocationCastSummary(invocation);
}

export function spellActivationInvocationCastSummary(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "attackBurstSaveDamage"
        | "spellAttackDamage"
        | "rollModifier"
        | "creatureTypeProtection"
        | "saveGatedDamage"
        | "saveGatedCondition"
        | "saveGatedAttackRollAdvantage"
        | "sleepTargetAdmission"
        | "command"
        | "greaseGroundHazard"
        | "jumpMovementReplacement"
        | "featherFallMitigation";
    }
  >,
): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

export function spellSubjectTagForInvocation(
  invocation: SupportedSpellInvocation,
): "actionSpell" | "bonusActionSpell" {
  if (invocation.procedure === "heldLight") {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "directHitPointRestoration" &&
    invocation.actionCost === "bonusAction"
  ) {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "scalarBuff" &&
    invocation.actionCost === "bonusAction"
  ) {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "weaponDamageRider") {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return "bonusActionSpell";
  }
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave"
  ) {
    return "bonusActionSpell";
  }
  if (invocation.procedure === "markedDamageRider") {
    return "bonusActionSpell";
  }
  return "actionSpell";
}

export function spellInvocationIsSpellcasting(
  invocation: SupportedSpellInvocation,
): boolean {
  return !(
    invocation.procedure === "markedDamageRider" &&
    invocation.action === "transfer"
  );
}

export function spellInvocationCasterPrerequisiteIsMet(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure !== "heldLightHurl" ||
    actor.activeEffects.some(
      (effect) =>
        effect.kind === "heldLight" &&
        effect.sourceSpellId === invocation.spell.id &&
        effect.sourceCombatantId === actor.combatantId,
    )
  );
}

export function spellRequiresVerbal(spell: SpellRecord): boolean {
  return "components" in spell.mechanics && spell.mechanics.components.v;
}

export function isReadiedSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is ReadiedSpellInvocation {
  return (
    invocation.procedure !== "directHitPointRestoration" &&
    invocation.procedure !== "heldLight" &&
    invocation.procedure !== "objectLight" &&
    invocation.procedure !== "heldLightHurl" &&
    invocation.procedure !== "spellHostedWeaponAttack" &&
    invocation.procedure !== "damageReduction" &&
    invocation.procedure !== "persistentArmorEffect" &&
    invocation.procedure !== "rollModifier" &&
    invocation.procedure !== "creatureTypeProtection" &&
    invocation.procedure !== "scalarBuff" &&
    invocation.procedure !== "weaponDamageRider" &&
    invocation.procedure !== "afterHitDamage" &&
    invocation.procedure !== "afterHitSaveGatedCondition" &&
    invocation.procedure !== "afterHitTimedDamageAndSave" &&
    invocation.procedure !== "markedDamageRider" &&
    invocation.procedure !== "expeditiousRetreatDash" &&
    invocation.procedure !== "jumpMovementReplacement" &&
    invocation.procedure !== "saveGatedCondition" &&
    invocation.procedure !== "saveGatedAttackRollAdvantage" &&
    invocation.procedure !== "sleepTargetAdmission" &&
    invocation.procedure !== "command" &&
    invocation.procedure !== "greaseGroundHazard" &&
    invocation.procedure !== "spellAttackBeamSequence" &&
    invocation.procedure !== "shieldReaction"
  );
}

export function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): readonly AvailableBattleAct[] {
  if (
    invocation.procedure === "persistentArmorEffect" ||
    invocation.procedure === "directHitPointRestoration" ||
    invocation.procedure === "damageReduction" ||
    invocation.procedure === "spellHostedWeaponAttack" ||
    invocation.procedure === "scalarBuff" ||
    invocation.procedure === "weaponDamageRider" ||
    invocation.procedure === "markedDamageRider" ||
    invocation.procedure === "expeditiousRetreatDash" ||
    invocation.procedure === "jumpMovementReplacement" ||
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "spellAttackBeamSequence" ||
    invocation.procedure === "afterHitSaveGatedCondition" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "heldLight" ||
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "rollModifier" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure === "attackBurstSaveDamage" ||
    invocation.procedure === "saveGatedCondition" ||
    invocation.procedure === "saveGatedAttackRollAdvantage" ||
    invocation.procedure === "sleepTargetAdmission" ||
    invocation.procedure === "command" ||
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "shieldReaction" ||
    state.readiedSpells.has(actorId)
  ) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell" as const,
      actorId,
      invocation: supportedSpellInvocationRef(invocation),
      mode: { tag: "ready" as const, trigger },
    },
    label: `Ready ${invocation.spell.name}`,
    summary: `Ready ${invocation.spell.name} for ${reactionTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

// activeOngoingFeaturesPreventSpellcasting also belongs to cluster K but
// remains in `../battle-reducer.ts` until the dispatcher merge resolves
// cycle #25 (turn ↔ spells_discovery).
