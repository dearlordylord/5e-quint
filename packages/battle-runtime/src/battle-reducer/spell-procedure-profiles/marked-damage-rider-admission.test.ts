import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Result, Schema } from "effect";
import { MarkedDamageRiderAbilityCheckBehaviorSchema } from "../../active-effect/codecs.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { markedDamageRiderProfile } from "./marked-damage-rider.ts";

import {
  mechanicsSource,
  mechanicsSourceWithBaseDefinitionFacts,
  issuesOf,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Marked-damage-rider spell procedure admission", () => {
  test("recognizes Hunter's Mark roles after operation reordering", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_ongoing_hunters_mark_reordered",
      name: "Synthetic Ongoing Procedure Hunter's Mark Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_ongoing_hunters_mark_reordered",
      },
      mechanics: {
        ...base.mechanics,
        operations: [...base.mechanics.operations].reverse(),
      },
    });
    const originalResult = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(base),
    );
    const reorderedResult = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(reordered),
    );
    expect(originalResult.tag).toBe("supported");
    expect(reorderedResult.tag).toBe("supported");
    if (
      originalResult.tag !== "supported" ||
      reorderedResult.tag !== "supported"
    ) {
      return;
    }
    expect(reorderedResult.admitted.facts).toEqual(
      originalResult.admitted.facts,
    );
  });

  test("retains Hex ownership and accumulates exact issues after attachment deletion", () => {
    const base = spellRecord("hex");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = {
      ...base.mechanics,
      range: { kind: "self" as const },
    };
    Reflect.deleteProperty(mechanics, "attachment");
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its selection is deleted", () => {
    const base = spellRecord("hunters_mark");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.attachment.kind !== "hole" ||
      base.mechanics.attachment.value.kind !== "mark"
    ) {
      throw new Error("Expected mark attachment mechanics.");
    }
    const markValue = { ...base.mechanics.attachment.value };
    Reflect.deleteProperty(markValue, "selection");
    const malformed = {
      ...base,
      mechanics: {
        ...base.mechanics,
        attachment: { ...base.mechanics.attachment, value: markValue },
      },
    };
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its selection is replaced", () => {
    const base = spellRecord("hex");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.attachment.kind !== "hole" ||
      base.mechanics.attachment.value.kind !== "mark"
    ) {
      throw new Error("Expected mark attachment mechanics.");
    }
    const mechanics = {
      ...base.mechanics,
      attachment: {
        ...base.mechanics.attachment,
        value: {
          ...base.mechanics.attachment.value,
          selection: {
            mode: "one" as const,
            targetKinds: ["object"] as const,
          },
        },
      },
    };
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains marked-rider ownership after its attachment is replaced", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("the marked-rider decoder makes noncanonical finding skills impossible", () => {
    const decode = Schema.decodeUnknownResult(
      MarkedDamageRiderAbilityCheckBehaviorSchema,
    );
    expect(
      Result.isSuccess(
        decode({
          kind: "findingAdvantage",
          ability: "wis",
          skills: ["perception", "survival"],
        }),
      ),
    ).toBe(true);
    for (const skills of [
      ["perception", "perception"],
      ["survival", "perception"],
      ["perception", "survival", "athletics"],
    ]) {
      expect(
        Result.isFailure(
          decode({ kind: "findingAdvantage", ability: "wis", skills }),
        ),
      ).toBe(true);
    }
  });

  test("fails closed when Hunter's Mark adds an unowned operation", () => {
    const base = spellRecord("hunters_mark");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const extraOperation = base.mechanics.operations[0];
    if (extraOperation === undefined) {
      throw new Error("Expected a Hunter's Mark operation.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_ongoing_hunters_mark_extra_operation",
      name: "Synthetic Ongoing Procedure Hunter's Mark Extra Operation",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_ongoing_hunters_mark_extra_operation",
      },
      mechanics: {
        ...base.mechanics,
        operations: [...base.mechanics.operations, extraOperation],
      },
    });
    const result = markedDamageRiderProfile.admitMechanics(
      mechanicsSource(malformed),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(3)),
      },
    ]);
  });
});
