// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-sleep-repeat-save-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  fighterId,
  oppositionSide,
  partySide,
  skeletonId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  breakBattleConcentration,
  characterId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

// Production path: Sleep is admitted through the spell support profile selected
// by `spellSlotInvocationRef`; initial holes are discovered with
// `discoverBattleActs` from `./index.ts`; saving throw fills and end-turn
// commands are submitted through `resolveBattleSubject`; concentration cleanup
// uses `breakBattleConcentration`; the resulting `BattleState` mutation is
// observed through `snapshotBattle`.

type SleepRepeatSaveMbtHole = "SavingThrowOutcome";
type SleepRepeatSaveMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type SleepRepeatSaveMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";
type SleepRepeatSaveMbtTurnRole = "caster" | "target";
type SleepSavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;

type SleepRepeatSaveMbtProjection = {
  readonly currentTurnRole: SleepRepeatSaveMbtTurnRole;
  readonly targetIncapacitated: boolean;
  readonly targetUnconscious: boolean;
  readonly targetProne: boolean;
  readonly casterConcentrating: boolean;
  readonly actionAvailable: boolean;
  readonly holes: readonly SleepRepeatSaveMbtHole[];
  readonly lastResult: SleepRepeatSaveMbtLastResult;
  readonly lastInvalidReason: SleepRepeatSaveMbtLastInvalidReason;
};

const sleepUnit = unitLibrary.requireUnit("sleep");
if (sleepUnit.kind !== "spell") {
  throw new Error("Expected Sleep content to decode as a spell Unit.");
}
const sleepSpell = sleepUnit;

const sleepRepeatSaveDriverSchema = {
  init: {},
  doFillInitialSaveFailure: {},
  doBreakConcentrationBeforeRepeat: {},
  doEndCasterTurn: {},
  doEndCasterTurnAfterConcentrationBreak: {},
  doEndTargetTurnAfterConcentrationBreak: {},
  doDiscoverRepeatSave: {},
  doFillRepeatSaveSuccess: {},
  doFillRepeatSaveFailure: {},
  step: {},
} as const;

function createSleepRepeatSaveDriver() {
  return defineDriver(sleepRepeatSaveDriverSchema, () => {
    let state = sleepRepeatSaveBattle();
    let subject: BattleSubject = sleepSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverSleepHoles(state, subject);
    let lastResult: SleepRepeatSaveMbtProjection["lastResult"] = "init";
    let lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = sleepRepeatSaveBattle();
      subject = sleepSubject();
      fills = [];
      holes = discoverSleepHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = sleepRepeatSaveMbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithSleepRepeatSaveSpatialFacts(holes, nextFills);
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    function fillRepeatSave(succeeded: boolean): void {
      const repeatSave = findSleepRepeatSaveSavingThrowHole(holes);
      submit([sleepSavingThrowOutcomeFill(repeatSave, skeletonId, succeeded)]);
    }

    return {
      init: reset,
      doFillInitialSaveFailure: () => {
        const initialSave = findSleepRepeatSaveSavingThrowHole(holes);
        submit([sleepSavingThrowOutcomeFill(initialSave, skeletonId, false)]);
      },
      doBreakConcentrationBeforeRepeat: () => {
        state = breakBattleConcentration(state, fighterId);
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "";
      },
      doEndCasterTurn: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndCasterTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndTargetTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doDiscoverRepeatSave: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doFillRepeatSaveSuccess: () => fillRepeatSave(true),
      doFillRepeatSaveFailure: () => fillRepeatSave(false),
      step: () => {},
      getState: () =>
        projectSleepRepeatSaveMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

const sleepRepeatSaveStateCheck = stateCheck(
  normalizeSleepRepeatSaveQuintState,
  (spec: SleepRepeatSaveMbtProjection, impl: SleepRepeatSaveMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Sleep repeat-save MBT parity", () => {
  it("replays Sleep pending repeat-save lifecycle and concentration cleanup", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-sleep-repeat-save.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSleepRepeatSaveDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: sleepRepeatSaveStateCheck,
    });
  }, 120_000);
});

function normalizeSleepRepeatSaveQuintState(
  raw: unknown,
): SleepRepeatSaveMbtProjection {
  const state = quintStateRecord(raw);

  return {
    currentTurnRole: sleepRepeatSaveMbtTurnRole(
      state["qCurrentTurnRole"],
      "qCurrentTurnRole",
    ),
    targetIncapacitated: booleanField(state, "qTargetIncapacitated"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetProne: booleanField(state, "qTargetProne"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    holes: quintHoleSet(state["qHoles"])
      .map(sleepRepeatSaveHoleName)
      .sort(),
    lastResult: sleepRepeatSaveMbtLastResult(state["qLastResult"]),
    lastInvalidReason: sleepRepeatSaveMbtLastInvalidReason(
      state["qLastInvalidReason"],
    ),
  };
}

function projectSleepRepeatSaveMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: SleepRepeatSaveMbtProjection["lastResult"];
  readonly lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"];
}): SleepRepeatSaveMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (caster == null || target == null) {
    throw new Error("Expected Sleep repeat-save MBT combatants.");
  }
  return {
    currentTurnRole:
      snapshot.currentActorId === fighterId ? "caster" : "target",
    targetIncapacitated: target.conditions.includes("incapacitated"),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetProne: target.conditions.includes("prone"),
    casterConcentrating: caster.concentrating,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: projectSleepRepeatSaveHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function sleepRepeatSaveBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-sleep-repeat-save"),
    combatants: [
      sleepCasterCreatureInit({ initiative: 20 }),
      sleepTargetCreatureInit({ initiative: 10 }),
    ],
  });
}

function sleepCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Sleep Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [sleepSpell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function sleepTargetCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Sleep Target",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-target-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function sleepSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("sleep", 1, "sleepTargetAdmission"),
    mode: { tag: "cast" },
  };
}

function discoverSleepHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Sleep spell act.");
  }

  return act.initialHoles;
}

function endTurnSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function findSleepRepeatSaveSavingThrowHole(
  holes: readonly BattleHole[],
): SleepSavingThrowOutcomeHole {
  const hole = holes.find(
    (candidate) => candidate.kind === "savingThrowOutcome",
  );
  if (hole == null) {
    throw new Error("Expected savingThrowOutcome hole.");
  }

  return hole;
}

function fillsWithSleepRepeatSaveSpatialFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spatialFactFills = holes.flatMap(
    (
      hole,
    ): readonly Extract<
      BattleFill,
      { readonly kind: "targetSpatialFacts" }
    >[] =>
      hole.kind === "targetSpatialFacts" && !filledHoleIds.has(hole.holeId)
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: hole.holeId,
              spatialFacts: [],
            },
          ]
        : [],
  );
  return spatialFactFills.length === 0
    ? fills
    : [...fills, ...spatialFactFills];
}

function sleepSavingThrowOutcomeFill(
  hole: SleepSavingThrowOutcomeHole,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const outcomes = [{ targetId, succeeded }];
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole && hole.spell.targeting.kind !== "singleCombatant"
        ? {
            area: {
              originAnchorId: fighterId,
              affectedTargetIds: [targetId],
            },
            outcomes,
          }
        : { outcomes },
  };
}

function sleepRepeatSaveMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): SleepRepeatSaveMbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Sleep repeat-save invalid reason: ${reason}`);
}

function projectSleepRepeatSaveHoles(
  holes: readonly BattleHole[],
): readonly SleepRepeatSaveMbtHole[] {
  return holes.map(projectSleepRepeatSaveHole).sort();
}

function projectSleepRepeatSaveHole(
  hole: BattleHole,
): SleepRepeatSaveMbtHole {
  if (hole.kind === "savingThrowOutcome") {
    return "SavingThrowOutcome";
  }

  throw new Error(`Unexpected Sleep repeat-save MBT hole: ${hole.kind}`);
}

function sleepRepeatSaveHoleName(raw: unknown): SleepRepeatSaveMbtHole {
  const tag = quintVariantTag(raw);
  if (tag === "SavingThrowOutcome") {
    return tag;
  }

  throw new Error(`Unknown Quint Sleep repeat-save hole variant: ${tag}`);
}

function sleepRepeatSaveMbtTurnRole(
  raw: unknown,
  field: string,
): SleepRepeatSaveMbtTurnRole {
  if (raw === "caster" || raw === "target") {
    return raw;
  }

  throw new Error(`Expected Sleep repeat-save MBT turn role field ${field}.`);
}

function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = Number(process.env["MBT_STEPS"] ?? domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error("Expected Quint qHoles field to be a Set.");
}

function sleepRepeatSaveMbtLastResult(
  raw: unknown,
): SleepRepeatSaveMbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function sleepRepeatSaveMbtLastInvalidReason(
  raw: unknown,
): SleepRepeatSaveMbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint invalid reason: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }

  if (typeof raw === "string") {
    return raw;
  }

  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
