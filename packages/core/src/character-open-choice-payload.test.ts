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

  it("writes a depth-3 writePath that merges sibling branches", () => {
    const draft = baseDraft({
      primaryClass: "fighter",
      advancement: [
        { className: "fighter" },
        { className: "rogue" },
        { className: "bard" },
      ],
      choices: {
        multiclassSkills: { rogue: ["stealth"] },
      },
    });
    const payload = listCharacterFeaturePickers(draft).find(
      (p) => p.featureRef === "multiclass_skills:bard",
    )!;
    const patch = buildOpenChoicePatch(draft, payload, ["persuasion"]);
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.multiclassSkills).toEqual({
      rogue: ["stealth"],
      bard: ["persuasion"],
    });
  });
});

describe("resolveOpenChoicePayload: new pickers", () => {
  it("returns a soldier background tool payload", () => {
    const draft = baseDraft({
      primaryClass: "fighter",
      advancement: singleClassAdvancement("fighter", 1),
      background: "soldier",
    });
    const choice = findChoice(draft, "missingToolChoice", "soldier requires");
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("background_tool:soldier");
    expect(payload.pickCount).toBe(1);
    expect(payload.options).toContain("dice");
    expect(payload.writePath).toEqual(["choices", "backgroundTool"]);
  });

  it("returns a monk tool payload offering artisan tools and instruments", () => {
    const draft = baseDraft({
      primaryClass: "monk",
      advancement: singleClassAdvancement("monk", 1),
    });
    const choice = findChoice(draft, "missingToolChoice", "monk requires");
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("monk_tool");
    expect(payload.options).toContain("smithsTools");
    expect(payload.options).toContain("lute");
  });

  it("returns a bard instruments multi-pick payload", () => {
    const draft = baseDraft({
      primaryClass: "bard",
      advancement: singleClassAdvancement("bard", 1),
    });
    const choice = findChoice(
      draft,
      "invalidToolChoiceCount",
      "bard requires exactly three",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("bard_instruments");
    expect(payload.pickCount).toBe(3);
    expect(payload.writePath).toEqual(["choices", "bardInstruments"]);
  });

  it("returns a multiclass bard instrument payload", () => {
    const draft = baseDraft({
      primaryClass: "fighter",
      advancement: [{ className: "fighter" }, { className: "bard" }],
    });
    const choice = findChoice(
      draft,
      "missingToolChoice",
      "multiclass bard",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("multiclass_bard_instrument");
    expect(payload.pickCount).toBe(1);
  });

  it("returns a rogue language payload excluding Thieves' Cant", () => {
    const draft = baseDraft({
      primaryClass: "rogue",
      advancement: singleClassAdvancement("rogue", 1),
    });
    const choice = findChoice(
      draft,
      "missingGrantedLanguageChoice",
      "rogue requires",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("rogue_language");
    expect(payload.options).toContain("Draconic");
    expect(payload.options).not.toContain("Thieves' Cant");
  });

  it("returns a ranger Deft Explorer languages payload at ranger level 2", () => {
    const draft = baseDraft({
      primaryClass: "ranger",
      advancement: singleClassAdvancement("ranger", 2),
      choices: {
        primaryClassSkills: ["nature", "perception", "survival"],
        rangerFightingStyle: "archery",
      },
    });
    const choice = findChoice(
      draft,
      "wrongGrantedLanguageChoiceCount",
      "ranger Deft Explorer",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("ranger_deft_explorer_languages");
    expect(payload.pickCount).toBe(2);
  });

  it("returns an expertise payload scoped to currently-granted skill proficiencies", () => {
    const draft = baseDraft({
      primaryClass: "rogue",
      advancement: singleClassAdvancement("rogue", 1),
      choices: {
        primaryClassSkills: ["stealth", "perception", "investigation", "insight"],
        rogueLanguage: "Draconic",
      },
    });
    const choice = findChoice(
      draft,
      "missingFeatureChoice",
      "current class levels require",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("expertise_skills");
    expect(payload.pickCount).toBe(2);
    expect(payload.options).toEqual(
      expect.arrayContaining([
        "stealth",
        "perception",
        "investigation",
        "insight",
      ]),
    );
    expect(payload.options).not.toContain("acrobatics");
  });

  it("returns a multiclass skills payload with a depth-3 writePath", () => {
    const draft = baseDraft({
      primaryClass: "fighter",
      advancement: [{ className: "fighter" }, { className: "ranger" }],
    });
    const choice = findChoice(
      draft,
      "missingMulticlassSkillChoice",
      "multiclass ranger",
    );
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("multiclass_skills:ranger");
    expect(payload.writePath).toEqual([
      "choices",
      "multiclassSkills",
      "ranger",
    ]);
    expect(payload.pickCount).toBe(1);
  });

  it("returns a human origin feat payload lifted into the Skilled variant", () => {
    const draft = baseDraft();
    const choice = findChoice(draft, "missingOriginFeatChoice");
    expect(choice).toBeDefined();
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    expect(payload.featureRef).toBe("human_origin_feat");
    expect(payload.options).toContain("skilled");
    const patch = buildOpenChoicePatch(draft, payload, "skilled");
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.humanOriginFeat).toEqual({
      feat: "skilled",
      proficiencies: [],
    });
  });

  it("wraps non-skilled origin feat selections without proficiencies", () => {
    const draft = baseDraft();
    const choice = findChoice(draft, "missingOriginFeatChoice");
    const payload = resolveOpenChoicePayload(draft, choice!)!;
    const patch = buildOpenChoicePatch(draft, payload, "alert");
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.humanOriginFeat).toEqual({ feat: "alert" });
  });

  it("preserves existing Skilled proficiencies when re-picking skilled", () => {
    const draft = baseDraft({
      choices: {
        humanOriginFeat: {
          feat: "skilled",
          proficiencies: ["stealth", "perception", "smithsTools"],
        },
      },
    });
    const pickers = listCharacterFeaturePickers(draft);
    const featPicker = pickers.find(
      (p) => p.featureRef === "human_origin_feat",
    )!;
    const patch = buildOpenChoicePatch(draft, featPicker, "skilled");
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.humanOriginFeat).toEqual({
      feat: "skilled",
      proficiencies: ["stealth", "perception", "smithsTools"],
    });
  });

  it("surfaces a Skilled proficiencies sub-picker only when the feat is Skilled", () => {
    const withoutSkilled = baseDraft({
      choices: { humanOriginFeat: { feat: "alert" } },
    });
    expect(
      listCharacterFeaturePickers(withoutSkilled).find(
        (p) => p.featureRef === "human_origin_feat_skilled_proficiencies",
      ),
    ).toBeUndefined();
    const withSkilled = baseDraft({
      choices: {
        humanOriginFeat: { feat: "skilled", proficiencies: [] },
      },
    });
    const skilledPicker = listCharacterFeaturePickers(withSkilled).find(
      (p) => p.featureRef === "human_origin_feat_skilled_proficiencies",
    );
    expect(skilledPicker).toBeDefined();
    expect(skilledPicker!.pickCount).toBe(3);
    expect(skilledPicker!.writePath).toEqual([
      "choices",
      "humanOriginFeat",
      "proficiencies",
    ]);
  });

  it("writes Skilled sub-pick proficiencies at depth 3 while preserving the feat tag", () => {
    const draft = baseDraft({
      choices: {
        humanOriginFeat: { feat: "skilled", proficiencies: [] },
      },
    });
    const picker = listCharacterFeaturePickers(draft).find(
      (p) => p.featureRef === "human_origin_feat_skilled_proficiencies",
    )!;
    const patch = buildOpenChoicePatch(draft, picker, [
      "stealth",
      "perception",
      "smithsTools",
    ]);
    const updated = applyCharacterDraftUpdate(draft, patch);
    expect(updated.choices?.humanOriginFeat).toEqual({
      feat: "skilled",
      proficiencies: ["stealth", "perception", "smithsTools"],
    });
  });

  it("returns equipment background and class option payloads", () => {
    const draft = baseDraft({ equipment: {} });
    const bgChoice = findChoice(draft, "missingBackgroundEquipmentChoice");
    expect(bgChoice).toBeDefined();
    const bgPayload = resolveOpenChoicePayload(draft, bgChoice!)!;
    expect(bgPayload.featureRef).toBe("equipment_background_option");
    expect(bgPayload.writePath).toEqual(["equipment", "backgroundOption"]);
    expect(bgPayload.options).toEqual(["package", "gold"]);

    const classChoice = findChoice(draft, "missingClassEquipmentChoice");
    expect(classChoice).toBeDefined();
    const classPayload = resolveOpenChoicePayload(draft, classChoice!)!;
    expect(classPayload.featureRef).toBe("equipment_class_option");
    expect(classPayload.writePath).toEqual(["equipment", "classOption"]);
    expect(classPayload.options).toContain("packageA");
    expect(classPayload.options).toContain("gold");
  });

  it("filters packageB out of the class option payload for classes without a packageB", () => {
    const draft = baseDraft({
      primaryClass: "barbarian",
      advancement: singleClassAdvancement("barbarian", 1),
    });
    const pickers = listCharacterFeaturePickers(draft);
    const payload = pickers.find(
      (p) => p.featureRef === "equipment_class_option",
    )!;
    expect(payload.options).not.toContain("packageB");
  });
});
