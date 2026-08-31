import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import { unitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import { registeredSpellProcedureMechanicsAdmissions } from "./admission-registry.ts";
import {
  admitBattleSpellMechanicsFrom,
  BATTLE_SPELL_ROOT_MECHANICS_PATH,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsAdmissionDeclaration,
  type SpellProcedureMechanicsEvidence,
} from "./spell-mechanics-admission.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";

const spellMechanics = spellRecord("fire_bolt").mechanics;
const mechanicsSource: SpellMechanicsAdmissionSource = {
  mechanics: spellMechanics,
  spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(spellMechanics),
};

function supportedAdmission<P extends BattleSpellProcedureKey>(
  procedure: P,
  evidence: SpellProcedureMechanicsEvidence,
): SpellProcedureMechanicsAdmissionDeclaration<P> {
  return {
    admitMechanics: (_source: SpellMechanicsAdmissionSource) => ({
      tag: "supported",
      admitted: {
        binding: "ready",
        procedure,
        facts: mechanicsSource.spellDefinitionRuleFacts,
        evidence,
        admit: (_executionSource, _ctx) => [],
      },
    }),
  };
}

function unsupportedAdmission<P extends BattleSpellProcedureKey>(
  procedure: P,
  failedFact: string,
  mechanicsPath: ReturnType<typeof unitMechanicsPath>,
): SpellProcedureMechanicsAdmissionDeclaration<P> {
  const issue: SpellProcedureAdmissionIssue<P> = {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Synthetic ${failedFact} is not owned by this profile.`,
  };
  return {
    admitMechanics: (_source: SpellMechanicsAdmissionSource) => ({
      tag: "unsupported",
      issues: [issue],
    }),
  };
}

describe("battle spell static mechanics admission", () => {
  test("derives static readers from the canonical declaration view", () => {
    const admissions = registeredSpellProcedureMechanicsAdmissions();

    expect(admissions.length).toBeGreaterThan(0);
    expect(admissions.every((admission) => "admitMechanics" in admission)).toBe(
      true,
    );
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
    const result = admitBattleSpellMechanicsFrom(mechanicsSource, [
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
    expect(result.procedures[0]?.procedure).toBe("spellAttackDamage");
    expect(result.procedures[0]?.evidence).toEqual({
      consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
      unowned: [],
    });
    expect(result.procedures[1]?.procedure).toBe("saveGatedDamage");
    expect(result.procedures[1]?.evidence).toEqual({
      consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
      unowned: [nestedPhasePath],
    });
  });

  test("accumulates every unsupported issue and rejects the whole root", () => {
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
    const result = admitBattleSpellMechanicsFrom(mechanicsSource, [
      supportedAdmission("spellHostedWeaponAttack", {
        consumed: [BATTLE_SPELL_ROOT_MECHANICS_PATH],
        unowned: [],
      }),
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
    expect(admitBattleSpellMechanicsFrom(mechanicsSource, [])).toEqual({
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
      {
        mechanics: original.mechanics,
        spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
          original.mechanics,
        ),
      },
      admissions,
    );
    const renamedAdmission = admitBattleSpellMechanicsFrom(
      {
        mechanics: renamedSynthetic.mechanics,
        spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
          renamedSynthetic.mechanics,
        ),
      },
      admissions,
    );

    if (
      originalAdmission.tag !== "admitted" ||
      renamedAdmission.tag !== "admitted"
    ) {
      throw new Error("Expected both synthetic records to be admitted.");
    }
    expect(
      renamedAdmission.procedures.map(
        ({ admit: _admit, ...procedure }) => procedure,
      ),
    ).toEqual(
      originalAdmission.procedures.map(
        ({ admit: _admit, ...procedure }) => procedure,
      ),
    );
  });

  test("a complete-root control rejects an unsupported represented branch", () => {
    const result = admitBattleSpellMechanicsFrom(mechanicsSource, [
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
