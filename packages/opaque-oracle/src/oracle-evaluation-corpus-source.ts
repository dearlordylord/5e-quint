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
  type StatBlockAttackDamageSelection,
} from "@dnd/battle-runtime";
import { statBlockId, type StatBlockId } from "@dnd/shared/game-facts";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import { Result, Option, Schema } from "effect";
import { resolveWeaponMasteryReference } from "@dnd/surface/surface/unit-catalog";

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
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
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

type StatBlockAttackExecutionSelection = {
  readonly procedureRef: StatBlockProcedureRef;
  readonly statBlockDamageSelection: StatBlockAttackDamageSelection;
};

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
): Result.Result<OracleCorpusCases, OracleEvaluationSourceIssue> {
  try {
    return buildSourceCases(services);
  } catch (error) {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: safeErrorMessage(error),
    });
  }
}

function buildSourceCases(
  services: OracleEvaluationServices,
): Result.Result<OracleCorpusCases, OracleEvaluationSourceIssue> {
  const creationBatches = completeCreationFillBatches(services.unitLibrary);
  if (Result.isFailure(creationBatches)) {
    return Result.fail(creationBatches.failure);
  }
  const firstFill = creationBatches.success[0]?.[0];
  if (firstFill === undefined) {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source Character Creation produced no fill batches.",
    });
  }
  const creation: CreationSource = {
    fillBatches: creationBatches.success,
    firstFill,
  };

  const initial = buildInitialSourceCases(creation);
  if (Result.isFailure(initial)) return Result.fail(initial.failure);
  const sourceBattle = battleSourceFacts(services);
  if (Result.isFailure(sourceBattle)) return Result.fail(sourceBattle.failure);
  const transition = buildTransitionSourceCases(creation, sourceBattle.success);
  if (Result.isFailure(transition)) return Result.fail(transition.failure);
  const boundary = buildBoundarySourceCases(creation);
  if (Result.isFailure(boundary)) return Result.fail(boundary.failure);
  const initialCases = initial.success;
  const transitionCases = transition.success;
  const boundaryCases = boundary.success;

  // Keep A/B/A at the beginning of the actual ordered batch. The repeated
  // entered Case is intentional evidence for equality, order, and multiplicity.
  return Result.succeed([
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
): Result.Result<InitialSourceCases, OracleEvaluationSourceIssue> {
  const enteredCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: singleStatBlockBattle(),
  });
  if (Result.isFailure(enteredCase)) return Result.fail(enteredCase.failure);

  const exhaustedCase = decodeSourceCase({
    creation: { fillBatches: [] },
    sheet: { tag: "ordinary" },
    battle: enteredCase.success.battle,
  });
  if (Result.isFailure(exhaustedCase))
    return Result.fail(exhaustedCase.failure);

  const mixedCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: mixedOriginBattle(),
  });
  if (Result.isFailure(mixedCase)) return Result.fail(mixedCase.failure);

  const wildShapeCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: {
      tag: "wildShapeKnownForms",
      statBlockIds: [statBlockId("stat_block_rat")],
    },
    battle: singleStatBlockBattle(),
  });
  if (Result.isFailure(wildShapeCase))
    return Result.fail(wildShapeCase.failure);

  return Result.succeed({
    enteredCase: enteredCase.success,
    exhaustedCase: exhaustedCase.success,
    mixedCase: mixedCase.success,
    wildShapeCase: wildShapeCase.success,
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
): Result.Result<TransitionSourceCases, OracleEvaluationSourceIssue> {
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
  if (Result.isFailure(moveHolesCase))
    return Result.fail(moveHolesCase.failure);

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
  if (Result.isFailure(retryCase)) return Result.fail(retryCase.failure);

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
  if (Result.isFailure(resolvedMovementCase)) {
    return Result.fail(resolvedMovementCase.failure);
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
  if (Result.isFailure(interruptResolutionCase)) {
    return Result.fail(interruptResolutionCase.failure);
  }

  return Result.succeed({
    moveHolesCase: moveHolesCase.success,
    retryCase: retryCase.success,
    resolvedMovementCase: resolvedMovementCase.success,
    interruptResolutionCase: interruptResolutionCase.success,
  });
}

type BoundarySourceCases = {
  readonly inputSurplusCase: OracleCase;
  readonly fillRejectedCase: OracleCase;
  readonly emptyRosterCase: OracleCase;
};

function buildBoundarySourceCases(
  creation: CreationSource,
): Result.Result<BoundarySourceCases, OracleEvaluationSourceIssue> {
  const inputSurplusCase = decodeSourceCase({
    creation: {
      fillBatches: [...creation.fillBatches, [creation.firstFill]],
    },
    sheet: { tag: "ordinary" },
    battle: singleStatBlockBattle(),
  });
  if (Result.isFailure(inputSurplusCase)) {
    return Result.fail(inputSurplusCase.failure);
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
  if (Result.isFailure(fillRejectedCase)) {
    return Result.fail(fillRejectedCase.failure);
  }

  const emptyRosterCase = decodeSourceCase({
    creation: { fillBatches: creation.fillBatches },
    sheet: { tag: "ordinary" },
    battle: {
      roster: { tag: "statBlocks", entries: [] },
      attempts: [],
    },
  });
  if (Result.isFailure(emptyRosterCase))
    return Result.fail(emptyRosterCase.failure);

  return Result.succeed({
    inputSurplusCase: inputSurplusCase.success,
    fillRejectedCase: fillRejectedCase.success,
    emptyRosterCase: emptyRosterCase.success,
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
): Result.Result<BattleRuntimeSession, OracleEvaluationSourceIssue> {
  const initialized: BattleCreatureInit[] = [];
  for (const placement of placements) {
    const statBlock = services.statBlockCatalog.getStatBlock(
      placement.statBlockId,
    );
    if (Option.isNone(statBlock)) {
      return Result.fail({
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
    if (Result.isFailure(creature)) {
      return Result.fail({
        tag: "sourceConstructionFailure",
        message: `Source stat-block ${placement.statBlockId} could not be initialized for ${placement.combatantId}.`,
      });
    }
    initialized.push(creature.success);
  }

  const started = startBattle({
    battleId: ORACLE_BATTLE_ID,
    combatants: initialized,
  });
  return Result.isFailure(started)
    ? Result.fail({
        tag: "sourceConstructionFailure",
        message: "Source stat-block battle could not be started.",
      })
    : Result.succeed(started.success);
}

export function discoverStatBlockAttackExecutionSelection(
  session: BattleRuntimeSession,
  actorId: CombatantId,
): Result.Result<
  StatBlockAttackExecutionSelection,
  OracleEvaluationSourceIssue
> {
  const ended = endBattleRuntimeTurn({ session, actorId });
  if (ended.tag !== "resolved") {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source stat-block turn could not end.",
    });
  }
  const attackAct = discoverBattleActs(ended.session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      "statBlockDamageSelection" in act.subject,
  );
  if (
    attackAct?.subject.tag !== "action" ||
    attackAct.subject.action !== "attack" ||
    !("statBlockDamageSelection" in attackAct.subject)
  ) {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source reactor did not expose a typed attack procedure.",
    });
  }
  const procedureRef = Schema.decodeUnknownResult(
    BattleStatBlockProcedureExecutionRef,
  )(attackAct.subject.procedureRef);
  return Result.isFailure(procedureRef)
    ? Result.fail({
        tag: "sourceConstructionFailure",
        message: "Source attack procedure reference was not canonical.",
      })
    : Result.succeed({
        procedureRef: procedureRef.success,
        statBlockDamageSelection: attackAct.subject.statBlockDamageSelection,
      });
}

function battleSourceFacts(
  services: OracleEvaluationServices,
): Result.Result<BattleSourceFacts, OracleEvaluationSourceIssue> {
  const firstId = CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS[0].combatantId;
  const secondId = CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS[1].combatantId;
  const movement = prepareBattleMovementFacts(services, firstId, secondId);
  if (Result.isFailure(movement)) return Result.fail(movement.failure);
  const interruptDecisionDecline = buildInterruptDecisionDecline(
    services,
    movement.success,
  );
  if (Result.isFailure(interruptDecisionDecline)) {
    return Result.fail(interruptDecisionDecline.failure);
  }
  return Result.succeed({
    battle: twoStatBlockBattle(),
    moveSubject: movement.success.moveSubject,
    movementHole: movement.success.movementHole,
    movementWithoutOpportunityAttack:
      movement.success.movementWithoutOpportunityAttack,
    movementWithOpportunityAttack:
      movement.success.movementWithOpportunityAttack,
    interruptDecisionDecline: interruptDecisionDecline.success,
  });
}

function prepareBattleMovementFacts(
  services: OracleEvaluationServices,
  firstId: CombatantId,
  secondId: CombatantId,
): Result.Result<BattleMovementFacts, OracleEvaluationSourceIssue> {
  const started = discoverBattleMovementStart(services);
  if (Result.isFailure(started)) return Result.fail(started.failure);

  const attackSelection = discoverStatBlockAttackExecutionSelection(
    started.success.session,
    firstId,
  );
  if (Result.isFailure(attackSelection)) {
    return Result.fail(attackSelection.failure);
  }

  const movementWithoutOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: started.success.movementHole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [],
    },
  };
  const movementWithOpportunityAttack: BattleFill = {
    kind: "movement",
    holeId: started.success.movementHole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(10),
      provokedOpportunityAttacks: [
        {
          reactorId: secondId,
          distanceFeet: movementFeet(5),
          ...attackSelection.success,
        },
      ],
    },
  };
  return Result.succeed({
    session: started.success.session,
    moveSubject: started.success.moveSubject,
    movementHole: started.success.movementHole,
    movementWithoutOpportunityAttack,
    movementWithOpportunityAttack,
  });
}

function discoverBattleMovementStart(
  services: OracleEvaluationServices,
): Result.Result<BattleMovementStart, OracleEvaluationSourceIssue> {
  const started = startStatBlockBattle(
    services,
    CORPUS_BATTLE_STAT_BLOCK_PLACEMENTS,
  );
  if (Result.isFailure(started)) return Result.fail(started.failure);

  const moveSubject = discoverBattleMoveSubject(started.success);
  if (Result.isFailure(moveSubject)) return Result.fail(moveSubject.failure);
  const movementHole = discoverBattleMovementHole(
    started.success,
    moveSubject.success,
    services.statBlockCatalog,
  );
  if (Result.isFailure(movementHole)) return Result.fail(movementHole.failure);

  return Result.succeed({
    session: started.success,
    moveSubject: moveSubject.success,
    movementHole: movementHole.success,
  });
}

function discoverBattleMoveSubject(
  session: BattleRuntimeSession,
): Result.Result<MoveSubject, OracleEvaluationSourceIssue> {
  const moveAct = discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "runtimeCommand" && act.subject.command === "move",
  );
  if (
    moveAct === undefined ||
    moveAct.subject.tag !== "runtimeCommand" ||
    moveAct.subject.command !== "move"
  ) {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source stat-block battle did not expose a Move act.",
    });
  }
  return Result.succeed(moveAct.subject);
}

function discoverBattleMovementHole(
  session: BattleRuntimeSession,
  moveSubject: MoveSubject,
  statBlockCatalog: OracleEvaluationServices["statBlockCatalog"],
): Result.Result<OrdinaryMovementHole, OracleEvaluationSourceIssue> {
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
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source Move did not expose ordinary mechanical holes.",
    });
  }
  const movementHole = moveHoles.frontier.holes.find(
    (hole) => hole.kind === "movement",
  );
  return movementHole?.kind === "movement"
    ? Result.succeed(movementHole)
    : Result.fail({
        tag: "sourceConstructionFailure",
        message: "Source Move did not expose a movement hole.",
      });
}

function buildInterruptDecisionDecline(
  services: OracleEvaluationServices,
  movement: BattleMovementFacts,
): Result.Result<OracleBattleAttempt, OracleEvaluationSourceIssue> {
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
    return Result.fail({
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
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source movement interrupt did not expose Opportunity Attack.",
    });
  }
  const declineFill = Schema.decodeUnknownResult(
    OracleBattleInterruptDecisionFillSchema,
  )({
    kind: "interruptDecision",
    holeId: opportunityAttack.frontier.decisionHole.holeId,
    value: {
      kind: "decline",
      responderId: interruptChoiceResponderId(opportunityChoice),
    },
  });
  if (Result.isFailure(declineFill)) {
    return Result.fail({
      tag: "sourceConstructionFailure",
      message: "Source interrupt decline fill was not canonical.",
    });
  }

  return Result.succeed({
    kind: "interruptDecision",
    fill: declineFill.success,
  });
}

function decodeSourceCase(
  input: unknown,
): Result.Result<OracleCase, OracleEvaluationSourceIssue> {
  const decoded = decodeOracleCase(input);
  return Result.isFailure(decoded)
    ? Result.fail({
        tag: "sourceConstructionFailure",
        message: `Source Case failed admission: ${JSON.stringify(decoded.failure)}`,
      })
    : Result.succeed(decoded.success);
}

export function completeCreationFillBatches(
  unitLibrary: OracleEvaluationServices["unitLibrary"],
): Result.Result<OracleCreationFillBatches, OracleEvaluationSourceIssue> {
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
  if (Result.isFailure(scores)) {
    return Result.fail({
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
      return Result.succeed(batches);
    }
    const accepted = acceptedFillForHole(
      draft,
      hole,
      scores.success,
      unitLibrary,
    );
    if (Result.isFailure(accepted)) return Result.fail(accepted.failure);
    batches.push([accepted.success.fill]);
    draft = accepted.success.draft;
  }
  return Result.fail({
    tag: "sourceConstructionFailure",
    message: "Source Character Creation did not converge.",
  });
}

function acceptedFillForHole(
  draft: CharacterDraft,
  hole: CreationHole,
  scores: Extract<CreationFill, { kind: "abilityScores" }>["value"],
  unitLibrary: OracleEvaluationServices["unitLibrary"],
): Result.Result<
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
      ? Result.succeed({ fill, draft: result.draft })
      : Result.fail({
          tag: "sourceConstructionFailure",
          message: `Source ability-score fill rejected at ${hole.holeId}.`,
        });
  }

  const { min, max } = choiceCardinalityBounds(hole.cardinality);
  const optionIds = battleExecutableChoiceOptions(hole, unitLibrary).map(
    (option) => option.optionId,
  );
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
        return Result.succeed({ fill, draft: result.draft });
      }
    }
  }
  return Result.fail({
    tag: "sourceConstructionFailure",
    message: `Source has no accepted fill for ${hole.holeId}.`,
  });
}

function battleExecutableChoiceOptions(
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
  unitLibrary: OracleEvaluationServices["unitLibrary"],
): Extract<CreationHole, { readonly kind: "choice" }>["options"] {
  if (
    hole.source.tag !== "unitChoice" ||
    hole.source.choiceKey !== WEAPON_MASTERY_OPTIONS_CHOICE_KEY
  ) {
    return hole.options;
  }
  const supported: (typeof hole.options)[number][] = [];
  const unsupportedWeaponMasteries: (typeof hole.options)[number][] = [];
  for (const option of hole.options) {
    const unit =
      option.unitRef === undefined
        ? Option.none()
        : unitLibrary.getUnit(option.unitRef.unitId);
    if (
      Option.isSome(unit) &&
      unit.value.kind === "weapon" &&
      Result.isFailure(resolveWeaponMasteryReference(unit.value, unitLibrary))
    ) {
      unsupportedWeaponMasteries.push(option);
    } else {
      supported.push(option);
    }
  }
  return [...supported, ...unsupportedWeaponMasteries];
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
