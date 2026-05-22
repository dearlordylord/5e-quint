// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME druid_wild_shape
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { ClassLevel } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { expect, test } from "vitest";

import {
  activeDruidWildShapeForm,
  activeDruidWildShapeEffect,
  battleDruidWildShapeKnownForms,
  battleShapeShiftedRuntimeState,
  combatantHasActiveDruidWildShape,
  combatantIsShapeShifted,
  parseSupportedUnitFeatureProfile,
  revertShapeShiftedCombatantToTrueForm,
  startBattle,
  type BattleCreatureState,
  type BattleState,
  type BattleSubject,
  type CharacterBattleCreatureState,
} from "./index.ts";
import {
  battleId,
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
const spiderId = "stat_block_spider";
const wolfId = "stat_block_wolf";

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
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-druid-wild-shape"),
    combatants: [
      druidWildShapeCreatureInit(input),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function druidWildShapeCreatureInit(input?: { readonly druidLevel?: number }) {
  return characterSeed({
    combatantId: druidId,
    displayName: "Druid",
    initiative: 20,
    classLevels: [{ className: "druid", level: input?.druidLevel ?? 2 }],
    resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
    druidWildShapeKnownForms: [
      statBlockCatalog.requireStatBlock(ratId),
      statBlockCatalog.requireStatBlock(ridingHorseId),
      statBlockCatalog.requireStatBlock(lizardId),
      statBlockCatalog.requireStatBlock(catId),
    ],
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: [spellRecord("produce_flame")],
        preparedSpells: [spellRecord("cure_wounds")],
      }),
      sourceClassName: "druid",
    },
  });
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
) {
  return resolveBattleSubject({ state, subject, fills: [] });
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
