import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { spatialMeleeSpellAttackProxyProfile } from "./spatial-melee-spell-attack-proxy.ts";

import {
  mechanicsSource,
  mechanicsSourceWithBaseDefinitionFacts,
  issuesOf,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Spatial melee spell-attack proxy admission", () => {
  test("recognizes Spiritual Weapon repeat roles after composite-effect reordering", () => {
    const base = spellRecord("spiritual_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_ongoing_spiritual_weapon_reordered",
      name: "Synthetic Ongoing Procedure Spiritual Weapon Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_ongoing_spiritual_weapon_reordered",
      },
      mechanics: {
        ...base.mechanics,
        operations: base.mechanics.operations.map((operation) =>
          operation.effect.kind !== "composite_ongoing"
            ? operation
            : {
                ...operation,
                effect: {
                  ...operation.effect,
                  effects: [...operation.effect.effects].reverse(),
                },
              },
        ),
      },
    });
    const result = spatialMeleeSpellAttackProxyProfile.admitMechanics(
      mechanicsSource(reordered),
    );
    expect(result.tag).toBe("supported");
  });

  test("reports the full dependent issue set for deleted and replaced spatial-proxy attachments", () => {
    const base = spellRecord("spiritual_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const deletedAttachment = { ...base.mechanics };
    Reflect.deleteProperty(deletedAttachment, "attachment");
    const replacedAttachment = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    for (const mechanics of [deletedAttachment, replacedAttachment]) {
      const result = spatialMeleeSpellAttackProxyProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
        {
          failedFact: "initialPhase",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
        {
          failedFact: "initialAttack",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
        {
          failedFact: "repeatAttack",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
        },
      ]);
    }
  });
});
