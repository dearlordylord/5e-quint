import { describe, expect, test } from "vitest";

import classFighterInput from "../../content/class_fighter.json";
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
          label: "class_weapon_proficiencies\nsimple, martial",
        }),
        expect.objectContaining({
          atomKind: "class_armor_training",
          label: "class_armor_training\nlight, medium, heavy, shield",
        }),
      ]),
    );
  });
});
