// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// Spell profile predicates and projections aggregate per-procedure
// `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// and equality helpers.
//
// This is a leaf module within the spells subsystem. It depends on spell-effect
// and domain vocabulary plus Surface types; discovery, holes/fills, resolution,
// and turn processing consume it.

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting

import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import {
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  admittedSpellToAdmissionSource,
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
  spellRecordToAdmissionSource,
} from "../character-battle-resources.ts";

import { supportedDamageAmountExpr } from "./spells-execution-facts.ts";
import { hasSaveGateRepeatSaves } from "./spell-procedure-profiles/_save-gate-helpers.ts";
export * from "./spells-profiles-attack-damage.ts";

import { admitPersistentArmorEffectInvocationSpellAccess } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { admitRegisteredSpellProcedures } from "./spell-procedure-profiles/admission-registry.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/admission-context.ts";
import { spellInvocationResourceForCastOption } from "./spell-procedure-profiles/profile.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { characterBattleResourcePoolRefHasUsesRemaining } from "../character-battle-resource-execution.ts";

export function admittedSpellActs(
  actor: BattleCreatureState,
  state: BattleState,
  spellcasting: CharacterBattleSpellcastingState | undefined,
): readonly SupportedSpellInvocation[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }
  const preparedSpells = effectiveCharacterBattlePreparedSpells(spellcasting);
  const cantrips = effectiveCharacterBattleCantrips(spellcasting);
  const admissionContext = spellAdmissionContextFor(actor, state);
  if (admissionContext === null) {
    return [];
  }

  const admittedSpellSources = [...preparedSpells, ...cantrips].map(
    admittedSpellToAdmissionSource,
  );
  admittedSpellSources.push(
    ...spellcasting.spellAccesses.map(admittedSpellToAdmissionSource),
  );

  const actorResources = actor.origin.resources;
  const profileAdmissions = admittedSpellSources.flatMap((spell) =>
    admitRegisteredSpellProcedures(spell, {
      ...admissionContext,
      castingSource: spell.castingSource,
      spellCastOptions: [
        ...admissionContext.spellCastOptions,
        ...(spell.mechanics.level === 0
          ? []
          : spell.spellAccessFreeCastResourcePoolRefs
              .filter((resourcePoolRef) =>
                characterBattleResourcePoolRefHasUsesRemaining(
                  actorResources,
                  resourcePoolRef,
                ),
              )
              .map((resourcePoolRef) => ({
                spellLevel: spellSlotLevel(spell.mechanics.level),
                payment: {
                  tag: "spellAccessFreeCast" as const,
                  resourcePoolRef,
                },
              }))),
      ],
    }),
  );
  const spellcastingSource = spellcasting.spellcastingSource;

  const admittedInvocations = [
    ...profileAdmissions,
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      access.tag === "armorOfShadowsMageArmor" &&
      spellcastingSource.tag === "classSpellcasting"
        ? admitPersistentArmorEffectInvocationSpellAccess(actor.combatantId, {
            spell: spellRecordToAdmissionSource(
              access.admission.authoredSpell,
              {
                tag: "classSpellcasting",
                className: spellcastingSource.className,
                abilityModifier: spellcastingSource.abilityModifier,
              },
            ),
            executionFacts: access.admission.executionFacts,
          }).map((invocation) => ({
            ...invocation,
            spell: spellRecordToAdmissionSource(
              access.admission.authoredSpell,
              {
                tag: "classSpellcasting",
                className: spellcastingSource.className,
                abilityModifier: spellcastingSource.abilityModifier,
              },
            ),
          }))
        : [],
    ),
    ...admittedSpellSources.flatMap((spell) =>
      supportedPreparedAfterDamageReactionSaveSpellProfile(spell, [
        ...admissionContext.spellCastOptions,
        ...(spell.mechanics.level === 0
          ? []
          : spell.spellAccessFreeCastResourcePoolRefs
              .filter((resourcePoolRef) =>
                characterBattleResourcePoolRefHasUsesRemaining(
                  actorResources,
                  resourcePoolRef,
                ),
              )
              .map((resourcePoolRef) => ({
                spellLevel: spellSlotLevel(spell.mechanics.level),
                payment: {
                  tag: "spellAccessFreeCast" as const,
                  resourcePoolRef,
                },
              }))),
      ]).map((invocation) => ({ ...invocation, spell })),
    ),
  ].filter(
    (invocation) =>
      !activeOngoingFeaturesPreventSpellInvocation(state, actor, invocation),
  );
  return admittedInvocations;
}

export function supportedPreparedAfterDamageReactionSaveSpellProfile(
  spell: BattleSpellAdmissionSource,
  spellSlots: readonly import("./spell-procedure-profiles/profile.ts").SpellAdmissionCastOption[],
): readonly SupportedSpellInvocation[] {
  if (
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "takes_damage_from_creature" ||
    !spell.mechanics.castingTime.trigger.requiresVisibleCreature ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "damage" ||
    phase.onFail.damageType !== "fire"
  ) {
    return [];
  }
  const failedDamage = phase.onFail;
  const rangeFeet = spell.mechanics.range.feet;

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: failedDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    return damageExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: spellInvocationResourceForCastOption(slot),
            procedure: "saveGatedDamage" as const,
            spell,
            castingTime: { kind: "reaction" as const },
            ability: phase.ability,
            dc: phase.dc,
            targeting: { kind: "singleCombatant" as const },
            damage: {
              expr: damageExpr,
              damageType: "fire",
            },
            additionalDamageComponents: [],
            successDamage: "half" as const,
            rangeFeet: movementFeet(rangeFeet),
            failedSavePostDamageRiders: [],
            failedSaveConditionEffects: [],
            failedSaveAbilityChoices: null,
            saveRollModeRule: null,
          },
        ];
  });
}
export { supportedSpellActs } from "./supported-spell-acts.ts";
