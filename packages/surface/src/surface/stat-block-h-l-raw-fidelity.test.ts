import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";
import { defineRawStatBlockFidelityLane } from "./stat-block-raw-fidelity-lane.test-support.ts";
import { SrdStatBlockRecordSchema } from "./schema.ts";

const {
  source: SOURCE,
  equipmentSource: EQUIPMENT_SOURCE,
  occurrences: OCCURRENCES,
  records: INSTALLED,
} = defineRawStatBlockFidelityLane({
  label: "H–L",
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-H-L.md",
  authoredSourcePrefix: "Monsters/Monsters-H-L.md:",
  expectedRecordCount: 22,
});
const installedByName = new Map(
  INSTALLED.map((record) => [record.name, record]),
);
const decodeSrdStatBlockRecord = Schema.decodeUnknownSync(
  SrdStatBlockRecordSchema,
);
const expectedRawProjection = () =>
  projectRawStatBlocks(SOURCE, OCCURRENCES, INSTALLED, EQUIPMENT_SOURCE);

describe("H–L scoped RAW fidelity", () => {
  test("keeps the authored and RAW projections symmetric", () => {
    expect(projectAuthoredStatBlocks(INSTALLED)).toEqual(
      projectRawStatBlocks(SOURCE, OCCURRENCES, INSTALLED, EQUIPMENT_SOURCE),
    );
  });

  test("rejects chosen-resistance, immunity, gear, and size mutations", () => {
    const halfDragon = installedByName.get("Half-Dragon");
    const hydra = installedByName.get("Hydra");
    const kobold = installedByName.get("Kobold Warrior");
    const knight = installedByName.get("Knight");
    if (
      halfDragon?.statBlock.resistances?.kind !== "choose_one_from" ||
      hydra?.statBlock.immunities?.conditions === undefined ||
      kobold?.statBlock.gear === undefined ||
      knight === undefined
    ) {
      throw new Error("H–L general-fact probes require canonical fixtures");
    }
    const mutations = [
      decodeSrdStatBlockRecord({
        ...halfDragon,
        statBlock: {
          ...halfDragon.statBlock,
          resistances: {
            ...halfDragon.statBlock.resistances,
            options: halfDragon.statBlock.resistances.options.filter(
              (damageType) => damageType !== "acid",
            ),
          },
        },
      }),
      decodeSrdStatBlockRecord({
        ...hydra,
        statBlock: {
          ...hydra.statBlock,
          immunities: {
            ...hydra.statBlock.immunities,
            conditions: hydra.statBlock.immunities.conditions.filter(
              (condition) => condition !== "stunned",
            ),
          },
        },
      }),
      decodeSrdStatBlockRecord({
        ...kobold,
        statBlock: {
          ...kobold.statBlock,
          gear: kobold.statBlock.gear.map((entry) =>
            entry.item === "Dagger" ? { ...entry, quantity: 2 } : entry,
          ),
        },
      }),
      decodeSrdStatBlockRecord({
        ...knight,
        statBlock: { ...knight.statBlock, size: "medium" },
      }),
    ];

    for (const mutated of mutations) {
      expect(
        projectAuthoredStatBlocks(
          INSTALLED.map((record) =>
            record.id === mutated.id ? mutated : record,
          ),
        ),
      ).not.toEqual(expectedRawProjection());
    }
  });

  test("rejects communication, lair-use, spell-component, spell-tier, and recharge mutations", () => {
    const kraken = installedByName.get("Kraken");
    const lich = installedByName.get("Lich");
    const iceDevil = installedByName.get("Ice Devil");
    const lichSpellcasting = lich?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "spellcasting" &&
        entry.procedure.name === "Spellcasting",
    );
    const iceWallResource = iceDevil?.statBlock.resources?.find(
      (resource) => resource.limit.kind === "recharge",
    );
    if (
      kraken?.statBlock.communication.kind !== "understood_but_cannot_speak" ||
      kraken.statBlock.communication.telepathy === undefined ||
      kraken.statBlock.legendaryActions?.uses.kind !== "lair_bonus" ||
      lich === undefined ||
      lichSpellcasting?.kind !== "executable" ||
      lichSpellcasting.procedure.kind !== "spellcasting" ||
      iceDevil === undefined ||
      iceWallResource?.limit.kind !== "recharge"
    ) {
      throw new Error(
        "H–L procedure/resource probes require canonical fixtures",
      );
    }
    const lichSpellcastingProcedure = lichSpellcasting.procedure;
    const krakenWithoutTelepathy = decodeSrdStatBlockRecord({
      ...kraken,
      statBlock: {
        ...kraken.statBlock,
        communication: {
          kind: "understood_but_cannot_speak",
          languages: kraken.statBlock.communication.languages,
        },
      },
    });
    const krakenWithoutLairBonus = decodeSrdStatBlockRecord({
      ...kraken,
      statBlock: {
        ...kraken.statBlock,
        legendaryActions: {
          ...kraken.statBlock.legendaryActions,
          uses: { kind: "fixed", uses: 3 },
        },
      },
    });
    const lichWithoutTwoPerDayTier = decodeSrdStatBlockRecord({
      ...lich,
      statBlock: {
        ...lich.statBlock,
        actions: lich.statBlock.actions?.map((entry) =>
          entry === lichSpellcasting
            ? {
                ...entry,
                procedure: {
                  ...lichSpellcastingProcedure,
                  groups: lichSpellcastingProcedure.groups.filter(
                    (group) =>
                      group.kind !== "limited" ||
                      !group.resourceRefs.ordinals.some(
                        (ordinal) => Number(ordinal) === 1,
                      ),
                  ),
                },
              }
            : entry,
        ),
      },
    });
    const lichWithFixedComponents = decodeSrdStatBlockRecord({
      ...lich,
      statBlock: {
        ...lich.statBlock,
        actions: lich.statBlock.actions?.map((entry) =>
          entry === lichSpellcasting
            ? {
                ...entry,
                procedure: {
                  ...lichSpellcastingProcedure,
                  components: { v: true, s: true, m: "a component pouch" },
                },
              }
            : entry,
        ),
      },
    });
    const iceDevilWithEachRecharge = decodeSrdStatBlockRecord({
      ...iceDevil,
      statBlock: {
        ...iceDevil.statBlock,
        resources: iceDevil.statBlock.resources?.map((resource) =>
          resource === iceWallResource
            ? { ...resource, ownership: "each" }
            : resource,
        ),
      },
    });

    for (const mutated of [
      krakenWithoutTelepathy,
      krakenWithoutLairBonus,
      lichWithoutTwoPerDayTier,
      lichWithFixedComponents,
      iceDevilWithEachRecharge,
    ]) {
      expect(
        projectAuthoredStatBlocks(
          INSTALLED.map((record) =>
            record.id === mutated.id ? mutated : record,
          ),
        ),
      ).not.toEqual(expectedRawProjection());
    }
  });
});
