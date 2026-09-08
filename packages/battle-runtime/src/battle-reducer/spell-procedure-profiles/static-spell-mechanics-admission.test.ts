import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellGlyphExplosiveReleasePath,
  spellGlyphOccurrencePath,
  spellGlyphReleasePath,
  spellGlyphStoredReleasePath,
  spellGlyphTriggerPath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellSpawnedCreatureControlPath,
  spellSpawnedCreatureDismissalPath,
  spellSpawnedCreaturePath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import { admitGlyphDurableOccurrenceMechanics } from "../glyph-durable-occurrence.ts";
import { admitRegisteredSpellProcedureMechanics } from "./admission-registry.ts";
import { admitSpawnedCompanionLifecycleMechanics } from "./spawned-companion-lifecycle-admission.ts";
import type { RegisteredAdmittedStaticSpellMechanics } from "./registry.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";

function mechanicsSource(spellId: string) {
  return mechanicsSourceFromSpell(spellRecord(spellId));
}

function mechanicsSourceFromSpell(spell: SpellRecord) {
  const mechanics = spell.mechanics;
  return {
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

describe("static-only spell mechanics admission", () => {
  test("registers the familiar lifecycle with exact partial-root evidence", () => {
    const result = admitRegisteredSpellProcedureMechanics(
      mechanicsSource("find_familiar"),
    );
    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    const admitted = result.procedures.find(
      (
        procedure,
      ): procedure is Extract<
        RegisteredAdmittedStaticSpellMechanics,
        { readonly procedure: "spawnedCompanionLifecycle" }
      > => procedure.procedure === "spawnedCompanionLifecycle",
    );
    expect(admitted?.binding).toBe("static");
    expect(admitted?.facts.eligibleForms).not.toHaveProperty("specialForms");
    expect(admitted?.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellMaterialComponentPath("cost"),
        spellMaterialComponentPath("consumption"),
        spellSpawnedCreaturePath(),
        spellSpawnedCreatureControlPath(),
        spellSpawnedCreatureDismissalPath(),
      ],
      unowned: [spellMechanicsHeaderPath("school")],
    });
  });

  test("rejects a familiar material cost without a material component", () => {
    const source = mechanicsSource("find_familiar");
    const result = admitSpawnedCompanionLifecycleMechanics({
      ...source,
      mechanics: {
        ...source.mechanics,
        components: { ...source.mechanics.components, m: false },
      },
    });

    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "spawnedCompanionLifecycle",
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
          message:
            "Spawned companion lifecycle requires its verbal, somatic, and material component signature.",
        },
      ],
    });
  });

  test("registers the durable glyph with every glyph coordinate", () => {
    const result = admitRegisteredSpellProcedureMechanics(
      mechanicsSource("glyph_of_warding"),
    );
    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    const admitted = result.procedures.find(
      ({ procedure }) => procedure === "glyphDurableOccurrence",
    );
    expect(admitted?.binding).toBe("static");
    expect(admitted?.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellMaterialComponentPath("cost"),
        spellMaterialComponentPath("consumption"),
        spellDurationEndingPath(PositiveInteger(1)),
        spellGlyphOccurrencePath(),
        spellGlyphTriggerPath(),
        spellGlyphReleasePath(),
        spellGlyphExplosiveReleasePath(),
        spellGlyphStoredReleasePath(),
      ],
      unowned: [spellMechanicsHeaderPath("school")],
    });
  });

  test("rejects a glyph material cost without a material component", () => {
    const source = mechanicsSource("glyph_of_warding");
    const result = admitGlyphDurableOccurrenceMechanics({
      ...source,
      mechanics: {
        ...source.mechanics,
        components: { ...source.mechanics.components, m: false },
      },
    });

    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "glyphDurableOccurrence",
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
          message:
            "Durable glyph occurrence requires its verbal, somatic, and material component signature.",
        },
      ],
    });
  });

  test.each([
    {
      spellId: "find_familiar",
      syntheticId: "synthetic_bound_helper",
      syntheticName: "Synthetic Bound Helper",
    },
    {
      spellId: "glyph_of_warding",
      syntheticId: "synthetic_delayed_mark",
      syntheticName: "Synthetic Delayed Mark",
    },
  ])(
    "admits $spellId by mechanics with renamed synthetic parity",
    ({ spellId, syntheticId, syntheticName }) => {
      const spell = spellRecord(spellId);
      const synthetic = {
        ...spell,
        id: unitId(syntheticId),
        name: syntheticName,
      } satisfies SpellRecord;

      expect(
        admitRegisteredSpellProcedureMechanics(
          mechanicsSourceFromSpell(synthetic),
        ),
      ).toEqual(
        admitRegisteredSpellProcedureMechanics(mechanicsSourceFromSpell(spell)),
      );
    },
  );

  test("accumulates independent familiar lifecycle issues", () => {
    const source = mechanicsSource("find_familiar");
    if (source.mechanics.family !== "spawned_creature") return;
    const result = admitSpawnedCompanionLifecycleMechanics({
      ...source,
      mechanics: {
        ...source.mechanics,
        level: 2,
        range: { kind: "touch" },
      },
    });
    expect(result).toMatchObject({
      tag: "unsupported",
      issues: [{ failedFact: "level" }, { failedFact: "range" }],
    });
  });

  test("accumulates independent glyph release issues", () => {
    const source = mechanicsSource("glyph_of_warding");
    if (source.mechanics.family !== "glyph_warding") return;
    const mutatedMechanics = structuredClone(source.mechanics);
    Reflect.set(mutatedMechanics.release.explosiveRune.area, "radiusFeet", 10);
    Reflect.set(
      mutatedMechanics.release.spellGlyph.release.hostilePlacement,
      "appliesTo",
      ["harmful_objects"],
    );
    const mutatedSource: SpellMechanicsAdmissionSource = {
      ...source,
      mechanics: mutatedMechanics,
    };
    const result = admitGlyphDurableOccurrenceMechanics(mutatedSource);
    expect(result).toMatchObject({
      tag: "unsupported",
      issues: [
        { failedFact: "explosiveRuneRelease" },
        { failedFact: "storedSpellRelease" },
      ],
    });
  });
});
