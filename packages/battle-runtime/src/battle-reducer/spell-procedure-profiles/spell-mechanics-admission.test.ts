import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import { unitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  admitBattleSpellMechanicsFrom,
  BATTLE_SPELL_ROOT_MECHANICS_PATH,
  type AnySpellProcedureMechanicsAdmission,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
} from "./spell-mechanics-admission.ts";
import { registeredSpellProcedureMechanicsAdmissions } from "./admission-registry.ts";

const spellMechanics = spellRecord("fire_bolt").mechanics;

function supportedAdmission(
  procedure: AnySpellProcedureMechanicsAdmission["procedure"],
  evidence: SpellProcedureMechanicsEvidence,
): AnySpellProcedureMechanicsAdmission {
  return {
    procedure,
    admitMechanics: (_mechanics: SpellMechanics) => ({
      tag: "supported",
      procedure: {
        binding: "ready",
        procedure,
        facts: { kind: "syntheticSpellProcedureFacts" },
        evidence,
      },
    }),
  };
}

function unsupportedAdmission(
  procedure: AnySpellProcedureMechanicsAdmission["procedure"],
  failedFact: string,
  mechanicsPath: ReturnType<typeof unitMechanicsPath>,
): AnySpellProcedureMechanicsAdmission {
  const issue: SpellProcedureAdmissionIssue = {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Synthetic ${failedFact} is not owned by this profile.`,
  };
  return {
    procedure,
    admitMechanics: (_mechanics: SpellMechanics) => ({
      tag: "unsupported",
      issues: [issue],
    }),
  };
}

describe("battle spell static mechanics admission", () => {
  test("derives static readers from the canonical declaration view", () => {
    const admissions = registeredSpellProcedureMechanicsAdmissions();
    const procedures = admissions.map(({ procedure }) => procedure);

    expect(admissions.length).toBeGreaterThan(0);
    expect(new Set(procedures).size).toBe(procedures.length);
  });

  test("keeps complete and partial evidence structurally distinct", () => {
    const nestedPhasePath = unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      {
        kind: "occurrence",
        role: "procedure",
        ordinal: PositiveInteger(1),
      },
      { kind: "occurrence", role: "effect", ordinal: PositiveInteger(1) },
    ]);
    const result = admitBattleSpellMechanicsFrom(spellMechanics, [
      supportedAdmission("spellAttackDamage", {
        consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
        unowned: [],
      }),
      supportedAdmission("saveGatedDamage", {
        consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
        unowned: [nestedPhasePath],
      }),
    ]);

    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    expect(result.procedures).toHaveLength(2);
    expect(result.procedures[0]?.evidence).toEqual({
      consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
      unowned: [],
    });
    expect(result.procedures[1]?.evidence).toEqual({
      consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
      unowned: [nestedPhasePath],
    });
  });

  test("accumulates every represented unsupported issue", () => {
    const firstPath = unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      {
        kind: "occurrence",
        role: "generalFact",
        ordinal: PositiveInteger(4),
      },
      { kind: "occurrence", role: "resource", ordinal: PositiveInteger(1) },
    ]);
    const secondPath = unitMechanicsPath([
      { kind: "singleton", role: "recordMechanics" },
      {
        kind: "occurrence",
        role: "procedure",
        ordinal: PositiveInteger(1),
      },
      {
        kind: "occurrence",
        role: "procedure",
        ordinal: PositiveInteger(1),
      },
    ]);
    const result = admitBattleSpellMechanicsFrom(spellMechanics, [
      unsupportedAdmission("spellAttackDamage", "materialCost", firstPath),
      unsupportedAdmission("saveGatedDamage", "repeatSave", secondPath),
    ]);

    expect(result).toEqual({
      tag: "rejected",
      issues: [
        expect.objectContaining({
          procedure: "spellAttackDamage",
          failedFact: "materialCost",
          mechanicsPath: firstPath,
        }),
        expect.objectContaining({
          procedure: "saveGatedDamage",
          failedFact: "repeatSave",
          mechanicsPath: secondPath,
        }),
      ],
    });
  });

  test("does not make an unowned root a capability prerequisite", () => {
    expect(admitBattleSpellMechanicsFrom(spellMechanics, [])).toEqual({
      tag: "notBattleOwned",
    });
  });

  test("static facts are invariant under a renamed synthetic authored record", () => {
    const original = spellRecord("fire_bolt");
    const renamedSynthetic = {
      ...original,
      id: unitId("synthetic_spell_for_parity"),
      name: "Synthetic Ember",
    };
    const admissions = [
      supportedAdmission("spellAttackDamage", {
        consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
        unowned: [],
      }),
    ];

    const originalAdmission = admitBattleSpellMechanicsFrom(
      original.mechanics,
      admissions,
    );
    const renamedAdmission = admitBattleSpellMechanicsFrom(
      renamedSynthetic.mechanics,
      admissions,
    );

    expect(renamedAdmission).toEqual(originalAdmission);
  });

  test("a complete-root control rejects an unsupported represented branch", () => {
    const result = admitBattleSpellMechanicsFrom(spellMechanics, [
      unsupportedAdmission(
        "spellAttackDamage",
        "extraPhase",
        BATTLE_SPELL_ROOT_MECHANICS_PATH,
      ),
    ]);

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues[0]).toMatchObject({
      failedFact: "extraPhase",
      mechanicsPath: BATTLE_SPELL_ROOT_MECHANICS_PATH,
    });
  });
});
