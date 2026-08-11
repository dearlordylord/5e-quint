import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp, type Size } from "@dnd/shared/types";
import type { StatBlockMechanics } from "@dnd/surface/surface/types";
import { Brand } from "effect";
import * as Either from "effect/Either";

import type { BattleStateInitLeafIssue } from "./battle-state-execution.ts";
import {
  battleExecutionScopeCursor,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";

const AdmittedBattleStatBlockCombatant =
  Brand.nominal<AdmittedBattleStatBlockCombatant>();

export type BattleStatBlockCombatantSource = {
  readonly id: BattleStatBlockExecutionSource["id"];
  readonly challengeRating: BattleStatBlockExecutionSource["challengeRating"];
  readonly statBlock: Omit<StatBlockMechanics, "ac" | "hp" | "size"> & {
    readonly ac: Extract<
      StatBlockMechanics["ac"],
      { readonly kind: "literal" }
    >;
    readonly hp: Extract<
      StatBlockMechanics["hp"],
      { readonly kind: "literal" }
    >;
    readonly size: Size;
  };
} & Brand.Brand<"BattleStatBlockCombatantSource">;

const BattleStatBlockCombatantSource =
  Brand.nominal<BattleStatBlockCombatantSource>();

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
  const cohort = statBlockExecutionAdmissionCohort(
    input.battleId,
    input.combatantId,
    [statBlock],
    from,
  );
  const allocation = cohort.admissions[0];
  if (allocation === undefined) {
    return issue("Stat Block execution admission is missing.");
  }
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
  statBlock: BattleStatBlockExecutionSource,
): Either.Either<BattleStatBlockCombatantSource, BattleStateInitLeafIssue> {
  if (statBlock.statBlock.ac.kind !== "literal") {
    return issue("Battle runtime requires literal Stat Block Armor Class.");
  }
  if (statBlock.statBlock.hp.kind !== "literal") {
    return issue("Battle runtime requires literal Stat Block maximum HP.");
  }
  if (
    !Number.isInteger(statBlock.statBlock.hp.value) ||
    statBlock.statBlock.hp.value < 1
  ) {
    return issue(
      "Battle runtime requires Stat Block maximum HP to be a positive integer.",
    );
  }
  if (typeof statBlock.statBlock.size !== "string") {
    return issue("Battle runtime requires a concrete creature Size.");
  }
  return Either.right(
    BattleStatBlockCombatantSource({
      ...statBlock,
      statBlock: {
        ...statBlock.statBlock,
        ac: statBlock.statBlock.ac,
        hp: statBlock.statBlock.hp,
        size: statBlock.statBlock.size,
      },
    }),
  );
}

function issue(
  message: string,
): Either.Either<never, BattleStateInitLeafIssue> {
  return Either.left({ tag: "battleStateInitIssue", message });
}
