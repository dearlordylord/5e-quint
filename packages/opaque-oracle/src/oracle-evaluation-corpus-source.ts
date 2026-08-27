import {
  battleCreatureInitFromStatBlock,
  BattleStatBlockProcedureExecutionRef,
  combatantId,
  discoverBattleActs,
  endBattleRuntimeTurn,
  interruptChoiceResponderId,
  initiativeScore,
  settleBattleRuntimeTransaction,
  startBattle,
  type BattleFill,
  type BattleMechanicalFrontier,
  type BattleSubject,
} from "@dnd/battle-runtime";
import { statBlockId } from "@dnd/shared/game-facts";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import { Either, Option, Schema } from "effect";

import {
  abilityScoreAssignment,
  characterDraftId,
  creationChoiceOptionId,
  creationHoleId,
  choiceCardinalityBounds,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  type CharacterDraft,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
} from "@dnd/character-creation-runtime";

import {
  ORACLE_BATTLE_ID,
  type OracleEvaluationServices,
} from "./oracle-evaluation.ts";
import { decodeOracleCase, type OracleCase } from "./oracle-case-trace.ts";
import type { OracleCorpusCases } from "./oracle-corpus.ts";
import type {
  OracleBattleInput,
  OracleBattleAttempt,
} from "./oracle-case-trace-schema.ts";
import { OracleBattleInterruptDecisionFillSchema } from "./oracle-case-trace-schema.ts";

export type OracleEvaluationSourceIssue = {
  readonly tag: "sourceConstructionFailure";
  readonly message: string;
};

type CreationSource = {
  readonly fillBatches: readonly [CreationFill, ...CreationFill[]][];
  readonly firstFill: CreationFill;
};

type MoveSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
>;

type OrdinaryMovementHole = Extract<
  Extract<
    BattleMechanicalFrontier,
    { readonly kind: "ordinaryHoles" }
  >["holes"][number],
  { readonly kind: "movement" }
>;

type BattleSourceFacts = {
  readonly battle: OracleBattleInput;
  readonly moveSubject: MoveSubject;
  readonly movementHole: OrdinaryMovementHole;
  readonly movementWithoutOpportunityAttack: BattleFill;
  readonly movementWithOpportunityAttack: BattleFill;
  readonly interruptDecisionDecline: OracleBattleAttempt;
};

/**
 * Author the ordered source Cases once. The repeated first Case is deliberate
 * A/B/A evidence for order and multiplicity; no corpus metadata is needed.
 */
export function oracleEvaluationSourceCases(
  services: OracleEvaluationServices,
): Either.Either<OracleCorpusCases, OracleEvaluationSourceIssue> {
  try {
    return buildSourceCases(services);
  } catch (error) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: safeErrorMessage(error),
    });
  }
}

function buildSourceCases(
  services: OracleEvaluationServices,
): Either.Either<OracleCorpusCases, OracleEvaluationSourceIssue> {
  const creation = completeCreationFillBatches(services);
  if (Either.isLeft(creation)) return Either.left(creation.left);

  const enteredCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: statBlockBattle("corpus:skeleton", 0),
  });
  if (Either.isLeft(enteredCase)) return Either.left(enteredCase.left);

  const exhaustedCase = decodeSourceCase({
    creation: { fillBatches: [] },
    sheet: { tag: "ordinary" },
    battle: enteredCase.right.battle,
  });
  if (Either.isLeft(exhaustedCase)) return Either.left(exhaustedCase.left);

  const mixedCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: mixedOriginBattle(),
  });
  if (Either.isLeft(mixedCase)) return Either.left(mixedCase.left);

  const wildShapeCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: {
      tag: "wildShapeKnownForms",
      statBlockIds: [statBlockId("stat_block_rat")],
    },
    battle: statBlockBattle("corpus:skeleton", 0),
  });
  if (Either.isLeft(wildShapeCase)) return Either.left(wildShapeCase.left);

  const sourceBattle = battleSourceFacts(services);
  if (Either.isLeft(sourceBattle)) return Either.left(sourceBattle.left);

  const moveHolesCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.right.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.right.moveSubject,
          fills: [],
        },
      ],
    },
  });
  if (Either.isLeft(moveHolesCase)) return Either.left(moveHolesCase.left);

  const retryCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.right.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: {
            ...sourceBattle.right.moveSubject,
            actorId: combatantId("corpus:wrong-actor"),
          },
          fills: [],
        },
        {
          kind: "ordinarySubject",
          subject: sourceBattle.right.moveSubject,
          fills: [],
        },
      ],
    },
  });
  if (Either.isLeft(retryCase)) return Either.left(retryCase.left);

  const resolvedMovementCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.right.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.right.moveSubject,
          fills: [sourceBattle.right.movementWithoutOpportunityAttack],
        },
      ],
    },
  });
  if (Either.isLeft(resolvedMovementCase)) {
    return Either.left(resolvedMovementCase.left);
  }

  const interruptResolutionCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.right.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.right.moveSubject,
          fills: [sourceBattle.right.movementWithOpportunityAttack],
        },
        sourceBattle.right.interruptDecisionDecline,
      ],
    },
  });
  if (Either.isLeft(interruptResolutionCase)) {
    return Either.left(interruptResolutionCase.left);
  }

  const inputSurplusCase = decodeSourceCase({
    creation: {
      fillBatches: [...creation.right.fillBatches, [creation.right.firstFill]],
    },
    sheet: { tag: "ordinary" },
    battle: statBlockBattle("corpus:skeleton", 0),
  });
  if (Either.isLeft(inputSurplusCase)) {
    return Either.left(inputSurplusCase.left);
  }

  const fillRejectedCase = decodeSourceCase({
    creation: {
      fillBatches: [
        [
          {
            kind: "choice",
            holeId: creationHoleId("cc:draft:draft.background"),
            optionIds: [creationChoiceOptionId("not-a-background")],
          },
        ],
      ],
    },
    sheet: { tag: "ordinary" },
    battle: statBlockBattle("corpus:skeleton", 0),
  });
  if (Either.isLeft(fillRejectedCase)) {
    return Either.left(fillRejectedCase.left);
  }

  const emptyRosterCase = decodeSourceCase({
    creation: { fillBatches: creation.right.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      roster: { tag: "statBlocks", entries: [] },
      attempts: [],
    },
  });
  if (Either.isLeft(emptyRosterCase)) return Either.left(emptyRosterCase.left);

  // Keep A/B/A at the beginning of the actual ordered batch. The repeated
  // entered Case is intentional evidence for equality, order, and multiplicity.
  return Either.right([
    enteredCase.right,
    exhaustedCase.right,
    enteredCase.right,
    mixedCase.right,
    wildShapeCase.right,
    moveHolesCase.right,
    retryCase.right,
    resolvedMovementCase.right,
    interruptResolutionCase.right,
    inputSurplusCase.right,
    fillRejectedCase.right,
    emptyRosterCase.right,
  ]);
}

function statBlockBattle(
  identity: string,
  initiative: number,
): OracleBattleInput {
  return {
    roster: {
      tag: "statBlocks" as const,
      entries: [
        {
          combatantId: combatantId(identity),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative,
          ammunitionStocks: { arrow: 0 },
          conditions: [],
          tempHp: 0,
        },
      ],
    },
    attempts: [],
  };
}

function mixedOriginBattle(): OracleBattleInput {
  return {
    roster: {
      tag: "characterSheet",
      precedingStatBlocks: [],
      characterSheet: {
        combatantId: combatantId("corpus:character"),
        initiative: 1,
        ammunitionStocks: {},
      },
      followingStatBlocks: [
        {
          combatantId: combatantId("corpus:skeleton"),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative: 0,
          ammunitionStocks: { arrow: 0 },
          conditions: [],
          tempHp: 0,
        },
      ],
    },
    attempts: [],
  };
}

function twoStatBlockBattle(): OracleBattleInput {
  return {
    roster: {
      tag: "statBlocks",
      entries: [
        statBlockRosterEntry("corpus:skeleton-a", 10),
        statBlockRosterEntry("corpus:skeleton-b", 0),
      ],
    },
    attempts: [],
  };
}

function statBlockRosterEntry(
  identity: string,
  initiative: number,
): Extract<
  OracleBattleInput["roster"],
  { readonly tag: "statBlocks" }
>["entries"][number] {
  return {
    combatantId: combatantId(identity),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative,
    ammunitionStocks: { arrow: 0 },
    conditions: [],
    tempHp: 0,
  };
}

function battleSourceFacts(
  services: OracleEvaluationServices,
): Either.Either<BattleSourceFacts, OracleEvaluationSourceIssue> {
  const firstId = combatantId("corpus:skeleton-a");
  const secondId = combatantId("corpus:skeleton-b");
  const statBlock = services.statBlockCatalog.getStatBlock(
    statBlockId("stat_block_skeleton"),
  );
  if (Option.isNone(statBlock)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Skeleton Stat Block was not found.",
    });
  }
  const first = battleCreatureInitFromStatBlock({
    combatantId: firstId,
    statBlock: statBlock.value,
    initiative: initiativeScore(10),
    ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(0) }],
    conditions: [],
  });
  const second = battleCreatureInitFromStatBlock({
    combatantId: secondId,
    statBlock: statBlock.value,
    initiative: initiativeScore(0),
    ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(0) }],
    conditions: [],
  });
  if (Either.isLeft(first) || Either.isLeft(second)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Skeleton combatants could not be initialized.",
    });
  }

  const started = startBattle({
    battleId: ORACLE_BATTLE_ID,
    combatants: [first.right, second.right],
  });
  if (Either.isLeft(started)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Skeleton battle could not be started.",
    });
  }

  const moveAct = discoverBattleActs(started.right).find(
    (act) =>
      act.subject.tag === "runtimeCommand" && act.subject.command === "move",
  );
  if (
    moveAct === undefined ||
    moveAct.subject.tag !== "runtimeCommand" ||
    moveAct.subject.command !== "move"
  ) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Skeleton battle did not expose a Move act.",
    });
  }

  const moveSubject = moveAct.subject;
  const moveHoles = settleBattleRuntimeTransaction({
    session: started.right,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: moveSubject,
      fills: [],
    },
    statBlockCatalog: services.statBlockCatalog,
  });
  if (
    moveHoles.tag !== "needsHoles" ||
    moveHoles.frontier.kind !== "ordinaryHoles"
  ) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Move did not expose ordinary mechanical holes.",
    });
  }
  const movementHole = moveHoles.frontier.holes.find(
    (hole) => hole.kind === "movement",
  );
  if (movementHole?.kind !== "movement") {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Move did not expose a movement hole.",
    });
  }

  const endedFirstTurn = endBattleRuntimeTurn({
    session: started.right,
    actorId: firstId,
  });
  if (endedFirstTurn.tag !== "resolved") {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source first Skeleton turn could not end.",
    });
  }
  const attackAct = discoverBattleActs(endedFirstTurn.session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      !("statBlockDamageNotation" in act.subject),
  );
  if (
    attackAct?.subject.tag !== "action" ||
    attackAct.subject.action !== "attack" ||
    "statBlockDamageNotation" in attackAct.subject
  ) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source reactor did not expose a typed attack procedure.",
    });
  }
  const procedureRef = Schema.decodeUnknownEither(
    BattleStatBlockProcedureExecutionRef,
  )(attackAct.subject.procedureRef);
  if (Either.isLeft(procedureRef)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source attack procedure reference was not canonical.",
    });
  }

  const movementWithoutOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: movementHole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [],
    },
  };
  const movementWithOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: movementHole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [
        {
          reactorId: secondId,
          distanceFeet: movementFeet(5),
          procedureRef: procedureRef.right,
        },
      ],
    },
  };
  const opportunityAttack = settleBattleRuntimeTransaction({
    session: started.right,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: moveSubject,
      fills: [movementWithOpportunityAttack],
    },
    statBlockCatalog: services.statBlockCatalog,
  });
  if (
    opportunityAttack.tag !== "needsHoles" ||
    opportunityAttack.frontier.kind !== "interruptDecision"
  ) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source movement did not expose an interrupt decision.",
    });
  }
  const opportunityChoice = opportunityAttack.frontier.choices.find(
    (choice) =>
      choice.kind === "nestedProcedure" &&
      choice.subject.command === "opportunityAttack",
  );
  if (opportunityChoice === undefined) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source movement interrupt did not expose Opportunity Attack.",
    });
  }
  const declineFill = Schema.decodeUnknownEither(
    OracleBattleInterruptDecisionFillSchema,
  )({
    kind: "interruptDecision",
    holeId: opportunityAttack.frontier.decisionHole.holeId,
    value: {
      kind: "decline",
      responderId: interruptChoiceResponderId(opportunityChoice),
    },
  });
  if (Either.isLeft(declineFill)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source interrupt decline fill was not canonical.",
    });
  }

  return Either.right({
    battle: twoStatBlockBattle(),
    moveSubject,
    movementHole,
    movementWithoutOpportunityAttack,
    movementWithOpportunityAttack,
    interruptDecisionDecline: {
      kind: "interruptDecision",
      fill: declineFill.right,
    },
  });
}

function decodeSourceCase(
  input: unknown,
): Either.Either<OracleCase, OracleEvaluationSourceIssue> {
  const decoded = decodeOracleCase(input);
  return Either.isLeft(decoded)
    ? Either.left({
        tag: "sourceConstructionFailure",
        message: `Source Case failed admission: ${JSON.stringify(decoded.left)}`,
      })
    : Either.right(decoded.right);
}

function completeCreationFillBatches(
  services: OracleEvaluationServices,
): Either.Either<CreationSource, OracleEvaluationSourceIssue> {
  let draft = createCharacterDraft({
    draftId: characterDraftId("opaque-oracle:corpus-draft"),
  });
  const batches: Array<[CreationFill, ...CreationFill[]]> = [];
  const scores = abilityScoreAssignment({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });
  if (Either.isLeft(scores)) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source ability-score assignment was rejected.",
    });
  }

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const hole = discoverCreationHoles({
      draft,
      unitLibrary: services.unitLibrary,
    })[0];
    if (hole === undefined) {
      const firstFill = batches[0]?.[0];
      return firstFill === undefined
        ? Either.left({
            tag: "sourceConstructionFailure",
            message: "Source Character Creation produced no fill batches.",
          })
        : Either.right({ fillBatches: batches, firstFill });
    }
    const accepted = acceptedFillForHole(draft, hole, scores.right, services);
    if (Either.isLeft(accepted)) return Either.left(accepted.left);
    batches.push([accepted.right.fill]);
    draft = accepted.right.draft;
  }
  return Either.left({
    tag: "sourceConstructionFailure",
    message: "Source Character Creation did not converge.",
  });
}

function acceptedFillForHole(
  draft: CharacterDraft,
  hole: CreationHole,
  scores: Extract<CreationFill, { kind: "abilityScores" }>["value"],
  services: OracleEvaluationServices,
): Either.Either<
  { readonly fill: CreationFill; readonly draft: CharacterDraft },
  OracleEvaluationSourceIssue
> {
  if (hole.kind === "abilityScores") {
    const fill: CreationFill = {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: scores,
    };
    const result = fillCreationHoles({
      draft,
      unitLibrary: services.unitLibrary,
      expectedRevision: draft.revision,
      fills: [fill],
    });
    return result.tag === "accepted"
      ? Either.right({ fill, draft: result.draft })
      : Either.left({
          tag: "sourceConstructionFailure",
          message: `Source ability-score fill rejected at ${hole.holeId}.`,
        });
  }

  const { min, max } = choiceCardinalityBounds(hole.cardinality);
  const optionIds = hole.options.map((option) => option.optionId);
  for (let size = Number(min); size <= Number(max); size += 1) {
    for (const selectedOptionIds of choiceCombinations(optionIds, size, 256)) {
      const fill: CreationFill = {
        kind: "choice",
        holeId: hole.holeId,
        optionIds: selectedOptionIds,
      };
      const result = fillCreationHoles({
        draft,
        unitLibrary: services.unitLibrary,
        expectedRevision: draft.revision,
        fills: [fill],
      });
      if (result.tag === "accepted") {
        return Either.right({ fill, draft: result.draft });
      }
    }
  }
  return Either.left({
    tag: "sourceConstructionFailure",
    message: `Source has no accepted fill for ${hole.holeId}.`,
  });
}

function choiceCombinations(
  values: readonly CreationChoiceOptionId[],
  size: number,
  limit: number,
): readonly (readonly CreationChoiceOptionId[])[] {
  const output: CreationChoiceOptionId[][] = [];
  collectChoiceCombinations(values, size, 0, [], output, limit);
  return output;
}

function collectChoiceCombinations(
  values: readonly CreationChoiceOptionId[],
  size: number,
  start: number,
  prefix: readonly CreationChoiceOptionId[],
  output: CreationChoiceOptionId[][],
  limit: number,
): void {
  if (output.length >= limit) return;
  if (prefix.length === size) {
    output.push([...prefix]);
    return;
  }
  for (let index = start; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) continue;
    collectChoiceCombinations(
      values,
      size,
      index + 1,
      [...prefix, value],
      output,
      limit,
    );
    if (output.length >= limit) return;
  }
}

function safeErrorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return "Unknown Oracle evaluation source failure";
  }
}
