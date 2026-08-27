import { describe, expect, test } from "vitest";

import { statBlockId } from "@dnd/shared/game-facts";

import { srdStatBlockCollection } from "./stat-block-catalog.ts";

const animalRecords = srdStatBlockCollection.statBlocks.filter((record) =>
  record.provenance.section.startsWith("Animals.md:"),
);
const animalRecordsById = new Map(
  animalRecords.map((record) => [record.id, record]),
);

type ProcedureSection = "actions" | "bonusActions" | "reactions";

const requireAnimal = (id: string) => {
  const record = animalRecordsById.get(statBlockId(id));
  expect(record, `Expected installed Animals record ${id}.`).toBeDefined();
  if (record === undefined) throw new Error(`Missing Animals record ${id}.`);
  return record;
};

const requireEntry = (id: string, section: ProcedureSection, name: string) => {
  const entry = requireAnimal(id).statBlock[section]?.find((candidate) =>
    candidate.kind === "executable"
      ? candidate.procedure.name === name
      : candidate.name === name,
  );
  expect(entry, `Expected ${id} ${section} entry ${name}.`).toBeDefined();
  if (entry === undefined)
    throw new Error(`Missing ${id} ${section} entry ${name}.`);
  return entry;
};

const expectLimitedUse = (
  id: string,
  section: ProcedureSection,
  name: string,
  limit:
    | { readonly kind: "daily"; readonly uses: number }
    | { readonly kind: "recharge"; readonly minimumRoll: number },
) => {
  expect(requireAnimal(id).statBlock.resources).toEqual([
    { ordinal: 1, ownership: "shared", limit },
  ]);
  expect(requireEntry(id, section, name).resourceRefs).toEqual({
    kind: "some",
    ordinals: [1],
  });
};

describe("Animals Stat Block procedure fidelity", () => {
  test("admits only fully typed attacks and executable Multiattack children", () => {
    const sections = ["actions", "bonusActions", "reactions"] as const;

    for (const record of animalRecords) {
      for (const section of sections) {
        const entries = record.statBlock[section] ?? [];
        const entriesByOrdinal = new Map(
          entries.map((entry) => [entry.procedureOrdinal, entry]),
        );

        for (const entry of entries) {
          if (entry.kind !== "executable") continue;
          if (entry.procedure.kind === "attack_roll") {
            expect(
              entry.procedure.description,
              `${record.id} ${entry.procedure.name} retained untyped attack prose.`,
            ).toBeUndefined();
          }
          if (entry.procedure.kind === "multiattack") {
            for (const dispatch of entry.procedure.dispatches) {
              expect(
                entriesByOrdinal.get(dispatch.procedureOrdinal)?.kind,
                `${record.id} Multiattack dispatches a non-executable child.`,
              ).toBe("executable");
            }
          }
        }
      }
    }
  });

  test("types every authored Pack Tactics trait", () => {
    const packTacticsTraits = animalRecords.flatMap(
      (record) =>
        record.statBlock.traits?.filter(
          (trait) => trait.name === "Pack Tactics",
        ) ?? [],
    );

    expect(packTacticsTraits).not.toHaveLength(0);
    for (const trait of packTacticsTraits) {
      expect(trait.effect).toEqual({
        kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
      });
    }
  });

  test("distinguishes executable damage from unsupported attack conditions", () => {
    expect(requireEntry("stat_block_badger", "actions", "Bite")).toMatchObject({
      kind: "executable",
      procedure: { kind: "attack_roll" },
    });
    expect(requireEntry("stat_block_crab", "actions", "Claw")).toMatchObject({
      kind: "executable",
      procedure: { attackAbility: "dex", kind: "attack_roll" },
    });
    expect(
      requireEntry("stat_block_giant_fire_beetle", "actions", "Bite"),
    ).toMatchObject({
      kind: "executable",
      procedure: {
        kind: "attack_roll",
        onHit: [
          {
            amount: { kind: "fixed", static: 1 },
            damageType: "fire",
            kind: "damage",
          },
        ],
      },
    });
    expect(requireEntry("stat_block_piranha", "actions", "Bite")).toEqual(
      expect.objectContaining({
        kind: "textOnly",
        reason: "unsupported_action_shape",
        description: expect.stringContaining(
          "with Advantage if the target doesn't have all its Hit Points",
        ),
      }),
    );
  });

  test("retains complete typed attack damage and condition riders", () => {
    expect(
      requireEntry("stat_block_ankylosaurus", "actions", "Tail"),
    ).toMatchObject({
      kind: "executable",
      procedure: {
        onHit: expect.arrayContaining([
          {
            condition: "prone",
            kind: "apply_condition_if_target_size_at_most",
            maxCreatureSize: "huge",
          },
        ]),
      },
    });
    expect(
      requireEntry("stat_block_giant_vulture", "actions", "Gouge"),
    ).toMatchObject({
      kind: "executable",
      procedure: {
        onHit: expect.arrayContaining([
          {
            condition: "poisoned",
            duration: "end_of_next_turn",
            kind: "apply_condition",
          },
        ]),
      },
    });
    expect(
      requireEntry("stat_block_flying_snake", "actions", "Bite"),
    ).toMatchObject({
      kind: "executable",
      procedure: {
        attackAbility: "dex",
        onHit: [
          { damageType: "piercing", kind: "damage" },
          { damageType: "poison", kind: "damage" },
        ],
      },
    });
    expect(
      requireEntry("stat_block_giant_scorpion", "actions", "Sting"),
    ).toMatchObject({
      kind: "executable",
      procedure: {
        onHit: [
          { damageType: "piercing", kind: "damage" },
          { damageType: "poison", kind: "damage" },
        ],
      },
    });
    expect(requireEntry("stat_block_eagle", "actions", "Talons")).toMatchObject(
      {
        kind: "executable",
        procedure: { attackAbility: "dex", reachFeet: 5 },
      },
    );
    expect(
      requireEntry("stat_block_giant_rat", "actions", "Bite"),
    ).toMatchObject({
      kind: "executable",
      procedure: { attackAbility: "dex", reachFeet: 5 },
    });
  });

  test("retains RAW limited-use ownership and complete textual spell lists", () => {
    expectLimitedUse("stat_block_ape", "actions", "Rock", {
      kind: "recharge",
      minimumRoll: 6,
    });
    expectLimitedUse("stat_block_giant_ape", "actions", "Boulder Toss", {
      kind: "recharge",
      minimumRoll: 6,
    });
    expectLimitedUse("stat_block_giant_hyena", "bonusActions", "Rampage", {
      kind: "daily",
      uses: 1,
    });
    expectLimitedUse("stat_block_giant_octopus", "reactions", "Ink Cloud", {
      kind: "daily",
      uses: 1,
    });
    expectLimitedUse("stat_block_giant_owl", "actions", "Spellcasting", {
      kind: "daily",
      uses: 1,
    });
    expectLimitedUse("stat_block_giant_spider", "actions", "Web", {
      kind: "recharge",
      minimumRoll: 5,
    });
    expectLimitedUse("stat_block_swarm_of_ravens", "actions", "Cacophony", {
      kind: "recharge",
      minimumRoll: 6,
    });

    expect(
      requireEntry("stat_block_giant_owl", "actions", "Spellcasting"),
    ).toMatchObject({
      kind: "textOnly",
      description: expect.stringContaining(
        "At Will: *Detect Evil and Good*, *Detect Magic*\n1/Day: *Clairvoyance*",
      ),
    });
  });

  test("publishes every omitted bonus action and reaction in its RAW section", () => {
    expect(
      requireEntry("stat_block_elephant", "bonusActions", "Trample"),
    ).toMatchObject({ kind: "textOnly", reason: "unsupported_action_shape" });
    expect(
      requireEntry("stat_block_giant_ape", "bonusActions", "Leap"),
    ).toMatchObject({ kind: "textOnly" });
    expect(
      requireEntry("stat_block_giant_seahorse", "bonusActions", "Bubble Dash"),
    ).toMatchObject({ kind: "textOnly" });
    expect(
      requireEntry("stat_block_mammoth", "bonusActions", "Trample"),
    ).toMatchObject({ kind: "textOnly", reason: "unsupported_action_shape" });

    for (const id of [
      "stat_block_panther",
      "stat_block_saber_toothed_tiger",
      "stat_block_tiger",
    ]) {
      expect(requireEntry(id, "bonusActions", "Nimble Escape")).toMatchObject({
        kind: "executable",
        procedure: {
          kind: "action_option",
          options: ["disengage", "hide"],
        },
      });
    }
  });
});
