import { describe, expect, test } from "vitest";

import classFighterInput from "../../content/class_fighter.json";
import dragonsBreathInput from "../../content/dragons_breath.json";
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
          label: expect.stringContaining("warding_bond_mystic_connection"),
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
});
