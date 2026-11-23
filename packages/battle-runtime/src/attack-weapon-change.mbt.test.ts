// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.ATTACK_WEAPON_CHANGE
// RAW: .references/srd-5.2.1/rules-glossary.md "Attack [Action]", Equipping
// and Unequipping Weapons.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { describe, expect, it } from "vitest";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  battleObjectId,
  battleTablePositionId,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  requireHole,
  requireResolved,
} from "./battle-runtime.test-support.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import type { AttackWeaponChange, BattleSubject } from "./battle-subjects.ts";
import { weaponDropPositionHole } from "./battle-reducer/attack-weapon-change.ts";
import {
  battleObjectIsOnGround,
  loadoutWeaponIsStowed,
} from "./battle-reducer/battle-object-lifecycle.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import type { CombatantId } from "./identity.ts";
import { resolveBattleSubject } from "./index.ts";

const WEAPON_CUSTODIES = [
  "HeldWeapon",
  "StowedWeapon",
  "WeaponOnGround",
] as const;
type WeaponCustody = (typeof WEAPON_CUSTODIES)[number];

type AttackWeaponChangeProjection = {
  readonly weapon: WeaponCustody;
  readonly ownTurn: boolean;
  readonly changeAfterAttack: boolean;
  readonly attackAvailable: boolean;
};

const attackWeaponChangeDriverSchema = {
  init: {},
  doAttack: {},
  doAttackDrawingWeapon: {},
  doAttackStowingWeapon: {},
  doAttackDroppingWeapon: {},
  doDrawAfterAttack: {},
  doStowAfterAttack: {},
  doDropAfterAttack: {},
  doEndOwnTurn: {},
  doEndOtherTurn: {},
  step: {},
} as const;

const longswordId = battleObjectId("main:weapon_longsword");

function weaponCustody(state: BattleState): WeaponCustody {
  if (battleObjectIsOnGround(state, fighterId, longswordId)) {
    return "WeaponOnGround";
  }
  return loadoutWeaponIsStowed(state, fighterId, longswordId)
    ? "StowedWeapon"
    : "HeldWeapon";
}

/**
 * The Fighter's side of the turn: off its own turn the turn resources belong
 * to another creature, so the Fighter has neither an attack nor a change.
 */
function projectAttackWeaponChange(
  state: BattleState,
): AttackWeaponChangeProjection {
  const ownTurn = currentActorId(state) === fighterId;
  const resources = state.currentTurnResources;
  return {
    weapon: weaponCustody(state),
    ownTurn,
    changeAfterAttack:
      ownTurn && resources.weaponChangeAfterAttack === "available",
    attackAvailable: ownTurn && canSpendAction(resources, "attack"),
  };
}

function dropFill(): BattleFill {
  return {
    kind: "weaponDropPosition",
    holeId: weaponDropPositionHole(fighterId, longswordId).holeId,
    value: { positionId: battleTablePositionId("mbt-dropped-longsword") },
  };
}

function changeFills(change: AttackWeaponChange | undefined): BattleFill[] {
  return change?.kind === "drop" ? [dropFill()] : [];
}

/** The Fighter's attack on the Goblin, resolved to a miss. */
function missedAttack(
  state: BattleState,
  change: AttackWeaponChange | undefined,
): BattleState {
  const usesLongsword =
    change === undefined
      ? weaponCustody(state) === "HeldWeapon"
      : change.kind === "equip";
  const attack = fighterAttackSubject(
    state,
    usesLongsword ? "Longsword" : "Unarmed Strike",
  );
  const subject: BattleSubject =
    change === undefined ? attack : { ...attack, weaponChange: change };
  const fills = changeFills(change);
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(targetHole, fighterId, goblinId);
  const rollHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [...fills, targetFill] }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...fills,
        targetFill,
        attackRollFill(rollHole, { total: 2, naturalD20: 2 }),
      ],
    }),
  ).state;
}

function createAttackWeaponChangeDriver() {
  return defineDriver(attackWeaponChangeDriverSchema, () => {
    let state = fighterVsGoblinBattle();

    function attack(kind: AttackWeaponChange["kind"] | undefined): void {
      state = missedAttack(
        state,
        kind === undefined ? undefined : { kind, objectId: longswordId },
      );
    }

    function changeAfter(kind: AttackWeaponChange["kind"]): void {
      const weaponChange = { kind, objectId: longswordId };
      state = requireResolved(
        resolveBattleSubject({
          state,
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "changeWeaponAfterAttack",
            weaponChange,
          },
          fills: changeFills(weaponChange),
        }),
      ).state;
    }

    function endTurn(actorId: CombatantId): void {
      state = requireResolved(
        resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
          fills: [],
        }),
      ).state;
    }

    return {
      init: () => {
        state = fighterVsGoblinBattle();
      },
      doAttack: () => attack(undefined),
      doAttackDrawingWeapon: () => attack("equip"),
      doAttackStowingWeapon: () => attack("stow"),
      doAttackDroppingWeapon: () => attack("drop"),
      doDrawAfterAttack: () => changeAfter("equip"),
      doStowAfterAttack: () => changeAfter("stow"),
      doDropAfterAttack: () => changeAfter("drop"),
      doEndOwnTurn: () => endTurn(fighterId),
      doEndOtherTurn: () => endTurn(goblinId),
      step: () => {},
      getState: () => projectAttackWeaponChange(state),
    };
  });
}

function weaponCustodyValue(raw: unknown): WeaponCustody {
  const tag = quintVariantTag(raw, "qWeapon");
  const custody = WEAPON_CUSTODIES.find((candidate) => candidate === tag);
  if (custody === undefined) {
    throw new Error(`Unexpected qWeapon ${tag}.`);
  }
  return custody;
}

function normalizeAttackWeaponChangeQuintState(
  raw: unknown,
): AttackWeaponChangeProjection {
  const state = quintStateRecord(raw);
  const turn = quintStateRecord(quintField(state, "qTurn"));
  const ownTurn = booleanField(turn, "ownTurn");
  return {
    weapon: weaponCustodyValue(quintField(state, "qWeapon")),
    ownTurn,
    changeAfterAttack: ownTurn && booleanField(turn, "changeAfterAttack"),
    attackAvailable: ownTurn && booleanField(state, "qAttackAvailable"),
  };
}

const attackWeaponChangeStateCheck = stateCheck(
  normalizeAttackWeaponChangeQuintState,
  (spec: AttackWeaponChangeProjection, impl: AttackWeaponChangeProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Attack weapon change MBT", () => {
  it(
    "equips or unequips one weapon before or after each attack, across turns",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-attack-weapon-change.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAttackWeaponChangeDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(10),
        stateCheck: attackWeaponChangeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
