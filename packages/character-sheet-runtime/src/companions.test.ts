import { describe, expect, test } from "vitest";
import type { Hp as HpType } from "@dnd/shared/types";

import {
  characterSheetCompanion,
  characterSheetRetainedCompanionId,
  type CharacterSheet,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRetainedCompanionCurrentHitPoints,
  type CharacterSheetRetainedCompanionProtocol,
} from "./index.ts";
import {
  build,
  characterSheetId,
  completeLongRest,
  createFreshCharacterSheet,
  Hp,
  parseCharacterSheet,
  requireRight,
  unitLibrary,
} from "./test-support.ts";

function retainedCompanionInput(
  input: {
    readonly companionId?: string;
    readonly currentHp?: HpType;
    readonly selectedForm?: CharacterSheetCompanionFormSelection;
    readonly creatureTypeOverride?: CharacterSheetCompanionCreatureTypeOverride;
    readonly protocolTag?: CharacterSheetRetainedCompanionProtocol["tag"];
  } = {},
): CharacterSheetCompanion {
  const protocol = retainedCompanionProtocolInput(input.protocolTag);
  return {
    tag: "retainedOneAtATime",
    companion: {
      companionId: characterSheetRetainedCompanionId(
        input.companionId ?? "companion:cat",
      ),
      protocol,
      manifestation: {
        tag: "embodiedOutsideBattle",
        selectedForm: input.selectedForm ?? {
          tag: "normalNamedForm",
          formId: "cat",
        },
        creatureTypeOverride: input.creatureTypeOverride ?? "fey",
        resolvedStatBlockId: "stat_block_cat",
        hitPoints: {
          // Cast evidence: retainedCompanionInput is a test fixture helper; tests
          // pass zero explicitly only when asserting the constructor rejects it.
          currentHp: (input.currentHp ??
            Hp(2)) as CharacterSheetRetainedCompanionCurrentHitPoints,
          tempHp: Hp(1),
        },
      },
    },
  };
}

function retainedCompanionProtocolInput(
  protocolTag: CharacterSheetRetainedCompanionProtocol["tag"] | undefined,
): CharacterSheetRetainedCompanionProtocol {
  return { tag: protocolTag ?? "ordinaryFamiliarLikeOneAtATime" };
}

describe("Character Sheet runtime / companions", () => {
  test("creates and parses an empty durable companion slot", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:no-companion"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(characterSheetCompanion(sheet)).toEqual({ tag: "none" });
    expect(parseCharacterSheet(sheet, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: { companion: { tag: "none" } },
    });
  });

  test("retains one familiar-like companion with resolved form proof", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:retained-companion"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput(),
      }),
    );

    expect(characterSheetCompanion(sheet)).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        companionId: "companion:cat",
        manifestation: {
          tag: "embodiedOutsideBattle",
          resolvedStatBlockId: "stat_block_cat",
          hitPoints: { currentHp: 2, tempHp: 1 },
        },
      },
    });
  });

  test("rejects retained embodied companions with zero current HP", () => {
    expect(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:bad-companion-hp"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({ currentHp: Hp(0) }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Retained companion current HP must be positive unless it disappeared at 0 HP.",
      },
    });
  });

  test("rejects retained companions with an empty durable id", () => {
    expect(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:bad-companion-id"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({ companionId: "" }),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Retained companion requires companion id.",
      },
    });
  });

  test.each([
    {
      title: "special form without attack exception",
      companion: retainedCompanionInput({
        selectedForm: { tag: "pactOfTheChainSpecialForm", formId: "sprite" },
      }),
      message:
        "Retained companion special forms require the attack-exception protocol.",
    },
    {
      title: "Long Rest expiration without Fey override",
      companion: retainedCompanionInput({
        creatureTypeOverride: "fiend",
        protocolTag: "ownerLongRestFamiliarLikeOneAtATime",
      }),
      message:
        "Owner-long-rest expiring retained companions must use the Fey creature type override.",
    },
  ])(
    "rejects retained companion protocol hybrids: $title",
    ({ companion, message }) => {
      expect(
        createFreshCharacterSheet({
          characterId: characterSheetId("character:bad-companion-protocol"),
          build,
          maximumHp: Hp(12),
          currentHp: Hp(12),
          tempHp: Hp(0),
          unitLibrary,
          companion,
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { message },
      });
    },
  );

  test("rejects a stored retained companion protocol with an unknown tag", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          "character:unknown-companion-protocol",
        ),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({
          protocolTag: "attackExceptionFamiliarLikeOneAtATime",
        }),
      }),
    );
    const companion = characterSheetCompanion(sheet);
    expect(companion.tag).toBe("retainedOneAtATime");
    if (companion.tag !== "retainedOneAtATime") return;

    const storedSheet = {
      ...sheet,
      companion: {
        tag: "retainedOneAtATime",
        companion: {
          ...companion.companion,
          protocol: { tag: "somethingElseFamiliarLike" },
        },
      },
    } as unknown as CharacterSheet;

    expect(parseCharacterSheet(storedSheet, unitLibrary)).toMatchObject({
      _tag: "Left",
      left: { message: "Expected retained companion protocol tag." },
    });
  });

  test("removes owner-long-rest retained companions on Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:wild-companion"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        companion: retainedCompanionInput({
          protocolTag: "ownerLongRestFamiliarLikeOneAtATime",
        }),
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));

    expect(characterSheetCompanion(rested)).toEqual({ tag: "none" });
  });

  test("leaves a surviving retained companion's Hit Points and Temporary Hit Points unchanged on Long Rest (A46)", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId("character:familiar-rest-temp-hp"),
        build,
        maximumHp: Hp(12),
        currentHp: Hp(12),
        tempHp: Hp(0),
        unitLibrary,
        // 1/2 HP with 1 Temporary Hit Point distinguishes no-participation
        // (1/1) from shared-rest healing (2/0) and clear-THP-only behavior (1/0).
        companion: retainedCompanionInput({
          protocolTag: "ordinaryFamiliarLikeOneAtATime",
          currentHp: Hp(1),
        }),
      }),
    );

    const rested = requireRight(completeLongRest({ sheet, unitLibrary }));
    const companion = characterSheetCompanion(rested);

    expect(companion).toMatchObject({
      tag: "retainedOneAtATime",
      companion: {
        manifestation: {
          tag: "embodiedOutsideBattle",
          hitPoints: { currentHp: Hp(1), tempHp: Hp(1) },
        },
      },
    });
  });
});
