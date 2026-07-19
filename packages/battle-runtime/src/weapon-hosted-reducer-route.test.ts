import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime-test-support.ts";
import { resolveBattleSubject } from "./battle-runtime-test-support.ts";
import { describe, expect, it } from "vitest";

import {
  battleReducerStartRouteEvent,
  spellId,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleFill,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  statBlockAttackAct,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  divineFavorUnitId,
  magicWeaponUnitId,
  shillelaghUnitId,
  spellCasterId,
  spellTargetId,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  magicWeaponTargetItemFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  classLevel,
  proficiencyBonus,
} from "./unit-profile-admission-test-support.ts";

const startRoute = battleReducerStartRouteEvent();
const WEAPON_HOSTED_ROUTE_SUBJECTS = [
  "heldWeaponActiveEffect",
  "spellHostedWeaponAttack",
  "weaponDamageRider",
] as const satisfies ReadonlyArray<
  Extract<BattleReducerRouteEvent, { readonly subject: string }>["subject"]
>;

describe("weapon-hosted reducer route call segments", () => {
  it("emits True Strike resolutions followed only by newly opened frontiers", () => {
    const state = trueStrikeBattle();
    const act = spellAct({ state, spellId: trueStrikeUnitId });
    expect(act.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["damageTypeChoice", "targetChoice"],
        owner: "battleActionEconomy",
      },
    ]);

    const damageTypeFill: Extract<
      BattleFill,
      { readonly kind: "damageTypeChoice" }
    > = {
      kind: "damageTypeChoice",
      holeId: requireHole(act.initialHoles, "damageTypeChoice").holeId,
      value: "radiant",
    };
    const damageTypeResult = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill],
      }),
    );
    expect(damageTypeResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "damageTypeChoice",
        holes: ["targetChoice"],
        owner: "battleHoleFrontier",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["targetChoice"],
        owner: "battleTargetSelection",
      },
    ]);

    const targetFill = attackTargetFill(
      requireHole(damageTypeResult.holes, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Dagger",
    );
    const targetResult = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill],
      }),
    );
    expect(targetResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "targetChoice",
        holes: ["attackRoll"],
        owner: "battleTargetSelection",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["attackRoll"],
        owner: "battleAttackRoll",
      },
    ]);

    const attackFill = attackRollFill(
      requireHole(targetResult.holes, "attackRoll"),
      { total: 15, naturalD20: 12 },
    );
    const attackResult = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill, attackFill],
      }),
    );
    expect(attackResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["rolledDice"],
        owner: "battleHitPoint",
      },
    ]);

    const damageResult = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          damageTypeFill,
          targetFill,
          attackFill,
          damageRollFillWithGroups(
            requireHole(attackResult.holes, "rolledDice"),
            [[2], [3]],
          ),
        ],
      }),
    );
    expect(damageResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
    expect(
      resolveBattleSubject({
        state: damageResult.state,
        subject: act.subject,
        fills: [damageTypeFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      routeEvents: [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "spellHostedWeaponAttack",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ],
    });

    expect([
      startRoute,
      ...(act.routeEvents ?? []),
      ...(damageTypeResult.routeEvents ?? []),
      ...(targetResult.routeEvents ?? []),
      ...(attackResult.routeEvents ?? []),
      ...(damageResult.routeEvents ?? []),
    ]).toEqual([
      startRoute,
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["damageTypeChoice", "targetChoice"],
        owner: "battleActionEconomy",
      },
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "damageTypeChoice",
        holes: ["targetChoice"],
        owner: "battleHoleFrontier",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["targetChoice"],
        owner: "battleTargetSelection",
      },
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "targetChoice",
        holes: ["attackRoll"],
        owner: "battleTargetSelection",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["attackRoll"],
        owner: "battleAttackRoll",
      },
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "discoverBattleActs",
        subject: "spellHostedWeaponAttack",
        holes: ["rolledDice"],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubject",
        subject: "spellHostedWeaponAttack",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
  });

  it("routes only the selected Shillelagh weapon through the held effect", () => {
    const initial = shillelaghBattle();
    const castAct = bonusSpellAct({
      state: initial,
      spellId: shillelaghUnitId,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial,
        subject: castAct.subject,
        fills: [],
      }),
    );
    expect(cast.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "heldWeaponActiveEffect",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: castAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      routeEvents: [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "heldWeaponActiveEffect",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ],
    });

    const quarterstaff = statBlockAttackAct(
      cast.state,
      spellCasterId,
      "Quarterstaff (force)",
    );
    const quarterstaffTarget = attackTargetFill(
      requireHole(quarterstaff.initialHoles, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Quarterstaff (force)",
    );
    const quarterstaffTargetResult = requireNeedsHoles(
      resolveBattleSubject({
        state: cast.state,
        subject: quarterstaff.subject,
        fills: [quarterstaffTarget],
      }),
    );
    expect(quarterstaffTargetResult.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["attackRoll"],
        owner: "battleActiveEffect",
      },
    ]);
    const quarterstaffAttackFill = attackRollFill(
      requireHole(quarterstaffTargetResult.holes, "attackRoll"),
      { total: 15, naturalD20: 10 },
    );
    const quarterstaffAttackResult = requireNeedsHoles(
      resolveBattleSubject({
        state: cast.state,
        subject: quarterstaff.subject,
        fills: [quarterstaffTarget, quarterstaffAttackFill],
      }),
    );
    expect(quarterstaffAttackResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
    ]);
    const quarterstaffDamageResult = requireResolved(
      resolveBattleSubject({
        state: cast.state,
        subject: quarterstaff.subject,
        fills: [
          quarterstaffTarget,
          quarterstaffAttackFill,
          damageRollFillWithGroups(
            requireHole(quarterstaffAttackResult.holes, "rolledDice"),
            [[2, 2]],
          ),
        ],
      }),
    );
    expect(quarterstaffDamageResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
    expect(
      hostedRoute(
        castAct,
        cast,
        quarterstaffTargetResult,
        quarterstaffAttackResult,
        quarterstaffDamageResult,
      ),
    ).toEqual([
      startRoute,
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: [],
        owner: "battleActionEconomy",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "heldWeaponActiveEffect",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["attackRoll"],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);

    const unarmed = statBlockAttackAct(
      cast.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const unarmedTarget = attackTargetFill(
      requireHole(unarmed.initialHoles, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Unarmed Strike",
    );
    const unarmedTargetResult = requireNeedsHoles(
      resolveBattleSubject({
        state: cast.state,
        subject: unarmed.subject,
        fills: [unarmedTarget],
      }),
    );
    const unarmedAttackResult = requireResolved(
      resolveBattleSubject({
        state: cast.state,
        subject: unarmed.subject,
        fills: [
          unarmedTarget,
          attackRollFill(requireHole(unarmedTargetResult.holes, "attackRoll"), {
            total: 15,
            naturalD20: 10,
          }),
        ],
      }),
    );
    expect(unarmedAttackResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "weaponAttack",
        fill: "attackRoll",
        holes: [],
        owner: "battleAttackRoll",
      },
    ]);
  });

  it("does not repeat discovery when admitting Divine Favor or Magic Weapon", () => {
    const divineState = divineFavorBattle();
    const divineAct = bonusSpellAct({
      state: divineState,
      spellId: divineFavorUnitId,
    });
    const divineCast = requireResolved(
      resolveBattleSubject({
        state: divineState,
        subject: divineAct.subject,
        fills: [],
      }),
    );
    expect(divineCast.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "weaponDamageRider",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    expect(
      resolveBattleSubject({
        state: divineCast.state,
        subject: divineAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      routeEvents: [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "weaponDamageRider",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ],
    });
    const longswordSubject = weaponAttackSubject(divineCast.state, "Longsword");
    const targetHoleResult = requireNeedsHoles(
      resolveBattleSubject({
        state: divineCast.state,
        subject: longswordSubject,
        fills: [],
      }),
    );
    const longswordTargetFill = attackTargetFill(
      requireHole(targetHoleResult.holes, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const longswordTargetResult = requireNeedsHoles(
      resolveBattleSubject({
        state: divineCast.state,
        subject: longswordSubject,
        fills: [longswordTargetFill],
      }),
    );
    const longswordAttackFill = attackRollFill(
      requireHole(longswordTargetResult.holes, "attackRoll"),
      { total: 15, naturalD20: 10 },
    );
    const longswordAttackResult = requireNeedsHoles(
      resolveBattleSubject({
        state: divineCast.state,
        subject: longswordSubject,
        fills: [longswordTargetFill, longswordAttackFill],
      }),
    );
    expect(longswordAttackResult.routeEvents).toEqual([
      {
        kind: "discoverBattleActs",
        subject: "weaponDamageRider",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
    ]);
    const longswordDamageResult = requireResolved(
      resolveBattleSubject({
        state: divineCast.state,
        subject: longswordSubject,
        fills: [
          longswordTargetFill,
          longswordAttackFill,
          damageRollFillWithGroups(
            requireHole(longswordAttackResult.holes, "rolledDice"),
            [[2], [3]],
          ),
        ],
      }),
    );
    expect(longswordDamageResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "weaponDamageRider",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
    expect(
      hostedRoute(
        divineAct,
        divineCast,
        targetHoleResult,
        longswordTargetResult,
        longswordAttackResult,
        longswordDamageResult,
      ),
    ).toEqual([
      startRoute,
      {
        kind: "discoverBattleActs",
        subject: "weaponDamageRider",
        holes: [],
        owner: "battleSpellSlotAndActionEconomy",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "weaponDamageRider",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "discoverBattleActs",
        subject: "weaponDamageRider",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubject",
        subject: "weaponDamageRider",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);

    const unarmedDivineState = divineFavorBattleWithUnarmedDamageDie();
    const unarmedDivineAct = bonusSpellAct({
      state: unarmedDivineState,
      spellId: divineFavorUnitId,
    });
    const unarmedDivineCast = requireResolved(
      resolveBattleSubject({
        state: unarmedDivineState,
        subject: unarmedDivineAct.subject,
        fills: [],
      }),
    );
    const unarmedAct = statBlockAttackAct(
      unarmedDivineCast.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const unarmedTargetFill = attackTargetFill(
      requireHole(unarmedAct.initialHoles, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Unarmed Strike",
    );
    const unarmedTargetResult = requireNeedsHoles(
      resolveBattleSubject({
        state: unarmedDivineCast.state,
        subject: unarmedAct.subject,
        fills: [unarmedTargetFill],
      }),
    );
    const unarmedAttackFill = attackRollFill(
      requireHole(unarmedTargetResult.holes, "attackRoll"),
      { total: 15, naturalD20: 10 },
    );
    const unarmedAttackResult = requireNeedsHoles(
      resolveBattleSubject({
        state: unarmedDivineCast.state,
        subject: unarmedAct.subject,
        fills: [unarmedTargetFill, unarmedAttackFill],
      }),
    );
    expect(unarmedAttackResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "weaponAttack",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
    ]);
    const unarmedDamageResult = requireResolved(
      resolveBattleSubject({
        state: unarmedDivineCast.state,
        subject: unarmedAct.subject,
        fills: [
          unarmedTargetFill,
          unarmedAttackFill,
          damageRollFillWithGroups(
            requireHole(unarmedAttackResult.holes, "rolledDice"),
            [[3]],
          ),
        ],
      }),
    );
    expect(unarmedDamageResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "weaponAttack",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);

    const magicState = magicWeaponBattle();
    const magicAct = bonusSpellAct({
      state: magicState,
      spellId: magicWeaponUnitId,
      slotLevel: 2,
    });
    const magicTarget = requireHole(
      magicAct.initialHoles,
      "magicWeaponTargetItem",
    );
    const magicFill = magicWeaponTargetItemFill(magicTarget, {
      holderCombatantId: spellCasterId,
      itemId: "main:weapon_longsword",
    });
    const magicResolution = requireResolved(
      resolveBattleSubject({
        state: magicState,
        subject: magicAct.subject,
        fills: [magicFill],
      }),
    );
    expect(magicResolution.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "weaponEnhancementItemTarget",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
    expect(
      resolveBattleSubject({
        state: magicResolution.state,
        subject: magicAct.subject,
        fills: [magicFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      routeEvents: [
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "weaponEnhancementItemTarget",
          holes: [],
          owner: "battleHoleFrontier",
        },
      ],
    });
  });

  it("keeps marked, selected held, and weapon-rider contributions ordered", () => {
    const shillelaghInitial = shillelaghBattle();
    const shillelaghCast = requireResolved(
      resolveBattleSubject({
        state: shillelaghInitial,
        subject: bonusSpellAct({
          state: shillelaghInitial,
          spellId: shillelaghUnitId,
        }).subject,
        fills: [],
      }),
    );
    const divineInitial = divineFavorBattle();
    const divineCast = requireResolved(
      resolveBattleSubject({
        state: divineInitial,
        subject: bonusSpellAct({
          state: divineInitial,
          spellId: divineFavorUnitId,
        }).subject,
        fills: [],
      }),
    );
    const divineRider = requireCombatant(
      divineCast.state,
      spellCasterId,
    ).activeEffects.find((effect) => effect.kind === "spellWeaponDamageRider");
    if (divineRider === undefined) {
      throw new Error("Expected Divine Favor rider effect.");
    }
    const caster = requireCombatant(shillelaghCast.state, spellCasterId);
    const markedRider: Extract<
      BattleActiveEffect,
      { readonly kind: "spellMarkedDamageRider" }
    > = {
      kind: "spellMarkedDamageRider",
      effectRef: battleActiveEffectExecutionRefForTest("weapon-route-mark"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(spellId("synthetic_route_mark")),
      ),
      sourceCombatantId: spellCasterId,
      targetCombatantId: spellTargetId,
      transfer: { kind: "awaitingTargetDrop", retargetTiming: "sameTurn" },
      abilityCheckBehavior: { kind: "none" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
      expiresAt: { kind: "concentration", combatantId: spellCasterId },
    };
    const state: BattleState = {
      ...shillelaghCast.state,
      combatants: new Map(shillelaghCast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: [...caster.activeEffects, markedRider, divineRider],
      }),
    };
    const attack = statBlockAttackAct(
      state,
      spellCasterId,
      "Quarterstaff (force)",
    );
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      spellCasterId,
      spellTargetId,
      "Quarterstaff (force)",
    );
    const targetResult = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: attack.subject,
        fills: [targetFill],
      }),
    );
    expect(targetResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "markedDamageRiderEffect",
        fill: "targetChoice",
        holes: ["attackRoll"],
        owner: "battleTargetSelection",
      },
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["attackRoll"],
        owner: "battleActiveEffect",
      },
    ]);
    const attackFill = attackRollFill(
      requireHole(targetResult.holes, "attackRoll"),
      { total: 15, naturalD20: 10 },
    );
    const attackResult = requireNeedsHoles(
      resolveBattleSubject({
        state,
        subject: attack.subject,
        fills: [targetFill, attackFill],
      }),
    );
    expect(attackResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "markedDamageRiderEffect",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleAttackRoll",
      },
      {
        kind: "discoverBattleActs",
        subject: "heldWeaponActiveEffect",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
      {
        kind: "discoverBattleActs",
        subject: "weaponDamageRider",
        holes: ["rolledDice"],
        owner: "battleActiveEffect",
      },
    ]);
    const damageResult = requireResolved(
      resolveBattleSubject({
        state,
        subject: attack.subject,
        fills: [
          targetFill,
          attackFill,
          damageRollFillWithGroups(
            requireHole(attackResult.holes, "rolledDice"),
            [[2, 2], [3], [4]],
          ),
        ],
      }),
    );
    expect(damageResult.routeEvents).toEqual([
      {
        kind: "resolveBattleSubject",
        subject: "heldWeaponActiveEffect",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubject",
        subject: "markedDamageRiderEffect",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
      {
        kind: "resolveBattleSubject",
        subject: "weaponDamageRider",
        fill: "rolledDice",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
  });
});

function trueStrikeBattle(): BattleState {
  return spellBattle({
    cantrips: [spellRecord(trueStrikeUnitId)],
    spellSlots: [],
    attack: zeroAbilityWeaponAttack("weapon_dagger"),
    casterClassLevels: [{ className: "wizard", level: classLevel(5) }],
    casterProficiencyBonus: proficiencyBonus(3),
    casterWeaponProficiencies: [
      { kind: "weapon_category", category: "simple" },
    ],
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function shillelaghBattle(): BattleState {
  return spellBattle({
    cantrips: [spellRecord(shillelaghUnitId)],
    attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
    casterClassLevels: [{ className: "druid", level: 17 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function divineFavorBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(divineFavorUnitId)],
    attack: zeroAbilityWeaponAttack("weapon_longsword"),
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function divineFavorBattleWithUnarmedDamageDie(): BattleState {
  const state = divineFavorBattle();
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error(
      "Expected the Divine Favor fixture caster to be a character.",
    );
  }
  const casterWithUnarmedDamageDie: BattleCreatureState = {
    ...caster,
    origin: {
      ...caster.origin,
      unarmedStrike: {
        ...caster.origin.unarmedStrike,
        effect: {
          kind: "damage",
          damage: {
            kind: "authoredReplacement",
            sourceUnitId: spellId("synthetic_unarmed_damage_die"),
            dice: 1,
            dieSize: 4,
            damageType: "bludgeoning",
          },
        },
      },
    },
  };
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        combatantId === spellCasterId ? casterWithUnarmedDamageDie : combatant,
      ]),
    ),
  };
}

function magicWeaponBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(magicWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    attack: zeroAbilityWeaponAttack("weapon_longsword"),
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function requireNeedsHoles(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result.tag).toBe("needsHoles");
  if (result.tag !== "needsHoles") {
    throw new Error("Expected resolution to leave holes.");
  }
  return result;
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result.tag).toBe("resolved");
  if (result.tag !== "resolved") {
    throw new Error("Expected resolution to complete.");
  }
  return result;
}

type RouteEventSource = {
  readonly routeEvents?: readonly BattleReducerRouteEvent[];
};

function hostedRoute(
  ...sources: readonly RouteEventSource[]
): readonly BattleReducerRouteEvent[] {
  return [
    startRoute,
    ...sources.flatMap((source) =>
      (source.routeEvents ?? []).filter(
        (event) =>
          "subject" in event &&
          WEAPON_HOSTED_ROUTE_SUBJECTS.some(
            (subject) => event.subject === subject,
          ),
      ),
    ),
  ];
}
