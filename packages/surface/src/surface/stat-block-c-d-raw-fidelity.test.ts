import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  projectAuthoredStatBlocks,
  projectRawStatBlocks,
} from "./stat-block-raw-projection.test-support.ts";
import { projectRawStatBlockSourceOccurrences } from "./stat-block-raw-fidelity-fixture.test-support.ts";
import { projectStatBlockScopedMechanicsList } from "./stat-block-scoped-fidelity.ts";
import { SrdStatBlockRecordSchema } from "./schema.ts";

const FIDELITY_FACT_NAMES = ["Cloaker", "Couatl", "Dretch"] as const;
const {
  statBlockSource: SOURCE,
  equipmentSource: EQUIPMENT_SOURCE,
  occurrences: OCCURRENCES,
  records: RECORDS,
  projection: RAW_PROJECTION,
} = projectRawStatBlockSourceOccurrences({
  sourcePath: ".references/srd-5.2.1/Monsters/Monsters-C-D.md",
  names: FIDELITY_FACT_NAMES,
});
const recordByName = new Map(RECORDS.map((record) => [record.name, record]));
const decodeSrdStatBlockRecord = Schema.decodeUnknownSync(
  SrdStatBlockRecordSchema,
);

const rawProjectionFor = (name: (typeof FIDELITY_FACT_NAMES)[number]) =>
  RAW_PROJECTION.filter((projection) => projection.name === name);

describe("C–D source-relative fidelity facts", () => {
  test("detects a source-relative attack condition expiry mutation", () => {
    const couatl = recordByName.get("Couatl");
    const bite = couatl?.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" &&
        entry.procedure.kind === "attack_roll" &&
        entry.procedure.onHit.some(
          (effect) =>
            effect.kind === "apply_condition" && "expiresAt" in effect,
        ),
    );
    if (
      couatl === undefined ||
      bite?.kind !== "executable" ||
      bite.procedure.kind !== "attack_roll"
    ) {
      throw new Error("C–D expiry mutation requires the attack fixture");
    }
    expect(projectAuthoredStatBlocks([couatl], EQUIPMENT_SOURCE)).toEqual(
      rawProjectionFor("Couatl"),
    );
    const biteProcedure = bite.procedure;
    const mutated = decodeSrdStatBlockRecord({
      ...couatl,
      statBlock: {
        ...couatl.statBlock,
        actions: couatl.statBlock.actions?.map((entry) =>
          entry === bite
            ? {
                ...bite,
                procedure: {
                  ...biteProcedure,
                  onHit: biteProcedure.onHit.map((effect) =>
                    effect.kind === "apply_condition" && "expiresAt" in effect
                      ? {
                          ...effect,
                          expiresAt: { kind: "target_next_turn_end" },
                        }
                      : effect,
                  ),
                },
              }
            : entry,
        ),
      },
    });

    expect(projectAuthoredStatBlocks([mutated], EQUIPMENT_SOURCE)).not.toEqual(
      rawProjectionFor("Couatl"),
    );
  });

  test("detects a telepathy language-understanding mutation", () => {
    const dretch = recordByName.get("Dretch");
    const telepathy = dretch?.statBlock.communication.telepathy;
    if (dretch === undefined || telepathy === undefined) {
      throw new Error(
        "C–D telepathy mutation requires the communication fixture",
      );
    }
    expect(projectAuthoredStatBlocks([dretch], EQUIPMENT_SOURCE)).toEqual(
      rawProjectionFor("Dretch"),
    );
    const mutated = decodeSrdStatBlockRecord({
      ...dretch,
      statBlock: {
        ...dretch.statBlock,
        communication: {
          ...dretch.statBlock.communication,
          telepathy: {
            rangeFeet: telepathy.rangeFeet,
            ...(telepathy.response === undefined
              ? {}
              : { response: telepathy.response }),
          },
        },
      },
    });

    expect(projectAuthoredStatBlocks([mutated], EQUIPMENT_SOURCE)).not.toEqual(
      rawProjectionFor("Dretch"),
    );
  });

  test("detects a Short-or-Long-Rest recharge mutation", () => {
    const cloaker = recordByName.get("Cloaker");
    const restResource = cloaker?.statBlock.resources?.find(
      (resource) => resource.limit.kind === "recharge_after_rest",
    );
    if (cloaker === undefined || restResource === undefined) {
      throw new Error("C–D recharge mutation requires the resource fixture");
    }
    expect(
      projectStatBlockScopedMechanicsList(
        projectAuthoredStatBlocks([cloaker], EQUIPMENT_SOURCE),
      ),
    ).toEqual(projectStatBlockScopedMechanicsList(rawProjectionFor("Cloaker")));
    const mutated = decodeSrdStatBlockRecord({
      ...cloaker,
      statBlock: {
        ...cloaker.statBlock,
        resources: cloaker.statBlock.resources?.map((resource) =>
          resource === restResource
            ? { ...resource, limit: { kind: "daily", uses: 1 } }
            : resource,
        ),
      },
    });

    expect(
      projectStatBlockScopedMechanicsList(
        projectAuthoredStatBlocks([mutated], EQUIPMENT_SOURCE),
      ),
    ).not.toEqual(
      projectStatBlockScopedMechanicsList(rawProjectionFor("Cloaker")),
    );
  });

  test("keeps the three repaired facts symmetric together", () => {
    expect(
      projectStatBlockScopedMechanicsList(
        projectAuthoredStatBlocks(RECORDS, EQUIPMENT_SOURCE),
      ),
    ).toEqual(
      projectStatBlockScopedMechanicsList(
        projectRawStatBlocks(SOURCE, OCCURRENCES, EQUIPMENT_SOURCE),
      ),
    );
  });
});
