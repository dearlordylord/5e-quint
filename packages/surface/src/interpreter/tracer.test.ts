import { describe, expect, test } from "vitest";

import animalMessengerInput from "../../content/animal_messenger.json";
import arcanistsMagicAuraInput from "../../content/arcanists_magic_aura.json";
import auguryInput from "../../content/augury.json";
import classFighterInput from "../../content/class_fighter.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
import flameBladeInput from "../../content/flame_blade.json";
import heatMetalInput from "../../content/heat_metal.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import magicWeaponInput from "../../content/magic_weapon.json";
import magicMouthInput from "../../content/magic_mouth.json";
import moonbeamInput from "../../content/moonbeam.json";
import prayerOfHealingInput from "../../content/prayer_of_healing.json";
import ropeTrickInput from "../../content/rope_trick.json";
import wardingBondInput from "../../content/warding_bond.json";
import { decodeUnitRecordSync } from "../surface/schema.ts";
import { traceUnit } from "./tracer.ts";

describe("Surface trace interpreter", () => {
  test("renders Fighter class creation traits as class graph nodes", () => {
    const trace = traceUnit(decodeUnitRecordSync(classFighterInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "class_saving_throw_proficiencies",
          label: "class_saving_throw_proficiencies\nstr, con",
        }),
        expect.objectContaining({
          atomKind: "class_weapon_proficiencies",
          label: "class_weapon_proficiencies\nsimple weapons, martial weapons",
        }),
        expect.objectContaining({
          atomKind: "class_tool_proficiencies",
          label: "class_tool_proficiencies\nnone",
        }),
        expect.objectContaining({
          atomKind: "class_armor_training",
          label: "class_armor_training\nlight, medium, heavy, shield",
        }),
      ]),
    );
  });

  test("renders Dragon's Breath as a target-granted cone save gate", () => {
    const trace = traceUnit(decodeUnitRecordSync(dragonsBreathInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("willing"),
        }),
        expect.objectContaining({
          atomKind: "action_window",
          label: "action_window\n(attached creature spends magic action)",
        }),
        expect.objectContaining({
          atomKind: "area",
          label: expect.stringContaining("origin: attached creature"),
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: "save_gate\nDEX vs caster spell save DC",
        }),
      ]),
    );
  });

  test("renders Flame Blade held-object lifecycle and active blade gates", () => {
    const trace = traceUnit(decodeUnitRecordSync(flameBladeInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "spell_created_held_object",
          label: [
            "spell_created_held_object",
            "held by caster",
            "requires free_hand",
            "disappears when caster_lets_go",
            "re-evoke: bonus_action; requires free_hand",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label: "ongoing_predicate\nspell-created held object active",
        }),
        expect.objectContaining({
          atomKind: "emit_light",
          label: "emit_light\nbright: 10 ft\ndim: +10 ft",
        }),
        expect.objectContaining({
          atomKind: "attack_roll",
          label: "attack_roll\nmelee_spell_attack",
        }),
      ]),
    );
  });

  test("renders Heat Metal object-contact and drop witness facts", () => {
    const trace = traceUnit(decodeUnitRecordSync(heatMetalInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object_contact_damage",
          label: expect.stringContaining(
            "table_witnessed_physical_contact_with_spell_object",
          ),
        }),
        expect.objectContaining({
          atomKind: "holding_or_wearing_save",
          label: expect.stringContaining(
            "table_witnessed_holding_or_wearing_spell_object",
          ),
        }),
        expect.objectContaining({
          atomKind: "drop_if_possible",
          label: expect.stringContaining("table_witnessed_drop_result"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label:
            "ongoing_predicate\ntable-witnessed attachment within spell range",
        }),
      ]),
    );
  });

  test("renders Warding Bond linked-bond lifecycle facts as executable trace atoms", () => {
    const trace = traceUnit(decodeUnitRecordSync(wardingBondInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "caster_target_bond",
          label: expect.stringContaining(
            "bond range: caster-target within 60 ft",
          ),
        }),
        expect.objectContaining({
          atomKind: "paired_worn_material_component",
          label: expect.stringContaining("platinum rings"),
        }),
        expect.objectContaining({
          atomKind: "ongoing_predicate",
          label: "ongoing_predicate\nattached bond within range",
        }),
        expect.objectContaining({
          atomKind: "grant_resistance",
          label: "grant_resistance\nall damage types",
        }),
        expect.objectContaining({
          atomKind: "share_damage_to_caster",
          label: "share_damage_to_caster\nsame_as_attached_damage_taken",
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("caster drops to 0 HP"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("attached bond exceeds range"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining(
            "spell cast again on connected creature",
          ),
        }),
      ]),
    );
  });

  test("renders Magic Weapon's nonmagical weapon enhancement facts", () => {
    const trace = traceUnit(decodeUnitRecordSync(magicWeaponInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("nonmagical weapon"),
        }),
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("filter: weapon, nonmagical"),
        }),
        expect.objectContaining({
          atomKind: "grant_magic_weapon_enhancement",
          label: [
            "grant_magic_weapon_enhancement",
            "magic weapon status",
            "+1 (slot tiers L3:2, L6:3) to attack rolls and damage rolls with attached weapon",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining("caster_recasts_spell"),
        }),
      ]),
    );
  });

  test("renders Locate Animals or Plants as nearest-kind location disclosure", () => {
    const trace = traceUnit(decodeUnitRecordSync(locateAnimalsOrPlantsInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "locate_kind",
          label: [
            "locate_kind",
            "subjects: beast, plant_creature, nonmagical_plant",
            "closest within 26400 ft",
            "direction_and_distance",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Locate Object as object location and motion disclosure", () => {
    const trace = traceUnit(decodeUnitRecordSync(locateObjectInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object_location_sense",
          label: [
            "object_location_sense",
            "specific known object seen within 30 ft",
            "nearest particular_kind within 1000 ft",
            "direction_to_location_and_movement",
            "blocked_by: any_thickness_of_lead_direct_path",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Animal Messenger as a CR-gated Tiny Beast courier task", () => {
    const trace = traceUnit(decodeUnitRecordSync(animalMessengerInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("creature size: exact tiny"),
        }),
        expect.objectContaining({
          atomKind: "save_gate",
          label: expect.stringContaining(
            "auto-success if target Challenge Rating != 0",
          ),
        }),
        expect.objectContaining({
          atomKind: "assign_courier_task",
          label: [
            "assign_courier_task",
            "messenger: target_beast",
            "destination: caster_specified_visited_location",
            "recipient: caster_specified_general_description",
            "message: 25 words; mimic_caster_communication",
            "travel: 25/50 miles per 24h",
            "on arrival: deliver_to_described_creature",
            "on expiry: message_lost_and_beast_returns_to_casting_location",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Arcanist's Magic Aura as target-gated magical identity masking", () => {
    const trace = traceUnit(decodeUnitRecordSync(arcanistsMagicAuraInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("creature disposition: willing"),
        }),
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("not_worn_or_carried"),
        }),
        expect.objectContaining({
          atomKind: "magical_identity_mask",
          label: [
            "magical_identity_mask",
            "creature: other_than_actual_type",
            "treated by: spells_and_magical_effects",
            "object aura: nonmagical_magical_or_chosen_school",
            "observed by: spells_and_magical_effects_detecting_magical_auras",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "expire",
          label: expect.stringContaining(
            "permanent after 30 daily casts on same_target",
          ),
        }),
      ]),
    );
  });

  test("renders Augury as a GM-chosen divination omen table", () => {
    const trace = traceUnit(decodeUnitRecordSync(auguryInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "divination_omen",
          label: [
            "divination_omen",
            "source: otherworldly_entity",
            "subject: planned_course_of_action within 30 minutes",
            "adjudication: gm_chosen_omen_table",
            "omens: weal=good, woe=bad, weal_and_woe=good_and_bad, indifference=neither_good_nor_bad",
            "changed circumstances: not_accounted_for",
            "repeat casting: 25% cumulative_percent_per_cast_after_first until long_rest",
            "repeat result: no_answer",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Prayer of Healing as ranged multi-recipient rest healing", () => {
    const trace = traceUnit(decodeUnitRecordSync(prayerOfHealingInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining(
            "casting requirement: remain within spell range for entire casting",
          ),
        }),
        expect.objectContaining({
          atomKind: "grant_rest_benefit",
          label: [
            "grant_rest_benefit",
            "short_rest",
            "target: target_creature",
          ].join("\n"),
        }),
        expect.objectContaining({
          atomKind: "spell_recipient_rest_lockout",
          label: [
            "spell_recipient_rest_lockout",
            "target: target_creature",
            "reset: target_finishes_long_rest",
          ].join("\n"),
        }),
      ]),
    );
  });

  test("renders Magic Mouth as object-anchored spoken-message release", () => {
    const trace = traceUnit(decodeUnitRecordSync(magicMouthInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "object",
          label: expect.stringContaining(
            "not worn or carried by another creature",
          ),
        }),
        expect.objectContaining({
          atomKind: "post_action_window",
          label: expect.stringContaining("visual/audible condition"),
        }),
        expect.objectContaining({
          atomKind: "release",
          label: expect.stringContaining("spoken message"),
        }),
      ]),
    );
  });

  test("renders Moonbeam shared per-turn fence as a single use_count node with four limits edges", () => {
    const trace = traceUnit(decodeUnitRecordSync(moonbeamInput));

    // RAW: "A creature makes this save only once per turn" spans all four triggers:
    // initial appearance (initialPhase) + 3 recurring operations.
    // The tracer must collapse these into a single use_count node (shared by limitGroup).
    const fenceNodes = trace.nodes.filter((n) => n.atomKind === "use_count");
    expect(fenceNodes).toHaveLength(1);
    expect(fenceNodes[0]).toMatchObject({
      id: "moonbeam_save_per_turn",
      atomKind: "use_count",
      label: "use_count\nonce per turn",
    });

    // Four "limits" edges must fan into the single fence node.
    const limitsEdges = trace.edges.filter(
      (e) => e.to === "moonbeam_save_per_turn" && e.relation === "limits",
    );
    expect(limitsEdges).toHaveLength(4);
  });

  test("renders Rope Trick as an extradimensional refuge", () => {
    const trace = traceUnit(decodeUnitRecordSync(ropeTrickInput));

    expect(trace.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          atomKind: "hole",
          label: expect.stringContaining("touched rope"),
        }),
        expect.objectContaining({
          atomKind: "create_extradimensional_space",
          label: [
            "create_extradimensional_space",
            "invisible 3 ft x 5 ft portal at anchor_upper_end",
            "touched_rope: hovers_until_perpendicular_or_ceiling",
            "access: climb_anchor; can_be_pulled_into_or_dropped_out",
            "capacity: 8 medium or smaller creatures",
            "boundary: blocked_bidirectionally",
            "occupant perception: can_see_out_through_portal",
            "on end: drop_contents_out",
          ].join("\n"),
        }),
      ]),
    );
  });
});
