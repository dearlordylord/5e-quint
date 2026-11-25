import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import type {
  ActivationPhase,
  SpellMechanics,
} from "@dnd/surface/surface/types";
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
  admitSpellAreaAttachment,
  admitSpellTargetAttachment,
  spellProcedureHasRedundantSignature,
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
  test("cover denial stays owned through nested executable phase positions", () => {
    const base = spellRecord("sacred_flame").mechanics;
    const ongoing = spellRecord("grease").mechanics;
    const attack = spellRecord("fire_bolt").mechanics;
    if (
      base.family !== "activation" ||
      base.phases[0].kind !== "save_gate" ||
      ongoing.family !== "ongoing_effect" ||
      attack.family !== "activation" ||
      attack.phases[0].kind !== "attack_roll"
    )
      throw new Error(
        "Expected typed save, ongoing and attack fixture mechanics.",
      );
    const denied = base.phases[0];
    const phases: readonly ActivationPhase[] = [
      denied,
      {
        kind: "random_table",
        roll: { die: 4 },
        outcomes: [
          { min: 1, max: 4, label: "Synthetic outcome", phases: [denied] },
        ],
      },
      {
        ...attack.phases[0],
        continue: {
          kind: "repeat",
          when: {
            kind: "damage_roll_has_duplicate_faces",
            minimumMultiplicity: 2,
          },
          limits: [{ kind: "exclude_already_targeted_in_same_cast" }],
          next: [denied],
        },
      },
    ];
    const candidates: readonly SpellMechanics[] = phases.flatMap(
      (phase): readonly SpellMechanics[] => [
        { ...base, phases: [phase] },
        {
          ...base,
          family: "triggered_reaction",
          interruptsTrigger: true,
          phases: [phase],
        },
        { ...ongoing, initialPhase: phase },
      ],
    );
    const admission = supportedAdmission("spellAttackDamage", {
      consumed: [spellMechanicsHeaderPath("family")],
      unowned: [],
    });
    for (const mechanics of candidates) {
      expect(
        admitBattleSpellMechanicsFrom(
          {
            mechanics,
            spellDefinitionRuleFacts:
              projectSpellDefinitionRuleFacts(mechanics),
          },
          [admission],
        ),
      ).toEqual({
        tag: "notBattleOwned",
        reason: { kind: "unownedMechanicsFacet", facet: "saveCoverBenefit" },
      });
    }
  });

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
      reason: { kind: "noMatchingBattleProcedure" },
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
      renamedAdmission.procedures.map((procedure) => {
        const { admit: _admit, ...projected } = procedure;
        return projected;
      }),
    ).toEqual(
      originalAdmission.procedures.map((procedure) => {
        const { admit: _admit, ...projected } = procedure;
        return projected;
      }),
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
      rejections: [
        {
          failedFact: "rangeOrigin",
          coordinate: { kind: "value", field: "rangeOrigin" },
        },
      ],
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
      rejections: [
        {
          failedFact: "typeFilter",
          coordinate: { kind: "selection", field: "typeFilter" },
        },
      ],
    });
  });

  test("owns area attachment constraints and preserves their coordinates", () => {
    const mechanics = spellRecord("pass_without_trace").mechanics;
    if (
      mechanics.family !== "ongoing_effect" ||
      mechanics.attachment.kind !== "area"
    ) {
      throw new Error("Expected direct area attachment mechanics.");
    }

    expect(admitSpellAreaAttachment(mechanics.attachment, [], [])).toEqual({
      tag: "admitted",
      attachment: mechanics.attachment,
    });

    const withSelection = {
      ...mechanics.attachment,
      selection: { mode: "one", targetKinds: ["creature"] },
    } as const;
    expect(admitSpellAreaAttachment(withSelection, [], [])).toEqual({
      tag: "rejected",
      reason: "areaAttachmentConstraint",
      rejections: [
        {
          failedFact: "selection",
          coordinate: { kind: "value", field: "selection" },
        },
      ],
    });
  });

  test("rejects colliding named witnesses instead of counting one fact twice", () => {
    expect(
      spellProcedureHasRedundantSignature({
        kind: "twoWitnessesMayBeMissing",
        witnesses: [
          { name: "range", present: true },
          { name: "range", present: true },
          { name: "duration", present: true },
          { name: "attachment", present: false },
          { name: "effect", present: false },
        ],
      }),
    ).toBe(false);
  });

  test("requires four distinct matches when one of five witnesses may be missing", () => {
    const witnesses = [
      { name: "effect", present: true },
      { name: "ending", present: true },
      { name: "duration", present: true },
      { name: "attachment", present: false },
      { name: "castingTime", present: false },
    ] as const;

    expect(
      spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses,
      }),
    ).toBe(false);
    expect(
      spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          { name: "effect", present: true },
          { name: "ending", present: true },
          { name: "duration", present: true },
          { name: "attachment", present: true },
          { name: "castingTime", present: false },
        ],
      }),
    ).toBe(true);
  });
});
