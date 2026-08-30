import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { Condition, SurfaceCondition } from "@dnd/shared/game-facts";
import { Hp, PositiveInteger } from "@dnd/shared/types";
import { Brand, Result } from "effect";

import { optionalProperty } from "./optional-property.ts";
import type {
  BattleInitializationIssueFacts,
  BattleStateInitLeafIssue,
  BattleStatBlockInitializationIssue,
} from "./battle-state-execution.ts";
import {
  battleExecutionScopeCursor,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";
import {
  parseStatBlockLegendaryActionUses,
  admitStatBlockResourceGraph,
  type BattleStatBlockCombatantFacts,
  type BattleStatBlockExecutionSource,
  type BattleStatBlockExecutionSourceInput,
  type BattleStatBlockRuntimeResource,
} from "./stat-block-execution-state.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.INITIAL_CONDITION_IMMUNITY

const AdmittedBattleStatBlockCombatant =
  Brand.nominal<AdmittedBattleStatBlockCombatant>();

export type BattleStatBlockCombatantSource = {
  readonly id: BattleStatBlockExecutionSource["id"];
  readonly challengeRating: BattleStatBlockExecutionSource["challengeRating"];
  readonly statBlock: BattleStatBlockCombatantFacts;
  readonly procedures: BattleStatBlockExecutionSource["procedures"];
  readonly resources: readonly BattleStatBlockRuntimeResource[];
  readonly legendaryActionUses?: NonNullable<
    BattleStatBlockExecutionSource["legendaryActionUses"]
  >;
} & Brand.Brand<"BattleStatBlockCombatantSource">;

const BattleStatBlockCombatantSource =
  Brand.nominal<BattleStatBlockCombatantSource>();

type StatBlockCombatantAdmissionIssue = Extract<
  BattleStateInitLeafIssue,
  | { readonly tag: "battleStateInitIssue" }
  | { readonly tag: "statBlockResourceGraphIssue" }
>;

export type StatBlockResourceGraphCombatantAdmissionIssue = Extract<
  StatBlockCombatantAdmissionIssue,
  { readonly tag: "statBlockResourceGraphIssue" }
>;

export function statBlockInitialConditionImmunityIssue(
  source: BattleStatBlockCombatantSource,
  conditions: readonly Condition[],
  combatantId: CombatantId,
): BattleStatBlockInitializationIssue | null {
  const authoredImmunities = source.statBlock.immunities;
  const fixedConditionImmunities: readonly SurfaceCondition[] =
    authoredImmunities !== undefined && "conditions" in authoredImmunities
      ? authoredImmunities.conditions
      : [];
  const immuneInitialCondition = conditions.find((condition) =>
    fixedConditionImmunities.includes(condition),
  );
  return immuneInitialCondition === undefined
    ? null
    : {
        tag: "battleStateInitIssue",
        message: `Stat Block combatant is immune to initial ${immuneInitialCondition} condition.`,
        kind: "initialConditionImmune",
        combatantId,
        condition: immuneInitialCondition,
      };
}

export function admitBattleStatBlockCombatant(input: {
  readonly battleId: Parameters<typeof statBlockExecutionAdmissionCohort>[0];
  readonly combatantId: CombatantId;
  readonly statBlock: BattleStatBlockExecutionSource;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
}): Result.Result<
  AdmittedBattleStatBlockCombatant,
  StatBlockCombatantAdmissionIssue
> {
  const source = battleStatBlockCombatantSource(input.statBlock);
  if (Result.isFailure(source)) return Result.fail(source.failure);
  return admitBattleStatBlockCombatantSource({
    battleId: input.battleId,
    combatantId: input.combatantId,
    source: source.success,
    startingScopeOrdinal: input.startingScopeOrdinal,
  });
}

export function admitBattleStatBlockCombatantSource(input: {
  readonly battleId: Parameters<typeof statBlockExecutionAdmissionCohort>[0];
  readonly combatantId: CombatantId;
  readonly source: BattleStatBlockCombatantSource;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
}): Result.Result<
  AdmittedBattleStatBlockCombatant,
  StatBlockCombatantAdmissionIssue
> {
  const resourceGraph = admitStatBlockResourceGraph(input.source);
  if (Result.isFailure(resourceGraph)) {
    return Result.fail({
      tag: "statBlockResourceGraphIssue",
      issues: resourceGraph.failure,
    });
  }
  const statBlock = resourceGraph.success;
  if (typeof statBlock.statBlock.creatureType !== "string") {
    return issue("Battle runtime requires a concrete creature type.", {
      kind: "statBlockCombatantInvalid",
      combatantId: input.combatantId,
      constraint: "concreteCreatureTypeRequired",
    });
  }
  if (statBlock.statBlock.resistances?.kind === "choose_one_from") {
    return issue(
      "Battle runtime requires Stat Block resistance choices to be resolved before admission.",
      {
        kind: "statBlockCombatantInvalid",
        combatantId: input.combatantId,
        constraint: "resolvedResistanceChoiceRequired",
      },
    );
  }
  const from = input.startingScopeOrdinal;
  const statBlocks: readonly [typeof statBlock] = [statBlock];
  const cohort = statBlockExecutionAdmissionCohort(
    input.battleId,
    input.combatantId,
    statBlocks,
    from,
  );
  const allocation = cohort.admissions[0];
  return Result.succeed(
    AdmittedBattleStatBlockCombatant({
      battleId: input.battleId,
      combatantId: input.combatantId,
      origin: {
        statBlockId: statBlock.id,
        mechanics: {
          creatureType: statBlock.statBlock.creatureType,
          speeds: statBlock.statBlock.speeds,
          abilityScores: statBlock.statBlock.abilityScores,
          savingThrowModifiers: statBlock.statBlock.savingThrowModifiers ?? [],
          skillModifiers: statBlock.statBlock.skillModifiers ?? [],
          vulnerabilities:
            statBlock.statBlock.vulnerabilities?.damageTypes ?? [],
          resistances: statBlock.statBlock.resistances?.damageTypes ?? [],
          immunities: {
            damageTypes:
              statBlock.statBlock.immunities !== undefined &&
              "damageTypes" in statBlock.statBlock.immunities
                ? statBlock.statBlock.immunities.damageTypes
                : [],
            conditions:
              statBlock.statBlock.immunities !== undefined &&
              "conditions" in statBlock.statBlock.immunities
                ? statBlock.statBlock.immunities.conditions
                : [],
          },
          specialSenses: statBlock.statBlock.senses ?? [],
          initiativeModifier: statBlock.statBlock.initiativeModifier,
          initiativeScore: statBlock.statBlock.initiativeScore,
          passivePerception: statBlock.statBlock.passivePerception,
        },
        execution: allocation.execution,
      },
      initialization: {
        armorClass: armorClass(statBlock.statBlock.ac.value),
        maxHp: Hp(statBlock.statBlock.hp.value),
        size: statBlock.statBlock.size,
      },
      cursorTransition: {
        from,
        to: battleExecutionScopeCursor(cohort.nextScopeOrdinal),
      },
    }),
  );
}

export function battleStatBlockCombatantSource(
  statBlock: BattleStatBlockExecutionSourceInput,
): Result.Result<
  BattleStatBlockCombatantSource,
  StatBlockCombatantAdmissionIssue
> {
  if (statBlock.statBlock.ac.kind !== "literal") {
    return issue("Battle runtime requires literal Stat Block Armor Class.", {
      kind: "statBlockSourceInvalid",
      statBlockId: statBlock.id,
      constraint: "literalArmorClassRequired",
    });
  }
  if (statBlock.statBlock.hp.kind !== "literal") {
    return issue("Battle runtime requires literal Stat Block maximum HP.", {
      kind: "statBlockSourceInvalid",
      statBlockId: statBlock.id,
      constraint: "literalMaximumHitPointsRequired",
    });
  }
  const hp = PositiveInteger.result(statBlock.statBlock.hp.value);
  if (Result.isFailure(hp)) {
    return issue(
      "Battle runtime requires Stat Block maximum HP to be a positive integer.",
      {
        kind: "statBlockSourceInvalid",
        statBlockId: statBlock.id,
        constraint: "positiveMaximumHitPointsRequired",
      },
    );
  }
  if (typeof statBlock.statBlock.size !== "string") {
    return issue("Battle runtime requires a concrete creature Size.", {
      kind: "statBlockSourceInvalid",
      statBlockId: statBlock.id,
      constraint: "concreteSizeRequired",
    });
  }
  const legendaryActionUses = parseStatBlockLegendaryActionUses(
    statBlock.legendaryActionUses,
  );
  if (Result.isFailure(legendaryActionUses)) {
    return issue(
      "Battle runtime requires Stat Block Legendary Action uses to be a positive integer.",
    );
  }
  const resourceGraph = admitStatBlockResourceGraph(statBlock);
  if (Result.isFailure(resourceGraph)) {
    return Result.fail({
      tag: "statBlockResourceGraphIssue",
      issues: resourceGraph.failure,
    } satisfies StatBlockResourceGraphCombatantAdmissionIssue);
  }
  const {
    legendaryActionUses: _unbrandedLegendaryActionUses,
    ...sourceWithoutLegendaryActionUses
  } = statBlock;
  return Result.succeed(
    BattleStatBlockCombatantSource({
      ...sourceWithoutLegendaryActionUses,
      ...optionalProperty("legendaryActionUses", legendaryActionUses.success),
      resources: resourceGraph.success.resources,
      statBlock: {
        ...statBlock.statBlock,
        ac: statBlock.statBlock.ac,
        hp: { kind: "literal", value: hp.success },
        size: statBlock.statBlock.size,
      },
    }),
  );
}

function issue(
  message: string,
  facts?: BattleInitializationIssueFacts,
): Result.Result<never, StatBlockCombatantAdmissionIssue> {
  return facts === undefined
    ? Result.fail({ tag: "battleStateInitIssue", message })
    : Result.fail({
        tag: "battleStateInitIssue",
        message,
        ...facts,
      });
}
