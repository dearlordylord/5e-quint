import { Schema } from "effect";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import {
  BattleFillSchema,
  BattleHoleSchema,
  BattleSnapshotSchema,
  attackTargetDistanceSpatialFact,
  battleId,
  characterAttackSubjectForTest,
  characterSeed,
  combatantId,
  discoverBattleActs,
  endTurn,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  interruptDecisionFill,
  movementFeet,
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
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleProcedureExecutionRefForTest,
  skeletonId,
  statBlockCreatureInit,
  resolveBattleSubject,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  battleAreaId,
  battleLineDirectionId,
  battleObjectId,
} from "./identity.ts";

type EncodedHole = Schema.Codec.Encoded<typeof BattleHoleSchema>;
type EncodedSnapshot = Schema.Codec.Encoded<typeof BattleSnapshotSchema>;
type EncodedAct = EncodedSnapshot["acts"][number];
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
const encodeHole = (input: unknown): EncodedHole => {
  try {
    return Schema.encodeSync(BattleHoleSchema)(
      Schema.decodeUnknownSync(BattleHoleSchema)(input),
    );
  } catch (cause) {
    throw new Error(
      `Failed to encode ${typeof input === "object" && input !== null && "holeId" in input ? String(input.holeId) : "unknown hole"}.`,
      { cause },
    );
  }
};
const hole = (name: string, input: object): EncodedHole =>
  encodeHole({ ...baseHole(name), ...input });

function replaceActHole(
  snapshot: EncodedSnapshot,
  procedureRef: string,
  replacement: EncodedHole,
): EncodedSnapshot {
  const ownerIndices = snapshot.acts.flatMap((act, index) =>
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
  const acts = snapshot.acts.map((act, index) =>
    index === ownerIndex ? { ...act, initialHoles: [replacement] } : act,
  );
  return { ...snapshot, acts };
}

function replaceActSubject(
  snapshot: EncodedSnapshot,
  predicate: (act: EncodedAct) => boolean,
  replace: (act: EncodedAct) => EncodedAct,
): EncodedSnapshot {
  const matches = snapshot.acts
    .map((act, index) => (predicate(act) ? index : -1))
    .filter((index) => index >= 0);
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one matching act; found ${matches.length}.`,
    );
  }
  const match = matches[0]!;
  return {
    ...snapshot,
    acts: snapshot.acts.map((act, index) =>
      index === match ? replace(act) : act,
    ),
  };
}

function replaceActOwner(
  snapshot: EncodedSnapshot,
  predicate: (act: EncodedAct) => boolean,
  actorId: ReturnType<typeof combatantId>,
): EncodedSnapshot {
  return replaceActSubject(snapshot, predicate, (act) => ({
    ...act,
    subject: { ...act.subject, actorId },
  }));
}

const encodedSnapshotFromState = (
  state: Parameters<typeof snapshotBattle>[0],
) => Schema.encodeSync(BattleSnapshotSchema)(snapshotBattle(state));

function expectSnapshotDecodeLeft(snapshot: EncodedSnapshot): void {
  const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(snapshot);
  expect(Result.isFailure(decoded)).toBe(true);
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
  const initialSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
    snapshotBattle(session.state),
  );
  const wizard = initialSnapshot.combatants.find(
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
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: session.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "nextAttackRollBySelf",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          mode: "advantage",
          expiresAt: { kind: "untilDispelled" },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "nextAttackRollBySelf",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          mode: "advantage",
          expiresAt: { kind: "untilDispelled" },
        },
      },
    ],
  });
  const sourceOccurrence = allocated.occurrences[0];
  const targetOccurrence = allocated.occurrences[1];
  if (
    sourceOccurrence?.kind !== "activeEffect" ||
    targetOccurrence?.kind !== "activeEffect"
  )
    throw new Error("Expected two allocated active-effect occurrences.");
  return {
    snapshot: Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(allocated.state),
    ),
    sourceProcedureRef: source.procedureRef,
    effectRef: sourceOccurrence.effect.effectRef,
    targetEffectRef: targetOccurrence.effect.effectRef,
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
    ...(variant === "hideousLaughterRepeatSave"
      ? { damageOccurrence: { kind: "untrackedDamage" } }
      : {}),
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

function codecStaticDartStatBlock() {
  const base = monsterMultiattackStatBlock();
  const shortbow = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Shortbow",
  );
  if (shortbow === undefined) {
    throw new Error("Expected the static codec Shortbow fixture.");
  }
  return {
    ...base,
    name: "Codec Static Dart Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Codec Static Dart Monster",
      actions: {
        ...base.statBlock.actions,
        attacks: [
          {
            ...shortbow,
            onHit: [
              {
                kind: "damage" as const,
                damageType: "piercing" as const,
                amount: {
                  kind: "fixed" as const,
                  expr: { dice: 1, dieSize: 4 },
                  static: 3,
                },
              },
            ] as const,
          },
        ] as const,
      },
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
      effectRef: fixture.targetEffectRef,
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
        effectRef: fixture.effectRef,
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
          effectRef: fixture.effectRef,
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
        effectRef: fixture.effectRef,
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
      effectRef: fixture.effectRef,
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
        effectRef: fixture.effectRef,
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
        effectRef: fixture.targetEffectRef,
        trigger: { kind: "condition", condition: "poisoned" },
        damage,
      },
    }),
  ),
  right(
    "spellTurnEndDamage",
    rolled("spellTurnEndDamage", {
      spellTurnEndDamage: {
        ...source,
        effectRef: fixture.targetEffectRef,
        damage,
      },
    }),
  ),
  right(
    "movableZone",
    rolled("movableZone", {
      critical: false,
      movableZone: {
        ...source,
        effectRef: fixture.targetEffectRef,
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
        effectRef: fixture.effectRef,
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
        effectRef: fixture.effectRef,
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
    effectRef: fixture.effectRef,
    areaId: battleAreaId("area:codec-gust-of-wind"),
    directionId: battleLineDirectionId("direction:codec-north"),
    requiresTableSpatialFact: true,
  }),
  hole("movableZoneRepositionMovement", {
    kind: "movableZoneRepositionMovement",
    movableZone: {
      sourceCombatantId: wizardId,
      sourceProcedureRef: invalidSource,
      effectRef: fixture.effectRef,
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
        effectRef: fixture.effectRef,
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

describe("battle codec execution-reference boundaries", () => {
  test.each(cases)("$expected $name", ({ expected, hole: replacement }) => {
    const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(
      replaceActHole(fixture.snapshot, fixture.sourceProcedureRef, replacement),
    );
    expect(Result.isSuccess(decoded)).toBe(expected === "Right");
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
        characterSeed({ combatantId: fighterId, initiative: 10 }),
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
    const choice = reported.snapshot.pendingInterrupt?.choices.find(
      (candidate) =>
        candidate.kind === "releaseReadiedAttack" &&
        candidate.subject.targetId === fighterId,
    );
    if (choice?.kind !== "releaseReadiedAttack") {
      throw new Error("Expected a fixed-target readied attack choice.");
    }
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
  test("rejects an action spell act with an unknown owner", () => {
    const malformed = replaceActOwner(
      fixture.snapshot,
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.mode.tag === "cast" &&
        act.subject.procedureRef === fixture.sourceProcedureRef &&
        act.subject.actorId === wizardId,
      combatantId("codec-unknown"),
    );
    expectSnapshotDecodeLeft(malformed);
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
      encodedSnapshotFromState(turn.state),
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "multiattack" &&
        act.subject.actorId === skeletonId,
      wizardId,
    );
    expectSnapshotDecodeLeft(malformed);
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
      encodedSnapshotFromState(result.state),
      (act) =>
        act.subject.tag === "bonusAction" &&
        act.subject.action === "offHandAttack" &&
        act.subject.actorId === wizardId,
      skeletonId,
    );
    expectSnapshotDecodeLeft(malformed);
  });
});
