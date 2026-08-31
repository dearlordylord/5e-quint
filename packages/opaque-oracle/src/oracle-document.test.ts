import Ajv2020 from "ajv/dist/2020.js";
import { Result } from "effect";
import { describe, expect, it } from "vitest";

import {
  admitOracleCaseDocument,
  admitOracleEvaluationBatchDocument,
  admitOracleTraceDocument,
  decodeOracleCase,
  decodeOracleCaseDocument,
  decodeOracleCaseJson,
  decodeOracleEvaluationBatch,
  decodeOracleEvaluationBatchDocument,
  decodeOracleEvaluationBatchJson,
  decodeOracleTrace,
  decodeOracleTraceDocument,
  decodeOracleTraceJson,
} from "./oracle-case-trace.ts";
import {
  OracleCaseDocumentJsonSchema,
  OracleEvaluationBatchDocumentJsonSchema,
  OracleTraceDocumentJsonSchema,
} from "./oracle-document.ts";
import {
  canonicalStructuralKey,
  canonicalizeStringSet,
} from "./oracle-canonical.ts";

const documentSchemas = [
  ["Case", OracleCaseDocumentJsonSchema],
  ["Trace", OracleTraceDocumentJsonSchema],
  ["Evaluation Batch", OracleEvaluationBatchDocumentJsonSchema],
] as const;

const ajv = new Ajv2020({
  strict: false,
  inlineRefs: false,
  code: { optimize: 0 },
});

// Compile each graph once. Every parity table below uses these independent
// validators rather than Effect's JSON Schema implementation.
const documentValidators = {
  case: ajv.compile(OracleCaseDocumentJsonSchema),
  trace: ajv.compile(OracleTraceDocumentJsonSchema),
  batch: ajv.compile(OracleEvaluationBatchDocumentJsonSchema),
};

const statBlockEntry = {
  combatantId: "oracle:stat-block",
  statBlockId: "stat_block_skeleton",
  initiative: 0,
  ammunitionStocks: { arrow: 5, bolt: 1 },
  conditions: [],
  tempHp: 0,
} as const;

const minimalCase = {
  creation: { fillBatches: [] },
  sheet: { tag: "ordinary" },
  battle: {
    roster: { tag: "statBlocks", entries: [] },
    attempts: [],
  },
} as const;

const characterRosterCase = {
  ...minimalCase,
  battle: {
    roster: {
      tag: "characterSheet",
      precedingStatBlocks: [statBlockEntry],
      characterSheet: {
        combatantId: "oracle:character",
        initiative: 3,
        ammunitionStocks: { bullet: 2 },
      },
      followingStatBlocks: [
        { ...statBlockEntry, combatantId: "oracle:stat-block-after" },
      ],
    },
    attempts: [],
  },
} as const;

const wildShapeKnownFormsCase = {
  ...minimalCase,
  sheet: {
    tag: "wildShapeKnownForms",
    statBlockIds: ["stat_block_skeleton", "stat_block_rat"],
  },
} as const;

const ordinaryAttemptCase = {
  ...minimalCase,
  battle: {
    ...minimalCase.battle,
    attempts: [
      {
        kind: "ordinarySubject",
        subject: {
          tag: "action",
          actorId: "oracle:entered-actor",
          action: "dash",
          speedKind: "walk",
        },
        fills: [],
      },
    ],
  },
} as const;

const interruptAttemptCase = {
  ...minimalCase,
  battle: {
    ...minimalCase.battle,
    attempts: [
      {
        kind: "interruptDecision",
        fill: {
          kind: "interruptDecision",
          holeId: "oracle:interrupt-hole",
          value: {
            kind: "decline",
            responderId: "oracle:entered-actor",
          },
        },
      },
    ],
  },
} as const;

const orderedFill = {
  kind: "choice",
  holeId: "cc:draft:draft.background",
  optionIds: ["option:first"],
} as const;

const validBuild = {
  progression: { startingClass: "class", advancements: [] },
  background: "background",
  species: "species",
  originLanguages: ["Common", "Dwarvish", "Elvish"],
  classFeatureLanguages: [],
  alignment: { order: "neutral", morality: "neutral" },
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencyChoices: [],
  features: [],
  magicInitiateSpellAccesses: [],
  equipment: {
    startingEquipmentCurrencyRemainderCp: 0,
    owned: [],
    loadout: {},
  },
} as const;

const freshSheet = {
  hitPointMaximumReduction: 0,
  exhaustionLevel: 0,
  hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 },
  conditions: [],
  spentHitDice: [],
  restFeatureUses: [],
  resourceExpenditures: [],
  heroicInspiration: { tag: "none" },
  companion: { tag: "none" },
  druidWildShapeKnownForms: {
    statBlockIds: ["stat_block_skeleton", "stat_block_rat"],
  },
} as const;

const checkpoint = {
  round: 1,
  alreadyActed: [],
  stillToAct: [
    {
      creature: {
        combatantId: "oracle:entered-actor",
        origin: { kind: "statBlock" },
        hp: 1,
        maxHp: 1,
        tempHp: 0,
        armorClass: 10,
        size: "medium",
        conditions: [],
      },
      initiative: 0,
    },
  ],
} as const;

const enteredBattle = {
  tag: "entered",
  checkpoint,
  frontier: {
    kind: "acts",
    acts: [
      {
        tag: "runtimeCommand",
        actorId: "oracle:entered-actor",
        command: "endTurn",
      },
    ],
  },
  segment: {
    rejections: [],
    outcome: { tag: "awaitingInput" },
  },
} as const;

const ordinaryHolesFrontier = {
  kind: "ordinaryHoles",
  subject: {
    tag: "action",
    actorId: "oracle:entered-actor",
    action: "dash",
    speedKind: "walk",
  },
  holes: [
    {
      holeInstanceKey: "oracle:movement-hole:instance",
      holeId: "oracle:movement-hole",
      kind: "movement",
      actorId: "oracle:entered-actor",
      movementBudgetFeet: 30,
      speedKinds: [{ kind: "walk", movementBudgetFeet: 30 }],
    },
  ],
  acceptedFills: [],
} as const;

const interruptDecisionFrontier = {
  kind: "interruptDecision",
  decisionHole: {
    holeInstanceKey: "oracle:interrupt-hole:instance",
    holeId: "oracle:interrupt-hole",
    kind: "interruptDecision",
    trigger: "attackHit",
    eligibleResponders: ["oracle:entered-actor"],
  },
  choices: [
    {
      kind: "nestedProcedure",
      subject: {
        tag: "runtimeCommand",
        actorId: "oracle:entered-actor",
        command: "releaseReadiedMovement",
        readiedMovementActorId: "oracle:entered-actor",
      },
      initialHoles: [],
    },
  ],
} as const;

const builtTrace = {
  creation: {
    started: { holes: [] },
    progression: [],
    outcome: {
      tag: "built",
      build: validBuild,
      sheet: {
        tag: "constructed",
        sheet: freshSheet,
        battle: enteredBattle,
      },
    },
  },
} as const;

function traceWithBuild(build: unknown): unknown {
  return {
    ...builtTrace,
    creation: {
      ...builtTrace.creation,
      outcome: {
        ...builtTrace.creation.outcome,
        build,
      },
    },
  };
}

function traceWithEquipment(equipment: unknown): unknown {
  return traceWithBuild({ ...validBuild, equipment });
}

function recursiveTrace(depth: number): unknown {
  let continuation: unknown = {
    checkpoint,
    frontier: enteredBattle.frontier,
    segment: enteredBattle.segment,
  };
  for (let index = 0; index < depth; index += 1) {
    continuation = {
      checkpoint,
      frontier: enteredBattle.frontier,
      segment: {
        rejections: [],
        outcome: { tag: "next", continuation },
      },
    };
  }
  return {
    ...builtTrace,
    creation: {
      ...builtTrace.creation,
      outcome: {
        ...builtTrace.creation.outcome,
        sheet: {
          ...builtTrace.creation.outcome.sheet,
          battle: {
            ...enteredBattle,
            segment: {
              rejections: [],
              outcome: { tag: "next", continuation },
            },
          },
        },
      },
    },
  };
}

function recursiveInterruptFill(depth: number): unknown {
  let fill: unknown = {
    kind: "interruptDecision",
    holeId: "oracle:interrupt-hole",
    value: {
      kind: "decline",
      responderId: "oracle:actor",
    },
  };
  for (let index = 0; index < depth; index += 1) {
    fill = {
      kind: "interruptDecision",
      holeId: "oracle:interrupt-hole",
      value: {
        kind: "resolve",
        responderId: "oracle:actor",
        choice: {
          kind: "releaseReadiedMovement",
          fills: [fill],
        },
      },
    };
  }
  return fill;
}

function recursiveCase(depth: number): unknown {
  return {
    creation: { fillBatches: [] },
    sheet: { tag: "ordinary" },
    battle: {
      roster: { tag: "statBlocks", entries: [] },
      attempts: [
        {
          kind: "interruptDecision",
          fill: recursiveInterruptFill(depth),
        },
      ],
    },
  };
}

const readyActionTrace = {
  ...builtTrace,
  creation: {
    ...builtTrace.creation,
    outcome: {
      ...builtTrace.creation.outcome,
      sheet: {
        ...builtTrace.creation.outcome.sheet,
        battle: {
          ...enteredBattle,
          frontier: {
            kind: "acts",
            acts: [
              {
                tag: "action",
                actorId: "oracle:entered-actor",
                action: "ready",
              },
            ],
          },
        },
      },
    },
  },
} as const;

function battleEntryRejectedTrace(issues: readonly unknown[]) {
  return {
    ...builtTrace,
    creation: {
      ...builtTrace.creation,
      outcome: {
        ...builtTrace.creation.outcome,
        sheet: {
          ...builtTrace.creation.outcome.sheet,
          battle: { tag: "rejected", issues },
        },
      },
    },
  };
}

function documentResult<A, E>(result: Result.Result<A, E>): boolean {
  return Result.isSuccess(result);
}

function isFailureWithIssues(value: unknown): boolean {
  if (
    typeof value !== "object" ||
    value === null ||
    !("_tag" in value) ||
    value._tag !== "Failure" ||
    !("failure" in value)
  ) {
    return false;
  }
  return Array.isArray(value.failure) && value.failure.length > 0;
}

describe("Opaque Oracle document JSON Schemas", () => {
  it("compiles every derived document graph with one independent Ajv2020", () => {
    for (const [name, schema] of documentSchemas) {
      expect(schema, `the ${name} document schema should be present`).toBe(
        schema,
      );
    }
    expect(documentValidators.case).toBeTypeOf("function");
    expect(documentValidators.trace).toBeTypeOf("function");
    expect(documentValidators.batch).toBeTypeOf("function");
  }, 120_000);

  it("keeps Case Ajv and Effect Document admission in parity", () => {
    const validCases = [
      ["minimal stat-block roster", minimalCase],
      ["character-sheet prefix and suffix", characterRosterCase],
      ["wild-shape known-form set", wildShapeKnownFormsCase],
      [
        "ammunition object map",
        {
          ...minimalCase,
          battle: {
            ...minimalCase.battle,
            roster: {
              tag: "statBlocks",
              entries: [{ ...statBlockEntry, ammunitionStocks: { bolt: 3 } }],
            },
          },
        },
      ],
      [
        "repeated ordered creation batches",
        {
          ...minimalCase,
          creation: {
            fillBatches: [[orderedFill], [orderedFill]],
          },
        },
      ],
      ["ordinary subject attempt", ordinaryAttemptCase],
      ["interrupt decision attempt", interruptAttemptCase],
    ] as const;
    for (const [name, value] of validCases) {
      expect(documentValidators.case(value), `${name}: Ajv should accept`).toBe(
        true,
      );
      expect(
        documentResult(decodeOracleCaseDocument(value)),
        `${name}: Effect should accept`,
      ).toBe(true);
    }

    const invalidCases = [
      [
        "missing attempts",
        { ...minimalCase, battle: { roster: minimalCase.battle.roster } },
      ],
      ["unknown member", { ...minimalCase, unexpected: true }],
      [
        "unknown roster discriminant",
        {
          ...minimalCase,
          battle: {
            ...minimalCase.battle,
            roster: { tag: "neither", entries: [] },
          },
        },
      ],
      [
        "fractional initiative",
        {
          ...minimalCase,
          battle: {
            ...minimalCase.battle,
            roster: {
              tag: "statBlocks",
              entries: [{ ...statBlockEntry, initiative: 1.5 }],
            },
          },
        },
      ],
      [
        "negative ammunition",
        {
          ...minimalCase,
          battle: {
            ...minimalCase.battle,
            roster: {
              tag: "statBlocks",
              entries: [{ ...statBlockEntry, ammunitionStocks: { arrow: -1 } }],
            },
          },
        },
      ],
      [
        "duplicate true set",
        {
          ...minimalCase,
          sheet: {
            tag: "wildShapeKnownForms",
            statBlockIds: ["stat_block_rat", "stat_block_rat"],
          },
        },
      ],
      [
        "empty required nonempty",
        {
          ...minimalCase,
          sheet: { tag: "wildShapeKnownForms", statBlockIds: [] },
        },
      ],
      [
        "unknown ammunition map key",
        {
          ...minimalCase,
          battle: {
            ...minimalCase.battle,
            roster: {
              tag: "statBlocks",
              entries: [
                {
                  ...statBlockEntry,
                  ammunitionStocks: { arrow: 1, cartridge: 1 },
                },
              ],
            },
          },
        },
      ],
    ] as const;
    for (const [name, value] of invalidCases) {
      const ajvAccepted = documentValidators.case(value);
      const effectAccepted = documentResult(decodeOracleCaseDocument(value));
      expect(effectAccepted, `${name}: Effect/Ajv parity`).toBe(ajvAccepted);
      expect(ajvAccepted, `${name}: Ajv should reject`).toBe(false);
    }
  });

  it("keeps Trace Ajv and Effect Document admission in parity across terminal and battle states", () => {
    const terminalTraces = [
      {
        creation: {
          started: { holes: [] },
          progression: [],
          outcome: { tag: "inputExhausted" },
        },
      },
      {
        creation: {
          started: { holes: [] },
          progression: [{ holes: [] }, { holes: [] }],
          outcome: {
            tag: "fillRejected",
            issues: [{ tag: "illegalBatch", code: "staleRevision" }],
          },
        },
      },
      {
        creation: {
          started: { holes: [] },
          progression: [],
          outcome: {
            tag: "finalizationRejected",
            issues: [
              {
                tag: "unsupportedFinalization",
                cause: { tag: "unsupportedBackground" },
              },
            ],
          },
        },
      },
      {
        creation: {
          started: { holes: [] },
          progression: [],
          outcome: { tag: "inputSurplus", build: validBuild, index: 0 },
        },
      },
      builtTrace,
      readyActionTrace,
      {
        ...builtTrace,
        creation: {
          ...builtTrace.creation,
          outcome: {
            ...builtTrace.creation.outcome,
            sheet: {
              tag: "rejected",
              issues: [{ code: "hitPointStateInvalid" }],
            },
          },
        },
      },
      {
        ...builtTrace,
        creation: {
          ...builtTrace.creation,
          outcome: {
            ...builtTrace.creation.outcome,
            sheet: {
              ...builtTrace.creation.outcome.sheet,
              battle: {
                tag: "rejected",
                issues: [{ tag: "characterBattleEncounterEmptyRoster" }],
              },
            },
          },
        },
      },
      battleEntryRejectedTrace([
        { tag: "statBlockUnavailable", statBlockId: "stat_block_skeleton" },
      ]),
      battleEntryRejectedTrace([
        {
          tag: "battleCreatureInitRejected",
          issue: { tag: "battleCreatureInitIssue" },
        },
      ]),
      battleEntryRejectedTrace([
        {
          tag: "battleStateInitRejected",
          issue: { tag: "battleStateInitIssue" },
        },
      ]),
      battleEntryRejectedTrace([
        {
          tag: "characterBattleEncounterProjectionIssues",
          issues: [
            {
              tag: "characterBattleEncounterProjectionIssue",
              origin: "characterSheet",
              combatantId: "oracle:character",
              issue: { tag: "battleCreatureInitIssue" },
            },
            {
              tag: "characterBattleEncounterProjectionIssue",
              origin: "statBlock",
              combatantId: "oracle:stat-block",
              issue: { tag: "battleStateInitIssue" },
            },
          ],
        },
      ]),
    ] as const;
    for (const [index, value] of terminalTraces.entries()) {
      const ajvAccepted = documentValidators.trace(value);
      const effectAccepted = Result.isSuccess(decodeOracleTraceDocument(value));
      expect(effectAccepted, `trace ${index}: Ajv/Effect parity`).toBe(
        ajvAccepted,
      );
      expect(ajvAccepted, `trace ${index}: expected structural validity`).toBe(
        true,
      );
    }

    const recursiveNext = {
      ...builtTrace,
      creation: {
        ...builtTrace.creation,
        outcome: {
          ...builtTrace.creation.outcome,
          sheet: {
            ...builtTrace.creation.outcome.sheet,
            battle: {
              ...enteredBattle,
              segment: {
                rejections: [],
                outcome: {
                  tag: "next",
                  continuation: {
                    checkpoint,
                    frontier: enteredBattle.frontier,
                    segment: enteredBattle.segment,
                  },
                },
              },
            },
          },
        },
      },
    } as const;
    const nextTraceWithFrontier = (frontier: unknown) => ({
      ...recursiveNext,
      creation: {
        ...recursiveNext.creation,
        outcome: {
          ...recursiveNext.creation.outcome,
          sheet: {
            ...recursiveNext.creation.outcome.sheet,
            battle: {
              ...recursiveNext.creation.outcome.sheet.battle,
              segment: {
                ...recursiveNext.creation.outcome.sheet.battle.segment,
                outcome: {
                  ...recursiveNext.creation.outcome.sheet.battle.segment
                    .outcome,
                  continuation: {
                    ...recursiveNext.creation.outcome.sheet.battle.segment
                      .outcome.continuation,
                    frontier,
                  },
                },
              },
            },
          },
        },
      },
    });
    for (const [name, value] of [
      ["recursive next", recursiveNext],
      [
        "ordinary-hole continuation",
        nextTraceWithFrontier(ordinaryHolesFrontier),
      ],
      [
        "interrupt-decision continuation",
        nextTraceWithFrontier(interruptDecisionFrontier),
      ],
    ] as const) {
      const ajvAccepted = documentValidators.trace(value);
      const effectAccepted = Result.isSuccess(decodeOracleTraceDocument(value));
      expect(effectAccepted, `${name}: Ajv/Effect parity`).toBe(ajvAccepted);
      expect(ajvAccepted, `${name}: expected structural validity`).toBe(true);
    }

    const invalidTraces = [
      [
        "unknown outcome",
        {
          ...terminalTraces[0],
          creation: {
            ...terminalTraces[0].creation,
            outcome: { tag: "unknown" },
          },
        },
      ],
      [
        "missing outcome",
        {
          ...terminalTraces[0],
          creation: { started: { holes: [] }, progression: [] },
        },
      ],
      [
        "wrong round",
        {
          ...builtTrace,
          creation: {
            ...builtTrace.creation,
            outcome: {
              ...builtTrace.creation.outcome,
              sheet: {
                ...builtTrace.creation.outcome.sheet,
                battle: {
                  ...enteredBattle,
                  checkpoint: { ...checkpoint, round: 0 },
                },
              },
            },
          },
        },
      ],
    ] as const;
    for (const [name, value] of invalidTraces) {
      const ajvAccepted = documentValidators.trace(value);
      const effectAccepted = Result.isSuccess(decodeOracleTraceDocument(value));
      expect(effectAccepted, `${name}: Ajv/Effect parity`).toBe(ajvAccepted);
      expect(ajvAccepted, `${name}: expected rejection`).toBe(false);
    }
  });

  it("keeps owner structural predicates in Ajv, Document, and full admission parity", () => {
    const malformedEquipment = [
      [
        "catalog item armor prefix",
        traceWithEquipment({
          ...validBuild.equipment,
          owned: [{ kind: "catalogItem", itemId: "armor:", quantity: 1 }],
        }),
      ],
      [
        "authored catalog shield prefix",
        traceWithEquipment({
          ...validBuild.equipment,
          owned: [
            {
              kind: "authoredCatalogItem",
              itemId: "shield:",
              authoredItemId: "authored",
              spellcastingFocusKind: "arcane",
              quantity: 1,
            },
          ],
        }),
      ],
      [
        "armor loadout suffix",
        traceWithEquipment({
          ...validBuild.equipment,
          loadout: { armor: "armor:" },
        }),
      ],
      [
        "shield loadout suffix",
        traceWithEquipment({
          ...validBuild.equipment,
          loadout: { shield: "shield:" },
        }),
      ],
      [
        "main-hand loadout suffix",
        traceWithEquipment({
          ...validBuild.equipment,
          loadout: { weapon: { itemId: "main:", grip: "one_handed" } },
        }),
      ],
      [
        "off-hand loadout suffix",
        traceWithEquipment({
          ...validBuild.equipment,
          loadout: { offHandWeapon: { itemId: "off:" } },
        }),
      ],
    ] as const;
    const malformedBuilds = [
      [
        "origin language order",
        { ...validBuild, originLanguages: ["Dwarvish", "Common", "Elvish"] },
      ],
      [
        "origin language duplicate",
        { ...validBuild, originLanguages: ["Common", "Dwarvish", "Dwarvish"] },
      ],
      [
        "origin language short tuple",
        { ...validBuild, originLanguages: ["Common", "Dwarvish"] },
      ],
      [
        "origin language long tuple",
        {
          ...validBuild,
          originLanguages: ["Common", "Dwarvish", "Elvish", "Giant"],
        },
      ],
      [
        "negative copper",
        {
          ...validBuild,
          equipment: {
            ...validBuild.equipment,
            startingEquipmentCurrencyRemainderCp: -1,
          },
        },
      ],
      [
        "unsafe copper",
        {
          ...validBuild,
          equipment: {
            ...validBuild.equipment,
            startingEquipmentCurrencyRemainderCp: Number.MAX_SAFE_INTEGER + 1,
          },
        },
      ],
      [
        "invalid selected tool",
        {
          ...validBuild,
          equipment: {
            ...validBuild.equipment,
            owned: [
              {
                kind: "selectedToolItem",
                toolProficiencyId: "not-a-tool",
                quantity: 1,
              },
            ],
          },
        },
      ],
    ] as const;
    const invalidValues = [
      ...malformedBuilds.map(
        ([name, build]) => [name, traceWithBuild(build)] as const,
      ),
      ...malformedEquipment,
      [
        "entered checkpoint already acted",
        {
          ...builtTrace,
          creation: {
            ...builtTrace.creation,
            outcome: {
              ...builtTrace.creation.outcome,
              sheet: {
                ...builtTrace.creation.outcome.sheet,
                battle: {
                  ...enteredBattle,
                  checkpoint: {
                    ...checkpoint,
                    alreadyActed: [checkpoint.stillToAct[0]],
                  },
                },
              },
            },
          },
        },
      ] as const,
    ];
    for (const [name, value] of invalidValues) {
      const ajvAccepted = documentValidators.trace(value);
      const documentAccepted = Result.isSuccess(
        decodeOracleTraceDocument(value),
      );
      const fullAccepted = Result.isSuccess(decodeOracleTrace(value));
      expect(documentAccepted, `${name}: Document/Ajv parity`).toBe(
        ajvAccepted,
      );
      expect(fullAccepted, `${name}: full admission/Ajv parity`).toBe(
        ajvAccepted,
      );
      expect(ajvAccepted, `${name}: Ajv should reject`).toBe(false);
    }
  });

  it("keeps Batch Ajv and Effect Document admission in parity and accumulates paths", () => {
    const batches = [
      ["empty", { cases: [] }],
      ["single", { cases: [minimalCase] }],
      ["multiple", { cases: [minimalCase, characterRosterCase, minimalCase] }],
      [
        "invalid member",
        { cases: [minimalCase, { ...minimalCase, sheet: { tag: "unknown" } }] },
      ],
    ] as const;
    for (const [name, value] of batches) {
      const ajvAccepted = documentValidators.batch(value);
      const effectAccepted = Result.isSuccess(
        decodeOracleEvaluationBatchDocument(value),
      );
      expect(effectAccepted, `${name}: Ajv/Effect parity`).toBe(ajvAccepted);
      expect(ajvAccepted, `${name}: expected validity`).toBe(
        name !== "empty" && name !== "invalid member",
      );
    }

    const invalidBatch = {
      cases: [
        { ...minimalCase, creation: {} },
        { ...minimalCase, battle: { roster: minimalCase.battle.roster } },
      ],
    };
    const decoded = decodeOracleEvaluationBatchDocument(invalidBatch);
    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isFailure(decoded)) {
      expect(decoded.failure).toEqual([
        { path: "/cases/0/creation/fillBatches", code: "missingMember" },
        { path: "/cases/1/battle/attempts", code: "missingMember" },
      ]);
    }
  });

  it("keeps unannotated semantic admission separate from structural Document admission", () => {
    const semanticCounterexample = {
      ...minimalCase,
      creation: {
        fillBatches: [
          [
            {
              ...orderedFill,
              holeId: "not-a-creation-hole",
            },
          ],
        ],
      },
    };
    const document = decodeOracleCaseDocument(semanticCounterexample);
    expect(Result.isSuccess(document)).toBe(true);
    expect(Result.isFailure(decodeOracleCase(semanticCounterexample))).toBe(
      true,
    );

    const invalidOwner = {
      ...builtTrace,
      creation: {
        ...builtTrace.creation,
        outcome: {
          ...builtTrace.creation.outcome,
          sheet: {
            ...builtTrace.creation.outcome.sheet,
            battle: {
              ...enteredBattle,
              frontier: {
                kind: "acts",
                acts: [
                  {
                    tag: "runtimeCommand",
                    actorId: "oracle:not-the-current-actor",
                    command: "endTurn",
                  },
                ],
              },
            },
          },
        },
      },
    } as const;
    const invalidOwnerDocument = decodeOracleTraceDocument(invalidOwner);
    expect(Result.isSuccess(invalidOwnerDocument)).toBe(true);
    if (Result.isSuccess(invalidOwnerDocument)) {
      expect(
        Result.isFailure(
          admitOracleTraceDocument(invalidOwnerDocument.success),
        ),
      ).toBe(true);
    }
  });

  it("canonicalizes direct Document admission at the same boundary as decoding", () => {
    const reversed = {
      ...minimalCase,
      sheet: {
        tag: "wildShapeKnownForms",
        statBlockIds: ["stat_block_skeleton", "stat_block_rat"],
      },
      battle: {
        roster: {
          tag: "statBlocks",
          entries: [
            {
              ...statBlockEntry,
              ammunitionStocks: { bolt: 1, arrow: 2 },
            },
          ],
        },
        attempts: [],
      },
    } as const;
    const admitted = admitOracleCaseDocument(reversed);
    expect(Result.isSuccess(admitted)).toBe(true);
    if (Result.isSuccess(admitted)) {
      expect(admitted.success.sheet).toEqual({
        tag: "wildShapeKnownForms",
        statBlockIds: ["stat_block_rat", "stat_block_skeleton"],
      });
      if (admitted.success.battle.roster.tag === "statBlocks") {
        const entry = admitted.success.battle.roster.entries[0];
        expect(entry).toBeDefined();
        if (entry !== undefined) {
          expect(Object.keys(entry.ammunitionStocks)).toEqual([
            "arrow",
            "bolt",
          ]);
        }
      }
    }
  });

  it("canonicalizes direct Trace and Batch Document admission", () => {
    const reversedTrace = {
      ...builtTrace,
      creation: {
        ...builtTrace.creation,
        outcome: {
          ...builtTrace.creation.outcome,
          sheet: {
            ...builtTrace.creation.outcome.sheet,
            sheet: {
              ...freshSheet,
              druidWildShapeKnownForms: {
                statBlockIds: ["stat_block_skeleton", "stat_block_rat"],
              },
            },
          },
        },
      },
    } as const;
    const admittedTrace = admitOracleTraceDocument(reversedTrace);
    expect(Result.isSuccess(admittedTrace)).toBe(true);
    if (Result.isSuccess(admittedTrace)) {
      const outcome = admittedTrace.success.creation.outcome;
      expect(outcome.tag).toBe("built");
      if (outcome.tag === "built" && outcome.sheet.tag === "constructed") {
        expect(outcome.sheet.sheet.druidWildShapeKnownForms).toEqual({
          statBlockIds: ["stat_block_rat", "stat_block_skeleton"],
        });
      }
    }

    const reversedBatch = {
      cases: [
        {
          ...wildShapeKnownFormsCase,
          battle: {
            ...wildShapeKnownFormsCase.battle,
            roster: {
              tag: "statBlocks",
              entries: [
                {
                  ...statBlockEntry,
                  ammunitionStocks: { bolt: 1, arrow: 2 },
                },
              ],
            },
          },
        },
      ],
    } as const;
    const admittedBatch = admitOracleEvaluationBatchDocument(reversedBatch);
    expect(Result.isSuccess(admittedBatch)).toBe(true);
    if (Result.isSuccess(admittedBatch)) {
      const [caseValue] = admittedBatch.success.cases;
      expect(caseValue).toBeDefined();
      if (caseValue !== undefined) {
        expect(caseValue.sheet).toEqual({
          tag: "wildShapeKnownForms",
          statBlockIds: ["stat_block_rat", "stat_block_skeleton"],
        });
        if (caseValue.battle.roster.tag === "statBlocks") {
          expect(
            Object.keys(
              caseValue.battle.roster.entries[0]?.ammunitionStocks ?? {},
            ),
          ).toEqual(["arrow", "bolt"]);
        }
      }
    }
  });

  it("treats creation progression as ordered evidence snapshots, not an executable lifecycle", () => {
    // The trace records phase order and the frontier observed at each point.
    // It intentionally carries neither the omitted catalog nor the fills that
    // would be needed to prove a transition, so admission checks only the
    // local shape of each snapshot.
    const arbitrarySnapshots = {
      creation: {
        started: { holes: [] },
        progression: [{ holes: [] }, { holes: [] }],
        outcome: { tag: "inputExhausted" },
      },
    } as const;
    expect(
      Result.isSuccess(decodeOracleTraceDocument(arbitrarySnapshots)),
    ).toBe(true);
    expect(Result.isSuccess(decodeOracleTrace(arbitrarySnapshots))).toBe(true);
  });

  it("scans duplicate JSON members before parsing and remains total for hostile and deep input", () => {
    const duplicateJson =
      '{"creation":{"fillBatches":[]},"creation":{"fillBatches":[]},"sheet":{"tag":"ordinary"},"battle":{"roster":{"tag":"statBlocks","entries":[]},"attempts":[]}}';
    const duplicate = decodeOracleCaseJson(duplicateJson);
    expect(Result.isFailure(duplicate)).toBe(true);
    if (Result.isFailure(duplicate)) {
      expect(duplicate.failure).toEqual([
        { path: "/creation", code: "duplicateMember" },
      ]);
    }
    // Once JSON has been parsed, duplicate member spellings no longer exist;
    // the Document boundary only validates the resulting value.
    expect(
      Result.isSuccess(decodeOracleCaseDocument(JSON.parse(duplicateJson))),
    ).toBe(true);

    const deepArray = `${"[".repeat(20_000)}null${"]".repeat(20_000)}`;
    const deepObject = `${"{".repeat(20_000)}"x":null${"}".repeat(20_000)}`;
    for (const [name, decoder] of [
      ["Case", decodeOracleCaseJson],
      ["Trace", decodeOracleTraceJson],
      ["Batch", decodeOracleEvaluationBatchJson],
    ] as const) {
      for (const payload of [deepArray, deepObject]) {
        expect(() => decoder(payload), `${name} deep input`).not.toThrow();
        const result: unknown = decoder(payload);
        expect(
          isFailureWithIssues(result),
          `${name} deep input should fail`,
        ).toBe(true);
      }
    }

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("hostile ownKeys trap");
        },
      },
    );
    const hostileDecoders: readonly [string, (value: unknown) => unknown][] = [
      ["Case", decodeOracleCase],
      ["Case Document", decodeOracleCaseDocument],
      ["Trace", decodeOracleTrace],
      ["Trace Document", decodeOracleTraceDocument],
      ["Batch", decodeOracleEvaluationBatch],
      ["Batch Document", decodeOracleEvaluationBatchDocument],
    ];
    for (const [name, decoder] of hostileDecoders) {
      for (const value of [cyclic, hostile]) {
        expect(() => decoder(value), `${name} hostile input`).not.toThrow();
        const result: unknown = decoder(value);
        expect(
          isFailureWithIssues(result),
          `${name} hostile input should fail`,
        ).toBe(true);
      }
    }

    let deeplyNestedObject: unknown = null;
    let deeplyNestedArray: unknown = null;
    for (let depth = 0; depth < 20_000; depth += 1) {
      deeplyNestedObject = { nested: deeplyNestedObject };
      deeplyNestedArray = [deeplyNestedArray];
    }
    const documentDecoders: readonly [string, (value: unknown) => unknown][] = [
      ["Case Document", decodeOracleCaseDocument],
      ["Trace Document", decodeOracleTraceDocument],
      ["Batch Document", decodeOracleEvaluationBatchDocument],
    ];
    for (const [name, decoder] of documentDecoders) {
      for (const value of [deeplyNestedObject, deeplyNestedArray]) {
        expect(() => decoder(value), `${name} direct deep input`).not.toThrow();
        expect(
          isFailureWithIssues(decoder(value)),
          `${name} direct deep input should fail`,
        ).toBe(true);
      }
    }

    // Keep the same hostile depth inside otherwise-shaped envelopes so the
    // Document and full decoders, rather than only their root type guards,
    // receive the input. The nested member is intentionally structurally
    // invalid, but its depth must never turn rejection into a throw.
    const shapedDeepInputs: readonly [string, unknown][] = [
      [
        "Case nested array",
        {
          ...minimalCase,
          creation: { fillBatches: [deeplyNestedArray] },
        },
      ],
      [
        "Case nested object",
        {
          ...minimalCase,
          creation: { fillBatches: [deeplyNestedObject] },
        },
      ],
      [
        "Trace nested array",
        {
          creation: {
            started: { holes: deeplyNestedArray },
            progression: [],
            outcome: { tag: "inputExhausted" },
          },
        },
      ],
      [
        "Trace nested object",
        {
          creation: {
            started: { holes: deeplyNestedObject },
            progression: [],
            outcome: { tag: "inputExhausted" },
          },
        },
      ],
      [
        "Batch nested array",
        {
          cases: [
            {
              ...minimalCase,
              creation: { fillBatches: [deeplyNestedArray] },
            },
          ],
        },
      ],
      [
        "Batch nested object",
        {
          cases: [
            {
              ...minimalCase,
              creation: { fillBatches: [deeplyNestedObject] },
            },
          ],
        },
      ],
    ];
    const fullDecoders: readonly [string, (value: unknown) => unknown][] = [
      ["Case", decodeOracleCase],
      ["Trace", decodeOracleTrace],
      ["Batch", decodeOracleEvaluationBatch],
    ];
    for (const [inputName, value] of shapedDeepInputs) {
      const decoder = inputName.startsWith("Case")
        ? fullDecoders[0]
        : inputName.startsWith("Trace")
          ? fullDecoders[1]
          : fullDecoders[2];
      if (decoder === undefined) continue;
      const [decoderName, fullDecoder] = decoder;
      expect(
        () => fullDecoder(value),
        `${decoderName} ${inputName} should be total`,
      ).not.toThrow();
      expect(
        isFailureWithIssues(fullDecoder(value)),
        `${decoderName} ${inputName} should fail with issues`,
      ).toBe(true);
      const documentDecoder =
        decoderName === "Case"
          ? decodeOracleCaseDocument
          : decoderName === "Trace"
            ? decodeOracleTraceDocument
            : decodeOracleEvaluationBatchDocument;
      expect(
        () => documentDecoder(value),
        `${decoderName} ${inputName} Document should be total`,
      ).not.toThrow();
      expect(
        isFailureWithIssues(documentDecoder(value)),
        `${decoderName} ${inputName} Document should fail with issues`,
      ).toBe(true);
    }
  });

  it("keeps schema-shaped recursive Trace, Case, and Batch total at hostile depth", () => {
    const recursiveControl = recursiveCase(2);
    expect(documentValidators.case(recursiveControl)).toBe(true);
    expect(Result.isSuccess(decodeOracleCaseDocument(recursiveControl))).toBe(
      true,
    );
    expect(Result.isSuccess(decodeOracleCase(recursiveControl))).toBe(true);

    const deepTrace = recursiveTrace(20_000);
    const deepCase = recursiveCase(20_000);
    const decoders: readonly [string, (value: unknown) => unknown, unknown][] =
      [
        ["Trace Document", decodeOracleTraceDocument, deepTrace],
        ["Trace", decodeOracleTrace, deepTrace],
        ["Case Document", decodeOracleCaseDocument, deepCase],
        ["Case", decodeOracleCase, deepCase],
        [
          "Batch Document",
          decodeOracleEvaluationBatchDocument,
          { cases: [deepCase] },
        ],
        ["Batch", decodeOracleEvaluationBatch, { cases: [deepCase] }],
      ];
    for (const [name, decoder, value] of decoders) {
      let result: unknown;
      expect(() => {
        result = decoder(value);
      }, `${name} recursive input`).not.toThrow();
      expect(
        isFailureWithIssues(result),
        `${name} should return typed issues`,
      ).toBe(true);
    }
  }, 120_000);

  it("publishes the closed structural constraints through Effect 4 JSON Schema", () => {
    const schemaText = JSON.stringify({
      OracleCaseDocumentJsonSchema,
      OracleTraceDocumentJsonSchema,
      OracleEvaluationBatchDocumentJsonSchema,
    });
    for (const field of ["session", "frame", "globalRole", "presentation"]) {
      expect(schemaText).not.toContain(`\"${field}\"`);
    }
    expect(schemaText).toContain('"maxItems":3');
    expect(schemaText).toContain('"maximum":9007199254740991');
    for (const slot of ["armor", "shield", "main", "off"]) {
      expect(schemaText).toContain(`^${slot}:(?=\\\\S)`);
    }
    expect(schemaText).not.toContain('"steps"');
  });

  it("keeps canonical equality type-aware, order-aware, and set sorting non-deduplicating", () => {
    expect(canonicalStructuralKey({ a: 1, b: "two" })).toBe(
      canonicalStructuralKey({ b: "two", a: 1 }),
    );
    expect(canonicalStructuralKey(["first", "second"])).not.toBe(
      canonicalStructuralKey(["second", "first"]),
    );
    expect(canonicalStructuralKey([1])).not.toBe(canonicalStructuralKey(["1"]));
    expect(canonicalizeStringSet(["b", "a", "a"])).toEqual(["a", "a", "b"]);
  });
});
