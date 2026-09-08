import { spellSlotLevel } from "@dnd/shared/types";
import { spellMechanicsHeaderPath } from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";

import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { admitRegisteredSpellProcedures } from "./admission-registry.ts";

function admissionContextForTest() {
  const session = spellBattle({
    preparedSpells: [],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const actor = session.state.combatants.get(spellCasterId);
  if (actor === undefined) throw new Error("Expected test spellcaster.");
  const context = spellAdmissionContextFor(actor, session.state);
  if (context === null) throw new Error("Expected spell admission context.");
  return context;
}

describe("registered contextual spell admission result", () => {
  test("distinguishes an admitted root with no contextual invocation", () => {
    const spell = spellAdmissionSource(spellRecord("cure_wounds"));
    const result = admitRegisteredSpellProcedures(spell, {
      ...admissionContextForTest(),
      castingSource: spell.castingSource,
      spellCastOptions: [],
    });

    expect(result).toEqual({
      tag: "admitted",
      invocations: [],
      staticMechanics: [],
    });
  });

  test("preserves typed rejection issues", () => {
    const base = spellRecord("cure_wounds");
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: { ...base.mechanics, school: "evocation" },
    });
    const spell = spellAdmissionSource(malformed);
    const result = admitRegisteredSpellProcedures(spell, {
      ...admissionContextForTest(),
      castingSource: spell.castingSource,
      spellCastOptions: [
        { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
      ],
    });

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "directHitPointRestoration",
          failedFact: "school",
          mechanicsPath: spellMechanicsHeaderPath("school"),
          message:
            "Unsupported directHitPointRestoration mechanics fact: school.",
        },
      ],
    });
  });

  test("retains admitted static mechanics beside contextual invocations", () => {
    const spell = spellAdmissionSource(spellRecord("find_familiar"));
    const result = admitRegisteredSpellProcedures(spell, {
      ...admissionContextForTest(),
      castingSource: spell.castingSource,
      spellCastOptions: [],
    });

    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    expect(result.invocations).toEqual([]);
    expect(result.staticMechanics.map(({ procedure }) => procedure)).toEqual([
      "spawnedCompanionLifecycle",
    ]);
  });

  test("keeps a root without Battle ownership distinct", () => {
    const spell = spellAdmissionSource(spellRecord("identify"));
    const result = admitRegisteredSpellProcedures(spell, {
      ...admissionContextForTest(),
      castingSource: spell.castingSource,
      spellCastOptions: [],
    });

    expect(result).toEqual({ tag: "notBattleOwned" });
    expect(battleSpellExecutionSourceFromAdmission(spell)).not.toHaveProperty(
      "mechanics",
    );
  });
});
