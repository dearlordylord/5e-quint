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
      atomKinds: [
        "attack_roll",
        "damage",
        "mastery_root",
        "on_miss_window",
        "target",
      ],
      labels: [
        "attack_roll\nweapon attack miss",
        "on_miss_window\n(wielder choice)",
        "target\n(primary)",
        "damage\nattack_ability_modifier\nweapon_damage_type\nattack_ability_modifier_only",
      ],
      edges: [
        ["attack_roll", "on_miss_window", "opens_window"],
        ["attack_roll", "target", "attaches_to"],
        ["on_miss_window", "damage", "grants"],
        ["damage", "target", "attaches_to"],
        ["mastery_root", "attack_roll", "roots"],
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
      edges: [
        [
          "light_property_extra_attack",
          "action_timing_replacement",
          "replaces_with",
        ],
        ["action_timing_replacement", "use_count", "consumes"],
        ["mastery_root", "light_property_extra_attack", "roots"],
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
      edges: [
        ["attack_roll", "on_hit_window", "opens_window"],
        ["attack_roll", "target", "attaches_to"],
        ["on_hit_window", "modify_roll_advantage", "grants"],
        ["modify_roll_advantage", "target", "attaches_to"],
        ["modify_roll_advantage", "turn_end_window", "persists_until"],
        ["mastery_root", "attack_roll", "roots"],
      ],
    },
  ])(
    "projects $input.id without losing its rule facts",
    ({ input, atomKinds, labels, edges }) => {
      const trace = traceUnit(decodeUnitRecordSync(input));
      const atomKindByNodeId = new Map(
        trace.nodes.map(({ id, atomKind }) => [id, atomKind]),
      );

      expect(trace.unitId).toBe(input.id);
      expect(trace.atomKinds).toEqual(atomKinds);
      expect(trace.nodes.map(({ label }) => label)).toEqual(
        expect.arrayContaining(labels),
      );
      expect(
        trace.edges.map(({ from, to, relation }) => [
          atomKindByNodeId.get(from),
          atomKindByNodeId.get(to),
          relation,
        ]),
      ).toEqual(edges);
    },
  );
});
