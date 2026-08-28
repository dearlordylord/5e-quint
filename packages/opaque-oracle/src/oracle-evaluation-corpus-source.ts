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
  type BattleCreatureInit,
  type BattleMechanicalFrontier,
  type BattleRuntimeSession,
  type BattleSubject,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import { statBlockId, type StatBlockId } from "@dnd/shared/game-facts";
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

export type OracleStatBlockBattlePlacement = {
  readonly combatantId: CombatantId;
  readonly statBlockId: StatBlockId;
  readonly initiative: InitiativeScore;
};

export type OracleStatBlockBattleInput = Omit<OracleBattleInput, "roster"> & {
  readonly roster: Extract<
    OracleBattleInput["roster"],
    { readonly tag: "statBlocks" }
  >;
};

const CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS = [
  {
    combatantId: combatantId("corpus:stat-block-a"),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative: initiativeScore(10),
  },
  {
    combatantId: combatantId("corpus:stat-block-b"),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative: initiativeScore(0),
  },
] as const satisfies readonly [
  OracleStatBlockBattlePlacement,
  ...OracleStatBlockBattlePlacement[],
];

export type OracleCreationFillBatches = readonly [
  CreationFill,
  ...CreationFill[],
][];

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

type StatBlockProcedureRef = Schema.Schema.Type<
  typeof BattleStatBlockProcedureExecutionRef
>;

type BattleMovementFacts = {
  readonly session: BattleRuntimeSession;
  readonly moveSubject: MoveSubject;
  readonly movementHole: OrdinaryMovementHole;
  readonly movementWithoutOpportunityAttack: BattleFill;
  readonly movementWithOpportunityAttack: BattleFill;
};

type BattleMovementStart = Pick<
  BattleMovementFacts,
  "session" | "moveSubject" | "movementHole"
>;

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
  const creationBatches = completeCreationFillBatches(services.unitLibrary);
  if (Either.isLeft(creationBatches)) {
    return Either.left(creationBatches.left);
  }
  const firstFill = creationBatches.right[0]?.[0];
  if (firstFill === undefined) {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source Character Creation produced no fill batches.",
    });
  }
  const creation: CreationSource = {
    fillBatches: creationBatches.right,
    firstFill,
  };

  const initial = buildInitialSourceCases(creation);
  if (Either.isLeft(initial)) return Either.left(initial.left);
  const sourceBattle = battleSourceFacts(services);
  if (Either.isLeft(sourceBattle)) return Either.left(sourceBattle.left);
  const transition = buildTransitionSourceCases(creation, sourceBattle.right);
  if (Either.isLeft(transition)) return Either.left(transition.left);
  const boundary = buildBoundarySourceCases(creation);
  if (Either.isLeft(boundary)) return Either.left(boundary.left);
  const initialCases = initial.right;
  const transitionCases = transition.right;
  const boundaryCases = boundary.right;

  // Keep A/B/A at the beginning of the actual ordered batch. The repeated
  // entered Case is intentional evidence for equality, order, and multiplicity.
  return Either.right([
    initialCases.enteredCase,
    initialCases.exhaustedCase,
    initialCases.enteredCase,
    initialCases.mixedCase,
    initialCases.wildShapeCase,
    transitionCases.moveHolesCase,
    transitionCases.retryCase,
    transitionCases.resolvedMovementCase,
    transitionCases.interruptResolutionCase,
    boundaryCases.inputSurplusCase,
    boundaryCases.fillRejectedCase,
    boundaryCases.emptyRosterCase,
  ]);
}

type InitialSourceCases = {
  readonly enteredCase: OracleCase;
  readonly exhaustedCase: OracleCase;
  readonly mixedCase: OracleCase;
  readonly wildShapeCase: OracleCase;
};

function buildInitialSourceCases(
  creation: CreationSource,
): Either.Either<InitialSourceCases, OracleEvaluationSourceIssue> {
  const enteredCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: singleStatBlockBattle(),
  });
  if (Either.isLeft(enteredCase)) return Either.left(enteredCase.left);

  const exhaustedCase = decodeSourceCase({
    creation: { fillBatches: [] },
    sheet: { tag: "ordinary" },
    battle: enteredCase.right.battle,
  });
  if (Either.isLeft(exhaustedCase)) return Either.left(exhaustedCase.left);

  const mixedCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: mixedOriginBattle(),
  });
  if (Either.isLeft(mixedCase)) return Either.left(mixedCase.left);

  const wildShapeCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: {
      tag: "wildShapeKnownForms",
      statBlockIds: [statBlockId("stat_block_rat")],
    },
    battle: singleStatBlockBattle(),
  });
  if (Either.isLeft(wildShapeCase)) return Either.left(wildShapeCase.left);

  return Either.right({
    enteredCase: enteredCase.right,
    exhaustedCase: exhaustedCase.right,
    mixedCase: mixedCase.right,
    wildShapeCase: wildShapeCase.right,
  });
}

type TransitionSourceCases = {
  readonly moveHolesCase: OracleCase;
  readonly retryCase: OracleCase;
  readonly resolvedMovementCase: OracleCase;
  readonly interruptResolutionCase: OracleCase;
};

function buildTransitionSourceCases(
  creation: CreationSource,
  sourceBattle: BattleSourceFacts,
): Either.Either<TransitionSourceCases, OracleEvaluationSourceIssue> {
  const moveHolesCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.moveSubject,
          fills: [],
        },
      ],
    },
  });
  if (Either.isLeft(moveHolesCase)) return Either.left(moveHolesCase.left);

  const retryCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: {
            ...sourceBattle.moveSubject,
            actorId: combatantId("corpus:wrong-actor"),
          },
          fills: [],
        },
        {
          kind: "ordinarySubject",
          subject: sourceBattle.moveSubject,
          fills: [],
        },
      ],
    },
  });
  if (Either.isLeft(retryCase)) return Either.left(retryCase.left);

  const resolvedMovementCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.moveSubject,
          fills: [sourceBattle.movementWithoutOpportunityAttack],
        },
      ],
    },
  });
  if (Either.isLeft(resolvedMovementCase)) {
    return Either.left(resolvedMovementCase.left);
  }

  const interruptResolutionCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      ...sourceBattle.battle,
      attempts: [
        {
          kind: "ordinarySubject",
          subject: sourceBattle.moveSubject,
          fills: [sourceBattle.movementWithOpportunityAttack],
        },
        sourceBattle.interruptDecisionDecline,
      ],
    },
  });
  if (Either.isLeft(interruptResolutionCase)) {
    return Either.left(interruptResolutionCase.left);
  }

  return Either.right({
    moveHolesCase: moveHolesCase.right,
    retryCase: retryCase.right,
    resolvedMovementCase: resolvedMovementCase.right,
    interruptResolutionCase: interruptResolutionCase.right,
  });
}

type BoundarySourceCases = {
  readonly inputSurplusCase: OracleCase;
  readonly fillRejectedCase: OracleCase;
  readonly emptyRosterCase: OracleCase;
};

function buildBoundarySourceCases(
  creation: CreationSource,
): Either.Either<BoundarySourceCases, OracleEvaluationSourceIssue> {
  const inputSurplusCase = decodeSourceCase({
    creation: {
      fillBatches: [...creation.fillBatches, [creation.firstFill]],
    },
    sheet: { tag: "ordinary" },
    battle: singleStatBlockBattle(),
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
    battle: singleStatBlockBattle(),
  });
  if (Either.isLeft(fillRejectedCase)) {
    return Either.left(fillRejectedCase.left);
  }

  const emptyRosterCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      roster: { tag: "statBlocks", entries: [] },
      attempts: [],
    },
  });
  if (Either.isLeft(emptyRosterCase)) return Either.left(emptyRosterCase.left);

  return Either.right({
    inputSurplusCase: inputSurplusCase.right,
    fillRejectedCase: fillRejectedCase.right,
    emptyRosterCase: emptyRosterCase.right,
  });
}

export function statBlockRosterEntryFor(
  placement: OracleStatBlockBattlePlacement,
): Extract<
  OracleBattleInput["roster"],
  { readonly tag: "statBlocks" }
>["entries"][number] {
  return {
    combatantId: placement.combatantId,
    statBlockId: placement.statBlockId,
    initiative: placement.initiative,
    ammunitionStocks: { arrow: 0 },
    conditions: [],
    tempHp: 0,
  };
}

export function statBlockBattleFor(
  placements: readonly [
    OracleStatBlockBattlePlacement,
    ...OracleStatBlockBattlePlacement[],
  ],
): OracleStatBlockBattleInput {
  return {
    roster: {
      tag: "statBlocks",
      entries: placements.map(statBlockRosterEntryFor),
    },
    attempts: [],
  };
}

function singleStatBlockBattle(): OracleStatBlockBattleInput {
  return statBlockBattleFor([
    {
      combatantId: combatantId("corpus:stat-block-combatant"),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: initiativeScore(0),
    },
  ]);
}

function mixedOriginBattle(): OracleBattleInput {
  return {
    roster: {
      tag: "characterSheet",
      precedingStatBlocks: [],
      characterSheet: {
        combatantId: combatantId("corpus:character"),
        initiative: initiativeScore(1),
        ammunitionStocks: {},
      },
      followingStatBlocks: [
        statBlockRosterEntryFor({
          combatantId: combatantId("corpus:stat-block-combatant"),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative: initiativeScore(0),
        }),
      ],
    },
    attempts: [],
  };
}

function twoStatBlockBattle(): OracleStatBlockBattleInput {
  return statBlockBattleFor(CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS);
}

export function startStatBlockBattle(
  services: OracleEvaluationServices,
  placements: readonly [
    OracleStatBlockBattlePlacement,
    ...OracleStatBlockBattlePlacement[],
  ],
): Either.Either<BattleRuntimeSession, OracleEvaluationSourceIssue> {
  const initialized: BattleCreatureInit[] = [];
  for (const placement of placements) {
    const statBlock = services.statBlockCatalog.getStatBlock(
      placement.statBlockId,
    );
    if (Option.isNone(statBlock)) {
      return Either.left({
        tag: "sourceConstructionFailure",
        message: `Source stat-block ${placement.statBlockId} was not found.`,
      });
    }
    const creature = battleCreatureInitFromStatBlock({
      combatantId: placement.combatantId,
      statBlock: statBlock.value,
      initiative: placement.initiative,
      ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(0) }],
      conditions: [],
    });
    if (Either.isLeft(creature)) {
      return Either.left({
        tag: "sourceConstructionFailure",
        message: `Source stat-block ${placement.statBlockId} could not be initialized for ${placement.combatantId}.`,
      });
    }
    initialized.push(creature.right);
  }

  const started = startBattle({
    battleId: ORACLE_BATTLE_ID,
    combatants: initialized,
  });
  return Either.isLeft(started)
    ? Either.left({
        tag: "sourceConstructionFailure",
        message: "Source stat-block battle could not be started.",
      })
    : Either.right(started.right);
}

export function discoverStatBlockAttackProcedureRef(
  session: BattleRuntimeSession,
  actorId: CombatantId,
): Either.Either<StatBlockProcedureRef, OracleEvaluationSourceIssue> {
  const ended = endBattleRuntimeTurn({ session, actorId });
  if (ended.tag !== "resolved") {
    return Either.left({
      tag: "sourceConstructionFailure",
      message: "Source stat-block turn could not end.",
    });
  }
  const attackAct = discoverBattleActs(ended.session).find(
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
  return Either.isLeft(procedureRef)
    ? Either.left({
        tag: "sourceConstructionFailure",
        message: "Source attack procedure reference was not canonical.",
      })
    : Either.right(procedureRef.right);
}

function battleSourceFacts(
  services: OracleEvaluationServices,
): Either.Either<BattleSourceFacts, OracleEvaluationSourceIssue> {
  const firstId = CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS[0].combatantId;
  const secondId = CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS[1].combatantId;
  const movement = prepareBattleMovementFacts(services, firstId, secondId);
  if (Either.isLeft(movement)) return Either.left(movement.left);
  const interruptDecisionDecline = buildInterruptDecisionDecline(
    services,
    movement.right,
  );
  if (Either.isLeft(interruptDecisionDecline)) {
    return Either.left(interruptDecisionDecline.left);
  }
  return Either.right({
    battle: twoStatBlockBattle(),
    moveSubject: movement.right.moveSubject,
    movementHole: movement.right.movementHole,
    movementWithoutOpportunityAttack:
      movement.right.movementWithoutOpportunityAttack,
    movementWithOpportunityAttack: movement.right.movementWithOpportunityAttack,
    interruptDecisionDecline: interruptDecisionDecline.right,
  });
}

function prepareBattleMovementFacts(
  services: OracleEvaluationServices,
  firstId: CombatantId,
  secondId: CombatantId,
): Either.Either<BattleMovementFacts, OracleEvaluationSourceIssue> {
  const started = discoverBattleMovementStart(services);
  if (Either.isLeft(started)) return Either.left(started.left);

  const procedureRef = discoverStatBlockAttackProcedureRef(
    started.right.session,
    firstId,
  );
  if (Either.isLeft(procedureRef)) {
    return Either.left(procedureRef.left);
  }

  const movementWithoutOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: started.right.movementHole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [],
    },
  };
  const movementWithOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: started.right.movementHole.holeId,
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
  return Either.right({
    session: started.right.session,
    moveSubject: started.right.moveSubject,
    movementHole: started.right.movementHole,
    movementWithoutOpportunityAttack,
    movementWithOpportunityAttack,
  });
}

function discoverBattleMovementStart(
  services: OracleEvaluationServices,
): Either.Either<BattleMovementStart, OracleEvaluationSourceIssue> {
  const started = startStatBlockBattle(
    services,
    CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS,
  );
  if (Either.isLeft(started)) return Either.left(started.left);

  const moveSubject = discoverBattleMoveSubject(started.right);
  if (Either.isLeft(moveSubject)) return Either.left(moveSubject.left);
  const movementHole = discoverBattleMovementHole(
    started.right,
    moveSubject.right,
    services.statBlockCatalog,
  );
  if (Either.isLeft(movementHole)) return Either.left(movementHole.left);

  return Either.right({
    session: started.right,
    moveSubject: moveSubject.right,
    movementHole: movementHole.right,
  });
}

function discoverBattleMoveSubject(
  session: BattleRuntimeSession,
): Either.Either<MoveSubject, OracleEvaluationSourceIssue> {
  const moveAct = discoverBattleActs(session).find(
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
      message: "Source stat-block battle did not expose a Move act.",
    });
  }
  return Either.right(moveAct.subject);
}

function discoverBattleMovementHole(
  session: BattleRuntimeSession,
  moveSubject: MoveSubject,
  statBlockCatalog: OracleEvaluationServices["statBlockCatalog"],
): Either.Either<OrdinaryMovementHole, OracleEvaluationSourceIssue> {
  const moveHoles = settleBattleRuntimeTransaction({
    session,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: moveSubject,
      fills: [],
    },
    statBlockCatalog,
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
  return movementHole?.kind === "movement"
    ? Either.right(movementHole)
    : Either.left({
        tag: "sourceConstructionFailure",
        message: "Source Move did not expose a movement hole.",
      });
}

function buildInterruptDecisionDecline(
  services: OracleEvaluationServices,
  movement: BattleMovementFacts,
): Either.Either<OracleBattleAttempt, OracleEvaluationSourceIssue> {
  const opportunityAttack = settleBattleRuntimeTransaction({
    session: movement.session,
    transaction: null,
    operation: {
      kind: "ordinarySubject",
      subject: movement.moveSubject,
      fills: [movement.movementWithOpportunityAttack],
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

  return Either.right({ kind: "interruptDecision", fill: declineFill.right });
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

export function completeCreationFillBatches(
  unitLibrary: OracleEvaluationServices["unitLibrary"],
): Either.Either<OracleCreationFillBatches, OracleEvaluationSourceIssue> {
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
      unitLibrary,
    })[0];
    if (hole === undefined) {
      return Either.right(batches);
    }
    const accepted = acceptedFillForHole(
      draft,
      hole,
      scores.right,
      unitLibrary,
    );
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
  unitLibrary: OracleEvaluationServices["unitLibrary"],
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
      unitLibrary,
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
        unitLibrary,
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
