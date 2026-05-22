// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt weapon-mastery-properties mastery_sap mastery_topple mastery_cleave
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_sap doResolveSapMasteryPropertyHit
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_topple doResolveToppleMasteryPropertyFailedSavingThrow
// UNIT-IDENTITY-MBT-REPLAY: weapon-mastery-properties mastery_cleave doResolveCleaveMasteryPropertySecondTargetHit
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
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
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const weaponMasterySelectedIdentityDriverSchema = {
  init: {},
  doResolveSapMasteryPropertyHit: {},
  doResolveToppleMasteryPropertyFailedSavingThrow: {},
  doResolveCleaveMasteryPropertySecondTargetHit: {},
  step: {},
} as const;
type WeaponMasterySelectedIdentityDriverAction = Exclude<
  keyof typeof weaponMasterySelectedIdentityDriverSchema,
  "init" | "step"
>;

type WeaponMasterySelectedIdentityProjection = {
  readonly primaryTargetHp: number;
  readonly secondTargetHp: number;
  readonly actionAvailable: boolean;
  readonly primaryTargetHasSapEffect: boolean;
  readonly primaryTargetProne: boolean;
  readonly cleaveUsed: boolean;
  readonly lastResult: "init" | "needsHoles" | "resolved";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly WeaponMasterySelectedIdentityDriverAction[];
  readonly expected: WeaponMasterySelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "weapon-mastery-properties";
  readonly unitId: WeaponMasteryPropertyUnitId;
  readonly actions: readonly WeaponMasterySelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const attackerId = combatantId("weapon-mastery-property-attacker");
const primaryTargetId = combatantId("weapon-mastery-property-primary-target");
const secondTargetId = combatantId("weapon-mastery-property-second-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Weapon Mastery selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const weaponMasteryPropertyScenarios = {
  mastery_sap: {
    attackName: "Longsword",
    weaponUnitId: "weapon_longsword",
    grip: "one_handed",
    supportProfile: WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  },
  mastery_topple: {
    attackName: "Quarterstaff",
    weaponUnitId: "weapon_quarterstaff",
    grip: "one_handed",
    supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  },
  mastery_cleave: {
    attackName: "Greataxe",
    weaponUnitId: "weapon_greataxe",
    grip: "two_handed",
    supportProfile: WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  },
} as const;
type WeaponMasteryPropertyUnitId = keyof typeof weaponMasteryPropertyScenarios;

const selectedUnitIdentityReplays = [
  {
    taskId: "weapon-mastery-properties",
    unitId: "mastery_sap",
    actions: ["doResolveSapMasteryPropertyHit"],
    sequences: [
      {
        name: "sap-mastery-property-hit-installs-next-attack-disadvantage",
        actions: ["doResolveSapMasteryPropertyHit"],
        expected: expectedProjection({
          primaryTargetHp: 9,
          actionAvailable: false,
          primaryTargetHasSapEffect: true,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "weapon-mastery-properties",
    unitId: "mastery_topple",
    actions: ["doResolveToppleMasteryPropertyFailedSavingThrow"],
    sequences: [
      {
        name: "topple-mastery-property-failed-saving-throw-applies-prone",
        actions: ["doResolveToppleMasteryPropertyFailedSavingThrow"],
        expected: expectedProjection({
          primaryTargetProne: true,
          lastResult: "needsHoles",
        }),
      },
    ],
  },
  {
    taskId: "weapon-mastery-properties",
    unitId: "mastery_cleave",
    actions: ["doResolveCleaveMasteryPropertySecondTargetHit"],
    sequences: [
      {
        name: "cleave-mastery-property-second-target-hit",
        actions: ["doResolveCleaveMasteryPropertySecondTargetHit"],
        expected: expectedProjection({
          primaryTargetHp: 9,
          secondTargetHp: 9,
          actionAvailable: false,
          cleaveUsed: true,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Weapon Mastery selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<WeaponMasterySelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createWeaponMasterySelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Weapon Mastery selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Weapon Mastery selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Weapon Mastery selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-weapon-mastery-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWeaponMasterySelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: weaponMasterySelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createWeaponMasterySelectedIdentityDriver() {
  return defineDriver(weaponMasterySelectedIdentityDriverSchema, () => {
    let state = weaponMasteryBattle("mastery_sap");
    let lastResult: WeaponMasterySelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = weaponMasteryBattle("mastery_sap");
      lastResult = "init";
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved" || result.tag === "needsHoles") {
        lastResult = result.tag;
        state = result.state;
        return;
      }
      throw new Error(`Unexpected Weapon Mastery resolution: ${result.reason}`);
    }

    return {
      init: reset,
      doResolveSapMasteryPropertyHit: () => {
        state = weaponMasteryBattle("mastery_sap");
        resolvePrimaryHit("mastery_sap");
      },
      doResolveToppleMasteryPropertyFailedSavingThrow: () => {
        state = weaponMasteryBattle("mastery_topple");
        const scenario = weaponMasteryPropertyScenarios.mastery_topple;
        const subject = attackSubject(scenario.attackName);
        const target = requireHole(
          discoverAttackHoles(state, subject),
          "targetChoice",
        );
        const targetChoice = targetFill({
          hole: target,
          targetId: primaryTargetId,
          attackName: scenario.attackName,
        });
        const attackRoll = requireHole(
          holesAfterFills(state, subject, [targetChoice]),
          "attackRoll",
        );
        const savingThrow = requireHole(
          holesAfterFills(state, subject, [
            targetChoice,
            attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          ]),
          "savingThrowOutcome",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              targetChoice,
              attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
              savingThrowOutcomeFill(savingThrow, primaryTargetId, false),
            ],
          }),
        );
      },
      doResolveCleaveMasteryPropertySecondTargetHit: () => {
        state = weaponMasteryBattle("mastery_cleave");
        const scenario = weaponMasteryPropertyScenarios.mastery_cleave;
        const subject = attackSubject(scenario.attackName);
        const primaryFills = primaryHitFills({
          state,
          subject,
          attackName: scenario.attackName,
          damageRoll: 1,
        });
        const decision = requireHole(
          resolveBattleSubject({ state, subject, fills: primaryFills }),
          "unitFeatureDecision",
        );
        const secondTarget = requireHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
          }),
          "targetChoice",
        );
        const secondTargetFill = targetFill({
          hole: secondTarget,
          targetId: secondTargetId,
          attackName: scenario.attackName,
          spatialFacts: [
            attackTargetInMeleeReachFact(secondTargetId, scenario.attackName),
            {
              kind: "cleaveSecondTargetWithin5FeetOfFirstTarget",
              attackerId,
              firstTargetId: primaryTargetId,
              secondTargetId,
            },
          ],
        });
        const cleaveAttackRoll = requireHole(
          holesAfterFills(state, subject, [
            ...primaryFills,
            unitFeatureDecisionFill(decision, "use"),
            secondTargetFill,
          ]),
          "attackRoll",
        );
        const cleaveDamage = requireHole(
          holesAfterFills(state, subject, [
            ...primaryFills,
            unitFeatureDecisionFill(decision, "use"),
            secondTargetFill,
            attackRollFill(cleaveAttackRoll, { total: 15, naturalD20: 10 }),
          ]),
          "rolledDice",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              ...primaryFills,
              unitFeatureDecisionFill(decision, "use"),
              secondTargetFill,
              attackRollFill(cleaveAttackRoll, { total: 15, naturalD20: 10 }),
              damageRollFill(cleaveDamage, 4),
            ],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectWeaponMasterySelectedIdentityState({
          state,
          lastResult,
        }),
    };

    function resolvePrimaryHit(unitId: WeaponMasteryPropertyUnitId): void {
      const scenario = weaponMasteryPropertyScenarios[unitId];
      const subject = attackSubject(scenario.attackName);
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: primaryHitFills({
            state,
            subject,
            attackName: scenario.attackName,
            damageRoll: 1,
          }),
        }),
      );
    }
  });
}

function expectedProjection(
  overrides: Partial<WeaponMasterySelectedIdentityProjection> = {},
): WeaponMasterySelectedIdentityProjection {
  return {
    primaryTargetHp: 13,
    secondTargetHp: 13,
    actionAvailable: true,
    primaryTargetHasSapEffect: false,
    primaryTargetProne: false,
    cleaveUsed: false,
    lastResult: "init",
    ...overrides,
  };
}

function primaryHitFills(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
  readonly attackName: string;
  readonly damageRoll: number;
}): readonly BattleFill[] {
  const target = requireHole(
    discoverAttackHoles(input.state, input.subject),
    "targetChoice",
  );
  const targetChoice = targetFill({
    hole: target,
    targetId: primaryTargetId,
    attackName: input.attackName,
  });
  const attackRoll = requireHole(
    holesAfterFills(input.state, input.subject, [targetChoice]),
    "attackRoll",
  );
  const damageRoll = requireHole(
    holesAfterFills(input.state, input.subject, [
      targetChoice,
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ]),
    "rolledDice",
  );
  return [
    targetChoice,
    attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    damageRollFill(damageRoll, input.damageRoll),
  ];
}

function weaponMasteryBattle(unitId: WeaponMasteryPropertyUnitId): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-runtime-mbt-${unitId}`),
    combatants: [
      weaponMasteryAttackerInit(unitId),
      targetCreatureInit(primaryTargetId, "Primary Target", 10),
      targetCreatureInit(secondTargetId, "Second Target", 9),
    ],
  });
}

function weaponMasteryAttackerInit(
  unitId: WeaponMasteryPropertyUnitId,
): BattleCreatureInit {
  const scenario = weaponMasteryPropertyScenarios[unitId];
  return {
    combatantId: attackerId,
    displayName: "Mastery Property Fighter",
    initiative: initiativeScore(20),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`character:${unitId}`),
      characterUnitRefs: [
        {
          unitId,
          supportProfiles: [scenario.supportProfile],
        },
      ],
      weaponMasteries: [{ weaponUnitId: scenario.weaponUnitId }],
      classLevels: [{ className: "fighter", level: 1 }],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: `main:${scenario.weaponUnitId}`,
          unitId: scenario.weaponUnitId,
          grip: scenario.grip,
        },
      },
      attack: weaponAttack(scenario.weaponUnitId),
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function targetCreatureInit(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`character:${combatantIdValue}`),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function weaponAttack(
  weaponUnitId: (typeof weaponMasteryPropertyScenarios)[WeaponMasteryPropertyUnitId]["weaponUnitId"],
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(weaponUnitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${weaponUnitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(3),
  };
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

function attackSubject(
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: attackerId,
    action: "attack",
    attackName,
  };
}

function discoverAttackHoles(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.attackName === subject.attackName,
  );
  if (act == null) {
    throw new Error(`Expected ${subject.attackName} attack act.`);
  }
  return act.initialHoles;
}

function holesAfterFills(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected attack fills to request more holes.");
  }
  return result.holes;
}

function requireHole(
  resultOrHoles: BattleResolutionResult | readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const holes: readonly BattleHole[] =
    "tag" in resultOrHoles
      ? resultOrHoles.tag === "needsHoles"
        ? resultOrHoles.holes
        : []
      : resultOrHoles;
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function targetFill(input: {
  readonly hole: BattleHole;
  readonly targetId: CombatantId;
  readonly attackName: string;
  readonly spatialFacts?: NonNullable<
    Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
  >;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: input.targetId,
    spatialFacts: input.spatialFacts ?? [
      attackTargetInMeleeReachFact(input.targetId, input.attackName),
    ],
  };
}

function attackTargetInMeleeReachFact(
  targetId: CombatantId,
  attackName: string,
) {
  return {
    kind: "attackTargetInMeleeReach" as const,
    actorId: attackerId,
    targetId,
    attackName,
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFill(
  hole: BattleHole,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(value)] }],
  };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes: [{ targetId, succeeded }] },
  };
}

function unitFeatureDecisionFill(
  hole: BattleHole,
  value: "use" | "decline",
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return {
    kind: "unitFeatureDecision",
    holeId: hole.holeId,
    value,
  };
}

function projectWeaponMasterySelectedIdentityState(input: {
  readonly state: BattleState;
  readonly lastResult: WeaponMasterySelectedIdentityProjection["lastResult"];
}): WeaponMasterySelectedIdentityProjection {
  const snapshot = snapshotBattle(input.state);
  const primaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === primaryTargetId,
  );
  const secondTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === secondTargetId,
  );
  const primaryTargetState = input.state.combatants.get(primaryTargetId);
  if (
    primaryTarget === undefined ||
    secondTarget === undefined ||
    primaryTargetState === undefined
  ) {
    throw new Error("Expected Weapon Mastery selected identity combatants.");
  }
  return {
    primaryTargetHp: primaryTarget.hp,
    secondTargetHp: secondTarget.hp,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    primaryTargetHasSapEffect: primaryTargetState.activeEffects.some(
      (effect) =>
        effect.kind === "nextAttackRollBySelf" &&
        "sourceUnitId" in effect &&
        effect.sourceUnitId === "mastery_sap",
    ),
    primaryTargetProne: primaryTarget.conditions.includes("prone"),
    cleaveUsed:
      input.state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
        attackerId,
      ),
    lastResult: input.lastResult,
  };
}

function normalizeWeaponMasterySelectedIdentityQuintState(
  raw: unknown,
): WeaponMasterySelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    primaryTargetHp: numberFromQuintInt(
      state["qPrimaryTargetHp"],
      "qPrimaryTargetHp",
    ),
    secondTargetHp: numberFromQuintInt(
      state["qSecondTargetHp"],
      "qSecondTargetHp",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
    primaryTargetHasSapEffect: booleanField(
      state,
      "qPrimaryTargetHasSapEffect",
    ),
    primaryTargetProne: booleanField(state, "qPrimaryTargetProne"),
    cleaveUsed: booleanField(state, "qCleaveUsed"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtLastResult(
  raw: unknown,
): WeaponMasterySelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "needsHoles" || raw === "resolved") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
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

const weaponMasterySelectedIdentityStateCheck = stateCheck(
  normalizeWeaponMasterySelectedIdentityQuintState,
  (
    spec: WeaponMasterySelectedIdentityProjection,
    impl: WeaponMasterySelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
