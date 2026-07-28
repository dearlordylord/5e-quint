import { PositiveInteger, abilityScore } from "@dnd/shared/types";
import type { ProficiencyGrantSubject } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  abilityScoreIncreaseOneScoreOptionId,
  decodeAbilityScoreIncreaseOptionId,
  decodeProficiencyGrantSubjectOptionId,
  parseToolProficiencyId,
  proficiencyGrantSubjectOption,
  proficiencyGrantSubjectOptionId,
  proficiencyGrantSubjectOptions,
  toolProficiencyIdsFromDirectToolOptionIds,
  toolProficiencyIdsFromProficiencyChoiceOptionIds,
  toolProficiencyIdsFromSubjects,
} from "./choice-option-codecs.ts";
import {
  MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS,
  type CreationChoiceOptionDecodeCause,
} from "./types.ts";

type ProficiencySubjectCases = {
  readonly [Kind in ProficiencyGrantSubject["kind"]]: {
    readonly subject: Extract<ProficiencyGrantSubject, { readonly kind: Kind }>;
    readonly option: {
      readonly optionId: string;
      readonly label: string;
    };
  };
};

const proficiencySubjectCases = {
  skill: {
    subject: { kind: "skill", skill: "medicine" },
    option: { optionId: "medicine", label: "Medicine" },
  },
  weapon_category: {
    subject: { kind: "weapon_category", category: "martial" },
    option: {
      optionId: "weapon_category:martial",
      label: "Weapon category: martial",
    },
  },
  armor_category: {
    subject: { kind: "armor_category", category: "light" },
    option: {
      optionId: "armor_category:light",
      label: "Armor category: light",
    },
  },
  tool: {
    subject: { kind: "tool", toolId: "thieves_tools" },
    option: { optionId: "tool:thieves_tools", label: "thieves_tools" },
  },
  tool_category: {
    subject: { kind: "tool_category", category: "musical_instrument" },
    option: {
      optionId: "tool_category:musical_instrument",
      label: "Tool category: musical_instrument",
    },
  },
} as const satisfies ProficiencySubjectCases;

type InvalidAbilityScoreIncreaseValueCause = Extract<
  CreationChoiceOptionDecodeCause,
  { readonly tag: "invalidAbilityScoreIncreaseValue" }
>;
type InvalidAbilityScoreIncreaseValueCauseKey =
  InvalidAbilityScoreIncreaseValueCause extends infer Cause
    ? Cause extends InvalidAbilityScoreIncreaseValueCause
      ? `${Cause["field"]}:${Cause["reason"]}`
      : never
    : never;

const invalidAbilityScoreIncreaseValueCases = {
  "increase:nonPositive": {
    optionId: "ability_score:str:+0:max20",
    cause: {
      tag: "invalidAbilityScoreIncreaseValue",
      field: "increase",
      reason: "nonPositive",
    },
  },
  "increase:unsafeInteger": {
    optionId: "ability_score:str:+9007199254740992:max20",
    cause: {
      tag: "invalidAbilityScoreIncreaseValue",
      field: "increase",
      reason: "unsafeInteger",
    },
  },
  "maximum:nonPositive": {
    optionId: "ability_score:str:+1:max0",
    cause: {
      tag: "invalidAbilityScoreIncreaseValue",
      field: "maximum",
      reason: "nonPositive",
    },
  },
  "maximum:unsafeInteger": {
    optionId: "ability_score:str:+1:max9007199254740992",
    cause: {
      tag: "invalidAbilityScoreIncreaseValue",
      field: "maximum",
      reason: "unsafeInteger",
    },
  },
  "maximum:maximumOutOfRange": {
    optionId: "ability_score:str:+1:max31",
    cause: {
      tag: "invalidAbilityScoreIncreaseValue",
      field: "maximum",
      reason: "maximumOutOfRange",
    },
  },
} as const satisfies Record<
  InvalidAbilityScoreIncreaseValueCauseKey,
  {
    readonly optionId: string;
    readonly cause: InvalidAbilityScoreIncreaseValueCause;
  }
>;

describe("choice-option codec boundaries", () => {
  test("round-trips one- and two-score increases and reports every parse cause", () => {
    const oneScoreId = abilityScoreIncreaseOneScoreOptionId({
      ability: "str",
      increase: PositiveInteger(2),
      maxScore: abilityScore(20),
    });
    expect(decodeAbilityScoreIncreaseOptionId(oneScoreId)).toEqual(
      Either.right([{ ability: "str", increase: 2, maxScore: 20 }]),
    );
    expect(
      decodeAbilityScoreIncreaseOptionId("ability_scores:dex:+1;con:+1:max20"),
    ).toEqual(
      Either.right([
        { ability: "dex", increase: 1, maxScore: 20 },
        { ability: "con", increase: 1, maxScore: 20 },
      ]),
    );

    for (const { optionId, cause } of Object.values(
      invalidAbilityScoreIncreaseValueCases,
    )) {
      expect(decodeAbilityScoreIncreaseOptionId(optionId)).toMatchObject({
        _tag: "Left",
        left: {
          tag: "choiceOptionCodecIssue",
          optionId,
          cause,
        },
      });
    }
    expect(
      decodeAbilityScoreIncreaseOptionId(
        "ability_scores:str:+1;dex:+9007199254740992:max20",
      ),
    ).toMatchObject({
      _tag: "Left",
      left: {
        cause: {
          tag: "invalidAbilityScoreIncreaseValue",
          field: "increase",
          reason: "unsafeInteger",
        },
      },
    });
    expect(
      decodeAbilityScoreIncreaseOptionId("ability_score:future:+1:max20"),
    ).toMatchObject({
      _tag: "Left",
      left: { cause: { tag: "unsupportedAbility" } },
    });
    expect(
      decodeAbilityScoreIncreaseOptionId(
        "ability_scores:str:+1;future:+1:max20",
      ),
    ).toMatchObject({
      _tag: "Left",
      left: { cause: { tag: "unsupportedAbility" } },
    });
    expect(
      decodeAbilityScoreIncreaseOptionId("ability_scores:str:+1;str:+1:max20"),
    ).toMatchObject({
      _tag: "Left",
      left: { cause: { tag: "duplicateAbilities" } },
    });
    expect(
      decodeAbilityScoreIncreaseOptionId("synthetic_unknown"),
    ).toMatchObject({
      _tag: "Left",
      left: { cause: { tag: "invalidAbilityScoreIncreaseEncoding" } },
    });
  });

  test("projects every proficiency subject and expands musical instruments", () => {
    for (const { subject, option } of Object.values(proficiencySubjectCases)) {
      expect(proficiencyGrantSubjectOption(subject)).toEqual(option);
      expect(proficiencyGrantSubjectOptionId(subject)).toBe(option.optionId);
    }

    expect(
      proficiencyGrantSubjectOptions({
        kind: "tool_category",
        category: "musical_instrument",
      }),
    ).toEqual(
      MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS.map((toolId) => ({
        optionId: `tool:${toolId}`,
        label: toolId,
      })),
    );
    expect(
      proficiencyGrantSubjectOptions({
        kind: "weapon_category",
        category: "martial",
      }),
    ).toEqual([
      {
        optionId: "weapon_category:martial",
        label: "Weapon category: martial",
      },
    ]);
  });

  test("decodes supported proficiency options and distinguishes failure causes", () => {
    const decodedCases = [
      ["medicine", { kind: "skill", skill: "medicine" }],
      [
        "weapon_category:martial",
        { kind: "weapon_category", category: "martial" },
      ],
      ["armor_category:light", { kind: "armor_category", category: "light" }],
      ["tool:thieves_tools", { kind: "tool", toolId: "thieves_tools" }],
    ] as const;
    for (const [optionId, expected] of decodedCases) {
      expect(decodeProficiencyGrantSubjectOptionId(optionId)).toEqual(
        Either.right(expected),
      );
    }

    const invalidCases = [
      ["weapon_category:future", "unsupportedWeaponCategory"],
      ["armor_category:future", "unsupportedArmorCategory"],
      ["tool:future", "unsupportedToolProficiencyId"],
      ["tool_category:musical_instrument", "invalidProficiencyEncoding"],
      ["synthetic_unknown", "invalidProficiencyEncoding"],
    ] as const;
    for (const [optionId, causeTag] of invalidCases) {
      expect(decodeProficiencyGrantSubjectOptionId(optionId)).toMatchObject({
        _tag: "Left",
        left: { cause: { tag: causeTag } },
      });
    }
  });

  test("projects only admitted tool identities from each input boundary", () => {
    expect(parseToolProficiencyId("thieves_tools")).toEqual(
      Either.right("thieves_tools"),
    );
    expect(parseToolProficiencyId("future")).toMatchObject({
      _tag: "Left",
      left: {
        cause: { tag: "unsupportedCharacterBuildToolProficiencyId" },
      },
    });
    expect(
      toolProficiencyIdsFromProficiencyChoiceOptionIds([
        "tool:thieves_tools",
        "medicine",
        "tool:future",
      ]),
    ).toEqual(["thieves_tools"]);
    expect(
      toolProficiencyIdsFromDirectToolOptionIds([
        "thieves_tools",
        "medicine",
        "future",
      ]),
    ).toEqual(["thieves_tools"]);
    expect(
      toolProficiencyIdsFromSubjects([
        { kind: "tool", toolId: "thieves_tools" },
        { kind: "skill", skill: "medicine" },
        { kind: "tool", toolId: "future" },
      ]),
    ).toEqual(["thieves_tools"]);
  });
});
