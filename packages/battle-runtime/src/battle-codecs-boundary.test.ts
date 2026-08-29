import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { HASTE_ACTION_RESOURCE_RESTRICTION } from "@dnd/shared-algebras/action-economy-algebra";
import { D6_ROLL_RESULTS, NonNegativeInteger } from "@dnd/shared/types";
import {
  statBlockId as parseSharedStatBlockId,
  unitId as parseSharedUnitId,
} from "@dnd/shared/game-facts";
import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleCheckpointFrontierEnvelopeSchema,
  BattleSnapshotSchema,
  attackExecutionSelectionForSubjectForTest,
  attackTargetDistanceSpatialFact,
  battleId,
  characterAttackSubjectForTest,
  characterSeed,
  combatantId,
  criticalRange19UnitRefs,
  discoverBattleActs,
  discoverBattleActCandidates,
  endTurn,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  interruptDecisionFill,
  movementFeet,
  movementFill,
  monsterMultiattackStatBlock,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  skeletonCreatureInit,
  snapshotBattle,
  startBattleSessionRight,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  attackRollFill,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleCheckpointFrontierEnvelope,
  battleFrontierInterruptDecisionForState,
  skeletonId,
  statBlockCreatureInit,
  resolveBattleSubject,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  BattleInterruptDecisionFrontierSchema,
  BattleObjectDamageOutcomeSchema,
} from "./battle-reducer/battle-codecs.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import {
  battleAreaId,
  battleLineDirectionId,
  battleObjectId,
  battleResourcePoolExecutionRef,
  battleSpellEffectOccurrenceId,
} from "./identity.ts";

type EncodedHole = Schema.Schema.Encoded<typeof BattleHoleSchema>;
type EncodedEnvelope = Schema.Schema.Encoded<
  typeof BattleCheckpointFrontierEnvelopeSchema
>;
type EncodedSnapshot = EncodedEnvelope["checkpoint"];
type EncodedActsFrontier = Extract<
  EncodedEnvelope["frontier"],
  { readonly kind: "acts" }
>;
type EncodedAct = EncodedActsFrontier["acts"][number];
type EncodedInterruptChoice = Extract<
  EncodedEnvelope["frontier"],
  { readonly kind: "interruptDecision" }
>["choices"][number];
type EncodedActionResource = EncodedSnapshot["turn"]["actionResources"][number];
type EncodedStatBlockMultiattackActionResource = Extract<
  EncodedActionResource,
  { readonly source: "statBlockMultiattack" }
>;
type EncodedListedMultiattackActionResource =
  EncodedStatBlockMultiattackActionResource & {
    readonly dispatch: Extract<
      EncodedStatBlockMultiattackActionResource["dispatch"],
      { readonly kind: "listedOccurrence" }
    >;
  };
type CodecCase = {
  readonly name: string;
  readonly expected: "Right" | "Left";
  readonly hole: EncodedHole;
};

const holeId = (name: string) => `battle:codec:${name}`;
const baseHole = (name: string) => ({
  holeId: holeId(name),
  holeInstanceKey: holeId(name),
  label: `Codec ${name}`,
});
const encodeHole = (input: unknown): EncodedHole =>
  Schema.encodeSync(BattleHoleSchema)(
    Schema.decodeUnknownSync(BattleHoleSchema)(input),
  );
const hole = (name: string, input: object): EncodedHole =>
  encodeHole({ ...baseHole(name), ...input });

function replaceActHole(
  envelope: EncodedEnvelope,
  procedureRef: string,
  replacement: EncodedHole,
): EncodedEnvelope {
  if (envelope.frontier.kind !== "acts") {
    throw new Error("Expected an Acts frontier.");
  }
  const ownerIndices = envelope.frontier.acts.flatMap((act, index) =>
    "procedureRef" in act.subject &&
    act.subject.procedureRef === procedureRef &&
    act.subject.tag === "actionSpell" &&
    act.subject.mode.tag === "cast"
      ? [index]
      : [],
  );
  if (ownerIndices.length !== 1) {
    throw new Error(
      `Expected exactly one cast act for ${procedureRef}; found ${ownerIndices.length}.`,
    );
  }
  const ownerIndex = ownerIndices[0]!;
  const acts = envelope.frontier.acts.map((act, index) =>
    index === ownerIndex ? { ...act, initialHoles: [replacement] } : act,
  );
  return {
    ...envelope,
    frontier: { ...envelope.frontier, acts },
  };
}

function replaceActSubject(
  envelope: EncodedEnvelope,
  predicate: (act: EncodedAct) => boolean,
  replace: (act: EncodedAct) => EncodedAct,
): EncodedEnvelope {
  if (envelope.frontier.kind !== "acts") {
    throw new Error("Expected an Acts frontier.");
  }
  const matches = envelope.frontier.acts
    .map((act, index) => (predicate(act) ? index : -1))
    .filter((index) => index >= 0);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one matching act; found ${matches.length}.`,
    );
  }
  const match = matches[0]!;
  return {
    ...envelope,
    frontier: {
      ...envelope.frontier,
      acts: envelope.frontier.acts.map((act, index) =>
        index === match ? replace(act) : act,
      ),
    },
  };
}

function replaceActOwner(
  envelope: EncodedEnvelope,
  predicate: (act: EncodedAct) => boolean,
  actorId: ReturnType<typeof combatantId>,
): EncodedEnvelope {
  return replaceActSubject(envelope, predicate, (act) => ({
    ...act,
    subject: { ...act.subject, actorId },
  }));
}

const encodedEnvelopeFromState = (
  state: Parameters<typeof snapshotBattle>[0],
) =>
  Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
    battleCheckpointFrontierEnvelope(state),
  );

function expectEnvelopeDecodeLeft(envelope: EncodedEnvelope): void {
  const decoded = Schema.decodeUnknownEither(
    BattleCheckpointFrontierEnvelopeSchema,
  )(envelope);
  expect(Either.isLeft(decoded)).toBe(true);
}

function expectSnapshotDecodeLeft(snapshot: unknown): void {
  const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)(snapshot);
  expect(Either.isLeft(decoded)).toBe(true);
}

function isEncodedStatBlockMultiattackActionResource(
  resource: EncodedActionResource,
): resource is EncodedStatBlockMultiattackActionResource {
  return resource.source === "statBlockMultiattack";
}

function isEncodedListedMultiattackActionResource(
  resource: EncodedActionResource,
): resource is EncodedListedMultiattackActionResource {
  return (
    isEncodedStatBlockMultiattackActionResource(resource) &&
    resource.dispatch.kind === "listedOccurrence"
  );
}

function encodedActivatedMultiattackSnapshot(): EncodedSnapshot {
  const session = startBattleSessionRight({
    battleId: battleId("codec-multiattack-continuation"),
    combatants: [
      characterSeed({ combatantId: wizardId, initiative: 20 }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        statBlock: monsterMultiattackStatBlock(),
        initiative: 10,
      }),
    ],
  });
  const turn = requireResolved(
    endTurn({ state: session.state, actorId: wizardId }),
  ).state;
  const multiattack = discoverBattleActCandidates(turn).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "multiattack" &&
      act.subject.actorId === skeletonId,
  );
  if (multiattack === undefined) {
    throw new Error("Expected a Stat Block Multiattack act.");
  }
  return encodedEnvelopeFromState(
    requireResolved(
      resolveBattleSubject({
        state: turn,
        subject: multiattack.subject,
        fills: [],
      }),
    ).state,
  ).checkpoint;
}

function codecRechargeResourcePoolRef() {
  const snapshot = Schema.decodeUnknownSync(BattleSnapshotSchema)(
    encodedActivatedMultiattackSnapshot(),
  );
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected the codec Recharge fixture actor.");
  }
  return battleResourcePoolExecutionRef(
    actor.origin.execution.scopeRef,
    NonNegativeInteger(0),
  );
}

function codecFixture() {
  const session = startBattleSessionRight({
    battleId: battleId("battle-codec-boundary"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Codec Caster",
        initiative: 20,
        spellcasting: wizardSpellcasting(),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
  const envelope = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
    battleCheckpointFrontierEnvelope(session.state),
  );
  if (envelope.frontier.kind !== "acts") {
    throw new Error("Expected an Acts frontier.");
  }
  const wizard = envelope.checkpoint.combatants.find(
    (c) => c.combatantId === wizardId,
  );
  if (wizard?.origin.kind !== "character")
    throw new Error("Expected character spell fixture.");
  const characterContext = session.context.characters.get(wizardId);
  if (characterContext === undefined)
    throw new Error("Expected character spell presentation context.");
  const spellSources = characterContext.spellPresentationSources.filter(
    (source) => source.invocation.procedure === "saveGatedDamage",
  );
  if (spellSources.length === 0)
    throw new Error("Expected a save-gated spell presentation source.");
  if (spellSources.length > 1)
    throw new Error("Expected one save-gated spell presentation source.");
  const source = spellSources.find(
    (candidate) => candidate.invocation.procedure === "saveGatedDamage",
  );
  if (source === undefined)
    throw new Error("Expected a typed save-gated spell presentation source.");
  const sourceBinding = wizard.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef === source.procedureRef,
  );
  if (sourceBinding === undefined)
    throw new Error("Expected the save-gated source to be bound.");
  return {
    envelope,
    sourceProcedureRef: sourceBinding.procedureRef,
    effectRef: battleActiveEffectExecutionRefForTest("codec-marked-rider"),
  };
}

const fixture = codecFixture();
const source = {
  targetId: skeletonId,
  sourceProcedureRef: fixture.sourceProcedureRef,
  sourceCombatantId: wizardId,
};
const save = (ability: "dex" | "str" | "wis" | "con") => ({
  ability,
  dc: { kind: "caster_spell_save_dc" },
});
const saving = (
  name: string,
  variant: string,
  ability: "dex" | "str" | "wis" | "con",
  value: object,
) =>
  hole(name, {
    kind: "savingThrowOutcome",
    [variant]: value,
    ability,
    dc: { kind: "caster_spell_save_dc" },
    areaChoices: [],
    targetRollModes: [],
    targetFlatBonuses: [],
  });
const rolled = (name: string, value: object) =>
  hole(name, { kind: "rolledDice", ...value });
const right = (name: string, holeValue: EncodedHole): CodecCase => ({
  name,
  expected: "Right",
  hole: holeValue,
});
const left = (name: string, holeValue: EncodedHole): CodecCase => ({
  name,
  expected: "Left",
  hole: holeValue,
});

function codecStaticDartStatBlock(): StatBlockRecord {
  const base = monsterMultiattackStatBlock();
  const shortbow = base.statBlock.actions?.find(
    (entry) =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      entry.procedure.name === "Shortbow",
  );
  if (
    shortbow === undefined ||
    shortbow.kind !== "executable" ||
    shortbow.procedure.kind !== "attack_roll"
  ) {
    throw new Error("Expected the static codec Shortbow fixture.");
  }
  return {
    id: parseSharedStatBlockId("stat_block_codec_static_dart_monster"),
    kind: "statBlock",
    name: "Codec Static Dart Monster",
    challengeRating: 0.25,
    provenance: {
      kind: "synthetic-test",
      section: "codec static damage fixture",
    },
    statBlock: {
      size: "small",
      creatureType: "fey",
      alignment: { order: "chaotic", morality: "neutral" },
      ac: { value: { kind: "literal", value: 15 } },
      hp: { kind: "literal", value: 10 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        cha: 8,
        con: 10,
        dex: 15,
        int: 10,
        str: 8,
        wis: 8,
      },
      initiative: { modifier: 2, score: 12 },
      passivePerception: 9,
      communication: {
        kind: "spoken_and_understood",
        languages: { kind: "named", languages: ["Common", "Goblin"] },
      },
      actions: [
        {
          ...shortbow,
          procedure: {
            ...shortbow.procedure,
            name: "Static Dart",
            onHit: [
              {
                kind: "damage",
                damageType: "piercing",
                amount: {
                  kind: "fixed",
                  expr: { dice: 1, dieSize: 4 },
                  static: 3,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function staticDartSubject(
  session: ReturnType<typeof startBattleSessionRight>,
): Extract<
  BattleSubject,
  {
    readonly tag: "action";
    readonly action: "attack";
    readonly statBlockDamageNotation: "static";
  }
> {
  const subject = discoverBattleActs(session).find(
    ({ subject: candidate }) =>
      candidate.tag === "action" &&
      candidate.action === "attack" &&
      candidate.actorId === goblinId &&
      candidate.statBlockDamageNotation === "static",
  )?.subject;
  if (
    subject?.tag !== "action" ||
    subject.action !== "attack" ||
    subject.statBlockDamageNotation !== "static"
  ) {
    throw new Error("Expected a discovered static Stat Block attack.");
  }
  return subject;
}

const savingThrowCases: readonly CodecCase[] = [
  right(
    "spellTurnStartSave",
    saving("spellTurnStartSave", "spellTurnStartSave", "wis", {
      ...source,
      save: { ...save("wis"), successEnds: "spell" },
    }),
  ),
  right(
    "hideousLaughterRepeatSave",
    saving("hideousLaughterRepeatSave", "hideousLaughterRepeatSave", "wis", {
      ...source,
      trigger: "endTurn",
      save: save("wis"),
    }),
  ),
  right(
    "spellConditionEndTurnSave",
    saving("spellConditionEndTurnSave", "spellConditionEndTurnSave", "dex", {
      ...source,
      condition: "restrained",
      save: save("dex"),
    }),
  ),
  right(
    "protectionRelevantEffectSave",
    saving(
      "protectionRelevantEffectSave",
      "protectionRelevantEffectSave",
      "wis",
      { ...source, relevantEffect: "frightened", save: save("wis") },
    ),
  ),
  ...(["greaseGroundHazard", "sleetStormAreaHazard"] as const).map((variant) =>
    right(
      variant,
      saving(variant, variant, "dex", {
        ...source,
        areaId: battleAreaId(`area:${variant}`),
        trigger: "entersArea",
        save: save("dex"),
      }),
    ),
  ),
  ...(["insectPlagueAreaHazard", "cloudkillAreaHazard"] as const).map(
    (variant) =>
      right(
        variant,
        saving(variant, variant, "con", {
          ...source,
          areaId: battleAreaId(`area:${variant}`),
          trigger: "entersArea",
          save: save("con"),
        }),
      ),
  ),
  right(
    "glyphExplosiveRune",
    hole("glyphExplosiveRune", {
      kind: "savingThrowOutcome",
      glyphExplosiveRune: {
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        sourceEffectId: battleSpellEffectOccurrenceId("effect:codec:glyph"),
        radiusFeet: 20,
      },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targetIds: [skeletonId],
      targetRollModes: [],
      targetFlatBonuses: [],
    }),
  ),
  right(
    "wardingBondSeparation",
    hole("wardingBondSeparation", {
      kind: "targetSpatialFacts",
      wardingBondSeparation: {
        sourceCombatantId: wizardId,
        targetId: skeletonId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        rangeFeet: 30,
      },
      requiresTableSpatialFact: true,
    }),
  ),
  right(
    "gustOfWindLineSave",
    saving("gustOfWindLineSave", "gustOfWindLine", "str", {
      targetId: skeletonId,
      sourceCombatantId: wizardId,
      sourceProcedureRef: fixture.sourceProcedureRef,
      areaId: battleAreaId("area:codec-gust-save"),
      directionId: battleLineDirectionId("direction:codec-gust-save"),
      trigger: "endsTurnInLine",
      save: { ability: "str", dc: { kind: "caster_spell_save_dc" } },
      pushDistanceFeet: 15,
    }),
  ),
  right(
    "dragonsBreathSave",
    saving("dragonsBreathSave", "dragonsBreath", "dex", {
      targetId: skeletonId,
      sourceCombatantId: wizardId,
      sourceProcedureRef: fixture.sourceProcedureRef,
      lengthFeet: 15,
    }),
  ),
];

const damage = { expr: { dice: 1, dieSize: 6 }, damageType: "cold" };
const markedRider = {
  sourceProcedureRef: fixture.sourceProcedureRef,
  effectRef: fixture.effectRef,
  sourceCombatantId: wizardId,
  kind: "spellMarkedDamageRider",
  targetCombatantId: skeletonId,
  transfer: { kind: "available", retargetTiming: "sameTurn" },
  abilityCheckBehavior: { kind: "none" },
  damage,
  expiresAt: { kind: "untilDispelled" },
};
const rolledDiceCases: readonly CodecCase[] = [
  right(
    "sourceProcedureRefWithMarkedRider",
    rolled("sourceProcedureRefWithMarkedRider", {
      critical: false,
      sourceProcedureRef: fixture.sourceProcedureRef,
      spellMarkedDamageRiders: [markedRider],
    }),
  ),
  right(
    "glyphExplosiveRuneDamage",
    rolled("glyphExplosiveRuneDamage", {
      critical: false,
      glyphExplosiveRune: {
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        sourceEffectId: battleSpellEffectOccurrenceId("effect:codec:glyph"),
        damage: { expr: { dice: 1, dieSize: 6 } },
      },
    }),
  ),
  right(
    "spellDamageReduction",
    rolled("spellDamageReduction", {
      spellDamageReduction: {
        sourceProcedureRef: fixture.sourceProcedureRef,
        sourceCombatantId: wizardId,
        targetId: skeletonId,
        damageType: "cold",
        amount: { dice: 1, dieSize: 4 },
      },
    }),
  ),
  right(
    "sourceDamageRollPenalty",
    rolled("sourceDamageRollPenalty", {
      sourceDamageRollPenalty: {
        sourceProcedureRef: fixture.sourceProcedureRef,
        sourceCombatantId: wizardId,
        affectedCombatantId: skeletonId,
        damageRollHoleId: holeId("damage-roll"),
        amount: { dice: 1, dieSize: 8 },
      },
    }),
  ),
  right(
    "mirrorImageDuplicateRoll",
    rolled("mirrorImageDuplicateRoll", {
      mirrorImageDuplicateRoll: {
        targetId: skeletonId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        sourceCombatantId: wizardId,
        remainingDuplicates: 1,
        dieSize: 6,
        successAtLeast: 3,
      },
    }),
  ),
  right(
    "spellTurnStartDamage",
    rolled("spellTurnStartDamage", {
      spellTurnStartDamage: {
        ...source,
        trigger: { kind: "condition", condition: "poisoned" },
        damage,
      },
    }),
  ),
  right(
    "spellTurnEndDamage",
    rolled("spellTurnEndDamage", { spellTurnEndDamage: { ...source, damage } }),
  ),
  right(
    "movableZone",
    rolled("movableZone", {
      critical: false,
      movableZone: {
        ...source,
        areaId: battleAreaId("area:movableZone"),
        trigger: "endsTurnWithinFiveFeetOfSphere",
        save: save("dex"),
      },
    }),
  ),
  right(
    "spikeGrowthMovement",
    rolled("spikeGrowthMovement", {
      critical: false,
      spikeGrowthMovement: {
        ...source,
        areaId: battleAreaId("area:spikeGrowthMovement"),
        distanceFeet: 10,
        damage: { expr: { dice: 1, dieSize: 4 }, damageType: "piercing" },
      },
    }),
  ),
  right(
    "insectPlagueAreaHazard",
    rolled("insectPlagueAreaHazard", {
      critical: false,
      insectPlagueAreaHazard: {
        ...source,
        areaId: battleAreaId("area:insectPlagueAreaHazard"),
        trigger: "entersArea",
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "piercing" },
      },
    }),
  ),
  right(
    "cloudkillAreaHazard",
    rolled("cloudkillAreaHazard", {
      critical: false,
      cloudkillAreaHazard: {
        ...source,
        areaId: battleAreaId("area:cloudkillAreaHazard"),
        trigger: "entersArea",
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "poison" },
      },
    }),
  ),
  right(
    "dragonsBreathDamage",
    rolled("dragonsBreathDamage", {
      dragonsBreath: {
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        damageType: "fire",
        expr: { dice: 1, dieSize: 6 },
      },
    }),
  ),
];

const invalidSource = battleProcedureExecutionRefForTest(
  "codec-unbound-source",
);
const sourceOwningHoleCases: readonly EncodedHole[] = [
  hole("skillChoice", {
    kind: "skillChoice",
    sourceProcedureRef: invalidSource,
    choices: ["stealth"],
  }),
  hole("thaumaturgyActiveOneMinuteEffectCount", {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    sourceProcedureRef: invalidSource,
    maximumActiveOneMinuteEffects: 3,
    requiresTableSpellEffectCount: true,
  }),
  hole("commandOptionChoice", {
    kind: "commandOptionChoice",
    sourceProcedureRef: invalidSource,
    choices: ["approach"],
  }),
  hole("spiritualWeaponForcePosition", {
    kind: "spiritualWeaponForcePosition",
    sourceProcedureRef: invalidSource,
    mode: "cast",
    maxDistanceFeet: 60,
    requiresTableSpatialFact: true,
  }),
  hole("gustOfWindLineDirectionChoice", {
    kind: "gustOfWindLineDirectionChoice",
    sourceCombatantId: wizardId,
    sourceProcedureRef: invalidSource,
    areaId: battleAreaId("area:codec-gust-of-wind"),
    directionId: battleLineDirectionId("direction:codec-north"),
    requiresTableSpatialFact: true,
  }),
  hole("movableZoneRepositionMovement", {
    kind: "movableZoneRepositionMovement",
    movableZone: {
      sourceCombatantId: wizardId,
      sourceProcedureRef: invalidSource,
      areaId: battleAreaId("area:codec-movable-zone"),
      maxMoveFeet: 30,
    },
    requiresTableSpatialFact: true,
  }),
];
const cases: readonly CodecCase[] = [
  ...savingThrowCases,
  ...rolledDiceCases,
  left(
    "spellTurnStartSaveUnboundSource",
    encodeHole({
      ...baseHole("spellTurnStartSaveUnboundSource"),
      kind: "savingThrowOutcome",
      spellTurnStartSave: {
        ...source,
        sourceProcedureRef: invalidSource,
        save: { ...save("wis"), successEnds: "spell" },
      },
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    }),
  ),
  ...sourceOwningHoleCases.map((replacement) =>
    left(`${replacement.kind}UnboundSource`, replacement),
  ),
];

describe("battle object damage codec boundaries", () => {
  test("round-trips a table-resolved object damage outcome", () => {
    const outcome = {
      kind: "tableResolved",
      objectId: battleObjectId("codec-table-resolved-object"),
      components: [{ damageType: "fire", rolledDamage: 6 }],
      rolledDamage: 6,
    };

    expect(
      Schema.decodeUnknownSync(BattleObjectDamageOutcomeSchema)(outcome),
    ).toEqual(outcome);
  });
});

describe("battle codec execution-reference boundaries", () => {
  test.each(cases)("$expected $name", ({ expected, hole: replacement }) => {
    const decoded = Schema.decodeUnknownEither(
      BattleCheckpointFrontierEnvelopeSchema,
    )(
      replaceActHole(fixture.envelope, fixture.sourceProcedureRef, replacement),
    );
    expect(Either.isRight(decoded)).toBe(expected === "Right");
  });

  test("rejects an empty interrupt decision choice frontier", () => {
    const decoded = Schema.decodeUnknownEither(
      BattleInterruptDecisionFrontierSchema,
    )({
      kind: "interruptDecision",
      trigger: "attackHit",
      decisionHole: {
        holeInstanceKey: "battle:codec:interrupt",
        holeId: "battle:codec:interrupt",
        kind: "interruptDecision",
        label: "Respond",
        trigger: "attackHit",
        eligibleResponders: ["wizard"],
      },
      choices: [],
      stackDepth: 0,
    });
    expect(Either.isLeft(decoded)).toBe(true);
  });
});

describe("battle codec Stat Block Recharge d6 boundaries", () => {
  const target = codecRechargeResourcePoolRef();

  test.each(D6_ROLL_RESULTS)("accepts the d6 result %i", (roll) => {
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "statBlockRechargeRoll",
          holeId: holeId(`recharge-d6-${roll}`),
          value: [{ target, roll }],
        }),
      ),
    ).toBe(true);
  });

  test.each([0, 7] as const)("rejects the non-d6 result %i", (roll) => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "statBlockRechargeRoll",
          holeId: holeId(`recharge-not-d6-${roll}`),
          value: [{ target, roll }],
        }),
      ),
    ).toBe(true);
  });
});

describe("battle codec act ownership boundaries", () => {
  test("preserves static Stat Block distance identity for an ordinary attack", () => {
    const session = startBattleSessionRight({
      battleId: battleId("codec-static-distance-ordinary"),
      combatants: [
        statBlockCreatureInit({
          combatantId: goblinId,
          statBlock: codecStaticDartStatBlock(),
          initiative: 20,
        }),
        characterSeed({ combatantId: fighterId, initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = staticDartSubject(session);
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = targetFill(targetHole, fighterId, [
      attackTargetDistanceSpatialFact(
        goblinId,
        fighterId,
        {
          procedureRef: subject.procedureRef,
          statBlockDamageNotation: "static",
        },
        movementFeet(5),
      ),
    ]);
    const decoded = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(target),
    );
    expect(decoded).toMatchObject({
      kind: "targetChoice",
      spatialFacts: [
        {
          kind: "attackTargetDistance",
          procedureRef: subject.procedureRef,
          statBlockDamageNotation: "static",
        },
      ],
    });
    expect(
      resolveBattleSubject({ state, subject, fills: [decoded] }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll" }],
    });
  });

  test("preserves static Stat Block distance identity for a fixed readied target", () => {
    const state = startBattleSessionRight({
      battleId: battleId("codec-static-distance-readied"),
      combatants: [
        statBlockCreatureInit({
          combatantId: goblinId,
          statBlock: codecStaticDartStatBlock(),
          initiative: 20,
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          characterUnitRefs: criticalRange19UnitRefs(),
        }),
      ],
    }).state;
    const readySubject = {
      tag: "action" as const,
      actorId: goblinId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected a Ready declaration hole.");
    }
    const attackResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "attack" &&
        "statBlockDamageNotation" in response.selection &&
        response.selection.statBlockDamageNotation === "static",
    );
    if (attackResponse?.kind !== "attack") {
      throw new Error("Expected the static Stat Block Ready response.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the fighter enters range",
            attackResponse,
          ),
        ],
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: readied.state, actorId: goblinId }),
    );
    const reported = resolveBattleSubject({
      state: fighterTurn.state,
      subject: {
        tag: "runtimeCommand" as const,
        actorId: fighterId,
        command: "reportReadyTrigger" as const,
        readiedActorId: goblinId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a reported Ready trigger interrupt.");
    }
    const choice = battleFrontierInterruptDecisionForState(
      reported.state,
    )?.choices.find(
      (candidate) =>
        candidate.kind === "releaseReadiedAttack" &&
        candidate.subject.targetId === fighterId,
    );
    if (choice?.kind !== "releaseReadiedAttack") {
      throw new Error("Expected a fixed-target readied attack choice.");
    }
    const pendingEnvelope = encodedEnvelopeFromState(reported.state);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          pendingEnvelope,
        ),
      ),
    ).toBe(true);
    if (pendingEnvelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected a pending interrupt-decision frontier.");
    }
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        trigger: "attackHit",
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
      },
    });
    const readiedAttackSnapshot =
      pendingEnvelope.checkpoint.readiedResponses.actionsOrMovements.find(
        (readied) => readied.response.kind === "attack",
      );
    if (readiedAttackSnapshot?.response.kind !== "attack") {
      throw new Error("Expected an encoded readied-attack snapshot.");
    }
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      checkpoint: {
        ...pendingEnvelope.checkpoint,
        readiedResponses: {
          ...pendingEnvelope.checkpoint.readiedResponses,
          actionsOrMovements: [
            {
              ...readiedAttackSnapshot,
              actorId: combatantId("codec-missing-readied-attacker"),
            },
          ],
        },
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      checkpoint: {
        ...pendingEnvelope.checkpoint,
        readiedResponses: {
          ...pendingEnvelope.checkpoint.readiedResponses,
          spells: [
            {
              casterId: fighterId,
              procedureRef: readiedAttackSnapshot.response.procedureRef,
              trigger: "attackHit",
              expiresAt: readiedAttackSnapshot.expiresAt,
            },
          ],
        },
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      checkpoint: {
        ...pendingEnvelope.checkpoint,
        readiedResponses: {
          ...pendingEnvelope.checkpoint.readiedResponses,
          spells: [
            {
              casterId: goblinId,
              procedureRef: readiedAttackSnapshot.response.procedureRef,
              trigger: "attackHit",
              expiresAt: readiedAttackSnapshot.expiresAt,
            },
          ],
        },
      },
    });
    const encodedReadiedAttack = pendingEnvelope.frontier.choices.find(
      (candidate) =>
        candidate.kind === "releaseReadiedAttack" &&
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "releaseReadiedAttack",
    );
    if (
      encodedReadiedAttack?.kind !== "releaseReadiedAttack" ||
      encodedReadiedAttack.subject.tag !== "runtimeCommand" ||
      encodedReadiedAttack.subject.command !== "releaseReadiedAttack"
    ) {
      throw new Error("Expected the encoded readied-attack choice.");
    }
    const statBlockRetaliationChoice: EncodedInterruptChoice = {
      kind: "retaliationAttack",
      reactorId: goblinId,
      subject: {
        ...encodedReadiedAttack.subject,
        command: "retaliationAttack",
      },
      initialHoles: [],
    };
    const statBlockReactionModifierChoice: EncodedInterruptChoice = {
      kind: "reactionRollOrDamageReduction",
      reactorId: goblinId,
      choice: {
        kind: "attackDamageReduction",
        procedureRef: encodedReadiedAttack.subject.procedureRef,
        reduction: { kind: "halfDamage" },
      },
      initialHoles: [],
    };
    const fighter = pendingEnvelope.checkpoint.combatants.find(
      (combatant) => combatant.combatantId === fighterId,
    );
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected the encoded fighter character origin.");
    }
    const fighterAttackProcedureRef =
      fighter.origin.attackExecution.attackProcedureRef ??
      fighter.origin.attackExecution.unarmedStrikeProcedureRef;
    const fighterAttackReactionModifierChoice: EncodedInterruptChoice = {
      kind: "reactionRollOrDamageReduction",
      reactorId: fighterId,
      choice: {
        kind: "attackDamageReduction",
        procedureRef: fighterAttackProcedureRef,
        reduction: { kind: "halfDamage" },
      },
      initialHoles: [],
    };
    const stringSupportBinding =
      fighter.origin.execution.procedureBindings.find(
        (binding) =>
          binding.procedure.kind === "unitSupportProfile" &&
          typeof binding.procedure.execution === "string",
      );
    if (stringSupportBinding?.procedure.kind !== "unitSupportProfile") {
      throw new Error("Expected the encoded string support binding.");
    }
    const unrelatedStringSupportReactionChoice: EncodedInterruptChoice = {
      kind: "reactionRollOrDamageReduction",
      reactorId: fighterId,
      choice: {
        kind: "attackDamageReduction",
        procedureRef: stringSupportBinding.procedureRef,
        reduction: { kind: "halfDamage" },
      },
      initialHoles: [],
    };
    expectEnvelopeDecodeLeft({
      checkpoint: pendingEnvelope.checkpoint,
      frontier: {
        kind: "acts",
        acts: [
          {
            subject: {
              tag: "monkFocusFlurryOfBlowsStrike",
              actorId: fighterId,
              focusProcedureRef: stringSupportBinding.procedureRef,
              procedureRef:
                fighter.origin.attackExecution.unarmedStrikeProcedureRef,
            },
            initialHoles: [],
          },
        ],
      },
    });
    expectEnvelopeDecodeLeft({
      checkpoint: pendingEnvelope.checkpoint,
      frontier: {
        kind: "acts",
        acts: [
          {
            subject: {
              tag: "monkFocusFlurryOfBlowsStrike",
              actorId: goblinId,
              focusProcedureRef: encodedReadiedAttack.subject.procedureRef,
              procedureRef: encodedReadiedAttack.subject.procedureRef,
            },
            initialHoles: [],
          },
        ],
      },
    });
    const malformedInterruptKindCases: readonly EncodedInterruptChoice[] = [
      {
        kind: "castAttackHitBonusActionSpell",
        reactorId: goblinId,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "castAttackHitBonusActionSpell",
          casterId: goblinId,
          procedureRef: encodedReadiedAttack.subject.procedureRef,
        },
        initialHoles: [],
      },
      {
        kind: "castTriggeredReactionSpell",
        reactorId: goblinId,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "castTriggeredReactionSpell",
          reactorId: goblinId,
          procedureRef: encodedReadiedAttack.subject.procedureRef,
        },
        initialHoles: [],
      },
      {
        kind: "opportunityAttack",
        reactorId: goblinId,
        subject: {
          ...encodedReadiedAttack.subject,
          command: "opportunityAttack",
          distanceFeet: 5,
        },
        initialHoles: [],
      },
      statBlockRetaliationChoice,
      {
        kind: "releaseReadiedMovement",
        reactorId: goblinId,
        readiedMovementActorId: goblinId,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseReadiedMovement",
          readiedMovementActorId: goblinId,
        },
        initialHoles: [],
      },
      {
        kind: "releaseReadiedSpell",
        reactorId: goblinId,
        readiedSpellCasterId: goblinId,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseReadiedSpell",
          readiedSpellCasterId: goblinId,
          procedureRef: encodedReadiedAttack.subject.procedureRef,
        },
        initialHoles: [],
      },
      {
        kind: "reactionRollOrDamageReduction",
        reactorId: fighterId,
        choice: {
          kind: "attackDamageReduction",
          procedureRef: encodedReadiedAttack.subject.procedureRef,
          reduction: { kind: "halfDamage" },
        },
        initialHoles: [],
      },
      statBlockReactionModifierChoice,
    ];
    for (const malformedChoice of malformedInterruptKindCases) {
      const decoded = Schema.decodeUnknownEither(
        BattleCheckpointFrontierEnvelopeSchema,
      )({
        ...pendingEnvelope,
        frontier: {
          ...pendingEnvelope.frontier,
          choices: [malformedChoice],
        },
      });
      expect(Either.isLeft(decoded)).toBe(true);
    }
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        trigger: "afterDamage",
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "afterDamage",
        },
        choices: [statBlockRetaliationChoice],
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        trigger: "attackHit",
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
        choices: [statBlockReactionModifierChoice],
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        trigger: "attackHit",
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
        choices: [fighterAttackReactionModifierChoice],
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        trigger: "attackHit",
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
        choices: [unrelatedStringSupportReactionChoice],
      },
    });
    const opportunityFrontier = {
      ...pendingEnvelope.frontier,
      trigger: "opportunityAttack" as const,
      decisionHole: {
        ...pendingEnvelope.frontier.decisionHole,
        trigger: "opportunityAttack" as const,
      },
    };
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...opportunityFrontier,
        choices: [
          {
            kind: "opportunityAttack",
            reactorId: combatantId("codec-missing-opportunity-reactor"),
            subject: {
              ...encodedReadiedAttack.subject,
              command: "opportunityAttack",
              reactorId: combatantId("codec-missing-opportunity-reactor"),
              distanceFeet: 5,
            },
            initialHoles: [],
          },
        ],
      },
    });
    expectEnvelopeDecodeLeft({
      ...pendingEnvelope,
      frontier: {
        ...opportunityFrontier,
        choices: [
          {
            kind: "opportunityAttack",
            reactorId: goblinId,
            subject: {
              ...encodedReadiedAttack.subject,
              command: "opportunityAttack",
              procedureRef: fighterAttackProcedureRef,
              distanceFeet: 5,
            },
            initialHoles: [],
          },
        ],
      },
    });
    const replaceTarget = (
      candidate: EncodedInterruptChoice,
    ): EncodedInterruptChoice =>
      candidate.kind === "releaseReadiedAttack" &&
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "releaseReadiedAttack"
        ? {
            ...candidate,
            subject: {
              ...candidate.subject,
              targetId: combatantId("codec-unknown-target"),
            },
          }
        : candidate;
    const [firstChoice, ...remainingChoices] = pendingEnvelope.frontier.choices;
    const malformedTargetEnvelope = {
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        choices: [
          replaceTarget(firstChoice),
          ...remainingChoices.map(replaceTarget),
        ] as const,
      },
    };
    expectEnvelopeDecodeLeft(malformedTargetEnvelope);
    const targetSpatialFacts = {
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetDistanceSpatialFact(
          goblinId,
          fighterId,
          attackResponse.selection,
          movementFeet(5),
        ),
      ],
    };
    const decoded = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(targetSpatialFacts),
    );
    expect(decoded).toMatchObject({
      kind: "targetSpatialFacts",
      spatialFacts: [
        {
          kind: "attackTargetDistance",
          statBlockDamageNotation: "static",
        },
      ],
    });
    expect(
      resolveBattleInterrupt({
        state: reported.state,
        fill: interruptDecisionFill(
          requireHole(reported, "interruptDecision"),
          {
            kind: "resolve",
            responderId: goblinId,
            choice: {
              kind: "releaseReadiedAttack",
              reactorId: goblinId,
              targetId: fighterId,
              procedureRef: attackResponse.selection.procedureRef,
              fills: [decoded],
            },
          },
        ),
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll" }],
    });
  });

  test("round-trips a pending release of a readied ordinary action", () => {
    const state = fighterVsGoblinBattle();
    const readySubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "ready" as const,
    };
    const declarationHole = findAct(state, readySubject).initialHoles[0];
    if (declarationHole?.kind !== "readyDeclaration") {
      throw new Error("Expected a Ready declaration hole.");
    }
    const dodgeResponse = declarationHole.responseChoices.find(
      (response) =>
        response.kind === "action" && response.subject.action === "dodge",
    );
    if (dodgeResponse?.kind !== "action") {
      throw new Error("Expected Ready to offer Dodge as an ordinary action.");
    }
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [
          readyDeclarationFillForTest(
            declarationHole,
            "the goblin raises its weapon",
            dodgeResponse,
          ),
        ],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: fighterId }),
    );
    const reported = resolveBattleSubject({
      state: goblinTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "reportReadyTrigger",
        readiedActorId: fighterId,
      },
      fills: [],
    });
    if (reported.tag !== "needsHoles") {
      throw new Error("Expected a pending readied-action interrupt.");
    }

    const pendingEnvelope = encodedEnvelopeFromState(reported.state);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          pendingEnvelope,
        ),
      ),
    ).toBe(true);
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(reported.snapshot);
    expect(Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded)).toEqual(
      reported.snapshot,
    );

    const decision = requireHole(reported, "interruptDecision");
    expect(
      resolveBattleInterrupt({
        state: reported.state,
        fill: interruptDecisionFill(decision, {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "releaseReadiedAction",
            reactorId: fighterId,
            fills: [],
          },
        }),
      }),
    ).toMatchObject({ tag: "resolved" });
  });
  test("round-trips a runtime-produced character Opportunity Attack frontier", () => {
    const state = fighterVsGoblinBattle();
    const fighterAttack = characterAttackSubjectForTest(
      state,
      fighterId,
      "Longsword",
    );
    const goblinTurn = requireResolved(
      endTurn({ state, actorId: fighterId }),
    ).state;
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "move" as const,
    };
    const movement = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const awaitingOpportunity = resolveBattleSubject({
      state: goblinTurn,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: fighterId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(fighterAttack),
            },
          ],
        }),
      ],
    });
    if (awaitingOpportunity.tag !== "needsHoles") {
      throw new Error("Expected a character Opportunity Attack frontier.");
    }
    const encoded = encodedEnvelopeFromState(awaitingOpportunity.state);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encoded,
        ),
      ),
    ).toBe(true);
  });
  test("rejects an action spell act with an unknown owner", () => {
    const malformed = replaceActOwner(
      fixture.envelope,
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.mode.tag === "cast" &&
        act.subject.procedureRef === fixture.sourceProcedureRef &&
        act.subject.actorId === wizardId,
      combatantId("codec-unknown"),
    );
    expectEnvelopeDecodeLeft(malformed);
  });
  test("rejects a stat-block multiattack owned by a character", () => {
    const session = startBattleSessionRight({
      battleId: battleId("codec-multiattack-ownership"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Codec Caster",
          initiative: 20,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          statBlock: monsterMultiattackStatBlock(),
          initiative: 10,
        }),
      ],
    });
    const turn = endTurn({ state: session.state, actorId: wizardId });
    if (turn.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${turn.tag}.`);
    }
    const malformed = replaceActOwner(
      encodedEnvelopeFromState(turn.state),
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "multiattack" &&
        act.subject.actorId === skeletonId,
      wizardId,
    );
    expectEnvelopeDecodeLeft(malformed);
  });
  test("rejects an empty Stat Block Multiattack one-listed choice", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "statBlockMultiattack"
            ? {
                ...resource,
                dispatch: {
                  kind: "oneListedChoice",
                  attackProcedureRefs: [],
                },
              }
            : resource,
        ),
      },
    });
  });
  test("rejects a Stat Block Multiattack continuation owned by another combatant", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "statBlockMultiattack"
            ? { ...resource, sourceOwnerId: wizardId }
            : resource,
        ),
      },
    });
  });
  test("rejects an ordinary turn Action restored during a Stat Block Multiattack continuation", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: [
          ...encoded.turn.actionResources,
          { kind: "action", source: "turn" },
        ],
      },
    });
  });
  test("rejects a forged restriction on a Stat Block Multiattack continuation", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "statBlockMultiattack"
            ? { ...resource, restriction: { kind: "none" } }
            : resource,
        ),
      },
    });
  });
  test("rejects an unbound spell-effect Action during a Stat Block Multiattack continuation", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: [
          ...encoded.turn.actionResources,
          {
            kind: "action",
            source: "spellEffect",
            sourceEffectRef: battleActiveEffectExecutionRefForTest(
              "forged-multiattack-continuation",
            ),
            restriction: HASTE_ACTION_RESOURCE_RESTRICTION,
          },
        ],
      },
    });
  });
  test("rejects a Stat Block Multiattack continuation bound to a non-Multiattack procedure", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    const attackResource = encoded.turn.actionResources.find(
      isEncodedListedMultiattackActionResource,
    );
    if (attackResource === undefined) {
      throw new Error("Expected a listed Multiattack continuation resource.");
    }
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "statBlockMultiattack"
            ? {
                ...resource,
                sourceProcedureRef: attackResource.dispatch.attackProcedureRef,
              }
            : resource,
        ),
      },
    });
  });
  test("rejects an unlisted Stat Block Multiattack dispatch procedure", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    const statBlockCombatant = encoded.combatants.find(
      (combatant) => combatant.combatantId === skeletonId,
    );
    if (statBlockCombatant?.origin.kind !== "statBlock") {
      throw new Error("Expected a Stat Block continuation owner.");
    }
    const unarmedStrikeRef =
      statBlockCombatant.origin.execution.procedureBindings.find(
        (binding) => binding.procedure.kind === "unarmedStrike",
      )?.procedureRef;
    if (unarmedStrikeRef === undefined) {
      throw new Error("Expected the runtime-injected Unarmed Strike binding.");
    }
    const firstContinuationIndex = encoded.turn.actionResources.findIndex(
      (resource) => resource.source === "statBlockMultiattack",
    );
    expect(firstContinuationIndex).toBeGreaterThanOrEqual(0);
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource, index) =>
          index === firstContinuationIndex &&
          resource.source === "statBlockMultiattack"
            ? {
                ...resource,
                dispatch: {
                  kind: "listedOccurrence",
                  attackProcedureRef: unarmedStrikeRef,
                },
              }
            : resource,
        ),
      },
    });
  });
  test("rejects Stat Block Multiattack continuation multiplicity beyond the source binding", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    const continuationResources = encoded.turn.actionResources.filter(
      isEncodedStatBlockMultiattackActionResource,
    );
    const lastContinuation = continuationResources.at(-1);
    if (lastContinuation === undefined) {
      throw new Error("Expected a Multiattack continuation resource.");
    }
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: [...encoded.turn.actionResources, lastContinuation],
      },
    });
  });
  test("rejects a one-listed Multiattack choice that drops source multiplicity", () => {
    const encoded = encodedActivatedMultiattackSnapshot();
    const continuationResources = encoded.turn.actionResources.filter(
      isEncodedListedMultiattackActionResource,
    );
    const firstContinuation = continuationResources[0];
    if (firstContinuation === undefined) {
      throw new Error("Expected a listed Multiattack continuation resource.");
    }
    const distinctProcedureRefs = Array.from(
      new Set(
        continuationResources.map(
          (resource) => resource.dispatch.attackProcedureRef,
        ),
      ),
    );
    expectSnapshotDecodeLeft({
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: [
          {
            ...firstContinuation,
            dispatch: {
              kind: "oneListedChoice",
              attackProcedureRefs: distinctProcedureRefs,
            },
          },
        ],
      },
    });
  });
  test("rejects a character off-hand attack owned by a stat block", () => {
    const session = startBattleSessionRight({
      battleId: battleId("codec-off-hand-ownership"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_shortsword"),
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: battleObjectId("off:weapon_dagger"),
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ combatantId: skeletonId, initiative: 10 }),
      ],
    });
    const subject = characterAttackSubjectForTest(
      session.state,
      wizardId,
      "Shortsword",
    );
    const targetHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const target = targetFill(targetHole, skeletonId);
    const attackHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [target] }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [target, attackRollFill(attackHole, { total: 1, naturalD20: 1 })],
    });
    if (result.tag !== "resolved") {
      throw new Error(`Expected resolved attack, got ${result.tag}.`);
    }
    const malformed = replaceActOwner(
      encodedEnvelopeFromState(result.state),
      (act) =>
        act.subject.tag === "bonusAction" &&
        act.subject.action === "offHandAttack" &&
        act.subject.actorId === wizardId,
      skeletonId,
    );
    expectEnvelopeDecodeLeft(malformed);
  });
});
