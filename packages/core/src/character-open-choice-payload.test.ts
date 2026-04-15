import { describe, expect, it } from "vitest";

import {
  applyCharacterDraftUpdate,
  assessCharacterDraft,
  buildOpenChoicePatch,
  listCharacterFeaturePickers,
  resolveOpenChoicePayload,
  singleClassAdvancement,
  type CharacterDraft,
} from "#/character-domain.ts";

function baseDraft(overrides: Partial<CharacterDraft> = {}): CharacterDraft {
  return {
    primaryClass: "fighter",
    advancement: singleClassAdvancement("fighter", 1),
    background: "soldier",
    species: "human",
    abilityScoreGeneration: {
      mode: "standardArray",
      assignedScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    },
    backgroundAbilityScoreIncrease: {
      kind: "plusTwoPlusOne",
      plusTwo: "str",
      plusOne: "con",
    },
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: "NG",
    ...overrides,
  };
}

function findChoice(
  draft: CharacterDraft,
  code: string,
  messageStart?: string,
) {
  const assessment = assessCharacterDraft(draft);
  if (assessment.status === "complete") return undefined;
  return assessment.openChoices.find(
    (entry) =>
      entry.code === code &&
      (messageStart == null || entry.message.startsWith(messageStart)),
  );
}

describe("resolveOpenChoicePayload", () => {
  it("returns a primary class skills payload keyed by class", () => {
    const draft = baseDraft();
    const choice = findChoice(draft, "missingPrimaryClassSkillChoices");
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!);
    expect(payload).toMatchObject({
      featureRef: "primary_class_skills:fighter",
      pickCount: 2,
      writePath: ["choices", "primaryClassSkills"],
    });
    expect(payload?.options).toContain("acrobatics");
    expect(payload?.options).toContain("perception");
  });

  it("returns a druid primal order payload when the feature choice is open", () => {
    const draft = baseDraft({
      primaryClass: "druid",
      advancement: singleClassAdvancement("druid", 1),
    });
    const choice = findChoice(
      draft,
      "missingFeatureChoice",
      "druid requires a Primal Order",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!);
    expect(payload).toEqual({
      featureRef: "druid_primal_order",
      options: ["magician", "warden"],
      pickCount: 1,
      writePath: ["choices", "druidPrimalOrder"],
      current: [],
    });
  });

  it("returns a cleric divine order payload when the feature choice is open", () => {
    const draft = baseDraft({
      primaryClass: "cleric",
      advancement: singleClassAdvancement("cleric", 1),
    });
    const choice = findChoice(
      draft,
      "missingFeatureChoice",
      "cleric requires a Divine Order",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!);
    expect(payload).toEqual({
      featureRef: "cleric_divine_order",
      options: ["protector", "thaumaturge"],
      pickCount: 1,
      writePath: ["choices", "clericDivineOrder"],
      current: [],
    });
  });

  it("returns null for unsupported open-choice codes", () => {
    const draft = baseDraft({
      primaryClass: undefined,
      advancement: undefined,
    });
    const choice = findChoice(draft, "missingPrimaryClass");
    expect(choice).toBeDefined();
    expect(resolveOpenChoicePayload(draft, choice!)).toBeNull();
  });
});

describe("listCharacterFeaturePickers", () => {
  it("returns pickers for applicable features even when the slot is already filled", () => {
    const draft = baseDraft({
      primaryClass: "druid",
      advancement: singleClassAdvancement("druid", 1),
      choices: { druidPrimalOrder: "magician" },
    });
    const pickers = listCharacterFeaturePickers(draft);
    const primal = pickers.find((p) => p.featureRef === "druid_primal_order");
    expect(primal).toBeDefined();
    expect(primal!.current).toEqual(["magician"]);
  });

  it("omits pickers for features that do not apply to the draft", () => {
    const draft = baseDraft({
      primaryClass: "fighter",
      advancement: singleClassAdvancement("fighter", 1),
    });
    const pickers = listCharacterFeaturePickers(draft);
    expect(pickers.find((p) => p.featureRef === "druid_primal_order")).toBeUndefined();
    expect(pickers.find((p) => p.featureRef === "cleric_divine_order")).toBeUndefined();
    expect(pickers.find((p) => p.featureRef === "fighter_fighting_style")).toBeDefined();
  });
});

describe("buildOpenChoicePatch", () => {
  it("clears the slot when value is undefined", () => {
    const draft = baseDraft({
      primaryClass: "druid",
      advancement: singleClassAdvancement("druid", 1),
      choices: { druidPrimalOrder: "magician" },
    });
    const payload = listCharacterFeaturePickers(draft).find(
      (p) => p.featureRef === "druid_primal_order",
    )!;
    const patch = buildOpenChoicePatch(draft, payload, undefined);
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.druidPrimalOrder).toBeUndefined();
  });

  it("writes a nested draft patch that merges with existing choices", () => {
    const draft = baseDraft({
      choices: { primaryClassSkills: ["acrobatics", "perception"] },
    });
    const patch = buildOpenChoicePatch(
      draft,
      {
        featureRef: "fighter_fighting_style",
        options: [
          "archery",
          "defense",
          "greatWeaponFighting",
          "twoWeaponFighting",
        ],
        pickCount: 1,
        writePath: ["choices", "fighterFightingStyle"],
        current: [],
      },
      "defense",
    );
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices).toMatchObject({
      primaryClassSkills: ["acrobatics", "perception"],
      fighterFightingStyle: "defense",
    });
  });

  it("writes array values for multi-pick payloads", () => {
    const draft = baseDraft();
    const patch = buildOpenChoicePatch(
      draft,
      {
        featureRef: "primary_class_skills:fighter",
        options: ["acrobatics", "perception", "athletics"],
        pickCount: 2,
        writePath: ["choices", "primaryClassSkills"],
        current: [],
      },
      ["acrobatics", "perception"],
    );
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.primaryClassSkills).toEqual([
      "acrobatics",
      "perception",
    ]);
  });
});
