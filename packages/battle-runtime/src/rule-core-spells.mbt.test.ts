// RAW-COVERAGE: verification-owner:focused-mbt RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield spell.readied-action-time-spell
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.HIT_POINT_RESTORATION BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt spell-procedure-core magic_missile ray_of_frost acid_splash
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt healing-stabilization healing_word cure_wounds
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-MASS-CURE-WOUNDS mass_cure_wounds
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-MASS-HEALING-WORD mass_healing_word
// UNIT-IDENTITY-MBT-REPLAY: spell-procedure-core magic_missile doMagicMissileNeedsAllocation doMagicMissileLow doReadySpellHold doReleaseReadiedSpell
// UNIT-IDENTITY-MBT-REPLAY: spell-procedure-core ray_of_frost doRayOfFrostNeedsTarget doRayOfFrostNeedsAttackRoll doRayOfFrostNeedsDamageRoll doRayOfFrostMiss doRayOfFrostHit doRayOfFrostCritical
// UNIT-IDENTITY-MBT-REPLAY: spell-procedure-core acid_splash doAcidSplashNeedsSavingThrow doAcidSplashNeedsDamageRoll doAcidSplashAllSuccess doAcidSplashOneFail
// UNIT-IDENTITY-MBT-REPLAY: healing-stabilization healing_word doHealingWordNeedsTarget doHealingWordNeedsHealingRoll doHealingWordWounded doHealingWordZeroHp
// UNIT-IDENTITY-MBT-REPLAY: healing-stabilization cure_wounds doCureWoundsNeedsTarget doCureWoundsNeedsHealingRoll doCureWoundsWounded
// UNIT-IDENTITY-MBT-REPLAY: L1H-MASS-CURE-WOUNDS mass_cure_wounds doMassCureWoundsNeedsTargetList doMassCureWoundsNeedsHealingRoll doMassCureWoundsWounded
// UNIT-IDENTITY-MBT-REPLAY: L1H-MASS-HEALING-WORD mass_healing_word doMassHealingWordNeedsTargetList doMassHealingWordNeedsHealingRoll doMassHealingWordWounded
import { isDeepStrictEqual } from "node:util";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

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
  spellSlotLevel,
} from "@dnd/shared/types";
import acidSplashInput from "../../surface/content/acid_splash.json";
import cureWoundsInput from "../../surface/content/cure_wounds.json";
import healingWordInput from "../../surface/content/healing_word.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import massCureWoundsInput from "../../surface/content/mass_cure_wounds.json";
import massHealingWordInput from "../../surface/content/mass_healing_word.json";
import magicMissileInput from "../../surface/content/magic_missile.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleAreaId,
  battleCombatantSide,
  battleId,
  cantripSpellInvocationRef,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleRolledDiceFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SpellInvocationRef,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { repeatedDamageAllocationAdmissionFacts } from "./battle-reducer/spell-procedure-profiles/repeated-damage-allocation-facts.ts";

const ruleCoreSpellMbtHoles = [
  "TargetChoice",
  "SpellTargetAllocation",
  "SpellTargetList",
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

type RuleCoreSpellProjection = RuleCoreComponentRoutedProjection & {
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
const componentOwner = "RuleCoreSpellProcedureProfileOwner";

const spellRecords = new Map(
  [
    decodeSpellRecord(magicMissileInput),
    decodeSpellRecord(rayOfFrostInput),
    decodeSpellRecord(acidSplashInput),
    decodeSpellRecord(cureWoundsInput),
    decodeSpellRecord(healingWordInput),
    decodeSpellRecord(massCureWoundsInput),
    decodeSpellRecord(massHealingWordInput),
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
  doCureWoundsNeedsTarget: {},
  doCureWoundsNeedsHealingRoll: {},
  doCureWoundsWounded: {},
  doMassHealingWordNeedsTargetList: {},
  doMassHealingWordNeedsHealingRoll: {},
  doMassHealingWordWounded: {},
  doMassCureWoundsNeedsTargetList: {},
  doMassCureWoundsNeedsHealingRoll: {},
  doMassCureWoundsWounded: {},
  doMageArmorNeedsTarget: {},
  doMageArmor: {},
  doRejectSecondSlotSpell: {},
  doReadySpellHold: {},
  doReleaseReadiedSpell: {},
  step: {},
} as const;
type RuleCoreSpellDriverAction = Exclude<
  keyof typeof driverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RuleCoreSpellDriverAction[];
  readonly expected: RuleCoreSpellProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId:
    | "spell-procedure-core"
    | "healing-stabilization"
    | "L1H-MASS-CURE-WOUNDS"
    | "L1H-MASS-HEALING-WORD";
  readonly unitId: string;
  readonly actions: readonly RuleCoreSpellDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitRuntimeBoundaryIds = new Set<string>();
const magicMissileLevelOneRepeatedEffectCount = 3;

const selectedUnitIdentityReplays = [
  {
    taskId: "spell-procedure-core",
    unitId: "magic_missile",
    actions: [
      "doMagicMissileNeedsAllocation",
      "doMagicMissileLow",
      "doReadySpellHold",
      "doReleaseReadiedSpell",
    ],
    sequences: [
      {
        name: "allocation-hole",
        actions: ["doMagicMissileNeedsAllocation"],
        expected: expectedSpellProjection({
          holes: ["SpellTargetAllocation"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "allocated-damage",
        actions: ["doMagicMissileLow"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 4,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "readied-hold",
        actions: ["doReadySpellHold"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          readiedHeld: true,
          concentrationActive: true,
          lastResult: "resolved",
        }),
      },
      {
        name: "readied-release",
        actions: ["doReleaseReadiedSpell"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          casterReactionAvailable: false,
          casterHp: 11,
          targetHp: 4,
          level1SlotsRemaining: 1,
          readiedReleased: true,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "spell-procedure-core",
    unitId: "ray_of_frost",
    actions: [
      "doRayOfFrostNeedsTarget",
      "doRayOfFrostNeedsAttackRoll",
      "doRayOfFrostNeedsDamageRoll",
      "doRayOfFrostMiss",
      "doRayOfFrostHit",
      "doRayOfFrostCritical",
    ],
    sequences: [
      {
        name: "target-hole",
        actions: ["doRayOfFrostNeedsTarget"],
        expected: expectedSpellProjection({
          holes: ["TargetChoice"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "attack-roll-hole",
        actions: ["doRayOfFrostNeedsAttackRoll"],
        expected: expectedSpellProjection({
          holes: ["AttackRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "damage-roll-hole",
        actions: ["doRayOfFrostNeedsDamageRoll"],
        expected: expectedSpellProjection({
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "miss",
        actions: ["doRayOfFrostMiss"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
      {
        name: "hit-speed-reduction",
        actions: ["doRayOfFrostHit"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 9,
          activeEffectKind: "speedDelta",
          lastResult: "resolved",
        }),
      },
      {
        name: "critical",
        actions: ["doRayOfFrostCritical"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 5,
          activeEffectKind: "speedDelta",
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "spell-procedure-core",
    unitId: "acid_splash",
    actions: [
      "doAcidSplashNeedsSavingThrow",
      "doAcidSplashNeedsDamageRoll",
      "doAcidSplashAllSuccess",
      "doAcidSplashOneFail",
    ],
    sequences: [
      {
        name: "saving-throw-hole",
        actions: ["doAcidSplashNeedsSavingThrow"],
        expected: expectedSpellProjection({
          holes: ["SavingThrowOutcome"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "damage-roll-hole",
        actions: ["doAcidSplashNeedsDamageRoll"],
        expected: expectedSpellProjection({
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "all-success",
        actions: ["doAcidSplashAllSuccess"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
      {
        name: "one-failed-save",
        actions: ["doAcidSplashOneFail"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 9,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "healing-stabilization",
    unitId: "healing_word",
    actions: [
      "doHealingWordNeedsTarget",
      "doHealingWordNeedsHealingRoll",
      "doHealingWordWounded",
      "doHealingWordZeroHp",
    ],
    sequences: [
      {
        name: "target-hole",
        actions: ["doHealingWordNeedsTarget"],
        expected: expectedSpellProjection({
          targetHp: 4,
          holes: ["TargetChoice"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "healing-roll-hole",
        actions: ["doHealingWordNeedsHealingRoll"],
        expected: expectedSpellProjection({
          targetHp: 4,
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "wounded-target",
        actions: ["doHealingWordWounded"],
        expected: expectedSpellProjection({
          bonusActionAvailable: false,
          targetHp: 12,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "zero-hp-target",
        actions: ["doHealingWordZeroHp"],
        expected: expectedSpellProjection({
          bonusActionAvailable: false,
          targetHp: 5,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "healing-stabilization",
    unitId: "cure_wounds",
    actions: [
      "doCureWoundsNeedsTarget",
      "doCureWoundsNeedsHealingRoll",
      "doCureWoundsWounded",
    ],
    sequences: [
      {
        name: "target-hole",
        actions: ["doCureWoundsNeedsTarget"],
        expected: expectedSpellProjection({
          targetHp: 4,
          holes: ["TargetChoice"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "healing-roll-hole",
        actions: ["doCureWoundsNeedsHealingRoll"],
        expected: expectedSpellProjection({
          targetHp: 4,
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "wounded-target",
        actions: ["doCureWoundsWounded"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 12,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-MASS-HEALING-WORD",
    unitId: "mass_healing_word",
    actions: [
      "doMassHealingWordNeedsTargetList",
      "doMassHealingWordNeedsHealingRoll",
      "doMassHealingWordWounded",
    ],
    sequences: [
      {
        name: "target-list-hole",
        actions: ["doMassHealingWordNeedsTargetList"],
        expected: expectedSpellProjection({
          targetHp: 4,
          secondTargetHp: 4,
          level1SlotsRemaining: 0,
          holes: ["SpellTargetList"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "healing-roll-hole",
        actions: ["doMassHealingWordNeedsHealingRoll"],
        expected: expectedSpellProjection({
          targetHp: 4,
          secondTargetHp: 4,
          level1SlotsRemaining: 0,
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "wounded-targets",
        actions: ["doMassHealingWordWounded"],
        expected: expectedSpellProjection({
          bonusActionAvailable: false,
          targetHp: 12,
          secondTargetHp: 12,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-MASS-CURE-WOUNDS",
    unitId: "mass_cure_wounds",
    actions: [
      "doMassCureWoundsNeedsTargetList",
      "doMassCureWoundsNeedsHealingRoll",
      "doMassCureWoundsWounded",
    ],
    sequences: [
      {
        name: "target-list-hole",
        actions: ["doMassCureWoundsNeedsTargetList"],
        expected: expectedSpellProjection({
          targetHp: 4,
          secondTargetHp: 4,
          level1SlotsRemaining: 0,
          holes: ["SpellTargetList"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "healing-roll-hole",
        actions: ["doMassCureWoundsNeedsHealingRoll"],
        expected: expectedSpellProjection({
          targetHp: 4,
          secondTargetHp: 4,
          level1SlotsRemaining: 0,
          holes: ["DamageRoll"],
          lastResult: "needsHoles",
        }),
      },
      {
        name: "wounded-targets",
        actions: ["doMassCureWoundsWounded"],
        expected: expectedSpellProjection({
          actionAvailable: false,
          targetHp: 12,
          secondTargetHp: 12,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 0,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

function expectedSpellProjection(
  overrides: Partial<Omit<RuleCoreSpellProjection, "componentRoute">> = {},
): RuleCoreSpellProjection {
  return withRuleCoreComponentRoute(componentOwner, {
    actionAvailable: true,
    bonusActionAvailable: true,
    casterReactionAvailable: true,
    casterHp: 12,
    targetHp: 13,
    secondTargetHp: 13,
    targetUnconscious: false,
    targetDeathSuccesses: 0,
    targetDeathFailures: 0,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    activeEffectKind: "none",
    readiedHeld: false,
    readiedReleased: false,
    concentrationActive: false,
    holes: [],
    lastResult: "init",
    lastInvalidReason: "none",
    ...overrides,
  });
}

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

function magicMissileRepeatedDamageAllocationRef(): SpellInvocationRef {
  const facts = repeatedDamageAllocationAdmissionFacts({
    selectedSlotLevel: spellSlotLevel(1),
    repeatedEffectCount: magicMissileLevelOneRepeatedEffectCount,
  });
  return spellSlotInvocationRef(
    recordSelectedUnitRuntimeBoundaryId("magic_missile"),
    facts.selectedSlotLevel,
    "repeatedDamageAllocation",
  );
}

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
              magicMissileRepeatedDamageAllocationRef(),
            ),
            fills: [],
          }),
        );
      },
      doMagicMissileLow: () => {
        state = spellBattle();
        resetProjection();
        const subject = actionSpellSubject(
          magicMissileRepeatedDamageAllocationRef(),
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
        resolveSingleTargetHealingSpell({
          spellId: "healing_word",
          subject: healingSpellSubject("healing_word", "bonusActionSpell", 1),
          healingGroups: [[4, 3]],
        });
      },
      doHealingWordZeroHp: () => {
        state = spellBattle({
          targetHp: 0,
          targetDeathSaves: { successes: 1, failures: 1 },
          preparedSpells: [spellRecord("healing_word")],
        });
        resetProjection();
        resolveSingleTargetHealingSpell({
          spellId: "healing_word",
          subject: healingSpellSubject("healing_word", "bonusActionSpell", 1),
          healingGroups: [[1, 1]],
        });
      },
      doCureWoundsNeedsTarget: () =>
        resolveSingleTargetHealingSpellStaged({
          spellId: "cure_wounds",
          subject: healingSpellSubject("cure_wounds", "actionSpell", 1),
          stopAt: "target",
        }),
      doCureWoundsNeedsHealingRoll: () =>
        resolveSingleTargetHealingSpellStaged({
          spellId: "cure_wounds",
          subject: healingSpellSubject("cure_wounds", "actionSpell", 1),
          stopAt: "healingRoll",
        }),
      doCureWoundsWounded: () => {
        state = spellBattle({
          targetHp: 4,
          preparedSpells: [spellRecord("cure_wounds")],
        });
        resetProjection();
        resolveSingleTargetHealingSpell({
          spellId: "cure_wounds",
          subject: healingSpellSubject("cure_wounds", "actionSpell", 1),
          healingGroups: [[4, 3]],
        });
      },
      doMassHealingWordNeedsTargetList: () =>
        resolveMassHealingWordStaged("targetList"),
      doMassHealingWordNeedsHealingRoll: () =>
        resolveMassHealingWordStaged("healingRoll"),
      doMassHealingWordWounded: () => {
        state = spellBattle({
          targetHp: 4,
          secondTargetHp: 4,
          preparedSpells: [spellRecord("mass_healing_word")],
          includeSecondTarget: true,
          spellSlots: [{ spellLevel: 3, count: 1 }],
        });
        resetProjection();
        resolveMassHealingWord([[4, 3]]);
      },
      doMassCureWoundsNeedsTargetList: () =>
        resolveMassCureWoundsStaged("targetList"),
      doMassCureWoundsNeedsHealingRoll: () =>
        resolveMassCureWoundsStaged("healingRoll"),
      doMassCureWoundsWounded: () => {
        state = spellBattle({
          targetHp: 4,
          secondTargetHp: 4,
          preparedSpells: [spellRecord("mass_cure_wounds")],
          includeSecondTarget: true,
          spellSlots: [{ spellLevel: 5, count: 1 }],
        });
        resetProjection();
        resolveMassCureWounds([[4, 4, 4, 4, 4]]);
      },
      doMageArmor: () => {
        state = spellBattle({
          preparedSpells: [spellRecord("mage_armor")],
          casterArmorClass: unarmoredDexArmorClass(),
        });
        resetProjection();
        const subject = actionSpellSubject(
          spellSlotInvocationRef("mage_armor", 1, "persistentArmorEffect"),
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
              spellSlotInvocationRef("mage_armor", 1, "persistentArmorEffect"),
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
          magicMissileRepeatedDamageAllocationRef(),
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
              invocation: spellSlotInvocationRef(
                "healing_word",
                1,
                "directHitPointRestoration",
              ),
              mode: { tag: "cast" },
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
          invocation: magicMissileRepeatedDamageAllocationRef(),
          mode: { tag: "ready", trigger: "attackHit" },
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
            invocation: magicMissileRepeatedDamageAllocationRef(),
            mode: { tag: "ready", trigger: "attackHit" },
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
        const releaseChoice = attackHit.snapshot.pendingInterrupt?.choices.find(
          (candidate) =>
            candidate.kind === "releaseReadiedSpell" &&
            candidate.readiedSpellCasterId === casterId,
        );
        if (releaseChoice?.kind !== "releaseReadiedSpell") {
          throw new Error("Expected Readied Spell release choice.");
        }
        recordResult(
          resolveBattleInterrupt({
            state,
            fill: interruptDecisionFill(
              requireHoleFromList(holes, "interruptDecision"),
              {
                kind: "resolve",
                responderId: casterId,
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
        cantripSpellInvocationRef(
          recordSelectedUnitRuntimeBoundaryId("ray_of_frost"),
          "spellAttackDamage",
        ),
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
        cantripSpellInvocationRef(
          recordSelectedUnitRuntimeBoundaryId("ray_of_frost"),
          "spellAttackDamage",
        ),
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
        cantripSpellInvocationRef(
          recordSelectedUnitRuntimeBoundaryId("acid_splash"),
          "saveGatedDamage",
        ),
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
        cantripSpellInvocationRef(
          recordSelectedUnitRuntimeBoundaryId("acid_splash"),
          "saveGatedDamage",
        ),
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
      resolveSingleTargetHealingSpellStaged({
        spellId: "healing_word",
        subject: healingSpellSubject("healing_word", "bonusActionSpell", 1),
        stopAt,
      });
    }

    function resolveSingleTargetHealingSpellStaged(input: {
      readonly spellId: DirectHitPointRestorationSpellId;
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "actionSpell" | "bonusActionSpell" }
      >;
      readonly stopAt: "target" | "healingRoll";
    }): void {
      state = spellBattle({
        targetHp: 4,
        preparedSpells: [spellRecord(input.spellId)],
      });
      resetProjection();
      if (input.stopAt === "target") {
        recordResult(
          resolveBattleSubject({ state, subject: input.subject, fills: [] }),
        );
        return;
      }
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, input.subject),
      );
      if (act === undefined) {
        throw new Error(`Expected ${input.spellId} healing spell act.`);
      }
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      recordResult(
        resolveBattleSubject({
          state,
          subject: input.subject,
          fills: [spellTargetFill(target, input.spellId, casterId, targetId)],
        }),
      );
    }

    function resolveSingleTargetHealingSpell(input: {
      readonly spellId: DirectHitPointRestorationSpellId;
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "actionSpell" | "bonusActionSpell" }
      >;
      readonly healingGroups: readonly (readonly number[])[];
    }): void {
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, input.subject),
      );
      if (act === undefined) {
        throw new Error(`Expected ${input.spellId} healing spell act.`);
      }
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      const targetFill = spellTargetFill(
        target,
        input.spellId,
        casterId,
        targetId,
      );
      const healing = requireHole(
        resolveBattleSubject({
          state,
          subject: input.subject,
          fills: [targetFill],
        }),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject: input.subject,
          fills: [
            targetFill,
            damageRollFillWithGroups(healing, input.healingGroups),
          ],
        }),
      );
    }

    function resolveMassHealingWordStaged(
      stopAt: "targetList" | "healingRoll",
    ): void {
      state = spellBattle({
        targetHp: 4,
        secondTargetHp: 4,
        preparedSpells: [spellRecord("mass_healing_word")],
        includeSecondTarget: true,
        spellSlots: [{ spellLevel: 3, count: 1 }],
      });
      resetProjection();
      const subject = healingSpellSubject(
        "mass_healing_word",
        "bonusActionSpell",
        3,
      );
      if (stopAt === "targetList") {
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
        return;
      }
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Mass Healing Word Bonus Action spell act.");
      }
      const targetList = requireHoleFromList(
        act.initialHoles,
        "spellTargetList",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [spellTargetListFill(targetList, "mass_healing_word")],
        }),
      );
    }

    function resolveMassHealingWord(
      healingGroups: readonly (readonly number[])[],
    ): void {
      const subject = healingSpellSubject(
        "mass_healing_word",
        "bonusActionSpell",
        3,
      );
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Mass Healing Word Bonus Action spell act.");
      }
      const targetList = requireHoleFromList(
        act.initialHoles,
        "spellTargetList",
      );
      const targetFill = spellTargetListFill(targetList, "mass_healing_word");
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

    function resolveMassCureWoundsStaged(
      stopAt: "targetList" | "healingRoll",
    ): void {
      state = spellBattle({
        targetHp: 4,
        secondTargetHp: 4,
        preparedSpells: [spellRecord("mass_cure_wounds")],
        includeSecondTarget: true,
        spellSlots: [{ spellLevel: 5, count: 1 }],
      });
      resetProjection();
      const subject = healingSpellSubject("mass_cure_wounds", "actionSpell", 5);
      if (stopAt === "targetList") {
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
        return;
      }
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Mass Cure Wounds Action spell act.");
      }
      const targetList = requireHoleFromList(
        act.initialHoles,
        "spellTargetList",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [spellTargetListFill(targetList, "mass_cure_wounds")],
        }),
      );
    }

    function resolveMassCureWounds(
      healingGroups: readonly (readonly number[])[],
    ): void {
      const subject = healingSpellSubject("mass_cure_wounds", "actionSpell", 5);
      const act = discoverBattleActs(state).find((candidate) =>
        isDeepStrictEqual(candidate.subject, subject),
      );
      if (act === undefined) {
        throw new Error("Expected Mass Cure Wounds Action spell act.");
      }
      const targetList = requireHoleFromList(
        act.initialHoles,
        "spellTargetList",
      );
      const targetFill = spellTargetListFill(targetList, "mass_cure_wounds");
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
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<RuleCoreSpellDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createRuleCoreSpellDriver()();

        for (const actionName of sequence.actions) {
          resetSelectedUnitRuntimeBoundaryIds();
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing rule-core Spell driver action ${actionName}.`,
            );
          }
          await action.handler({});
          expect(
            selectedUnitRuntimeBoundaryIds.has(replay.unitId),
            `${replay.unitId}:${sequence.name}:${actionName} must bind its Unit id`,
          ).toBe(true);
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error("Rule-core Spell driver must expose getState.");
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it(
    "replays QCORE10 spell procedure parity through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "rule-core-spells.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createRuleCoreSpellDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreSpellDefaultMbtSteps),
        stateCheck: spellStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function spellBattle(
  input: {
    readonly targetHp?: number;
    readonly secondTargetHp?: number;
    readonly preparedSpells?: readonly SpellRecord[];
    readonly includeSecondTarget?: boolean;
    readonly spellSlots?: readonly {
      readonly spellLevel: 1 | 3 | 5;
      readonly count: number;
    }[];
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
        ...(input.spellSlots === undefined
          ? {}
          : { spellSlots: input.spellSlots }),
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
              currentHp: input.secondTargetHp ?? 13,
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
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 3 | 5;
    readonly count: number;
  }[];
}): BattleCreatureInit {
  return characterCreature({
    combatantId: casterId,
    displayName: "Spellcaster",
    initiative: input.initiative,
    side: partySide,
    spellcasting: {
      sourceClassName: "wizard",
      spellcastingAbilityModifier: 3,
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: [spellRecord("ray_of_frost"), spellRecord("acid_splash")],
      preparedSpells: input.preparedSpells ?? [
        spellRecord("magic_missile"),
        spellRecord("healing_word"),
        spellRecord("mage_armor"),
      ],
      featurePreparedSpells: [],
      spellbookRitualSpellAccesses: [],
      invocationSpellAccesses: [],
      spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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

type DirectHitPointRestorationSpellId =
  | "healing_word"
  | "cure_wounds"
  | "mass_cure_wounds"
  | "mass_healing_word";

function actionSpellSubject(
  invocation: SpellInvocationRef,
  mode: Extract<BattleSubject, { readonly tag: "actionSpell" }>["mode"] = {
    tag: "cast",
  },
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: casterId,
    invocation,
    mode,
  };
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

function healingSpellSubject(
  spellId: DirectHitPointRestorationSpellId,
  subjectTag: "actionSpell" | "bonusActionSpell",
  slotLevel: 1 | 3 | 5,
): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
> {
  return {
    tag: subjectTag,
    actorId: casterId,
    invocation: spellSlotInvocationRef(
      recordSelectedUnitRuntimeBoundaryId(spellId),
      slotLevel,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
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
  spellId: "mage_armor" | "ray_of_frost" | DirectHitPointRestorationSpellId,
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

function spellTargetListFill(
  hole: BattleHole,
  spellId: "mass_healing_word" | "mass_cure_wounds",
): BattleFill {
  if (hole.kind !== "spellTargetList") {
    throw new Error("Expected spellTargetList hole.");
  }
  const targetIds = [targetId, secondTargetId];
  if (hole.spell.targeting.kind === "pointOriginSphereTargetList") {
    return {
      kind: "spellTargetList",
      holeId: hole.holeId,
      value: { targetIds },
      spatialFacts: [
        {
          kind: "spellTargetsInPointOriginSphere",
          casterId,
          spellId,
          areaId: battleAreaId(`mbt:${spellId}:point-origin-sphere`),
          radiusFeet: hole.spell.targeting.area.radiusFeet,
          targetIds,
        },
      ],
    };
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((spellTargetId) => ({
      kind: "spellTarget",
      casterId,
      targetId: spellTargetId,
      spellId,
    })),
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
  if (!("spell" in hole)) {
    throw new Error("Expected spell Saving Throw outcome hole.");
  }
  if (hole.spell.targeting.kind === "singleCombatant") {
    throw new Error("Expected area spell Saving Throw outcome hole.");
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

function interruptDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  if (hole.kind !== "interruptDecision") {
    throw new Error("Expected interruptDecision hole.");
  }
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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
  return withRuleCoreComponentRoute(componentOwner, {
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
      input.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
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
  });
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
  if (hole.kind === "spellTargetList") return "SpellTargetList";
  if (hole.kind === "attackRoll") return "AttackRoll";
  if (hole.kind === "savingThrowOutcome") return "SavingThrowOutcome";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(`Unexpected rule-core Spell MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreSpellQuintState(
  raw: unknown,
): RuleCoreSpellProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: (rawHole) => spellHoleName(spellHoleTag(rawHole)),
    compareHoles: (left, right) => left.localeCompare(right),
  });
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
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
    holes: protocol.holes,
    lastResult: spellResult(protocol.lastResult),
    lastInvalidReason: spellInvalidReason(protocol.lastInvalidReason),
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
    | DirectHitPointRestorationSpellId,
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
