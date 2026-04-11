import { describe, expect, test } from "vitest";
import { Schema } from "effect";
import { createActor } from "xstate";

import {
  ControlCommandSchema,
  finalizeBattleResolution,
  finalizeResolution,
  getAvailableActions,
  getAvailableBattleActions,
  previewAction,
  previewBattleAction,
  resolveBattleAction,
  resolveAction,
  TableEventCommandSchema,
  type ResolutionRequest,
} from "#/available-actions.ts";
import { battleMachine } from "#/battle-machine.ts";
import type { BattleEvent } from "#/battle-machine-types.ts";
import { creatureMachine } from "#/machine.ts";
import {
  GOBLIN_WARRIOR,
  statBlockToInitCreatureConfig,
} from "#/monster-catalog.ts";
import type { DndMachineInput } from "#/machine-types.ts";
import { fighterStartBattleLoadout } from "#/player-loadouts.ts";
import type { CreatureId as CreatureIdT } from "#/types.ts";
import {
  abilityModifier,
  armorClass,
  classLevel,
  CreatureId,
  difficultyClass,
  resourceCount,
  spellId,
  spellSlotLevel,
} from "#/types.ts";

function quota(resource: "action" | "bonusAction" | "reaction") {
  return { kind: "quota" as const, resource };
}

function movement(amount: number) {
  return { kind: "quota" as const, resource: "movement" as const, amount };
}

function pool(resource: string) {
  return { kind: "pool" as const, resource };
}

function cost(
  ...items: ReadonlyArray<
    | ReturnType<typeof quota>
    | ReturnType<typeof movement>
    | ReturnType<typeof pool>
  >
) {
  return items;
}

const FIGHTER_5_INPUT: DndMachineInput = {
  maxHp: 44,
  conMod: abilityModifier(2),
  fighterLevel: classLevel(5),
  hitDiceRemaining: {
    barbarian: 0,
    bard: 0,
    cleric: 0,
    druid: 0,
    fighter: 2,
    monk: 0,
    paladin: 0,
    ranger: 0,
    rogue: 0,
    sorcerer: 0,
    warlock: 0,
    wizard: 0,
  },
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

function makeActor() {
  return makeActorWithInput(FIGHTER_5_INPUT);
}

function makeActorWithInput(input: DndMachineInput) {
  const actor = createActor(creatureMachine, { input });
  actor.start();
  return actor;
}

function damageActor(amount: number) {
  const actor = makeActor();
  actor.send({
    type: "TAKE_DAMAGE",
    amount,
    damageType: "slashing",
    resistances: new Set(),
    vulnerabilities: new Set(),
    immunities: new Set(),
    isCritical: false,
  });
  return actor;
}

const FIGHTER_10_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(10),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const FIGHTER_9_INPUT: DndMachineInput = {
  maxHp: 44,
  fighterLevel: classLevel(9),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const FIGHTER_2_INPUT: DndMachineInput = {
  maxHp: 24,
  fighterLevel: classLevel(2),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const SORCERER_5_INPUT: DndMachineInput = {
  maxHp: 30,
  sorcererLevel: classLevel(5),
  knownMetamagicOptions: ["careful", "subtle"],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const PHASE_2_MULTIGROUP_INPUT: DndMachineInput = {
  maxHp: 44,
  conMod: abilityModifier(2),
  fighterLevel: classLevel(10),
  rangerLevel: classLevel(10),
  sorcererLevel: classLevel(5),
  knownMetamagicOptions: ["careful", "subtle"],
  wizardLevel: classLevel(4),
  preparedSpells: new Set(),
  wisMod: abilityModifier(3),
  slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [3, 2, 0, 0, 0, 0, 0, 0, 0],
  hitDiceRemaining: {
    barbarian: 0,
    bard: 0,
    cleric: 0,
    druid: 0,
    fighter: 2,
    monk: 0,
    paladin: 0,
    ranger: 0,
    rogue: 0,
    sorcerer: 0,
    warlock: 0,
    wizard: 0,
  },
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const MONK_6_INPUT: DndMachineInput = {
  maxHp: 30,
  monkLevel: classLevel(6),
  wholenessMax: resourceCount(3),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const RANGER_10_INPUT: DndMachineInput = {
  maxHp: 32,
  rangerLevel: classLevel(10),
  wisMod: abilityModifier(3),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const WIZARD_4_INPUT: DndMachineInput = {
  maxHp: 24,
  wizardLevel: classLevel(4),
  slotsMax: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const WIZARD_14_INPUT: DndMachineInput = {
  maxHp: 36,
  wizardLevel: classLevel(14),
  slotsMax: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  preparedSpells: new Set(["burning_hands", "fireball", "hold_person"]),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const CLERIC_5_SPELL_INPUT: DndMachineInput = {
  maxHp: 32,
  clericLevel: classLevel(5),
  preparedSpells: new Set(["bless", "guiding_bolt", "healing_word"]),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const WARLOCK_13_INPUT: DndMachineInput = {
  maxHp: 28,
  warlockLevel: classLevel(13),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const WARLOCK_20_INPUT: DndMachineInput = {
  maxHp: 28,
  warlockLevel: classLevel(20),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const PALADIN_2_INPUT: DndMachineInput = {
  maxHp: 28,
  paladinLevel: classLevel(2),
  slotsMax: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const BARD_5_INPUT: DndMachineInput = {
  maxHp: 26,
  bardLevel: classLevel(5),
  chaMod: abilityModifier(3),
  slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const BARD_14_INPUT: DndMachineInput = {
  maxHp: 38,
  bardLevel: classLevel(14),
  chaMod: abilityModifier(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const DRUID_5_INPUT: DndMachineInput = {
  maxHp: 28,
  druidLevel: classLevel(5),
  slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  slotsCurrent: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const BARBARIAN_11_INPUT: DndMachineInput = {
  maxHp: 40,
  barbarianLevel: classLevel(11),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const ROGUE_5_INPUT: DndMachineInput = {
  maxHp: 32,
  rogueLevel: classLevel(5),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

const PHASE_4A_SAFE_BATCH_INPUT: DndMachineInput = {
  maxHp: 52,
  fighterLevel: classLevel(2),
  barbarianLevel: classLevel(2),
  monkLevel: classLevel(2),
  rogueLevel: classLevel(3),
  clericLevel: classLevel(2),
  paladinLevel: classLevel(3),
  bardLevel: classLevel(1),
  rangerLevel: classLevel(14),
  chaMod: abilityModifier(3),
  wisMod: abilityModifier(3),
  preparedSpells: new Set(),
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
};

function expectRequest(request: ResolutionRequest | { readonly code: string }) {
  if ("code" in request)
    throw new Error(
      `expected successful resolution request, got ${request.code}`,
    );
  return request;
}

function expectBattleRequest(request: ReturnType<typeof resolveBattleAction>) {
  if ("code" in request)
    throw new Error(
      `expected successful battle resolution request, got ${request.code}`,
    );
  return request;
}

function creatureToken<T extends object>(token: T) {
  return { scope: "creature" as const, ...token };
}

function creatureResolved<T extends object>(token: T) {
  return { scope: "creature" as const, ...token };
}

const DEFAULT_BATTLE_ATTACK_CONTEXT: Pick<
  Extract<BattleEvent, { type: "BATTLE_ATTACK" }>,
  | "knockOut"
  | "isMelee"
  | "isFinesse"
  | "attackerWithin5ft"
  | "attackerWithin60ft"
  | "hostileWithin5ft"
  | "targetCanSeeAttacker"
  | "attackerCanSeeTarget"
  | "frightSourceInLOS"
  | "hasAllyAdjacentToTarget"
  | "saDmg"
  | "hitReactionCandidates"
> = {
  knockOut: false,
  isMelee: true,
  isFinesse: false,
  attackerWithin5ft: true,
  attackerWithin60ft: true,
  hostileWithin5ft: false,
  targetCanSeeAttacker: true,
  attackerCanSeeTarget: true,
  frightSourceInLOS: false,
  hasAllyAdjacentToTarget: false,
  saDmg: 0,
  hitReactionCandidates: new Set<CreatureIdT>(),
};

const ZERO_BATTLE_SOT: Pick<
  BattleEvent & { type: "BATTLE_START_TURN" },
  | "sotDmg"
  | "sotDt"
  | "sotHeal"
  | "sotSaveResult"
  | "sotConSave"
  | "rechargeD6"
  | "deathSaveRoll"
> = {
  rechargeD6: 1,
  sotDmg: 0,
  sotDt: "bludgeoning",
  sotHeal: 0,
  sotSaveResult: false,
  sotConSave: true,
  deathSaveRoll: 0,
};

function makeBattleActor(...events: ReadonlyArray<BattleEvent>) {
  const actor = createActor(battleMachine);
  actor.start();
  for (const event of events) actor.send(event);
  return actor;
}

function initBattleForHitDiscovery() {
  return makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["shield"]),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        bardLevel: 3,
        bardicInspirationCharges: 3,
        initiativeRoll: 10,
      },
    ],
  });
}

function initBattleForParryDiscovery() {
  return makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("D"),
        maxHp: 20,
        kind: "Monster",
        parryAcBonus: 2,
        initiativeRoll: 15,
      },
    ],
  });
}

function initBattleForRedirectAttackDiscovery() {
  return makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 20,
        battleSide: "heroes",
        battlePosition: { row: 0, col: 0 },
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "Monster",
        initiativeRoll: 15,
        battleSide: "goblins",
        battlePosition: { row: 1, col: 0 },
        battleReactionOptions: ["redirectAttack"],
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "Monster",
        initiativeRoll: 10,
        battleSide: "goblins",
        battlePosition: { row: 1, col: 1 },
      },
      {
        id: CreatureId("D"),
        maxHp: 20,
        kind: "Monster",
        initiativeRoll: 5,
        battleSide: "heroes",
        battlePosition: { row: 3, col: 3 },
      },
    ],
  });
}

function initBattleForDamageDiscovery() {
  return makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        initiativeRoll: 10,
      },
    ],
  });
}

function initBattleForAfterDamageDiscovery(
  defenderConfig: Partial<
    Extract<BattleEvent, { type: "BATTLE_INIT" }>["creatures"][number]
  >,
  attackContext = DEFAULT_BATTLE_ATTACK_CONTEXT,
) {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 10,
        ...defenderConfig,
      },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_ATTACK",
    targetId: CreatureId("B"),
    attackRoll: 15,
    diceCount: 1,
    dieSize: 8,
    dmg: 5,
    dt: "slashing",
    crit: false,
    tAc: armorClass(10),
    ...attackContext,
  });
  return actor;
}

function initBattleForProneDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        prone: true,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return actor;
}

function initBattleForFeatureDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        fighterLevel: 2,
        barbarianLevel: 2,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return actor;
}

function initBattleForAttackDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 15,
        ...fighterStartBattleLoadout(),
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return actor;
}

function initBattleForReleaseGrappleDiscovery(
  {
    withGrapple,
    hiddenTarget = false,
  }: { readonly withGrapple: boolean; readonly hiddenTarget?: boolean } = {
    withGrapple: true,
    hiddenTarget: false,
  },
) {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  if (withGrapple) {
    actor.send({
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });
  }
  if (hiddenTarget) {
    actor.send({
      type: "BATTLE_HIDE",
      stealthTotal: 18,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });
    actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  }
  return actor;
}

function initBattleForReadyWindow() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({ type: "BATTLE_READY" });
  actor.send({
    type: "BATTLE_END_TURN",
    eotSaveSucceeded: false,
    eotDmg: 0,
    eotDt: "bludgeoning",
    eotConSave: true,
  });
  return actor;
}

function initBattleForMonsterBonusActionDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      statBlockToInitCreatureConfig({
        id: CreatureId("A"),
        statBlock: GOBLIN_WARRIOR,
        initiativeRoll: 15,
      }),
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return actor;
}

function initBattleForReadySpellDiscovery(
  actorConfig: Partial<
    Extract<BattleEvent, { type: "BATTLE_INIT" }>["creatures"][number]
  > = {},
) {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["hold_person"]),
        initiativeRoll: 15,
        ...actorConfig,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  return actor;
}

function initBattleForDeflectDiscovery() {
  return makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        monkLevel: 3,
        dexMod: 4,
        initiativeRoll: 10,
      },
    ],
  });
}

function initBattleForCounterspellDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["hold_person"]),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["counterspell"]),
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_CAST_SAVE_SPELL",
    targetId: CreatureId("C"),
    saveDC: difficultyClass(13),
    saveRoll: 1,
    dmgOnFail: 0,
    halfOnSave: false,
    dt: "psychic",
    cond: "paralyzed",
    applyCond: true,
    saveAbility: "wis",
    slotLvl: spellSlotLevel(1),
    spellName: "hold_person",
    ritual: false,
  });
  return actor;
}

function initBattleForCounterspellRuntimeDiscovery() {
  const actor = makeBattleActor({
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["banishment"]),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        preparedSpells: new Set(["counterspell"]),
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
  actor.send({
    type: "BATTLE_CAST_SAVE_SPELL",
    targetId: CreatureId("C"),
    saveDC: difficultyClass(15),
    saveRoll: 1,
    dmgOnFail: 0,
    halfOnSave: false,
    dt: "force",
    cond: "paralyzed",
    applyCond: false,
    saveAbility: "cha",
    slotLvl: spellSlotLevel(4),
    spellName: "banishment",
    ritual: false,
  });
  return actor;
}

describe("available actions contract", () => {
  test("control command schema exposes lifecycle commands without raw passthrough", () => {
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema)({
        scope: "creature",
        type: "LONG_REST",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema)({
        scope: "battle",
        type: "BATTLE_START_TURN",
        rechargeD6: 6,
        sotDmg: 0,
        sotDt: "bludgeoning",
        sotHeal: 0,
        sotSaveResult: false,
        sotConSave: true,
        deathSaveRoll: 0,
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema)({
        scope: "battle",
        type: "BATTLE_START_TURN",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema, {
        onExcessProperty: "error",
      })({
        scope: "battle",
        type: "BATTLE_START_TURN",
        rechargeD6: 6,
        sotDmg: 0,
        sotDt: "bludgeoning",
        sotHeal: 0,
        sotSaveResult: false,
        sotConSave: true,
        deathSaveRoll: 0,
        hiddenRuntimeFact: true,
      })._tag,
    ).toBe("Left");
  });

  test("control command schema decodes BATTLE_ADD_CREATURE", () => {
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema)({
        scope: "battle",
        type: "BATTLE_ADD_CREATURE",
        insertAtIndex: 1,
        creatures: [{ id: "A", maxHp: 20, kind: "PC" }],
      })._tag,
    ).toBe("Right");
  });

  test("control command schema decodes BATTLE_REMOVE_CREATURE", () => {
    expect(
      Schema.decodeUnknownEither(ControlCommandSchema)({
        scope: "battle",
        type: "BATTLE_REMOVE_CREATURE",
        creatureIds: ["A", "B"],
      })._tag,
    ).toBe("Right");
  });

  test("table event schema exposes wired creature commands without raw passthrough", () => {
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 8,
        damageType: "fire",
        resistances: ["fire"],
        semanticAction: { kind: "spell", name: "fireball" },
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "HEAL",
        amount: 5,
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "GRANT_TEMP_HP",
        amount: 6,
        keepOld: false,
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "STABILIZE",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "KNOCK_OUT",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "APPLY_CONDITION",
        condition: "poisoned",
        conditionImmunities: ["petrified"],
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "REMOVE_CONDITION",
        condition: "poisoned",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 2,
        exhaustionImmune: false,
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "REDUCE_EXHAUSTION",
        levels: 1,
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "APPLY_FALL",
        damageRoll: 9,
        resistances: ["bludgeoning"],
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "RECORD_FAILED_SAVING_THROW",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "RECORD_FAILED_ABILITY_CHECK",
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "battle",
        type: "BATTLE_HEAL",
        targetId: "B",
        amount: 5,
        semanticAction: { kind: "spell", name: "Healing Word" },
      })._tag,
    ).toBe("Right");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "TAKE_DAMAGE",
        amount: 8,
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema, {
        onExcessProperty: "error",
      })({
        scope: "creature",
        type: "GRANT_TEMP_HP",
        amount: 6,
        keepOld: false,
        condition: "poisoned",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "APPLY_CONDITION",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "ADD_EXHAUSTION",
        levels: 7,
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "APPLY_FALL",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "battle",
        type: "BATTLE_HEAL",
        amount: 5,
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "battle",
        type: "BATTLE_CAST_SAVE_SPELL",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "TRIGGER_INDOMITABLE",
      })._tag,
    ).toBe("Left");
    expect(
      Schema.decodeUnknownEither(TableEventCommandSchema)({
        scope: "creature",
        type: "TRIGGER_TACTICAL_MIND",
      })._tag,
    ).toBe("Left");
  });

  test("initial state only exposes ENTER_COMBAT", () => {
    const actor = makeActor();

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toEqual([
      creatureToken({
        type: "ENTER_COMBAT",
        cost: cost(),
        outcome: {
          summary: "Enter combat (begin tracking turns and action economy)",
        },
      }),
      creatureToken({
        type: "SHORT_REST",
        availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
        cost: cost(),
        outcome: {
          summary:
            "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features",
        },
      }),
    ]);
  });

  test("START_TURN is unavailable before entering combat", () => {
    const actor = makeActor();

    expect(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "START_TURN" }),
      ),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "START_TURN is not currently available in this state.",
    });
  });

  test("resolves and finalizes enter combat, start turn, and second wind", () => {
    const actor = damageActor(10);

    const enterRequest = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "ENTER_COMBAT" }),
      ),
    );
    const enterFinalized = finalizeResolution(
      enterRequest,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(enterFinalized).toEqual({
      ok: true,
      event: { type: "ENTER_COMBAT" },
      outcome: "Enter combat (begin tracking turns and action economy)",
    });
    if (!enterFinalized.ok)
      throw new Error("expected ENTER_COMBAT finalization to succeed");
    actor.send(enterFinalized.event);

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual(["START_TURN", "EXIT_COMBAT"]);

    const startTurnRequest = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "START_TURN" }),
      ),
    );
    const startTurnFinalized = finalizeResolution(
      startTurnRequest,
      { runtime: "startTurn", values: {} },
      actor.getSnapshot().context,
    );
    expect(startTurnFinalized.ok).toBe(true);
    if (!startTurnFinalized.ok)
      throw new Error("expected START_TURN finalization to succeed");
    actor.send(startTurnFinalized.event);

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual(["USE_ACTION_SURGE", "USE_SECOND_WIND", "EXIT_COMBAT"]);

    const secondWindRequest = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_SECOND_WIND" }),
      ),
    );
    const secondWindFinalized = finalizeResolution(
      secondWindRequest,
      { runtime: "secondWind", values: { d10Roll: 7 } },
      actor.getSnapshot().context,
    );
    expect(secondWindFinalized).toEqual({
      ok: true,
      event: { type: "USE_SECOND_WIND", d10Roll: 7 },
      outcome: "Healed 1d10(7) + 5 = 12 HP",
    });
    if (!secondWindFinalized.ok)
      throw new Error("expected USE_SECOND_WIND finalization to succeed");
    actor.send(secondWindFinalized.event);

    expect(actor.getSnapshot().context.hp).toBe(44);
  });

  test("EXIT_COMBAT remains available after death while roster teardown is caller-owned", () => {
    const actor = makeActor();
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 88,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    expect(actor.getSnapshot().context.dead).toBe(true);
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual({
      scope: "creature",
      type: "EXIT_COMBAT",
      cost: cost(),
      outcome: {
        summary: "Stop tracking this creature in combat and initiative order",
      },
    });

    const exitRequest = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "EXIT_COMBAT" }),
      ),
    );
    const exitFinalized = finalizeResolution(
      exitRequest,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(exitFinalized).toEqual({
      ok: true,
      event: { type: "EXIT_COMBAT" },
      outcome: "Stop tracking this creature in combat and initiative order",
    });
  });

  test("exposes one prepared-spell token per prepared spell with slot-level choice holes", () => {
    const actor = makeActorWithInput(CLERIC_5_SPELL_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    const spellTokens = getAvailableActions(
      actor.getSnapshot().context,
      actor.getSnapshot().tags,
    ).filter((token) => token.type === "CAST_PREPARED_SPELL");

    expect(spellTokens).toEqual([
      creatureToken({
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(quota("action"), pool("spellSlot")),
        outcome: {
          summary:
            "Cast Bless with a spell slot of the chosen level and begin concentrating on it",
        },
      }),
      creatureToken({
        type: "CAST_PREPARED_SPELL",
        spellName: "guiding_bolt",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(quota("action"), pool("spellSlot")),
        outcome: {
          summary: "Cast Guiding Bolt with a spell slot of the chosen level",
        },
      }),
      creatureToken({
        type: "CAST_PREPARED_SPELL",
        spellName: "healing_word",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(quota("bonusAction"), pool("spellSlot")),
        outcome: {
          summary: "Cast Healing Word with a spell slot of the chosen level",
        },
      }),
    ]);
  });

  test("resolves prepared spell casts and rejects invalid slot levels", () => {
    const actor = makeActorWithInput(CLERIC_5_SPELL_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        scope: "creature",
        type: "CAST_PREPARED_SPELL",
        spellName: "guiding_bolt",
        slotLevel: spellSlotLevel(4),
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "Guiding Bolt with a level 4 slot is not currently available in this state.",
    });

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        scope: "creature",
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: spellSlotLevel(2),
      }),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: {
        type: "CAST_PREPARED_SPELL",
        spellName: "bless",
        slotLevel: spellSlotLevel(2),
      },
      outcome:
        "Cast Bless with a level 2 spell slot and begin concentrating on it",
    });
  });

  test("short rest exposes hit-die pools and finalizes runtime rolls", () => {
    const actor = makeActor();
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 12,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "SHORT_REST",
        availableHitDice: [{ className: "fighter", remaining: 2, dieSize: 10 }],
        cost: cost(),
        outcome: {
          summary:
            "Finish a short rest, spend hit dice in the chosen order, and recharge short-rest features",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({
          type: "SHORT_REST",
          spendHitDice: ["fighter", "fighter"],
        }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      {
        runtime: "shortRest",
        values: {
          hdRolls: [
            { className: "fighter", roll: 4 },
            { className: "fighter", roll: 3 },
          ],
        },
      },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: {
        type: "SHORT_REST",
        hdRolls: [
          { className: "fighter", roll: 4 },
          { className: "fighter", roll: 3 },
        ],
      },
      outcome: "Spent hit dice in order: fighter d10(4), fighter d10(3)",
    });
  });

  test("short rest is not available at 0 HP", () => {
    const actor = makeActor();
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 44,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("SHORT_REST");
  });

  test("exposes and executes USE_HEROIC_INSPIRATION as a root action when the flag is present", () => {
    const actor = makeActorWithInput(FIGHTER_10_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_HEROIC_INSPIRATION",
        cost: cost(),
        outcome: {
          summary:
            "Spend Heroic Inspiration to reroll a die and use the new roll",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_HEROIC_INSPIRATION" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_HEROIC_INSPIRATION" },
      outcome: "Spend Heroic Inspiration to reroll a die and use the new roll",
    });
    if (!finalized.ok)
      throw new Error(
        "expected USE_HEROIC_INSPIRATION finalization to succeed",
      );
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.fighter?.heroicInspiration,
    ).toBe(false);
  });

  test("exposes USE_TACTICAL_MIND only while a failed ability check trigger is pending", () => {
    const actor = makeActorWithInput(FIGHTER_2_INPUT);

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("USE_TACTICAL_MIND");

    actor.send({ type: "TRIGGER_TACTICAL_MIND" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_TACTICAL_MIND",
        cost: cost(pool("secondWind")),
        outcome: {
          summary:
            "Add 1d10 to the failed ability check; expend Second Wind only if the check now succeeds",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_TACTICAL_MIND" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "tacticalMind", values: { boostedCheckSucceeds: true } },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_TACTICAL_MIND", boostedCheckSucceeds: true },
      outcome: "Tactical Mind turned the failed ability check into a success",
    });
    if (!finalized.ok)
      throw new Error("expected USE_TACTICAL_MIND finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.fighter?.secondWindCharges,
    ).toBe(1);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes USE_METAMAGIC with only currently legal known options and executes the resolved token", () => {
    const actor = makeActorWithInput(SORCERER_5_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_METAMAGIC",
        option: { options: ["careful", "subtle"] },
        cost: cost(pool("sorceryPoints")),
        outcome: {
          summary:
            "Apply a currently legal known Metamagic option to the spell you are casting",
        },
      }),
    );

    expect(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_METAMAGIC", option: "quickened" }),
      ),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message: "quickened Metamagic is not currently available in this state.",
    });

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_METAMAGIC", option: "careful" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_METAMAGIC", option: "careful" },
      outcome: "Apply careful Metamagic",
    });
    if (!finalized.ok)
      throw new Error("expected USE_METAMAGIC finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.sorcerer?.metamagicUsedThisCast,
    ).toEqual(new Set(["careful"]));
    expect(
      actor.getSnapshot().context.classStates.sorcerer?.sorceryPoints,
    ).toBe(4);
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("USE_METAMAGIC");
  });

  test("exposes USE_PEERLESS_SKILL only while a failed roll trigger is pending", () => {
    const actor = makeActorWithInput(BARD_14_INPUT);
    actor.send({ type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_PEERLESS_SKILL",
        cost: cost(pool("bardicInspiration")),
        outcome: {
          summary:
            "Add your Bardic Inspiration die to the failed attack roll; expend it only if the roll now succeeds",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_PEERLESS_SKILL" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "peerlessSkill", values: { success: false } },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_PEERLESS_SKILL", success: false },
      outcome:
        "Peerless Skill failed to turn the attack roll into a success, so Bardic Inspiration was not expended",
    });
    if (!finalized.ok)
      throw new Error("expected USE_PEERLESS_SKILL finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.bard?.bardicInspirationCharges,
    ).toBe(5);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes USE_RELENTLESS_RAGE only after the machine owns the drop-to-zero trigger", () => {
    const actor = makeActorWithInput(BARBARIAN_11_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    actor.send({ type: "ENTER_RAGE" });
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 40,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });

    expect(actor.getSnapshot().context.pendingResolution).toEqual({
      kind: "relentlessRage",
    });
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_RELENTLESS_RAGE",
        cost: cost(),
        outcome: {
          summary:
            "Make a DC 10 Constitution save to stay at 22 HP instead of dropping to 0",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_RELENTLESS_RAGE" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "relentlessRage", values: { conSaveSucceeded: true } },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_RELENTLESS_RAGE", conSaveSucceeded: true },
      outcome: "Relentless Rage succeeded; HP becomes 22",
    });
    if (!finalized.ok)
      throw new Error("expected USE_RELENTLESS_RAGE finalization to succeed");
    actor.send(finalized.event);

    expect(actor.getSnapshot().context.hp).toBe(22);
    expect(
      actor.getSnapshot().context.classStates.barbarian
        ?.relentlessRageTimesUsed,
    ).toBe(1);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes USE_INDOMITABLE only after the machine owns the failed-save trigger", () => {
    const actor = makeActorWithInput(FIGHTER_9_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    actor.send({ type: "TRIGGER_INDOMITABLE" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual({
      scope: "creature",
      type: "USE_INDOMITABLE",
      cost: cost(pool("indomitable")),
      outcome: {
        summary:
          "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level",
      },
    });

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        scope: "creature",
        type: "USE_INDOMITABLE",
      }),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_INDOMITABLE" },
      outcome:
        "Expend one Indomitable use to reroll the failed saving throw and add your Fighter level",
    });
    if (!finalized.ok)
      throw new Error("expected USE_INDOMITABLE finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.fighter?.indomitableCharges,
    ).toBe(0);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes USE_OVERCHANNEL only after the machine owns a qualifying cast trigger", () => {
    const actor = makeActorWithInput(WIZARD_14_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    actor.send({
      type: "TRIGGER_OVERCHANNEL",
      spellName: "fireball",
      slotLevel: spellSlotLevel(3),
    });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual({
      scope: "creature",
      type: "USE_OVERCHANNEL",
      cost: cost(),
      outcome: {
        summary:
          "Overchannel the qualifying Fireball cast at slot level 3 for maximum damage",
      },
    });

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        scope: "creature",
        type: "USE_OVERCHANNEL",
      }),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_OVERCHANNEL" },
      outcome:
        "Overchannel the qualifying Fireball cast at slot level 3 for maximum damage",
    });
    if (!finalized.ok)
      throw new Error("expected USE_OVERCHANNEL finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.wizard?.overchannelUsesThisLR,
    ).toBe(1);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes USE_SNEAK_ATTACK only after the machine owns a qualifying hit trigger", () => {
    const actor = makeActorWithInput(ROGUE_5_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    actor.send({
      type: "TRIGGER_SNEAK_ATTACK",
      mode: "finesse",
      source: "adjacentAlly",
    });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual({
      scope: "creature",
      type: "USE_SNEAK_ATTACK",
      cost: cost(),
      outcome: { summary: "Apply Sneak Attack damage to the qualifying hit" },
    });

    const request = expectRequest(
      resolveAction(actor.getSnapshot().context, actor.getSnapshot().tags, {
        scope: "creature",
        type: "USE_SNEAK_ATTACK",
      }),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_SNEAK_ATTACK" },
      outcome: "Apply Sneak Attack damage to the qualifying hit",
    });
    if (!finalized.ok)
      throw new Error("expected USE_SNEAK_ATTACK finalization to succeed");
    actor.send(finalized.event);

    expect(
      actor.getSnapshot().context.classStates.rogue?.sneakAttackUsedThisTurn,
    ).toBe(true);
    expect(actor.getSnapshot().context.pendingResolution).toBeNull();
  });

  test("exposes the safe phase 4A semantic batch from current owned state", () => {
    const actor = makeActorWithInput(PHASE_4A_SAFE_BATCH_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    const tokenTypes = getAvailableActions(
      actor.getSnapshot().context,
      actor.getSnapshot().tags,
    ).map((token) => token.type);
    expect(tokenTypes).toEqual(
      expect.arrayContaining([
        "USE_ACTION_SURGE",
        "ENTER_RAGE",
        "DECLARE_RECKLESS",
        "FLURRY_OF_BLOWS",
        "PATIENT_DEFENSE_FREE",
        "PATIENT_DEFENSE_FOCUS",
        "STEP_OF_THE_WIND_FREE",
        "STEP_OF_THE_WIND_FOCUS",
        "USE_STEADY_AIM",
        "CUNNING_ACTION_DASH",
        "CUNNING_ACTION_DISENGAGE",
        "CUNNING_ACTION_HIDE",
        "USE_CLERIC_CHANNEL_DIVINITY",
        "USE_PALADIN_CHANNEL_DIVINITY",
        "USE_BARDIC_INSPIRATION",
        "USE_NATURES_VEIL",
        "EXIT_COMBAT",
      ]),
    );
    expect(tokenTypes).not.toContain("USE_INDOMITABLE");
    expect(tokenTypes).not.toContain("USE_OVERCHANNEL");
    expect(tokenTypes).not.toContain("USE_SNEAK_ATTACK");

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_ACTION_SURGE",
        cost: cost(pool("actionSurge")),
        outcome: {
          summary:
            "Expend one Action Surge use to gain one additional action this turn",
        },
      }),
    );
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "FLURRY_OF_BLOWS",
        cost: cost(quota("bonusAction"), pool("focusPoint")),
        outcome: {
          summary:
            "Spend 1 Focus Point to make 2 unarmed strikes as a bonus action",
        },
      }),
    );
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_BARDIC_INSPIRATION",
        cost: cost(quota("bonusAction"), pool("bardicInspiration")),
        outcome: {
          summary:
            "Expend one Bardic Inspiration use to inspire another creature",
        },
      }),
    );
  });

  test("resolves and executes representative zero-runtime phase 4A actions", () => {
    const actor = makeActorWithInput(PHASE_4A_SAFE_BATCH_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    const actionSurgeRequest = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_ACTION_SURGE" }),
      ),
    );
    const actionSurgeFinalized = finalizeResolution(
      actionSurgeRequest,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(actionSurgeFinalized).toEqual({
      ok: true,
      event: { type: "USE_ACTION_SURGE" },
      outcome:
        "Expend one Action Surge use to gain one additional action this turn",
    });
    if (!actionSurgeFinalized.ok)
      throw new Error("expected USE_ACTION_SURGE finalization to succeed");
    actor.send(actionSurgeFinalized.event);
    expect(actor.getSnapshot().context.actionsRemaining).toBe(2);

    const bard = makeActorWithInput(PHASE_4A_SAFE_BATCH_INPUT);
    bard.send({ type: "ENTER_COMBAT" });
    bard.send({ type: "START_TURN" });
    const inspirationRequest = expectRequest(
      resolveAction(
        bard.getSnapshot().context,
        bard.getSnapshot().tags,
        creatureResolved({ type: "USE_BARDIC_INSPIRATION" }),
      ),
    );
    const inspirationFinalized = finalizeResolution(
      inspirationRequest,
      { runtime: "none" },
      bard.getSnapshot().context,
    );
    expect(inspirationFinalized).toEqual({
      ok: true,
      event: { type: "USE_BARDIC_INSPIRATION" },
      outcome: "Expend one Bardic Inspiration use to inspire another creature",
    });
    if (!inspirationFinalized.ok)
      throw new Error(
        "expected USE_BARDIC_INSPIRATION finalization to succeed",
      );
    bard.send(inspirationFinalized.event);
    expect(
      bard.getSnapshot().context.classStates.bard?.bardicInspirationCharges,
    ).toBe(2);
    expect(bard.getSnapshot().context.bonusActionUsed).toBe(true);

    const barbarian = makeActorWithInput(PHASE_4A_SAFE_BATCH_INPUT);
    barbarian.send({ type: "ENTER_COMBAT" });
    barbarian.send({ type: "START_TURN" });
    const rageRequest = expectRequest(
      resolveAction(
        barbarian.getSnapshot().context,
        barbarian.getSnapshot().tags,
        creatureResolved({ type: "ENTER_RAGE" }),
      ),
    );
    const rageFinalized = finalizeResolution(
      rageRequest,
      { runtime: "none" },
      barbarian.getSnapshot().context,
    );
    expect(rageFinalized).toEqual({
      ok: true,
      event: { type: "ENTER_RAGE" },
      outcome:
        "Enter a Rage, expend one Rage use, and consume your bonus action",
    });
    if (!rageFinalized.ok)
      throw new Error("expected ENTER_RAGE finalization to succeed");
    barbarian.send(rageFinalized.event);

    barbarian.send({ type: "START_TURN" });
    const nextTurnTypes = getAvailableActions(
      barbarian.getSnapshot().context,
      barbarian.getSnapshot().tags,
    ).map((token) => token.type);
    expect(nextTurnTypes).toContain("END_RAGE");
  });

  test("exposes and executes the dice-roll family through runtime inputs", () => {
    const monk = makeActorWithInput(MONK_6_INPUT);
    monk.send({
      type: "TAKE_DAMAGE",
      amount: 10,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });
    monk.send({ type: "ENTER_COMBAT" });
    monk.send({ type: "START_TURN" });

    expect(
      getAvailableActions(monk.getSnapshot().context, monk.getSnapshot().tags),
    ).toContainEqual(
      creatureToken({
        type: "WHOLENESS_OF_BODY",
        cost: cost(quota("bonusAction"), pool("wholenessOfBody")),
        outcome: { summary: "Heal 1d8 + 3 HP (minimum 1)" },
      }),
    );
    expect(
      getAvailableActions(monk.getSnapshot().context, monk.getSnapshot().tags),
    ).toContainEqual(
      creatureToken({
        type: "UNCANNY_METABOLISM",
        cost: cost(pool("uncannyMetabolism")),
        outcome: {
          summary: "Regain all expended Focus Points and heal 1d8 + 6 HP",
        },
      }),
    );

    const wholenessRequest = expectRequest(
      resolveAction(
        monk.getSnapshot().context,
        monk.getSnapshot().tags,
        creatureResolved({ type: "WHOLENESS_OF_BODY" }),
      ),
    );
    const wholenessFinalized = finalizeResolution(
      wholenessRequest,
      { runtime: "wholenessOfBody", values: { healRoll: 8 } },
      monk.getSnapshot().context,
    );
    expect(wholenessFinalized).toEqual({
      ok: true,
      event: { type: "WHOLENESS_OF_BODY", healRoll: 8 },
      outcome: "Healed 8 HP with Wholeness of Body",
    });
    if (!wholenessFinalized.ok)
      throw new Error("expected WHOLENESS_OF_BODY finalization to succeed");
    monk.send(wholenessFinalized.event);
    expect(monk.getSnapshot().context.hp).toBe(28);

    const monk2 = makeActorWithInput(MONK_6_INPUT);
    monk2.send({
      type: "TAKE_DAMAGE",
      amount: 10,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });
    monk2.send({ type: "ENTER_COMBAT" });
    monk2.send({ type: "START_TURN" });
    const uncannyRequest = expectRequest(
      resolveAction(
        monk2.getSnapshot().context,
        monk2.getSnapshot().tags,
        creatureResolved({ type: "UNCANNY_METABOLISM" }),
      ),
    );
    const uncannyFinalized = finalizeResolution(
      uncannyRequest,
      { runtime: "uncannyMetabolism", values: { healRoll: 5 } },
      monk2.getSnapshot().context,
    );
    expect(uncannyFinalized).toEqual({
      ok: true,
      event: { type: "UNCANNY_METABOLISM", healRoll: 5 },
      outcome: "Regained all Focus Points and healed 1d8(5) + 6 = 11 HP",
    });
    if (!uncannyFinalized.ok)
      throw new Error("expected UNCANNY_METABOLISM finalization to succeed");
    monk2.send(uncannyFinalized.event);
    expect(monk2.getSnapshot().context.hp).toBe(30);
    expect(
      monk2.getSnapshot().context.classStates.monk?.uncannyMetabolismUsed,
    ).toBe(true);

    const ranger = makeActorWithInput(RANGER_10_INPUT);
    ranger.send({ type: "ENTER_COMBAT" });
    ranger.send({ type: "START_TURN" });
    expect(
      getAvailableActions(
        ranger.getSnapshot().context,
        ranger.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_TIRELESS",
        cost: cost(quota("action"), pool("tireless")),
        outcome: { summary: "Gain 1d8 + 3 temporary HP (minimum 1)" },
      }),
    );
    const tirelessRequest = expectRequest(
      resolveAction(
        ranger.getSnapshot().context,
        ranger.getSnapshot().tags,
        creatureResolved({ type: "USE_TIRELESS" }),
      ),
    );
    const tirelessFinalized = finalizeResolution(
      tirelessRequest,
      { runtime: "tireless", values: { d8Roll: 4 } },
      ranger.getSnapshot().context,
    );
    expect(tirelessFinalized).toEqual({
      ok: true,
      event: { type: "USE_TIRELESS", d8Roll: 4 },
      outcome: "Gained 1d8(4) + 3 = 7 temporary HP",
    });
    if (!tirelessFinalized.ok)
      throw new Error("expected USE_TIRELESS finalization to succeed");
    ranger.send(tirelessFinalized.event);
    expect(ranger.getSnapshot().context.tempHp).toBe(7);
    expect(ranger.getSnapshot().context.actionsRemaining).toBe(0);
  });

  test("exposes and executes scalar slot and amount actions with legality-filtered holes", () => {
    const wizard = makeActorWithInput(WIZARD_4_INPUT);
    wizard.send({ type: "ENTER_COMBAT" });
    wizard.send({ type: "START_TURN" });
    expect(
      getAvailableActions(
        wizard.getSnapshot().context,
        wizard.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_ARCANE_RECOVERY",
        slotLevel: { options: [spellSlotLevel(2)] },
        cost: cost(pool("arcaneRecovery")),
        outcome: {
          summary:
            "Recover one expended spell slot of the chosen level and use Arcane Recovery",
        },
      }),
    );
    expect(
      resolveAction(wizard.getSnapshot().context, wizard.getSnapshot().tags, {
        scope: "creature",
        type: "USE_ARCANE_RECOVERY",
        slotLevel: spellSlotLevel(1),
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "Arcane Recovery for a level 1 slot is not currently available in this state.",
    });

    const warlock = makeActorWithInput(WARLOCK_13_INPUT);
    warlock.send({ type: "ENTER_COMBAT" });
    warlock.send({ type: "START_TURN" });
    expect(
      getAvailableActions(
        warlock.getSnapshot().context,
        warlock.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_MYSTIC_ARCANUM",
        spellLevel: { options: [spellSlotLevel(6), spellSlotLevel(7)] },
        cost: cost(pool("mysticArcanum")),
        outcome: {
          summary:
            "Cast an unused Mystic Arcanum spell of the chosen level without expending a slot",
        },
      }),
    );

    const paladin = makeActorWithInput(PALADIN_2_INPUT);
    paladin.send({ type: "ENTER_COMBAT" });
    paladin.send({ type: "START_TURN" });
    expect(
      getAvailableActions(
        paladin.getSnapshot().context,
        paladin.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_LAY_ON_HANDS",
        amount: { options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
        cost: cost(quota("bonusAction"), pool("layOnHandsPool")),
        outcome: {
          summary: "Spend Lay on Hands points to restore up to that many HP",
        },
      }),
    );
    expect(
      getAvailableActions(
        paladin.getSnapshot().context,
        paladin.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_DIVINE_SMITE",
        slotLevel: { options: [spellSlotLevel(1)] },
        cost: cost(quota("bonusAction"), pool("spellSlot")),
        outcome: {
          summary:
            "Expend a spell slot of the chosen level to use Divine Smite",
        },
      }),
    );
    const layOnHandsRequest = expectRequest(
      resolveAction(
        paladin.getSnapshot().context,
        paladin.getSnapshot().tags,
        creatureResolved({ type: "USE_LAY_ON_HANDS", amount: 3 }),
      ),
    );
    const layOnHandsFinalized = finalizeResolution(
      layOnHandsRequest,
      { runtime: "none" },
      paladin.getSnapshot().context,
    );
    expect(layOnHandsFinalized).toEqual({
      ok: true,
      event: { type: "USE_LAY_ON_HANDS", amount: 3 },
      outcome: "Spend 3 Lay on Hands points to restore up to 3 HP",
    });

    const bard = makeActorWithInput(BARD_5_INPUT);
    bard.send({ type: "ENTER_COMBAT" });
    bard.send({ type: "START_TURN" });
    bard.send({ type: "USE_BARDIC_INSPIRATION" });
    expect(
      getAvailableActions(bard.getSnapshot().context, bard.getSnapshot().tags),
    ).toContainEqual(
      creatureToken({
        type: "USE_FONT_SLOT_RESTORE",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(pool("spellSlot")),
        outcome: {
          summary: "Expend a spell slot to regain one Bardic Inspiration use",
        },
      }),
    );

    const sorcerer = makeActorWithInput({
      ...SORCERER_5_INPUT,
      slotsMax: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      slotsCurrent: [3, 3, 2, 0, 0, 0, 0, 0, 0],
    });
    sorcerer.send({ type: "ENTER_COMBAT" });
    sorcerer.send({ type: "START_TURN" });
    sorcerer.send({ type: "USE_METAMAGIC", option: "careful" });
    expect(
      getAvailableActions(
        sorcerer.getSnapshot().context,
        sorcerer.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "CONVERT_SLOT_TO_POINTS",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(pool("spellSlot")),
        outcome: {
          summary:
            "Expend a spell slot to gain sorcery points equal to its level",
        },
      }),
    );
    expect(
      getAvailableActions(
        sorcerer.getSnapshot().context,
        sorcerer.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "CONVERT_POINTS_TO_SLOT",
        slotLevel: { options: [spellSlotLevel(1)] },
        cost: cost(quota("bonusAction"), pool("sorceryPoints")),
        outcome: {
          summary:
            "Spend sorcery points to create a spell slot of the chosen level",
        },
      }),
    );
  });

  test("exposes and executes Warlock and Sorcerer creature suggested actions", () => {
    const warlock = makeActorWithInput(WARLOCK_13_INPUT);
    warlock.send({ type: "ENTER_COMBAT" });
    warlock.send({ type: "START_TURN" });
    warlock.send({ type: "USE_ELDRITCH_SMITE" });
    expect(warlock.getSnapshot().context.pactSlotsCurrent).toBe(2);
    expect(
      getAvailableActions(
        warlock.getSnapshot().context,
        warlock.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_MAGICAL_CUNNING",
        cost: cost(pool("magicalCunning")),
        outcome: {
          summary:
            "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
        },
      }),
    );

    const magicalCunningRequest = expectRequest(
      resolveAction(
        warlock.getSnapshot().context,
        warlock.getSnapshot().tags,
        creatureResolved({ type: "USE_MAGICAL_CUNNING" }),
      ),
    );
    const magicalCunningFinalized = finalizeResolution(
      magicalCunningRequest,
      { runtime: "none" },
      warlock.getSnapshot().context,
    );
    expect(magicalCunningFinalized).toEqual({
      ok: true,
      event: { type: "USE_MAGICAL_CUNNING" },
      outcome:
        "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
    });
    if (!magicalCunningFinalized.ok)
      throw new Error("expected USE_MAGICAL_CUNNING finalization to succeed");
    warlock.send(magicalCunningFinalized.event);
    expect(
      warlock.getSnapshot().context.classStates.warlock?.magicalCunningUsed,
    ).toBe(true);
    expect(warlock.getSnapshot().context.pactSlotsCurrent).toBe(3);

    const sorcerer = makeActorWithInput(SORCERER_5_INPUT);
    sorcerer.send({ type: "ENTER_COMBAT" });
    sorcerer.send({ type: "START_TURN" });
    expect(
      getAvailableActions(
        sorcerer.getSnapshot().context,
        sorcerer.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_INNATE_SORCERY",
        cost: cost(quota("bonusAction"), pool("innateSorcery")),
        outcome: {
          summary: "Use a bonus action to activate Innate Sorcery for 1 minute",
        },
      }),
    );

    const innateSorceryRequest = expectRequest(
      resolveAction(
        sorcerer.getSnapshot().context,
        sorcerer.getSnapshot().tags,
        creatureResolved({ type: "USE_INNATE_SORCERY" }),
      ),
    );
    const innateSorceryFinalized = finalizeResolution(
      innateSorceryRequest,
      { runtime: "none" },
      sorcerer.getSnapshot().context,
    );
    expect(innateSorceryFinalized).toEqual({
      ok: true,
      event: { type: "USE_INNATE_SORCERY" },
      outcome: "Use a bonus action to activate Innate Sorcery for 1 minute",
    });
    if (!innateSorceryFinalized.ok)
      throw new Error("expected USE_INNATE_SORCERY finalization to succeed");
    sorcerer.send(innateSorceryFinalized.event);
    expect(
      sorcerer.getSnapshot().context.classStates.sorcerer?.innateSorceryActive,
    ).toBe(true);
    expect(
      sorcerer.getSnapshot().context.classStates.sorcerer?.innateSorceryCharges,
    ).toBe(1);
    expect(sorcerer.getSnapshot().context.bonusActionUsed).toBe(true);
  });

  test("surfaces Wild Resurgence charge recovery only after Wild Shape charges are depleted", () => {
    const actor = makeActorWithInput(DRUID_5_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    actor.send({ type: "ENTER_WILD_SHAPE" });
    actor.send({ type: "END_TURN" });
    actor.send({ type: "START_TURN" });
    actor.send({ type: "EXIT_WILD_SHAPE" });
    actor.send({ type: "END_TURN" });
    actor.send({ type: "START_TURN" });
    actor.send({ type: "ENTER_WILD_SHAPE" });
    actor.send({ type: "END_TURN" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_WILD_RESURGENCE_CHARGE",
        slotLevel: {
          options: [spellSlotLevel(1), spellSlotLevel(2), spellSlotLevel(3)],
        },
        cost: cost(pool("spellSlot")),
        outcome: {
          summary: "Expend a spell slot to regain one Wild Shape use",
        },
      }),
    );
  });

  test("restores all expended pact slots at Warlock 20 with Eldritch Master", () => {
    const warlock = makeActorWithInput(WARLOCK_20_INPUT);
    warlock.send({ type: "ENTER_COMBAT" });
    warlock.send({ type: "START_TURN" });
    warlock.send({ type: "EXPEND_PACT_SLOT" });
    warlock.send({ type: "EXPEND_PACT_SLOT" });
    expect(warlock.getSnapshot().context.pactSlotsCurrent).toBe(2);

    const magicalCunningRequest = expectRequest(
      resolveAction(
        warlock.getSnapshot().context,
        warlock.getSnapshot().tags,
        creatureResolved({ type: "USE_MAGICAL_CUNNING" }),
      ),
    );
    const magicalCunningFinalized = finalizeResolution(
      magicalCunningRequest,
      { runtime: "none" },
      warlock.getSnapshot().context,
    );
    expect(magicalCunningFinalized).toEqual({
      ok: true,
      event: { type: "USE_MAGICAL_CUNNING" },
      outcome:
        "Regain expended Pact Magic spell slots (up to half your max, rounded up); once per Long Rest",
    });
    if (!magicalCunningFinalized.ok)
      throw new Error("expected USE_MAGICAL_CUNNING finalization to succeed");
    warlock.send(magicalCunningFinalized.event);
    expect(warlock.getSnapshot().context.pactSlotsCurrent).toBe(4);
  });

  test("surfaces ENTER_WILD_SHAPE for a level 2+ druid with charges and bonus action available", () => {
    const actor = makeActorWithInput(DRUID_5_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "ENTER_WILD_SHAPE",
        cost: cost(quota("bonusAction"), pool("wildShape")),
        outcome: {
          summary: "Shape-shift into a beast form, gaining 5 temporary HP",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "ENTER_WILD_SHAPE" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "ENTER_WILD_SHAPE" },
      outcome: "Shape-shift into a beast form, gaining 5 temporary HP",
    });
    if (!finalized.ok)
      throw new Error("expected ENTER_WILD_SHAPE finalization to succeed");
    actor.send(finalized.event);
    expect(actor.getSnapshot().context.classStates.druid?.inWildShape).toBe(
      true,
    );
    expect(
      actor.getSnapshot().context.classStates.druid?.wildShapeCharges,
    ).toBe(1);
    expect(actor.getSnapshot().context.bonusActionUsed).toBe(true);
    expect(actor.getSnapshot().context.tempHp).toBe(5);
  });

  test("surfaces EXIT_WILD_SHAPE only when in wild shape with bonus action available", () => {
    const actor = makeActorWithInput(DRUID_5_INPUT);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("EXIT_WILD_SHAPE");

    actor.send({ type: "ENTER_WILD_SHAPE" });
    actor.send({ type: "END_TURN" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "EXIT_WILD_SHAPE",
        cost: cost(quota("bonusAction")),
        outcome: {
          summary: "Revert from beast form to your normal form",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "EXIT_WILD_SHAPE" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "EXIT_WILD_SHAPE" },
      outcome: "Revert from beast form to your normal form",
    });
    if (!finalized.ok)
      throw new Error("expected EXIT_WILD_SHAPE finalization to succeed");
    actor.send(finalized.event);
    expect(actor.getSnapshot().context.classStates.druid?.inWildShape).toBe(
      false,
    );
    expect(actor.getSnapshot().context.bonusActionUsed).toBe(true);
  });

  test("surfaces USE_WILD_RESURGENCE_SLOT only when the level 1 slot can be restored", () => {
    const fullSlotActor = makeActorWithInput(DRUID_5_INPUT);
    fullSlotActor.send({ type: "ENTER_COMBAT" });
    fullSlotActor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        fullSlotActor.getSnapshot().context,
        fullSlotActor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("USE_WILD_RESURGENCE_SLOT");
    expect(
      resolveAction(
        fullSlotActor.getSnapshot().context,
        fullSlotActor.getSnapshot().tags,
        creatureResolved({ type: "USE_WILD_RESURGENCE_SLOT" }),
      ),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "USE_WILD_RESURGENCE_SLOT is not currently available in this state.",
    });

    const actor = makeActorWithInput({
      ...DRUID_5_INPUT,
      slotsCurrent: [3, 3, 2, 0, 0, 0, 0, 0, 0],
    });
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ),
    ).toContainEqual(
      creatureToken({
        type: "USE_WILD_RESURGENCE_SLOT",
        cost: cost(pool("wildShape")),
        outcome: {
          summary:
            "Expend one Wild Shape use to regain a level 1 spell slot; once per Long Rest",
        },
      }),
    );

    const request = expectRequest(
      resolveAction(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
        creatureResolved({ type: "USE_WILD_RESURGENCE_SLOT" }),
      ),
    );
    const finalized = finalizeResolution(
      request,
      { runtime: "none" },
      actor.getSnapshot().context,
    );
    expect(finalized).toEqual({
      ok: true,
      event: { type: "USE_WILD_RESURGENCE_SLOT" },
      outcome:
        "Expend one Wild Shape use to regain a level 1 spell slot; once per Long Rest",
    });
    if (!finalized.ok)
      throw new Error(
        "expected USE_WILD_RESURGENCE_SLOT finalization to succeed",
      );
    actor.send(finalized.event);
    expect(actor.getSnapshot().context.slotsCurrent[0]).toBe(4);
    expect(
      actor.getSnapshot().context.classStates.druid?.wildShapeCharges,
    ).toBe(1);
    expect(
      actor.getSnapshot().context.classStates.druid
        ?.wildResurgenceSlotUsedThisLR,
    ).toBe(true);
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).not.toContain("USE_WILD_RESURGENCE_SLOT");
  });

  test("spent resources remove action, bonus-action, and charge-gated free tokens from the grouped surface", () => {
    const actor = makeActorWithInput(PHASE_2_MULTIGROUP_INPUT);
    actor.send({
      type: "TAKE_DAMAGE",
      amount: 10,
      damageType: "slashing",
      resistances: new Set(),
      vulnerabilities: new Set(),
      immunities: new Set(),
      isCritical: false,
    });
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });

    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual([
      "USE_ACTION_SURGE",
      "CONVERT_POINTS_TO_SLOT",
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "USE_INNATE_SORCERY",
      "USE_SECOND_WIND",
      "USE_TIRELESS",
      "EXIT_COMBAT",
    ]);

    actor.send({ type: "USE_TIRELESS", d8Roll: 4 });
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual([
      "USE_ACTION_SURGE",
      "CONVERT_POINTS_TO_SLOT",
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "USE_INNATE_SORCERY",
      "USE_SECOND_WIND",
      "EXIT_COMBAT",
    ]);

    actor.send({ type: "USE_SECOND_WIND", d10Roll: 3 });
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual([
      "USE_ACTION_SURGE",
      "USE_ARCANE_RECOVERY",
      "USE_METAMAGIC",
      "EXIT_COMBAT",
    ]);

    actor.send({ type: "USE_ARCANE_RECOVERY", slotLevel: spellSlotLevel(2) });
    expect(
      getAvailableActions(
        actor.getSnapshot().context,
        actor.getSnapshot().tags,
      ).map((token) => token.type),
    ).toEqual(["USE_ACTION_SURGE", "USE_METAMAGIC", "EXIT_COMBAT"]);
  });

  test("battle discovery exposes only the legal hit reactions in the current interrupt window", () => {
    const actor = initBattleForHitDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([]);

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("C")]),
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "CAST_SHIELD",
        cost: cost(quota("reaction"), pool("spellSlot")),
        outcome: {
          summary:
            "Use your reaction to cast Shield against the triggering attack",
        },
      },
      {
        scope: "battle",
        actorId: "C",
        type: "USE_CUTTING_WORDS",
        cost: cost(quota("reaction"), pool("bardicInspiration")),
        outcome: {
          summary:
            "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll",
        },
      },
    ]);
  });

  test("battle discovery exposes Redirect Attack only with valid allied swap targets", () => {
    const actor = initBattleForRedirectAttackDiscovery();

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "USE_REDIRECT_ATTACK",
        allyId: { options: ["C"] },
        cost: cost(quota("reaction")),
        outcome: {
          summary:
            "Use your reaction to swap places with a nearby Small or Medium ally and redirect the triggering attack",
        },
      },
    ]);
  });

  test("battle discovery and resolution expose standing from prone during the active turn", () => {
    const actor = initBattleForProneDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DASH",
          cost: cost(quota("action")),
          outcome: { summary: "Spend your action to gain extra movement" },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DISENGAGE",
          cost: cost(quota("action")),
          outcome: {
            summary:
              "Spend your action so your movement does not provoke opportunity attacks this turn",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DODGE",
          cost: cost(quota("action")),
          outcome: {
            summary:
              "Spend your action to impose disadvantage on attacks against you until your next turn starts",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_READY",
          cost: cost(quota("action")),
          outcome: {
            summary:
              "Spend your action to ready an attack for release with your reaction",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "STAND_FROM_PRONE",
          cost: cost(movement(15)),
          outcome: {
            summary: "Spend half your Speed in movement to stand up from Prone",
          },
        },
      ]),
    );

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "STAND_FROM_PRONE",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "A", type: "STAND_FROM_PRONE" },
      outcome: "Spend half your Speed in movement to stand up from Prone",
      runtime: "none",
      event: { type: "BATTLE_STAND_FROM_PRONE" },
    });

    expect(
      finalizeBattleResolution(
        request,
        { runtime: "none" },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: { type: "BATTLE_STAND_FROM_PRONE" },
      outcome: "Spend half your Speed in movement to stand up from Prone",
    });
  });

  test("battle discovery exposes BATTLE_ATTACK for armed and unarmed active creatures", () => {
    const actor = initBattleForAttackDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_ATTACK",
          targetId: { options: ["B"] },
          knockOut: { options: [false, true] },
          cost: cost(quota("action")),
          outcome: {
            summary:
              "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
          },
        },
      ]),
    );

    const noWeaponActor = initBattleForFeatureDiscovery();
    expect(
      getAvailableBattleActions(noWeaponActor.getSnapshot().context).some(
        (token) => token.type === "BATTLE_ATTACK",
      ),
    ).toBe(true);
  });

  test("battle resolution exposes the public BATTLE_ATTACK runtime contract", () => {
    const actor = initBattleForAttackDiscovery();
    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );

    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      },
      outcome:
        "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
      runtime: "battleAttack",
    });

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "battleAttack",
          values: {
            attackRoll: 15,
            targetAc: 10,
            weaponDamage: 6,
            attackerWithin5ft: true,
            hostileWithin5ft: false,
            targetCanSeeAttacker: true,
            attackerCanSeeTarget: true,
            frightSourceInLOS: false,
            hasAllyAdjacentToTarget: false,
            hitReactionCandidates: [],
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_ATTACK",
        targetId: CreatureId("B"),
        attackRoll: 15,
        diceCount: 1,
        dieSize: 8,
        dmg: 6,
        dt: "slashing",
        damageQualifiers: new Set(),
        crit: false,
        tAc: armorClass(10),
        knockOut: false,
        isMelee: true,
        weaponProperties: new Set(["versatile"]),
        isFinesse: false,
        attackerWithin5ft: true,
        hostileWithin5ft: false,
        targetCanSeeAttacker: true,
        attackerCanSeeTarget: true,
        frightSourceInLOS: false,
        hasAllyAdjacentToTarget: false,
        saDmg: 0,
        hitReactionCandidates: new Set(),
      },
      outcome:
        "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
    });
  });

  test("battle resolution preserves two-die weapon profiles from projected loadouts", () => {
    const actor = makeBattleActor({
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 15,
          mainHandWeapon: {
            name: "Greatsword",
            damageType: "slashing",
            isMelee: true,
            damageDie: 6,
            diceCount: 2,
            properties: new Set(["heavy", "twoHanded"]),
          },
          mainHandUsesTwoHands: true,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "battleAttack",
          values: {
            attackRoll: 15,
            targetAc: 10,
            weaponDamage: 7,
            attackerWithin5ft: true,
            hostileWithin5ft: false,
            targetCanSeeAttacker: true,
            attackerCanSeeTarget: true,
            frightSourceInLOS: false,
            hasAllyAdjacentToTarget: false,
            hitReactionCandidates: [],
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_ATTACK",
        targetId: CreatureId("B"),
        attackRoll: 15,
        diceCount: 2,
        dieSize: 6,
        dmg: 7,
        dt: "slashing",
        damageQualifiers: new Set(),
        crit: false,
        tAc: armorClass(10),
        knockOut: false,
        isMelee: true,
        weaponProperties: new Set(["heavy", "twoHanded"]),
        isFinesse: false,
        attackerWithin5ft: true,
        hostileWithin5ft: false,
        targetCanSeeAttacker: true,
        attackerCanSeeTarget: true,
        frightSourceInLOS: false,
        hasAllyAdjacentToTarget: false,
        saDmg: 0,
        hitReactionCandidates: new Set(),
      },
      outcome:
        "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
    });
  });

  test("battle resolution finalizes unarmed BATTLE_ATTACK with the SRD unarmed profile", () => {
    const actor = initBattleForFeatureDiscovery();
    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "battleAttack",
          values: {
            attackRoll: 15,
            targetAc: 10,
            weaponDamage: 3,
            attackerWithin5ft: true,
            hostileWithin5ft: false,
            targetCanSeeAttacker: true,
            attackerCanSeeTarget: true,
            frightSourceInLOS: false,
            hasAllyAdjacentToTarget: false,
            hitReactionCandidates: [],
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_ATTACK",
        targetId: CreatureId("B"),
        attackRoll: 15,
        diceCount: 1,
        dieSize: 0,
        dmg: 3,
        dt: "bludgeoning",
        damageQualifiers: new Set(),
        crit: false,
        tAc: armorClass(10),
        knockOut: false,
        isMelee: true,
        weaponProperties: new Set(),
        isFinesse: false,
        attackerWithin5ft: true,
        hostileWithin5ft: false,
        targetCanSeeAttacker: true,
        attackerCanSeeTarget: true,
        frightSourceInLOS: false,
        hasAllyAdjacentToTarget: false,
        saDmg: 0,
        hitReactionCandidates: new Set(),
      },
      outcome:
        "Make a weapon or unarmed strike attack against the chosen target using explicit roll, AC, visibility, adjacency, and reaction-candidate facts",
    });
  });

  test("battle resolution rejects unarmed BATTLE_ATTACK runtime outside 5 feet", () => {
    const actor = initBattleForFeatureDiscovery();
    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "battleAttack",
          values: {
            attackRoll: 15,
            targetAc: 10,
            weaponDamage: 3,
            attackerWithin5ft: false,
            attackerWithin60ft: true,
            hostileWithin5ft: false,
            targetCanSeeAttacker: true,
            attackerCanSeeTarget: true,
            frightSourceInLOS: false,
            hasAllyAdjacentToTarget: false,
            hitReactionCandidates: [],
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_RUNTIME_INPUT",
        message:
          "Unarmed strike runtime must confirm the target is within 5 feet.",
      },
    });
  });

  test("battle resolution rejects ranged public BATTLE_ATTACK runtime that omits attackerWithin60ft", () => {
    const actor = initBattleForAttackDiscovery();
    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ATTACK",
        targetId: "B",
        knockOut: false,
      }),
    );

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "battleAttack",
          values: {
            attackRoll: 15,
            targetAc: 10,
            weaponDamage: 6,
            attackerWithin5ft: false,
            hostileWithin5ft: false,
            targetCanSeeAttacker: true,
            attackerCanSeeTarget: true,
            frightSourceInLOS: false,
            hasAllyAdjacentToTarget: false,
            hitReactionCandidates: [],
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_RUNTIME_INPUT",
        message:
          "Battle attack runtime must include attackerWithin60ft when attackerWithin5ft is false.",
      },
    });
  });

  test("previewBattleAction summarizes standing from prone without runtime inputs", () => {
    const actor = initBattleForProneDiscovery();

    expect(
      previewBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "STAND_FROM_PRONE",
      }),
    ).toEqual({
      ok: true,
      summary: "Spend half your Speed in movement to stand up from Prone",
      cost: cost(movement(15)),
      runtime: "none",
      eventType: "BATTLE_STAND_FROM_PRONE",
    });
  });

  test("battle discovery exposes basic action tokens during the active turn", () => {
    const actor = initBattleForProneDiscovery();
    const tokens = getAvailableBattleActions(actor.getSnapshot().context);

    expect(tokens.map((token) => token.type)).toEqual(
      expect.arrayContaining([
        "BATTLE_DASH",
        "BATTLE_DISENGAGE",
        "BATTLE_DODGE",
        "BATTLE_READY",
        "STAND_FROM_PRONE",
      ]),
    );
  });

  test("battle discovery and resolution expose active-turn feature tokens", () => {
    const actor = initBattleForFeatureDiscovery();
    const context = actor.getSnapshot().context;

    expect(getAvailableBattleActions(context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_ACTION_SURGE",
          cost: cost(pool("actionSurge")),
          outcome: {
            summary:
              "Expend one Action Surge use to gain one additional non-Magic action this turn",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_ENTER_RAGE",
          cost: cost(quota("bonusAction"), pool("rage")),
          outcome: {
            summary:
              "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
          },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_DECLARE_RECKLESS",
          cost: cost(),
          outcome: { summary: "Declare Reckless Attack for this turn" },
        },
      ]),
    );

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ACTION_SURGE",
      }),
    ).toEqual({
      token: { scope: "battle", actorId: "A", type: "BATTLE_ACTION_SURGE" },
      outcome:
        "Expend one Action Surge use to gain one additional non-Magic action this turn",
      runtime: "none",
      event: { type: "BATTLE_ACTION_SURGE" },
    });
    expect(
      previewBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_ENTER_RAGE",
      }),
    ).toEqual({
      ok: true,
      summary:
        "Enter a Rage, consume your bonus action, and apply Rage's battle effects",
      cost: cost(quota("bonusAction"), pool("rage")),
      runtime: "none",
      eventType: "BATTLE_ENTER_RAGE",
    });
  });

  test("battle discovery hides feature tokens when their battle-owned state is spent", () => {
    const actor = initBattleForFeatureDiscovery();
    actor.send({ type: "BATTLE_ACTION_SURGE" });
    actor.send({ type: "BATTLE_ENTER_RAGE" });
    actor.send({ type: "BATTLE_DECLARE_RECKLESS" });

    expect(
      getAvailableBattleActions(actor.getSnapshot().context).map(
        (token) => token.type,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        "BATTLE_ACTION_SURGE",
        "BATTLE_ENTER_RAGE",
        "BATTLE_DECLARE_RECKLESS",
      ]),
    );
  });

  test("battle discovery hides BATTLE_ENTER_RAGE when Rage uses are spent", () => {
    const actor = initBattleForFeatureDiscovery();
    const context = actor.getSnapshot().context;
    const active = context.creatures.get(CreatureId("A"));
    if (active == null) throw new Error("expected active creature");
    const creatures = new Map(context.creatures).set(CreatureId("A"), {
      ...active,
      rageCharges: 0,
    });

    expect(
      getAvailableBattleActions({ ...context, creatures }).map(
        (token) => token.type,
      ),
    ).not.toContain("BATTLE_ENTER_RAGE");
  });

  test("battle discovery hides BATTLE_DECLARE_RECKLESS after the first attack", () => {
    const actor = initBattleForFeatureDiscovery();
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });

    expect(
      getAvailableBattleActions(actor.getSnapshot().context).map(
        (token) => token.type,
      ),
    ).not.toContain("BATTLE_DECLARE_RECKLESS");
  });

  test("battle discovery and resolution expose release grapple without action cost", () => {
    const actor = initBattleForReleaseGrappleDiscovery();
    const context = actor.getSnapshot().context;

    expect(getAvailableBattleActions(context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_RELEASE_GRAPPLE",
          cost: cost(),
          outcome: {
            summary:
              "Release the creature you are grappling; no action required",
          },
        },
      ]),
    );

    const request = expectBattleRequest(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_RELEASE_GRAPPLE",
      }),
    );
    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_RELEASE_GRAPPLE",
      },
      outcome: "Release the creature you are grappling; no action required",
      runtime: "none",
      event: { type: "BATTLE_RELEASE_GRAPPLE" },
    });

    expect(
      finalizeBattleResolution(request, { runtime: "none" }, context),
    ).toEqual({
      ok: true,
      event: { type: "BATTLE_RELEASE_GRAPPLE" },
      outcome: "Release the creature you are grappling; no action required",
    });
    expect(
      previewBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_RELEASE_GRAPPLE",
      }),
    ).toEqual({
      ok: true,
      summary: "Release the creature you are grappling; no action required",
      cost: cost(),
      runtime: "none",
      eventType: "BATTLE_RELEASE_GRAPPLE",
    });
  });

  test("battle discovery hides release grapple when the active creature is not grappling", () => {
    const actor = initBattleForReleaseGrappleDiscovery({
      withGrapple: false,
    });

    expect(
      getAvailableBattleActions(actor.getSnapshot().context).map(
        (token) => token.type,
      ),
    ).not.toContain("BATTLE_RELEASE_GRAPPLE");
  });

  test("battle resolution rejects release grapple when the active creature is not grappling", () => {
    const actor = initBattleForReleaseGrappleDiscovery({
      withGrapple: false,
    });

    expect(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_RELEASE_GRAPPLE",
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "BATTLE_RELEASE_GRAPPLE is not currently available for A in this battle state.",
    });
  });

  test("battle discovery and resolution expose escape grapple with explicit check result", () => {
    const actor = initBattleForReleaseGrappleDiscovery();
    actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    const context = actor.getSnapshot().context;

    expect(getAvailableBattleActions(context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "B",
          type: "BATTLE_ESCAPE_GRAPPLE",
          escapeSucceeded: { options: [true, false] },
          cost: cost(quota("action")),
          outcome: {
            summary:
              "Spend your action to attempt to escape the grapple with a resolved Athletics or Acrobatics check",
          },
        },
      ]),
    );

    const request = expectBattleRequest(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "B",
        type: "BATTLE_ESCAPE_GRAPPLE",
        escapeSucceeded: true,
      }),
    );
    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "B",
        type: "BATTLE_ESCAPE_GRAPPLE",
        escapeSucceeded: true,
      },
      outcome:
        "Spend your action to attempt to escape the grapple with a resolved Athletics or Acrobatics check",
      runtime: "none",
      event: { type: "BATTLE_ESCAPE_GRAPPLE", escapeSucceeded: true },
    });
  });

  test("battle discovery and resolution expose hide with explicit session facts", () => {
    const actor = initBattleForReleaseGrappleDiscovery({
      withGrapple: false,
    });
    const context = actor.getSnapshot().context;

    expect(getAvailableBattleActions(context)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "A",
          type: "BATTLE_HIDE",
          stealthTotal: {
            options: Array.from({ length: 30 }, (_, i) => i + 1),
          },
          hasCoverOrObscurement: { options: [true, false] },
          outOfEnemyLineOfSight: { options: [true, false] },
          cost: cost(quota("action")),
        }),
      ]),
    );

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_HIDE",
        stealthTotal: 35,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      }),
    ).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_HIDE",
        stealthTotal: 35,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      },
      outcome:
        "Spend your action to hide using explicit Stealth, cover or obscurement, and line-of-sight facts",
      runtime: "none",
      event: {
        type: "BATTLE_HIDE",
        stealthTotal: 35,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      },
    });

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_HIDE",
        stealthTotal: 18.5,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      }),
    ).toEqual({
      code: "INVALID_RUNTIME_INPUT",
      message: "Hide Stealth total must be an integer.",
    });
  });

  test("battle discovery exposes generic monster bonus Hide and Disengage options when the combatant owns them", () => {
    const actor = initBattleForMonsterBonusActionDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "A",
          type: "BATTLE_BONUS_DISENGAGE",
          cost: cost(quota("bonusAction")),
        }),
        expect.objectContaining({
          scope: "battle",
          actorId: "A",
          type: "BATTLE_BONUS_HIDE",
          cost: cost(quota("bonusAction")),
        }),
      ]),
    );
  });

  test("battle resolution exposes bonus-action Hide and Disengage without monster-specific commands", () => {
    const actor = initBattleForMonsterBonusActionDiscovery();
    const context = actor.getSnapshot().context;

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_BONUS_DISENGAGE",
      }),
    ).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_BONUS_DISENGAGE",
      },
      outcome:
        "Spend your bonus action so your movement does not provoke opportunity attacks this turn",
      runtime: "none",
      event: { type: "BATTLE_BONUS_DISENGAGE" },
    });

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_BONUS_HIDE",
        stealthTotal: 19,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      }),
    ).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_BONUS_HIDE",
        stealthTotal: 19,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      },
      outcome:
        "Spend your bonus action to hide using explicit Stealth, cover or obscurement, and line-of-sight facts",
      runtime: "none",
      event: {
        type: "BATTLE_BONUS_HIDE",
        stealthTotal: 19,
        hasCoverOrObscurement: true,
        outOfEnemyLineOfSight: true,
      },
    });
  });

  test("battle discovery and resolution expose search against hidden combatants", () => {
    const actor = initBattleForReleaseGrappleDiscovery({
      withGrapple: false,
      hiddenTarget: true,
    });
    const context = actor.getSnapshot().context;

    expect(getAvailableBattleActions(context)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "battle",
          actorId: "B",
          type: "BATTLE_SEARCH",
          targetId: { options: ["A"] },
          perceptionTotal: {
            options: Array.from({ length: 30 }, (_, i) => i + 1),
          },
          cost: cost(quota("action")),
        }),
      ]),
    );

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "B",
        type: "BATTLE_SEARCH",
        targetId: "A",
        perceptionTotal: -1,
      }),
    ).toEqual({
      token: {
        scope: "battle",
        actorId: "B",
        type: "BATTLE_SEARCH",
        targetId: "A",
        perceptionTotal: -1,
      },
      outcome:
        "Spend your action to Search for a hidden creature with an explicit Wisdom check total",
      runtime: "none",
      event: {
        type: "BATTLE_SEARCH",
        targetId: CreatureId("A"),
        perceptionTotal: -1,
      },
    });

    expect(
      resolveBattleAction(context, {
        scope: "battle",
        actorId: "B",
        type: "BATTLE_SEARCH",
        targetId: "A",
        perceptionTotal: 18.5,
      }),
    ).toEqual({
      code: "INVALID_RUNTIME_INPUT",
      message: "Search Wisdom check total must be an integer.",
    });
  });

  test("battle discovery resolves ready-spell setup from battle-owned payload facts", () => {
    const actor = initBattleForReadySpellDiscovery();

    expect(
      getAvailableBattleActions(actor.getSnapshot().context),
    ).toContainEqual({
      scope: "battle",
      actorId: "A",
      type: "BATTLE_READY_SPELL",
      spellName: "hold_person",
      slotLevel: { options: [spellSlotLevel(2), spellSlotLevel(3)] },
      targetId: { options: ["B"] },
      cost: cost(quota("action"), pool("spellSlot")),
      outcome: {
        summary:
          "Spend your action and a spell slot to Ready Hold Person and hold it with Concentration",
      },
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_SPELL",
        spellName: "hold_person",
        slotLevel: spellSlotLevel(2),
        targetId: "B",
      }),
    );

    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_SPELL",
        spellName: "hold_person",
        slotLevel: spellSlotLevel(2),
        targetId: "B",
      },
      outcome:
        "Spend your action and a spell slot to Ready Hold Person and hold it with Concentration",
      runtime: "none",
      event: {
        type: "BATTLE_READY_SPELL",
        targetId: CreatureId("B"),
        saveDC: difficultyClass(13),
        dmgOnFail: 0,
        halfOnSave: false,
        dt: "psychic",
        cond: "paralyzed",
        applyCond: true,
        saveAbility: "wis",
        slotLvl: spellSlotLevel(2),
        spellName: "hold_person",
      },
    });
  });

  test("battle discovery does not surface ready-spell setup without a modeled payload", () => {
    const actor = initBattleForReadySpellDiscovery({
      preparedSpells: new Set(["hellish_rebuke"]),
    });

    expect(
      getAvailableBattleActions(actor.getSnapshot().context).map(
        (token) => token.type,
      ),
    ).not.toContain("BATTLE_READY_SPELL");
  });

  test("battle discovery does not surface ready-spell setup while rage blocks spellcasting", () => {
    const actor = initBattleForReadySpellDiscovery({ barbarianLevel: 1 });
    actor.send({ type: "BATTLE_ENTER_RAGE" });

    expect(
      getAvailableBattleActions(actor.getSnapshot().context).map(
        (token) => token.type,
      ),
    ).not.toContain("BATTLE_READY_SPELL");
  });

  test("battle discovery and resolution expose ready-window pass and release tokens", () => {
    const actor = initBattleForReadyWindow();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual(
      expect.arrayContaining([
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_READY_PASS",
          cost: cost(),
          outcome: { summary: "Decline to release your readied action" },
        },
        {
          scope: "battle",
          actorId: "A",
          type: "BATTLE_READY_RELEASE",
          targetId: { options: ["B"] },
          cost: cost(quota("reaction")),
          outcome: {
            summary:
              "Spend your reaction to release the readied attack against the chosen target",
          },
        },
      ]),
    );

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_RELEASE",
        targetId: "B",
      }),
    );
    expect(request.runtime).toBe("readyAttack");

    expect(
      finalizeBattleResolution(
        request,
        {
          runtime: "readyAttack",
          values: {
            atkRoll: 15,
            dmg: 5,
            tgtAc: 10,
            crit: false,
            knockOut: false,
          },
        },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_READY_RELEASE",
        releaserId: CreatureId("A"),
        targetId: CreatureId("B"),
        atkRoll: 15,
        dmg: 5,
        dt: "slashing",
        damageQualifiers: new Set(),
        crit: false,
        tgtAc: armorClass(10),
        knockOut: false,
        isMelee: true,
        weaponProperties: new Set(),
        attackerWithin5ft: true,
        attackerWithin60ft: true,
        hostileWithin5ft: false,
        targetCanSeeAttacker: true,
        attackerCanSeeTarget: true,
        frightSourceInLOS: false,
        hasAllyAdjacentToTarget: false,
        saDmg: 0,
        hitReactionCandidates: new Set(),
      },
      outcome:
        "Spend your reaction to release the readied attack against the chosen target",
    });
  });

  test("battle discovery exposes ready-spell release only for a readied spell", () => {
    const actor = initBattleForReadySpellDiscovery();
    actor.send({
      type: "BATTLE_READY_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
    });
    actor.send({
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_PASS",
        cost: cost(),
        outcome: { summary: "Decline to release your readied action" },
      },
      {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_SPELL_RELEASE",
        cost: cost(quota("reaction")),
        outcome: {
          summary:
            "Spend your reaction to release the readied spell against its chosen target",
        },
      },
    ]);

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "A",
        type: "BATTLE_READY_SPELL_RELEASE",
      }),
    );
    expect(request.runtime).toBe("readySpellRelease");
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "readySpellRelease", values: { saveRoll: 1 } },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_READY_SPELL_RELEASE",
        releaserId: CreatureId("A"),
        saveRoll: 1,
      },
      outcome:
        "Spend your reaction to release the readied spell against its chosen target",
    });
  });

  test("battle discovery does not surface damage reactions until the damage window actually exists", () => {
    const actor = initBattleForDamageDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([]);

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });
    actor.send({
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "USE_UNCANNY_DODGE",
        cost: cost(quota("reaction")),
        outcome: {
          summary:
            "Use your reaction to halve the triggering attack's damage against you",
        },
      },
    ]);
  });

  test("battle resolution executes USE_UNCANNY_DODGE only when that reaction token is currently available", () => {
    const actor = initBattleForDamageDiscovery();

    expect(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "USE_UNCANNY_DODGE",
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "USE_UNCANNY_DODGE is not currently available for B in this battle state.",
    });

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });
    actor.send({
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "USE_UNCANNY_DODGE",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "B", type: "USE_UNCANNY_DODGE" },
      outcome:
        "Use your reaction to halve the triggering attack's damage against you",
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_DMG_REACTION",
        reactorId: "B",
        decision: { tag: "RUncannyDodge" },
      },
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "none" },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_DMG_REACTION",
        reactorId: "B",
        decision: { tag: "RUncannyDodge" },
      },
      outcome:
        "Use your reaction to halve the triggering attack's damage against you",
    });
  });

  test("after-damage discovery exposes Hellish Rebuke only from owned visible and within-60 trigger facts", () => {
    const actor = initBattleForAfterDamageDiscovery({
      caster: true,
      preparedSpells: new Set(["hellish_rebuke"]),
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "CAST_HELLISH_REBUKE",
        cost: cost(quota("reaction"), pool("spellSlot")),
        outcome: {
          summary:
            "Use your reaction to cast Hellish Rebuke against the creature that damaged you",
        },
      },
    ]);

    const hiddenActor = initBattleForAfterDamageDiscovery(
      { caster: true, preparedSpells: new Set(["hellish_rebuke"]) },
      { ...DEFAULT_BATTLE_ATTACK_CONTEXT, targetCanSeeAttacker: false },
    );
    expect(
      getAvailableBattleActions(hiddenActor.getSnapshot().context),
    ).toEqual([]);

    const rangedActor = initBattleForAfterDamageDiscovery(
      { caster: true, preparedSpells: new Set(["hellish_rebuke"]) },
      {
        ...DEFAULT_BATTLE_ATTACK_CONTEXT,
        isMelee: false,
        attackerWithin5ft: false,
        attackerWithin60ft: true,
      },
    );
    expect(
      getAvailableBattleActions(rangedActor.getSnapshot().context),
    ).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "CAST_HELLISH_REBUKE",
        cost: cost(quota("reaction"), pool("spellSlot")),
        outcome: {
          summary:
            "Use your reaction to cast Hellish Rebuke against the creature that damaged you",
        },
      },
    ]);

    const rangedContext = rangedActor.getSnapshot().context;
    const interrupt = rangedContext.awaitCtx!.interrupt;
    expect(interrupt.tag).toBe("PIAfterDamage");
    const tooFarContext =
      interrupt.tag === "PIAfterDamage"
        ? {
            ...rangedContext,
            awaitCtx: {
              ...rangedContext.awaitCtx!,
              interrupt: {
                ...interrupt,
                ctx: {
                  ...interrupt.ctx,
                  sourceWithin60ftOfDamagedCreature: false,
                },
              },
            },
          }
        : rangedContext;
    expect(getAvailableBattleActions(tooFarContext)).toEqual([]);
  });

  test("after-damage discovery exposes Retaliation only when the source is within 5 feet", () => {
    const actor = initBattleForAfterDamageDiscovery({ barbarianLevel: 10 });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "USE_RETALIATION",
        cost: cost(quota("reaction")),
        outcome: {
          summary:
            "Use your reaction to make a melee attack against the creature that damaged you",
        },
      },
    ]);

    const rangedActor = initBattleForAfterDamageDiscovery(
      { barbarianLevel: 10 },
      {
        ...DEFAULT_BATTLE_ATTACK_CONTEXT,
        isMelee: false,
        attackerWithin5ft: false,
      },
    );
    expect(
      getAvailableBattleActions(rangedActor.getSnapshot().context),
    ).toEqual([]);
  });

  test("after-damage discovery exposes Fire Shield from the active effect payload", () => {
    const actor = initBattleForAfterDamageDiscovery({
      activeEffects: [
        {
          spellId: spellId("fire_shield"),
          turnsRemaining: 100,
          expiresAt: "end",
          casterId: CreatureId("B"),
          reactivePayload: {
            trigger: "meleeHitWithin5ft",
            damageType: "cold",
          },
        },
      ],
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "TRIGGER_FIRE_SHIELD",
      }),
    );
    expect(request.runtime).toBe("fireShield");
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "fireShield", values: { damage: 16 } },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT",
        reactorId: CreatureId("B"),
        reactionDmg: 16,
        reactionDt: "cold",
      },
      outcome: "Apply Fire Shield's cold damage to the attacker",
    });
  });

  test("battle discovery and resolution surface USE_DEFLECT_ATTACKS through battle-owned dexMod plus runtime d10", () => {
    const actor = initBattleForDeflectDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([]);

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });
    actor.send({
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "USE_DEFLECT_ATTACKS",
        cost: cost(quota("reaction")),
        outcome: {
          summary:
            "Use your reaction to reduce the triggering attack's damage with Deflect Attacks",
        },
      },
    ]);

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "USE_DEFLECT_ATTACKS",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "B", type: "USE_DEFLECT_ATTACKS" },
      outcome:
        "Use your reaction to reduce the triggering attack's damage with Deflect Attacks",
      runtime: "deflectAttacks",
    });

    expect(
      finalizeBattleResolution(
        request,
        { runtime: "deflectAttacks", values: { d10Roll: 7 } },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_DMG_REACTION",
        reactorId: CreatureId("B"),
        decision: { tag: "RDeflectAttacks", amount: 14 },
      },
      outcome:
        "Use your reaction to reduce the triggering attack's damage with Deflect Attacks (14)",
    });
  });

  test("battle discovery surfaces CAST_COUNTERSPELL with legal slot choices during the spell-cast window", () => {
    const actor = initBattleForCounterspellDiscovery();

    expect(getAvailableBattleActions(actor.getSnapshot().context)).toEqual([
      {
        scope: "battle",
        actorId: "B",
        type: "CAST_COUNTERSPELL",
        slotLevel: { options: [spellSlotLevel(3)] },
        cost: cost(quota("reaction"), pool("spellSlot")),
        outcome: {
          summary:
            "Use your reaction to cast Counterspell against the triggering spell",
        },
      },
    ]);
  });

  test("battle resolution auto-finalizes CAST_COUNTERSPELL when the chosen slot auto-succeeds", () => {
    const actor = initBattleForCounterspellDiscovery();

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "CAST_COUNTERSPELL",
        slotLevel: spellSlotLevel(3),
      }),
    );
    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "B",
        type: "CAST_COUNTERSPELL",
        slotLevel: spellSlotLevel(3),
      },
      outcome:
        "Use your reaction to cast Counterspell against the triggering spell",
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_COUNTERSPELL",
        reactorId: "B",
        decision: { tag: "RCounterspell", saveSucceeded: false },
        csSlotLvl: spellSlotLevel(3),
      },
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "none" },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_COUNTERSPELL",
        reactorId: "B",
        decision: { tag: "RCounterspell", saveSucceeded: false },
        csSlotLvl: spellSlotLevel(3),
      },
      outcome:
        "Use your reaction to cast Counterspell against the triggering spell",
    });
  });

  test("battle resolution requires runtime-owned save results when CAST_COUNTERSPELL does not auto-succeed", () => {
    const actor = initBattleForCounterspellRuntimeDiscovery();

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "CAST_COUNTERSPELL",
        slotLevel: spellSlotLevel(3),
      }),
    );
    expect(request).toEqual({
      token: {
        scope: "battle",
        actorId: "B",
        type: "CAST_COUNTERSPELL",
        slotLevel: spellSlotLevel(3),
      },
      outcome:
        "Use your reaction to cast Counterspell against the triggering spell",
      runtime: "counterspell",
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "counterspell", values: { saveSucceeded: true } },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_COUNTERSPELL",
        reactorId: "B",
        decision: { tag: "RCounterspell", saveSucceeded: true },
        csSlotLvl: spellSlotLevel(3),
      },
      outcome:
        "Use your reaction to cast Counterspell against the triggering spell",
    });
  });

  test("battle resolution executes CAST_SHIELD only when that hit-reaction token is currently available", () => {
    const actor = initBattleForHitDiscovery();

    expect(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "CAST_SHIELD",
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "CAST_SHIELD is not currently available for B in this battle state.",
    });

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("C")]),
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "B",
        type: "CAST_SHIELD",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "B", type: "CAST_SHIELD" },
      outcome: "Use your reaction to cast Shield against the triggering attack",
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: "B",
        decision: { tag: "RShield" },
      },
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "none" },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: "B",
        decision: { tag: "RShield" },
      },
      outcome: "Use your reaction to cast Shield against the triggering attack",
    });
  });

  test("battle resolution executes USE_PARRY only when that hit-reaction token is currently available", () => {
    const actor = initBattleForParryDiscovery();

    expect(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "D",
        type: "USE_PARRY",
      }),
    ).toEqual({
      code: "ACTION_NOT_AVAILABLE",
      message:
        "USE_PARRY is not currently available for D in this battle state.",
    });

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("D"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "D",
        type: "USE_PARRY",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "D", type: "USE_PARRY" },
      outcome:
        "Use your reaction to add your Parry bonus against the triggering melee weapon attack",
      runtime: "none",
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: "D",
        decision: { tag: "RParry", bonus: 2 },
      },
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "none" },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: "D",
        decision: { tag: "RParry", bonus: 2 },
      },
      outcome:
        "Use your reaction to add your Parry bonus against the triggering melee weapon attack",
    });
  });

  test("battle resolution executes USE_CUTTING_WORDS with runtime-owned reduction", () => {
    const actor = initBattleForHitDiscovery();

    actor.send({ type: "BATTLE_START_TURN", ...ZERO_BATTLE_SOT });
    actor.send({
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_BATTLE_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("C")]),
    });

    const request = expectBattleRequest(
      resolveBattleAction(actor.getSnapshot().context, {
        scope: "battle",
        actorId: "C",
        type: "USE_CUTTING_WORDS",
      }),
    );
    expect(request).toEqual({
      token: { scope: "battle", actorId: "C", type: "USE_CUTTING_WORDS" },
      outcome:
        "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll",
      runtime: "cuttingWords",
    });
    expect(
      finalizeBattleResolution(
        request,
        { runtime: "cuttingWords", values: { reduction: 4 } },
        actor.getSnapshot().context,
      ),
    ).toEqual({
      ok: true,
      event: {
        type: "BATTLE_RESOLVE_HIT_REACTION",
        reactorId: "C",
        decision: { tag: "RCuttingWords", reduction: 4 },
      },
      outcome:
        "Use your reaction and expend Bardic Inspiration to reduce the triggering attack roll (4)",
    });
  });

  test("previewAction summarizes a creature action without spending resources", () => {
    const actor = damageActor(5);
    actor.send({ type: "ENTER_COMBAT" });
    actor.send({ type: "START_TURN" });
    const snapshot = actor.getSnapshot();

    expect(
      previewAction(snapshot.context, snapshot.tags, {
        scope: "creature",
        type: "USE_SECOND_WIND",
      }),
    ).toEqual({
      ok: true,
      summary: "Heal 1d10 + 5 HP",
      cost: cost(quota("bonusAction"), pool("secondWind")),
      runtime: "secondWind",
      eventType: undefined,
    });
  });
});
