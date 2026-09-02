import { describe, expect, test } from "vitest";

import grazeInput from "../../content/mastery_graze.json";
import nickInput from "../../content/mastery_nick.json";
import vexInput from "../../content/mastery_vex.json";
import { decodeUnitRecordSync } from "../surface/schema.ts";
import { traceUnit } from "./tracer-public.ts";

describe("Surface Weapon Mastery trace projections", () => {
  test.each([
    {
      input: grazeInput,
      atomKinds: ["attack_roll", "damage", "mastery_root"],
      labels: [
        "attack_roll\nweapon attack miss\noptional true",
        "damage\nattack_ability_modifier\nweapon_damage_type\nattack_ability_modifier_only",
      ],
    },
    {
      input: nickInput,
      atomKinds: [
        "action_timing_replacement",
        "light_property_extra_attack",
        "mastery_root",
        "use_count",
      ],
      labels: [
        "light_property_extra_attack\noptional true",
        "action_timing_replacement\nbonus_action -> attack_action",
        "use_count\nonce per turn",
      ],
    },
    {
      input: vexInput,
      atomKinds: [
        "attack_roll",
        "mastery_root",
        "modify_roll_advantage",
        "on_hit_window",
        "target",
        "turn_end_window",
      ],
      labels: [
        "attack_roll\n(weapon hit with damage)",
        "modify_roll_advantage\nadvantage on attack_roll ×1",
        "turn_end_window\n(attacker's next turn)",
      ],
    },
  ])(
    "projects $input.id without losing its rule facts",
    ({ input, atomKinds, labels }) => {
      const trace = traceUnit(decodeUnitRecordSync(input));

      expect(trace.unitId).toBe(input.id);
      expect(trace.atomKinds).toEqual(atomKinds);
      expect(trace.nodes.map(({ label }) => label)).toEqual(
        expect.arrayContaining(labels),
      );
      expect(
        trace.edges.every(
          ({ from, to }) =>
            trace.nodes.some(({ id }) => id === from) &&
            trace.nodes.some(({ id }) => id === to),
        ),
      ).toBe(true);
    },
  );
});
