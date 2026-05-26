import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeAbilityScoreBounds,
  describeClassLevelChoiceCount,
  describeDiceAmount,
  describeExpertiseSkillSource,
  describeGrantedSpellAreaOverride,
  describeGrantedSpellDcOverride,
  describeGrantedSpellDurationOverride,
  describeGrantedSpellTargetRestriction,
  describeNumericBounds,
  describeProficiencyGrant,
  describeDelta,
  describeSignedNumber,
  describeSpellAccessMode,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type ObjectAndBarrierEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "object_immune_to_all_damage"
      | "object_destroyed_by_spell"
      | "cannot_be_dispelled_by_spell"
      | "block_ethereal_travel"
      | "replace_destroyed_object_section_with_area"
      | "block_projectiles"
      | "block_gases_and_gaseous_creatures"
      | "block_flying_movement"
      | "negate_named_effect"
      | "see_invisible_and_ethereal"
      | "grant_sense"
      | "modify_sense_range"
      | "grant_language_understanding"
      | "grant_creature_communication"
      | "deny_opportunity_attack"
      | "grant_temp_hp"
      | "prevent_drop_to_0_hp"
      | "negate_instant_death"
      | "make_stable"
      | "grant_feat"
      | "grant_proficiency"
      | "grant_expertise"
      | "grant_language"
      | "grant_hidden_language_messages"
      | "grant_language_choice"
      | "grant_spell_access"
      | "grant_spell_access_choice"
      | "grant_land_choice_prepared_spell_access"
      | "grant_spell_free_casts"
      | "grant_die_token"
      | "grant_bonus_action_attack"
      | "replace_damage_die"
      | "substitute_ability_for_rolls"
      | "offer_ability_substitution_for_ability_checks"
      | "offer_ability_substitution_for_jump_distance"
      | "grant_magic_weapon_enhancement"
      | "grant_condition_immunity"
      | "suppress_condition_benefit"
      | "grant_damage_immunity"
      | "block_max_hp_reduction"
      | "set_ability_score"
      | "modify_ability_score"
      | "modify_proficiency_bonus"
      | "create_extradimensional_space";
  }
>;

export function traceObjectAndBarrierEffectAtom(
  e: ObjectAndBarrierEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  _edges: TraceEdge[] | undefined,
  _traceEffectAtom: TraceEffectAtomFn,
): string | null {
  switch (e.kind) {
    case "object_immune_to_all_damage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_immune_to_all_damage",
        label: "object_immune_to_all_damage",
      });
      return id;
    }
    case "object_destroyed_by_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_destroyed_by_spell",
        label: `object_destroyed_by_spell\n${e.spellId}`,
      });
      return id;
    }
    case "cannot_be_dispelled_by_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "cannot_be_dispelled_by_spell",
        label: `cannot_be_dispelled_by_spell\n${e.spellId}`,
      });
      return id;
    }
    case "block_ethereal_travel": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_ethereal_travel",
        label: "block_ethereal_travel",
      });
      return id;
    }
    case "replace_destroyed_object_section_with_area": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "replace_destroyed_object_section_with_area",
        label: `replace_destroyed_object_section_with_area\n${e.areaLabel}`,
      });
      return id;
    }
    case "block_projectiles": {
      const id = ids("eff");
      const exception =
        e.exception === undefined ? "" : `\nexcept: ${e.exception}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_projectiles",
        label: `block_projectiles\n${e.projectile}${exception}`,
      });
      return id;
    }
    case "block_gases_and_gaseous_creatures": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_gases",
        label: "block_gases_and_gaseous_creatures",
      });
      return id;
    }
    case "block_flying_movement": {
      const id = ids("eff");
      const objects = e.includesObjects === true ? "\nincludes objects" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_flying_movement",
        label: `block_flying_movement\nmax size: ${e.maxSize}${objects}`,
      });
      return id;
    }
    case "negate_named_effect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_named_effect",
        label: `negate_named_effect\n${e.spellId} (${e.scope})`,
      });
      return id;
    }
    case "see_invisible_and_ethereal": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "see_invisible_and_ethereal",
        label:
          "see_invisible_and_ethereal\nInvisible as visible\nEthereal Plane as ghostly",
      });
      return id;
    }
    case "grant_sense": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_sense",
        label: `grant_sense\n${e.sense} ${e.rangeFeet} ft`,
      });
      return id;
    }
    case "modify_sense_range": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_sense_range",
        label:
          `modify_sense_range\n${e.sense}: grant ${e.grantIfAbsentFeet} ft if absent` +
          `\nelse +${e.increaseIfPresentFeet} ft`,
      });
      return id;
    }
    case "grant_language_understanding": {
      const id = ids("eff");
      const outward = e.intelligibleToAnyLanguageKnower
        ? "\nunderstood by any language-knower"
        : "";
      const writtenTouch =
        e.writtenRequiresTouch === true ? "\nwritten: touch required" : "";
      const excludesCodes =
        e.excludesCodesAndSecretMessages === true
          ? "\nexcludes codes/secret messages"
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language_understanding",
        label: `grant_language_understanding\n${e.scope}${outward}${writtenTouch}${excludesCodes}`,
      });
      return id;
    }
    case "grant_creature_communication": {
      const id = ids("eff");
      const influence = e.includesInfluenceActionOptions
        ? "\nincludes Influence action options"
        : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_creature_communication",
        label: `grant_creature_communication\n${e.creatureType}${influence}`,
      });
      return id;
    }
    case "deny_opportunity_attack": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "deny_opportunity_attack",
        label: "deny_opportunity_attack",
      });
      return id;
    }
    case "grant_temp_hp": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_temp_hp",
        label: `grant_temp_hp\n${describeDiceAmount(e.amount)}`,
      });
      return id;
    }
    case "prevent_drop_to_0_hp": {
      const id = ids("eff");
      const once = e.consumesEffect === true ? "\nconsumes effect" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_drop_to_0_hp",
        label: `prevent_drop_to_0_hp\nreplacement HP: ${e.replacementHp}${once}`,
      });
      return id;
    }
    case "negate_instant_death": {
      const id = ids("eff");
      const once = e.consumesEffect === true ? "\nconsumes effect" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_instant_death",
        label: `negate_instant_death${once}`,
      });
      return id;
    }
    case "make_stable": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "make_stable",
        label: "make_stable",
      });
      return id;
    }
    case "grant_feat": {
      const id = ids("eff");
      const categories =
        "category" in e ? e.category : e.categories.join(" | ");
      const fallback =
        e.openFallback === "any_qualifying_feat"
          ? "\n+ any qualifying feat"
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_feat",
        label: `grant_feat\n${categories}${fallback}`,
      });
      return id;
    }
    case "grant_proficiency": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_proficiency",
        label: `grant_proficiency\n${describeProficiencyGrant(e.proficiency)}`,
      });
      return id;
    }
    case "grant_expertise": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_expertise",
        label:
          `grant_expertise\n${describeClassLevelChoiceCount(e.choiceCount)} ` +
          describeExpertiseSkillSource(e.skills),
      });
      return id;
    }
    case "grant_language": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language",
        label: `grant_language\n${e.languageId}`,
      });
      return id;
    }
    case "grant_hidden_language_messages": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_hidden_language_messages",
        label:
          `grant_hidden_language_messages\n${e.languageId}\n` +
          `knowers ${e.spotting.languageKnowers}; others DC ${e.spotting.others.dc} ` +
          `${e.spotting.others.ability.toUpperCase()} (${e.spotting.others.skill})`,
      });
      return id;
    }
    case "grant_language_choice": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language_choice",
        label: `grant_language_choice\nchoose ${e.count} from ${e.source}`,
      });
      return id;
    }
    case "grant_spell_access": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_access",
        label:
          `grant_spell_access\n${e.spellId}\n(${describeSpellAccessMode(e.mode)})` +
          describeGrantedSpellDcOverride(e.dcOverride) +
          describeGrantedSpellAreaOverride(e.areaOverride) +
          describeGrantedSpellTargetRestriction(e.targetRestriction) +
          describeGrantedSpellDurationOverride(e.durationOverride),
      });
      return id;
    }
    case "grant_spell_access_choice": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_access_choice",
        label: `grant_spell_access_choice\nchoose ${e.count} ${e.spellList} level ${e.spellLevel}\n(${describeSpellAccessMode(e.mode)})`,
      });
      return id;
    }
    case "grant_land_choice_prepared_spell_access": {
      const id = ids("eff");
      const describeLand = (land: keyof typeof e.spellsByLand): string =>
        e.spellsByLand[land]
          .map(
            (tier) =>
              `L${tier.minimumClassLevel}: ${tier.spellIds.join(", ")}`,
          )
          .join("; ");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_land_choice_prepared_spell_access",
        label: [
          "grant_land_choice_prepared_spell_access",
          `${e.choice.kind} on ${e.choice.trigger}`,
          `arid: ${describeLand("arid")}`,
          `polar: ${describeLand("polar")}`,
          `temperate: ${describeLand("temperate")}`,
          `tropical: ${describeLand("tropical")}`,
        ].join("\n"),
      });
      return id;
    }
    case "grant_spell_free_casts": {
      const id = ids("eff");
      const scaling =
        e.scaling === undefined
          ? ""
          : `\n${e.scaling.tiers.map((tier) => `L${tier.atLevel}: ${tier.count}`).join(", ")}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_free_casts",
        label: `grant_spell_free_casts\n${e.spellId} x${e.count}\nreset ${e.resetCadence}${scaling}`,
      });
      return id;
    }
    case "grant_die_token": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_die_token",
        label: `grant_die_token\n${describeDiceAmount(e.die)}\n${e.trigger}, max held ${e.maxHeld}\n${e.duration.amount} ${e.duration.unit}`,
      });
      return id;
    }
    case "grant_bonus_action_attack": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_bonus_action_attack",
        label: `grant_bonus_action_attack\n${e.attack}`,
      });
      return id;
    }
    case "replace_damage_die": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "replace_damage_die",
        label: `replace_damage_die\n${describeDiceAmount(e.die)}\n${e.scope}`,
      });
      return id;
    }
    case "substitute_ability_for_rolls": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "substitute_ability_for_rolls",
        label: `substitute_ability_for_rolls\n${e.use} for ${e.replaces}\n${e.on.join(", ")}\n${e.scope}`,
      });
      return id;
    }
    case "offer_ability_substitution_for_ability_checks": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "offer_ability_substitution_for_ability_checks",
        label:
          `offer_ability_substitution_for_ability_checks\nuse ${e.use}` +
          `\n${e.skillFilter.skills.join(", ")}` +
          (e.requiredActiveFeature === undefined
            ? ""
            : `\nrequires active ${e.requiredActiveFeature.unitId}`),
      });
      return id;
    }
    case "offer_ability_substitution_for_jump_distance": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "offer_ability_substitution_for_jump_distance",
        label: `offer_ability_substitution_for_jump_distance\n${e.use} for ${e.replaces}`,
      });
      return id;
    }
    case "grant_magic_weapon_enhancement": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_magic_weapon_enhancement",
        label:
          `grant_magic_weapon_enhancement\nmagic weapon status` +
          `\n${describeDelta(e.bonus)} to attack rolls and damage rolls with attached weapon`,
      });
      return id;
    }
    case "grant_condition_immunity": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_condition_immunity",
        label: `grant_condition_immunity\n${e.condition}`,
      });
      return id;
    }
    case "suppress_condition_benefit": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_condition_benefit",
        label: `suppress_condition_benefit\n${e.condition}`,
      });
      return id;
    }
    case "grant_damage_immunity": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_damage_immunity",
        label: `grant_damage_immunity\n${e.damageType}`,
      });
      return id;
    }
    case "block_max_hp_reduction": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_max_hp_reduction",
        label: "block_max_hp_reduction",
      });
      return id;
    }
    case "create_extradimensional_space": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_extradimensional_space",
        label: [
          "create_extradimensional_space",
          `${e.entry.visibility} ${e.entry.widthFeet} ft x ${e.entry.heightFeet} ft portal at ${e.entry.location}`,
          `${e.anchor.kind}: ${e.anchor.topEndMotion}`,
          `access: ${e.access.kind}; ${e.access.anchorMovement}`,
          `capacity: ${e.capacity.creatureCount} ${e.capacity.maxCreatureSize} or smaller creatures`,
          `boundary: ${e.boundary.attacksSpellsAndEffects}`,
          `occupant perception: ${e.boundary.occupantPerception}`,
          `on end: ${e.onEnd.kind}`,
        ].join("\n"),
      });
      return id;
    }
    case "set_ability_score": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_ability_score",
        label: `set_ability_score\n${e.ability} = ${e.value} (${e.mode})`,
      });
      return id;
    }
    case "modify_ability_score": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ability_score",
        label: `modify_ability_score\n${e.ability} ${describeSignedNumber(e.delta)}${describeAbilityScoreBounds(e.minimum, e.maximum)}`,
      });
      return id;
    }
    case "modify_proficiency_bonus": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_proficiency_bonus",
        label: `modify_proficiency_bonus\n${describeSignedNumber(e.delta)}${describeNumericBounds(e.minimum, e.maximum)}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(
        `unhandled object or barrier effect atom: ${String(_exhaustive)}`,
      );
    }
  }
}
