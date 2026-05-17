// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt level1-damage-spell-selected-identity burning_hands ice_knife poison_spray ray_of_sickness
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity burning_hands doResolveBurningHandsMixedConeSavingThrows
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity ice_knife doResolveIceKnifeHitAttackDamageAndBurstSavingThrows doResolveIceKnifeMissBurstSavingThrows
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity poison_spray doResolvePoisonSpraySpellAttackDamage
// UNIT-IDENTITY-MBT-REPLAY: level1-damage-spell-selected-identity ray_of_sickness doResolveRayOfSicknessSpellAttackDamageAndPoisoned
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const level1DamageSpellSelectedIdentityDriverSchema = {
  init: {},
  doResolveBurningHandsMixedConeSavingThrows: {},
  doResolveIceKnifeHitAttackDamageAndBurstSavingThrows: {},
  doResolveIceKnifeMissBurstSavingThrows: {},
  doResolvePoisonSpraySpellAttackDamage: {},
  doResolveRayOfSicknessSpellAttackDamageAndPoisoned: {},
  step: {},
} as const;
type Level1DamageSpellSelectedIdentityDriverAction = Exclude<
  keyof typeof level1DamageSpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

const level1DamageSpellUnitIds = [
  "burning_hands",
  "ice_knife",
  "poison_spray",
  "ray_of_sickness",
] as const;
type Level1DamageSpellUnitId = (typeof level1DamageSpellUnitIds)[number];
const level1DamageSpellSelectedIdentityResults = [
  "init",
  "burningHandsMixedConeSavingThrows",
  "iceKnifeHitAttackDamageAndBurstSavingThrows",
  "iceKnifeMissBurstSavingThrows",
  "poisonSpraySpellAttackDamage",
  "rayOfSicknessSpellAttackDamageAndPoisoned",
] as const;
type Level1DamageSpellSelectedIdentityResult =
  (typeof level1DamageSpellSelectedIdentityResults)[number];

type Level1DamageSpellSelectedIdentityProjection = {
  readonly actionAvailable: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly primaryTargetHp: number;
  readonly primaryTargetPoisoned: boolean;
  readonly secondaryTargetHp: number;
  readonly lastResult: Level1DamageSpellSelectedIdentityResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1DamageSpellSelectedIdentityDriverAction[];
  readonly expected: Level1DamageSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "level1-damage-spell-selected-identity";
  readonly unitId: Level1DamageSpellUnitId;
  readonly actions: readonly Level1DamageSpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterSpellcastingInit = NonNullable<
  CharacterCreatureInit["spellcasting"]
>;
type IceKnifeAttackOutcome =
  | {
      readonly kind: "hit";
      readonly attackRollTotal: number;
      readonly naturalD20: number;
      readonly attackDamageRoll: readonly [number, ...number[]];
    }
  | {
      readonly kind: "miss";
      readonly attackRollTotal: number;
      readonly naturalD20: number;
    };
type Level1DamageSpellInvocationProfile =
  | {
      readonly tag: "cantrip";
      readonly procedure: "spellAttackDamage";
    }
  | {
      readonly tag: "spellSlot";
      readonly slotLevel: 1;
      readonly procedure:
        | "attackBurstSaveDamage"
        | "saveGatedDamage"
        | "spellAttackDamage";
    };

const level1DamageSpellInvocationProfiles = {
  burning_hands: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "saveGatedDamage",
  },
  ice_knife: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "attackBurstSaveDamage",
  },
  poison_spray: {
    tag: "cantrip",
    procedure: "spellAttackDamage",
  },
  ray_of_sickness: {
    tag: "spellSlot",
    slotLevel: 1,
    procedure: "spellAttackDamage",
  },
} as const satisfies Record<
  Level1DamageSpellUnitId,
  Level1DamageSpellInvocationProfile
>;

const casterId = combatantId("level1-damage-spell-caster");
const primaryTargetId = combatantId("level1-damage-spell-primary-target");
const secondaryTargetId = combatantId("level1-damage-spell-secondary-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 damage spell selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "burning_hands",
    actions: ["doResolveBurningHandsMixedConeSavingThrows"],
    sequences: [
      {
        name: "self-origin-cone-dexterity-save-fire-damage",
        actions: ["doResolveBurningHandsMixedConeSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 6,
          secondaryTargetHp: 9,
          lastResult: "burningHandsMixedConeSavingThrows",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "ice_knife",
    actions: [
      "doResolveIceKnifeHitAttackDamageAndBurstSavingThrows",
      "doResolveIceKnifeMissBurstSavingThrows",
    ],
    sequences: [
      {
        name: "hit-piercing-damage-then-primary-origin-burst-save",
        actions: ["doResolveIceKnifeHitAttackDamageAndBurstSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 4,
          secondaryTargetHp: 12,
          lastResult: "iceKnifeHitAttackDamageAndBurstSavingThrows",
        }),
      },
      {
        name: "miss-still-projects-primary-origin-burst-save",
        actions: ["doResolveIceKnifeMissBurstSavingThrows"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 8,
          secondaryTargetHp: 12,
          lastResult: "iceKnifeMissBurstSavingThrows",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "poison_spray",
    actions: ["doResolvePoisonSpraySpellAttackDamage"],
    sequences: [
      {
        name: "cantrip-ranged-spell-attack-poison-damage",
        actions: ["doResolvePoisonSpraySpellAttackDamage"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          primaryTargetHp: 5,
          secondaryTargetHp: 12,
          lastResult: "poisonSpraySpellAttackDamage",
        }),
      },
    ],
  },
  {
    taskId: "level1-damage-spell-selected-identity",
    unitId: "ray_of_sickness",
    actions: ["doResolveRayOfSicknessSpellAttackDamageAndPoisoned"],
    sequences: [
      {
        name: "ranged-spell-attack-poison-damage-and-poisoned-rider",
        actions: ["doResolveRayOfSicknessSpellAttackDamageAndPoisoned"],
        expected: expectedProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          primaryTargetHp: 5,
          primaryTargetPoisoned: true,
          secondaryTargetHp: 12,
          lastResult: "rayOfSicknessSpellAttackDamageAndPoisoned",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 1 damage spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level1DamageSpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel1DamageSpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Level 1 damage spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 1 damage spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Level 1 damage spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level1-damage-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel1DamageSpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level1DamageSpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel1DamageSpellSelectedIdentityDriver() {
  return defineDriver(level1DamageSpellSelectedIdentityDriverSchema, () => {
    let state = level1DamageSpellBattle(srdSpellRecord("burning_hands"));
    let lastResult: Level1DamageSpellSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = level1DamageSpellBattle(srdSpellRecord("burning_hands"));
      lastResult = "init";
    }

    function recordResolvedResult(
      result: BattleResolutionResult,
      resultKind: Exclude<
        Level1DamageSpellSelectedIdentityProjection["lastResult"],
        "init"
      >,
    ): void {
      if (result.tag !== "resolved") {
        throw new Error(
          `Expected Level 1 damage spell action to resolve, got ${result.tag}.`,
        );
      }
      state = result.state;
      lastResult = resultKind;
    }

    return {
      init: reset,
      doResolveBurningHandsMixedConeSavingThrows: () => {
        state = level1DamageSpellBattle(srdSpellRecord("burning_hands"));
        recordResolvedResult(
          resolveBurningHandsMixedConeSavingThrows(state),
          "burningHandsMixedConeSavingThrows",
        );
      },
      doResolveIceKnifeHitAttackDamageAndBurstSavingThrows: () => {
        state = level1DamageSpellBattle(srdSpellRecord("ice_knife"));
        recordResolvedResult(
          resolveIceKnifeHitAttackDamageAndBurstSavingThrows(state),
          "iceKnifeHitAttackDamageAndBurstSavingThrows",
        );
      },
      doResolveIceKnifeMissBurstSavingThrows: () => {
        state = level1DamageSpellBattle(srdSpellRecord("ice_knife"));
        recordResolvedResult(
          resolveIceKnifeMissBurstSavingThrows(state),
          "iceKnifeMissBurstSavingThrows",
        );
      },
      doResolvePoisonSpraySpellAttackDamage: () => {
        state = level1DamageSpellBattle(srdSpellRecord("poison_spray"));
        recordResolvedResult(
          resolvePoisonSpraySpellAttackDamage(state),
          "poisonSpraySpellAttackDamage",
        );
      },
      doResolveRayOfSicknessSpellAttackDamageAndPoisoned: () => {
        state = level1DamageSpellBattle(srdSpellRecord("ray_of_sickness"));
        recordResolvedResult(
          resolveRayOfSicknessSpellAttackDamageAndPoisoned(state),
          "rayOfSicknessSpellAttackDamageAndPoisoned",
        );
      },
      step: () => {},
      getState: () =>
        projectLevel1DamageSpellSelectedIdentityState(state, lastResult),
    };
  });
}

function expectedProjection(
  overrides: Partial<Level1DamageSpellSelectedIdentityProjection> = {},
): Level1DamageSpellSelectedIdentityProjection {
  return {
    actionAvailable: true,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 1,
    primaryTargetHp: 12,
    primaryTargetPoisoned: false,
    secondaryTargetHp: 12,
    lastResult: "init",
    ...overrides,
  };
}

function resolveBurningHandsMixedConeSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "burning_hands");
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  assertBurningHandsSavingThrowProfile(savingThrow);
  const savingThrowFill = areaSavingThrowOutcomeFill(savingThrow, [
    { targetId: primaryTargetId, succeeded: false },
    { targetId: secondaryTargetId, succeeded: true },
  ]);
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [savingThrowFill],
    }),
    "rolledDice",
  );
  assertBurningHandsDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [savingThrowFill, damageRollFill(damage, [2, 2, 2])],
  });
}

function resolveIceKnifeHitAttackDamageAndBurstSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  return resolveIceKnifeAttackAndBurstSavingThrows(state, {
    kind: "hit",
    attackRollTotal: 15,
    naturalD20: 10,
    attackDamageRoll: [4],
  });
}

function resolveIceKnifeMissBurstSavingThrows(
  state: BattleState,
): BattleResolutionResult {
  return resolveIceKnifeAttackAndBurstSavingThrows(state, {
    kind: "miss",
    attackRollTotal: 1,
    naturalD20: 1,
  });
}

function resolvePoisonSpraySpellAttackDamage(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "poison_spray");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Poison Spray");
  const targetChoice = spellTargetFill(target, "poison_spray", primaryTargetId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertPoisonSprayAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertPoisonSprayDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, attackRoll, damageRollFill(damage, [7])],
  });
}

function resolveRayOfSicknessSpellAttackDamageAndPoisoned(
  state: BattleState,
): BattleResolutionResult {
  const act = actionSpellAct(state, "ray_of_sickness");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Ray of Sickness");
  const targetChoice = spellTargetFill(
    target,
    "ray_of_sickness",
    primaryTargetId,
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertRayOfSicknessAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attackRoll],
    }),
    "rolledDice",
  );
  assertRayOfSicknessDamageProfile(damage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, attackRoll, damageRollFill(damage, [3, 4])],
  });
}

function resolveIceKnifeAttackAndBurstSavingThrows(
  state: BattleState,
  attackOutcome: IceKnifeAttackOutcome,
): BattleResolutionResult {
  const act = actionSpellAct(state, "ice_knife");
  const target = requireHole(act.initialHoles, "targetChoice");
  assertSinglePrimaryTargetChoiceProfile(target, "Ice Knife");
  const targetChoice = spellTargetFill(target, "ice_knife", primaryTargetId);
  const attack = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  assertIceKnifeAttackRollProfile(attack);
  const attackRoll = attackRollFill(attack, {
    total: attackOutcome.attackRollTotal,
    naturalD20: attackOutcome.naturalD20,
  });

  const attackFills =
    attackOutcome.kind === "hit"
      ? [
          targetChoice,
          attackRoll,
          iceKnifeAttackDamageRollFill(
            state,
            act.subject,
            [targetChoice, attackRoll],
            attackOutcome.attackDamageRoll,
          ),
        ]
      : [targetChoice, attackRoll];
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: attackFills,
    }),
    "savingThrowOutcome",
  );
  assertIceKnifeBurstSavingThrowProfile(savingThrow);
  const savingThrowFill = areaSavingThrowOutcomeFill(
    savingThrow,
    [
      { targetId: primaryTargetId, succeeded: false },
      { targetId: secondaryTargetId, succeeded: true },
    ],
    primaryTargetId,
  );
  const burstDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [...attackFills, savingThrowFill],
    }),
    "rolledDice",
  );
  assertIceKnifeBurstDamageProfile(burstDamage);
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      ...attackFills,
      savingThrowFill,
      damageRollFill(burstDamage, [2, 2]),
    ],
  });
}

function iceKnifeAttackDamageRollFill(
  state: BattleState,
  subject: BattleSubject,
  attackFills: readonly BattleFill[],
  results: readonly [number, ...number[]],
): BattleRolledDiceFill {
  const attackDamage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: attackFills,
    }),
    "rolledDice",
  );
  assertIceKnifeAttackDamageProfile(attackDamage);
  return damageRollFill(attackDamage, results);
}

function srdSpellRecord(unitId: Level1DamageSpellUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function level1DamageSpellBattle(spell: SpellRecord): BattleState {
  const isCantrip = spell.mechanics.level === 0;
  const result = startBattle({
    battleId: battleId(`level1-damage-spell-selected-identity-${spell.id}`),
    combatants: [
      level1DamageSpellCreature({
        combatantId: casterId,
        displayName: "Level 1 damage spell caster",
        initiative: 20,
        side: partySide,
        className: "wizard",
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: isCantrip ? [spell] : [],
          preparedSpells: isCantrip ? [] : [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      level1DamageSpellCreature({
        combatantId: primaryTargetId,
        displayName: "Level 1 damage spell primary target",
        initiative: 10,
        side: oppositionSide,
        className: "fighter",
      }),
      level1DamageSpellCreature({
        combatantId: secondaryTargetId,
        displayName: "Level 1 damage spell secondary target",
        initiative: 8,
        side: oppositionSide,
        className: "fighter",
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function level1DamageSpellCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly className: CharacterCreatureInit["classLevels"][number]["className"];
  readonly spellcasting?: CharacterSpellcastingInit;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: input.className, level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function actionSpellAct(
  state: BattleState,
  spellId: Level1DamageSpellUnitId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      isExpectedLevel1DamageSpellInvocation(
        candidate.subject.invocation,
        spellId,
      ),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action Spell act.`);
  }
  return act;
}

function isExpectedLevel1DamageSpellInvocation(
  invocation: ActionSpellAct["subject"]["invocation"],
  spellId: Level1DamageSpellUnitId,
): boolean {
  const profile = level1DamageSpellInvocationProfiles[spellId];
  if (invocation.spellId !== spellId) {
    return false;
  }
  if (
    invocation.tag !== profile.tag ||
    invocation.procedure !== profile.procedure
  ) {
    return false;
  }
  if (profile.tag === "spellSlot") {
    return (
      invocation.tag === "spellSlot" &&
      Number(invocation.slotLevel) === profile.slotLevel
    );
  }
  return true;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1DamageSpellUnitId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
  },
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

function areaSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  originAnchorId: CombatantId = casterId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function damageRollFill(
  hole: Pick<BattleHole, "kind" | "holeId">,
  results: readonly [number, ...number[]],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  const [firstRoll, ...restRolls] = results;
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
      },
    ],
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return requireHole(result.holes, kind);
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function assertBurningHandsSavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Burning Hands spell Saving Throw outcome hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "burning_hands" ||
    hole.ability !== "dex" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.targeting.kind !== "selfOriginCone" ||
    Number(invocation.targeting.lengthFeet) !== 15 ||
    invocation.damage.expr.dice !== 3 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "fire" ||
    invocation.successDamage !== "half" ||
    Number(invocation.rangeFeet) !== 0
  ) {
    throw new Error("Burning Hands Saving Throw profile drifted.");
  }
}

function assertBurningHandsDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Burning Hands spell damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "saveGatedDamage" ||
    invocation.spell.id !== "burning_hands" ||
    invocation.damage.expr.dice !== 3 ||
    invocation.damage.expr.dieSize !== 6 ||
    invocation.damage.damageType !== "fire" ||
    invocation.successDamage !== "half" ||
    hole.critical
  ) {
    throw new Error("Burning Hands damage profile drifted.");
  }
}

function assertIceKnifeAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ice Knife spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Ice Knife Attack Roll profile drifted.");
  }
}

function assertIceKnifeAttackDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ice Knife attack damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 10 ||
    invocation.damage.damageType !== "piercing" ||
    hole.critical
  ) {
    throw new Error("Ice Knife attack damage profile drifted.");
  }
}

function assertIceKnifeBurstSavingThrowProfile(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ice Knife burst Saving Throw outcome hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    hole.ability !== "dex" ||
    hole.dc.kind !== "caster_spell_save_dc" ||
    invocation.burst.targeting.kind !== "primaryTargetOriginEmanation" ||
    Number(invocation.burst.targeting.radiusFeet) !== 5 ||
    invocation.burst.damage.expr.dice !== 2 ||
    invocation.burst.damage.expr.dieSize !== 6 ||
    invocation.burst.damage.damageType !== "cold" ||
    invocation.burst.successDamage !== "none"
  ) {
    throw new Error("Ice Knife burst Saving Throw profile drifted.");
  }
}

function assertIceKnifeBurstDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ice Knife burst damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "attackBurstSaveDamage" ||
    invocation.spell.id !== "ice_knife" ||
    invocation.burst.damage.expr.dice !== 2 ||
    invocation.burst.damage.expr.dieSize !== 6 ||
    invocation.burst.damage.damageType !== "cold" ||
    invocation.burst.successDamage !== "none" ||
    hole.critical
  ) {
    throw new Error("Ice Knife burst damage profile drifted.");
  }
}

function assertPoisonSprayAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Poison Spray spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "poison_spray" ||
    invocation.resource.tag !== "none" ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 30
  ) {
    throw new Error("Poison Spray Attack Roll profile drifted.");
  }
}

function assertPoisonSprayDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Poison Spray damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "poison_spray" ||
    invocation.resource.tag !== "none" ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 1 ||
    invocation.damage.expr.dieSize !== 12 ||
    invocation.damage.damageType !== "poison" ||
    invocation.postDamageRiders.length !== 0 ||
    hole.critical
  ) {
    throw new Error("Poison Spray damage profile drifted.");
  }
}

function assertSinglePrimaryTargetChoiceProfile(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellName: string,
): void {
  if (
    !hole.choices.includes(primaryTargetId) ||
    hole.requiresTableSpatialFact !== true
  ) {
    throw new Error(`${spellName} target profile drifted.`);
  }
}

function assertRayOfSicknessAttackRollProfile(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): void {
  if (!("spell" in hole)) {
    throw new Error("Expected Ray of Sickness spell Attack Roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "ray_of_sickness" ||
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) !== 1 ||
    invocation.targeting.kind !== "singleCombatant" ||
    invocation.attackKind !== "ranged_spell_attack" ||
    Number(invocation.rangeFeet) !== 60
  ) {
    throw new Error("Ray of Sickness Attack Roll profile drifted.");
  }
}

function assertRayOfSicknessDamageProfile(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): void {
  if (!("spell" in hole) || !("critical" in hole)) {
    throw new Error("Expected Ray of Sickness damage roll hole.");
  }
  const invocation = hole.spell;
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.spell.id !== "ray_of_sickness" ||
    invocation.resource.tag !== "spellSlot" ||
    Number(invocation.resource.slotLevel) !== 1 ||
    invocation.damage.kind !== "fixedSpellAttackDamage" ||
    invocation.damage.expr.dice !== 2 ||
    invocation.damage.expr.dieSize !== 8 ||
    invocation.damage.damageType !== "poison" ||
    hole.critical
  ) {
    throw new Error("Ray of Sickness damage profile drifted.");
  }
  const [postDamageRider] = invocation.postDamageRiders;
  if (
    invocation.postDamageRiders.length !== 1 ||
    postDamageRider === undefined ||
    postDamageRider.kind !== "condition" ||
    postDamageRider.condition !== "poisoned" ||
    postDamageRider.expiresAt !== "endOfCasterNextTurn"
  ) {
    throw new Error("Ray of Sickness post-damage rider profile drifted.");
  }
}

function projectLevel1DamageSpellSelectedIdentityState(
  state: BattleState,
  lastResult: Level1DamageSpellSelectedIdentityProjection["lastResult"],
): Level1DamageSpellSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const primaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === primaryTargetId,
  );
  const secondaryTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === secondaryTargetId,
  );
  if (primaryTarget === undefined || secondaryTarget === undefined) {
    throw new Error("Expected Level 1 damage spell selected identity targets.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotExpendedThisTurn,
    level1SlotsRemaining: level1SlotsRemaining(state, casterId),
    primaryTargetHp: primaryTarget.hp,
    primaryTargetPoisoned: primaryTarget.conditions.includes("poisoned"),
    secondaryTargetHp: secondaryTarget.hp,
    lastResult,
  };
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Level 1 damage spell caster character origin.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function normalizeLevel1DamageSpellSelectedIdentityQuintState(
  raw: unknown,
): Level1DamageSpellSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    primaryTargetHp: numberFromQuintInt(
      state["qPrimaryTargetHp"],
      "qPrimaryTargetHp",
    ),
    primaryTargetPoisoned: booleanField(state, "qPrimaryTargetPoisoned"),
    secondaryTargetHp: numberFromQuintInt(
      state["qSecondaryTargetHp"],
      "qSecondaryTargetHp",
    ),
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
): Level1DamageSpellSelectedIdentityProjection["lastResult"] {
  if (isLevel1DamageSpellSelectedIdentityResult(raw)) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

function isLevel1DamageSpellSelectedIdentityResult(
  raw: unknown,
): raw is Level1DamageSpellSelectedIdentityResult {
  return (
    typeof raw === "string" &&
    level1DamageSpellSelectedIdentityResults.some((result) => result === raw)
  );
}

const level1DamageSpellSelectedIdentityStateCheck = stateCheck(
  normalizeLevel1DamageSpellSelectedIdentityQuintState,
  (
    spec: Level1DamageSpellSelectedIdentityProjection,
    impl: Level1DamageSpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
