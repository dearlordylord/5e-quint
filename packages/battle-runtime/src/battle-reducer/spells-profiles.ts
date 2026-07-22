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
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import type { CharacterBattleResourceOwnership } from "../character-battle-resources.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
} from "../character-battle-resources.ts";

import { supportedDamageAmountExpr } from "./spells-profile-shared.ts";
import { hasSaveGateRepeatSaves } from "./spell-procedure-profiles/_save-gate-helpers.ts";
export * from "./spells-profiles-attack-damage.ts";

import { admitPersistentArmorEffectInvocationSpellAccess } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { admitRegisteredSpellProcedures } from "./spell-procedure-profiles/admission-registry.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/profile.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { isCharacterBattleCreatureState } from "./creature-state.ts";
import { characterSpellProcedure } from "../character-execution-admission.ts";

export function admittedSpellActs(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
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
  const admissionContext = spellAdmissionContextFor(
    actor,
    state,
    resourceOwnership,
  );
  if (admissionContext === null) {
    return [];
  }

  const profileAdmissions = [...preparedSpells, ...cantrips].flatMap((spell) =>
    admitRegisteredSpellProcedures(spell, admissionContext),
  );

  const admittedInvocations = [
    ...profileAdmissions,
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      admitPersistentArmorEffectInvocationSpellAccess(
        actor.combatantId,
        access,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHellishRebukeReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
  ].filter(
    (invocation) =>
      !activeOngoingFeaturesPreventSpellInvocation(actor, invocation),
  );
  return admittedInvocations;
}

export function supportedSpellActs(
  actor: BattleCreatureState,
): readonly BattleExecutableSpellInvocation[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
  return actor.origin.execution.procedureBindings
    .flatMap((binding) => {
      if (binding.procedure.kind !== "spellInvocation") return [];
      const invocation = characterSpellProcedure(
        actor.origin.execution,
        binding.procedureRef,
        actor,
      );
      return invocation === undefined ? [] : [invocation];
    })
    .filter(
      (invocation) =>
        !activeOngoingFeaturesPreventSpellInvocation(actor, invocation),
    );
}

export function supportedPreparedHellishRebukeReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
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
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
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
