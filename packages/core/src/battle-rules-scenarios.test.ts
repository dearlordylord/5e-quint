import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { preparedBattleSpellAccesses } from "#/battle-spell-access.ts";
import { battleMachine } from "#/battle-machine.ts";
import { battleMainHandDamageDie } from "#/battle-machine-creature.ts";
import {
  breakConcentrationAndPropagate,
  resolveSave,
} from "#/battle-machine-helpers.ts";
import { ADR_ACTIVE_TURN, type BattleEvent } from "#/battle-machine-types.ts";
import { fightingStyleBattleModifiers } from "#/features/class-fighter.ts";
import { makeSpellLibrary, SRD_SPELLS } from "#/features/spell-registry.ts";
import {
  ABOLETH,
  CENTAUR_TROOPER,
  GOBLIN_MINION,
  GOBLIN_WARRIOR,
  MAGE,
  PSEUDODRAGON,
  monsterCatalogInitCreatureConfig,
  monsterSpellDailyUseId,
  statBlockToInitCreatureConfig,
} from "#/monster-catalog.ts";
import type {
  BattleWeaponProfile,
  CreatureId as CreatureIdT,
} from "#/types.ts";
import {
  armorClass,
  CreatureId,
  difficultyClass,
  spellId,
  spellSlotLevel,
} from "#/types.ts";

const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

function battlePreparedSpellAccesses(
  ...spells: ReadonlyArray<string>
) {
  return preparedBattleSpellAccesses({
    spellDictionary: SPELL_LIBRARY,
    spellIds: spells.map(spellId),
    sharedSpellSaveDC: difficultyClass(13),
  });
}

const DEFAULT_ATTACK_CONTEXT = {
  knockOut: false,
  isMelee: true,
  isFinesse: false,
  attackerWithin5ft: true,
  hostileWithin5ft: false,
  targetCanSeeAttacker: true,
  attackerCanSeeTarget: true,
  frightSourceInLOS: false,
  hasAllyAdjacentToTarget: false,
  saDmg: 0,
  hitReactionCandidates: new Set<CreatureIdT>(),
} as const;

const ZERO_SOT: Pick<
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

const SHORTSWORD: BattleWeaponProfile = {
  name: "Shortsword",
  damageType: "piercing",
  isMelee: true,
  damageDie: 6,
  versatileDie: 0,
  properties: new Set(["finesse", "light"]),
};

const MACE: BattleWeaponProfile = {
  name: "Mace",
  damageType: "bludgeoning",
  isMelee: true,
  damageDie: 6,
  versatileDie: 0,
  properties: new Set(),
};

const SHORTBOW: BattleWeaponProfile = {
  name: "Shortbow",
  damageType: "piercing",
  isMelee: false,
  damageDie: 6,
  versatileDie: 0,
  properties: new Set(["ammunition", "twoHanded"]),
};

const LONGSWORD: BattleWeaponProfile = {
  name: "Longsword",
  damageType: "slashing",
  isMelee: true,
  damageDie: 8,
  versatileDie: 10,
  properties: new Set(["versatile"]),
};

const GREATSWORD: BattleWeaponProfile = {
  name: "Greatsword",
  damageType: "slashing",
  isMelee: true,
  damageDie: 6,
  versatileDie: 0,
  properties: new Set(["twoHanded"]),
};

const WHIP: BattleWeaponProfile = {
  name: "Whip",
  damageType: "slashing",
  isMelee: true,
  damageDie: 4,
  versatileDie: 0,
  properties: new Set(["finesse", "reach"]),
};

function send(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  ...events: Array<BattleEvent>
) {
  for (const event of events) actor.send(event);
}

function ctx(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  return actor.getSnapshot().context;
}

function creature(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  id: string,
) {
  return ctx(actor).creatures.get(CreatureId(id))!;
}

function initTwoPcBattle({
  attackerSize = "medium",
  targetSize = "medium",
}: {
  readonly attackerSize?:
    | "tiny"
    | "small"
    | "medium"
    | "large"
    | "huge"
    | "gargantuan";
  readonly targetSize?:
    | "tiny"
    | "small"
    | "medium"
    | "large"
    | "huge"
    | "gargantuan";
} = {}) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        creatureSize: attackerSize,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", creatureSize: targetSize },
    ],
  });
  return actor;
}

function initProneBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", prone: true },
      { id: CreatureId("B"), maxHp: 20, kind: "PC" },
    ],
  });
  return actor;
}

function initHitReactionBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("shield"),
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
      {
        id: CreatureId("D"),
        maxHp: 20,
        kind: "Monster",
        parryAcBonus: 2,
        initiativeRoll: 5,
      },
    ],
  });
  return actor;
}

function initStartedThreeCreatureBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT });
  return actor;
}

function initRedirectAttackBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
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
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("shield"),
        initiativeRoll: 15,
        battleSide: "goblins",
        battlePosition: { row: 1, col: 1 },
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "Monster",
        initiativeRoll: 10,
        battleSide: "goblins",
        battlePosition: { row: 1, col: 0 },
        battleReactionOptions: ["redirectAttack"],
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
  return actor;
}

function initDamageReactionBattle({
  rogueLevel = 0,
  monkLevel = 0,
}: {
  readonly rogueLevel?: number;
  readonly monkLevel?: number;
}) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        rogueLevel,
        monkLevel,
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initFireShieldBattle(retaliationDamageType: "fire" | "cold") {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 10,
        activeEffects: [
          {
            spellId: spellId("fire_shield"),
            turnsRemaining: 10,
            expiresAt: "end",
            casterId: CreatureId("B"),
            grantedResistances: new Set(
              retaliationDamageType === "fire" ? ["cold"] : ["fire"],
            ),
            reactivePayload: {
              trigger: "meleeHitWithin5ft",
              damageType: retaliationDamageType,
            },
          },
        ],
      },
    ],
  });
  return actor;
}

function initTwoCasterBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
    ],
  });
  return actor;
}

function initThreeCasterBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
    ],
  });
  return actor;
}

function initCounterspellBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("counterspell"),
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  return actor;
}

function initHandOccupancyBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person", "shield"),
        mainHandWeapon: GREATSWORD,
        mainHandUsesTwoHands: true,
        initiativeRoll: 20,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initShieldHandOccupancyBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        mainHandWeapon: MACE,
        hasShieldEquipped: true,
        initiativeRoll: 20,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initVersatileBattle(mainHandUsesTwoHands: boolean) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        mainHandWeapon: LONGSWORD,
        mainHandUsesTwoHands,
        initiativeRoll: 20,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        prone: true,
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initLegendaryBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
        id: CreatureId("C"),
        statBlock: ABOLETH,
        statBlockId: "aboleth",
        initiativeRoll: 10,
      }),
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  return actor;
}

function initLegendaryResistanceBattle(legendaryResistances: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("C"),
        maxHp: 30,
        kind: "Monster",
        legendaryResistances,
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initHealBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  return actor;
}

function initAoEBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("burning_hands"),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        hasEvasion: true,
        initiativeRoll: 10,
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        hasEvasion: true,
        initiativeRoll: 5,
      },
    ],
  });
  return actor;
}

function initFighterBattle(fighterLevel: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", fighterLevel },
      { id: CreatureId("B"), maxHp: 20, kind: "PC" },
    ],
  });
  return actor;
}

function initFighterCasterBattle(fighterLevel: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        fighterLevel,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
      },
    ],
  });
  return actor;
}

function initBarbarianBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        barbarianLevel,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
    ],
  });
  return actor;
}

function initBarbarianCasterBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        barbarianLevel,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initRecklessBattle(barbarianLevel: number) {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        barbarianLevel,
        initiativeRoll: 15,
      },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        sneakAttackDice: 3,
        initiativeRoll: 10,
      },
    ],
  });
  return actor;
}

function initSneakAttackBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        sneakAttackDice: 3,
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  return actor;
}

function initRangedSneakAttackBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      {
        id: CreatureId("A"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        sneakAttackDice: 3,
        initiativeRoll: 15,
      },
      { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  return actor;
}

function initGrappleBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        sneakAttackDice: 3,
        initiativeRoll: 10,
      },
      { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
    ],
  });
  return actor;
}

function initDodgeLossBattle() {
  const actor = createActor(battleMachine);
  actor.start();
  send(actor, {
    type: "BATTLE_INIT",
    creatures: [
      { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
      {
        id: CreatureId("B"),
        maxHp: 20,
        kind: "PC",
        caster: true,
        spellAccesses: battlePreparedSpellAccesses("hold_person"),
        initiativeRoll: 10,
      },
      {
        id: CreatureId("C"),
        maxHp: 20,
        kind: "PC",
        rogueLevel: 5,
        sneakAttackDice: 3,
        initiativeRoll: 5,
      },
    ],
  });
  return actor;
}

function startTurn(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
  overrides: Partial<typeof ZERO_SOT> = {},
) {
  send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT, ...overrides });
}

function endTurn(actor: ReturnType<typeof createActor<typeof battleMachine>>) {
  send(actor, {
    type: "BATTLE_END_TURN",
    eotSaveSucceeded: false,
    eotDmg: 0,
    eotDt: "bludgeoning",
    eotConSave: true,
  });
}

function advanceToNextTurn(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  endTurn(actor);
  startTurn(actor);
}

function resolveAttackWindows(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAttackHit") {
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });
  }
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAttackDamage") {
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });
  }
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAfterDamage") {
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_DECLINE",
      reactorId: null,
    });
  }
}

function resolveAoEWindows(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PIAfterDamage") {
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_DECLINE",
      reactorId: null,
    });
  }
}

function passSpellCastWindow(
  actor: ReturnType<typeof createActor<typeof battleMachine>>,
) {
  if (ctx(actor).awaitCtx?.interrupt.tag === "PISpellCast") {
    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: null,
      decision: { tag: "RPass" },
      csSlotLvl: spellSlotLevel(3),
    });
  }
}

describe("battle rules scenario regressions", () => {
  it("adds creatures before, at, and after turnIndex while preserving the active creature", () => {
    const beforeActor = initStartedThreeCreatureBattle();
    send(beforeActor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 0,
      creatures: [{ id: CreatureId("D"), maxHp: 18, kind: "PC" }],
    });
    expect(ctx(beforeActor).initiative).toEqual([
      CreatureId("D"),
      CreatureId("A"),
      CreatureId("B"),
      CreatureId("C"),
    ]);
    expect(ctx(beforeActor).turnIndex).toBe(1);
    expect(ctx(beforeActor).initiative[ctx(beforeActor).turnIndex]).toBe(
      CreatureId("A"),
    );
    expect(creature(beforeActor, "D").battlePosition).toEqual({
      row: 0,
      col: 0,
    });
    expect(creature(beforeActor, "A").battlePosition).toEqual({
      row: 2,
      col: 0,
    });

    const atActor = initStartedThreeCreatureBattle();
    send(atActor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 0,
      creatures: [
        { id: CreatureId("D"), maxHp: 18, kind: "PC", initiativeRoll: 12 },
        { id: CreatureId("E"), maxHp: 18, kind: "PC", initiativeRoll: 16 },
      ],
    });
    expect(ctx(atActor).initiative).toEqual([
      CreatureId("E"),
      CreatureId("D"),
      CreatureId("A"),
      CreatureId("B"),
      CreatureId("C"),
    ]);
    expect(ctx(atActor).turnIndex).toBe(2);
    expect(ctx(atActor).initiative[ctx(atActor).turnIndex]).toBe(
      CreatureId("A"),
    );

    const afterActor = initStartedThreeCreatureBattle();
    send(afterActor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 2,
      creatures: [{ id: CreatureId("D"), maxHp: 18, kind: "PC" }],
    });
    expect(ctx(afterActor).initiative).toEqual([
      CreatureId("A"),
      CreatureId("B"),
      CreatureId("D"),
      CreatureId("C"),
    ]);
    expect(ctx(afterActor).turnIndex).toBe(0);
    expect(ctx(afterActor).initiative[ctx(afterActor).turnIndex]).toBe(
      CreatureId("A"),
    );
    expect(creature(afterActor, "D").battlePosition).toEqual({
      row: 4,
      col: 0,
    });
    expect(creature(afterActor, "C").battlePosition).toEqual({
      row: 6,
      col: 0,
    });
  });

  it("projects goblins into battle participation both at init and mid-battle", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("fighter"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 18,
        },
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("goblin-warrior-1"),
          statBlock: GOBLIN_WARRIOR,
          statBlockId: "goblinWarrior",
          initiativeRoll: 12,
        }),
      ],
    });

    expect(ctx(actor).initiative).toEqual([
      CreatureId("fighter"),
      CreatureId("goblin-warrior-1"),
    ]);
    expect(creature(actor, "goblin-warrior-1")).toMatchObject({
      hp: 10,
      maxHp: 10,
      monsterStatBlockId: "goblinWarrior",
      battleBonusActionOptions: ["disengage", "hide"],
    });

    send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT });
    send(actor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("goblin-minion-1"),
          statBlock: GOBLIN_MINION,
          statBlockId: "goblinMinion",
          initiativeRoll: 9,
        }),
      ],
    });

    expect(ctx(actor).initiative).toEqual([
      CreatureId("fighter"),
      CreatureId("goblin-minion-1"),
      CreatureId("goblin-warrior-1"),
    ]);
    expect(creature(actor, "goblin-minion-1")).toMatchObject({
      hp: 7,
      maxHp: 7,
      monsterStatBlockId: "goblinMinion",
      battleBonusActionOptions: ["disengage", "hide"],
    });
    expect(ctx(actor).initiative[ctx(actor).turnIndex]).toBe(
      CreatureId("fighter"),
    );
  });

  it("rejects insertion before the first turn starts and on duplicate ids", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    const before = ctx(actor);
    send(actor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [{ id: CreatureId("C"), maxHp: 18, kind: "PC" }],
    });
    expect(ctx(actor)).toEqual(before);

    send(actor, { type: "BATTLE_START_TURN", ...ZERO_SOT });
    const started = ctx(actor);
    send(actor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [{ id: CreatureId("A"), maxHp: 18, kind: "PC" }],
    });
    expect(ctx(actor)).toEqual(started);
  });

  it("rejects insertion outside the active-turn phase", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(
      actor,
      {
        type: "BATTLE_INIT",
        creatures: [
          { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
          {
            id: CreatureId("B"),
            maxHp: 20,
            kind: "PC",
            caster: true,
            spellAccesses: battlePreparedSpellAccesses("shield"),
            initiativeRoll: 10,
          },
        ],
      },
      { type: "BATTLE_START_TURN", ...ZERO_SOT },
      {
        type: "BATTLE_ATTACK",
        targetId: CreatureId("B"),
        attackRoll: 15,
        diceCount: 1,
        dieSize: 8,
        dmg: 5,
        dt: "slashing",
        crit: false,
        tAc: armorClass(10),
        ...DEFAULT_ATTACK_CONTEXT,
        hitReactionCandidates: new Set([CreatureId("B")]),
      },
    );
    const awaitingReaction = ctx(actor);
    send(actor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [{ id: CreatureId("C"), maxHp: 18, kind: "PC" }],
    });
    expect(ctx(actor)).toEqual(awaitingReaction);
  });

  it("removes multiple creatures, cleans help links, and rejects duplicate ids", () => {
    const actor = initStartedThreeCreatureBattle();
    send(actor, {
      type: "BATTLE_HELP_ATTACK",
      allyId: CreatureId("B"),
      targetId: CreatureId("C"),
      helperWithin5ftOfTarget: true,
    });
    expect(ctx(actor).helpTargets).toEqual([
      {
        helperId: CreatureId("A"),
        allyId: CreatureId("B"),
        targetEnemyId: CreatureId("C"),
      },
    ]);

    send(actor, {
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: [CreatureId("B"), CreatureId("C")],
    });

    expect(ctx(actor).initiative).toEqual([CreatureId("A")]);
    expect(ctx(actor).turnIndex).toBe(0);
    expect(ctx(actor).helpTargets).toEqual([]);
    expect(ctx(actor).creatures.has(CreatureId("B"))).toBe(false);
    expect(ctx(actor).creatures.has(CreatureId("C"))).toBe(false);

    const afterRemoval = ctx(actor);
    send(actor, {
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: [CreatureId("A"), CreatureId("A")],
    });
    expect(ctx(actor)).toEqual(afterRemoval);
  });

  it("removing the last active creature advances the round and ends the turn", () => {
    const actor = initStartedThreeCreatureBattle();

    advanceToNextTurn(actor);
    advanceToNextTurn(actor);

    expect(ctx(actor).initiative[ctx(actor).turnIndex]).toBe(CreatureId("C"));
    expect(ctx(actor).round).toBe(1);
    expect(ctx(actor).turnStarted).toBe(true);

    send(actor, {
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: [CreatureId("A"), CreatureId("C")],
    });

    expect(ctx(actor).initiative).toEqual([CreatureId("B")]);
    expect(ctx(actor).turnIndex).toBe(0);
    expect(ctx(actor).round).toBe(2);
    expect(ctx(actor).turnStarted).toBe(false);
    expect(ctx(actor).initiative[ctx(actor).turnIndex]).toBe(CreatureId("B"));
  });

  it("removing a creature clears concentration and owned effects", () => {
    const actor = createActor(battleMachine);
    actor.start();
    const hunter = spellId("hunters_mark");
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          initiativeRoll: 20,
          spellAccesses: battlePreparedSpellAccesses("hold_person"),
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 15,
          activeEffects: [
            {
              spellId: hunter,
              turnsRemaining: 3,
              expiresAt: "end",
              casterId: CreatureId("A"),
              grantedConditions: ["invisible"],
            },
          ],
          invisible: true,
        },
        { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("B"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false,
    });

    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "B").paralyzed).toBe(true);
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spellId: hunter,
          casterId: CreatureId("A"),
        }),
        expect.objectContaining({
          spellId: spellId("hold_person"),
          casterId: CreatureId("A"),
        }),
      ]),
    );

    send(actor, {
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: [CreatureId("A")],
    });

    expect(ctx(actor).creatures.has(CreatureId("A"))).toBe(false);
    expect(creature(actor, "B").activeEffects).toEqual([]);
    expect(creature(actor, "B").paralyzed).toBe(false);
    expect(creature(actor, "B").invisible).toBe(false);
    expect(ctx(actor).turnStarted).toBe(false);
    expect(ctx(actor).initiative).toEqual([CreatureId("B"), CreatureId("C")]);
  });

  it("removing a grappler clears grapple links", () => {
    const actor = initStartedThreeCreatureBattle();
    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").grapplingTarget).toBe(CreatureId("B"));
    expect(creature(actor, "B").grappledBy).toBe(CreatureId("A"));

    send(actor, {
      type: "BATTLE_REMOVE_CREATURE",
      creatureIds: [CreatureId("A")],
    });

    expect(ctx(actor).creatures.has(CreatureId("A"))).toBe(false);
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "B").grappledBy).toBeNull();
    expect(ctx(actor).initiative).toEqual([CreatureId("B"), CreatureId("C")]);
  });

  it("natural_20: Shield negates the triggering hit and spends the reaction", () => {
    const actor = initHitReactionBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(15),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit");
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("B"))).toBe(true);

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RShield" },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
    expect(creature(actor, "B").slotsCurrent[0]).toBe(3);
    expect(creature(actor, "B").slotExpendedThisTurn).toBe(true);
  });

  it("phase_3: Cutting Words is offered only to an owned candidate and spends bardic inspiration", () => {
    const actor = initHitReactionBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(15),
      ...DEFAULT_ATTACK_CONTEXT,
      hitReactionCandidates: new Set([CreatureId("C")]),
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit");
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("C"))).toBe(true);
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("D"))).toBe(false);

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("C"),
      decision: { tag: "RCuttingWords", reduction: 4 },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "C").reactionAvailable).toBe(false);
    expect(creature(actor, "C").bardicInspirationCharges).toBe(2);
  });

  it("phase_3: Parry is legal only on melee weapon hits and uses the owned AC bonus", () => {
    const actor = initHitReactionBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("D"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(15),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit");
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("D"))).toBe(true);

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("D"),
      decision: { tag: "RParry", bonus: 2 },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "D").hp).toBe(20);
    expect(creature(actor, "D").reactionAvailable).toBe(false);
  });

  it("phase_3: impossible hit reactions are rejected by owned window legality", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(15),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    expect(creature(actor, "B").hp).toBe(13);
  });

  it("phase_3: Redirect Attack swaps positions, retargets the hit, and rebuilds the new target's hit window", () => {
    const actor = initRedirectAttackBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("C"),
      attackRoll: 11,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit");
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("C"))).toBe(true);

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("C"),
      decision: {
        tag: "RRedirectAttack",
        allyId: CreatureId("B"),
      },
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackHit");
    expect(ctx(actor).awaitCtx?.eligible.has(CreatureId("B"))).toBe(true);
    expect(creature(actor, "C").battlePosition).toEqual({ row: 1, col: 1 });
    expect(creature(actor, "B").battlePosition).toEqual({ row: 1, col: 0 });

    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RShield" },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
    expect(creature(actor, "C").reactionAvailable).toBe(false);
  });

  it("phase_1: the damage window is skipped when the target has no legal damage reaction", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    expect(creature(actor, "B").hp).toBe(13);
  });

  it("phase_1: Uncanny Dodge does not open when the attacker is unseen at the hit", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 8,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: false,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    expect(creature(actor, "B").hp).toBe(12);
    expect(creature(actor, "B").reactionAvailable).toBe(true);
  });

  it("phase_1: illegal damage reaction decisions are rejected against the owned window state", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage");
    const awaitCtx = ctx(actor).awaitCtx;
    const dmgCtx =
      awaitCtx?.interrupt.tag === "PIAttackDamage"
        ? awaitCtx.interrupt.ctx
        : null;
    expect(dmgCtx?.legalReactionsByCreature.get(CreatureId("B"))).toEqual(
      new Set(["RUncannyDodge"]),
    );

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RDeflectAttacks", amount: 5 },
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage");
    expect(creature(actor, "B").reactionAvailable).toBe(true);
    expect(creature(actor, "B").hp).toBe(20);
  });

  it("runbook_8: Fire Shield warm payload retaliates with fire damage from the active effect", () => {
    const actor = initFireShieldBattle("fire");
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT",
      reactorId: CreatureId("B"),
      reactionDmg: 9,
      reactionDt: "fire",
    });

    expect(creature(actor, "A").hp).toBe(11);
    expect(creature(actor, "B").hp).toBe(16);
  });

  it("runbook_8: Fire Shield chill payload retaliates with cold damage from the active effect", () => {
    const actor = initFireShieldBattle("cold");
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    send(actor, {
      type: "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT",
      reactorId: CreatureId("B"),
      reactionDmg: 9,
      reactionDt: "cold",
    });

    expect(creature(actor, "A").hp).toBe(11);
    expect(creature(actor, "B").hp).toBe(16);
  });

  it("phase_2: Uncanny Dodge halves the damage against a visible attack and spends the reaction", () => {
    const actor = initDamageReactionBattle({ rogueLevel: 5 });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage");

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RUncannyDodge" },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(creature(actor, "B").hp).toBe(16);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
  });

  it("phase_2: Deflect Attacks reduces weapon-attack damage and spends the reaction", () => {
    const actor = initDamageReactionBattle({ monkLevel: 3 });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAttackDamage");
    const deflectAwaitCtx = ctx(actor).awaitCtx;
    const deflectCtx =
      deflectAwaitCtx?.interrupt.tag === "PIAttackDamage"
        ? deflectAwaitCtx.interrupt.ctx
        : null;
    expect(deflectCtx?.legalReactionsByCreature.get(CreatureId("B"))).toEqual(
      new Set(["RDeflectAttacks"]),
    );

    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RDeflectAttacks", amount: 6 },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_DMG_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(creature(actor, "B").hp).toBe(17);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
  });

  it("phase_2: Deflect Attacks does not open on a non-weapon attack before Deflect Energy", () => {
    const actor = initDamageReactionBattle({ monkLevel: 3 });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "cold",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      onHitEffect: {
        spellId: spellId("ray_of_frost"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("A"),
        speedDeltaFeet: -10,
      },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_HIT_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    expect(creature(actor, "B").hp).toBe(13);
    expect(creature(actor, "B").reactionAvailable).toBe(true);
  });

  it("natural_20: Counterspell fizzles the spell, wastes the action, and preserves the original slot", () => {
    const actor = initCounterspellBattle();
    startTurn(actor);

    send(actor, {
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
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISpellCast");
    expect(ctx(actor).awaitCtx?.eligible).toEqual(new Set([CreatureId("B")]));

    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: CreatureId("B"),
      decision: { tag: "RCounterspell", saveSucceeded: false },
      csSlotLvl: spellSlotLevel(3),
    });
    passSpellCastWindow(actor);

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
    expect(creature(actor, "B").slotsCurrent[2]).toBe(1);
    expect(creature(actor, "C").paralyzed).toBe(false);
  });

  it("natural_20: a passed Counterspell Constitution save lets the original spell resolve", () => {
    const actor = initCounterspellBattle();
    startTurn(actor);

    send(actor, {
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
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    send(actor, {
      type: "BATTLE_RESOLVE_COUNTERSPELL",
      reactorId: CreatureId("B"),
      decision: { tag: "RCounterspell", saveSucceeded: true },
      csSlotLvl: spellSlotLevel(3),
    });
    passSpellCastWindow(actor);

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").slotsCurrent[1]).toBe(2);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
    expect(creature(actor, "B").slotsCurrent[2]).toBe(1);
    expect(creature(actor, "C").paralyzed).toBe(true);
  });

  it("natural_20: a save spell resolves immediately when no Counterspell reactor is eligible", () => {
    const actor = initTwoCasterBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").slotsCurrent[1]).toBe(2);
    expect(creature(actor, "B").paralyzed).toBe(true);
  });

  it("natural_20: ending a turn enters the legendary window and pass advances to the next turn", () => {
    const actor = initLegendaryBattle();
    startTurn(actor);

    endTurn(actor);

    expect(ctx(actor).laCtx?.eligibleMonsters).toEqual(
      new Set([CreatureId("C")]),
    );
    expect(ctx(actor).laCtx?.endingTurnIndex).toBe(0);

    send(actor, { type: "BATTLE_LEGENDARY_PASS" });

    expect(ctx(actor).laCtx).toBeNull();
    expect(ctx(actor).turnStarted).toBe(false);
    expect(ctx(actor).turnIndex).toBe(1);
  });

  it("natural_20: a legendary attack spends one legendary action and then returns to the legendary window", () => {
    const actor = initLegendaryBattle();
    startTurn(actor);

    endTurn(actor);
    send(actor, {
      type: "USE_LEGENDARY_ACTION",
      monsterId: CreatureId("C"),
      abilityId: "lash",
    });

    send(actor, {
      type: "BATTLE_LEGENDARY_ATTACK",
      monsterId: CreatureId("C"),
      abilityId: "lash",
      laTarget: CreatureId("A"),
      laAtkRoll: 15,
      laDmg: 12,
      laDt: "bludgeoning",
      laCrit: false,
      laTgtAc: armorClass(10),
      knockOut: false,
      isMelee: true,
      isFinesse: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(8);
    expect(creature(actor, "C").legendaryActionsRemaining).toBe(2);
    expect(ctx(actor).laCtx?.eligibleMonsters).toEqual(
      new Set([CreatureId("C")]),
    );

    send(actor, { type: "BATTLE_LEGENDARY_PASS" });

    expect(ctx(actor).laCtx).toBeNull();
    expect(ctx(actor).turnIndex).toBe(1);
  });

  it("battle control accepts non-attack legendary, recharge, and daily ability selection without spending resources", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: ABOLETH,
          statBlockId: "aboleth",
          initiativeRoll: 20,
        }),
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("C"),
          statBlock: CENTAUR_TROOPER,
          statBlockId: "centaurTrooper",
          initiativeRoll: 10,
        }),
      ],
    });

    startTurn(actor, { rechargeD6: 5 });
    send(actor, {
      type: "USE_DAILY_ABILITY",
      monsterId: CreatureId("A"),
      abilityId: "dominateMind",
    });
    expect(ctx(actor).selectedMonsterCommand).toEqual({
      type: "USE_DAILY_ABILITY",
      monsterId: CreatureId("A"),
      abilityId: "dominateMind",
    });
    expect(creature(actor, "A").dailyUsesRemaining).toEqual({
      dominateMind: 2,
    });

    endTurn(actor);
    startTurn(actor);
    endTurn(actor);
    send(actor, {
      type: "USE_LEGENDARY_ACTION",
      monsterId: CreatureId("A"),
      abilityId: "psychicDrain",
    });
    expect(ctx(actor).selectedMonsterCommand).toEqual({
      type: "USE_LEGENDARY_ACTION",
      monsterId: CreatureId("A"),
      abilityId: "psychicDrain",
    });
    expect(creature(actor, "A").legendaryActionsRemaining).toBe(3);

    send(actor, { type: "BATTLE_LEGENDARY_PASS" });
    startTurn(actor, { rechargeD6: 5 });
    send(actor, {
      type: "USE_RECHARGE_ABILITY",
      monsterId: CreatureId("C"),
      abilityId: "tramplingCharge",
    });
    expect(ctx(actor).selectedMonsterCommand).toEqual({
      type: "USE_RECHARGE_ABILITY",
      monsterId: CreatureId("C"),
      abilityId: "tramplingCharge",
    });
    expect(creature(actor, "C").rechargeAvailable).toEqual({
      tramplingCharge: true,
    });
  });

  it("natural_20: Legendary Resistance turns a failed save into a success and spends one use", () => {
    const actor = initLegendaryResistanceBattle(3);
    startTurn(actor);

    send(actor, {
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
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISaveFailed");
    expect(ctx(actor).awaitCtx?.eligible).toEqual(new Set([CreatureId("C")]));

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: CreatureId("C"),
      decision: { tag: "RLegendaryResistance" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "A").slotsCurrent[1]).toBe(2);
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(2);
    expect(creature(actor, "C").paralyzed).toBe(false);
  });

  it("recharges authored monster abilities from stat-block metadata at start of turn", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("C"),
          statBlock: CENTAUR_TROOPER,
          initiativeRoll: 20,
        }),
      ],
    });

    expect(creature(actor, "C").rechargeAvailable).toEqual({
      tramplingCharge: false,
    });

    startTurn(actor, { rechargeD6: 4 });
    expect(creature(actor, "C").rechargeAvailable).toEqual({
      tramplingCharge: false,
    });

    endTurn(actor);
    startTurn(actor);
    endTurn(actor);

    startTurn(actor, { rechargeD6: 5 });
    expect(creature(actor, "C").rechargeAvailable).toEqual({
      tramplingCharge: true,
    });
  });

  it("natural_20: passing the failed-save reaction applies the spell effect and preserves Legendary Resistance", () => {
    const actor = initLegendaryResistanceBattle(3);
    startTurn(actor);

    send(actor, {
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
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: null,
      decision: { tag: "RPass" },
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(3);
    expect(creature(actor, "C").paralyzed).toBe(true);
  });

  it("natural_20: Trampling Charge uses the generic traversal movement surface and targets each entered creature once", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("C"),
            statBlockId: "centaurTrooper",
            initiativeRoll: 20,
          }),
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
          creatureSize: "medium",
          battlePosition: { row: 1, col: 0 },
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 9,
          creatureSize: "medium",
          battlePosition: { row: 2, col: 0 },
        },
      ],
    });

    startTurn(actor, { rechargeD6: 5 });
    send(actor, {
      type: "USE_RECHARGE_ABILITY",
      monsterId: CreatureId("C"),
      abilityId: "tramplingCharge",
    });
    send(actor, {
      type: "BATTLE_MONSTER_TRAVERSAL",
      abilityId: "tramplingCharge",
      destination: { row: 3, col: 0 },
      movementSpent: 15,
      enteredCreatures: [
        { targetId: CreatureId("A"), saveRoll: 4 },
        { targetId: CreatureId("B"), saveRoll: 18 },
      ],
    });

    expect(creature(actor, "C").bonusActionUsed).toBe(true);
    expect(creature(actor, "C").movementRemaining).toBe(35);
    expect(creature(actor, "C").battlePosition).toEqual({ row: 3, col: 0 });
    expect(creature(actor, "C").rechargeAvailable).toEqual({
      tramplingCharge: false,
    });
    expect(ctx(actor).selectedMonsterCommand).toBeNull();
    expect(creature(actor, "A").hp).toBe(13);
    expect(creature(actor, "A").prone).toBe(true);
    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "B").prone).toBe(false);
  });

  it("natural_20: traversal save-failed reactions resume the remaining entered-creature queue", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("C"),
            statBlockId: "centaurTrooper",
            initiativeRoll: 20,
          }),
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "Monster",
          legendaryResistances: 1,
          creatureSize: "medium",
          initiativeRoll: 10,
          battlePosition: { row: 1, col: 0 },
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          creatureSize: "medium",
          initiativeRoll: 9,
          battlePosition: { row: 2, col: 0 },
        },
      ],
    });

    startTurn(actor, { rechargeD6: 5 });
    send(actor, {
      type: "USE_RECHARGE_ABILITY",
      monsterId: CreatureId("C"),
      abilityId: "tramplingCharge",
    });
    send(actor, {
      type: "BATTLE_MONSTER_TRAVERSAL",
      abilityId: "tramplingCharge",
      destination: { row: 3, col: 0 },
      movementSpent: 15,
      enteredCreatures: [
        { targetId: CreatureId("A"), saveRoll: 1 },
        { targetId: CreatureId("B"), saveRoll: 1 },
      ],
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISaveFailedTraversal");
    expect(ctx(actor).traversalCtx).toBeNull();
    expect(creature(actor, "A").legendaryResistancesRemaining).toBe(1);
    expect(creature(actor, "A").hp).toBe(20);
    expect(creature(actor, "A").prone).toBe(false);

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: CreatureId("A"),
      decision: { tag: "RLegendaryResistance" },
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PIAfterDamage");
    send(actor, { type: "BATTLE_AFTER_DAMAGE_DECLINE", reactorId: null });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(ctx(actor).traversalCtx).toBeNull();
    expect(creature(actor, "A").legendaryResistancesRemaining).toBe(0);
    expect(creature(actor, "A").hp).toBe(20);
    expect(creature(actor, "A").prone).toBe(false);
    expect(creature(actor, "B").hp).toBe(13);
    expect(creature(actor, "B").prone).toBe(true);
  });

  it("natural_20: no Legendary Resistance uses means a failed save resolves immediately", () => {
    const actor = initLegendaryResistanceBattle(0);
    startTurn(actor);

    send(actor, {
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
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(ctx(actor).awaitCtx).toBeNull();
    expect(creature(actor, "C").legendaryResistancesRemaining).toBe(0);
    expect(creature(actor, "C").paralyzed).toBe(true);
  });

  it("Legendary Resistance also resolves the narrow AoE failed-save window", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          spellAccesses: battlePreparedSpellAccesses("thunderwave"),
          initiativeRoll: 20,
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "Monster",
          initiativeRoll: 10,
          legendaryResistances: 3,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(13),
      dmgOnFail: 9,
      halfOnSave: true,
      dt: "thunder",
      cond: "blinded",
      applyCond: false,
      saveAbility: "con",
      slotLvl: spellSlotLevel(2),
      spellName: "thunderwave",
      ritual: false,
    });
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("B"),
      saveRoll: 1,
    });

    expect(ctx(actor).awaitCtx?.interrupt.tag).toBe("PISaveFailedAoE");

    send(actor, {
      type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
      reactorId: CreatureId("B"),
      decision: { tag: "RLegendaryResistance" },
    });
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: null,
      saveRoll: 0,
    });

    expect(creature(actor, "B").legendaryResistancesRemaining).toBe(2);
    expect(creature(actor, "B").hp).toBe(16);
    expect(ctx(actor).aoeCtx).toBeNull();
  });

  it("opencombatengine: an opportunity attack spends the reaction and prevents a second OA before next turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).not.toBeNull();
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(
      true,
    );

    send(actor, {
      type: "BATTLE_MOVEMENT_OA_ATTACK",
      reactorId: CreatureId("B"),
      oaAtkRoll: 5,
      oaDmg: 4,
      oaDt: "slashing",
      oaCrit: false,
      oaTgtAc: armorClass(20),
      knockOut: false,
      isMelee: true,
      isFinesse: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    send(actor, {
      type: "BATTLE_MOVEMENT_OA_DECLINE",
      reactorId: null,
    });

    expect(ctx(actor).movementCtx).toBeNull();
    expect(creature(actor, "B").reactionAvailable).toBe(false);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();
    expect(creature(actor, "A").movementRemaining).toBe(20);
    expect(creature(actor, "B").reactionAvailable).toBe(false);
  });

  it("natural_20: a spent reaction refreshes at the start of the creature's next turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(
      true,
    );

    send(actor, {
      type: "BATTLE_MOVEMENT_OA_ATTACK",
      reactorId: CreatureId("B"),
      oaAtkRoll: 5,
      oaDmg: 4,
      oaDt: "slashing",
      oaCrit: false,
      oaTgtAc: armorClass(20),
      knockOut: false,
      isMelee: true,
      isFinesse: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    send(actor, {
      type: "BATTLE_MOVEMENT_OA_DECLINE",
      reactorId: null,
    });

    expect(creature(actor, "B").reactionAvailable).toBe(false);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").reactionAvailable).toBe(true);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).not.toBeNull();
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(
      true,
    );
  });

  it("natural_20: movement that does not provoke opportunity attacks skips the OA window even if the caller provides threatened creatures", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "doesNotProvokeOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();
    expect(creature(actor, "A").movementRemaining).toBe(25);
    expect(creature(actor, "B").reactionAvailable).toBe(true);
  });

  it("natural_20: reach-based opportunity attacks are not treated as within 5 feet for prone-sensitive sneak attack logic", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          prone: true,
          initiativeRoll: 20,
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          rogueLevel: 5,
          mainHandWeapon: WHIP,
          initiativeRoll: 10,
        },
        { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });
    send(actor, {
      type: "BATTLE_MOVEMENT_OA_ATTACK",
      reactorId: CreatureId("B"),
      oaAtkRoll: 15,
      oaDmg: 3,
      oaDt: "slashing",
      oaCrit: false,
      oaTgtAc: armorClass(10),
      knockOut: false,
      isMelee: true,
      isFinesse: true,
      attackerWithin5ft: false,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    send(actor, {
      type: "BATTLE_MOVEMENT_OA_DECLINE",
      reactorId: null,
    });

    expect(creature(actor, "A").hp).toBe(17);
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: Action Surge grants one additional non-Magic action on the same turn", () => {
    const actor = initFighterBattle(2);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 5,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "slashing",
      crit: false,
      tAc: armorClass(20),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").attackActionUsed).toBe(true);

    send(actor, { type: "BATTLE_ACTION_SURGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "A").actionSurgeCharges).toBe(0);
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true);
    expect(creature(actor, "A").actionSurgeActionPending).toBe(true);

    send(actor, { type: "BATTLE_DASH" });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").movementRemaining).toBe(60);
    expect(creature(actor, "A").actionSurgeActionPending).toBe(false);
  });

  it("natural_20: Action Surge can be used only once on a turn even if two charges remain", () => {
    const actor = initFighterBattle(17);
    startTurn(actor);

    expect(creature(actor, "A").actionSurgeCharges).toBe(2);

    send(actor, { type: "BATTLE_ACTION_SURGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(2);
    expect(creature(actor, "A").actionSurgeCharges).toBe(1);
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true);

    send(actor, { type: "BATTLE_ACTION_SURGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(2);
    expect(creature(actor, "A").actionSurgeCharges).toBe(1);
    expect(creature(actor, "A").actionSurgeUsedThisTurn).toBe(true);
  });

  it("natural_20: Action Surge does not allow the extra action to be the Magic action", () => {
    const actor = initFighterCasterBattle(2);
    startTurn(actor);

    send(actor, { type: "BATTLE_ACTION_SURGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(2);
    expect(creature(actor, "A").slotExpendedThisTurn).toBe(false);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(2);
    expect(creature(actor, "A").actionSurgeActionPending).toBe(true);
    expect(creature(actor, "A").slotExpendedThisTurn).toBe(false);
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4);
    expect(creature(actor, "B").paralyzed).toBe(false);
  });

  it("natural_20: Rage grants physical damage resistance until the barbarian's next turn ends", () => {
    const actor = initBarbarianBattle(1);
    startTurn(actor);

    send(actor, { type: "BATTLE_ENTER_RAGE" });

    expect(creature(actor, "A").bonusActionUsed).toBe(true);
    expect(creature(actor, "A").meleeDamageBonus).toBe(2);
    expect(creature(actor, "A").combatantResistances).toEqual(
      new Set(["bludgeoning", "piercing", "slashing"]),
    );

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 7,
      dt: "bludgeoning",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(17);
  });

  it("natural_20: Rage blocks spellcasting while active", () => {
    const actor = initBarbarianCasterBattle(1);
    startTurn(actor);

    send(actor, { type: "BATTLE_ENTER_RAGE" });

    expect(creature(actor, "A").ragingBlocksSpells).toBe(true);
    expect(creature(actor, "A").actionsRemaining).toBe(1);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
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

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4);
    expect(creature(actor, "B").paralyzed).toBe(false);
  });

  it("natural_20: Reckless Attack makes attack rolls against the barbarian have advantage until the start of the next turn", () => {
    const actor = initRecklessBattle(2);
    startTurn(actor);

    send(actor, { type: "BATTLE_DECLARE_RECKLESS" });

    expect(creature(actor, "A").recklessThisTurn).toBe(true);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(10);
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(true);
  });

  it("natural_20: non-barbarians cannot declare Reckless Attack", () => {
    const actor = initRecklessBattle(0);
    startTurn(actor);

    send(actor, { type: "BATTLE_DECLARE_RECKLESS" });

    expect(creature(actor, "A").recklessThisTurn).toBe(false);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(16);
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: Disengage prevents opportunity attacks for the rest of the turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_DISENGAGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").disengaged).toBe(true);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();
    expect(creature(actor, "A").movementRemaining).toBe(25);
    expect(creature(actor, "B").reactionAvailable).toBe(true);
  });

  it("natural_20: Disengage ends when the creature's next turn starts", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_DISENGAGE" });
    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").reactionAvailable).toBe(true);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "A").disengaged).toBe(false);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).not.toBeNull();
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(
      true,
    );
  });

  it("monster bonus Disengage spends the bonus action and keeps the action available", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, { type: "BATTLE_BONUS_DISENGAGE" });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "A").bonusActionUsed).toBe(true);
    expect(creature(actor, "A").disengaged).toBe(true);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();
    expect(creature(actor, "B").reactionAvailable).toBe(true);
  });

  it("natural_20: Dodge suppresses ally-adjacent Sneak Attack until the start of the dodger's next turn", () => {
    const actor = initSneakAttackBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_DODGE" });

    expect(creature(actor, "B").dodging).toBe(true);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(16);
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").dodging).toBe(false);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(6);
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(true);
  });

  it("natural_20: Dodge benefits end immediately when the dodger becomes incapacitated", () => {
    const actor = initDodgeLossBattle();
    startTurn(actor);
    send(actor, { type: "BATTLE_DODGE" });

    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("A"),
      saveDC: difficultyClass(14),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").dodging).toBe(true);
    expect(creature(actor, "A").paralyzed).toBe(true);

    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(10);
    expect(creature(actor, "C").sneakAttackUsedThisTurn).toBe(true);
  });

  it("natural_20: Dodge benefits end immediately when the dodger's Speed becomes 0", () => {
    const actor = initDodgeLossBattle();
    startTurn(actor);
    send(actor, { type: "BATTLE_DODGE" });

    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("A"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").dodging).toBe(true);
    expect(creature(actor, "A").effectiveSpeed).toBe(0);

    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(10);
    expect(creature(actor, "C").sneakAttackUsedThisTurn).toBe(true);
  });

  it("natural_20: a hostile creature within 5 feet suppresses ranged Sneak Attack by imposing disadvantage", () => {
    const actor = initRangedSneakAttackBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 14,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "piercing",
      crit: false,
      tAc: armorClass(12),
      knockOut: false,
      isMelee: false,
      isFinesse: false,
      attackerWithin5ft: false,
      hostileWithin5ft: true,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: true,
      saDmg: 10,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: attacking a target you cannot see suppresses ally-adjacent Sneak Attack by imposing disadvantage", () => {
    const actor = initRangedSneakAttackBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 14,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "piercing",
      crit: false,
      tAc: armorClass(12),
      knockOut: false,
      isMelee: false,
      isFinesse: false,
      attackerWithin5ft: false,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: true,
      saDmg: 10,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: simultaneous advantage and disadvantage still suppress Sneak Attack", () => {
    const actor = initRangedSneakAttackBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 14,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "piercing",
      crit: false,
      tAc: armorClass(12),
      knockOut: false,
      isMelee: false,
      isFinesse: false,
      attackerWithin5ft: false,
      hostileWithin5ft: true,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: true,
      saDmg: 10,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: Sneak Attack resets at the next turn boundary", () => {
    const actor = initRangedSneakAttackBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 14,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "piercing",
      crit: false,
      tAc: armorClass(12),
      knockOut: false,
      isMelee: false,
      isFinesse: false,
      attackerWithin5ft: false,
      hostileWithin5ft: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 10,
      hitReactionCandidates: new Set<CreatureIdT>(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(true);

    endTurn(actor);
    startTurn(actor);
    endTurn(actor);
    startTurn(actor);
    endTurn(actor);
    startTurn(actor);

    expect(creature(actor, "A").sneakAttackUsedThisTurn).toBe(false);
  });

  it("natural_20: standing from prone in battle costs half speed", () => {
    const actor = initProneBattle();
    startTurn(actor);

    expect(creature(actor, "A").prone).toBe(true);
    expect(creature(actor, "A").movementRemaining).toBe(30);

    send(actor, { type: "BATTLE_STAND_FROM_PRONE" });

    expect(creature(actor, "A").prone).toBe(false);
    expect(creature(actor, "A").movementRemaining).toBe(15);
  });

  it("natural_20: incapacitating the grappler auto-releases the target", () => {
    const actor = initGrappleBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").grapplingTarget).toBe(CreatureId("B"));
    expect(creature(actor, "B").grappled).toBe(true);
    expect(creature(actor, "B").grappledBy).toBe(CreatureId("A"));

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("A"),
      saveDC: difficultyClass(14),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").paralyzed).toBe(true);
    expect(creature(actor, "A").grapplingTarget).toBeNull();
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "B").grappledBy).toBeNull();
  });

  it("natural_20: a grappled attacker loses ally-adjacent Sneak Attack against non-grapplers but not against the grappler", () => {
    const actor = initGrappleBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("C"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "C").hp).toBe(16);
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(false);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
      isFinesse: true,
      hasAllyAdjacentToTarget: true,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").hp).toBe(10);
    expect(creature(actor, "B").sneakAttackUsedThisTurn).toBe(true);
  });

  it("natural_20: grapple fails when the target is more than one size larger", () => {
    const actor = initTwoPcBattle({
      attackerSize: "medium",
      targetSize: "huge",
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").grapplingTarget).toBeNull();
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "A").actionsRemaining).toBe(0);
  });

  it("natural_20: dragging a grappled target keeps speed but doubles the movement cost unless the target is two sizes smaller", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").effectiveSpeed).toBe(30);
    expect(creature(actor, "A").movementRemaining).toBe(30);

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set(),
    });

    expect(creature(actor, "A").movementRemaining).toBe(20);

    const exemptActor = initTwoPcBattle({
      attackerSize: "huge",
      targetSize: "medium",
    });
    startTurn(exemptActor);

    send(exemptActor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(exemptActor, "A").effectiveSpeed).toBe(30);
    expect(creature(exemptActor, "A").movementRemaining).toBe(30);
  });

  it("natural_20: a grappler can release the target at any time without spending an action", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").effectiveSpeed).toBe(30);
    expect(creature(actor, "A").movementRemaining).toBe(30);

    send(actor, { type: "BATTLE_RELEASE_GRAPPLE" });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "A").grapplingTarget).toBeNull();
    expect(creature(actor, "A").effectiveSpeed).toBe(30);
    expect(creature(actor, "A").movementRemaining).toBe(30);
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "B").grappledBy).toBeNull();
  });

  it("natural_20: releasing a grapple mid-turn does not refund spent movement to the grappler", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });
    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set(),
    });

    expect(creature(actor, "A").movementRemaining).toBe(20);

    send(actor, { type: "BATTLE_RELEASE_GRAPPLE" });

    expect(creature(actor, "A").effectiveSpeed).toBe(30);
    expect(creature(actor, "A").movementRemaining).toBe(20);
    expect(creature(actor, "B").grappled).toBe(false);
  });

  it("natural_20: a successful escape spends the action and ends the grapple", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").grappled).toBe(true);
    expect(creature(actor, "B").effectiveSpeed).toBe(0);
    expect(creature(actor, "B").movementRemaining).toBe(0);

    send(actor, {
      type: "BATTLE_ESCAPE_GRAPPLE",
      escapeSucceeded: true,
    });

    expect(creature(actor, "B").actionsRemaining).toBe(0);
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "B").grappledBy).toBeNull();
    expect(creature(actor, "B").effectiveSpeed).toBe(30);
    expect(creature(actor, "B").movementRemaining).toBe(30);
    expect(creature(actor, "A").grapplingTarget).toBeNull();
  });

  it("natural_20: a failed escape spends the action but leaves the grapple intact", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ESCAPE_GRAPPLE",
      escapeSucceeded: false,
    });

    expect(creature(actor, "B").actionsRemaining).toBe(0);
    expect(creature(actor, "B").grappled).toBe(true);
    expect(creature(actor, "B").grappledBy).toBe(CreatureId("A"));
    expect(creature(actor, "B").effectiveSpeed).toBe(0);
    expect(creature(actor, "B").movementRemaining).toBe(0);
    expect(creature(actor, "A").grapplingTarget).toBe(CreatureId("B"));
  });

  it("natural_20: a grapple occupies a hand and releasing it frees that hand", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    expect(creature(actor, "A").leftHandUse).toBe("free");
    expect(creature(actor, "A").rightHandUse).toBe("free");

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect([
      creature(actor, "A").leftHandUse,
      creature(actor, "A").rightHandUse,
    ]).toContain("grapple");

    send(actor, { type: "BATTLE_RELEASE_GRAPPLE" });

    expect([
      creature(actor, "A").leftHandUse,
      creature(actor, "A").rightHandUse,
    ]).not.toContain("grapple");
  });

  it("natural_20: a weapon-and-shield loadout leaves no free hand for grappling", () => {
    const actor = initShieldHandOccupancyBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_GRAPPLE",
      targetId: CreatureId("B"),
      targetSaveFailed: true,
    });

    expect(creature(actor, "A").grapplingTarget).toBeNull();
    expect(creature(actor, "B").grappled).toBe(false);
    expect(creature(actor, "A").actionsRemaining).toBe(1);
  });

  it("natural_20: a two-handed grip can be relaxed to cast a hand-component spell", () => {
    const actor = initHandOccupancyBattle();
    startTurn(actor);

    expect(creature(actor, "A").leftHandUse).toBe("mainWeapon");
    expect(creature(actor, "A").rightHandUse).toBe("mainWeapon");

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });
    resolveAttackWindows(actor);

    expect([
      creature(actor, "A").leftHandUse,
      creature(actor, "A").rightHandUse,
    ]).toContain("free");
    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "B").paralyzed).toBe(true);
  });

  it("natural_20: a weapon-and-shield loadout cannot cast a hand-component action spell", () => {
    const actor = initShieldHandOccupancyBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "B").paralyzed).toBe(false);
  });

  it("natural_20: becoming unconscious drops held items", () => {
    const actor = initHandOccupancyBattle();
    startTurn(actor);
    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 18,
      diceCount: 1,
      dieSize: 8,
      dmg: 25,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").unconscious).toBe(true);
    expect(creature(actor, "A").leftHandUse).toBe("free");
    expect(creature(actor, "A").rightHandUse).toBe("free");
  });

  it("natural_20: versatile weapons reject the two-handed die while the wielder is only using one hand", () => {
    const actor = initVersatileBattle(false);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 10,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "B").hp).toBe(20);
  });

  it("natural_20: versatile weapons accept the larger die when a melee attack is made with two hands", () => {
    const actor = initVersatileBattle(true);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 10,
      dmg: 9,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "B").hp).toBe(11);
  });

  it("natural_20: spellcasting relaxes a two-handed versatile grip back to the one-handed die", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          spellAccesses: battlePreparedSpellAccesses("hold_person"),
          mainHandWeapon: LONGSWORD,
          mainHandUsesTwoHands: true,
          initiativeRoll: 20,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
      ],
    });
    startTurn(actor);

    expect(battleMainHandDamageDie(creature(actor, "A"), true)).toBe(10);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });
    resolveAttackWindows(actor);

    expect(battleMainHandDamageDie(creature(actor, "A"), true)).toBe(8);
  });

  it("natural_20: Shocking Grasp blocks opportunity attacks until the start of the target's next turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "lightning",
      crit: false,
      tAc: armorClass(12),
      onHitEffect: {
        spellId: spellId("shocking_grasp"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("B"),
        blocksOpportunityAttacks: true,
      },
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").reactionAvailable).toBe(true);
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellId: spellId("shocking_grasp") }),
      ]),
    );

    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).toBeNull();

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").activeEffects).toEqual([]);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_MOVE",
      provocationKind: "provokesOpportunityAttacks",
      threatened: new Set([CreatureId("B")]),
    });

    expect(ctx(actor).movementCtx).not.toBeNull();
    expect(ctx(actor).movementCtx?.threatenedBy.has(CreatureId("B"))).toBe(
      true,
    );
  });

  it("foundryvtt-dnd5e: Ray of Frost reduces speed until the start of the caster's next turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 16,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "cold",
      crit: false,
      tAc: armorClass(12),
      onHitEffect: {
        spellId: spellId("ray_of_frost"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("A"),
        speedDeltaFeet: -10,
      },
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
      attackerWithin5ft: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellId: spellId("ray_of_frost") }),
      ]),
    );

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").effectiveSpeed).toBe(20);
    expect(creature(actor, "B").movementRemaining).toBe(20);
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ spellId: spellId("ray_of_frost") }),
      ]),
    );

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").activeEffects).toEqual([]);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").effectiveSpeed).toBe(30);
    expect(creature(actor, "B").movementRemaining).toBe(30);
  });

  it("foundryvtt-dnd5e: Dash uses the reduced Speed from Ray of Frost on the slowed turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 16,
      diceCount: 1,
      dieSize: 8,
      dmg: 5,
      dt: "cold",
      crit: false,
      tAc: armorClass(12),
      onHitEffect: {
        spellId: spellId("ray_of_frost"),
        turnsRemaining: 1,
        expiresAt: "start",
        casterId: CreatureId("A"),
        expiryOwnerId: CreatureId("A"),
        speedDeltaFeet: -10,
      },
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
      attackerWithin5ft: false,
    });
    resolveAttackWindows(actor);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(creature(actor, "B").effectiveSpeed).toBe(20);
    expect(creature(actor, "B").movementRemaining).toBe(20);

    send(actor, { type: "BATTLE_DASH" });

    expect(creature(actor, "B").actionsRemaining).toBe(0);
    expect(creature(actor, "B").effectiveSpeed).toBe(20);
    expect(creature(actor, "B").movementRemaining).toBe(40);
  });

  it("natural_20: failing a concentration check ends the spell's effect on the target", () => {
    const actor = initTwoCasterBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("B"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false,
    });

    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "B").paralyzed).toBe(true);
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spellId: spellId("hold_person"),
          casterId: CreatureId("A"),
        }),
      ]),
    );

    send(actor, {
      type: "BATTLE_CONCENTRATION_CHECK",
      targetId: CreatureId("A"),
      conSaveSucceeded: false,
    });

    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "B").paralyzed).toBe(false);
    expect(creature(actor, "B").activeEffects).toEqual([]);
  });

  it("natural_20: starting a new concentration spell ends the previous one", () => {
    const actor = initThreeCasterBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("B"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false,
    });

    expect(creature(actor, "B").paralyzed).toBe(true);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_CONCENTRATION_SPELL",
      targetId: CreatureId("C"),
      slotLvl: spellSlotLevel(2),
      duration: 10,
      spellId: spellId("hold_person"),
      cond: "paralyzed",
      applyCond: true,
      ritual: false,
    });

    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "A").concentrationSpellId).toEqual(
      Option.some(spellId("hold_person")),
    );
    expect(creature(actor, "B").paralyzed).toBe(false);
    expect(creature(actor, "B").activeEffects).toEqual([]);
    expect(creature(actor, "C").paralyzed).toBe(true);
    expect(creature(actor, "C").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          spellId: spellId("hold_person"),
          casterId: CreatureId("A"),
        }),
      ]),
    );
  });

  it("natural_20: an AoE spell deals full damage on a failed save and half damage on a successful save", () => {
    const actor = initAoEBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(13),
      dmgOnFail: 9,
      halfOnSave: true,
      dt: "thunder",
      cond: "blinded",
      applyCond: false,
      saveAbility: "con",
      slotLvl: spellSlotLevel(1),
      spellName: "thunderwave",
      ritual: false,
    });

    expect(ctx(actor).aoeCtx?.remaining).toEqual(
      new Set([CreatureId("B"), CreatureId("C")]),
    );

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("B"),
      saveRoll: 5,
    });
    resolveAoEWindows(actor);

    expect(creature(actor, "B").hp).toBe(11);

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("C"),
      saveRoll: 15,
    });
    resolveAoEWindows(actor);
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: null,
      saveRoll: 0,
    });

    expect(creature(actor, "C").hp).toBe(16);
    expect(ctx(actor).aoeCtx).toBeNull();
  });

  it("projects Magic Resistance through the generic spell-save resolution lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          kind: "PC",
          maxHp: 20,
          caster: true,
          initiativeRoll: 15,
        },
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("B"),
          statBlock: PSEUDODRAGON,
          initiativeRoll: 10,
        }),
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 5,
      saveRollB: 15,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(creature(actor, "B").saveAdvantageContexts).toEqual(
      new Set(["spell", "magicalEffect"]),
    );
    expect(creature(actor, "B").paralyzed).toBe(false);
    expect(creature(actor, "B").hp).toBe(10);
  });

  it("applies Magic Resistance to generic magical-effect save resolution", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 15,
        },
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("B"),
          statBlock: PSEUDODRAGON,
          initiativeRoll: 10,
        }),
      ],
    });

    const result = resolveSave(
      ctx(actor).creatures,
      {
        caster: CreatureId("A"),
        target: CreatureId("B"),
        saveDC: difficultyClass(13),
        saveRoll: 5,
        saveRollB: 15,
        damageOnFail: 0,
        halfOnSuccess: false,
        damageType: "psychic",
        conditionOnFail: "paralyzed",
        applyCondition: true,
        saveAbility: "wis",
        saveTriggerKind: "magicalEffect",
      },
      ADR_ACTIVE_TURN,
    );

    expect(result.creatures.get(CreatureId("B"))?.paralyzed).toBe(false);
  });

  it("resolves Pseudodragon Sting through the generic monster save-effect surface", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "pseudodragon",
          }),
          initiativeRoll: 15,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 10,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "sting",
      targetId: CreatureId("B"),
      saveRoll: 1,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "B").hp).toBe(15);
    expect(creature(actor, "B").poisoned).toBe(true);
    expect(creature(actor, "B").unconscious).toBe(true);
    expect(creature(actor, "B").activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          grantedConditions: ["poisoned"],
          conditionalGrantedConditions: [
            {
              condition: "unconscious",
              whileCondition: "poisoned",
              endsEarlyOnDamage: true,
              endsEarlyOnWakeActionWithinFeet: 5,
            },
          ],
        }),
      ]),
    );
  });

  it("leaves the target unchanged on a successful Sting save", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "pseudodragon",
          }),
          initiativeRoll: 15,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("C"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 10,
          battlePosition: { row: 2, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 5,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "sting",
      targetId: CreatureId("B"),
      saveRoll: 18,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(20);
    expect(creature(actor, "B").poisoned).toBe(false);
    expect(creature(actor, "B").unconscious).toBe(false);
    expect(creature(actor, "B").activeEffects).toEqual([]);
  });

  it("ends Sting's unconscious rider on damage while leaving Poisoned in place", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "pseudodragon",
          }),
          initiativeRoll: 15,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("C"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 10,
          battlePosition: { row: 2, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 5,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "sting",
      targetId: CreatureId("B"),
      saveRoll: 1,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);
    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 4,
      dmg: 4,
      dt: "piercing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(11);
    expect(creature(actor, "B").poisoned).toBe(true);
    expect(creature(actor, "B").unconscious).toBe(false);
  });

  it("lets an adjacent creature wake a Sting target without ending Poisoned", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "pseudodragon",
          }),
          initiativeRoll: 20,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("C"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 15,
          battlePosition: { row: 2, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          initiativeRoll: 10,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "sting",
      targetId: CreatureId("B"),
      saveRoll: 1,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);
    endTurn(actor);
    startTurn(actor);

    send(actor, {
      type: "BATTLE_WAKE_EFFECT",
      targetId: CreatureId("B"),
    });

    expect(creature(actor, "B").poisoned).toBe(true);
    expect(creature(actor, "B").unconscious).toBe(false);
    expect(creature(actor, "C").actionsRemaining).toBe(0);
  });

  it("resolves Gladiator Shield Bash through the shared monster save-effect surface", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "gladiator",
          }),
          initiativeRoll: 15,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          creatureSize: "medium",
          initiativeRoll: 10,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "shieldBash",
      targetId: CreatureId("B"),
      saveRoll: 4,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "B").hp).toBe(11);
    expect(creature(actor, "B").prone).toBe(true);
  });

  it("does not apply Shield Bash prone to Large targets while still dealing damage", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          ...monsterCatalogInitCreatureConfig({
            id: CreatureId("A"),
            statBlockId: "gladiator",
          }),
          initiativeRoll: 15,
          battlePosition: { row: 0, col: 0 },
        },
        {
          id: CreatureId("B"),
          kind: "PC",
          maxHp: 20,
          creatureSize: "large",
          initiativeRoll: 10,
          battlePosition: { row: 1, col: 0 },
        },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_MONSTER_SAVE_EFFECT",
      abilityId: "shieldBash",
      targetId: CreatureId("B"),
      saveRoll: 4,
      actorCanSeeTarget: true,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(11);
    expect(creature(actor, "B").prone).toBe(false);
  });

  it("applies generic raw save-advantage contexts through BATTLE_ADD_CREATURE", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          kind: "PC",
          maxHp: 20,
          caster: true,
          initiativeRoll: 15,
        },
      ],
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_ADD_CREATURE",
      insertAtIndex: 1,
      creatures: [
        {
          id: CreatureId("B"),
          kind: "Monster",
          maxHp: 10,
          saveAdvantageContexts: new Set(["spell", "magicalEffect"]),
          initiativeRoll: 10,
        },
      ],
    });

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 5,
      saveRollB: 15,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(creature(actor, "B").saveAdvantageContexts).toEqual(
      new Set(["spell", "magicalEffect"]),
    );
    expect(creature(actor, "B").paralyzed).toBe(false);
  });

  it("natural_20: a monster daily spellcast spends its daily use through the generic AoE spell lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: MAGE,
          statBlockId: "mage",
          initiativeRoll: 20,
        }),
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 10 },
        { id: CreatureId("C"), maxHp: 20, kind: "PC", initiativeRoll: 5 },
      ],
    });

    startTurn(actor);
    expect(creature(actor, "A").dailyUsesRemaining).toMatchObject({
      [monsterSpellDailyUseId(spellId("fireball"))]: 2,
    });

    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(14),
      dmgOnFail: 54,
      halfOnSave: true,
      dt: "fire",
      cond: "blinded",
      applyCond: false,
      saveAbility: "dex",
      slotLvl: spellSlotLevel(4),
      spellName: "fireball",
      ritual: false,
    });

    expect(creature(actor, "A").dailyUsesRemaining).toMatchObject({
      [monsterSpellDailyUseId(spellId("fireball"))]: 1,
    });
    expect(ctx(actor).aoeCtx?.damageOnFail).toBe(54);
  });

  it("natural_20: Evasion turns a failed Dexterity AoE save into half damage and a successful save into no damage", () => {
    const actor = initAoEBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_AOE",
      saveDC: difficultyClass(13),
      dmgOnFail: 8,
      halfOnSave: true,
      dt: "fire",
      cond: "blinded",
      applyCond: false,
      saveAbility: "dex",
      slotLvl: spellSlotLevel(1),
      spellName: "burning_hands",
      ritual: false,
    });

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("B"),
      saveRoll: 5,
    });
    resolveAoEWindows(actor);

    expect(creature(actor, "B").hp).toBe(16);

    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: CreatureId("C"),
      saveRoll: 15,
    });
    resolveAoEWindows(actor);
    send(actor, {
      type: "BATTLE_RESOLVE_AOE_TARGET",
      targetId: null,
      saveRoll: 0,
    });

    expect(creature(actor, "C").hp).toBe(20);
    expect(ctx(actor).aoeCtx).toBeNull();
  });

  it("natural_20: BATTLE_HEAL restores HP to a wounded ally and spends the caster's action", () => {
    const actor = initHealBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 8,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(12);

    advanceToNextTurn(actor);
    advanceToNextTurn(actor);

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 5,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(0);
    expect(creature(actor, "B").hp).toBe(17);
  });

  it("natural_20: BATTLE_HEAL cannot heal above the target's max HP", () => {
    const actor = initHealBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 3,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    advanceToNextTurn(actor);
    advanceToNextTurn(actor);

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 10,
    });

    expect(creature(actor, "B").hp).toBe(20);
  });

  it("natural_20: BATTLE_HEAL revives a 0 HP creature and clears unconscious and death saves", () => {
    const actor = initHealBattle();
    startTurn(actor);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 8,
      dmg: 20,
      dt: "slashing",
      crit: false,
      tAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(0);
    expect(creature(actor, "B").unconscious).toBe(true);

    advanceToNextTurn(actor);
    advanceToNextTurn(actor);

    send(actor, {
      type: "BATTLE_HEAL",
      targetId: CreatureId("B"),
      amount: 6,
    });

    expect(creature(actor, "B").hp).toBe(6);
    expect(creature(actor, "B").unconscious).toBe(false);
    expect(creature(actor, "B").stable).toBe(false);
    expect(creature(actor, "B").deathSaves).toEqual({
      successes: 0,
      failures: 0,
    });
  });

  it("natural_20: a readied spell releases with a reaction and applies its effect", () => {
    const actor = initTwoCasterBattle();
    startTurn(actor);

    send(actor, {
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

    expect(creature(actor, "A").readiedAction).toBe(true);
    expect(creature(actor, "A").readiedSpellParams).not.toBeNull();
    expect(Option.isSome(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "A").slotsCurrent[1]).toBe(2);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    expect(ctx(actor).readyCtx?.eligibleCreatures.has(CreatureId("A"))).toBe(
      true,
    );

    send(actor, {
      type: "BATTLE_READY_SPELL_RELEASE",
      releaserId: CreatureId("A"),
      saveRoll: 1,
    });

    expect(creature(actor, "A").reactionAvailable).toBe(false);
    expect(creature(actor, "A").readiedAction).toBe(false);
    expect(creature(actor, "A").readiedSpellParams).toBeNull();
    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "B").paralyzed).toBe(true);
  });

  it("natural_20: an unreleased readied spell dissipates at the start of the caster's next turn", () => {
    const actor = initTwoCasterBattle();
    startTurn(actor);

    send(actor, {
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
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    send(actor, { type: "BATTLE_READY_PASS" });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    send(actor, { type: "BATTLE_READY_PASS" });
    startTurn(actor);

    expect(creature(actor, "A").readiedSpellParams).toBeNull();
    expect(creature(actor, "A").readiedAction).toBe(false);
    expect(Option.isNone(creature(actor, "A").concentrationSpellId)).toBe(true);
    expect(creature(actor, "A").slotsCurrent[1]).toBe(2);
    expect(creature(actor, "B").paralyzed).toBe(false);
  });

  it("natural_20: a readied attack releases with a reaction and deals damage", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_READY" });

    expect(creature(actor, "A").readiedAction).toBe(true);
    expect(creature(actor, "A").actionsRemaining).toBe(0);

    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });

    expect(ctx(actor).readyCtx?.eligibleCreatures.has(CreatureId("A"))).toBe(
      true,
    );

    send(actor, {
      type: "BATTLE_READY_RELEASE",
      releaserId: CreatureId("A"),
      targetId: CreatureId("B"),
      atkRoll: 15,
      dmg: 5,
      dt: "slashing",
      crit: false,
      tgtAc: armorClass(10),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").reactionAvailable).toBe(false);
    expect(creature(actor, "A").readiedAction).toBe(false);
    expect(creature(actor, "B").hp).toBe(15);
  });

  it("natural_20: an unreleased readied attack expires at the start of the creature's next turn", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_READY" });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    send(actor, { type: "BATTLE_READY_PASS" });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    send(actor, { type: "BATTLE_READY_PASS" });
    startTurn(actor);

    expect(creature(actor, "A").readiedAction).toBe(false);
    expect(creature(actor, "A").reactionAvailable).toBe(true);
    expect(creature(actor, "B").hp).toBe(20);
  });

  it("Help grants advantage on the next attack against the chosen target and is consumed", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
        { id: CreatureId("C"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_HELP_ATTACK",
      allyId: CreatureId("B"),
      targetId: CreatureId("C"),
      helperWithin5ftOfTarget: true,
    });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(ctx(actor).helpTargets).toEqual([
      {
        helperId: CreatureId("A"),
        allyId: CreatureId("B"),
        targetEnemyId: CreatureId("C"),
      },
    ]);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("C"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(ctx(actor).helpTargets).toEqual([]);
    expect(creature(actor, "C").hp).toBe(15);
  });

  it("Help expires when the helper's next turn starts if unused", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        { id: CreatureId("B"), maxHp: 20, kind: "PC", initiativeRoll: 15 },
        { id: CreatureId("C"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_HELP_ATTACK",
      allyId: CreatureId("B"),
      targetId: CreatureId("C"),
      helperWithin5ftOfTarget: true,
    });
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);
    send(actor, {
      type: "BATTLE_END_TURN",
      eotSaveSucceeded: false,
      eotDmg: 0,
      eotDt: "bludgeoning",
      eotConSave: true,
    });
    startTurn(actor);

    expect(ctx(actor).helpTargets).toEqual([]);
  });

  it("qualified physical immunity is bypassed by magical or silvered weapon hits", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTSWORD,
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "Monster",
          initiativeRoll: 10,
          qualifiedPhysicalImmunities: [
            {
              damageType: "piercing",
              bypassedBy: new Set(["magical", "silvered"]),
            },
          ],
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      tAc: armorClass(10),
      crit: false,
      damageQualifiers: new Set(),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(20);

    advanceToNextTurn(actor);
    advanceToNextTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      tAc: armorClass(10),
      crit: false,
      damageQualifiers: new Set(["silvered"]),
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
  });

  it("next-hit rider metadata survives non-weapon hits and is consumed by the next qualifying weapon hit", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          activeEffects: [
            {
              spellId: spellId("test_rider"),
              turnsRemaining: 10,
              expiresAt: "end",
              casterId: CreatureId("A"),
              consumeOnQualifiedHit: { trigger: "nextWeaponHit" },
            },
          ],
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "Monster",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 8,
      dmg: 4,
      dt: "lightning",
      tAc: armorClass(10),
      crit: false,
      onHitEffect: {
        spellId: spellId("spell_attack_marker"),
        turnsRemaining: 1,
        expiresAt: "end",
        casterId: CreatureId("A"),
      },
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").activeEffects).toEqual([
      expect.objectContaining({ spellId: spellId("test_rider") }),
    ]);

    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      tAc: armorClass(10),
      crit: false,
      weaponProperties: SHORTSWORD.properties,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").activeEffects).toEqual([]);
  });

  it("off-hand attack requires a light main-hand Attack action and spends the bonus action", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: SHORTSWORD,
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "Monster",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);
    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").bonusActionUsed).toBe(true);
    expect(creature(actor, "A").lightAttackUsedThisTurn).toBe(true);
    expect(creature(actor, "B").hp).toBe(12);
  });

  it("adds the Archery bonus only to attack rolls made with Ranged weapons", () => {
    const archeryMods = fightingStyleBattleModifiers(new Set(["archery"]));
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTBOW,
          ...archeryMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 8,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTBOW.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
  });

  it("does not add the Archery bonus to attack rolls with Melee weapons", () => {
    const archeryMods = fightingStyleBattleModifiers(new Set(["archery"]));
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTSWORD,
          ...archeryMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 8,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(20);
  });

  it("does not let the Archery bonus satisfy natural critical hit range", () => {
    const archeryMods = fightingStyleBattleModifiers(new Set(["archery"]));
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTBOW,
          ...archeryMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 18,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTBOW.properties,
      tAc: armorClass(25),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(20);
  });

  it("off-hand attack is rejected without two light melee weapons", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: MACE,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);
    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });

    expect(creature(actor, "A").bonusActionUsed).toBe(false);
    expect(creature(actor, "B").hp).toBe(15);
  });

  it("off-hand attack keeps a negative ability modifier and drops a positive one", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          strMod: -2,
          dexMod: -2,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: SHORTSWORD,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(14);
  });

  it("off-hand attack without Two-Weapon Fighting drops a positive ability modifier", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          strMod: 3,
          dexMod: 3,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: SHORTSWORD,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(12);
  });

  it("off-hand attack adds a positive ability modifier with Two-Weapon Fighting", () => {
    const twfMods = fightingStyleBattleModifiers(
      new Set(["twoWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          strMod: 3,
          dexMod: 3,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: SHORTSWORD,
          ...twfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(9);
  });

  it("off-hand attack still keeps a negative ability modifier with Two-Weapon Fighting", () => {
    const twfMods = fightingStyleBattleModifiers(
      new Set(["twoWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          strMod: -2,
          dexMod: -2,
          mainHandWeapon: SHORTSWORD,
          offHandWeapon: SHORTSWORD,
          ...twfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    send(actor, {
      type: "BATTLE_OFF_HAND_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      dmg: 3,
      crit: false,
      tAc: armorClass(10),
      knockOut: false,
      attackerWithin5ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      frightSourceInLOS: false,
      hasAllyAdjacentToTarget: false,
      saDmg: 0,
      hitReactionCandidates: new Set(),
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(14);
  });

  it("runbook_7: concentration teardown removes dependent child effects without deleting another caster's same spell", () => {
    const actor = initTwoPcBattle();
    const bless = spellId("bless");
    const child = spellId("bless_child");
    const creatures = new Map(ctx(actor).creatures);
    creatures.set(CreatureId("A"), {
      ...creature(actor, "A"),
      concentrationSpellId: Option.some(bless),
      activeEffects: [
        {
          spellId: bless,
          turnsRemaining: 3,
          expiresAt: "end",
          casterId: CreatureId("A"),
        },
        {
          spellId: bless,
          turnsRemaining: 3,
          expiresAt: "end",
          casterId: CreatureId("B"),
        },
      ],
    });
    creatures.set(CreatureId("B"), {
      ...creature(actor, "B"),
      activeEffects: [
        {
          spellId: child,
          turnsRemaining: 3,
          expiresAt: "end",
          casterId: CreatureId("A"),
          parentSpellId: bless,
          parentCasterId: CreatureId("A"),
          grantedConditions: ["invisible"],
        },
      ],
      invisible: true,
    });

    const result = breakConcentrationAndPropagate(creatures, CreatureId("A"));

    expect(result.get(CreatureId("A"))?.activeEffects).toEqual([
      {
        spellId: bless,
        turnsRemaining: 3,
        expiresAt: "end",
        casterId: CreatureId("B"),
      },
    ]);
    expect(result.get(CreatureId("B"))?.activeEffects).toEqual([]);
    expect(result.get(CreatureId("B"))?.invisible).toBe(false);
  });

  it("runbook_7: Defense adds AC only through the named armor-owned battle bonus", () => {
    const defenseMods = fightingStyleBattleModifiers(
      new Set(["defense"]),
      true,
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
          isWearingArmor: true,
          ...defenseMods,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 15,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "slashing",
      tAc: armorClass(15),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });

    expect(creature(actor, "B").hp).toBe(20);
  });

  it("runbook_7: Defense adds no AC while unarmored or without the style", () => {
    expect(
      fightingStyleBattleModifiers(new Set(["defense"]), false),
    ).toMatchObject({
      defenseArmorClassBonus: 0,
    });
    expect(fightingStyleBattleModifiers(new Set(), true)).toMatchObject({
      defenseArmorClassBonus: 0,
    });
  });

  it("runbook_7: Great Weapon Fighting floors eligible weapon damage die faces to 3", () => {
    const gwfMods = fightingStyleBattleModifiers(
      new Set(["greatWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: GREATSWORD,
          mainHandUsesTwoHands: true,
          ...gwfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 2,
      dieSize: 6,
      damageDieRolls: [1, 2],
      dmg: 3,
      dt: "slashing",
      weaponProperties: GREATSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(14);
  });

  it("runbook_7: Great Weapon Fighting leaves die faces 3+ unchanged", () => {
    const gwfMods = fightingStyleBattleModifiers(
      new Set(["greatWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: GREATSWORD,
          mainHandUsesTwoHands: true,
          ...gwfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 2,
      dieSize: 6,
      damageDieRolls: [3, 4],
      dmg: 7,
      dt: "slashing",
      weaponProperties: GREATSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(13);
  });

  it("runbook_7: Great Weapon Fighting requires explicit weapon damage die faces", () => {
    const gwfMods = fightingStyleBattleModifiers(
      new Set(["greatWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: GREATSWORD,
          mainHandUsesTwoHands: true,
          ...gwfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 2,
      dieSize: 6,
      dmg: 3,
      dt: "slashing",
      weaponProperties: GREATSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "B").hp).toBe(20);
  });

  it("runbook_7: one-handed Versatile attacks do not get Great Weapon Fighting", () => {
    const gwfMods = fightingStyleBattleModifiers(
      new Set(["greatWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: LONGSWORD,
          mainHandUsesTwoHands: false,
          ...gwfMods,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 8,
      damageDieRolls: [1],
      dmg: 1,
      dt: "slashing",
      weaponProperties: LONGSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(19);
  });

  it("runbook_7: non-eligible and ranged weapons do not get Great Weapon Fighting", () => {
    const gwfMods = fightingStyleBattleModifiers(
      new Set(["greatWeaponFighting"]),
    );
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          mainHandWeapon: MACE,
          mainHandUsesTwoHands: true,
          ...gwfMods,
        },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "Monster",
          initiativeRoll: 10,
          mainHandWeapon: SHORTBOW,
          mainHandUsesTwoHands: true,
          ...gwfMods,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      damageDieRolls: [1],
      dmg: 1,
      dt: "bludgeoning",
      weaponProperties: MACE.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
    });
    resolveAttackWindows(actor);
    expect(creature(actor, "B").hp).toBe(19);

    advanceToNextTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("A"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      damageDieRolls: [1],
      dmg: 1,
      dt: "piercing",
      weaponProperties: SHORTBOW.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
    });
    resolveAttackWindows(actor);
    expect(creature(actor, "A").hp).toBe(19);
  });

  it("applies the goblin stat-block rider only when the hit had net Advantage", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "slashing",
      tAc: armorClass(10),
      crit: false,
      damageQualifiers: new Set(),
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(13);
  });

  it("does not apply the goblin stat-block rider when Advantage and Disadvantage cancel", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "slashing",
      tAc: armorClass(10),
      crit: false,
      damageQualifiers: new Set(),
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(15);
  });

  it("can apply the goblin rider on a selected shortbow attack lane", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          primaryAttackName: "shortbow",
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 5,
      dt: "piercing",
      tAc: armorClass(10),
      crit: false,
      damageQualifiers: new Set(),
      ...DEFAULT_ATTACK_CONTEXT,
      isMelee: false,
      attackerWithin5ft: false,
      attackerWithin60ft: true,
      hostileWithin5ft: false,
      targetCanSeeAttacker: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(13);
  });

  it("doubles the goblin rider dice on a critical hit", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 20,
      diceCount: 1,
      dieSize: 6,
      dmg: 10,
      dt: "slashing",
      tAc: armorClass(10),
      crit: true,
      damageQualifiers: new Set(),
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: false,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(6);
  });

  it("runbook_7: Hide stores discovery DC and Search below that DC does not reveal", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);
    send(actor, {
      type: "BATTLE_HIDE",
      stealthTotal: 18,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });
    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(18);
    expect(creature(actor, "A").invisible).toBe(true);

    advanceToNextTurn(actor);
    send(actor, {
      type: "BATTLE_SEARCH",
      targetId: CreatureId("A"),
      perceptionTotal: 17,
    });

    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(18);
    expect(creature(actor, "A").invisible).toBe(true);
  });

  it("runbook_7: failed Hide does not store hidden state", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);
    send(actor, {
      type: "BATTLE_HIDE",
      stealthTotal: 14,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });

    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(0);
    expect(creature(actor, "A").invisible).toBe(false);
  });

  it("monster bonus Hide stores hidden state and spends only the bonus action", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        statBlockToInitCreatureConfig({
        spellLibrary: SPELL_LIBRARY,
          id: CreatureId("A"),
          statBlock: GOBLIN_WARRIOR,
          initiativeRoll: 20,
        }),
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_BONUS_HIDE",
      stealthTotal: 18,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "A").bonusActionUsed).toBe(true);
    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(18);
    expect(creature(actor, "A").invisible).toBe(true);
  });

  it("bonus Hide and Disengage are ignored when the active creature does not own the option", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);

    send(actor, { type: "BATTLE_BONUS_DISENGAGE" });
    send(actor, {
      type: "BATTLE_BONUS_HIDE",
      stealthTotal: 18,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });

    expect(creature(actor, "A").actionsRemaining).toBe(1);
    expect(creature(actor, "A").bonusActionUsed).toBe(false);
    expect(creature(actor, "A").disengaged).toBe(false);
    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(0);
    expect(creature(actor, "A").invisible).toBe(false);
  });

  it("runbook_7: Search at the discovery DC removes hidden state", () => {
    const actor = initTwoPcBattle();
    startTurn(actor);
    send(actor, {
      type: "BATTLE_HIDE",
      stealthTotal: 18,
      hasCoverOrObscurement: true,
      outOfEnemyLineOfSight: true,
    });
    advanceToNextTurn(actor);

    send(actor, {
      type: "BATTLE_SEARCH",
      targetId: CreatureId("A"),
      perceptionTotal: 18,
    });

    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(0);
    expect(creature(actor, "A").invisible).toBe(false);
  });

  it("runbook_7: Search reveal preserves invisibility from an active effect", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        { id: CreatureId("A"), maxHp: 20, kind: "PC", initiativeRoll: 20 },
        {
          id: CreatureId("B"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 10,
          hiddenDiscoveryDc: 18,
          activeEffects: [
            {
              spellId: spellId("invisibility"),
              turnsRemaining: 3,
              expiresAt: "end",
              casterId: CreatureId("B"),
              grantedConditions: ["invisible"],
            },
          ],
        },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_SEARCH",
      targetId: CreatureId("B"),
      perceptionTotal: 18,
    });

    expect(creature(actor, "B").hiddenDiscoveryDc).toBe(0);
    expect(creature(actor, "B").invisible).toBe(true);
  });

  it("runbook_7: verbal spell casting ends hidden state", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          spellAccesses: battlePreparedSpellAccesses("hold_person"),
          initiativeRoll: 20,
          hiddenDiscoveryDc: 18,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "psychic",
      cond: "paralyzed",
      applyCond: true,
      saveAbility: "wis",
      slotLvl: spellSlotLevel(2),
      spellName: "hold_person",
      ritual: false,
    });

    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(0);
  });

  it("runbook_7: the save-spell battle path rejects out-of-family spells", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          caster: true,
          spellAccesses: battlePreparedSpellAccesses("guiding_bolt"),
          initiativeRoll: 20,
          hiddenDiscoveryDc: 18,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });
    startTurn(actor);

    send(actor, {
      type: "BATTLE_CAST_SAVE_SPELL",
      targetId: CreatureId("B"),
      saveDC: difficultyClass(13),
      saveRoll: 1,
      dmgOnFail: 0,
      halfOnSave: false,
      dt: "radiant",
      cond: "blinded",
      applyCond: false,
      saveAbility: "dex",
      slotLvl: spellSlotLevel(1),
      spellName: "guiding_bolt",
      ritual: false,
    });

    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(18);
    expect(creature(actor, "A").slotsCurrent[0]).toBe(4);
    expect(ctx(actor).awaitCtx).toBeNull();
  });

  it("runbook_7: hidden attacker gets unseen-attacker advantage and loses hidden after attacking", () => {
    const actor = createActor(battleMachine);
    actor.start();
    send(actor, {
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("A"),
          maxHp: 20,
          kind: "PC",
          initiativeRoll: 20,
          rogueLevel: 1,
          sneakAttackDice: 1,
          hiddenDiscoveryDc: 18,
          mainHandWeapon: SHORTSWORD,
        },
        { id: CreatureId("B"), maxHp: 20, kind: "Monster", initiativeRoll: 10 },
      ],
    });

    startTurn(actor);
    send(actor, {
      type: "BATTLE_ATTACK",
      targetId: CreatureId("B"),
      attackRoll: 12,
      diceCount: 1,
      dieSize: 6,
      dmg: 1,
      dt: "piercing",
      weaponProperties: SHORTSWORD.properties,
      tAc: armorClass(10),
      crit: false,
      ...DEFAULT_ATTACK_CONTEXT,
      targetCanSeeAttacker: true,
      hasAllyAdjacentToTarget: false,
      saDmg: 6,
    });
    resolveAttackWindows(actor);

    expect(creature(actor, "B").hp).toBe(13);
    expect(creature(actor, "A").hiddenDiscoveryDc).toBe(0);
  });
});
