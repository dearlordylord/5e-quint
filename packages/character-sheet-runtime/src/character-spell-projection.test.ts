import { unitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  projectCharacterSheetSpell,
  projectPartialCharacterSheetSpell,
  type CharacterSheetSpellPathEvidence,
} from "./character-spell-projection.ts";

const partialRootIds = [
  "animate_objects",
  "antilife_shell",
  "arcane_hand",
  "awaken",
  "commune",
  "commune_with_nature",
  "contact_other_plane",
  "conjure_elemental",
  "creation",
  "dominate_person",
  "dream",
  "geas",
  "greater_restoration",
  "hallow",
  "legend_lore",
  "mislead",
  "modify_memory",
  "passwall",
  "telekinesis",
  "wall_of_force",
  "wall_of_stone",
  "planar_binding",
  "prayer_of_healing",
  "raise_dead",
  "reincarnate",
  "scrying",
  "seeming",
  "telepathic_bond",
  "teleportation_circle",
  "tree_stride",
  "summon_dragon",
] as const;

const commonCoordinates = [
  "consumed|spell level|recordMechanics/generalFact:1",
  "consumed|spell school|recordMechanics/generalFact:2",
  "consumed|spell range|recordMechanics/generalFact:3",
  "consumed|spell components|recordMechanics/generalFact:4",
  "consumed|spell duration|recordMechanics/generalFact:5",
  "consumed|casting time|recordMechanics/generalFact:6",
  "consumed|mechanics family|recordMechanics/generalFact:7",
] as const;

const materialCost =
  "consumed|material component cost|recordMechanics/generalFact:4/resource:1";
const materialConsumption =
  "consumed|material component consumption|recordMechanics/generalFact:4/effect:1";
const durationLimit =
  "consumed|duration limit|recordMechanics/generalFact:5/generalFact:1";
const activationPhase = "consumed|activation phase|recordMechanics/procedure:1";
const phaseAttachment =
  "consumed|phase attachment|recordMechanics/procedure:1/generalFact:1";

const expectedEvidenceByRootId = {
  animate_objects: expectedTemplatedSpawn(),
  antilife_shell: expectedOngoing(1),
  arcane_hand: expectedActivation({ duration: [durationLimit] }),
  awaken: expectedActivation({
    material: [materialCost, materialConsumption],
  }),
  commune: expectedActivation({ duration: [durationLimit] }),
  commune_with_nature: expectedActivation(),
  contact_other_plane: expectedActivation({ duration: [durationLimit] }),
  conjure_elemental: expectedActivation({ duration: [durationLimit] }),
  creation: expectedActivation({ duration: [durationLimit] }),
  dominate_person: expectedActivation({
    duration: [durationLimit],
    repeatSaves: 1,
  }),
  dream: expectedActivation({ duration: [durationLimit] }),
  geas: expectedActivation({
    duration: [
      durationLimit,
      "consumed|duration upcast tier|recordMechanics/generalFact:5/extension:1",
    ],
  }),
  greater_restoration: expectedActivation({
    material: [materialCost, materialConsumption],
    effectDisposition: "consumed",
  }),
  hallow: expectedActivation({
    material: [materialCost, materialConsumption],
    duration: [
      "consumed|permanent duration ending|recordMechanics/generalFact:5/effect:1",
    ],
  }),
  legend_lore: expectedActivation({ material: [materialCost] }),
  mislead: expectedActivation({
    duration: [
      durationLimit,
      ...numberedCoordinates(
        3,
        (ordinal) =>
          `consumed|duration early ending|recordMechanics/generalFact:5/effect:${ordinal}`,
      ),
    ],
  }),
  modify_memory: expectedActivation({
    duration: [
      durationLimit,
      "consumed|duration early ending|recordMechanics/generalFact:5/effect:1",
    ],
  }),
  passwall: expectedActivation({ duration: [durationLimit] }),
  telekinesis: expectedOngoing(2),
  wall_of_force: expectedOngoing(5, true),
  wall_of_stone: expectedActivation({
    duration: [
      durationLimit,
      "consumed|maintained permanent duration|recordMechanics/generalFact:5/effect:1",
    ],
  }),
  planar_binding: expectedActivation({
    material: [materialCost, materialConsumption],
    duration: [
      durationLimit,
      ...numberedCoordinates(
        4,
        (ordinal) =>
          `consumed|duration upcast tier|recordMechanics/generalFact:5/extension:${ordinal}`,
      ),
    ],
  }),
  prayer_of_healing: expectedActivation({
    effectDisposition: "consumed",
    effectCount: 3,
  }),
  raise_dead: expectedActivation({
    material: [materialCost, materialConsumption],
    effectDisposition: "consumed",
  }),
  reincarnate: expectedActivation({
    material: [materialCost, materialConsumption],
    effectDisposition: "consumed",
  }),
  scrying: expectedActivation({
    material: [materialCost],
    duration: [durationLimit],
  }),
  seeming: expectedActivation({ duration: [durationLimit] }),
  telepathic_bond: expectedActivation({ duration: [durationLimit] }),
  teleportation_circle: expectedActivation({
    material: [materialCost, materialConsumption],
    duration: [
      durationLimit,
      "consumed|permanent casting cadence|recordMechanics/generalFact:5/effect:1",
    ],
  }),
  tree_stride: expectedActivation({ duration: [durationLimit] }),
  summon_dragon: expectedSpawnedCreature(),
} as const satisfies Record<(typeof partialRootIds)[number], readonly string[]>;

describe("Character Sheet spell projection", () => {
  test("projects root-record-identity-free admission facts and a correlated material contract", () => {
    const spell = requireSpell("awaken");
    const projection = projectCharacterSheetSpell(spell);

    expect(projection.tag).toBe("readable");
    if (projection.tag !== "readable") return;
    expect(projection.value).not.toHaveProperty("id");
    expect(projection.value).not.toHaveProperty("kind");
    expect(projection.value).not.toHaveProperty("name");
    expect(projection.value).not.toHaveProperty("provenance");
    expect(projection.value.mechanics.components).not.toHaveProperty("m");
    expect(projection.value.mechanics.components.material).toMatchObject({
      kind: "present",
      consumed: true,
    });
  });

  test.each(partialRootIds)(
    "emits complete, unique path evidence for %s",
    (rootId) => {
      const projection = projectPartialCharacterSheetSpell(
        requireSpell(rootId),
      );
      expect(projection.tag).toBe("readable");
      if (projection.tag !== "readable") return;
      const coordinates = projection.value.evidence.map(evidenceCoordinate);
      expect(coordinates).toEqual([...expectedEvidenceByRootId[rootId]]);
      expect(new Set(coordinates).size).toBe(coordinates.length);
    },
  );

  test("classifies exactly the 31 current SRD Character Sheet partial roots", () => {
    expect(
      srdUnitCollection.units.flatMap((unit) =>
        projectPartialCharacterSheetSpell(unit).tag === "readable"
          ? [unit.id]
          : [],
      ),
    ).toEqual([...partialRootIds]);
  });

  test.each(partialRootIds)(
    "is invariant under visibly synthetic identity replacement for %s",
    (rootId) => {
      const root = requireSpell(rootId);
      const renamed = decodeUnitRecordSync({
        ...root,
        id: unitId(`synthetic_mycelium_${rootId}`),
        name: `Synthetic Mycelium ${rootId}`,
        provenance: {
          kind: "synthetic-test",
          section: `Synthetic/Mycelium/${rootId}`,
        },
      });
      expect(projectPartialCharacterSheetSpell(renamed)).toEqual(
        projectPartialCharacterSheetSpell(root),
      );
    },
  );

  test("preserves exact nested material and duration coordinates", () => {
    expectCoordinates("awaken", [
      "consumed|material component cost|recordMechanics/generalFact:4/resource:1",
      "consumed|material component consumption|recordMechanics/generalFact:4/effect:1",
    ]);
    expectCoordinates("legend_lore", [
      "consumed|material component cost|recordMechanics/generalFact:4/resource:1",
    ]);
    expectCoordinates("geas", [
      "consumed|duration limit|recordMechanics/generalFact:5/generalFact:1",
      "consumed|duration upcast tier|recordMechanics/generalFact:5/extension:1",
    ]);
    expectCoordinates("mislead", [
      "consumed|duration early ending|recordMechanics/generalFact:5/effect:1",
      "consumed|duration early ending|recordMechanics/generalFact:5/effect:2",
      "consumed|duration early ending|recordMechanics/generalFact:5/effect:3",
    ]);
    expectCoordinates("hallow", [
      "consumed|permanent duration ending|recordMechanics/generalFact:5/effect:1",
    ]);
    expectCoordinates("teleportation_circle", [
      "consumed|permanent casting cadence|recordMechanics/generalFact:5/effect:1",
    ]);
    expectCoordinates("wall_of_stone", [
      "consumed|maintained permanent duration|recordMechanics/generalFact:5/effect:1",
    ]);
  });

  test("rejects duration combinations outside the current partial support profile", () => {
    const wallOfStone = requireSpell("wall_of_stone");
    if (wallOfStone.mechanics.duration.kind !== "concentration") {
      throw new Error("Expected Wall of Stone to use Concentration.");
    }
    expectDurationIssues(
      decodeUnitRecordSync({
        ...wallOfStone,
        mechanics: {
          ...wallOfStone.mechanics,
          duration: {
            ...wallOfStone.mechanics.duration,
            earlyEnd: [{ kind: "caster_drops_to_0_hp" }],
          },
        },
      }),
      ["recordMechanics/generalFact:5"],
    );

    const teleportationCircle = requireSpell("teleportation_circle");
    if (teleportationCircle.mechanics.duration.kind !== "timed") {
      throw new Error("Expected Teleportation Circle to use a timed duration.");
    }
    expectDurationIssues(
      decodeUnitRecordSync({
        ...teleportationCircle,
        mechanics: {
          ...teleportationCircle.mechanics,
          duration: {
            ...teleportationCircle.mechanics.duration,
            earlyEnd: [{ kind: "caster_recasts_spell" }],
          },
        },
      }),
      ["recordMechanics/generalFact:5"],
    );

    const geas = requireSpell("geas");
    if (
      geas.mechanics.duration.kind !== "timed" ||
      teleportationCircle.mechanics.duration.permanentAfter === undefined
    ) {
      throw new Error("Expected correlated timed duration fixtures.");
    }
    expectDurationIssues(
      decodeUnitRecordSync({
        ...geas,
        mechanics: {
          ...geas.mechanics,
          duration: {
            ...geas.mechanics.duration,
            permanentAfter:
              teleportationCircle.mechanics.duration.permanentAfter,
          },
        },
      }),
      ["recordMechanics/generalFact:5"],
    );

    const planarBinding = requireSpell("planar_binding");
    if (planarBinding.mechanics.duration.kind !== "slot_tiered") {
      throw new Error("Expected Planar Binding to use slot-tiered duration.");
    }
    const firstTier = planarBinding.mechanics.duration.tiers[0];
    if (firstTier === undefined || firstTier.duration.kind !== "timed") {
      throw new Error("Expected a timed Planar Binding duration tier.");
    }
    expectDurationIssues(
      decodeUnitRecordSync({
        ...planarBinding,
        mechanics: {
          ...planarBinding.mechanics,
          duration: {
            ...planarBinding.mechanics.duration,
            tiers: [
              {
                ...firstTier,
                duration: {
                  ...firstTier.duration,
                  earlyEnd: [{ kind: "caster_recasts_spell" }],
                },
              },
              ...planarBinding.mechanics.duration.tiers.slice(1),
            ],
          },
        },
      }),
      ["recordMechanics/generalFact:5/extension:1"],
    );

    const telekinesis = requireSpell("telekinesis");
    if (telekinesis.mechanics.duration.kind !== "concentration") {
      throw new Error("Expected Telekinesis to use Concentration.");
    }
    expectDurationIssues(
      decodeUnitRecordSync({
        ...telekinesis,
        mechanics: {
          ...telekinesis.mechanics,
          duration: {
            ...telekinesis.mechanics.duration,
            earlyEnd: [{ kind: "caster_drops_to_0_hp" }],
          },
        },
      }),
      ["recordMechanics/generalFact:5"],
    );
  });

  test("preserves exact phase and family coordinates", () => {
    expectCoordinates("dominate_person", [
      "unowned|repeat saving throw|recordMechanics/procedure:1/procedure:1",
      "unowned|phase effect execution|recordMechanics/procedure:1/effect:1",
    ]);
    expectCoordinates("animate_objects", [
      "consumed|spawn capacity|recordMechanics/resource",
      "consumed|spawn stat block execution|recordMechanics/effect:1",
      "consumed|spawn size tier|recordMechanics/extension:1",
      "consumed|spawn size tier|recordMechanics/extension:2",
      "consumed|spawn size tier|recordMechanics/extension:3",
      "unowned|spawn control execution|recordMechanics/procedure:1",
      "unowned|zero-hit-point reversion|recordMechanics/effect:2",
    ]);
    expectCoordinates("wall_of_force", [
      "consumed|ongoing attachment|recordMechanics/effect:1",
      "consumed|ongoing initial phase|recordMechanics/action",
      ...Array.from(
        { length: 5 },
        (_, index) =>
          `unowned|ongoing operation execution|recordMechanics/procedure:${index + 1}/effect:1`,
      ),
    ]);
    expectCoordinates("summon_dragon", [
      "consumed|spawned creature execution|recordMechanics/effect:1",
      "unowned|spawn control execution|recordMechanics/procedure:1",
      "unowned|spawn dismissal|recordMechanics/effect:2",
    ]);
  });

  test("marks Character Sheet-owned phase application as consumed", () => {
    for (const rootId of [
      "greater_restoration",
      "raise_dead",
      "reincarnate",
    ] as const) {
      expectCoordinates(rootId, [
        "consumed|phase effect execution|recordMechanics/procedure:1/effect:1",
      ]);
    }
    expectCoordinates("prayer_of_healing", [
      "consumed|phase effect execution|recordMechanics/procedure:1/effect:1",
      "consumed|phase effect execution|recordMechanics/procedure:1/effect:2",
      "consumed|phase effect execution|recordMechanics/procedure:1/effect:3",
    ]);
  });

  test("distinguishes complete spell roots and unsupported Unit roles", () => {
    expect(
      projectPartialCharacterSheetSpell(requireSpell("acid_splash")),
    ).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "completeSpellRoot" }],
    });
    const classRoot = srdUnitCollection.units.find(
      (unit) => unit.kind === "class",
    );
    if (classRoot === undefined) throw new Error("Expected an SRD class.");
    expect(projectPartialCharacterSheetSpell(classRoot)).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "unsupportedSpellRoot" }],
    });
  });

  test("accumulates independent unsupported spawned-creature branches", () => {
    const root = requireSpell("summon_dragon");
    if (root.mechanics.family !== "spawned_creature") {
      throw new Error("Expected a spawned-creature spell.");
    }
    const { control: _control, ...mechanicsWithoutControl } = root.mechanics;
    const malformed = decodeUnitRecordSync({
      ...root,
      mechanics: {
        ...mechanicsWithoutControl,
        duration: { kind: "timed", value: { amount: 1, unit: "hour" } },
        dismissal: { onSpellEnd: "persists" },
      },
    });
    const projection = projectPartialCharacterSheetSpell(malformed);
    expect(projection).toMatchObject({
      tag: "unreadable",
      issues: [
        { code: "unsupportedSpellBranch" },
        { code: "unsupportedSpellBranch" },
        { code: "unsupportedSpellBranch" },
      ],
    });
    if (projection.tag === "unreadable") {
      expect(new Set(projection.issues.map(issueCoordinate)).size).toBe(3);
    }
  });

  test("reports a missing spawned-creature control branch at its procedure path", () => {
    const root = requireSpell("summon_dragon");
    if (root.mechanics.family !== "spawned_creature") {
      throw new Error("Expected a spawned-creature spell.");
    }
    const { control: _control, ...mechanicsWithoutControl } = root.mechanics;
    const malformed = decodeUnitRecordSync({
      ...root,
      mechanics: mechanicsWithoutControl,
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
            ],
          },
        },
      ],
    });
  });

  test("reports an unsupported ongoing duration without losing its family candidate", () => {
    const root = requireSpell("telekinesis");
    if (root.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected an ongoing-effect spell.");
    }
    const malformed = decodeUnitRecordSync({
      ...root,
      mechanics: {
        ...root.mechanics,
        duration: { kind: "timed", value: { amount: 1, unit: "hour" } },
      },
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "generalFact", ordinal: 5 },
            ],
          },
        },
      ],
    });
  });

  test("reports a templated duration branch issue", () => {
    const root = requireSpell("animate_objects");
    if (root.mechanics.family !== "templated_multi_spawn") {
      throw new Error("Expected a templated multi-spawn spell.");
    }
    const malformed = decodeUnitRecordSync({
      ...root,
      mechanics: {
        ...root.mechanics,
        duration: { kind: "timed", value: { amount: 1, unit: "hour" } },
      },
    });
    const projection = projectPartialCharacterSheetSpell(malformed);
    expect(projection).toMatchObject({
      tag: "unreadable",
      issues: [{ code: "unsupportedSpellBranch" }],
    });
    if (projection.tag === "unreadable") {
      expect(projection.issues.map(issueCoordinate)).toEqual([
        "recordMechanics/generalFact:5",
      ]);
    }
  });

  test("reports an unsupported activation attachment as a branch issue", () => {
    const root = requireSpell("arcane_hand");
    if (root.mechanics.family !== "activation") {
      throw new Error("Expected an activation spell.");
    }
    const phase = root.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected a direct activation phase.");
    }
    const malformed = decodeUnitRecordSync({
      ...root,
      mechanics: {
        ...root.mechanics,
        phases: [{ ...phase, attachment: { kind: "object", count: 1 } }],
      },
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
              { kind: "occurrence", role: "generalFact", ordinal: 1 },
            ],
          },
        },
      ],
    });
  });

  test("accumulates extra effects in a Character Sheet-owned phase", () => {
    const prayerOfHealing = requireSpell("prayer_of_healing");
    if (prayerOfHealing.mechanics.family !== "activation") {
      throw new Error("Expected Prayer of Healing to be an activation spell.");
    }
    const phase = prayerOfHealing.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected Prayer of Healing to have a direct phase.");
    }
    const malformed = decodeUnitRecordSync({
      ...prayerOfHealing,
      mechanics: {
        ...prayerOfHealing.mechanics,
        phases: [
          {
            ...phase,
            effects: [
              ...(phase.effects ?? []),
              { kind: "none" },
              { kind: "none" },
            ],
          },
        ],
      },
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
              { kind: "occurrence", role: "effect", ordinal: 4 },
            ],
          },
        },
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
              { kind: "occurrence", role: "effect", ordinal: 5 },
            ],
          },
        },
      ],
    });
  });

  test("reports a missing required rest-benefit effect at the phase path", () => {
    const prayerOfHealing = requireSpell("prayer_of_healing");
    if (prayerOfHealing.mechanics.family !== "activation") {
      throw new Error("Expected Prayer of Healing to be an activation spell.");
    }
    const phase = prayerOfHealing.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected Prayer of Healing to have a direct phase.");
    }
    const malformed = decodeUnitRecordSync({
      ...prayerOfHealing,
      mechanics: {
        ...prayerOfHealing.mechanics,
        phases: [
          {
            ...phase,
            effects: (phase.effects ?? []).filter(
              (effect) => effect.kind !== "grant_rest_benefit",
            ),
          },
        ],
      },
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
            ],
          },
        },
      ],
    });
  });

  test("rejects an owned effect substituted into the reincarnation shape", () => {
    const reincarnate = requireSpell("reincarnate");
    const greaterRestoration = requireSpell("greater_restoration");
    if (
      reincarnate.mechanics.family !== "activation" ||
      greaterRestoration.mechanics.family !== "activation"
    ) {
      throw new Error("Expected activation spell fixtures.");
    }
    const reincarnationPhase = reincarnate.mechanics.phases[0];
    const restorationPhase = greaterRestoration.mechanics.phases[0];
    const removeConditionEffect =
      restorationPhase?.kind === "direct"
        ? restorationPhase.effects?.[0]
        : undefined;
    if (
      reincarnationPhase?.kind !== "direct" ||
      removeConditionEffect?.kind !== "remove_condition"
    ) {
      throw new Error("Expected reincarnation and restoration phase fixtures.");
    }
    const malformed = decodeUnitRecordSync({
      ...reincarnate,
      mechanics: {
        ...reincarnate.mechanics,
        phases: [
          {
            ...reincarnationPhase,
            effects: [removeConditionEffect],
          },
        ],
      },
    });
    expect(projectPartialCharacterSheetSpell(malformed)).toMatchObject({
      tag: "unreadable",
      issues: [
        {
          code: "unsupportedSpellBranch",
          mechanicsPath: {
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "occurrence", role: "procedure", ordinal: 1 },
              { kind: "occurrence", role: "effect", ordinal: 1 },
            ],
          },
        },
      ],
    });
  });
});

function expectCoordinates(
  rootId: (typeof partialRootIds)[number],
  expected: readonly string[],
): void {
  const projection = projectPartialCharacterSheetSpell(requireSpell(rootId));
  if (projection.tag !== "readable") {
    throw new Error(`Expected readable projection for ${rootId}.`);
  }
  expect(projection.value.evidence.map(evidenceCoordinate)).toEqual(
    expect.arrayContaining([...expected]),
  );
}

function requireSpell(id: string): SpellRecord {
  const root = srdUnitCollection.units.find(
    (unit) => unit.kind === "spell" && unit.id === id,
  );
  if (root === undefined || root.kind !== "spell") {
    throw new Error(`Expected SRD spell ${id}.`);
  }
  return root;
}

function evidenceCoordinate(evidence: CharacterSheetSpellPathEvidence): string {
  return `${evidence.disposition}|${evidence.branch}|${pathCoordinate(evidence.mechanicsPath.nodes)}`;
}

function issueCoordinate(
  issue: Extract<
    ReturnType<typeof projectPartialCharacterSheetSpell>,
    { readonly tag: "unreadable" }
  >["issues"][number],
): string {
  return pathCoordinate(issue.mechanicsPath.nodes);
}

function expectDurationIssues(
  spell: UnitRecord,
  expectedCoordinates: readonly string[],
): void {
  const projection = projectPartialCharacterSheetSpell(spell);
  expect(projection).toMatchObject({
    tag: "unreadable",
    issues: expectedCoordinates.map(() => ({ code: "unsupportedSpellBranch" })),
  });
  if (projection.tag === "unreadable") {
    expect(projection.issues.map(issueCoordinate)).toEqual(expectedCoordinates);
  }
}

function pathCoordinate(
  nodes: CharacterSheetSpellPathEvidence["mechanicsPath"]["nodes"],
): string {
  return nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
}

function expectedActivation(options?: {
  readonly material?: readonly string[];
  readonly duration?: readonly string[];
  readonly repeatSaves?: number;
  readonly effectDisposition?: "consumed" | "unowned";
  readonly effectCount?: number;
}): readonly string[] {
  return [
    ...commonCoordinates.slice(0, 4),
    ...(options?.material ?? []),
    commonCoordinates[4],
    ...(options?.duration ?? []),
    commonCoordinates[5],
    commonCoordinates[6],
    activationPhase,
    phaseAttachment,
    ...numberedCoordinates(
      options?.repeatSaves ?? 0,
      (ordinal) =>
        `unowned|repeat saving throw|recordMechanics/procedure:1/procedure:${ordinal}`,
    ),
    ...numberedCoordinates(
      options?.effectCount ?? 1,
      (ordinal) =>
        `${options?.effectDisposition ?? "unowned"}|phase effect execution|recordMechanics/procedure:1/effect:${ordinal}`,
    ),
  ];
}

function expectedOngoing(
  operationCount: number,
  hasInitialPhase = false,
): readonly string[] {
  return [
    ...commonCoordinates.slice(0, 5),
    durationLimit,
    commonCoordinates[5],
    commonCoordinates[6],
    "consumed|ongoing attachment|recordMechanics/effect:1",
    ...(hasInitialPhase
      ? ["consumed|ongoing initial phase|recordMechanics/action"]
      : []),
    ...numberedCoordinates(
      operationCount,
      (ordinal) =>
        `unowned|ongoing operation execution|recordMechanics/procedure:${ordinal}/effect:1`,
    ),
  ];
}

function expectedTemplatedSpawn(): readonly string[] {
  return [
    ...commonCoordinates.slice(0, 5),
    durationLimit,
    commonCoordinates[5],
    commonCoordinates[6],
    "consumed|spawn capacity|recordMechanics/resource",
    "consumed|spawn stat block execution|recordMechanics/effect:1",
    ...numberedCoordinates(
      3,
      (ordinal) =>
        `consumed|spawn size tier|recordMechanics/extension:${ordinal}`,
    ),
    "unowned|spawn control execution|recordMechanics/procedure:1",
    "unowned|zero-hit-point reversion|recordMechanics/effect:2",
  ];
}

function expectedSpawnedCreature(): readonly string[] {
  return [
    ...commonCoordinates.slice(0, 5),
    durationLimit,
    commonCoordinates[5],
    commonCoordinates[6],
    "consumed|spawned creature execution|recordMechanics/effect:1",
    "unowned|spawn control execution|recordMechanics/procedure:1",
    "unowned|spawn dismissal|recordMechanics/effect:2",
  ];
}

function numberedCoordinates(
  count: number,
  coordinate: (ordinal: number) => string,
): readonly string[] {
  return Array.from({ length: count }, (_, index) => coordinate(index + 1));
}
