import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  admitBattleSpellMechanicsFrom,
  admitSpellTargetAttachment,
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
    admitMechanics: () => ({
      tag: "supported",
      admitted: {
        binding: "ready",
        procedure,
        facts: mechanicsSource.spellDefinitionRuleFacts,
        evidence,
        admit: () => [],
      },
    }),
  };
}

function unsupportedAdmission<P extends BattleSpellProcedureKey>(
  procedure: P,
  failedFact: string,
  mechanicsPath: UnitMechanicsPath,
): SpellProcedureMechanicsAdmissionDeclaration<P> {
  const issue: SpellProcedureAdmissionIssue<P> = {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Synthetic ${failedFact} is not owned by this profile.`,
  };
  return {
    admitMechanics: () => ({
      tag: "unsupported",
      issues: [issue],
    }),
  };
}

describe("battle spell static mechanics admission", () => {
  test("keeps complete and partial evidence structurally distinct", () => {
    const headerPath = spellMechanicsHeaderPath("level");
    const phasePath = spellActivationPhasePath(PositiveInteger(1));
    const effectPath = spellActivationEffectPath(
      PositiveInteger(1),
      PositiveInteger(1),
    );
    const result = admitBattleSpellMechanicsFrom(mechanicsSource, [
      supportedAdmission("spellAttackDamage", {
        consumed: [headerPath, phasePath, effectPath],
        unowned: [],
      }),
      supportedAdmission("saveGatedDamage", {
        consumed: [headerPath, phasePath],
        unowned: [effectPath],
      }),
    ]);

    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    expect(result.procedures).toHaveLength(2);
    expect(result.procedures[0]?.procedure).toBe("spellAttackDamage");
    expect(result.procedures[0]?.evidence).toEqual({
      consumed: [headerPath, phasePath, effectPath],
      unowned: [],
    });
    expect(result.procedures[1]?.procedure).toBe("saveGatedDamage");
    expect(result.procedures[1]?.evidence).toEqual({
      consumed: [headerPath, phasePath],
      unowned: [effectPath],
    });
  });

  test("accumulates every unsupported issue and rejects the whole root", () => {
    const firstPath = spellMaterialComponentPath("cost");
    const secondPath = spellActivationRepeatPath(
      PositiveInteger(1),
      PositiveInteger(1),
    );
    const result = admitBattleSpellMechanicsFrom(mechanicsSource, [
      supportedAdmission("spellHostedWeaponAttack", {
        consumed: [spellMechanicsHeaderPath("family")],
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
        consumed: [spellMechanicsHeaderPath("family")],
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
        spellMechanicsRootPath(),
      ),
    ]);

    expect(result.tag).toBe("rejected");
    if (result.tag !== "rejected") return;
    expect(result.issues[0]).toMatchObject({
      failedFact: "extraPhase",
      mechanicsPath: spellMechanicsRootPath(),
    });
  });

  test("admits only the complete target-hole shape owned by a procedure", () => {
    const energy = spellRecord("protection_from_energy");
    if (
      energy.mechanics.family !== "activation" ||
      energy.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Energy direct mechanics.");
    }
    const phase = energy.mechanics.phases[0];
    if (
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Energy target attachment.");
    }

    const admitted = admitSpellTargetAttachment(phase.attachment, [
      "mode",
      "targetKinds",
      "disposition",
    ] as const);
    expect(admitted).toEqual({
      tag: "admitted",
      attachment: phase.attachment,
    });

    const withRangeOrigin = decodeSpellRecordForTest({
      ...energy,
      mechanics: {
        ...energy.mechanics,
        phases: [
          {
            ...phase,
            attachment: {
              ...phase.attachment,
              value: {
                ...phase.attachment.value,
                rangeOrigin: "spell_sensor",
              },
            },
          },
        ],
      },
    });
    if (
      withRangeOrigin.mechanics.family !== "activation" ||
      withRangeOrigin.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected malformed direct mechanics.");
    }
    expect(
      admitSpellTargetAttachment(
        withRangeOrigin.mechanics.phases[0].attachment,
        ["mode", "targetKinds", "disposition"] as const,
      ),
    ).toEqual({
      tag: "rejected",
      reason: "targetAttachmentConstraint",
    });

    const withTypeFilter = decodeSpellRecordForTest({
      ...energy,
      mechanics: {
        ...energy.mechanics,
        phases: [
          {
            ...phase,
            attachment: {
              ...phase.attachment,
              value: {
                ...phase.attachment.value,
                selection: {
                  ...phase.attachment.value.selection,
                  typeFilter: ["humanoid"],
                },
              },
            },
          },
        ],
      },
    });
    if (
      withTypeFilter.mechanics.family !== "activation" ||
      withTypeFilter.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected malformed direct mechanics.");
    }
    expect(
      admitSpellTargetAttachment(
        withTypeFilter.mechanics.phases[0].attachment,
        ["mode", "targetKinds", "disposition"] as const,
      ),
    ).toEqual({
      tag: "rejected",
      reason: "targetSelectionConstraint",
    });
  });
});
