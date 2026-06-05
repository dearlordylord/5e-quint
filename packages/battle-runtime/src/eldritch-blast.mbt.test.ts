// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-independent-attack-sequence
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp, movementFeet, proficiencyBonus } from "@dnd/shared/types";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  fighterId,
  partySide,
  skeletonCreatureInit,
  skeletonId,
  testUnarmedStrikeDamageAttack,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  characterId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

// Production path: Eldritch Blast is admitted through the independent spell
// attack sequence support profile selected by `cantripSpellInvocationRef`;
// beam target, attack-roll, and damage holes are discovered with
// `discoverBattleActs` from `./index.ts`; fills are submitted through
// `resolveBattleSubject`; the resulting `BattleState` mutation and target hit
// points are observed with `snapshotBattle`.

type EldritchBlastMbtHole =
  | "TargetChoice"
  | "ObjectTargetChoice"
  | "AttackRoll"
  | "SpellDamageRoll";
type EldritchBlastMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type EldritchBlastMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";

type EldritchBlastMbtProjection = {
  readonly actionAvailable: boolean;
  readonly targetHp: number;
  readonly holes: readonly EldritchBlastMbtHole[];
  readonly lastResult: EldritchBlastMbtLastResult;
  readonly lastInvalidReason: EldritchBlastMbtLastInvalidReason;
};

type TargetChoiceHole = Extract<BattleHole, { readonly kind: "targetChoice" }>;

const eldritchBlastUnitId = "eldritch_blast";
const eldritchBlastUnit = decodeUnitRecordSync(eldritchBlastInput);
if (eldritchBlastUnit.kind !== "spell") {
  throw new Error("Expected Eldritch Blast spell Unit.");
}
const eldritchBlastSpell = eldritchBlastUnit satisfies SpellRecord;

const eldritchBlastDriverSchema = {
  init: {},
  doFillTwoCreatureTargets: {},
  doFillFirstAttackMiss: {},
  doFillFirstAttackHit: {},
  doFillFirstDamageLow: {},
  doFillSecondAttackMiss: {},
  doFillSecondAttackHit: {},
  doFillSecondDamageLow: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

function createEldritchBlastDriver() {
  return defineDriver(eldritchBlastDriverSchema, () => {
    let state = eldritchBlastBattle();
    let projectionState = state;
    const subject = eldritchBlastSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverEldritchBlastHoles(
      state,
      subject,
    );
    let lastResult: EldritchBlastMbtProjection["lastResult"] = "init";
    let lastInvalidReason: EldritchBlastMbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = eldritchBlastBattle();
      projectionState = state;
      fills = [];
      holes = discoverEldritchBlastHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        projectionState = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        projectionState = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = eldritchBlastMbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithEldritchBlastSpellCastReactionFacts(holes, nextFills);
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    return {
      init: reset,
      doFillTwoCreatureTargets: () => {
        const [firstTarget, secondTarget] =
          twoEldritchBlastTargetChoiceHoles(holes);
        submit([
          spellTargetChoiceFill(firstTarget),
          spellTargetChoiceFill(secondTarget),
        ]);
      },
      doFillFirstAttackMiss: () => {
        const attackRoll = requireEldritchBlastHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ]);
      },
      doFillFirstAttackHit: () => {
        const attackRoll = requireEldritchBlastHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillFirstDamageLow: () => {
        const damage = requireEldritchBlastHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[4]])]);
      },
      doFillSecondAttackMiss: () => {
        const attackRoll = requireEldritchBlastHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ]);
      },
      doFillSecondAttackHit: () => {
        const attackRoll = requireEldritchBlastHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillSecondDamageLow: () => {
        const damage = requireEldritchBlastHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[4]])]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectEldritchBlastMbtState({
          state: projectionState,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

const eldritchBlastStateCheck = stateCheck(
  normalizeEldritchBlastQuintState,
  (spec: EldritchBlastMbtProjection, impl: EldritchBlastMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Eldritch Blast MBT parity", () => {
  it("replays Eldritch Blast beam sequencing", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-eldritch-blast.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createEldritchBlastDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: eldritchBlastStateCheck,
    });
  }, 120_000);
});

function normalizeEldritchBlastQuintState(
  raw: unknown,
): EldritchBlastMbtProjection {
  const state = quintStateRecord(raw);

  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    holes: quintHoleSet(state["qHoles"])
      .map(eldritchBlastHoleName)
      .sort(),
    lastResult: eldritchBlastMbtLastResult(state["qLastResult"]),
    lastInvalidReason: eldritchBlastMbtLastInvalidReason(
      state["qLastInvalidReason"],
    ),
  };
}

function projectEldritchBlastMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: EldritchBlastMbtProjection["lastResult"];
  readonly lastInvalidReason: EldritchBlastMbtProjection["lastInvalidReason"];
}): EldritchBlastMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (target === undefined) {
    throw new Error("Expected Eldritch Blast target.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    targetHp: target.hp,
    holes: projectUniqueEldritchBlastHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function eldritchBlastBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-eldritch-blast"),
    combatants: [
      eldritchBlastCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function eldritchBlastCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Eldritch Blast Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("eldritch-blast-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 5 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: testUnarmedStrikeDamageAttack(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [eldritchBlastSpell],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    },
  };
}

function eldritchBlastSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: cantripSpellInvocationRef(
      eldritchBlastUnitId,
      "spellAttackSequence",
    ),
    mode: { tag: "cast" },
  };
}

function discoverEldritchBlastHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act === undefined) {
    throw new Error("Expected Eldritch Blast spell act.");
  }

  return act.initialHoles;
}

function twoEldritchBlastTargetChoiceHoles(
  holes: readonly BattleHole[],
): readonly [TargetChoiceHole, TargetChoiceHole] {
  const targets = holes.filter(
    (hole): hole is TargetChoiceHole => hole.kind === "targetChoice",
  );
  const first = targets[0];
  const second = targets[1];
  if (first === undefined || second === undefined || targets.length !== 2) {
    throw new Error("Expected exactly two Eldritch Blast target-choice holes.");
  }

  return [first, second];
}

function requireEldritchBlastHole<Kind extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: Kind,
): Extract<BattleHole, { kind: Kind }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }

  return hole;
}

function fillsWithEldritchBlastSpellCastReactionFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spellCastReactionFactFills = holes.flatMap(
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
  return spellCastReactionFactFills.length === 0
    ? fills
    : [...fills, ...spellCastReactionFactFills];
}

function spellTargetChoiceFill(
  hole: TargetChoiceHole,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: skeletonId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId: skeletonId,
        spellId: eldritchBlastUnitId,
      },
    ],
  };
}

function projectUniqueEldritchBlastHoles(
  holes: readonly BattleHole[],
): readonly EldritchBlastMbtHole[] {
  return [...new Set(holes.flatMap(projectEldritchBlastHole))].sort();
}

function projectEldritchBlastHole(
  hole: BattleHole,
): readonly EldritchBlastMbtHole[] {
  if (hole.kind === "targetChoice") {
    return ["TargetChoice"];
  }
  if (hole.kind === "objectTargetChoice") {
    return ["ObjectTargetChoice"];
  }
  if (hole.kind === "attackRoll") {
    return ["AttackRoll"];
  }
  if (hole.kind === "rolledDice" && "spell" in hole) {
    return ["SpellDamageRoll"];
  }
  if (hole.kind === "targetSpatialFacts") {
    return [];
  }

  throw new Error(`Eldritch Blast MBT does not model ${hole.kind} holes.`);
}

function eldritchBlastHoleName(raw: unknown): EldritchBlastMbtHole {
  const tag = quintVariantTag(raw);
  if (
    tag === "TargetChoice" ||
    tag === "ObjectTargetChoice" ||
    tag === "AttackRoll" ||
    tag === "SpellDamageRoll"
  ) {
    return tag;
  }

  throw new Error(`Unknown Quint Eldritch Blast hole variant: ${tag}`);
}

function eldritchBlastMbtLastResult(
  raw: unknown,
): EldritchBlastMbtLastResult {
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

function eldritchBlastMbtLastInvalidReason(
  raw: unknown,
): EldritchBlastMbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last invalid reason: ${String(raw)}.`);
}

function eldritchBlastMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): EldritchBlastMbtLastInvalidReason {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Eldritch Blast invalid reason: ${reason}`);
}

function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = Number(process.env["MBT_STEPS"] ?? domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
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

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
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

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }
  if (typeof raw === "string") {
    return raw;
  }

  throw new Error("Expected Quint variant value.");
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}
