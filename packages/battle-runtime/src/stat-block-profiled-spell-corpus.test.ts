// RAW-COVERAGE: verification-owner:runtime-test RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import {
  isolatedSpellcastingAdmission,
  spellcastingIsolationBase,
} from "./stat-block-spellcasting-admission.test-support.ts";
import { readFileSync } from "node:fs";
import { Schema, Result } from "effect";
import { describe, expect, it } from "vitest";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { StatBlockProcedureOrdinalSchema } from "@dnd/surface/surface/schema";
import { PositiveInteger } from "@dnd/shared/types";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import { battleId, unitLibrary } from "./battle-runtime.test-support.ts";
import { combatantId, initiativeScore } from "./identity.ts";

const InventorySchema = Schema.Struct({
  spellReferenceClassifications: Schema.Array(
    Schema.Struct({
      rowId: Schema.String,
      profileStatus: Schema.Literals(["profiled", "unprofiled"]),
    }),
  ),
  occurrences: Schema.Array(Schema.Unknown),
});
const SpellReferenceOccurrenceSchema = Schema.Struct({
  rowId: Schema.String,
  kind: Schema.Literal("spellReference"),
  witness: Schema.Struct({
    statBlockId: Schema.String,
    location: Schema.Struct({
      kind: Schema.Literal("spellReference"),
      section: Schema.Literals([
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ]),
      procedureOrdinal: StatBlockProcedureOrdinalSchema,
      groupOrdinal: Schema.Number.pipe(
        Schema.fromBrand("PositiveInteger", PositiveInteger),
      ),
      spellOrdinal: Schema.Number.pipe(
        Schema.fromBrand("PositiveInteger", PositiveInteger),
      ),
    }),
  }),
});

describe("profiled Stat Block spell corpus production admission", () => {
  it("keeps the unchanged whole-parent rejection precise", () => {
    const record = srdStatBlockCollection.statBlocks.find(
      (candidate) => candidate.name === "Adult Black Dragon",
    );
    if (record === undefined)
      throw new Error("Expected shipped parent witness.");
    const started = startBattle({
      battleId: battleId("whole-parent-negative"),
      combatants: [
        {
          combatantId: combatantId("whole-parent"),
          statBlock: record,
          unitCatalog: unitLibrary,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          conditions: [],
        },
      ],
    });
    expect(Result.isFailure(started)).toBe(true);
    if (Result.isFailure(started))
      expect(started.failure).toMatchObject({
        tag: "statBlockProjectionFailure",
        failure: { reason: "unsupportedLairConditionalLegendaryActionUses" },
      });
  });

  it("retains an unchanged whole-parent positive", () => {
    const record = srdStatBlockCollection.statBlocks.find(
      (candidate) => candidate.name === "Priest",
    );
    expect(record).toBeDefined();
    if (record === undefined) return;
    const started = startBattle({
      battleId: battleId("whole-parent-positive"),
      combatants: [
        {
          combatantId: combatantId("whole-parent"),
          statBlock: record,
          size: "medium",
          unitCatalog: unitLibrary,
          initiative: initiativeScore(20),
          ammunitionStocks: [],
          conditions: [],
        },
      ],
    });
    expect(started).toMatchObject({ _tag: "Success" });
  });

  it("admits 101 profiled spell procedures and preserves three precise missing-caster-fact failures", () => {
    const inventory = Schema.decodeUnknownSync(InventorySchema)(
      JSON.parse(
        readFileSync(
          new URL(
            "../../../plans/stat-block-procedure-pressure/inventory.json",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
    );
    const occurrences = inventory.occurrences.filter(
      Schema.is(SpellReferenceOccurrenceSchema),
    );
    const profiledRows = inventory.spellReferenceClassifications.filter(
      (row) => row.profileStatus === "profiled",
    );
    expect(profiledRows).toHaveLength(104);
    const failures: string[] = [];
    let executableCount = 0;
    let unprofiledUnsupportedCount = 0;
    const unprofiledExecutable: string[] = [];
    expect(inventory.spellReferenceClassifications).toHaveLength(286);
    for (const row of inventory.spellReferenceClassifications) {
      const occurrence = occurrences.find(
        (candidate) => candidate.rowId === row.rowId,
      );
      if (occurrence === undefined)
        throw new Error("Expected profiled row witness.");
      const record = srdStatBlockCollection.statBlocks.find(
        (candidate) => candidate.id === occurrence.witness.statBlockId,
      );
      if (record === undefined)
        throw new Error("Expected shipped Stat Block record.");
      const location = occurrence.witness.location;
      if (location.section !== "actions" && location.section !== "bonusActions")
        throw new Error("Expected initial casting section.");
      const authoredEntry = record.statBlock[location.section]?.find(
        (candidate) => candidate.procedureOrdinal === location.procedureOrdinal,
      );
      if (
        authoredEntry?.kind !== "executable" ||
        authoredEntry.procedure.kind !== "spellcasting"
      )
        throw new Error("Expected canonical authored spellcasting procedure.");
      const admission = isolatedSpellcastingAdmission({
        isolationBase: spellcastingIsolationBase(),
        record,
        section: location.section,
        entry: authoredEntry,
        unitCatalog: unitLibrary,
      });
      if (Result.isFailure(admission)) {
        failures.push(`${row.rowId}: ${JSON.stringify(admission.failure)}`);
        continue;
      }
      const procedure = admission.success;
      const invocation =
        procedure.groups[Number(location.groupOrdinal) - 1]?.invocations[
          Number(location.spellOrdinal) - 1
        ];
      if (invocation?.dispatch.kind === "executable") {
        if (row.profileStatus !== "profiled")
          unprofiledExecutable.push(
            `${record.name} ${authoredEntry.procedure.groups[Number(location.groupOrdinal) - 1]?.spells[Number(location.spellOrdinal) - 1]?.spellId}: ${invocation.dispatch.executions.map((execution) => execution.procedure).join(",")}`,
          );
        executableCount += 1;
      } else if (row.profileStatus === "unprofiled") {
        expect(invocation?.dispatch.kind).toBe("unsupported");
        unprofiledUnsupportedCount += 1;
      } else
        failures.push(
          `${row.rowId} ${record.name} ${authoredEntry.procedure.groups[Number(location.groupOrdinal) - 1]?.spells[Number(location.spellOrdinal) - 1]?.spellId}: ${invocation?.dispatch.kind === "unsupported" ? invocation.dispatch.reason : "missing canonical invocation"}`,
        );
    }
    expect(unprofiledExecutable).toEqual([]);
    expect(
      failures.filter((failure) => !failure.includes("missingCaster")),
    ).toEqual([]);
    expect(failures).toHaveLength(3);
    expect(executableCount).toBe(101);
    expect(unprofiledUnsupportedCount).toBe(182);
    expect(
      failures.filter((failure) =>
        failure.endsWith("missingCasterAttackBonus"),
      ),
    ).toHaveLength(2);
    expect(
      failures.filter((failure) => failure.endsWith("missingCasterSaveDc")),
    ).toHaveLength(1);
    expect(
      failures.some((failure) =>
        failure.includes("missingChildProcedureOwner"),
      ),
    ).toBe(false);
  });
});
