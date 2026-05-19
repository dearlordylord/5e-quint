import { describe, expect, test } from "vitest";

import classFighterInput from "../../content/class_fighter.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
import locateAnimalsOrPlantsInput from "../../content/locate_animals_or_plants.json";
import locateObjectInput from "../../content/locate_object.json";
import magicMouthInput from "../../content/magic_mouth.json";
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
});
