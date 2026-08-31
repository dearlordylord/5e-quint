import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger, proficiencyBonus } from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  spellAttackDamageInvocationsFromFacts,
  type SpellAttackDamageMechanicsFacts,
} from "../spells-profiles-attack-damage.ts";
import { spellAttackDamageProfile } from "./spell-attack-damage.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

function coordinate(path: UnitMechanicsPath): string {
  return path.nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function expectFireBoltMaterialEvidence(
  components: SpellMechanics["components"],
  materialPaths: readonly SpellMechanicsBranchPath[],
): void {
  const base = spellRecord("fire_bolt");
  const mechanics = { ...base.mechanics, components } satisfies SpellMechanics;
  const result = supportedAdmission({
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  });

  expect(result.admitted.evidence).toEqual({
    consumed: [
      spellMechanicsHeaderPath("level"),
      spellMechanicsHeaderPath("school"),
      spellMechanicsHeaderPath("range"),
      spellMechanicsHeaderPath("components"),
      spellMechanicsHeaderPath("duration"),
      spellMechanicsHeaderPath("castingTime"),
      spellMechanicsHeaderPath("family"),
      spellActivationPhasePath(PositiveInteger(1)),
      spellActivationAttachmentPath(PositiveInteger(1)),
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
      ...materialPaths,
    ],
    unowned: [],
  });
}

function supportedAdmission(
  source: SpellMechanicsAdmissionSource,
): Extract<
  SpellProcedureMechanicsInspection<
    "spellAttackDamage",
    SpellAttackDamageMechanicsFacts
  >,
  { readonly tag: "supported" }
> {
  const result = spellAttackDamageProfile.admitMechanics(source);
  expect(result.tag).toBe("supported");
  if (result.tag !== "supported") {
    throw new Error("Expected spellAttackDamage mechanics to be supported.");
  }
  return result;
}

describe("spellAttackDamage static admission", () => {
  test("projects a complete root with exact header, phase, attachment, and effect paths", () => {
    const source = spellAdmissionSource(spellRecord("fire_bolt"));
    const result = supportedAdmission(mechanicsSource(source));

    expect(result.admitted.evidence.unowned).toEqual([]);
    expect(result.admitted.evidence.consumed.map(coordinate)).toEqual(
      expect.arrayContaining([
        "recordMechanics/generalFact:1",
        "recordMechanics/generalFact:2",
        "recordMechanics/generalFact:3",
        "recordMechanics/generalFact:4",
        "recordMechanics/generalFact:5",
        "recordMechanics/generalFact:6",
        "recordMechanics/generalFact:7",
        "recordMechanics/procedure:1",
        "recordMechanics/procedure:1/generalFact:1",
        "recordMechanics/procedure:1/effect:1",
        "recordMechanics/procedure:1/effect:2",
      ]),
    );
  });

  test("keeps static facts and evidence invariant under authored renaming", () => {
    const original = spellRecord("fire_bolt");
    const renamed = {
      ...original,
      id: unitId("synthetic_renamed_spell_attack"),
      name: "Synthetic Ember Lance",
    };
    const originalAdmission = supportedAdmission({
      mechanics: original.mechanics,
      spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
        original.mechanics,
      ),
    });
    const renamedAdmission = supportedAdmission({
      mechanics: renamed.mechanics,
      spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
        renamed.mechanics,
      ),
    });

    expect(renamedAdmission.admitted.facts).toEqual(
      originalAdmission.admitted.facts,
    );
    expect(renamedAdmission.admitted.evidence).toEqual(
      originalAdmission.admitted.evidence,
    );
  });

  test("consumes a generic priced-material branch", () => {
    expectFireBoltMaterialEvidence(
      {
        v: true,
        s: true,
        m: "a synthetic material focus",
        materialCostGp: 25,
      },
      [spellMaterialComponentPath("cost")],
    );
  });

  test("consumes a generic material-consumption branch", () => {
    expectFireBoltMaterialEvidence(
      {
        v: true,
        s: true,
        m: "a synthetic consumed component",
        materialConsumed: true,
      },
      [spellMaterialComponentPath("consumption")],
    );
  });

  test("consumes structured material as cost without a consumption branch", () => {
    expectFireBoltMaterialEvidence(
      {
        v: true,
        s: true,
        m: {
          kind: "paired_worn_items",
          itemKind: "ring",
          material: "platinum",
          minimumValueGpEach: 1,
          wornBy: ["caster", "target"],
          requiredFor: "spell_duration",
        },
      },
      [spellMaterialComponentPath("cost")],
    );
  });

  test("consumes every represented non-instantaneous duration branch", () => {
    const base = spellRecord("acid_arrow");
    const spell = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        components: {
          v: true,
          s: true,
          m: {
            kind: "paired_worn_items",
            itemKind: "ring",
            material: "platinum",
            minimumValueGpEach: 1,
            wornBy: ["caster", "target"],
            requiredFor: "spell_duration",
          },
        },
        duration: {
          kind: "timed",
          value: {
            unit: "round",
            amount: 1,
            upcastTiers: [{ atSlot: 2, amount: 2 }],
          },
          earlyEnd: [{ kind: "target_takes_damage" }],
        },
      },
    });
    const result = supportedAdmission(
      mechanicsSource(spellAdmissionSource(spell)),
    );

    expect(result.admitted.evidence.consumed.map(coordinate)).toEqual(
      expect.arrayContaining([
        coordinate(spellDurationValuePath()),
        coordinate(spellDurationExtensionPath(PositiveInteger(1))),
        coordinate(spellDurationEndingPath(PositiveInteger(1))),
      ]),
    );
    expect(result.admitted.evidence.unowned).toEqual([]);
    expect(result.admitted.evidence.consumed.map(coordinate)).toEqual(
      expect.arrayContaining([coordinate(spellMaterialComponentPath("cost"))]),
    );
  });

  test.each(["scorching_ray", "ice_knife", "chromatic_orb"] as const)(
    "does not claim the %s sibling profile",
    (spellId) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      expect(
        spellAttackDamageProfile.admitMechanics(mechanicsSource(source)),
      ).toEqual({
        tag: "notRepresented",
      });
    },
  );

  test("accumulates one issue per rider and one phase-count issue per extra phase", () => {
    const base = spellRecord("fire_bolt");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const spell = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onHit: [
              phase.onHit[0],
              { kind: "set_speed", feet: 10 },
              { kind: "set_speed", feet: 20 },
            ],
            onMiss: [{ kind: "none" }, { kind: "none" }],
          },
          phase,
          phase,
        ],
      },
    });
    const result = spellAttackDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spell)),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;

    expect(
      result.issues.filter((issue) => issue.failedFact === "missDamage"),
    ).toHaveLength(1);
    expect(
      result.issues
        .filter((issue) => issue.failedFact === "missDamage")
        .map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual(["recordMechanics/procedure:1/effect:5"]);
    expect(
      result.issues.filter((issue) => issue.failedFact === "phaseCount"),
    ).toHaveLength(2);
    expect(
      result.issues.map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual(
      expect.arrayContaining([
        "recordMechanics/procedure:2",
        "recordMechanics/procedure:3",
        "recordMechanics/procedure:1/effect:5",
        "recordMechanics/procedure:1/effect:2",
        "recordMechanics/procedure:1/effect:3",
      ]),
    );
    expect(
      result.issues.filter((issue) => issue.failedFact === "postDamageRiders"),
    ).toHaveLength(2);
  });

  test("reports invalid and extra miss effects at their own effect paths", () => {
    const base = spellRecord("fire_bolt");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "attack_roll") {
      throw new Error("Expected attack-roll mechanics.");
    }
    const spell = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onMiss: [{ kind: "set_speed", feet: 10 }, { kind: "none" }],
          },
        ],
      },
    });
    const result = spellAttackDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spell)),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;

    expect(
      result.issues
        .filter((issue) => issue.failedFact === "missDamage")
        .map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual([
      "recordMechanics/procedure:1/effect:3",
      "recordMechanics/procedure:1/effect:4",
    ]);
  });

  test("rejects a represented unsupported branch with its exact failed path", () => {
    const source = spellAdmissionSource(spellRecord("fire_bolt"));
    const unsupportedMechanics = {
      ...source.mechanics,
      castingTime: { kind: "bonus_action" as const },
    };
    const result = spellAttackDamageProfile.admitMechanics({
      mechanics: unsupportedMechanics,
      spellDefinitionRuleFacts:
        projectSpellDefinitionRuleFacts(unsupportedMechanics),
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        failedFact: "castingTime",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "occurrence", role: "generalFact", ordinal: 6 },
          ],
        },
      }),
    ]);
  });

  test("binds the dynamic builder to a mechanics-free execution source", () => {
    const source = spellAdmissionSource(spellRecord("fire_bolt"));
    const result = supportedAdmission(mechanicsSource(source));
    const executionSource = battleSpellExecutionSourceFromAdmission(source);
    const invocations = spellAttackDamageInvocationsFromFacts({
      spell: executionSource,
      facts: result.admitted.facts,
      access: { tag: "classCantrip" },
      resource: { tag: "none" },
      spellcastingAbilityModifier: source.castingSource.abilityModifier,
      proficiencyBonus: proficiencyBonus(2),
      characterLevel: 1,
    });

    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });
});
