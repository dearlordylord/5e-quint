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
  elapsedTimeTicks,
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
  battleSpellEffectOccurrenceId,
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
const encodeHole = (input: unknown): EncodedHole =>
  Schema.encodeSync(BattleHoleSchema)(
    Schema.decodeUnknownSync(BattleHoleSchema)(input),
  );
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

function replaceCastActWithLevitateAltitudeControl(
  snapshot: EncodedSnapshot,
  input: {
    readonly sourceProcedureRef: string;
    readonly subjectEffectRef: string;
    readonly altitudeHole: EncodedHole;
  },
): EncodedSnapshot {
  return replaceActSubject(
    snapshot,
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.mode.tag === "cast" &&
      act.subject.procedureRef === input.sourceProcedureRef,
    (act) => ({
      ...act,
      subject: {
        tag: "runtimeCommand",
        actorId: wizardId,
        command: "levitateAltitudeControl",
        effectRef: input.subjectEffectRef,
        targetId: skeletonId,
      },
      initialHoles: [input.altitudeHole],
    }),
  );
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
  const wizard = session.state.combatants.get(wizardId);
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
        ownerId: skeletonId,
        effect: {
          kind: "spellDamageReduction",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          damageType: "cold",
          amount: { dice: 1, dieSize: 4 },
          usedThisTurn: false,
          expiresAt: { kind: "untilDispelled" },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "sourceDamageRollPenalty",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          amount: { dice: 1, dieSize: 8 },
          expiresAt: { kind: "untilDispelled" },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "spellMarkedDamageRider",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          targetCombatantId: skeletonId,
          transfer: { kind: "available", retargetTiming: "sameTurn" },
          abilityCheckBehavior: { kind: "none" },
          damage: {
            expr: { dice: 1, dieSize: 6 },
            damageType: "cold",
          },
          expiresAt: { kind: "untilDispelled" },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "insectPlagueAreaHazard",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          appearanceOccurrence: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
          areaId: battleAreaId("area:codec-insect-plague"),
          radiusFeet: movementFeet(20),
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          damage: {
            expr: { dice: 4, dieSize: 10 },
            damageType: "piercing",
          },
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "cloudkillAreaHazard",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          appearanceOccurrence: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
          areaId: battleAreaId("area:codec-cloudkill"),
          radiusFeet: movementFeet(20),
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          damage: {
            expr: { dice: 5, dieSize: 8 },
            damageType: "poison",
          },
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "spikeGrowthHazard",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-spike-growth"),
          damage: {
            expr: { dice: 2, dieSize: 4 },
            damageType: "piercing",
          },
          damagePerFeet: movementFeet(5),
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "gustOfWindLine",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-gust"),
          directionId: battleLineDirectionId("direction:codec-gust"),
          heightenedSpellTargetDisadvantage: null,
          castTurn: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
          line: { lengthFeet: movementFeet(60), widthFeet: movementFeet(10) },
          save: { ability: "str", dc: { kind: "caster_spell_save_dc" } },
          pushDistanceFeet: movementFeet(15),
          movementCost: { multiplier: 2, appliesTo: "towardSource" },
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "spellLevitatedCreature",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          altitudeFeet: movementFeet(20),
          maxAltitudeChangeFeet: movementFeet(20),
          rangeFeet: movementFeet(60),
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "spellLevitatedCreature",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          altitudeFeet: movementFeet(10),
          maxAltitudeChangeFeet: movementFeet(20),
          rangeFeet: movementFeet(60),
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "antimagicFieldOngoingSpellSuppression",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-antimagic-field"),
          auraMembership: {
            kind: "antimagicFieldAuraMembership",
            originIncluded: false,
            nonOriginCombatantIds: [],
          },
          radiusFeet: movementFeet(10),
          suppressedOngoingSpellEffects: [],
          expiresAt: {
            kind: "concentration",
            combatantId: wizardId,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "storedLightEmitter",
        ownerId: skeletonId,
        emitter: {
          kind: "spellLightEmitter",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          attachment: { kind: "combatant", combatantId: skeletonId },
          emission: { kind: "dim", radiusFeet: movementFeet(10) },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "storedLightEmitter",
        ownerId: wizardId,
        emitter: {
          kind: "spellLightEmitter",
          sourceProcedureRef: sourceBinding.procedureRef,
          sourceCombatantId: wizardId,
          attachment: { kind: "combatant", combatantId: wizardId },
          emission: { kind: "dim", radiusFeet: movementFeet(15) },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
    ],
  });
  const activeEffectRef = (kind: string) => {
    const occurrence = allocated.occurrences.find(
      (candidate) =>
        candidate.kind === "activeEffect" && candidate.effect.kind === kind,
    );
    if (occurrence?.kind !== "activeEffect") {
      throw new Error(`Expected a codec ${kind} occurrence.`);
    }
    return occurrence.effect.effectRef;
  };
  const storedLightEmitterRef = (ownerId: typeof wizardId) => {
    const occurrence = allocated.occurrences.find(
      (candidate) =>
        candidate.kind === "storedLightEmitter" &&
        candidate.ownerId === ownerId,
    );
    if (occurrence?.kind !== "storedLightEmitter") {
      throw new Error(`Expected a codec ${ownerId} stored light emitter.`);
    }
    return occurrence.emitter.effectRef;
  };
  const skeletonStoredLightEmitter = allocated.occurrences.find(
    (occurrence) =>
      occurrence.kind === "storedLightEmitter" &&
      occurrence.ownerId === skeletonId,
  );
  if (skeletonStoredLightEmitter?.kind !== "storedLightEmitter") {
    throw new Error("Expected a codec stored light emitter occurrence.");
  }
  const levitateEffectRefs = allocated.occurrences.flatMap((occurrence) =>
    occurrence.kind === "activeEffect" &&
    occurrence.effect.kind === "spellLevitatedCreature"
      ? [occurrence.effect.effectRef]
      : [],
  );
  if (levitateEffectRefs.length !== 2) {
    throw new Error("Expected two codec Levitate effect occurrences.");
  }
  return {
    snapshot: Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(allocated.state),
    ),
    sourceProcedureRef: sourceBinding.procedureRef,
    spellDamageReductionEffectRef: activeEffectRef("spellDamageReduction"),
    sourceDamageRollPenaltyEffectRef: activeEffectRef(
      "sourceDamageRollPenalty",
    ),
    markedDamageRiderEffectRef: activeEffectRef("spellMarkedDamageRider"),
    insectPlagueEffectRef: activeEffectRef("insectPlagueAreaHazard"),
    cloudkillEffectRef: activeEffectRef("cloudkillAreaHazard"),
    spikeGrowthEffectRef: activeEffectRef("spikeGrowthHazard"),
    gustOfWindEffectRef: activeEffectRef("gustOfWindLine"),
    levitateEffectRef: activeEffectRef("spellLevitatedCreature"),
    secondLevitateEffectRef: levitateEffectRefs[1]!,
    antimagicFieldEffectRef: activeEffectRef(
      "antimagicFieldOngoingSpellSuppression",
    ),
    storedLightEmitterRef: skeletonStoredLightEmitter.emitter.effectRef,
    wizardStoredLightEmitterRef: storedLightEmitterRef(wizardId),
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
  ...(
    [
      ["insectPlagueAreaHazard", fixture.insectPlagueEffectRef],
      ["cloudkillAreaHazard", fixture.cloudkillEffectRef],
    ] as const
  ).map(([variant, effectRef]) =>
    right(
      variant,
      saving(variant, variant, "con", {
        ...source,
        effectRef,
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
  effectRef: fixture.markedDamageRiderEffectRef,
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
        effectRef: fixture.spellDamageReductionEffectRef,
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
        effectRef: fixture.sourceDamageRollPenaltyEffectRef,
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
        effectRef: fixture.spikeGrowthEffectRef,
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
        effectRef: fixture.insectPlagueEffectRef,
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
        effectRef: fixture.cloudkillEffectRef,
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

function damageProtocolHoleWithEffectRef(
  entry: CodecCase,
  effectRef: string,
): EncodedHole {
  const value = entry.hole;
  if (value.kind !== "rolledDice") {
    throw new Error("Expected a rolled-dice damage protocol hole.");
  }
  if ("spellDamageReduction" in value) {
    return {
      ...value,
      spellDamageReduction: { ...value.spellDamageReduction, effectRef },
    };
  }
  if ("sourceDamageRollPenalty" in value) {
    return {
      ...value,
      sourceDamageRollPenalty: { ...value.sourceDamageRollPenalty, effectRef },
    };
  }
  throw new Error("Expected an occurrence-bound damage protocol hole.");
}

describe("battle codec execution-reference boundaries", () => {
  test.each(cases)("$expected $name", ({ expected, hole: replacement }) => {
    const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(
      replaceActHole(fixture.snapshot, fixture.sourceProcedureRef, replacement),
    );
    expect(Result.isSuccess(decoded)).toBe(expected === "Right");
  });

  test.each([
    [
      "spellDamageReduction",
      rolledDiceCases[2],
      fixture.spellDamageReductionEffectRef,
    ],
    [
      "sourceDamageRollPenalty",
      rolledDiceCases[3],
      fixture.sourceDamageRollPenaltyEffectRef,
    ],
  ] as const)(
    "rejects %s when its effect occurrence is absent",
    (_, entry, effectRef) => {
      if (entry === undefined) {
        throw new Error("Expected the damage protocol codec case.");
      }
      const snapshot = replaceActHole(
        fixture.snapshot,
        fixture.sourceProcedureRef,
        entry.hole,
      );
      const withoutOccurrence = {
        ...snapshot,
        combatants: snapshot.combatants.map((combatant) => ({
          ...combatant,
          effectOccurrences: combatant.effectOccurrences.filter(
            (occurrence) => occurrence.effectRef !== effectRef,
          ),
        })),
      };

      expectSnapshotDecodeLeft(withoutOccurrence);
    },
  );

  test.each([
    ["spellDamageReduction", rolledDiceCases[2]],
    ["sourceDamageRollPenalty", rolledDiceCases[3]],
  ] as const)(
    "rejects %s when the occurrence belongs to another combatant",
    (_, entry) => {
      if (entry === undefined) {
        throw new Error("Expected the damage protocol codec case.");
      }
      expectSnapshotDecodeLeft(
        replaceActHole(
          fixture.snapshot,
          fixture.sourceProcedureRef,
          damageProtocolHoleWithEffectRef(
            entry,
            fixture.markedDamageRiderEffectRef,
          ),
        ),
      );
    },
  );

  test.each([
    ["spellDamageReduction", rolledDiceCases[2]],
    ["sourceDamageRollPenalty", rolledDiceCases[3]],
  ] as const)(
    "rejects %s when the occurrence is not an active effect",
    (_, entry) => {
      if (entry === undefined) {
        throw new Error("Expected the damage protocol codec case.");
      }
      expectSnapshotDecodeLeft(
        replaceActHole(
          fixture.snapshot,
          fixture.sourceProcedureRef,
          damageProtocolHoleWithEffectRef(entry, fixture.storedLightEmitterRef),
        ),
      );
    },
  );

  test("rejects a damage occurrence at the owner's allocation cursor", () => {
    const snapshot = replaceActHole(
      fixture.snapshot,
      fixture.sourceProcedureRef,
      rolledDiceCases[2]!.hole,
    );
    const invalidCursor = {
      ...snapshot,
      combatants: snapshot.combatants.map((combatant) =>
        combatant.combatantId === skeletonId
          ? { ...combatant, nextEffectOrdinal: 0 }
          : combatant,
      ),
    };

    expectSnapshotDecodeLeft(invalidCursor);
  });

  test("round-trips exact movement and Levitate spatial occurrence references", () => {
    const movement = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "movement",
      holeId: holeId("exact-movement-occurrences"),
      value: {
        speedKind: "walk",
        movementCostFeet: 20,
        provokedOpportunityAttacks: [],
        areaDifficultTerrain: {
          kind: "areaDifficultTerrain",
          sources: [
            {
              kind: "spikeGrowthHazard",
              effectRef: fixture.spikeGrowthEffectRef,
              sourceCombatantId: wizardId,
              sourceProcedureRef: fixture.sourceProcedureRef,
              areaId: battleAreaId("area:codec-spike-growth"),
              damageDistanceFeet: 5,
            },
          ],
          totalDistanceFeet: 10,
          difficultTerrainDistanceFeet: 5,
        },
        gustOfWindLineMovement: {
          kind: "gustOfWindLineMovement",
          effectRef: fixture.gustOfWindEffectRef,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          areaId: battleAreaId("area:codec-gust"),
          directionId: battleLineDirectionId("direction:codec-gust"),
          totalDistanceFeet: 10,
          closerDistanceFeet: 5,
        },
        levitatedMovement: {
          kind: "levitatedMovement",
          effectRef: fixture.levitateEffectRef,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          fixedObjectOrSurfaceWithinReach: true,
        },
      },
    });
    const altitudeChange = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "levitateAltitudeChange",
      holeId: holeId("exact-levitate-altitude"),
      value: { direction: "up", distanceFeet: 10 },
      spatialFacts: [
        {
          kind: "levitatedTargetWithinSpellRange",
          effectRef: fixture.levitateEffectRef,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          targetId: skeletonId,
          rangeFeet: 60,
        },
      ],
    });

    expect(
      Schema.decodeUnknownSync(BattleFillSchema)(
        Schema.encodeSync(BattleFillSchema)(movement),
      ),
    ).toEqual(movement);
    expect(
      Schema.decodeUnknownSync(BattleFillSchema)(
        Schema.encodeSync(BattleFillSchema)(altitudeChange),
      ),
    ).toEqual(altitudeChange);
  });

  test.each([
    {
      kind: "movement",
      holeId: holeId("missing-terrain-occurrence"),
      value: {
        speedKind: "walk",
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        areaDifficultTerrain: {
          kind: "areaDifficultTerrain",
          sources: [
            {
              kind: "spikeGrowthHazard",
              sourceCombatantId: wizardId,
              sourceProcedureRef: fixture.sourceProcedureRef,
              areaId: battleAreaId("area:codec-spike-growth"),
              damageDistanceFeet: 5,
            },
          ],
          totalDistanceFeet: 5,
          difficultTerrainDistanceFeet: 5,
        },
      },
    },
    {
      kind: "movement",
      holeId: holeId("missing-gust-occurrence"),
      value: {
        speedKind: "walk",
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        gustOfWindLineMovement: {
          kind: "gustOfWindLineMovement",
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          areaId: battleAreaId("area:codec-gust"),
          directionId: battleLineDirectionId("direction:codec-gust"),
          totalDistanceFeet: 5,
          closerDistanceFeet: 5,
        },
      },
    },
    {
      kind: "movement",
      holeId: holeId("missing-levitate-movement-occurrence"),
      value: {
        speedKind: "walk",
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        levitatedMovement: {
          kind: "levitatedMovement",
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          fixedObjectOrSurfaceWithinReach: true,
        },
      },
    },
    {
      kind: "levitateAltitudeChange",
      holeId: holeId("missing-levitate-spatial-occurrence"),
      value: { direction: "up", distanceFeet: 10 },
      spatialFacts: [
        {
          kind: "levitatedTargetWithinSpellRange",
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          targetId: skeletonId,
          rangeFeet: 60,
        },
      ],
    },
  ])(
    "rejects a fill missing an exact movement occurrence reference",
    (fill) => {
      expect(
        Result.isFailure(Schema.decodeUnknownResult(BattleFillSchema)(fill)),
      ).toBe(true);
    },
  );

  test("binds a Levitate altitude act and hole to the same target-owned active effect", () => {
    const altitudeHole = hole("levitateAltitudeChange", {
      kind: "levitateAltitudeChange",
      effectRef: fixture.levitateEffectRef,
      actorId: wizardId,
      targetId: skeletonId,
      maxDistanceFeet: 20,
      directions: ["up", "down"],
      requiresTargetWithinRangeFact: true,
    });
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          replaceCastActWithLevitateAltitudeControl(fixture.snapshot, {
            sourceProcedureRef: fixture.sourceProcedureRef,
            subjectEffectRef: fixture.levitateEffectRef,
            altitudeHole,
          }),
        ),
      ),
    ).toBe(true);
    for (const effectRef of [
      fixture.gustOfWindEffectRef,
      fixture.storedLightEmitterRef,
    ]) {
      expectSnapshotDecodeLeft(
        replaceCastActWithLevitateAltitudeControl(fixture.snapshot, {
          sourceProcedureRef: fixture.sourceProcedureRef,
          subjectEffectRef: fixture.levitateEffectRef,
          altitudeHole: encodeHole({ ...altitudeHole, effectRef }),
        }),
      );
    }
    expectSnapshotDecodeLeft(
      replaceCastActWithLevitateAltitudeControl(fixture.snapshot, {
        sourceProcedureRef: fixture.sourceProcedureRef,
        subjectEffectRef: fixture.levitateEffectRef,
        altitudeHole: encodeHole({
          ...altitudeHole,
          effectRef: fixture.secondLevitateEffectRef,
        }),
      }),
    );
  });

  test("binds an Antimagic Field target choice to the source-owned aura occurrence", () => {
    const aura = {
      kind: "antimagicFieldAura" as const,
      effectRef: fixture.antimagicFieldEffectRef,
      areaId: battleAreaId("area:codec-antimagic-field"),
      sourceCombatantId: wizardId,
    };
    const targetHole = hole("ongoingSpellTargetChoice", {
      kind: "ongoingSpellTargetChoice",
      label: "Ongoing spell target",
      requiresTableSpatialFact: true,
      casterId: wizardId,
      procedureRef: fixture.sourceProcedureRef,
      rangeFeet: 120,
      choices: [{ kind: "magicalEffect", effect: aura }],
    });
    const snapshot = replaceActHole(
      fixture.snapshot,
      fixture.sourceProcedureRef,
      targetHole,
    );
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(snapshot),
      ),
    ).toBe(true);
    const { effectRef: _effectRef, ...auraWithoutEffectRef } = aura;
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleHoleSchema)({
          ...baseHole("ongoingSpellTargetChoiceWithoutAuraOccurrence"),
          kind: "ongoingSpellTargetChoice",
          label: "Ongoing spell target",
          requiresTableSpatialFact: true,
          casterId: wizardId,
          procedureRef: fixture.sourceProcedureRef,
          rangeFeet: 120,
          choices: [{ kind: "magicalEffect", effect: auraWithoutEffectRef }],
        }),
      ),
    ).toBe(true);

    for (const effectRef of [
      fixture.levitateEffectRef,
      fixture.wizardStoredLightEmitterRef,
    ]) {
      expectSnapshotDecodeLeft(
        replaceActHole(
          fixture.snapshot,
          fixture.sourceProcedureRef,
          encodeHole({
            ...targetHole,
            choices: [
              {
                kind: "magicalEffect",
                effect: { ...aura, effectRef },
              },
            ],
          }),
        ),
      );
    }

    expectSnapshotDecodeLeft({
      ...snapshot,
      combatants: snapshot.combatants.map((combatant) => ({
        ...combatant,
        effectOccurrences: combatant.effectOccurrences.filter(
          (occurrence) =>
            occurrence.effectRef !== fixture.antimagicFieldEffectRef,
        ),
      })),
    });
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
