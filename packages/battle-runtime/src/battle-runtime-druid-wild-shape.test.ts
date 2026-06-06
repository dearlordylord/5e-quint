// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION druid_wild_shape
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { ClassLevel } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import { expect, test } from "vitest";

import {
  activeDruidWildShapeForm,
  activeDruidWildShapeEffect,
  battleDruidWildShapeKnownForms,
  battleShapeShiftedRuntimeState,
  combatantAbilityCheckModifier,
  combatantD20AbilityScore,
  combatantHasActiveDruidWildShape,
  combatantIsShapeShifted,
  combatantSavingThrowModifier,
  combatantSkillModifier,
  parseSupportedUnitFeatureProfile,
  revertShapeShiftedCombatantToTrueForm,
  startBattle,
  validateWildShapeEquipmentDispositionFill,
  wildShapeLoadoutObjectRefs,
  type BattleFill,
  type BattleCreatureState,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CharacterBattleD20Statistics,
  type CharacterBattleCreatureState,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeLoadoutObjectRef,
} from "./index.ts";
import {
  battleId,
  battleObjectId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  spellRecord,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

const druidId = combatantId("wild-shape-druid");
const ratId = "stat_block_rat";
const ridingHorseId = "stat_block_riding_horse";
const lizardId = "stat_block_lizard";
const catId = "stat_block_cat";
const wolfId = "stat_block_wolf";
const spiderId = "stat_block_spider";

test("assumes, reuses, and dismisses a known Beast Wild Shape form", () => {
  const initial = druidWildShapeBattle();
  const assumeRidingHorse = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });

  const assumed = requireResolved(
    resolveDruidWildShape(initial, assumeRidingHorse),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const activeForm = activeDruidWildShapeForm(activeDruid);
  expect(activeForm?.id).toBe(ridingHorseId);
  expect(Number(activeDruid.tempHp)).toBe(2);
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);
  expect(assumed.state.currentTurnResources.currentHasBonusAction).toBe(false);

  const activeSnapshot = snapshotCreature(assumed.snapshot, druidId);
  expect(activeSnapshot.size).toBe("large");
  expect(Number(activeSnapshot.armorClass)).toBe(11);
  expect(Number(activeSnapshot.movement.speedFeet)).toBe(60);

  const activeActs = discoverBattleActs(assumed.state);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Hooves",
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "actionSpell" ||
        (act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Longsword"),
    ),
  ).toBe(false);

  const nextTurn = restoreBonusAction(assumed.state);
  const assumeCat = wildShapeSubject(nextTurn, {
    action: "assumeForm",
    formStatBlockId: catId,
  });
  const reused = requireResolved(resolveDruidWildShape(nextTurn, assumeCat));
  const reusedDruid = requireCharacter(reused.state, druidId);
  expect(activeDruidWildShapeForm(reusedDruid)?.id).toBe(catId);
  expect(
    discoverBattleActs(reused.state).some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Scratch",
    ),
  ).toBe(true);
  expect(
    reusedDruid.activeEffects.filter(
      (effect) => effect.kind === "druidWildShapeForm",
    ),
  ).toHaveLength(1);
  expect(druidWildShapeUsesRemaining(reusedDruid)).toBe(0);

  const dismissTurn = restoreBonusAction(reused.state);
  const dismiss = wildShapeSubject(dismissTurn, { action: "dismiss" });
  const dismissed = requireResolved(
    resolveDruidWildShape(dismissTurn, dismiss),
  );
  const dismissedDruid = requireCharacter(dismissed.state, druidId);
  expect(combatantHasActiveDruidWildShape(dismissedDruid)).toBe(false);
  expect(druidWildShapeUsesRemaining(dismissedDruid)).toBe(0);

  const dismissedSnapshot = snapshotCreature(dismissed.snapshot, druidId);
  expect(dismissedSnapshot.size).toBe("medium");
  expect(Number(dismissedSnapshot.movement.speedFeet)).toBe(30);
});

test("derives Wild Shape equipment disposition candidates from selected loadout object refs", () => {
  const selectedLoadout = wildShapeSelectedLoadout();
  expect(wildShapeLoadoutObjectRefs(selectedLoadout)).toEqual([
    {
      kind: "armor",
      objectId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    {
      kind: "shield",
      objectId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    {
      kind: "mainWeapon",
      objectId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
    },
    {
      kind: "offHandWeapon",
      objectId: "offhand:weapon_dagger",
      unitId: "weapon_dagger",
    },
  ]);
  expect(wildShapeLoadoutObjectRefs({})).toEqual([]);
});

test("requires and validates Wild Shape equipment disposition fills for selected loadout equipment", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });

  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  expect(dispositionHole.candidates.map((candidate) => candidate.kind)).toEqual(
    ["armor", "shield", "mainWeapon"],
  );
  expect(druidWildShapeUsesRemaining(requireCharacter(initial, druidId))).toBe(
    2,
  );

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(
        dispositionHole,
        dispositionHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual(
    dispositionHole.candidates.map((item) => ({ item, disposition: "merges" })),
  );
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);

  const activeActs = discoverBattleActs(resolved.state);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Quarterstaff",
    ),
  ).toBe(false);
});

test("rejects Wild Shape equipment disposition fills from a different form hole", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const ridingHorseSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const catSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: catId,
  });

  const ridingHorseNeedsDisposition = resolveDruidWildShape(
    initial,
    ridingHorseSubject,
  );
  const catNeedsDisposition = resolveDruidWildShape(initial, catSubject);
  if (
    ridingHorseNeedsDisposition.tag !== "needsHoles" ||
    catNeedsDisposition.tag !== "needsHoles"
  ) {
    throw new Error("Expected Wild Shape equipment disposition holes.");
  }
  const ridingHorseHole = requireWildShapeEquipmentDispositionHole(
    ridingHorseNeedsDisposition.holes,
  );
  const catHole = requireWildShapeEquipmentDispositionHole(
    catNeedsDisposition.holes,
  );

  expect(catHole.holeId).not.toBe(ridingHorseHole.holeId);
  expect(
    resolveDruidWildShape(initial, catSubject, [
      wildShapeDispositionFill(
        ridingHorseHole,
        ridingHorseHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Druid Wild Shape equipment disposition fill must match the equipment disposition hole.",
  });
});

test("rejects practical worn Wild Shape equipment until effective-loadout support exists", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      shield: {
        itemId: "shield:equipment_shield",
        unitId: "equipment_shield",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "shield",
  );
  if (shield === undefined) {
    throw new Error("Expected shield disposition candidate.");
  }

  expect(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Druid Wild Shape worn equipment requires effective loadout support before battle resolution.",
  });
});

test("rejects fallen Wild Shape equipment until fallen-object boundary support exists", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      shield: {
        itemId: "shield:equipment_shield",
        unitId: "equipment_shield",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates[0];
  if (shield === undefined) {
    throw new Error("Expected shield disposition candidate.");
  }

  expect(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "falls",
        },
      ]),
    ]),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Druid Wild Shape fallen equipment requires fallen-object boundary support before battle resolution.",
  });
});

test("rejects invalid Wild Shape equipment disposition choices and converts impossible worn choices to merge fallback", () => {
  const candidates = wildShapeLoadoutObjectRefs({
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
  });
  const [armor, shield] = candidates;
  if (armor === undefined || shield === undefined) {
    throw new Error("Expected armor and shield candidates.");
  }

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        choices: [{ item: armor, disposition: "merges" }],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        choices: [
          { item: armor, disposition: "falls" },
          { item: armor, disposition: "merges" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  const unknown = {
    kind: "mainWeapon",
    objectId: battleObjectId("main:weapon_synthetic"),
    unitId: "weapon_synthetic",
  } as const satisfies WildShapeLoadoutObjectRef;
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        choices: [
          { item: armor, disposition: "merges" },
          { item: unknown, disposition: "falls" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "merges",
            },
          },
          {
            item: shield,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "falls",
            },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "invalid",
    message:
      "Druid Wild Shape fallen equipment requires fallen-object boundary support before battle resolution.",
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: "merges",
            },
          },
          { item: shield, disposition: "merges" },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      { item: shield, disposition: "merges" },
    ],
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates: [shield],
      value: {
        choices: [
          {
            item: shield,
            disposition: "worn",
            practicality: { kind: "practicalToWear" },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "invalid",
    message:
      "Druid Wild Shape worn equipment requires effective loadout support before battle resolution.",
  });
});

test("uses Beast Strength for Shove while in Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const subject: BattleSubject = {
    tag: "action",
    actorId: druidId,
    action: "shove",
  };
  const target = requireHole(
    resolveBattleSubject({ state: assumed.state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        targetFill(target, goblinId, [
          {
            kind: "shoveTargetWithinReach",
            shoverId: druidId,
            targetId: goblinId,
          },
        ]),
      ],
    }),
    "shoveOutcome",
  );
  if (outcome.kind !== "shoveOutcome") {
    throw new Error("Expected Shove outcome.");
  }

  expect(outcome.dc).toBe(13);
});

test("projects Beast physical and retained character mental Ability Scores", () => {
  const initial = druidWildShapeBattle({
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 8,
        con: 8,
        int: 16,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: [],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantD20AbilityScore(druid, "str")).toBe(16);
  expect(combatantD20AbilityScore(druid, "dex")).toBe(13);
  expect(combatantD20AbilityScore(druid, "con")).toBe(12);
  expect(combatantD20AbilityScore(druid, "int")).toBe(16);
  expect(combatantD20AbilityScore(druid, "wis")).toBe(14);
  expect(combatantD20AbilityScore(druid, "cha")).toBe(12);
});

test("projects retained and Beast Skill modifiers while in Wild Shape", () => {
  const ridingHorseWithSkills: StatBlockRecord = {
    ...statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlock: {
      ...statBlockCatalog.requireStatBlock(ridingHorseId).statBlock,
      skillModifiers: [
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSkills,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 16,
        wis: 14,
        cha: 10,
      },
      savingThrowProficiencies: [],
      skillProficiencies: ["nature", "stealth"],
      skillExpertise: ["stealth"],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(
    combatantAbilityCheckModifier(druid, { ability: "int", skill: "nature" }),
  ).toBe(5);
  expect(combatantSkillModifier(druid, "stealth")).toBe(5);
  expect(combatantSkillModifier(druid, "perception")).toBe(5);
});

test("projects retained and higher Beast Saving Throw modifiers while in Wild Shape", () => {
  const ridingHorseWithSavingThrows: StatBlockRecord = {
    ...statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlock: {
      ...statBlockCatalog.requireStatBlock(ridingHorseId).statBlock,
      savingThrowModifiers: [
        { ability: "dex", modifier: 6 },
        { ability: "wis", modifier: 1 },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSavingThrows,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 10,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: ["dex", "wis"],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantSavingThrowModifier(druid, "dex")).toBe(6);
  expect(combatantSavingThrowModifier(druid, "wis")).toBe(4);
  expect(combatantSavingThrowModifier(druid, "cha")).toBe(1);
});

test("offers one assume-form act for each known Beast form", () => {
  const initial = druidWildShapeBattle();
  const acts = discoverBattleActs(initial);
  expect(
    acts.filter(
      (act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm",
    ),
  ).toHaveLength(4);
});

test("rejects ineligible known Beast forms before battle initialization", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ridingHorseId),
      statBlockCatalog.requireStatBlock(catId),
      statBlockCatalog.requireStatBlock("stat_block_skeleton"),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
    );
  }
});

test("rejects known Beast forms without promoted movement facts", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const ridingHorse = statBlockCatalog.requireStatBlock(ridingHorseId);
  const noWalkSpeedForm = {
    ...ridingHorse,
    statBlock: {
      ...ridingHorse.statBlock,
      speeds: [
        {
          kind: "swim" as const,
          feet: { kind: "literal" as const, value: 30 },
        },
      ] as const,
    },
  };
  const result = battleDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      noWalkSpeedForm,
      statBlockCatalog.requireStatBlock(lizardId),
      statBlockCatalog.requireStatBlock(catId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle forms require literal Walk Speed.",
    );
  }
});

test("rejects known Beast forms with unsupported stat block action riders", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ridingHorseId),
      statBlockCatalog.requireStatBlock(spiderId),
      statBlockCatalog.requireStatBlock(wolfId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape battle forms require supported Stat Block action sections.",
    );
  }
});

test("projects automatic reversion when Wild Shape ends from Incapacitated", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const incapacitatedDruid: BattleCreatureState = {
    ...activeDruid,
    conditions: applyCondition(activeDruid.conditions, "incapacitated"),
    positiveHpUnconscious: null,
  };
  const state: BattleState = {
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(
      druidId,
      incapacitatedDruid,
    ),
  };

  expect(combatantHasActiveDruidWildShape(incapacitatedDruid)).toBe(false);
  const snapshot = snapshotCreature(snapshotBattle(state), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("shared shape-shift owner projects and reverts active Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const shapeShiftedDruid = requireCharacter(assumed.state, druidId);
  expect(combatantIsShapeShifted(shapeShiftedDruid)).toBe(true);
  expect(battleShapeShiftedRuntimeState(shapeShiftedDruid)).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "classFeature" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "druidWildShapeActiveEffect" },
  });

  const result = revertShapeShiftedCombatantToTrueForm({
    state: assumed.state,
    combatantId: druidId,
  });
  expect(result.tag).toBe("reverted");
  const revertedState = result.state;

  const revertedDruid = requireCharacter(revertedState, druidId);
  expect(combatantIsShapeShifted(revertedDruid)).toBe(false);
  expect(activeDruidWildShapeForm(revertedDruid)).toBe(null);
  const snapshot = snapshotCreature(snapshotBattle(revertedState), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("shape-shift reversion reports a missing combatant distinctly", () => {
  const initial = druidWildShapeBattle();
  const missingId = combatantId("missing-shape-shift-combatant");
  const result = revertShapeShiftedCombatantToTrueForm({
    state: initial,
    combatantId: missingId,
  });

  expect(result).toMatchObject({
    tag: "missingCombatant",
    combatantId: missingId,
  });
});

test("rejects level 18 Wild Shape until Beast Spells is modeled", () => {
  const result = startBattle({
    battleId: battleId("battle-druid-wild-shape-level-18"),
    combatants: [
      characterSeed({
        combatantId: druidId,
        displayName: "Druid",
        initiative: 20,
        classLevels: [{ className: "druid", level: 18 }],
        resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(result.left.message).toBe(
      "Druid Wild Shape level 18+ requires Beast Spells support before battle initialization.",
    );
  }
});

test("rounds odd-level duration down through the general division rule", () => {
  const initial = druidWildShapeBattle({ druidLevel: 3 });
  const assumed = requireResolved(
    resolveDruidWildShape(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const effect = activeDruidWildShapeEffect(
    requireCharacter(assumed.state, druidId),
  );
  expect(Number(effect?.expiresAt.durationTicks)).toBe(600);
});

function druidWildShapeBattle(input?: {
  readonly druidLevel?: number;
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-druid-wild-shape"),
    combatants: [
      druidWildShapeCreatureInit(input),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function druidWildShapeCreatureInit(input?: {
  readonly druidLevel?: number;
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
}) {
  return characterSeed({
    combatantId: druidId,
    displayName: "Druid",
    initiative: 20,
    classLevels: [{ className: "druid", level: input?.druidLevel ?? 2 }],
    resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
    ...(input?.d20Statistics === undefined
      ? {}
      : { d20Statistics: input.d20Statistics }),
    druidWildShapeKnownForms:
      input?.knownForms ?? druidWildShapeKnownFormsWith(catId),
    selectedLoadout: input?.selectedLoadout ?? {},
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: [spellRecord("produce_flame")],
        preparedSpells: [spellRecord("cure_wounds")],
      }),
      sourceClassName: "druid",
    },
  });
}

function druidWildShapeKnownFormsWith(
  fourthFormId: string,
  fourthForm: StatBlockRecord = statBlockCatalog.requireStatBlock(fourthFormId),
): readonly StatBlockRecord[] {
  return [
    statBlockCatalog.requireStatBlock(ratId),
    statBlockCatalog.requireStatBlock(ridingHorseId),
    statBlockCatalog.requireStatBlock(lizardId),
    fourthForm,
  ];
}

function druidWildShapeKnownFormsReplacingRidingHorse(
  ridingHorse: StatBlockRecord,
): readonly StatBlockRecord[] {
  return [
    statBlockCatalog.requireStatBlock(ratId),
    ridingHorse,
    statBlockCatalog.requireStatBlock(lizardId),
    statBlockCatalog.requireStatBlock(catId),
  ];
}

function wildShapeSubject(
  state: BattleState,
  input:
    | {
        readonly action: "assumeForm";
        readonly formStatBlockId: string;
      }
    | { readonly action: "dismiss" },
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === input.action &&
      (input.action === "dismiss" ||
        (act.subject.action === "assumeForm" &&
          act.subject.formStatBlockId === input.formStatBlockId)),
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape act.");
  }
  return subject;
}

function resolveDruidWildShape(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
  fills: readonly BattleFill[] = [],
) {
  return resolveBattleSubject({ state, subject, fills });
}

function wildShapeSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    weapon: {
      itemId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
      grip: "two_handed",
    },
    offHandWeapon: {
      itemId: "offhand:weapon_dagger",
      unitId: "weapon_dagger",
    },
  };
}

function wildShapeBattleSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: "armor:equipment_leather",
      unitId: "equipment_leather",
    },
    shield: {
      itemId: "shield:equipment_shield",
      unitId: "equipment_shield",
    },
    weapon: {
      itemId: "main:weapon_quarterstaff",
      unitId: "weapon_quarterstaff",
      grip: "one_handed",
    },
  };
}

function requireWildShapeEquipmentDispositionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "wildShapeEquipmentDisposition" }
    > => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  return hole;
}

function wildShapeDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }>,
  choices: readonly WildShapeEquipmentDispositionChoice[],
): Extract<BattleFill, { readonly kind: "wildShapeEquipmentDisposition" }> {
  return {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      choices,
    },
  };
}

function requireCharacter(
  state: BattleState,
  combatantId: typeof druidId,
): CharacterBattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error("Expected Druid character combatant.");
  }
  return combatant;
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return combatant?.origin.kind === "character";
}

function druidWildShapeUsesRemaining(
  combatant: CharacterBattleCreatureState,
): number {
  const resource = combatant.origin.resources.find(
    (candidate) => candidate.unit.id === "druid_wild_shape",
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape resource.");
  }
  return Number(resource.usesRemaining);
}

function restoreBonusAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      currentHasBonusAction: true,
    },
  };
}

function snapshotCreature(
  snapshot: ReturnType<typeof snapshotBattle>,
  combatantId: typeof druidId,
) {
  const creature = snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (creature === undefined) {
    throw new Error("Expected Druid snapshot.");
  }
  return creature;
}
