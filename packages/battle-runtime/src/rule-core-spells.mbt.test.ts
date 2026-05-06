// RAW-COVERAGE: verification-owner:focused-mbt RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, it } from "vitest";

import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import acidSplashInput from "../../surface/content/acid_splash.json";
import healingWordInput from "../../surface/content/healing_word.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import magicMissileInput from "../../surface/content/magic_missile.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
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
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleRolledDiceFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const ruleCoreSpellMbtHoles = [
  "TargetChoice",
  "SpellTargetAllocation",
  "AttackRoll",
  "SavingThrowOutcome",
  "DamageRoll",
] as const;
type RuleCoreSpellMbtHole = (typeof ruleCoreSpellMbtHoles)[number];
const ruleCoreSpellResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreSpellResult = (typeof ruleCoreSpellResults)[number];
const ruleCoreSpellInvalidReasons = ["none", "staleSubject"] as const;
type RuleCoreSpellInvalidReason = (typeof ruleCoreSpellInvalidReasons)[number];
const spellActiveEffectKinds = [
  "none",
  "speedDelta",
  "spellBaseArmorClass",
] as const;
type SpellActiveEffectKind = (typeof spellActiveEffectKinds)[number];

type RuleCoreSpellProjection = {
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly casterReactionAvailable: boolean;
  readonly casterHp: number;
  readonly targetHp: number;
  readonly secondTargetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly activeEffectKind: SpellActiveEffectKind;
  readonly readiedHeld: boolean;
  readonly readiedReleased: boolean;
  readonly concentrationActive: boolean;
  readonly holes: readonly RuleCoreSpellMbtHole[];
  readonly lastResult: RuleCoreSpellResult;
  readonly lastInvalidReason: RuleCoreSpellInvalidReason;
};

const casterId = combatantId("rule-core-spell-caster");
const targetId = combatantId("rule-core-spell-target");
const secondTargetId = combatantId("rule-core-spell-second-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const spellRecords = new Map(
  [
    decodeSpellRecord(magicMissileInput),
    decodeSpellRecord(rayOfFrostInput),
    decodeSpellRecord(acidSplashInput),
    decodeSpellRecord(healingWordInput),
    decodeSpellRecord(mageArmorInput),
  ].map((spell) => [spell.id, spell]),
);

const driverSchema = {
  init: {},
  doMagicMissileNeedsAllocation: {},
  doMagicMissileLow: {},
  doRayOfFrostNeedsTarget: {},
  doRayOfFrostNeedsAttackRoll: {},
  doRayOfFrostNeedsDamageRoll: {},
  doRayOfFrostMiss: {},
  doRayOfFrostHit: {},
  doRayOfFrostCritical: {},
  doAcidSplashNeedsSavingThrow: {},
  doAcidSplashNeedsDamageRoll: {},
  doAcidSplashAllSuccess: {},
  doAcidSplashOneFail: {},
  doHealingWordNeedsTarget: {},
  doHealingWordNeedsHealingRoll: {},
  doHealingWordWounded: {},
  doHealingWordZeroHp: {},
  doMageArmorNeedsTarget: {},
  doMageArmor: {},
  doRejectSecondSlotSpell: {},
  doReadySpellHold: {},
  doReleaseReadiedSpell: {},
  step: {},
} as const;

function createRuleCoreSpellDriver() {
  return defineDriver(driverSchema, () => {
    let state = spellBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreSpellProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreSpellProjection["lastInvalidReason"] =
      "none";
    let readiedReleased = false;

    function reset(): void {
      state = spellBattle();
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      readiedReleased = false;
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        return;
      }
      if (!isRuleCoreSpellInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Spell MBT invalid reason: ${result.reason}`,
        );
      }
      lastResult = "invalid";
      lastInvalidReason = result.reason;
    }

    function resolveSubject(
      subject: BattleSubject,
      fills: readonly BattleFill[] = [],
    ): BattleResolutionResult {
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
      return result;
    }

    return {
      init: reset,
      doMagicMissileNeedsAllocation: () => {
        state = spellBattle();
        resetProjection();
        recordResult(
          resolveBattleSubject({
            state,
            subject: actionSpellSubject(
              "magic_missile",
              "preparedSlotSpell:magic_missile:slot:1",
            ),
            fills: [],
          }),
        );
      },
      doMagicMissileLow: () => {
        state = spellBattle();
        resetProjection();
        const subject = actionSpellSubject(
          "magic_missile",
          "preparedSlotSpell:magic_missile:slot:1",
        );
        const target = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "spellTargetAllocation",
        );
        const allocation = spellTargetAllocationFill(target, [
          { targetId, count: 3 },
        ]);
        const damage = requireHole(
          resolveBattleSubject({ state, subject, fills: [allocation] }),
          "rolledDice",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [allocation, damageRollFillWithGroups(damage, [[2, 2, 2]])],
          }),
        );
      },
      doRayOfFrostNeedsTarget: () => resolveRayOfFrostStaged("target"),
      doRayOfFrostNeedsAttackRoll: () => resolveRayOfFrostStaged("attackRoll"),
      doRayOfFrostNeedsDamageRoll: () => resolveRayOfFrostStaged("damageRoll"),
      doRayOfFrostMiss: () => resolveRayOfFrost({ total: 1, naturalD20: 1 }),
      doRayOfFrostHit: () =>
        resolveRayOfFrost({
          total: 14,
          naturalD20: 10,
          damageGroups: [[4]],
        }),
      doRayOfFrostCritical: () =>
        resolveRayOfFrost({
          total: 20,
          naturalD20: 20,
          damageGroups: [[4, 4]],
        }),
      doAcidSplashAllSuccess: () =>
        resolveAcidSplash([
          { targetId, succeeded: true },
          { targetId: secondTargetId, succeeded: true },
        ]),
      doAcidSplashOneFail: () =>
        resolveAcidSplash(
          [
            { targetId, succeeded: false },
            { targetId: secondTargetId, succeeded: true },
          ],
          [[4]],
        ),
      doAcidSplashNeedsSavingThrow: () => resolveAcidSplashStaged("save"),
      doAcidSplashNeedsDamageRoll: () => resolveAcidSplashStaged("damageRoll"),
      doHealingWordNeedsTarget: () => resolveHealingWordStaged("target"),
      doHealingWordNeedsHealingRoll: () =>
        resolveHealingWordStaged("healingRoll"),
      doHealingWordWounded: () => {
        state = spellBattle({
          targetHp: 4,
          preparedSpells: [spellRecord("healing_word")],
        });
        resetProjection();
        resolveHealingWord([[4, 3]]);
      },
      doHealingWordZeroHp: () => {
        state = spellBattle({
          targetHp: 0,
          targetDeathSaves: { successes: 1, failures: 1 },
          preparedSpells: [spellRecord("healing_word")],
        });
        resetProjection();
        resolveHealingWord([[1, 1]]);
      },
      doMageArmor: () => {
        state = spellBattle({
          preparedSpells: [spellRecord("mage_armor")],
          casterArmorClass: unarmoredDexArmorClass(),
        });
        resetProjection();
        const subject = actionSpellSubject(
          "mage_armor",
          "preparedPersistentSpell:mage_armor:slot:1",
        );
        const target = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "targetChoice",
        );
        resolveSubject(subject, [
          spellTargetFill(target, "mage_armor", casterId, casterId),
        ]);
      },
      doMageArmorNeedsTarget: () => {
        state = spellBattle({
          preparedSpells: [spellRecord("mage_armor")],
          casterArmorClass: unarmoredDexArmorClass(),
        });
        resetProjection();
        recordResult(
          resolveBattleSubject({
            state,
            subject: actionSpellSubject(
              "mage_armor",
              "preparedPersistentSpell:mage_armor:slot:1",
            ),
            fills: [],
          }),
        );
      },
      doRejectSecondSlotSpell: () => {
        state = spellBattle({
          preparedSpells: [
            spellRecord("magic_missile"),
            spellRecord("healing_word"),
          ],
        });
        resetProjection();
        const subject = actionSpellSubject(
          "magic_missile",
          "preparedSlotSpell:magic_missile:slot:1",
        );
        const target = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "spellTargetAllocation",
        );
        const allocation = spellTargetAllocationFill(target, [
          { targetId, count: 3 },
        ]);
        const damage = requireHole(
          resolveBattleSubject({ state, subject, fills: [allocation] }),
          "rolledDice",
        );
        const first = resolveBattleSubject({
          state,
          subject,
          fills: [allocation, damageRollFillWithGroups(damage, [[2, 2, 2]])],
        });
        if (first.tag !== "resolved") {
          recordResult(first);
          return;
        }
        state = first.state;
        recordResult(
          resolveBattleSubject({
            state,
            subject: {
              tag: "bonusActionSpell",
              actorId: casterId,
              spellId: "healing_word",
              spellActId: "preparedHealingSpell:healing_word:slot:1",
            },
            fills: [],
          }),
        );
      },
      doReadySpellHold: () => {
        state = spellBattle();
        resetProjection();
        resolveSubject({
          tag: "actionSpell",
          actorId: casterId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "attackHit",
        });
      },
      doReleaseReadiedSpell: () => {
        state = spellBattle();
        resetProjection();
        const readied = resolveBattleSubject({
          state,
          subject: {
            tag: "actionSpell",
            actorId: casterId,
            spellId: "magic_missile",
            spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
            readyTrigger: "attackHit",
          },
          fills: [],
        });
        if (readied.tag !== "resolved") {
          recordResult(readied);
          return;
        }
        const targetTurn = endTurn({ state: readied.state, actorId: casterId });
        if (targetTurn.tag !== "resolved") {
          recordResult(targetTurn);
          return;
        }
        state = targetTurn.state;
        const releaseSubject: BattleSubject = {
          tag: "runtimeCommand",
          actorId: targetId,
          command: "releaseReadiedSpell",
          readiedSpellCasterId: casterId,
        };
        const releaseTarget = requireHole(
          resolveBattleSubject({ state, subject: releaseSubject, fills: [] }),
          "spellTargetAllocation",
        );
        const allocation = spellTargetAllocationFill(releaseTarget, [
          { targetId, count: 3 },
        ]);
        const damage = requireHole(
          resolveBattleSubject({
            state,
            subject: releaseSubject,
            fills: [allocation],
          }),
          "rolledDice",
        );
        const attackSubject = targetAttackSubject();
        const attackTarget = requireHole(
          resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
          "targetChoice",
        );
        const attackRoll = requireHole(
          resolveBattleSubject({
            state,
            subject: attackSubject,
            fills: [attackTargetFill(attackTarget)],
          }),
          "attackRoll",
        );
        const attackHit = resolveBattleSubject({
          state,
          subject: attackSubject,
          fills: [
            attackTargetFill(attackTarget),
            attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          ],
        });
        if (attackHit.tag !== "needsHoles") {
          recordResult(attackHit);
          return;
        }
        state = attackHit.state;
        holes = attackHit.holes;
        const releaseChoice = attackHit.snapshot.pendingReaction?.choices.find(
          (candidate) =>
            candidate.kind === "releaseReadiedSpell" &&
            candidate.readiedSpellCasterId === casterId,
        );
        if (releaseChoice?.kind !== "releaseReadiedSpell") {
          throw new Error("Expected Readied Spell release choice.");
        }
        recordResult(
          resolveBattleReaction({
            state,
            fill: reactionDecisionFill(
              requireHoleFromList(holes, "reactionDecision"),
              {
                kind: "resolve",
                reactorId: casterId,
                choice: {
                  kind: "releaseReadiedSpell",
                  readiedSpellCasterId: casterId,
                  fills: [
                    allocation,
                    damageRollFillWithGroups(damage, [[2, 2, 2]]),
                  ],
                },
              },
            ),
          }),
        );
        readiedReleased =
          lastResult === "resolved" || lastResult === "needsHoles";
      },
      step: () => {},
      getState: () =>
        projectRuleCoreSpellState({
          state,
          holes,
          readiedReleased,
          lastResult,
          lastInvalidReason,
        }),
    };

    function resetProjection(): void {
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      readiedReleased = false;
    }

    function resolveRayOfFrost(input: {
      readonly total: number;
      readonly naturalD20: number;
      readonly damageGroups?: readonly (readonly number[])[];
    }): void {
      state = spellBattle();
      resetProjection();
      const subject = actionSpellSubject(
        "ray_of_frost",
        "cantripSpellAttack:ray_of_frost",
      );
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const targetFill = spellTargetFill(
        target,
        "ray_of_frost",
        casterId,
        targetId,
      );
      const roll = requireHole(
        resolveBattleSubject({ state, subject, fills: [targetFill] }),
        "attackRoll",
      );
      const rollFill = attackRollFill(roll, {
        total: input.total,
        naturalD20: input.naturalD20,
      });
      if (input.damageGroups === undefined) {
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [targetFill, rollFill],
          }),
        );
        return;
      }
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill, rollFill],
        }),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill,
            rollFill,
            damageRollFillWithGroups(damage, input.damageGroups),
          ],
        }),
      );
    }

    function resolveRayOfFrostStaged(
      stopAt: "target" | "attackRoll" | "damageRoll",
    ): void {
      state = spellBattle();
      resetProjection();
      const subject = actionSpellSubject(
        "ray_of_frost",
        "cantripSpellAttack:ray_of_frost",
      );
      const targetResult = resolveBattleSubject({ state, subject, fills: [] });
      if (stopAt === "target") {
        recordResult(targetResult);
        return;
      }
      const target = requireHole(targetResult, "targetChoice");
      const targetFill = spellTargetFill(
        target,
        "ray_of_frost",
        casterId,
        targetId,
      );
      const attackRollResult = resolveBattleSubject({
        state,
        subject,
        fills: [targetFill],
      });
      if (stopAt === "attackRoll") {
        recordResult(attackRollResult);
        return;
      }
      const attackRoll = requireHole(attackRollResult, "attackRoll");
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill,
            attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
          ],
        }),
      );
    }

    function resolveAcidSplash(
      outcomes: readonly {
        readonly targetId: CombatantId;
        readonly succeeded: boolean;
      }[],
      damageGroups?: readonly (readonly number[])[],
    ): void {
      state = spellBattle({ includeSecondTarget: true });
      resetProjection();
      const subject = actionSpellSubject(
        "acid_splash",
        "cantripSaveGateDamage:acid_splash",
      );
      const savingThrow = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "savingThrowOutcome",
      );
      const savingThrowFill = savingThrowOutcomeFill(savingThrow, outcomes);
      if (damageGroups === undefined) {
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [savingThrowFill],
          }),
        );
        return;
      }
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [savingThrowFill],
        }),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            savingThrowFill,
            damageRollFillWithGroups(damage, damageGroups),
          ],
        }),
      );
    }

    function resolveAcidSplashStaged(stopAt: "save" | "damageRoll"): void {
      state = spellBattle({ includeSecondTarget: true });
      resetProjection();
      const subject = actionSpellSubject(
        "acid_splash",
        "cantripSaveGateDamage:acid_splash",
      );
      const saveResult = resolveBattleSubject({ state, subject, fills: [] });
      if (stopAt === "save") {
        recordResult(saveResult);
        return;
      }
      const savingThrow = requireHole(saveResult, "savingThrowOutcome");
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            savingThrowOutcomeFill(savingThrow, [
              { targetId, succeeded: false },
              { targetId: secondTargetId, succeeded: true },
            ]),
          ],
        }),
      );
    }

    function resolveHealingWordStaged(stopAt: "target" | "healingRoll"): void {
      state = spellBattle({
        targetHp: 4,
        preparedSpells: [spellRecord("healing_word")],
      });
      resetProjection();
      const subject = healingWordSubject();
      if (stopAt === "target") {
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
        return;
      }
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Healing Word Bonus Action spell act.");
      }
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [spellTargetFill(target, "healing_word", casterId, targetId)],
        }),
      );
    }

    function resolveHealingWord(
      healingGroups: readonly (readonly number[])[],
    ): void {
      const subject = healingWordSubject();
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Healing Word Bonus Action spell act.");
      }
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      const targetFill = spellTargetFill(
        target,
        "healing_word",
        casterId,
        targetId,
      );
      const healing = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill],
        }),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill, damageRollFillWithGroups(healing, healingGroups)],
        }),
      );
    }
  });
}

const spellStateCheck = stateCheck(
  normalizeRuleCoreSpellQuintState,
  compareRuleCoreSpellState,
);

const ruleCoreSpellDefaultMbtSteps = 6;

describe("rule-core Spell focused MBT", () => {
  it("replays QCORE10 spell procedure parity through battle-runtime reducers", async () => {
    await run({
      spec: path.resolve(import.meta.dirname, "../rule-core-spells.mbt.qnt"),
      init: "init",
      step: "step",
      driver: createRuleCoreSpellDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(
        process.env["MBT_STEPS"] ?? ruleCoreSpellDefaultMbtSteps,
      ),
      stateCheck: spellStateCheck,
    });
  }, 120_000);
});

function spellBattle(
  input: {
    readonly targetHp?: number;
    readonly preparedSpells?: readonly SpellRecord[];
    readonly includeSecondTarget?: boolean;
    readonly casterArmorClass?: ReturnType<typeof defaultArmorClassState>;
    readonly targetDeathSaves?: {
      readonly successes: 0 | 1 | 2;
      readonly failures: 0 | 1 | 2;
    };
  } = {},
): BattleState {
  const state = startBattleRight({
    battleId: battleId("rule-core-spells"),
    combatants: [
      spellcaster({
        initiative: 20,
        ...(input.casterArmorClass === undefined
          ? {}
          : { armorClass: input.casterArmorClass }),
        ...(input.preparedSpells === undefined
          ? {}
          : { preparedSpells: input.preparedSpells }),
      }),
      spellTarget({
        combatantId: targetId,
        displayName: "Spell Target",
        initiative: 10,
        currentHp: input.targetHp ?? 13,
      }),
      ...(input.includeSecondTarget === true
        ? [
            spellTarget({
              combatantId: secondTargetId,
              displayName: "Second Spell Target",
              initiative: 8,
              currentHp: 13,
            }),
          ]
        : []),
    ],
  });
  if (input.targetDeathSaves === undefined) {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (
    target === undefined ||
    target.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    throw new Error("Expected spell target with death-save lifecycle.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      zeroHpLifecycle: {
        ...target.zeroHpLifecycle,
        deathSaves: {
          deathSaves: input.targetDeathSaves,
          stable: false,
          dead: false,
          hpRegained: false,
        },
      },
    }),
  };
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

function spellcaster(input: {
  readonly initiative: number;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly preparedSpells?: readonly SpellRecord[];
}): BattleCreatureInit {
  return characterCreature({
    combatantId: casterId,
    displayName: "Spellcaster",
    initiative: input.initiative,
    side: partySide,
    spellcasting: {
      spellcastingAbilityModifier: 3,
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: [spellRecord("ray_of_frost"), spellRecord("acid_splash")],
      preparedSpells: input.preparedSpells ?? [
        spellRecord("magic_missile"),
        spellRecord("healing_word"),
        spellRecord("mage_armor"),
      ],
      spellSlots: [{ spellLevel: 1, count: 2 }],
    },
    ...(input.armorClass === undefined ? {} : { armorClass: input.armorClass }),
  });
}

function spellTarget(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly currentHp: number;
}): BattleCreatureInit {
  return characterCreature({
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    side: oppositionSide,
    currentHp: input.currentHp,
  });
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly currentHp?: number;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
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
      classLevels: [{ className: "wizard", level: 1 }],
      armorClass: input.armorClass ?? defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(Math.max(input.currentHp ?? 12, 12)),
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

function unarmoredDexArmorClass(): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    abilityModifiers: {
      ...defaultArmorClassState().abilityModifiers,
      dex: abilityModifier(2),
    },
  };
}

function actionSpellSubject(
  spellId: "magic_missile" | "mage_armor" | "ray_of_frost" | "acid_splash",
  spellActId: string,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return { tag: "actionSpell", actorId: casterId, spellId, spellActId };
}

function targetAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: targetId,
    action: "attack",
    attackName: "Unarmed Strike",
  };
}

function healingWordSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionSpell" }
> {
  return {
    tag: "bonusActionSpell",
    actorId: casterId,
    spellId: "healing_word",
    spellActId: "preparedHealingSpell:healing_word:slot:1",
  };
}

function attackTargetFill(hole: BattleHole): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: casterId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: targetId,
        targetId: casterId,
        attackName: "Unarmed Strike",
      },
    ],
  };
}

function spellTargetFill(
  hole: BattleHole,
  spellId: "mage_armor" | "ray_of_frost" | "healing_word",
  caster: CombatantId,
  target: CombatantId,
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: target,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: caster,
        targetId: target,
        spellId,
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: BattleHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
): BattleFill {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spellTargetAllocation hole.");
  }
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      spellId: hole.spell.spell.id,
    })),
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): BattleFill {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: casterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function reactionDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  if (hole.kind !== "reactionDecision") {
    throw new Error("Expected reactionDecision hole.");
  }
  return { kind: "reactionDecision", holeId: hole.holeId, value };
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

function requireHole(
  result: BattleResolutionResult,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles, got ${result.tag}.`);
  }
  return requireHoleFromList(result.holes, kind);
}

function requireHoleFromList(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectRuleCoreSpellState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly readiedReleased: boolean;
  readonly lastResult: RuleCoreSpellProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreSpellProjection["lastInvalidReason"];
}): RuleCoreSpellProjection {
  const snapshot = snapshotBattle(input.state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  const secondTarget = snapshot.combatants.find(
    (combatant) => combatant.combatantId === secondTargetId,
  );
  if (caster === undefined || target === undefined) {
    throw new Error("Expected rule-core Spell caster and target.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.length > 0,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    casterReactionAvailable: caster.reactionAvailable,
    casterHp: caster.hp,
    targetHp: target.hp,
    secondTargetHp: secondTarget?.hp ?? 13,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDeathSuccesses:
      target.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? target.zeroHpLifecycle.deathSaves.successes
        : 0,
    targetDeathFailures:
      target.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? target.zeroHpLifecycle.deathSaves.failures
        : 0,
    spellSlotSpentThisTurn:
      input.state.currentTurnResources.spellSlotExpendedThisTurn,
    level1SlotsRemaining: level1SlotsRemaining(input.state, casterId),
    activeEffectKind: activeEffectKind(input.state),
    readiedHeld: snapshot.readiedResponses.spells.some(
      (readied) => readied.casterId === casterId,
    ),
    readiedReleased: input.readiedReleased,
    concentrationActive: caster.concentrating,
    holes: input.holes.map(projectSpellHole),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function activeEffectKind(state: BattleState): SpellActiveEffectKind {
  const caster = state.combatants.get(casterId);
  if (
    caster?.activeEffects.some(
      (effect) => effect.kind === "spellBaseArmorClass",
    )
  ) {
    return "spellBaseArmorClass";
  }
  const target = state.combatants.get(targetId);
  if (target?.activeEffects.some((effect) => effect.kind === "speedDelta")) {
    return "speedDelta";
  }
  return "none";
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function projectSpellHole(hole: BattleHole): RuleCoreSpellMbtHole {
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "spellTargetAllocation") return "SpellTargetAllocation";
  if (hole.kind === "attackRoll") return "AttackRoll";
  if (hole.kind === "savingThrowOutcome") return "SavingThrowOutcome";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(`Unexpected rule-core Spell MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreSpellQuintState(
  raw: unknown,
): RuleCoreSpellProjection {
  const state = quintStateRecord(raw);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    casterReactionAvailable: booleanField(state, "qCasterReactionAvailable"),
    casterHp: numberFromQuintInt(state["qCasterHp"], "qCasterHp"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    secondTargetHp: numberFromQuintInt(
      state["qSecondTargetHp"],
      "qSecondTargetHp",
    ),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetDeathSuccesses: numberFromQuintInt(
      state["qTargetDeathSuccesses"],
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      state["qTargetDeathFailures"],
      "qTargetDeathFailures",
    ),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    activeEffectKind: spellActiveEffectKindName(state["qActiveEffectKind"]),
    readiedHeld: booleanField(state, "qReadiedHeld"),
    readiedReleased: booleanField(state, "qReadiedReleased"),
    concentrationActive: booleanField(state, "qConcentrationActive"),
    holes: quintHoleSet(state["qHoles"]).map(spellHoleName),
    lastResult: spellResult(state["qLastResult"]),
    lastInvalidReason: spellInvalidReason(state["qLastInvalidReason"]),
  };
}

function compareRuleCoreSpellState(
  quint: RuleCoreSpellProjection,
  runtime: RuleCoreSpellProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function spellRecord(
  spellId:
    | "magic_missile"
    | "mage_armor"
    | "ray_of_frost"
    | "acid_splash"
    | "healing_word",
): SpellRecord {
  const spell = spellRecords.get(spellId);
  if (spell === undefined) {
    throw new Error(`Expected ${spellId} spell Unit.`);
  }
  return spell;
}

function decodeSpellRecord(raw: unknown): SpellRecord {
  const unit = decodeUnitRecordSync(raw);
  if (unit.kind !== "spell") {
    throw new Error("Expected spell Unit.");
  }
  return unit;
}

function quintStateRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Expected Quint state object.");
  }
  return raw as Record<string, unknown>;
}

function booleanField(state: Record<string, unknown>, field: string): boolean {
  const value = state[field];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean ${field}.`);
  }
  return value;
}

function numberFromQuintInt(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`Expected Quint int ${field}.`);
}

function quintHoleSet(value: unknown): readonly string[] {
  if (value instanceof Set) {
    return [...value].map(spellHoleTag).sort();
  }
  if (Array.isArray(value)) {
    return value.map(spellHoleTag).sort();
  }
  throw new Error("Expected qHoles set.");
}

function spellHoleTag(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "tag" in value &&
    typeof value.tag === "string"
  ) {
    return value.tag;
  }
  throw new Error(`Expected Quint hole tag, got ${String(value)}.`);
}

function spellHoleName(value: string): RuleCoreSpellMbtHole {
  if (isMember(ruleCoreSpellMbtHoles, value)) return value;
  throw new Error(`Unexpected rule-core Spell hole ${value}.`);
}

function spellResult(value: unknown): RuleCoreSpellResult {
  if (typeof value === "string" && isMember(ruleCoreSpellResults, value)) {
    return value;
  }
  throw new Error(`Unexpected rule-core Spell result ${String(value)}.`);
}

function spellInvalidReason(value: unknown): RuleCoreSpellInvalidReason {
  if (
    typeof value === "string" &&
    isMember(ruleCoreSpellInvalidReasons, value)
  ) {
    return value;
  }
  throw new Error(
    `Unexpected rule-core Spell invalid reason ${String(value)}.`,
  );
}

function spellActiveEffectKindName(value: unknown): SpellActiveEffectKind {
  if (typeof value === "string" && isMember(spellActiveEffectKinds, value)) {
    return value;
  }
  throw new Error(`Unexpected rule-core Spell effect kind ${String(value)}.`);
}

function isRuleCoreSpellInvalidReason(
  reason: string,
): reason is RuleCoreSpellInvalidReason {
  return isMember(ruleCoreSpellInvalidReasons, reason);
}

function isMember<const T extends readonly string[]>(
  values: T,
  value: string,
): value is T[number] {
  return values.includes(value);
}
