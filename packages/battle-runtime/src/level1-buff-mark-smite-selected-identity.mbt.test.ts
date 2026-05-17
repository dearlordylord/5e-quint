// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-DIVINE-FAVOR divine_favor
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-DIVINE-SMITE divine_smite
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-ENSNARING-STRIKE ensnaring_strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-FALSE-LIFE false_life
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-HEROISM heroism
// UNIT-IDENTITY-MBT-REPLAY: L1E-DIVINE-FAVOR divine_favor doDivineFavorWeaponDamageRider
// UNIT-IDENTITY-MBT-REPLAY: L1E-DIVINE-SMITE divine_smite doDivineSmiteAfterHitDamage
// UNIT-IDENTITY-MBT-REPLAY: L1E-ENSNARING-STRIKE ensnaring_strike doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape
// UNIT-IDENTITY-MBT-REPLAY: L1E-FALSE-LIFE false_life doFalseLifeTemporaryHitPoints
// UNIT-IDENTITY-MBT-REPLAY: L1E-HEROISM heroism doHeroismFrightenedImmunityTurnStartTemporaryHitPoints
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
  type Condition,
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
  endTurn,
  initiativeScore,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleReactionProcedureChoice,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleSpellHealingRollHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import type { BattleSpellTurnStartDamageRollHole } from "./battle-reducer.ts";

const level1BuffMarkSmiteSelectedIdentityDriverSchema = {
  init: {},
  doDivineFavorWeaponDamageRider: {},
  doDivineSmiteAfterHitDamage: {},
  doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape: {},
  doFalseLifeTemporaryHitPoints: {},
  doHeroismFrightenedImmunityTurnStartTemporaryHitPoints: {},
  step: {},
} as const;
type Level1BuffMarkSmiteSelectedIdentityDriverAction = Exclude<
  keyof typeof level1BuffMarkSmiteSelectedIdentityDriverSchema,
  "init" | "step"
>;

const divineFavorUnitId = "divine_favor";
const divineSmiteUnitId = "divine_smite";
const ensnaringStrikeUnitId = "ensnaring_strike";
const falseLifeUnitId = "false_life";
const heroismUnitId = "heroism";
const level1BuffMarkSmiteSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
  ensnaringStrikeUnitId,
  falseLifeUnitId,
  heroismUnitId,
] as const;
type Level1BuffMarkSmiteSpellId = (typeof level1BuffMarkSmiteSpellIds)[number];
const damageRiderSourceSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
] as const satisfies ReadonlyArray<Level1BuffMarkSmiteSpellId>;
type DamageRiderSourceSpellId =
  | (typeof damageRiderSourceSpellIds)[number]
  | "none";
type EnsnaringStrikeSourceSpellId = typeof ensnaringStrikeUnitId | "none";
type BonusActionCastSpellId = typeof divineFavorUnitId;
type AttackHitBonusActionSpellId =
  | typeof divineSmiteUnitId
  | typeof ensnaringStrikeUnitId;
type ActionCastSpellId = typeof falseLifeUnitId | typeof heroismUnitId;
type TemporaryHitPointsSourceSpellId = typeof falseLifeUnitId | "none";
type HeroismSourceSpellId = typeof heroismUnitId | "none";
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterClassName =
  CharacterCreatureInit["classLevels"][number]["className"];

type Level1BuffMarkSmiteSelectedIdentityProjection = {
  readonly divineFavorActiveRiderCount: number;
  readonly targetHp: number;
  readonly casterTempHp: number;
  readonly casterFrightened: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly damageRiderSourceSpellId: DamageRiderSourceSpellId;
  readonly damageRiderDamageType: "radiant" | "none";
  readonly damageRiderDice: number;
  readonly damageRiderDieSize: number;
  readonly temporaryHitPointsSourceSpellId: TemporaryHitPointsSourceSpellId;
  readonly temporaryHitPointsDice: number;
  readonly temporaryHitPointsDieSize: number;
  readonly temporaryHitPointsFlat: number;
  readonly frightenedImmunitySourceSpellId: HeroismSourceSpellId;
  readonly frightenedImmunityCondition: "frightened" | "none";
  readonly turnStartTemporaryHitPointsSourceSpellId: HeroismSourceSpellId;
  readonly turnStartTemporaryHitPointsAmount: number;
  readonly ensnaringStrikeRestrainedBeforeEscape: boolean;
  readonly targetRestrained: boolean;
  readonly casterConcentrating: boolean;
  readonly ensnaringStrikeSaveSourceSpellId: EnsnaringStrikeSourceSpellId;
  readonly ensnaringStrikeSaveAbility: "str" | "none";
  readonly turnStartDamageSourceSpellId: EnsnaringStrikeSourceSpellId;
  readonly turnStartDamageDamageType: "piercing" | "none";
  readonly turnStartDamageDice: number;
  readonly turnStartDamageDieSize: number;
  readonly escapeCheckAbility: "str" | "none";
  readonly escapeCheckSkill: "athletics" | "none";
  readonly lastResult:
    | "init"
    | "divineFavor"
    | "divineSmite"
    | "ensnaringStrike"
    | "falseLife"
    | "heroism";
};
type EnsnaringStrikeLifecycleProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "ensnaringStrikeRestrainedBeforeEscape"
  | "ensnaringStrikeSaveSourceSpellId"
  | "ensnaringStrikeSaveAbility"
  | "turnStartDamageSourceSpellId"
  | "turnStartDamageDamageType"
  | "turnStartDamageDice"
  | "turnStartDamageDieSize"
  | "escapeCheckAbility"
  | "escapeCheckSkill"
>;
type FalseLifeTemporaryHitPointsProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "temporaryHitPointsSourceSpellId"
  | "temporaryHitPointsDice"
  | "temporaryHitPointsDieSize"
  | "temporaryHitPointsFlat"
>;
type HeroismEffectsProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "frightenedImmunitySourceSpellId"
  | "frightenedImmunityCondition"
  | "turnStartTemporaryHitPointsSourceSpellId"
  | "turnStartTemporaryHitPointsAmount"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityDriverAction[];
  readonly expected: Level1BuffMarkSmiteSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId:
    | "L1E-DIVINE-FAVOR"
    | "L1E-DIVINE-SMITE"
    | "L1E-ENSNARING-STRIKE"
    | "L1E-FALSE-LIFE"
    | "L1E-HEROISM";
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
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ScalarBuffTemporaryHitPointsRollHole = BattleSpellHealingRollHole & {
  readonly spell: Extract<
    BattleSpellHealingRollHole["spell"],
    { readonly procedure: "scalarBuff" }
  > & {
    readonly effect: Extract<
      Extract<
        BattleSpellHealingRollHole["spell"],
        { readonly procedure: "scalarBuff" }
      >["effect"],
      { readonly kind: "temporaryHitPoints" }
    >;
  };
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
          damageRiderSourceSpellId: "divine_favor",
          damageRiderDamageType: "radiant",
          damageRiderDice: 1,
          damageRiderDieSize: 4,
          lastResult: "divineFavor",
        }),
      },
    ],
  },
  {
    taskId: "L1E-DIVINE-SMITE",
    unitId: "divine_smite",
    actions: ["doDivineSmiteAfterHitDamage"],
    sequences: [
      {
        name: "after-hit-radiant-damage-uses-selected-spell-identity",
        actions: ["doDivineSmiteAfterHitDamage"],
        expected: expectedProjection({
          targetHp: 1,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          damageRiderSourceSpellId: "divine_smite",
          damageRiderDamageType: "radiant",
          damageRiderDice: 2,
          damageRiderDieSize: 8,
          lastResult: "divineSmite",
        }),
      },
    ],
  },
  {
    taskId: "L1E-ENSNARING-STRIKE",
    unitId: "ensnaring_strike",
    actions: ["doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape"],
    sequences: [
      {
        name: "after-hit-restraint-turn-start-damage-and-escape",
        actions: ["doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape"],
        expected: expectedProjection({
          targetHp: 5,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          ensnaringStrikeRestrainedBeforeEscape: true,
          targetRestrained: false,
          casterConcentrating: false,
          ensnaringStrikeSaveSourceSpellId: "ensnaring_strike",
          ensnaringStrikeSaveAbility: "str",
          turnStartDamageSourceSpellId: "ensnaring_strike",
          turnStartDamageDamageType: "piercing",
          turnStartDamageDice: 1,
          turnStartDamageDieSize: 6,
          escapeCheckAbility: "str",
          escapeCheckSkill: "athletics",
          lastResult: "ensnaringStrike",
        }),
      },
    ],
  },
  {
    taskId: "L1E-FALSE-LIFE",
    unitId: "false_life",
    actions: ["doFalseLifeTemporaryHitPoints"],
    sequences: [
      {
        name: "self-action-temporary-hit-points",
        actions: ["doFalseLifeTemporaryHitPoints"],
        expected: expectedProjection({
          casterTempHp: 11,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          temporaryHitPointsSourceSpellId: "false_life",
          temporaryHitPointsDice: 2,
          temporaryHitPointsDieSize: 4,
          temporaryHitPointsFlat: 4,
          lastResult: "falseLife",
        }),
      },
    ],
  },
  {
    taskId: "L1E-HEROISM",
    unitId: "heroism",
    actions: ["doHeroismFrightenedImmunityTurnStartTemporaryHitPoints"],
    sequences: [
      {
        name: "frightened-immunity-and-turn-start-temporary-hit-points",
        actions: ["doHeroismFrightenedImmunityTurnStartTemporaryHitPoints"],
        expected: expectedProjection({
          casterTempHp: 3,
          casterFrightened: false,
          level1SlotsRemaining: 1,
          casterConcentrating: true,
          frightenedImmunitySourceSpellId: "heroism",
          frightenedImmunityCondition: "frightened",
          turnStartTemporaryHitPointsSourceSpellId: "heroism",
          turnStartTemporaryHitPointsAmount: 3,
          lastResult: "heroism",
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
  return defineDriver(level1BuffMarkSmiteSelectedIdentityDriverSchema, () => {
    let state = level1BuffMarkSmiteBattle();
    let damageRider:
      | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
      | undefined;
    let ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
    let falseLifeTemporaryHitPoints =
      defaultFalseLifeTemporaryHitPointsProjection();
    let heroismEffects = defaultHeroismEffectsProjection();
    let lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = level1BuffMarkSmiteBattle();
      damageRider = undefined;
      ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
      falseLifeTemporaryHitPoints =
        defaultFalseLifeTemporaryHitPointsProjection();
      heroismEffects = defaultHeroismEffectsProjection();
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
        ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
        falseLifeTemporaryHitPoints =
          defaultFalseLifeTemporaryHitPointsProjection();
        heroismEffects = defaultHeroismEffectsProjection();

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
      doDivineSmiteAfterHitDamage: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(divineSmiteUnitId)],
        });
        damageRider = undefined;
        ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
        falseLifeTemporaryHitPoints =
          defaultFalseLifeTemporaryHitPointsProjection();
        heroismEffects = defaultHeroismEffectsProjection();

        const hit = resolveLongswordHitWithAttackRoll({ state });
        const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
        const smiteChoice = attackHitBonusActionSpellChoice(
          attackHitWindow,
          divineSmiteUnitId,
        );
        const afterSmite = resolveBattleReaction({
          state: attackHitWindow.state,
          fill: reactionDecisionFill(
            requireHole(attackHitWindow.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castAttackHitBonusActionSpell",
                invocation: smiteChoice.invocation,
                fills: [],
              },
            },
          ),
        });
        const afterSmiteDamage = requireNeedsHoles(afterSmite);
        const damage = requireDamageRollHole(afterSmiteDamage);
        damageRider = spellWeaponDamageRider(damage, divineSmiteUnitId);
        recordResolvedResult(
          resolveBattleSubject({
            state: afterSmiteDamage.state,
            subject: hit.subject,
            fills: [
              hit.targetFill,
              hit.attackFill,
              damageRollFillWithGroups(damage, [[4], [3, 4]]),
            ],
          }),
          "divineSmite",
        );
      },
      doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(ensnaringStrikeUnitId)],
          sourceClassName: "ranger",
        });
        damageRider = undefined;
        ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
        falseLifeTemporaryHitPoints =
          defaultFalseLifeTemporaryHitPointsProjection();
        heroismEffects = defaultHeroismEffectsProjection();

        const hit = resolveLongswordHitWithAttackRoll({ state });
        const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
        const ensnaringChoice = attackHitBonusActionSpellChoice(
          attackHitWindow,
          ensnaringStrikeUnitId,
        );
        const save = requireHole(
          ensnaringChoice.initialHoles,
          "savingThrowOutcome",
        );
        const afterEnsnaring = resolveBattleReaction({
          state: attackHitWindow.state,
          fill: reactionDecisionFill(
            requireHole(attackHitWindow.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castAttackHitBonusActionSpell",
                invocation: ensnaringChoice.invocation,
                fills: [
                  savingThrowOutcomeFill(save, [
                    { targetId, succeeded: false },
                  ]),
                ],
              },
            },
          ),
        });
        const afterEnsnaringDamage = requireNeedsHoles(afterEnsnaring);
        const weaponDamage = requireDamageRollHole(afterEnsnaringDamage);
        const afterWeaponDamage = resolveBattleSubject({
          state: afterEnsnaringDamage.state,
          subject: hit.subject,
          fills: [
            hit.targetFill,
            hit.attackFill,
            damageRollFillWithGroups(weaponDamage, [[3]]),
          ],
        });
        if (afterWeaponDamage.tag !== "resolved") {
          throw new Error("Expected Ensnaring Strike host attack to resolve.");
        }
        const restrainedBeforeEscape = ensnaringStrikeRestrainsTarget(
          afterWeaponDamage.state,
        );
        if (!restrainedBeforeEscape) {
          throw new Error("Expected Ensnaring Strike to restrain the target.");
        }

        const awaitingTurnStartDamage = requireNeedsHoles(
          endTurn({
            state: afterWeaponDamage.state,
            actorId: casterId,
          }),
        );
        const turnStartDamage = requireSpellTurnStartDamageRollHole(
          awaitingTurnStartDamage,
        );
        const targetTurn = endTurn({
          state: afterWeaponDamage.state,
          actorId: casterId,
          fills: [damageRollFillWithGroups(turnStartDamage, [[4]])],
        });
        if (targetTurn.tag !== "resolved") {
          throw new Error(
            "Expected Ensnaring Strike turn-start damage to resolve.",
          );
        }

        const escapeAct = spellRestraintEscapeAct(targetTurn.state);
        const escapeCheck = requireHole(escapeAct.initialHoles, "abilityCheck");
        recordResolvedResult(
          resolveBattleSubject({
            state: targetTurn.state,
            subject: escapeAct.subject,
            fills: [abilityCheckFill(escapeCheck, 13)],
          }),
          "ensnaringStrike",
        );
        ensnaringStrikeLifecycle = {
          ensnaringStrikeRestrainedBeforeEscape: restrainedBeforeEscape,
          ensnaringStrikeSaveSourceSpellId:
            ensnaringStrikeSaveSourceSpellId(save),
          ensnaringStrikeSaveAbility: save.ability === "str" ? "str" : "none",
          turnStartDamageSourceSpellId:
            ensnaringStrikeTurnStartDamageSourceSpellId(turnStartDamage),
          turnStartDamageDamageType:
            turnStartDamage.spellTurnStartDamage.damage.damageType ===
            "piercing"
              ? "piercing"
              : "none",
          turnStartDamageDice:
            turnStartDamage.spellTurnStartDamage.damage.expr.dice,
          turnStartDamageDieSize:
            turnStartDamage.spellTurnStartDamage.damage.expr.dieSize,
          escapeCheckAbility: escapeCheck.ability === "str" ? "str" : "none",
          escapeCheckSkill:
            escapeCheck.skill === "athletics" ? "athletics" : "none",
        };
      },
      doFalseLifeTemporaryHitPoints: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(falseLifeUnitId)],
          sourceClassName: "wizard",
        });
        damageRider = undefined;
        ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
        heroismEffects = defaultHeroismEffectsProjection();

        const act = actionSpellAct(state, falseLifeUnitId);
        const temporaryHitPointsRoll =
          requireScalarBuffTemporaryHitPointsRollHole(
            requireHole(act.initialHoles, "rolledDice"),
          );
        falseLifeTemporaryHitPoints = falseLifeTemporaryHitPointsProjection(
          temporaryHitPointsRoll,
        );
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [damageRollFillWithGroups(temporaryHitPointsRoll, [[4, 3]])],
          }),
          "falseLife",
        );
      },
      doHeroismFrightenedImmunityTurnStartTemporaryHitPoints: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(heroismUnitId)],
        });
        const caster = state.combatants.get(casterId);
        if (caster === undefined) {
          throw new Error("Expected Heroism caster.");
        }
        state = {
          ...state,
          combatants: new Map(state.combatants).set(casterId, {
            ...caster,
            conditions: applyCondition(caster.conditions, "frightened"),
          }),
        };
        damageRider = undefined;
        ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
        falseLifeTemporaryHitPoints =
          defaultFalseLifeTemporaryHitPointsProjection();
        heroismEffects = defaultHeroismEffectsProjection();

        const act = actionSpellAct(state, heroismUnitId);
        const target = requireHole(act.initialHoles, "targetChoice");
        const cast = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [spellTargetFill(target, heroismUnitId, casterId, casterId)],
        });
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Heroism to resolve, got ${cast.tag}.`);
        }

        const targetTurn = endTurn({
          state: cast.state,
          actorId: casterId,
        });
        if (targetTurn.tag !== "resolved") {
          throw new Error(
            `Expected Heroism caster turn to end, got ${targetTurn.tag}.`,
          );
        }
        recordResolvedResult(
          endTurn({
            state: targetTurn.state,
            actorId: targetId,
          }),
          "heroism",
        );
        heroismEffects = heroismEffectsProjection(state);
      },
      step: () => {},
      getState: () =>
        projectLevel1BuffMarkSmiteSelectedIdentityState(
          state,
          damageRider,
          ensnaringStrikeLifecycle,
          falseLifeTemporaryHitPoints,
          heroismEffects,
          lastResult,
        ),
    };
  });
}

function expectedProjection(
  overrides: Partial<Level1BuffMarkSmiteSelectedIdentityProjection> = {},
): Level1BuffMarkSmiteSelectedIdentityProjection {
  return {
    divineFavorActiveRiderCount: 0,
    targetHp: 12,
    casterTempHp: 0,
    casterFrightened: false,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    damageRiderSourceSpellId: "none",
    damageRiderDamageType: "none",
    damageRiderDice: 0,
    damageRiderDieSize: 0,
    temporaryHitPointsSourceSpellId: "none",
    temporaryHitPointsDice: 0,
    temporaryHitPointsDieSize: 0,
    temporaryHitPointsFlat: 0,
    frightenedImmunitySourceSpellId: "none",
    frightenedImmunityCondition: "none",
    turnStartTemporaryHitPointsSourceSpellId: "none",
    turnStartTemporaryHitPointsAmount: 0,
    ensnaringStrikeRestrainedBeforeEscape: false,
    targetRestrained: false,
    casterConcentrating: false,
    ensnaringStrikeSaveSourceSpellId: "none",
    ensnaringStrikeSaveAbility: "none",
    turnStartDamageSourceSpellId: "none",
    turnStartDamageDamageType: "none",
    turnStartDamageDice: 0,
    turnStartDamageDieSize: 0,
    escapeCheckAbility: "none",
    escapeCheckSkill: "none",
    lastResult: "init",
    ...overrides,
  };
}

function defaultEnsnaringStrikeLifecycleProjection(): EnsnaringStrikeLifecycleProjection {
  return {
    ensnaringStrikeRestrainedBeforeEscape: false,
    ensnaringStrikeSaveSourceSpellId: "none",
    ensnaringStrikeSaveAbility: "none",
    turnStartDamageSourceSpellId: "none",
    turnStartDamageDamageType: "none",
    turnStartDamageDice: 0,
    turnStartDamageDieSize: 0,
    escapeCheckAbility: "none",
    escapeCheckSkill: "none",
  };
}

function defaultFalseLifeTemporaryHitPointsProjection(): FalseLifeTemporaryHitPointsProjection {
  return {
    temporaryHitPointsSourceSpellId: "none",
    temporaryHitPointsDice: 0,
    temporaryHitPointsDieSize: 0,
    temporaryHitPointsFlat: 0,
  };
}

function defaultHeroismEffectsProjection(): HeroismEffectsProjection {
  return {
    frightenedImmunitySourceSpellId: "none",
    frightenedImmunityCondition: "none",
    turnStartTemporaryHitPointsSourceSpellId: "none",
    turnStartTemporaryHitPointsAmount: 0,
  };
}

function level1BuffMarkSmiteBattle(
  input: {
    readonly preparedSpells?: readonly SpellRecord[];
    readonly sourceClassName?: CharacterClassName;
  } = {},
): BattleState {
  const sourceClassName = input.sourceClassName ?? "paladin";
  const result = startBattle({
    battleId: battleId("level1-buff-mark-smite-selected-identity"),
    combatants: [
      level1BuffMarkSmiteCreature({
        combatantId: casterId,
        displayName: "Level 1 buff caster",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityLongswordAttack(),
        className: sourceClassName,
        spellcasting: {
          sourceClassName,
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
        className: "fighter",
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
  readonly className?: CharacterClassName;
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
  const className = input.className ?? "paladin";
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className, level: 1 }],
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
  spellId: BonusActionCastSpellId,
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

function actionSpellAct(
  state: BattleState,
  spellId: ActionCastSpellId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Action Spell act.`);
  }
  return act;
}

function resolveLongswordHit(input: { readonly state: BattleState }): {
  readonly damageRider: NonNullable<
    BattleDamageRollHole["spellWeaponDamageRiders"]
  >[number];
  readonly result: BattleResolutionResult;
} {
  const hit = resolveLongswordHitWithAttackRoll(input);
  const damage = requireDamageRollHole(requireNeedsHoles(hit.afterAttackRoll));
  const damageRider = spellWeaponDamageRider(damage, divineFavorUnitId);
  return {
    damageRider,
    result: resolveBattleSubject({
      state: input.state,
      subject: hit.subject,
      fills: [
        hit.targetFill,
        hit.attackFill,
        damageRollFillWithGroups(damage, [[4], [3]]),
      ],
    }),
  };
}

function resolveLongswordHitWithAttackRoll(input: {
  readonly state: BattleState;
}): {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly afterAttackRoll: BattleResolutionResult;
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
  return {
    subject,
    targetFill,
    attackFill,
    afterAttackRoll: resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFill, attackFill],
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

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1BuffMarkSmiteSpellId,
  casterId: CombatantId,
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

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "abilityCheck" }>,
  total: number,
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: { total },
  };
}

function spellWeaponDamageRider(
  hole: BattleDamageRollHole,
  spellId: Exclude<DamageRiderSourceSpellId, "none">,
): NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number] {
  const rider = hole.spellWeaponDamageRiders?.find(
    (candidate) => candidate.sourceSpellId === spellId,
  );
  if (rider === undefined) {
    throw new Error(`Expected ${spellId} spell weapon damage rider.`);
  }
  return rider;
}

function requireScalarBuffTemporaryHitPointsRollHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): ScalarBuffTemporaryHitPointsRollHole {
  if (!isScalarBuffTemporaryHitPointsRollHole(hole)) {
    throw new Error("Expected scalar buff Temporary Hit Points roll hole.");
  }
  return hole;
}

function isScalarBuffTemporaryHitPointsRollHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): hole is ScalarBuffTemporaryHitPointsRollHole {
  return (
    "spell" in hole &&
    hole.spell.procedure === "scalarBuff" &&
    hole.spell.effect.kind === "temporaryHitPoints"
  );
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  return requireHole(requireNeedsHoles(result).holes, kind);
}

function requireNeedsHoles(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function requireDamageRollHole(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): BattleDamageRollHole {
  const hole = requireHole(result.holes, "rolledDice");
  if (!("attack" in hole)) {
    throw new Error("Expected attack damage roll hole.");
  }
  return hole;
}

function requireSpellTurnStartDamageRollHole(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): BattleSpellTurnStartDamageRollHole {
  const hole = requireHole(result.holes, "rolledDice");
  if (!("spellTurnStartDamage" in hole)) {
    throw new Error("Expected spell turn-start damage roll hole.");
  }
  return hole;
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

function requireAttackHitWindow(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (
    result.tag !== "needsHoles" ||
    result.snapshot.pendingReaction?.trigger !== "attackHit"
  ) {
    throw new Error("Expected attack-hit reaction window.");
  }
  return result;
}

function attackHitBonusActionSpellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  spellId: AttackHitBonusActionSpellId,
): Extract<
  BattleReactionProcedureChoice,
  { readonly kind: "castAttackHitBonusActionSpell" }
> {
  const choice = result.snapshot.pendingReaction?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleReactionProcedureChoice,
      { readonly kind: "castAttackHitBonusActionSpell" }
    > =>
      candidate.kind === "castAttackHitBonusActionSpell" &&
      candidate.reactorId === casterId &&
      candidate.invocation.spellId === spellId,
  );
  if (choice === undefined) {
    throw new Error(`Expected ${spellId} after-hit Bonus Action Spell choice.`);
  }
  return choice;
}

function spellRestraintEscapeAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "escapeSpellRestraint" &&
      candidate.subject.actorId === targetId &&
      candidate.subject.targetId === targetId,
  );
  if (act === undefined) {
    throw new Error("Expected Ensnaring Strike spell restraint escape act.");
  }
  return act;
}

function ensnaringStrikeRestrainsTarget(state: BattleState): boolean {
  const target = state.combatants.get(targetId);
  return (
    target !== undefined &&
    snapshotHasCondition(
      snapshotBattle(state).combatants.find(
        (combatant) => combatant.combatantId === targetId,
      )?.conditions ?? [],
      "restrained",
    ) &&
    target.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceSpellId === ensnaringStrikeUnitId &&
        effect.sourceCombatantId === casterId &&
        effect.condition === "restrained" &&
        effect.turnStartDamage?.damageType === "piercing" &&
        effect.turnStartDamage.expr.dice === 1 &&
        effect.turnStartDamage.expr.dieSize === 6,
    )
  );
}

function ensnaringStrikeSaveSourceSpellId(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): EnsnaringStrikeSourceSpellId {
  return "spell" in hole && hole.spell.spell.id === ensnaringStrikeUnitId
    ? ensnaringStrikeUnitId
    : "none";
}

function ensnaringStrikeTurnStartDamageSourceSpellId(
  hole: BattleSpellTurnStartDamageRollHole,
): EnsnaringStrikeSourceSpellId {
  return hole.spellTurnStartDamage.sourceSpellId === ensnaringStrikeUnitId
    ? ensnaringStrikeUnitId
    : "none";
}

function projectLevel1BuffMarkSmiteSelectedIdentityState(
  state: BattleState,
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
  ensnaringStrikeLifecycle: EnsnaringStrikeLifecycleProjection,
  falseLifeTemporaryHitPoints: FalseLifeTemporaryHitPointsProjection,
  heroismEffects: HeroismEffectsProjection,
  lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected Level 1 buff mark smite target.");
  }
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  if (caster === undefined) {
    throw new Error("Expected Level 1 buff mark smite caster.");
  }
  return {
    targetHp: target.hp,
    casterTempHp: caster.tempHp,
    casterFrightened: snapshotHasCondition(caster.conditions, "frightened"),
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotExpendedThisTurn,
    level1SlotsRemaining: level1SlotsRemaining(state),
    divineFavorActiveRiderCount: divineFavorActiveRiderCount(state),
    damageRiderSourceSpellId: damageRiderSourceSpellId(damageRider),
    damageRiderDamageType:
      damageRider?.damage.damageType === "radiant" ? "radiant" : "none",
    damageRiderDice: damageRider?.damage.expr.dice ?? 0,
    damageRiderDieSize: damageRider?.damage.expr.dieSize ?? 0,
    ...falseLifeTemporaryHitPoints,
    ...heroismEffects,
    targetRestrained: snapshotHasCondition(target.conditions, "restrained"),
    casterConcentrating: caster.concentrating,
    ...ensnaringStrikeLifecycle,
    lastResult,
  };
}

function falseLifeTemporaryHitPointsProjection(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): FalseLifeTemporaryHitPointsProjection {
  const expr = hole.spell.effect.amount.expr;
  return {
    temporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellId(hole),
    temporaryHitPointsDice: expr.dice,
    temporaryHitPointsDieSize: expr.dieSize,
    temporaryHitPointsFlat: expr.flat ?? 0,
  };
}

function temporaryHitPointsSourceSpellId(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): TemporaryHitPointsSourceSpellId {
  if (hole.spell.spell.id === falseLifeUnitId) {
    return falseLifeUnitId;
  }
  throw new Error(
    `Unexpected Temporary Hit Points spell id ${hole.spell.spell.id}.`,
  );
}

function heroismEffectsProjection(
  state: BattleState,
): HeroismEffectsProjection {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Heroism caster.");
  }
  const frightenedImmunity = caster.activeEffects.find(
    (effect) =>
      effect.kind === "conditionImmunity" &&
      effect.sourceSpellId === heroismUnitId &&
      effect.sourceCombatantId === casterId,
  );
  const turnStartTemporaryHitPoints = caster.activeEffects.find(
    (effect) =>
      effect.kind === "turnStartTemporaryHitPoints" &&
      effect.sourceSpellId === heroismUnitId &&
      effect.sourceCombatantId === casterId,
  );
  return {
    frightenedImmunitySourceSpellId: heroismSourceSpellId(frightenedImmunity),
    frightenedImmunityCondition:
      heroismFrightenedImmunityCondition(frightenedImmunity),
    turnStartTemporaryHitPointsSourceSpellId: heroismSourceSpellId(
      turnStartTemporaryHitPoints,
    ),
    turnStartTemporaryHitPointsAmount: turnStartTemporaryHitPoints?.amount ?? 0,
  };
}

function heroismFrightenedImmunityCondition(
  effect:
    | {
        readonly condition: Condition;
      }
    | undefined,
): Level1BuffMarkSmiteSelectedIdentityProjection["frightenedImmunityCondition"] {
  if (effect === undefined) {
    return "none";
  }
  if (effect.condition === "frightened") {
    return "frightened";
  }
  throw new Error(`Unexpected Heroism immunity condition ${effect.condition}.`);
}

function heroismSourceSpellId(
  effect: { readonly sourceSpellId: string } | undefined,
): HeroismSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (effect.sourceSpellId === heroismUnitId) {
    return heroismUnitId;
  }
  throw new Error(
    `Unexpected Heroism source spell id ${effect.sourceSpellId}.`,
  );
}

function damageRiderSourceSpellId(
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderSourceSpellId"] {
  if (damageRider === undefined) {
    return "none";
  }
  if (isDamageRiderSourceSpellId(damageRider.sourceSpellId)) {
    return damageRider.sourceSpellId;
  }
  throw new Error(
    `Unexpected damage rider source spell id ${damageRider.sourceSpellId}.`,
  );
}

function isDamageRiderSourceSpellId(
  value: string,
): value is Exclude<DamageRiderSourceSpellId, "none"> {
  return damageRiderSourceSpellIds.some((spellId) => spellId === value);
}

function snapshotHasCondition(
  conditions: readonly Condition[],
  condition: Condition,
): boolean {
  return conditions.includes(condition);
}

function divineFavorActiveRiderCount(state: BattleState): number {
  return (
    state.combatants
      .get(casterId)
      ?.activeEffects.filter(
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
    casterTempHp: numberFromQuintInt(state["qCasterTempHp"], "qCasterTempHp"),
    casterFrightened: booleanField(state, "qCasterFrightened"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    damageRiderSourceSpellId: damageRiderSourceSpellIdFromQuint(
      state["qDamageRiderSourceSpellId"],
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
    temporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellIdFromQuint(
      state["qTemporaryHitPointsSourceSpellId"],
    ),
    temporaryHitPointsDice: numberFromQuintInt(
      state["qTemporaryHitPointsDice"],
      "qTemporaryHitPointsDice",
    ),
    temporaryHitPointsDieSize: numberFromQuintInt(
      state["qTemporaryHitPointsDieSize"],
      "qTemporaryHitPointsDieSize",
    ),
    temporaryHitPointsFlat: numberFromQuintInt(
      state["qTemporaryHitPointsFlat"],
      "qTemporaryHitPointsFlat",
    ),
    frightenedImmunitySourceSpellId: heroismSourceSpellIdFromQuint(
      state["qFrightenedImmunitySourceSpellId"],
    ),
    frightenedImmunityCondition: frightenedImmunityConditionFromQuint(
      state["qFrightenedImmunityCondition"],
    ),
    turnStartTemporaryHitPointsSourceSpellId: heroismSourceSpellIdFromQuint(
      state["qTurnStartTemporaryHitPointsSourceSpellId"],
    ),
    turnStartTemporaryHitPointsAmount: numberFromQuintInt(
      state["qTurnStartTemporaryHitPointsAmount"],
      "qTurnStartTemporaryHitPointsAmount",
    ),
    ensnaringStrikeRestrainedBeforeEscape: booleanField(
      state,
      "qEnsnaringStrikeRestrainedBeforeEscape",
    ),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    ensnaringStrikeSaveSourceSpellId: ensnaringStrikeSourceSpellIdFromQuint(
      state["qEnsnaringStrikeSaveSourceSpellId"],
    ),
    ensnaringStrikeSaveAbility: strengthAbilityFromQuint(
      state["qEnsnaringStrikeSaveAbility"],
      "saving throw",
    ),
    turnStartDamageSourceSpellId: ensnaringStrikeSourceSpellIdFromQuint(
      state["qTurnStartDamageSourceSpellId"],
    ),
    turnStartDamageDamageType: turnStartDamageDamageType(
      state["qTurnStartDamageDamageType"],
    ),
    turnStartDamageDice: numberFromQuintInt(
      state["qTurnStartDamageDice"],
      "qTurnStartDamageDice",
    ),
    turnStartDamageDieSize: numberFromQuintInt(
      state["qTurnStartDamageDieSize"],
      "qTurnStartDamageDieSize",
    ),
    escapeCheckAbility: strengthAbilityFromQuint(
      state["qEscapeCheckAbility"],
      "escape check",
    ),
    escapeCheckSkill: athleticsSkillFromQuint(state["qEscapeCheckSkill"]),
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

function damageRiderSourceSpellIdFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderSourceSpellId"] {
  if (raw === "none") {
    return raw;
  }
  if (typeof raw === "string" && isDamageRiderSourceSpellId(raw)) {
    return raw;
  }
  throw new Error(`Unexpected damage rider source spell id ${String(raw)}.`);
}

function damageRiderDamageType(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderDamageType"] {
  if (raw === "radiant" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected damage rider damage type ${String(raw)}.`);
}

function temporaryHitPointsSourceSpellIdFromQuint(
  raw: unknown,
): TemporaryHitPointsSourceSpellId {
  if (raw === "none" || raw === falseLifeUnitId) {
    return raw;
  }
  throw new Error(
    `Unexpected Temporary Hit Points source spell id ${String(raw)}.`,
  );
}

function heroismSourceSpellIdFromQuint(raw: unknown): HeroismSourceSpellId {
  if (raw === "none" || raw === heroismUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Heroism source spell id ${String(raw)}.`);
}

function frightenedImmunityConditionFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["frightenedImmunityCondition"] {
  if (raw === "frightened" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Frightened immunity condition ${String(raw)}.`);
}

function ensnaringStrikeSourceSpellIdFromQuint(
  raw: unknown,
): EnsnaringStrikeSourceSpellId {
  if (raw === "none" || raw === ensnaringStrikeUnitId) {
    return raw;
  }
  throw new Error(
    `Unexpected Ensnaring Strike source spell id ${String(raw)}.`,
  );
}

function strengthAbilityFromQuint(raw: unknown, label: string): "str" | "none" {
  if (raw === "str" || raw === "none") {
    return raw;
  }
  throw new Error(
    `Unexpected Ensnaring Strike ${label} ability ${String(raw)}.`,
  );
}

function turnStartDamageDamageType(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["turnStartDamageDamageType"] {
  if (raw === "piercing" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected turn-start damage type ${String(raw)}.`);
}

function athleticsSkillFromQuint(raw: unknown): "athletics" | "none" {
  if (raw === "athletics" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected escape check skill ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "divineFavor" ||
    raw === "divineSmite" ||
    raw === "ensnaringStrike" ||
    raw === "falseLife" ||
    raw === "heroism"
  ) {
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
