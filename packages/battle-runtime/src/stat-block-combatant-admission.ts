import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { Condition } from "@dnd/shared/game-facts";
import { Hp, SIZES } from "@dnd/shared/types";
import { Brand } from "effect";
import * as Either from "effect/Either";

import { optionalProperty } from "./optional-property.ts";
import type { BattleStateInitLeafIssue } from "./battle-state-execution.ts";
import {
  battleExecutionScopeCursor,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";
import {
  parseStatBlockLiteralValue,
  parseStatBlockLegendaryActionUses,
  parseStatBlockPositiveIntegerLiteral,
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
  readonly resources?: readonly BattleStatBlockRuntimeResource[];
  readonly legendaryActionUses?: NonNullable<
    BattleStatBlockExecutionSource["legendaryActionUses"]
  >;
} & Brand.Brand<"BattleStatBlockCombatantSource">;

const BattleStatBlockCombatantSource =
  Brand.nominal<BattleStatBlockCombatantSource>();

type StatBlockCombatantAdmissionIssue = Extract<
  BattleStateInitLeafIssue,
  { readonly tag: "battleStateInitIssue" }
>;

export function statBlockInitialConditionImmunityIssue(
  source: BattleStatBlockCombatantSource,
  conditions: readonly Condition[],
): StatBlockCombatantAdmissionIssue | null {
  const immuneInitialCondition = conditions.find((condition) =>
    source.statBlock.immunities?.conditions?.includes(condition),
  );
  return immuneInitialCondition === undefined
    ? null
    : {
        tag: "battleStateInitIssue",
        message: `Stat Block combatant is immune to initial ${immuneInitialCondition} condition.`,
      };
}

export function admitBattleStatBlockCombatant(input: {
  readonly battleId: Parameters<typeof statBlockExecutionAdmissionCohort>[0];
  readonly combatantId: CombatantId;
  readonly statBlock: BattleStatBlockExecutionSource;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
}): Either.Either<AdmittedBattleStatBlockCombatant, BattleStateInitLeafIssue> {
  const source = battleStatBlockCombatantSource(input.statBlock);
  if (Either.isLeft(source)) return Either.left(source.left);
  return admitBattleStatBlockCombatantSource({
    battleId: input.battleId,
    combatantId: input.combatantId,
    source: source.right,
    startingScopeOrdinal: input.startingScopeOrdinal,
  });
}

export function admitBattleStatBlockCombatantSource(input: {
  readonly battleId: Parameters<typeof statBlockExecutionAdmissionCohort>[0];
  readonly combatantId: CombatantId;
  readonly source: BattleStatBlockCombatantSource;
  readonly startingScopeOrdinal: BattleExecutionScopeOrdinal;
}): Either.Either<AdmittedBattleStatBlockCombatant, BattleStateInitLeafIssue> {
  const statBlock = input.source;
  if (typeof statBlock.statBlock.creatureType !== "string") {
    return issue("Battle runtime requires a concrete creature type.");
  }
  if (statBlock.statBlock.resistances?.kind === "choose_one_from") {
    return issue(
      "Battle runtime requires Stat Block resistance choices to be resolved before admission.",
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
  return Either.right(
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
            damageTypes: statBlock.statBlock.immunities?.damageTypes ?? [],
            conditions: statBlock.statBlock.immunities?.conditions ?? [],
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
): Either.Either<
  BattleStatBlockCombatantSource,
  StatBlockCombatantAdmissionIssue
> {
  const ac = parseStatBlockLiteralValue(statBlock.statBlock.ac);
  if (Either.isLeft(ac)) {
    return issue("Battle runtime requires literal Stat Block Armor Class.");
  }
  const hp = parseStatBlockPositiveIntegerLiteral(statBlock.statBlock.hp);
  if (Either.isLeft(hp)) {
    return issue(
      hp.left === "invalidLiteral"
        ? "Battle runtime requires literal Stat Block maximum HP."
        : "Battle runtime requires Stat Block maximum HP to be a positive integer.",
    );
  }
  if (!SIZES.some((size) => size === statBlock.statBlock.size)) {
    return issue("Battle runtime requires a concrete creature Size.");
  }
  const legendaryActionUses = parseStatBlockLegendaryActionUses(
    statBlock.legendaryActionUses,
  );
  if (Either.isLeft(legendaryActionUses)) {
    return issue(
      "Battle runtime requires Stat Block Legendary Action uses to be a positive integer.",
    );
  }
  const {
    legendaryActionUses: _unbrandedLegendaryActionUses,
    ...sourceWithoutLegendaryActionUses
  } = statBlock;
  return Either.right(
    BattleStatBlockCombatantSource({
      ...sourceWithoutLegendaryActionUses,
      ...optionalProperty("legendaryActionUses", legendaryActionUses.right),
      statBlock: {
        ...statBlock.statBlock,
        ac: ac.right,
        hp: hp.right,
        size: statBlock.statBlock.size,
      },
    }),
  );
}

function issue(
  message: string,
): Either.Either<never, StatBlockCombatantAdmissionIssue> {
  return Either.left({ tag: "battleStateInitIssue", message });
}
