// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.restoration-death-spell-session
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-06-L5-RESTORATION-DEATH greater_restoration raise_dead reincarnate
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-06-L5-RESTORATION-DEATH greater_restoration raise_dead reincarnate
// UNIT-IDENTITY-REPLAY: L19E-06-L5-RESTORATION-DEATH greater_restoration doCastGreaterRestorationCharmed
// UNIT-IDENTITY-REPLAY: L19E-06-L5-RESTORATION-DEATH raise_dead doCastRaiseDead
// UNIT-IDENTITY-REPLAY: L19E-06-L5-RESTORATION-DEATH reincarnate doCastReincarnate
import {
  statBlockId as authoredStatBlockId,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";
import type { CharacterSheet } from "./index.ts";

import {
  Either,
  Hp,
  armorClassBuild,
  castGreaterRestorationOnSheet,
  castRaiseDeadOnSheet,
  castReincarnateOnSheet,
  characterSheetId,
  characterSheetSpellSlots,
  rebuildCharacterSheetFixture,
  druidWildShapeFixtureKnownFormStatBlockIds,
  greaterRestorationSheetSessionTestName,
  raiseDeadSheetSessionTestName,
  reincarnateSheetSessionTestName,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";

const completedTouchCasting = {
  tag: "completedTouchSpellCasting",
  targetWithinTouch: true,
  materialComponent: {
    tag: "consumedMaterialComponent",
    costGp: 500,
    consumed: true,
  },
} as const;

const restorationDeathSelectedIdentityDriverSchema = {
  doCastGreaterRestorationCharmed: {},
  doCastRaiseDead: {},
  doCastReincarnate: {},
} as const;

type RestorationDeathSelectedIdentityDriverAction =
  keyof typeof restorationDeathSelectedIdentityDriverSchema;

type RestorationDeathSelectedIdentityProjection = {
  readonly spellId: string;
  readonly slotExpended: number;
  readonly targetCurrentHp: number;
  readonly targetConditions: readonly string[];
  readonly deferredMechanics: readonly string[];
  readonly speciesReplacement?: "table-session";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RestorationDeathSelectedIdentityDriverAction[];
  readonly expected: RestorationDeathSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-06-L5-RESTORATION-DEATH";
  readonly unitId: "greater_restoration" | "raise_dead" | "reincarnate";
  readonly actions: readonly RestorationDeathSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-06-L5-RESTORATION-DEATH",
    unitId: "greater_restoration",
    actions: ["doCastGreaterRestorationCharmed"],
    sequences: [
      {
        name: "selected-greater-restoration-removes-charmed",
        actions: ["doCastGreaterRestorationCharmed"],
        expected: {
          spellId: "greater_restoration",
          slotExpended: 1,
          targetCurrentHp: 7,
          targetConditions: ["petrified"],
          deferredMechanics: [],
        },
      },
    ],
  },
  {
    taskId: "L19E-06-L5-RESTORATION-DEATH",
    unitId: "raise_dead",
    actions: ["doCastRaiseDead"],
    sequences: [
      {
        name: "selected-raise-dead-revives-dead-sheet",
        actions: ["doCastRaiseDead"],
        expected: {
          spellId: "raise_dead",
          slotExpended: 1,
          targetCurrentHp: 1,
          targetConditions: ["petrified"],
          deferredMechanics: [
            "raise_dead_d20_test_penalty",
            "dead_glossary_exhaustion_and_attunement_return_cleanup",
          ],
        },
      },
    ],
  },
  {
    taskId: "L19E-06-L5-RESTORATION-DEATH",
    unitId: "reincarnate",
    actions: ["doCastReincarnate"],
    sequences: [
      {
        name: "selected-reincarnate-spends-and-returns-species-contract",
        actions: ["doCastReincarnate"],
        expected: {
          spellId: "reincarnate",
          slotExpended: 1,
          targetCurrentHp: 0,
          targetConditions: ["petrified"],
          deferredMechanics: [
            "reincarnate_species_replacement_owner",
            "reincarnate_current_hit_points_owner",
            "dead_glossary_exhaustion_and_attunement_return_cleanup",
          ],
          speciesReplacement: "table-session",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / restoration and death spells", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<RestorationDeathSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: RestorationDeathSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = restorationDeathSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test(greaterRestorationSheetSessionTestName, () => {
    const caster = restorationCasterSheet({
      characterId: "character:greater-restoration-caster",
      spellId: "greater_restoration",
    });
    const target = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:greater-restoration-target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(7),
        tempHp: Hp(0),
        conditions: ["charmed", "petrified"],
        unitLibrary,
      }),
    );

    const result = requireRight(
      castGreaterRestorationOnSheet({
        caster,
        target,
        unitLibrary,
        spellId: authoredUnitId("greater_restoration"),
        castLevel: spellSlotLevel(5),
        casting: {
          ...completedTouchCasting,
          materialComponent: {
            tag: "consumedMaterialComponent",
            costGp: 100,
            consumed: true,
          },
        },
        effect: { tag: "condition", condition: "charmed" },
      }),
    );

    expect(characterSheetSpellSlots(result.caster)).toEqual([
      { spellLevel: 5, count: 1, expended: 1 },
    ]);
    expect(result.target.conditions).toEqual(["petrified"]);
    expect(result.deferredMechanics).toEqual([]);
  });

  test(raiseDeadSheetSessionTestName, () => {
    const caster = restorationCasterSheet({
      characterId: "character:raise-dead-caster",
      spellId: "raise_dead",
    });
    const target = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:raise-dead-target"),
        build: armorClassBuild({ startingClass: "class_fighter" }),
        currentHp: Hp(0),
        tempHp: Hp(0),
        zeroHpLifecycle: {
          tag: "dead",
          deathSaves: { successes: 0, failures: 3 },
        },
        conditions: ["poisoned", "petrified"],
        unitLibrary,
      }),
    );

    const result = requireRight(
      castRaiseDeadOnSheet({
        caster,
        target,
        unitLibrary,
        spellId: authoredUnitId("raise_dead"),
        castLevel: spellSlotLevel(5),
        casting: completedTouchCasting,
        eligibility: {
          deadForDays: 3,
          wasUndeadWhenDied: false,
          hasIntegralBodyParts: true,
          spiritConsent: "accepted",
        },
      }),
    );

    expect(characterSheetSpellSlots(result.caster)).toEqual([
      { spellLevel: 5, count: 1, expended: 1 },
    ]);
    expect(result.target.hitPoints).toEqual({
      tag: "positive",
      currentHp: 1,
      tempHp: 0,
    });
    expect(result.target.conditions).toEqual(["petrified"]);
    expect(result.deferredMechanics).toEqual([
      "raise_dead_d20_test_penalty",
      "dead_glossary_exhaustion_and_attunement_return_cleanup",
    ]);
  });

  test(reincarnateSheetSessionTestName, () => {
    const caster = restorationCasterSheet({
      characterId: "character:reincarnate-caster",
      spellId: "reincarnate",
    });
    const target = reincarnateTargetSheet();

    const result = requireRight(
      castReincarnateOnSheet({
        caster,
        target,
        unitLibrary,
        spellId: authoredUnitId("reincarnate"),
        castLevel: spellSlotLevel(5),
        casting: {
          ...completedTouchCasting,
          materialComponent: {
            tag: "consumedMaterialComponent",
            costGp: 1000,
            consumed: true,
          },
        },
        eligibility: {
          deadForDays: 3,
          targetRemains: "pieceOfDeadHumanoid",
          soulConsent: "accepted",
        },
      }),
    );

    expect(characterSheetSpellSlots(result.caster)).toEqual([
      { spellLevel: 5, count: 1, expended: 1 },
    ]);
    expect(result.target).toBe(target);
    expect(result.speciesReplacement).toEqual({
      tag: "tableSessionSpeciesReplacement",
      previousSpeciesUnitId: "species_orc",
      speciesDetermination: "roll1d10OrGmPlayableSpeciesChoice",
      speciesChoicesOwner: "table-session",
      characterBuildSpeciesReplacementOwner:
        "deferred-character-creation-runtime",
      previousSpeciesTraits: "lost",
      newSpeciesTraits: "gained",
    });
    expect(result.hitPoints).toEqual({
      tag: "tableSessionRevivalHitPoints",
      currentHitPointOwner: "table-session",
      characterSheetHitPointMutation: "deferred",
      reason: "srdReincarnateDoesNotStateCurrentHitPoints",
    });
    expect(result.deferredMechanics).toEqual([
      "reincarnate_species_replacement_owner",
      "reincarnate_current_hit_points_owner",
      "dead_glossary_exhaustion_and_attunement_return_cleanup",
    ]);
  });

  test("Reincarnate requires prepared class Spell Access", () => {
    const result = castReincarnateOnSheet({
      caster: restorationCasterSheet({
        characterId: "character:reincarnate-unprepared-caster",
        spellId: "raise_dead",
      }),
      target: reincarnateTargetSheet(),
      unitLibrary,
      spellId: authoredUnitId("reincarnate"),
      castLevel: spellSlotLevel(5),
      casting: {
        ...completedTouchCasting,
        materialComponent: {
          tag: "consumedMaterialComponent",
          costGp: 1000,
          consumed: true,
        },
      },
      eligibility: {
        deadForDays: 3,
        targetRemains: "deadHumanoid",
        soulConsent: "accepted",
      },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Reincarnate requires prepared class Spell Access.",
      );
    }
  });

  test("Reincarnate requires the soul to accept revival", () => {
    const result = castReincarnateOnSheet({
      caster: restorationCasterSheet({
        characterId: "character:reincarnate-refused-caster",
        spellId: "reincarnate",
      }),
      target: reincarnateTargetSheet(),
      unitLibrary,
      spellId: authoredUnitId("reincarnate"),
      castLevel: spellSlotLevel(5),
      casting: {
        ...completedTouchCasting,
        materialComponent: {
          tag: "consumedMaterialComponent",
          costGp: 1000,
          consumed: true,
        },
      },
      eligibility: {
        deadForDays: 3,
        targetRemains: "deadHumanoid",
        soulConsent: "refused",
      },
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Reincarnate requires the soul to accept revival.",
      );
    }
  });
});

const restorationDeathSelectedIdentityActions = {
  doCastGreaterRestorationCharmed: projectGreaterRestoration,
  doCastRaiseDead: projectRaiseDead,
  doCastReincarnate: projectReincarnate,
} as const satisfies Record<
  RestorationDeathSelectedIdentityDriverAction,
  () => RestorationDeathSelectedIdentityProjection
>;

function projectGreaterRestoration(): RestorationDeathSelectedIdentityProjection {
  const caster = restorationCasterSheet({
    characterId: "character:greater-restoration-replay-caster",
    spellId: "greater_restoration",
  });
  const target = greaterRestorationTargetSheet();
  const result = requireRight(
    castGreaterRestorationOnSheet({
      caster,
      target,
      unitLibrary,
      spellId: authoredUnitId("greater_restoration"),
      castLevel: spellSlotLevel(5),
      casting: {
        ...completedTouchCasting,
        materialComponent: {
          tag: "consumedMaterialComponent",
          costGp: 100,
          consumed: true,
        },
      },
      effect: { tag: "condition", condition: "charmed" },
    }),
  );
  return projectRestorationDeathResult(result);
}

function projectRaiseDead(): RestorationDeathSelectedIdentityProjection {
  const caster = restorationCasterSheet({
    characterId: "character:raise-dead-replay-caster",
    spellId: "raise_dead",
  });
  const target = raiseDeadTargetSheet();
  const result = requireRight(
    castRaiseDeadOnSheet({
      caster,
      target,
      unitLibrary,
      spellId: authoredUnitId("raise_dead"),
      castLevel: spellSlotLevel(5),
      casting: completedTouchCasting,
      eligibility: {
        deadForDays: 3,
        wasUndeadWhenDied: false,
        hasIntegralBodyParts: true,
        spiritConsent: "accepted",
      },
    }),
  );
  return projectRestorationDeathResult(result);
}

function projectReincarnate(): RestorationDeathSelectedIdentityProjection {
  const caster = restorationCasterSheet({
    characterId: "character:reincarnate-replay-caster",
    spellId: "reincarnate",
  });
  const target = reincarnateTargetSheet();
  const result = requireRight(
    castReincarnateOnSheet({
      caster,
      target,
      unitLibrary,
      spellId: authoredUnitId("reincarnate"),
      castLevel: spellSlotLevel(5),
      casting: {
        ...completedTouchCasting,
        materialComponent: {
          tag: "consumedMaterialComponent",
          costGp: 1000,
          consumed: true,
        },
      },
      eligibility: {
        deadForDays: 3,
        targetRemains: "deadHumanoid",
        soulConsent: "accepted",
      },
    }),
  );
  return {
    ...projectRestorationDeathResult(result),
    speciesReplacement: result.speciesReplacement.speciesChoicesOwner,
  };
}

function projectRestorationDeathResult(input: {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly spellId: string;
  readonly deferredMechanics: readonly string[];
}): RestorationDeathSelectedIdentityProjection {
  return {
    spellId: input.spellId,
    slotExpended:
      characterSheetSpellSlots(input.caster)?.find(
        (slot) => slot.spellLevel === spellSlotLevel(5),
      )?.expended ?? 0,
    targetCurrentHp:
      input.target.hitPoints.tag === "positive"
        ? input.target.hitPoints.currentHp
        : 0,
    targetConditions: input.target.conditions,
    deferredMechanics: input.deferredMechanics,
  };
}

function greaterRestorationTargetSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:greater-restoration-target"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      currentHp: Hp(7),
      tempHp: Hp(0),
      conditions: ["charmed", "petrified"],
      unitLibrary,
    }),
  );
}

function raiseDeadTargetSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:raise-dead-target"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      currentHp: Hp(0),
      tempHp: Hp(0),
      zeroHpLifecycle: {
        tag: "dead",
        deathSaves: { successes: 0, failures: 3 },
      },
      conditions: ["poisoned", "petrified"],
      unitLibrary,
    }),
  );
}

function reincarnateTargetSheet() {
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:reincarnate-target"),
      build: armorClassBuild({ startingClass: "class_fighter" }),
      currentHp: Hp(0),
      tempHp: Hp(0),
      zeroHpLifecycle: {
        tag: "dead",
        deathSaves: { successes: 0, failures: 3 },
      },
      conditions: ["petrified"],
      unitLibrary,
    }),
  );
}

function restorationCasterSheet(input: {
  readonly characterId: string;
  readonly spellId: "greater_restoration" | "raise_dead" | "reincarnate";
}) {
  const classUnitId =
    input.spellId === "reincarnate" ? "class_druid" : "class_cleric";
  const spellcastingFocus =
    input.spellId === "reincarnate" ? "druidic_focus" : "holy_symbol";
  return requireRight(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId(input.characterId),
      build: {
        ...armorClassBuild({
          startingClass: classUnitId,
          advancements: Array.from({ length: 8 }, () => classUnitId),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: authoredUnitId(classUnitId),
              spellcastingAbility: "wis",
              cantrips: [],
              spellbook: [],
              preparedSpells: [authoredUnitId(input.spellId)],
              spellcastingFocuses: [spellcastingFocus],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 5, count: 1 }],
            },
          },
        },
      },
      currentHp: Hp(44),
      tempHp: Hp(0),
      ...(input.spellId === "reincarnate"
        ? {
            druidWildShapeKnownFormStatBlockIds: [
              ...druidWildShapeFixtureKnownFormStatBlockIds,
              authoredStatBlockId("stat_block_cat"),
              authoredStatBlockId("stat_block_frog"),
              authoredStatBlockId("stat_block_bat"),
              authoredStatBlockId("stat_block_owl"),
            ],
          }
        : {}),
      unitLibrary,
    }),
  );
}
