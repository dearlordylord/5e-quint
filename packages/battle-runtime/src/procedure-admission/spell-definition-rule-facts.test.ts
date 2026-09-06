import { abilityModifier } from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import { spellRecord } from "../battle-runtime.test-support.ts";
import {
  spellRuleExecutionFactsWithCastingSource,
  type SpellCastingSource,
} from "../procedure-execution/spell-rule-facts.ts";
import { projectSpellDefinitionRuleFacts } from "./spell-definition-rule-facts.ts";

const baseMechanics = spellRecord("cure_wounds").mechanics;
const explicitlyConsumedMechanics: SpellMechanics = {
  ...baseMechanics,
  components: {
    v: true,
    s: true,
    m: "synthetic consumed component",
    materialConsumed: true,
  },
};

describe("Spell Definition rule-fact admission", () => {
  test("projects authored mechanics once and ignores authored identity", () => {
    const renamedMechanics = { ...baseMechanics };

    expect(projectSpellDefinitionRuleFacts(renamedMechanics)).toEqual(
      projectSpellDefinitionRuleFacts(baseMechanics),
    );
  });

  test("projects unsupported target shapes without inventing twinned facts", () => {
    expect(projectSpellDefinitionRuleFacts(baseMechanics)).toMatchObject({
      level: 1,
      range: { kind: "touch" },
      duration: { kind: "instantaneous" },
      components: {
        verbal: true,
        somatic: true,
        hasMaterial: false,
        hasPricedOrConsumedMaterial: false,
      },
      twinnedTargetCount: null,
    });
  });

  test("joins dynamic casting source without changing static facts", () => {
    const definition = projectSpellDefinitionRuleFacts(baseMechanics);
    const castingSource: SpellCastingSource = {
      tag: "classSpellcasting",
      className: "wizard",
      abilityModifier: abilityModifier(4),
    };

    expect(
      spellRuleExecutionFactsWithCastingSource(definition, castingSource),
    ).toEqual({ ...definition, castingSource });
  });

  test("projects no material components", () => {
    expect(
      projectSpellDefinitionRuleFacts(spellRecord("cure_wounds").mechanics)
        .components,
    ).toMatchObject({
      hasMaterial: false,
      hasPricedOrConsumedMaterial: false,
    });
  });

  test("projects ordinary string material components", () => {
    expect(
      projectSpellDefinitionRuleFacts(spellRecord("mage_armor").mechanics)
        .components,
    ).toMatchObject({
      hasMaterial: true,
      hasPricedOrConsumedMaterial: false,
    });
  });

  test("projects explicit material cost", () => {
    expect(
      projectSpellDefinitionRuleFacts(spellRecord("identify").mechanics)
        .components,
    ).toMatchObject({
      hasMaterial: true,
      hasPricedOrConsumedMaterial: true,
    });
  });

  test("projects explicit material consumption", () => {
    expect(
      projectSpellDefinitionRuleFacts(explicitlyConsumedMechanics).components,
    ).toMatchObject({
      hasMaterial: true,
      hasPricedOrConsumedMaterial: true,
    });
  });

  test("projects structured material components", () => {
    expect(
      projectSpellDefinitionRuleFacts(spellRecord("warding_bond").mechanics)
        .components,
    ).toMatchObject({
      hasMaterial: true,
      hasPricedOrConsumedMaterial: true,
    });
  });
});
