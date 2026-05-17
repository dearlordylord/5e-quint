// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-DIVINE-FAVOR divine_favor
// UNIT-IDENTITY-MBT-REPLAY: L1E-DIVINE-FAVOR divine_favor doDivineFavorWeaponDamageRider
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
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const level1BuffMarkSmiteSelectedIdentityDriverSchema = {
  init: {},
  doDivineFavorWeaponDamageRider: {},
  step: {},
} as const;
type Level1BuffMarkSmiteSelectedIdentityDriverAction = Exclude<
  keyof typeof level1BuffMarkSmiteSelectedIdentityDriverSchema,
  "init" | "step"
>;

const divineFavorUnitId = "divine_favor";
type Level1BuffMarkSmiteSpellId = typeof divineFavorUnitId;

type Level1BuffMarkSmiteSelectedIdentityProjection = {
  readonly divineFavorActiveRiderCount: number;
  readonly targetHp: number;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly divineFavorDamageRiderProjected: boolean;
  readonly damageRiderDamageType: "radiant" | "none";
  readonly damageRiderDice: number;
  readonly damageRiderDieSize: number;
  readonly lastResult: "init" | "divineFavor";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityDriverAction[];
  readonly expected: Level1BuffMarkSmiteSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1E-DIVINE-FAVOR";
  readonly unitId: Level1BuffMarkSmiteSpellId;
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};

const casterId = combatantId("level1-buff-mark-smite-caster");
const targetId = combatantId("level1-buff-mark-smite-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 buff mark smite selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1E-DIVINE-FAVOR",
    unitId: "divine_favor",
    actions: ["doDivineFavorWeaponDamageRider"],
    sequences: [
      {
        name: "self-bonus-action-radiant-weapon-damage-rider",
        actions: ["doDivineFavorWeaponDamageRider"],
        expected: expectedProjection({
          divineFavorActiveRiderCount: 1,
          targetHp: 5,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          divineFavorDamageRiderProjected: true,
          damageRiderDamageType: "radiant",
          damageRiderDice: 1,
          damageRiderDieSize: 4,
          lastResult: "divineFavor",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 1 buff mark smite selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level1BuffMarkSmiteSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel1BuffMarkSmiteSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Level 1 buff mark smite selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 1 buff mark smite selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Level 1 buff mark smite selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel1BuffMarkSmiteSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level1BuffMarkSmiteSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel1BuffMarkSmiteSelectedIdentityDriver() {
  return defineDriver(
    level1BuffMarkSmiteSelectedIdentityDriverSchema,
    () => {
      let state = level1BuffMarkSmiteBattle();
      let damageRider:
        | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
        | undefined;
      let lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] =
        "init";

      function reset(): void {
        state = level1BuffMarkSmiteBattle();
        damageRider = undefined;
        lastResult = "init";
      }

      function recordResolvedResult(
        result: BattleResolutionResult,
        resultKind: Exclude<
          Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
          "init"
        >,
      ): void {
        if (result.tag !== "resolved") {
          throw new Error(
            `Expected Level 1 buff mark smite action to resolve, got ${result.tag}.`,
          );
        }
        state = result.state;
        lastResult = resultKind;
      }

      return {
        init: reset,
        doDivineFavorWeaponDamageRider: () => {
          state = level1BuffMarkSmiteBattle({
            preparedSpells: [spellRecord(divineFavorUnitId)],
          });
          damageRider = undefined;

          const cast = resolveBattleSubject({
            state,
            subject: bonusActionSpellAct(state, divineFavorUnitId).subject,
            fills: [],
          });
          if (cast.tag !== "resolved") {
            throw new Error(`Expected Divine Favor to resolve, got ${cast.tag}.`);
          }
          state = cast.state;

          const attack = resolveLongswordHit({ state });
          damageRider = attack.damageRider;
          recordResolvedResult(attack.result, "divineFavor");
        },
        step: () => {},
        getState: () =>
          projectLevel1BuffMarkSmiteSelectedIdentityState(
            state,
            damageRider,
            lastResult,
          ),
      };
    },
  );
}

function expectedProjection(
  overrides: Partial<Level1BuffMarkSmiteSelectedIdentityProjection> = {},
): Level1BuffMarkSmiteSelectedIdentityProjection {
  return {
    divineFavorActiveRiderCount: 0,
    targetHp: 12,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    divineFavorDamageRiderProjected: false,
    damageRiderDamageType: "none",
    damageRiderDice: 0,
    damageRiderDieSize: 0,
    lastResult: "init",
    ...overrides,
  };
}

function level1BuffMarkSmiteBattle(
  input: {
    readonly preparedSpells?: readonly SpellRecord[];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("level1-buff-mark-smite-selected-identity"),
    combatants: [
      level1BuffMarkSmiteCreature({
        combatantId: casterId,
        displayName: "Level 1 buff caster",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityLongswordAttack(),
        spellcasting: {
          sourceClassName: "paladin",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      level1BuffMarkSmiteCreature({
        combatantId: targetId,
        displayName: "Level 1 buff target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function level1BuffMarkSmiteCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "paladin", level: 1 }],
      armorClass:
        attack === null
          ? defaultArmorClassState()
          : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: `main:${attack.weapon.id}`,
                unitId: attack.weapon.id,
                grip: "one_handed" as const,
              },
            },
      attack,
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

function spellRecord(spellId: Level1BuffMarkSmiteSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function bonusActionSpellAct(
  state: BattleState,
  spellId: Level1BuffMarkSmiteSpellId,
): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Spell act.`);
  }
  return act;
}

function resolveLongswordHit(input: {
  readonly state: BattleState;
}): {
  readonly damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined;
  readonly result: BattleResolutionResult;
} {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(target, "Longsword");
  const attack = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  const damageRider = damage.spellWeaponDamageRiders?.find(
    (rider) => rider.sourceSpellId === divineFavorUnitId,
  );
  return {
    damageRider,
    result: resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, [[4], [3]]),
      ],
    }),
  };
}

function zeroAbilityLongswordAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_longsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected weapon_longsword Unit to be a weapon.");
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function weaponAttackSubject(
  attackName: "Longsword",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: casterId,
    action: "attack",
    attackName,
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attackName: "Longsword",
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: casterId,
        targetId,
        attackName,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
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

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectLevel1BuffMarkSmiteSelectedIdentityState(
  state: BattleState,
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
  lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected Level 1 buff mark smite target.");
  }
  return {
    targetHp: target.hp,
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotExpendedThisTurn,
    level1SlotsRemaining: level1SlotsRemaining(state),
    divineFavorActiveRiderCount: divineFavorActiveRiderCount(state),
    divineFavorDamageRiderProjected:
      damageRider?.sourceSpellId === divineFavorUnitId,
    damageRiderDamageType:
      damageRider?.damage.damageType === "radiant" ? "radiant" : "none",
    damageRiderDice: damageRider?.damage.expr.dice ?? 0,
    damageRiderDieSize: damageRider?.damage.expr.dieSize ?? 0,
    lastResult,
  };
}

function divineFavorActiveRiderCount(state: BattleState): number {
  return (
    state.combatants.get(casterId)?.activeEffects.filter(
      (effect) =>
        effect.kind === "spellWeaponDamageRider" &&
        effect.sourceSpellId === divineFavorUnitId,
    ).length ?? 0
  );
}

function level1SlotsRemaining(state: BattleState): number {
  const actor = state.combatants.get(casterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function normalizeLevel1BuffMarkSmiteSelectedIdentityQuintState(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    divineFavorActiveRiderCount: numberFromQuintInt(
      state["qDivineFavorActiveRiderCount"],
      "qDivineFavorActiveRiderCount",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    divineFavorDamageRiderProjected: booleanField(
      state,
      "qDivineFavorDamageRiderProjected",
    ),
    damageRiderDamageType: damageRiderDamageType(
      state["qDamageRiderDamageType"],
    ),
    damageRiderDice: numberFromQuintInt(
      state["qDamageRiderDice"],
      "qDamageRiderDice",
    ),
    damageRiderDieSize: numberFromQuintInt(
      state["qDamageRiderDieSize"],
      "qDamageRiderDieSize",
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

function damageRiderDamageType(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderDamageType"] {
  if (raw === "radiant" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected damage rider damage type ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "divineFavor") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const level1BuffMarkSmiteSelectedIdentityStateCheck = stateCheck(
  normalizeLevel1BuffMarkSmiteSelectedIdentityQuintState,
  (
    spec: Level1BuffMarkSmiteSelectedIdentityProjection,
    impl: Level1BuffMarkSmiteSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
