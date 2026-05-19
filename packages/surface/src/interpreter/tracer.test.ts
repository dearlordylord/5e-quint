import { describe, expect, test } from "vitest";

import classFighterInput from "../../content/class_fighter.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import magicMouthInput from "../../content/magic_mouth.json";
import moonbeamInput from "../../content/moonbeam.json";
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
