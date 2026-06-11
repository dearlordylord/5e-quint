// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-spiritual-weapon-attack-proxy
import {
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintSet,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
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
  attackRollFill,
  damageRollFillWithGroups,
  fighterId,
  partySide,
  skeletonCreatureInit,
  skeletonId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  battleTablePositionId,
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

// Production path: Spiritual Weapon is admitted through the spell support
// profile selected by `spellSlotInvocationRef`; cast and repeat Bonus Action
// spell acts are discovered with `discoverBattleActs` from `./index.ts`;
// target, force-position, attack-roll, and damage holes are submitted through
// `resolveBattleSubject`; turn advancement uses the production end-turn runtime
// command; the resulting `BattleState` mutation is observed with
// `snapshotBattle`.

type SpiritualWeaponMbtHole =
  | "TargetChoice"
  | "SpiritualWeaponForcePosition"
  | "AttackRoll"
  | "SpellDamageRoll";
type SpiritualWeaponMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type SpiritualWeaponMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";

type SpiritualWeaponMbtProjection = {
  readonly targetHp: number;
  readonly bonusActionAvailable: boolean;
  readonly casterConcentrating: boolean;
  readonly forcePositionId: number;
  readonly holes: readonly SpiritualWeaponMbtHole[];
  readonly lastResult: SpiritualWeaponMbtLastResult;
  readonly lastInvalidReason: SpiritualWeaponMbtLastInvalidReason;
};

const spiritualWeaponUnit = unitLibrary.requireUnit("spiritual_weapon");
if (spiritualWeaponUnit.kind !== "spell") {
  throw new Error("Expected Spiritual Weapon content to decode as a spell Unit.");
}
const spiritualWeaponSpell = spiritualWeaponUnit;

const spiritualWeaponDriverSchema = {
  init: {},
  doFillCastTargetAndForce: {},
  doFillCastAttackHit: {},
  doFillCastDamageLow: {},
  doAdvanceToLaterCasterTurn: {},
  doFillRepeatTargetAndForce: {},
  doFillRepeatAttackHit: {},
  doFillRepeatDamageLow: {},
  step: {},
} as const;

function createSpiritualWeaponDriver() {
  return defineDriver(spiritualWeaponDriverSchema, () => {
    let state = spiritualWeaponBattle();
    let subjectStartState = state;
    let subject: BattleSubject = spiritualWeaponCastSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverSpiritualWeaponHoles(
      state,
      "spiritualWeaponAttackProxy",
    );
    let lastResult: SpiritualWeaponMbtProjection["lastResult"] = "init";
    let lastInvalidReason: SpiritualWeaponMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = spiritualWeaponBattle();
      subjectStartState = state;
      subject = spiritualWeaponCastSubject();
      fills = [];
      holes = discoverSpiritualWeaponHoles(
        state,
        "spiritualWeaponAttackProxy",
      );
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
      lastInvalidReason = spiritualWeaponMbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithSpiritualWeaponSpellCastReactionFacts(holes, nextFills);
      recordResult(
        resolveBattleSubject({ state: subjectStartState, subject, fills }),
      );
    }

    function fillTargetAndForce(positionId: number): void {
      const target = requireSpiritualWeaponHole(holes, "targetChoice");
      const forcePosition = requireSpiritualWeaponHole(
        holes,
        "spiritualWeaponForcePosition",
      );
      submit([
        spiritualWeaponForcePositionFill(forcePosition, positionId),
        spiritualWeaponTargetFill(target, positionId),
      ]);
    }

    return {
      init: reset,
      doFillCastTargetAndForce: () => fillTargetAndForce(1),
      doFillCastAttackHit: () => {
        const attackRoll = requireSpiritualWeaponHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillCastDamageLow: () => {
        const damage = requireSpiritualWeaponHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[2]])]);
      },
      doAdvanceToLaterCasterTurn: () => {
        fills = [];
        subject = endTurnSubjectFor(fighterId);
        const targetTurn = resolveBattleSubject({ state, subject, fills });
        if (targetTurn.tag !== "resolved") {
          recordResult(targetTurn);
          return;
        }
        subject = endTurnSubjectFor(skeletonId);
        recordResult(
          resolveBattleSubject({ state: targetTurn.state, subject, fills }),
        );
        subjectStartState = state;
      },
      doFillRepeatTargetAndForce: () => {
        subject = spiritualWeaponRepeatSubject(state);
        subjectStartState = state;
        holes = discoverSpiritualWeaponHoles(
          state,
          "spiritualWeaponRepeatAttack",
        );
        fills = [];
        fillTargetAndForce(2);
      },
      doFillRepeatAttackHit: () => {
        const attackRoll = requireSpiritualWeaponHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillRepeatDamageLow: () => {
        const damage = requireSpiritualWeaponHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[2]])]);
      },
      step: () => {},
      getState: () =>
        projectSpiritualWeaponMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

const spiritualWeaponStateCheck = stateCheck(
  normalizeSpiritualWeaponQuintState,
  (spec: SpiritualWeaponMbtProjection, impl: SpiritualWeaponMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Spiritual Weapon MBT parity", () => {
  it("replays force placement and later repeat attack", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spiritual-weapon.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpiritualWeaponDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: spiritualWeaponStateCheck,
    });
  }, 120_000);
});

function normalizeSpiritualWeaponQuintState(
  raw: unknown,
): SpiritualWeaponMbtProjection {
  const state = quintStateRecord(raw);

  return {
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    forcePositionId: numberFromQuintInt(
      state["qForcePositionId"],
      "qForcePositionId",
    ),
    holes: quintSet(state["qHoles"], "qHoles")
      .map(spiritualWeaponHoleName)
      .sort(),
    lastResult: spiritualWeaponMbtLastResult(state["qLastResult"]),
    lastInvalidReason: spiritualWeaponMbtLastInvalidReason(
      state["qLastInvalidReason"],
    ),
  };
}

function projectSpiritualWeaponMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: SpiritualWeaponMbtProjection["lastResult"];
  readonly lastInvalidReason: SpiritualWeaponMbtProjection["lastInvalidReason"];
}): SpiritualWeaponMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (caster === undefined || target === undefined) {
    throw new Error("Expected Spiritual Weapon MBT combatants.");
  }
  return {
    targetHp: target.hp,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    casterConcentrating: caster.concentrating,
    forcePositionId: spiritualWeaponForcePositionId(input.state),
    holes: projectSpiritualWeaponHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function spiritualWeaponBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-spiritual-weapon"),
    combatants: [
      spiritualWeaponCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function spiritualWeaponCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Spiritual Weapon Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("spiritual-weapon-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 3 }],
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
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spiritualWeaponSpell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    },
  };
}

function spiritualWeaponCastSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionSpell" }
> {
  return {
    tag: "bonusActionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(
      "spiritual_weapon",
      2,
      "spiritualWeaponAttackProxy",
    ),
    mode: { tag: "cast" },
  };
}

function spiritualWeaponRepeatSubject(
  state: BattleState,
): Extract<BattleSubject, { readonly tag: "bonusActionSpell" }> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === fighterId &&
      candidate.subject.invocation.spellId === "spiritual_weapon" &&
      candidate.subject.invocation.procedure === "spiritualWeaponRepeatAttack",
  );
  if (act === undefined || act.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected Spiritual Weapon repeat act.");
  }
  return act.subject;
}

function discoverSpiritualWeaponHoles(
  state: BattleState,
  procedure: "spiritualWeaponAttackProxy" | "spiritualWeaponRepeatAttack",
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.actorId === fighterId &&
      candidate.subject.invocation.spellId === "spiritual_weapon" &&
      candidate.subject.invocation.procedure === procedure,
  );
  if (act === undefined) {
    throw new Error(`Expected Spiritual Weapon ${procedure} act.`);
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

function requireSpiritualWeaponHole(
  holes: readonly BattleHole[],
  kind: "attackRoll",
): Extract<BattleHole, { readonly kind: "attackRoll" }>;
function requireSpiritualWeaponHole(
  holes: readonly BattleHole[],
  kind: "rolledDice",
): Extract<BattleHole, { readonly kind: "rolledDice" }>;
function requireSpiritualWeaponHole(
  holes: readonly BattleHole[],
  kind: "spiritualWeaponForcePosition",
): Extract<BattleHole, { readonly kind: "spiritualWeaponForcePosition" }>;
function requireSpiritualWeaponHole(
  holes: readonly BattleHole[],
  kind: "targetChoice",
): Extract<BattleHole, { readonly kind: "targetChoice" }>;
function requireSpiritualWeaponHole(
  holes: readonly BattleHole[],
  kind:
    | "attackRoll"
    | "rolledDice"
    | "spiritualWeaponForcePosition"
    | "targetChoice",
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }

  return hole;
}

function fillsWithSpiritualWeaponSpellCastReactionFacts(
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

function spiritualWeaponTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  forcePositionId: number,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const positionId = battleTablePositionId(String(forcePositionId));
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: skeletonId,
    spatialFacts: [
      {
        kind: "spiritualWeaponTargetWithinForceReach",
        casterId: fighterId,
        targetId: skeletonId,
        spellId: "spiritual_weapon",
        forcePositionId: positionId,
        reachFeet: movementFeet(5),
      },
    ],
  };
}

function spiritualWeaponForcePositionFill(
  hole: Extract<BattleHole, { readonly kind: "spiritualWeaponForcePosition" }>,
  positionId: number,
): Extract<BattleFill, { readonly kind: "spiritualWeaponForcePosition" }> {
  const forcePositionId = battleTablePositionId(String(positionId));
  return {
    kind: "spiritualWeaponForcePosition",
    holeId: hole.holeId,
    value:
      hole.mode === "cast"
        ? {
            mode: "cast",
            positionId: forcePositionId,
            distanceFromCasterFeet: movementFeet(60),
          }
        : {
            mode: "reposition",
            positionId: forcePositionId,
            moveDistanceFeet: movementFeet(20),
          },
  };
}

function spiritualWeaponForcePositionId(state: BattleState): number {
  const caster = state.combatants.get(fighterId);
  const effect = caster?.activeEffects.find(
    (candidate) => candidate.kind === "spiritualWeapon",
  );
  if (effect === undefined || effect.kind !== "spiritualWeapon") {
    return 0;
  }
  return Number(effect.forcePositionId);
}

function spiritualWeaponMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): SpiritualWeaponMbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Spiritual Weapon invalid reason: ${reason}`);
}

function projectSpiritualWeaponHoles(
  holes: readonly BattleHole[],
): readonly SpiritualWeaponMbtHole[] {
  return holes.flatMap(projectSpiritualWeaponHole).sort();
}

function projectSpiritualWeaponHole(
  hole: BattleHole,
): readonly SpiritualWeaponMbtHole[] {
  if (hole.kind === "targetSpatialFacts") {
    return [];
  }
  if (hole.kind === "targetChoice") {
    return ["TargetChoice"];
  }
  if (hole.kind === "spiritualWeaponForcePosition") {
    return ["SpiritualWeaponForcePosition"];
  }
  if (hole.kind === "attackRoll") {
    return ["AttackRoll"];
  }
  if (hole.kind === "rolledDice" && "spell" in hole) {
    return ["SpellDamageRoll"];
  }

  throw new Error(`Unexpected Spiritual Weapon MBT hole: ${hole.kind}`);
}

function spiritualWeaponHoleName(raw: unknown): SpiritualWeaponMbtHole {
  const tag = quintVariantTag(raw);
  if (
    tag === "TargetChoice" ||
    tag === "SpiritualWeaponForcePosition" ||
    tag === "AttackRoll" ||
    tag === "SpellDamageRoll"
  ) {
    return tag;
  }

  throw new Error(`Unknown Spiritual Weapon Quint hole variant: ${tag}`);
}

function spiritualWeaponMbtLastResult(
  raw: unknown,
): SpiritualWeaponMbtLastResult {
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

function spiritualWeaponMbtLastInvalidReason(
  raw: unknown,
): SpiritualWeaponMbtLastInvalidReason {
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
