// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.attack-procedure
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
import { movementFeet } from "@dnd/shared/types";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { isDeepStrictEqual } from "node:util";

import { Either, Match } from "effect";
import { describe, it } from "vitest";

import type {
  AuthoredExecutableProcedure,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";

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
  quintVariantMappedValue,
  run,
  stateCheck,
  type MbtWitnessLastInvalidReason,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  attackRollFill,
  authoredProcedureOrdinal,
  damageRollFillWithGroups,
  hasCondition,
  nonSpellExecutableProcedureEntry,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { StatBlockAttackActionOption } from "./battle-action-options.ts";
import { attackActionOptionForSubject } from "./battle-reducer/attack-damage-apply.ts";
import {
  attackDamageByTypeEntries,
  fixedAttackDamageByTypeEntries,
  type DamageAmountByTypeEntry,
} from "./battle-reducer/damage-helpers.ts";
import {
  statBlockAdvantageBonusDamageComponentRef,
  statBlockAttackDamageSelection,
  statBlockAttackDamageSelectionsEqual,
  statBlockBaseDamageComponentOrdinal,
  statBlockBaseDamageComponentRef,
  type StatBlockAttackDamageSelection,
} from "./stat-block-attack-damage-selection.ts";
import {
  battleId,
  combatantId,
  discoverBattleActCandidates,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const STAT_BLOCK_ATTACK_PARITY_SCENARIOS = [
  "staticOnlyHit",
  "singleRollableSelectedStaticHit",
  "singleRollableSelectedRolledHit",
  "singleRollableSelectedRolledMiss",
  "singleRollableSelectedRolledCritical",
  "twoRollableHeterogeneousHit",
  "twoRollableTypedImmunityHit",
  "twoDistinctStaticAggregationHit",
  "intrinsicStaticAndRollableHit",
  "advantageBonusRiderHit",
  "normalRollAdvantageBonusInactiveHit",
  "advantageBonusRiderMiss",
] as const;
type StatBlockAttackParityScenario =
  (typeof STAT_BLOCK_ATTACK_PARITY_SCENARIOS)[number];

const STAT_BLOCK_ATTACK_FIXTURE_FAMILIES = [
  "staticOnly",
  "singleRollable",
  "twoRollable",
  "intrinsicStaticAndRollable",
  "advantageBonusAndRider",
] as const;
type StatBlockAttackFixtureFamily =
  (typeof STAT_BLOCK_ATTACK_FIXTURE_FAMILIES)[number];

const STAT_BLOCK_ATTACK_TARGET_DAMAGE_ADJUSTMENTS = [
  "none",
  "piercingImmunity",
] as const;
type StatBlockAttackTargetDamageAdjustment =
  (typeof STAT_BLOCK_ATTACK_TARGET_DAMAGE_ADJUSTMENTS)[number];

type StatBlockAttackParityHole = "TargetChoice" | "AttackRoll" | "DamageRoll";

type StatBlockAttackParityProjection = {
  readonly scenario: StatBlockAttackParityScenario;
  readonly targetHp: number;
  readonly targetProne: boolean;
  readonly attackHits: boolean;
  readonly critical: boolean;
  readonly rawDamageAmount: number;
  readonly adjustedDamageAmount: number;
  readonly factsLegal: boolean;
  readonly holes: readonly StatBlockAttackParityHole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: MbtWitnessLastInvalidReason<"none">;
};

type StatBlockAttack = Extract<
  AuthoredExecutableProcedure,
  { readonly kind: "attack_roll" }
>;

type ScenarioConfiguration = {
  readonly scenario: StatBlockAttackParityScenario;
  readonly quintInit: string;
  readonly family: StatBlockAttackFixtureFamily;
  readonly targetDamageAdjustment: StatBlockAttackTargetDamageAdjustment;
  readonly damageSelection: StatBlockAttackDamageSelection;
  readonly attackRoll: {
    readonly naturalD20: number;
    readonly total: number;
    readonly mode: "normal" | "advantage";
  };
  readonly damageRollGroups: readonly (readonly number[])[];
};

const actorId = combatantId("stat-block-attack-parity-actor");
const targetId = combatantId("stat-block-attack-parity-target");
const allyId = combatantId("stat-block-attack-parity-ally");
const targetInitialHp = 40;
const fixtureAttackProcedureOrdinal = 1;

const SCENARIO_BY_TAG = {
  StaticOnlyHit: "staticOnlyHit",
  SingleRollableSelectedStaticHit: "singleRollableSelectedStaticHit",
  SingleRollableSelectedRolledHit: "singleRollableSelectedRolledHit",
  SingleRollableSelectedRolledMiss: "singleRollableSelectedRolledMiss",
  SingleRollableSelectedRolledCritical: "singleRollableSelectedRolledCritical",
  TwoRollableHeterogeneousHit: "twoRollableHeterogeneousHit",
  TwoRollableTypedImmunityHit: "twoRollableTypedImmunityHit",
  TwoDistinctStaticAggregationHit: "twoDistinctStaticAggregationHit",
  IntrinsicStaticAndRollableHit: "intrinsicStaticAndRollableHit",
  AdvantageBonusRiderHit: "advantageBonusRiderHit",
  NormalRollAdvantageBonusInactiveHit: "normalRollAdvantageBonusInactiveHit",
  AdvantageBonusRiderMiss: "advantageBonusRiderMiss",
} as const satisfies Readonly<Record<string, StatBlockAttackParityScenario>>;

const HOLE_BY_TAG = {
  TargetChoice: "TargetChoice",
  AttackRoll: "AttackRoll",
  DamageRoll: "DamageRoll",
} as const satisfies Readonly<Record<string, StatBlockAttackParityHole>>;

const DRIVER_SCHEMA = {
  initStaticOnlyHit: {},
  initSingleRollableSelectedStaticHit: {},
  initSingleRollableSelectedRolledHit: {},
  initSingleRollableSelectedRolledMiss: {},
  initSingleRollableSelectedRolledCritical: {},
  initTwoRollableHeterogeneousHit: {},
  initTwoRollableTypedImmunityHit: {},
  initTwoDistinctStaticAggregationHit: {},
  initIntrinsicStaticAndRollableHit: {},
  initAdvantageBonusRiderHit: {},
  initNormalRollAdvantageBonusInactiveHit: {},
  initAdvantageBonusRiderMiss: {},
  doFillTargetChoice: {},
  doFillAttackRoll: {},
  doFillDamageRoll: {},
  step: {},
} as const;

const HIT_ROLL = {
  naturalD20: 12,
  total: 18,
  mode: "normal",
} as const;
const MISS_ROLL = {
  naturalD20: 2,
  total: 8,
  mode: "normal",
} as const;
const CRITICAL_ROLL = {
  naturalD20: 20,
  total: 8,
  mode: "normal",
} as const;
const ADVANTAGE_HIT_ROLL = { ...HIT_ROLL, mode: "advantage" } as const;
const ADVANTAGE_MISS_ROLL = { ...MISS_ROLL, mode: "advantage" } as const;

const scenarioConfigurations = [
  {
    scenario: "staticOnlyHit",
    quintInit: "initStaticOnlyHit",
    family: "staticOnly",
    targetDamageAdjustment: "none",
    damageSelection: singleBaseDamageSelection("static"),
    attackRoll: HIT_ROLL,
    damageRollGroups: [],
  },
  {
    scenario: "singleRollableSelectedStaticHit",
    quintInit: "initSingleRollableSelectedStaticHit",
    family: "singleRollable",
    targetDamageAdjustment: "none",
    damageSelection: singleBaseDamageSelection("static"),
    attackRoll: HIT_ROLL,
    damageRollGroups: [],
  },
  {
    scenario: "singleRollableSelectedRolledHit",
    quintInit: "initSingleRollableSelectedRolledHit",
    family: "singleRollable",
    targetDamageAdjustment: "none",
    damageSelection: singleBaseDamageSelection("rolled"),
    attackRoll: HIT_ROLL,
    damageRollGroups: [[3]],
  },
  {
    scenario: "singleRollableSelectedRolledMiss",
    quintInit: "initSingleRollableSelectedRolledMiss",
    family: "singleRollable",
    targetDamageAdjustment: "none",
    damageSelection: singleBaseDamageSelection("rolled"),
    attackRoll: MISS_ROLL,
    damageRollGroups: [],
  },
  {
    scenario: "singleRollableSelectedRolledCritical",
    quintInit: "initSingleRollableSelectedRolledCritical",
    family: "singleRollable",
    targetDamageAdjustment: "none",
    damageSelection: singleBaseDamageSelection("rolled"),
    attackRoll: CRITICAL_ROLL,
    damageRollGroups: [[3, 4]],
  },
  {
    scenario: "twoRollableHeterogeneousHit",
    quintInit: "initTwoRollableHeterogeneousHit",
    family: "twoRollable",
    targetDamageAdjustment: "none",
    damageSelection: twoBaseDamageSelection({
      firstBaseComponent: "static",
      secondBaseComponent: "rolled",
    }),
    attackRoll: HIT_ROLL,
    damageRollGroups: [[4]],
  },
  {
    scenario: "twoRollableTypedImmunityHit",
    quintInit: "initTwoRollableTypedImmunityHit",
    family: "twoRollable",
    targetDamageAdjustment: "piercingImmunity",
    damageSelection: twoBaseDamageSelection({
      firstBaseComponent: "static",
      secondBaseComponent: "rolled",
    }),
    attackRoll: HIT_ROLL,
    damageRollGroups: [[4]],
  },
  {
    scenario: "twoDistinctStaticAggregationHit",
    quintInit: "initTwoDistinctStaticAggregationHit",
    family: "twoRollable",
    targetDamageAdjustment: "none",
    damageSelection: twoBaseDamageSelection({
      firstBaseComponent: "static",
      secondBaseComponent: "static",
    }),
    attackRoll: HIT_ROLL,
    damageRollGroups: [],
  },
  {
    scenario: "intrinsicStaticAndRollableHit",
    quintInit: "initIntrinsicStaticAndRollableHit",
    family: "intrinsicStaticAndRollable",
    targetDamageAdjustment: "none",
    damageSelection: twoBaseDamageSelection({
      firstBaseComponent: "static",
      secondBaseComponent: "rolled",
    }),
    attackRoll: HIT_ROLL,
    damageRollGroups: [[4]],
  },
  {
    scenario: "advantageBonusRiderHit",
    quintInit: "initAdvantageBonusRiderHit",
    family: "advantageBonusAndRider",
    targetDamageAdjustment: "none",
    damageSelection: baseAndAdvantageBonusDamageSelection({
      baseComponent: "static",
      advantageBonusComponent: "rolled",
    }),
    attackRoll: ADVANTAGE_HIT_ROLL,
    damageRollGroups: [[3]],
  },
  {
    scenario: "normalRollAdvantageBonusInactiveHit",
    quintInit: "initNormalRollAdvantageBonusInactiveHit",
    family: "advantageBonusAndRider",
    targetDamageAdjustment: "none",
    damageSelection: baseAndAdvantageBonusDamageSelection({
      baseComponent: "static",
      advantageBonusComponent: "rolled",
    }),
    attackRoll: HIT_ROLL,
    damageRollGroups: [],
  },
  {
    scenario: "advantageBonusRiderMiss",
    quintInit: "initAdvantageBonusRiderMiss",
    family: "advantageBonusAndRider",
    targetDamageAdjustment: "none",
    damageSelection: baseAndAdvantageBonusDamageSelection({
      baseComponent: "static",
      advantageBonusComponent: "rolled",
    }),
    attackRoll: ADVANTAGE_MISS_ROLL,
    damageRollGroups: [],
  },
] as const satisfies readonly ScenarioConfiguration[];

function assertScenarioConfigurationCoverage(): void {
  const scenarios = new Set(
    scenarioConfigurations.map(({ scenario }) => scenario),
  );
  const fixtureFamilies = new Set(
    scenarioConfigurations.map(({ family }) => family),
  );
  const targetDamageAdjustments = new Set(
    scenarioConfigurations.map(
      ({ targetDamageAdjustment }) => targetDamageAdjustment,
    ),
  );
  if (
    scenarioConfigurations.length !==
      STAT_BLOCK_ATTACK_PARITY_SCENARIOS.length ||
    scenarios.size !== STAT_BLOCK_ATTACK_PARITY_SCENARIOS.length ||
    !STAT_BLOCK_ATTACK_PARITY_SCENARIOS.every((scenario) =>
      scenarios.has(scenario),
    ) ||
    !STAT_BLOCK_ATTACK_FIXTURE_FAMILIES.every((family) =>
      fixtureFamilies.has(family),
    ) ||
    !STAT_BLOCK_ATTACK_TARGET_DAMAGE_ADJUSTMENTS.every((adjustment) =>
      targetDamageAdjustments.has(adjustment),
    )
  ) {
    throw new Error(
      "Stat Block attack parity scenarios must cover each scenario, fixture family, and target damage adjustment exactly as declared.",
    );
  }
}

assertScenarioConfigurationCoverage();

function singleBaseDamageSelection(
  notation: "rolled" | "static",
): StatBlockAttackDamageSelection {
  return Either.getOrThrow(
    statBlockAttackDamageSelection([
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation,
      },
    ]),
  );
}

function twoBaseDamageSelection(input: {
  readonly firstBaseComponent: "rolled" | "static";
  readonly secondBaseComponent: "rolled" | "static";
}): StatBlockAttackDamageSelection {
  return Either.getOrThrow(
    statBlockAttackDamageSelection([
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: input.firstBaseComponent,
      },
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(2),
        ),
        notation: input.secondBaseComponent,
      },
    ]),
  );
}

function baseAndAdvantageBonusDamageSelection(input: {
  readonly baseComponent: "rolled" | "static";
  readonly advantageBonusComponent: "rolled" | "static";
}): StatBlockAttackDamageSelection {
  return Either.getOrThrow(
    statBlockAttackDamageSelection([
      {
        componentRef: statBlockBaseDamageComponentRef(
          statBlockBaseDamageComponentOrdinal(1),
        ),
        notation: input.baseComponent,
      },
      {
        componentRef: statBlockAdvantageBonusDamageComponentRef,
        notation: input.advantageBonusComponent,
      },
    ]),
  );
}

function createStatBlockAttackParityDriver(
  configuration: ScenarioConfiguration,
) {
  return defineDriver<typeof DRIVER_SCHEMA, StatBlockAttackParityProjection>(
    DRIVER_SCHEMA,
    () => {
      let resolutionState = statBlockAttackParityBattle(configuration);
      let state = resolutionState;
      let subject = requireStatBlockAttackSubject(
        resolutionState,
        configuration.damageSelection,
      );
      let attack = requireStatBlockAttackOption(resolutionState, subject);
      let holes: readonly BattleHole[] = [];
      let targetChoice: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      > | null = null;
      let attackRoll: Extract<
        BattleFill,
        { readonly kind: "attackRoll" }
      > | null = null;
      let lastResult: MbtWitnessLastResult = "init";
      let attackHits = false;
      let critical = false;
      let factsLegal = true;
      let rawDamageAmount = 0;

      function reset(): void {
        resolutionState = statBlockAttackParityBattle(configuration);
        state = resolutionState;
        subject = requireStatBlockAttackSubject(
          resolutionState,
          configuration.damageSelection,
        );
        attack = requireStatBlockAttackOption(resolutionState, subject);
        targetChoice = null;
        attackRoll = null;
        attackHits = false;
        critical = false;
        factsLegal = true;
        rawDamageAmount = 0;
        const result = resolveBattleSubject({
          state: resolutionState,
          subject,
          fills: [],
        });
        if (result.tag !== "needsHoles") {
          throw new Error(
            `Expected initial Stat Block attack target choice, got ${result.tag}.`,
          );
        }
        state = result.state;
        holes = result.holes;
        lastResult = "init";
      }

      function recordResult(result: BattleResolutionResult): void {
        if (result.tag === "invalid") {
          factsLegal = false;
          throw new Error(
            `Unexpected Stat Block attack parity invalid result: ${result.reason}: ${result.message}`,
          );
        }
        state = result.state;
        holes = result.tag === "needsHoles" ? result.holes : [];
        lastResult = result.tag;
        const damageHole = holes.find(
          (
            hole,
          ): hole is Extract<BattleHole, { readonly kind: "rolledDice" }> =>
            hole.kind === "rolledDice",
        );
        if (damageHole !== undefined && "critical" in damageHole) {
          critical = damageHole.critical;
        }
        const target = requireTarget(state);
        const damageApplied = targetInitialHp - Number(target.hp);
        attackHits =
          damageHole !== undefined ||
          damageApplied > 0 ||
          hasCondition(target.conditions, "prone");
      }

      function resolveCurrentSubject(fills: readonly BattleFill[]): void {
        recordResult(
          resolveBattleSubject({
            state: resolutionState,
            subject,
            fills,
          }),
        );
      }

      return {
        initStaticOnlyHit: reset,
        initSingleRollableSelectedStaticHit: reset,
        initSingleRollableSelectedRolledHit: reset,
        initSingleRollableSelectedRolledMiss: reset,
        initSingleRollableSelectedRolledCritical: reset,
        initTwoRollableHeterogeneousHit: reset,
        initTwoRollableTypedImmunityHit: reset,
        initTwoDistinctStaticAggregationHit: reset,
        initIntrinsicStaticAndRollableHit: reset,
        initAdvantageBonusRiderHit: reset,
        initNormalRollAdvantageBonusInactiveHit: reset,
        initAdvantageBonusRiderMiss: reset,
        doFillTargetChoice: () => {
          targetChoice = statBlockAttackTargetChoiceFill(
            requireHole(holes, "targetChoice"),
            configuration.attackRoll.mode,
          );
          resolveCurrentSubject([targetChoice]);
        },
        doFillAttackRoll: () => {
          const selectedTargetChoice = requireTargetChoice(targetChoice);
          const rollHole = requireHole(holes, "attackRoll");
          attackRoll = attackRollFill(rollHole, {
            total: configuration.attackRoll.total,
            naturalD20: configuration.attackRoll.naturalD20,
            ...(configuration.attackRoll.mode === "advantage"
              ? { rollMode: "advantage" as const }
              : {}),
          });
          resolveCurrentSubject([selectedTargetChoice, attackRoll]);
          if (attackHits && !holes.some((hole) => hole.kind === "rolledDice")) {
            rawDamageAmount = fixedStatBlockAttackDamageAmount({
              state: resolutionState,
              attack,
              attackRoll,
            });
          }
        },
        doFillDamageRoll: () => {
          const selectedTargetChoice = requireTargetChoice(targetChoice);
          const selectedAttackRoll = requireAttackRoll(attackRoll);
          const damageRoll = damageRollFillWithGroups(
            requireHole(holes, "rolledDice"),
            configuration.damageRollGroups,
          );
          const resolvedRawDamageAmount = rolledStatBlockAttackDamageAmount({
            state: resolutionState,
            subject,
            attack,
            attackRoll: selectedAttackRoll,
            damageRoll,
            critical,
          });
          resolveCurrentSubject([
            selectedTargetChoice,
            selectedAttackRoll,
            damageRoll,
          ]);
          rawDamageAmount = resolvedRawDamageAmount;
        },
        step: () => {},
        getState: () =>
          projectStatBlockAttackParityState({
            scenario: configuration.scenario,
            state,
            holes,
            lastResult,
            attackHits,
            critical,
            factsLegal,
            rawDamageAmount,
          }),
      };
    },
  );
}

const statBlockAttackParityStateCheck = stateCheck(
  normalizeStatBlockAttackParityQuintState,
  compareStatBlockAttackParityStates,
);

describe("Stat Block attack semantic parity focused MBT", () => {
  for (const configuration of scenarioConfigurations) {
    it(
      `replays ${configuration.scenario} through the production reducers`,
      async () => {
        await run({
          spec: mbtSpecPath(
            import.meta.dirname,
            "battle-runtime-stat-block-attack-resolution.mbt.qnt",
          ),
          init: configuration.quintInit,
          step: "step",
          driver: createStatBlockAttackParityDriver(configuration),
          backend: "typescript",
          seed: process.env["QUINT_SEED"],
          nTraces: mbtTraceCount(),
          maxSteps: focusedMbtMaxSteps(3),
          stateCheck: statBlockAttackParityStateCheck,
        });
      },
      MBT_TEST_TIMEOUT_MS,
    );
  }
});

function statBlockAttackParityBattle(
  configuration: ScenarioConfiguration,
): BattleState {
  const { family, targetDamageAdjustment } = configuration;
  return startBattleRight({
    battleId: battleId(`stat-block-attack-parity-${family}`),
    combatants: [
      statBlockCreatureInit({
        combatantId: actorId,
        statBlockName: "Synthetic Attack Parity Actor",
        initiative: 30,
        statBlock: statBlockAttackParityActor(family),
      }),
      statBlockCreatureInit({
        combatantId: targetId,
        statBlockName: "Synthetic Attack Parity Target",
        initiative: 20,
        statBlock: statBlockAttackParityBystander(
          "stat_block_attack_parity_target",
          "Synthetic Attack Parity Target",
          targetDamageAdjustment,
        ),
      }),
      statBlockCreatureInit({
        combatantId: allyId,
        statBlockName: "Synthetic Attack Parity Ally",
        initiative: 10,
        statBlock: statBlockAttackParityBystander(
          "stat_block_attack_parity_ally",
          "Synthetic Attack Parity Ally",
          "none",
        ),
      }),
    ],
  });
}

function statBlockAttackParityActor(
  family: StatBlockAttackFixtureFamily,
): StatBlockRecord {
  const base = statBlockAttackParityBystander(
    `stat_block_attack_parity_${family}`,
    "Synthetic Attack Parity Actor",
    "none",
  );
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      actions: [
        nonSpellExecutableProcedureEntry(
          fixtureAttackProcedureOrdinal,
          fixtureAttack(family),
        ),
      ],
      ...(family === "advantageBonusAndRider"
        ? {
            traits: [
              {
                name: "Synthetic Coordinated Opening",
                description:
                  "The actor has Advantage when a capable ally is next to the target.",
                effect: {
                  kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target" as const,
                },
              },
            ],
          }
        : {}),
    },
  };
}

function statBlockAttackParityBystander(
  id: string,
  name: string,
  targetDamageAdjustment: StatBlockAttackTargetDamageAdjustment,
): StatBlockRecord {
  return {
    id: parseSharedStatBlockId(id),
    kind: "statBlock",
    name,
    challengeRating: 0.25,
    provenance: {
      kind: "synthetic-test",
      section: "Stat Block attack semantic parity fixture",
    },
    statBlock: {
      size: "medium",
      creatureType: "construct",
      alignment: { order: "neutral", morality: "neutral" },
      ac: { value: { kind: "literal", value: 15 } },
      hp: { kind: "literal", value: targetInitialHp },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        cha: 10,
        con: 10,
        dex: 10,
        int: 10,
        str: 10,
        wis: 10,
      },
      initiative: { modifier: 0, score: 10 },
      passivePerception: 10,
      communication: { kind: "none" },
      ...Match.value(targetDamageAdjustment).pipe(
        Match.when("none", () => ({})),
        Match.when("piercingImmunity", () => ({
          immunities: decodeCreatureImmunityDeclarationSync({
            damageTypes: ["piercing"],
          }),
        })),
        Match.exhaustive,
      ),
    },
  };
}

function fixtureAttack(family: StatBlockAttackFixtureFamily): StatBlockAttack {
  const common = {
    kind: "attack_roll" as const,
    attackAbility: "str" as const,
    attackBonus: { kind: "literal" as const, value: 4 },
    attackType: "melee" as const,
    reachFeet: 5,
  };
  return Match.value(family).pipe(
    Match.when(
      "staticOnly",
      (): StatBlockAttack => ({
        ...common,
        name: "Synthetic Static Impact",
        onHit: [
          {
            kind: "damage" as const,
            damageType: "bludgeoning" as const,
            amount: { kind: "fixed" as const, static: 3 },
          },
        ],
      }),
    ),
    Match.when(
      "singleRollable",
      (): StatBlockAttack => ({
        ...common,
        name: "Synthetic Selectable Cut",
        onHit: [
          {
            kind: "damage" as const,
            damageType: "slashing" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 6, flat: 2 },
              static: 5,
            },
          },
        ],
      }),
    ),
    Match.when(
      "twoRollable",
      (): StatBlockAttack => ({
        ...common,
        name: "Synthetic Twin Payload",
        onHit: [
          {
            kind: "damage" as const,
            damageType: "piercing" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 4, flat: 1 },
              static: 3,
            },
          },
          {
            kind: "damage" as const,
            damageType: "poison" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 6 },
              static: 4,
            },
          },
        ],
      }),
    ),
    Match.when(
      "intrinsicStaticAndRollable",
      (): StatBlockAttack => ({
        ...common,
        name: "Synthetic Mixed Payload",
        onHit: [
          {
            kind: "damage" as const,
            damageType: "fire" as const,
            amount: { kind: "fixed" as const, static: 2 },
          },
          {
            kind: "damage" as const,
            damageType: "cold" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 8, flat: 1 },
              static: 5,
            },
          },
        ],
      }),
    ),
    Match.when(
      "advantageBonusAndRider",
      (): StatBlockAttack => ({
        ...common,
        name: "Synthetic Coordinated Strike",
        onHit: [
          {
            kind: "damage" as const,
            damageType: "slashing" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 6, flat: 2 },
              static: 5,
            },
          },
          {
            kind: "conditional_bonus_damage" as const,
            when: { kind: "attack_roll_had_advantage" as const },
            damageType: "slashing" as const,
            amount: {
              kind: "fixed" as const,
              expr: { dice: 1, dieSize: 4 },
              static: 2,
            },
          },
          {
            kind: "apply_condition_if_target_size_at_most" as const,
            condition: "prone" as const,
            maxCreatureSize: "medium" as const,
          },
        ],
      }),
    ),
    Match.exhaustive,
  );
}

function requireStatBlockAttackSubject(
  state: BattleState,
  damageSelection: StatBlockAttackDamageSelection,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block attack parity actor execution state.");
  }
  const fixtureProcedureRef = actor.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "attack" &&
      binding.procedure.section === "actions" &&
      binding.procedure.procedureOrdinal ===
        authoredProcedureOrdinal(fixtureAttackProcedureOrdinal),
  )?.procedureRef;
  if (fixtureProcedureRef === undefined) {
    throw new Error("Expected synthetic Stat Block attack procedure binding.");
  }
  const matches = discoverBattleActCandidates(state).flatMap(({ subject }) =>
    subject.tag === "action" &&
    subject.action === "attack" &&
    subject.actorId === actorId &&
    subject.procedureRef === fixtureProcedureRef &&
    subject.statBlockDamageSelection !== undefined &&
    statBlockAttackDamageSelectionsEqual(
      subject.statBlockDamageSelection,
      damageSelection,
    )
      ? [subject]
      : [],
  );
  const [subject] = matches;
  if (subject === undefined || matches.length !== 1) {
    throw new Error(
      `Expected one Stat Block attack subject for ${JSON.stringify(damageSelection)}; discovered ${JSON.stringify(matches)}.`,
    );
  }
  return subject;
}

function requireStatBlockAttackOption(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): StatBlockAttackActionOption {
  const attack = attackActionOptionForSubject(state, subject);
  if (attack?.kind !== "statBlockAttack") {
    throw new Error("Expected selected Stat Block attack option.");
  }
  return attack;
}

function fixedStatBlockAttackDamageAmount(input: {
  readonly state: BattleState;
  readonly attack: StatBlockAttackActionOption;
  readonly attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }>;
}): number {
  const entries = fixedAttackDamageByTypeEntries(
    input.state,
    input.state.combatants.get(actorId),
    input.attack,
    input.attackRoll.value,
  );
  if (entries === null) {
    throw new Error("Expected selected fixed Stat Block attack damage.");
  }
  return totalRawDamageAmount(entries);
}

function rolledStatBlockAttackDamageAmount(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
  readonly attack: StatBlockAttackActionOption;
  readonly attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>;
  readonly critical: boolean;
}): number {
  return totalRawDamageAmount(
    attackDamageByTypeEntries(
      input.state,
      input.state.combatants.get(actorId),
      input.attack,
      input.subject.procedureRef,
      input.damageRoll,
      input.critical,
      input.attackRoll.value,
    ),
  );
}

function totalRawDamageAmount(
  entries: readonly DamageAmountByTypeEntry[],
): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function statBlockAttackTargetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attackRollMode: "normal" | "advantage",
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack?.actorId !== actorId) {
    throw new Error("Expected typed Stat Block attack target-selection facts.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId,
        targetId,
        ...hole.attack.selection,
        distanceFeet: movementFeet(5),
      },
      ...(attackRollMode === "advantage"
        ? [
            {
              kind: "attackerAllyWithin5FeetOfTarget" as const,
              attackerId: actorId,
              targetId,
              allyId,
            },
          ]
        : []),
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const matches = holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: K }> =>
      hole.kind === kind,
  );
  const [hole] = matches;
  if (hole === undefined || matches.length !== 1) {
    throw new Error(`Expected one ${kind} hole, got ${JSON.stringify(holes)}.`);
  }
  return hole;
}

function requireTargetChoice(
  targetChoice: Extract<BattleFill, { readonly kind: "targetChoice" }> | null,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (targetChoice === null) {
    throw new Error("Expected selected Stat Block attack target.");
  }
  return targetChoice;
}

function requireAttackRoll(
  attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }> | null,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  if (attackRoll === null) {
    throw new Error("Expected selected Stat Block attack roll.");
  }
  return attackRoll;
}

function requireTarget(state: BattleState) {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error(`Expected target combatant ${targetId}.`);
  }
  return target;
}

function projectStatBlockAttackParityState(input: {
  readonly scenario: StatBlockAttackParityScenario;
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly attackHits: boolean;
  readonly critical: boolean;
  readonly factsLegal: boolean;
  readonly rawDamageAmount: number;
}): StatBlockAttackParityProjection {
  const target = requireTarget(input.state);
  const damageApplied = targetInitialHp - Number(target.hp);
  return {
    scenario: input.scenario,
    targetHp: Number(target.hp),
    targetProne: hasCondition(target.conditions, "prone"),
    attackHits: input.attackHits,
    critical: input.critical,
    rawDamageAmount: input.rawDamageAmount,
    adjustedDamageAmount: damageApplied,
    factsLegal: input.factsLegal,
    holes: input.holes.map(projectStatBlockAttackParityHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: "none",
  };
}

function projectStatBlockAttackParityHole(
  hole: BattleHole,
): StatBlockAttackParityHole {
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "attackRoll") return "AttackRoll";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(
    `Unexpected Stat Block attack parity hole: ${JSON.stringify(hole)}.`,
  );
}

function normalizeStatBlockAttackParityQuintState(
  raw: unknown,
): StatBlockAttackParityProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: statBlockAttackParityHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      SCENARIO_BY_TAG,
      "Stat Block attack parity scenario",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetProne: booleanField(state, "qTargetProne"),
    attackHits: booleanField(state, "qAttackHits"),
    critical: booleanField(state, "qCritical"),
    rawDamageAmount: numberFromQuintInt(
      state["qRawDamageAmount"],
      "qRawDamageAmount",
    ),
    adjustedDamageAmount: numberFromQuintInt(
      state["qAdjustedDamageAmount"],
      "qAdjustedDamageAmount",
    ),
    factsLegal: booleanField(state, "qFactsLegal"),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
    lastInvalidReason: protocol.lastInvalidReason,
  };
}

function statBlockAttackParityHole(raw: unknown): StatBlockAttackParityHole {
  return quintVariantMappedValue(
    raw,
    "qProtocol.holes",
    HOLE_BY_TAG,
    "Stat Block attack parity hole",
  );
}

function compareStatBlockAttackParityStates(
  quint: StatBlockAttackParityProjection,
  runtime: StatBlockAttackParityProjection,
): boolean {
  if (!isDeepStrictEqual(runtime, quint)) {
    throw new Error(
      `Stat Block attack parity MBT mismatch:\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
    );
  }
  return true;
}
