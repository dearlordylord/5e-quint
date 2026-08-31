import { abilityModifier } from "@dnd/shared/types";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  spellRuleExecutionFactsWithCastingSource,
  type SpellCastingSource,
} from "../procedure-execution/spell-rule-facts.ts";
import { projectSpellDefinitionRuleFacts } from "./spell-definition-rule-facts.ts";

const baseMechanics = {
  family: "activation",
  level: 2,
  range: { kind: "point", feet: 30 },
  duration: { kind: "instantaneous" },
  components: { v: true, s: false, m: false },
  phases: [],
} as unknown as SpellMechanics;

describe("Spell Definition rule-fact admission", () => {
  test("projects authored mechanics once and ignores authored identity", () => {
    const renamedMechanics = { ...baseMechanics };

    expect(projectSpellDefinitionRuleFacts(renamedMechanics)).toEqual(
      projectSpellDefinitionRuleFacts(baseMechanics),
    );
  });

  test("projects unsupported target shapes without inventing twinned facts", () => {
    expect(projectSpellDefinitionRuleFacts(baseMechanics)).toMatchObject({
      level: 2,
      range: { kind: "point", feet: 30 },
      duration: { kind: "instantaneous" },
      components: {
        verbal: true,
        somatic: false,
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
});
