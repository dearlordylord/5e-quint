import { Schema } from "effect";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
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
  elapsedTimeTicks,
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
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleProcedureExecutionRefForTest,
  battleCheckpointFrontierEnvelope,
  battleFrontierInterruptDecisionForState,
  skeletonId,
  statBlockCreatureInit,
  resolveBattleSubject,
  wizardId,
  wizardSpellcasting,
  spellRecord,
} from "./battle-runtime.test-support.ts";
import {
  BattleInterruptDecisionFrontierSchema,
  BattleObjectDamageOutcomeSchema,
} from "./battle-reducer/battle-codecs.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  battleAreaId,
  battleLineDirectionId,
  battleObjectId,
  battleSpellEffectOccurrenceId,
  battleTablePositionId,
} from "./identity.ts";
import { parseBattleSpellEffectLevel } from "./procedure-execution/spell-effect-level.ts";
import { battleActiveEffectOccurrenceSpatialProjection } from "./battle-reducer/creature-state-execution.ts";

type EncodedHole = Schema.Codec.Encoded<typeof BattleHoleSchema>;
type EncodedSnapshot = Schema.Codec.Encoded<typeof BattleSnapshotSchema>;
type EncodedOccurrenceLocation =
  EncodedSnapshot["combatants"][number]["activeEffectOccurrences"][number]["location"];
type EncodedEnvelope = Schema.Codec.Encoded<
  typeof BattleCheckpointFrontierEnvelopeSchema
>;
type EncodedActsFrontier = Extract<
  EncodedEnvelope["frontier"],
  { readonly kind: "acts" }
>;
type EncodedAct = EncodedActsFrontier["acts"][number];
type EncodedInterruptChoice = Extract<
  EncodedEnvelope["frontier"],
  { readonly kind: "interruptDecision" }
>["choices"][number];
type CodecCase = {
  readonly name: string;
  readonly expected: "Success" | "Failure";
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

function replaceCastActWithLevitateAltitudeControl(
  envelope: EncodedEnvelope,
  input: {
    readonly sourceProcedureRef: string;
    readonly subjectEffectRef: string;
    readonly altitudeHole: EncodedHole;
  },
): EncodedEnvelope {
  return replaceActSubject(
    envelope,
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.mode.tag === "cast" &&
      act.subject.procedureRef === input.sourceProcedureRef,
    (act) => ({
      ...act,
      subject: {
        tag: "runtimeCommand",
        actorId: wizardId,
        command: "controlledVerticalSuspensionAltitudeControl",
        effectRef: input.subjectEffectRef,
        targetId: skeletonId,
      },
      initialHoles: [input.altitudeHole],
    }),
  );
}

function replaceCastActWithPersistentAreaSaveDamage(
  envelope: EncodedEnvelope,
  input: {
    readonly sourceProcedureRef: string;
    readonly targetId: typeof skeletonId;
    readonly effectRef: string;
    readonly areaId: string;
    readonly hole: EncodedHole;
  },
): EncodedEnvelope {
  return replaceActSubject(
    envelope,
    (act) =>
      act.subject.tag === "actionSpell" &&
      act.subject.mode.tag === "cast" &&
      act.subject.procedureRef === input.sourceProcedureRef,
    (act) => ({
      ...act,
      subject: {
        tag: "runtimeCommand",
        actorId: input.targetId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: {
          kind: "firstEntryOnTurn",
          areaId: input.areaId,
          effectRef: input.effectRef,
        },
      },
      initialHoles: [input.hole],
    }),
  );
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

function expectSnapshotDecodeFailure(snapshot: EncodedSnapshot): void {
  const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)(snapshot);
  expect(Result.isFailure(decoded)).toBe(true);
}

function expectEnvelopeDecodeFailure(envelope: EncodedEnvelope): void {
  const decoded = Schema.decodeUnknownResult(
    BattleCheckpointFrontierEnvelopeSchema,
  )(envelope);
  expect(Result.isFailure(decoded)).toBe(true);
}

function codecFixture() {
  const glyphSpellLevel = parseBattleSpellEffectLevel(3);
  if (glyphSpellLevel === null) {
    throw new Error("Expected the codec Glyph spell level to be valid.");
  }
  const session = startBattleSessionRight({
    battleId: battleId("battle-codec-boundary"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Codec Caster",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: [
            spellRecord("magic_missile"),
            spellRecord("insect_plague"),
            spellRecord("cloudkill"),
          ],
          spellSlots: [
            { spellLevel: 1, count: 2 },
            { spellLevel: 5, count: 2 },
          ],
        }),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
  const initialEnvelope = Schema.encodeSync(
    BattleCheckpointFrontierEnvelopeSchema,
  )(battleCheckpointFrontierEnvelope(session.state));
  if (initialEnvelope.frontier.kind !== "acts") {
    throw new Error("Expected an Acts frontier.");
  }
  const wizard = initialEnvelope.checkpoint.combatants.find(
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
  const persistentAreaSource = (spellId: "insect_plague" | "cloudkill") => {
    const persistentSource = characterContext.spellPresentationSources.find(
      (candidate) =>
        candidate.invocation.procedure === "persistentAreaSaveDamage" &&
        candidate.invocation.spell.id === spellId,
    );
    if (persistentSource === undefined) {
      throw new Error(`Expected the ${spellId} presentation source.`);
    }
    return persistentSource;
  };
  const insectPlagueSource = persistentAreaSource("insect_plague");
  const cloudkillSource = persistentAreaSource("cloudkill");
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: session.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "spellDamageReduction",
          sourceProcedureRef: source.procedureRef,
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
          sourceProcedureRef: source.procedureRef,
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
          sourceProcedureRef: source.procedureRef,
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
        ownerId: skeletonId,
        effect: {
          kind: "spellTurnStartDamageAndSave",
          source: "turnBoundaryEffectLifecycle",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "cold" },
          save: {
            ability: "wis",
            dc: { kind: "caster_spell_save_dc" },
            successEnds: "spell",
          },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "saveGatedConditionWithRepeat",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          conditionHadNonSpellProneSource: false,
          conditionHadNonSpellIncapacitatedSource: false,
          repeatSaveRollMode: null,
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
          kind: "possession",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "persistentAreaSaveCondition",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-grease"),
          heightenedSpellTargetDisadvantage: null,
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "persistentAreaSaveComposite",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-sleet-storm"),
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
          kind: "spellObjectContactDamage",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          sourceSpellLevel: glyphSpellLevel,
          objectId: battleObjectId("object:codec-contact-damage"),
          rangeFeet: movementFeet(60),
          damage: { expr: { dice: 2, dieSize: 8 }, damageType: "fire" },
          startedOn: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
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
          kind: "glyphDurableOccurrence",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          sourceEffectId: battleSpellEffectOccurrenceId("effect:codec-glyph"),
          sourceSpellLevel: glyphSpellLevel,
          release: { kind: "explosiveRune", damageType: "cold" },
          anchor: {
            kind: "surface",
            areaId: battleAreaId("area:codec-glyph-anchor"),
          },
          coveredAreaId: battleAreaId("area:codec-glyph-covered"),
          castLocationId: battleTablePositionId("position:codec-glyph"),
          maxCoveredDiameterFeet: movementFeet(10),
          notice: {
            ability: "wis",
            skill: "perception",
            dc: { kind: "caster_spell_save_dc" },
            owner: "table_witnessed_glyph_notice",
          },
          trigger: {
            occurrence: "table_witnessed_trigger_occurrence",
            activationFilter: "creature_type",
            nonTriggerExclusion: "password_or_other_condition",
            onTriggered: "spell_ends",
          },
          movementInvalidation: {
            movedSubject: "inscribed_surface_or_object",
            distanceFrom: "cast_location",
            moreThanFeet: movementFeet(10),
            outcome: "glyph_breaks_spell_ends_without_triggering",
          },
          expiresAt: { kind: "untilDispelled" },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "persistentAreaSaveDamage",
          lifecycle: {
            kind: "casterActionReposition",
          },
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-flaming-sphere"),
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
          kind: "spellTurnEndDamage",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "cold" },
          expiresAt: {
            kind: "endOfTurn",
            combatantId: skeletonId,
            round: session.state.initiative.round,
          },
        },
      },
      {
        kind: "activeEffect",
        ownerId: wizardId,
        effect: {
          kind: "persistentAreaSaveDamage",
          lifecycle: { kind: "stationary" },
          sourceProcedureRef: insectPlagueSource.procedureRef,
          sourceCombatantId: wizardId,
          appearanceOccurrence: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
          areaId: battleAreaId("area:codec-insect-plague"),
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
          kind: "persistentAreaSaveDamage",
          lifecycle: {
            kind: "sourceTurnTranslation",
          },
          sourceProcedureRef: cloudkillSource.procedureRef,
          sourceCombatantId: wizardId,
          appearanceOccurrence: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
          areaId: battleAreaId("area:codec-cloudkill"),
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
          kind: "areaMovementDistanceDamage",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-spike-growth"),
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
          kind: "directionalPersistentArea",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-gust"),
          directionId: battleLineDirectionId("direction:codec-gust"),
          heightenedSpellTargetDisadvantage: null,
          castTurn: {
            actorId: wizardId,
            round: session.state.initiative.round,
          },
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
          kind: "controlledVerticalSuspension",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          altitudeFeet: movementFeet(20),
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
          kind: "controlledVerticalSuspension",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          altitudeFeet: movementFeet(10),
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
          kind: "magicSuppressionEmanation",
          sourceProcedureRef: source.procedureRef,
          sourceCombatantId: wizardId,
          areaId: battleAreaId("area:codec-antimagic-field"),
          auraMembership: {
            kind: "magicSuppressionEmanationMembership",
            originIncluded: false,
            nonOriginCombatantIds: [],
          },
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
          sourceProcedureRef: source.procedureRef,
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
          sourceProcedureRef: source.procedureRef,
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
  const persistentAreaSaveDamageEffectRef = (areaName: string) => {
    const areaId = battleAreaId(areaName);
    const occurrence = allocated.occurrences.find(
      (candidate) =>
        candidate.kind === "activeEffect" &&
        candidate.effect.kind === "persistentAreaSaveDamage" &&
        candidate.effect.areaId === areaId,
    );
    if (occurrence?.kind !== "activeEffect") {
      throw new Error(`Expected a codec persistent area ${areaName}.`);
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
    occurrence.effect.kind === "controlledVerticalSuspension"
      ? [occurrence.effect.effectRef]
      : [],
  );
  if (levitateEffectRefs.length !== 2) {
    throw new Error("Expected two codec Levitate effect occurrences.");
  }
  const nextAttackEffectRef = (ownerId: typeof wizardId) => {
    const occurrence = allocated.occurrences.find(
      (candidate) =>
        candidate.kind === "activeEffect" &&
        candidate.ownerId === ownerId &&
        candidate.effect.kind === "nextAttackRollBySelf",
    );
    if (occurrence?.kind !== "activeEffect") {
      throw new Error(`Expected a codec ${ownerId} next-attack occurrence.`);
    }
    return occurrence.effect.effectRef;
  };
  const envelope = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
    battleCheckpointFrontierEnvelope(allocated.state),
  );
  if (envelope.frontier.kind !== "acts") {
    throw new Error("Expected an allocated Acts frontier.");
  }
  return {
    envelope,
    snapshot: envelope.checkpoint,
    sourceProcedureRef: source.procedureRef,
    insectPlagueSourceProcedureRef: insectPlagueSource.procedureRef,
    cloudkillSourceProcedureRef: cloudkillSource.procedureRef,
    effectRef: nextAttackEffectRef(wizardId),
    targetEffectRef: nextAttackEffectRef(skeletonId),
    spellDamageReductionEffectRef: activeEffectRef("spellDamageReduction"),
    sourceDamageRollPenaltyEffectRef: activeEffectRef(
      "sourceDamageRollPenalty",
    ),
    markedDamageRiderEffectRef: activeEffectRef("spellMarkedDamageRider"),
    spellTurnStartEffectRef: activeEffectRef("spellTurnStartDamageAndSave"),
    saveGatedConditionWithRepeatEffectRef: activeEffectRef(
      "saveGatedConditionWithRepeat",
    ),
    protectionRelevantEffectRef: activeEffectRef("possession"),
    greaseEffectRef: activeEffectRef("persistentAreaSaveCondition"),
    sleetStormEffectRef: activeEffectRef("persistentAreaSaveComposite"),
    glyphEffectRef: activeEffectRef("glyphDurableOccurrence"),
    movableZoneEffectRef: activeEffectRef("persistentAreaSaveDamage"),
    insectPlagueEffectRef: persistentAreaSaveDamageEffectRef(
      "area:codec-insect-plague",
    ),
    spellTurnEndEffectRef: activeEffectRef("spellTurnEndDamage"),
    persistentAreaSaveDamageEffectRef: persistentAreaSaveDamageEffectRef(
      "area:codec-insect-plague",
    ),
    cloudkillEffectRef: persistentAreaSaveDamageEffectRef(
      "area:codec-cloudkill",
    ),
    spikeGrowthEffectRef: activeEffectRef("areaMovementDistanceDamage"),
    gustOfWindEffectRef: activeEffectRef("directionalPersistentArea"),
    levitateEffectRef: activeEffectRef("controlledVerticalSuspension"),
    secondLevitateEffectRef: levitateEffectRefs[1]!,
    antimagicFieldEffectRef: activeEffectRef("magicSuppressionEmanation"),
    storedLightEmitterRef: skeletonStoredLightEmitter.emitter.effectRef,
    wizardStoredLightEmitterRef: storedLightEmitterRef(wizardId),
    activeEffects: allocated.occurrences.flatMap((occurrence) =>
      occurrence.kind === "activeEffect" ? [occurrence.effect] : [],
    ),
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
    ...(variant === "saveGatedConditionRepeatSave"
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
const successCase = (name: string, holeValue: EncodedHole): CodecCase => ({
  name,
  expected: "Success",
  hole: holeValue,
});
const failureCase = (name: string, holeValue: EncodedHole): CodecCase => ({
  name,
  expected: "Failure",
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
  successCase(
    "spellTurnStartSave",
    saving("spellTurnStartSave", "spellTurnStartSave", "wis", {
      ...source,
      effectRef: fixture.spellTurnStartEffectRef,
      save: { ...save("wis"), successEnds: "spell" },
    }),
  ),
  successCase(
    "saveGatedConditionRepeatSave",
    saving(
      "saveGatedConditionRepeatSave",
      "saveGatedConditionRepeatSave",
      "wis",
      {
        ...source,
        effectRef: fixture.saveGatedConditionWithRepeatEffectRef,
        trigger: "endTurn",
        save: save("wis"),
      },
    ),
  ),
  successCase(
    "spellConditionEndTurnSave",
    saving("spellConditionEndTurnSave", "spellConditionEndTurnSave", "dex", {
      ...source,
      condition: "restrained",
      save: save("dex"),
    }),
  ),
  successCase(
    "protectionRelevantEffectSave",
    saving(
      "protectionRelevantEffectSave",
      "protectionRelevantEffectSave",
      "wis",
      {
        ...source,
        effectRef: fixture.protectionRelevantEffectRef,
        relevantEffect: "possession",
        save: save("wis"),
      },
    ),
  ),
  ...(
    [
      [
        "persistentAreaSaveCondition",
        fixture.greaseEffectRef,
        "area:codec-grease",
      ],
      [
        "persistentAreaSaveComposite",
        fixture.sleetStormEffectRef,
        "area:codec-sleet-storm",
      ],
    ] as const
  ).map(([variant, effectRef, areaId]) =>
    successCase(
      variant,
      saving(variant, variant, "dex", {
        ...source,
        effectRef,
        areaId: battleAreaId(areaId),
        trigger: "entersArea",
        save: save("dex"),
      }),
    ),
  ),
  ...(
    [
      [
        "persistentAreaSaveDamage",
        fixture.persistentAreaSaveDamageEffectRef,
        "stationary",
        "area:codec-insect-plague",
      ],
      [
        "persistentAreaSaveDamage",
        fixture.cloudkillEffectRef,
        "translating",
        "area:codec-cloudkill",
      ],
    ] as const
  ).map(([variant, effectRef, topology, areaId]) =>
    failureCase(
      variant,
      saving(variant, variant, "con", {
        ...source,
        sourceProcedureRef:
          topology === "stationary"
            ? fixture.insectPlagueSourceProcedureRef
            : fixture.cloudkillSourceProcedureRef,
        topology,
        effectRef,
        areaId: battleAreaId(areaId),
        trigger: "entersArea",
        save: save("con"),
      }),
    ),
  ),
  successCase(
    "glyphExplosiveRune",
    hole("glyphExplosiveRune", {
      kind: "savingThrowOutcome",
      glyphExplosiveRune: {
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        effectRef: fixture.glyphEffectRef,
        radiusFeet: 20,
      },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targetIds: [skeletonId],
      targetRollModes: [],
      targetFlatBonuses: [],
    }),
  ),
  successCase(
    "linkedDefenseResistanceDamageShareSeparation",
    hole("linkedDefenseResistanceDamageShareSeparation", {
      kind: "targetSpatialFacts",
      linkedEffectSeparation: {
        sourceCombatantId: wizardId,
        targetId: skeletonId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        rangeFeet: 30,
      },
      requiresTableSpatialFact: true,
    }),
  ),
  successCase(
    "directionalPersistentAreaSave",
    saving(
      "directionalPersistentAreaSave",
      "directionalPersistentArea",
      "str",
      {
        targetId: skeletonId,
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        effectRef: fixture.gustOfWindEffectRef,
        areaId: battleAreaId("area:codec-gust"),
        directionId: battleLineDirectionId("direction:codec-gust"),
        trigger: "endsTurnInLine",
        save: { ability: "str", dc: { kind: "caster_spell_save_dc" } },
        pushDistanceFeet: 15,
      },
    ),
  ),
  successCase(
    "grantedAreaSaveDamageActionSave",
    saving(
      "grantedAreaSaveDamageActionSave",
      "grantedAreaSaveDamageAction",
      "dex",
      {
        targetId: skeletonId,
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        lengthFeet: 15,
      },
    ),
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
  successCase(
    "sourceProcedureRefWithMarkedRider",
    rolled("sourceProcedureRefWithMarkedRider", {
      critical: false,
      sourceProcedureRef: fixture.sourceProcedureRef,
      spellMarkedDamageRiders: [markedRider],
    }),
  ),
  successCase(
    "glyphExplosiveRuneDamage",
    rolled("glyphExplosiveRuneDamage", {
      critical: false,
      glyphExplosiveRune: {
        sourceCombatantId: wizardId,
        sourceProcedureRef: fixture.sourceProcedureRef,
        effectRef: fixture.glyphEffectRef,
        damage: { expr: { dice: 1, dieSize: 6 } },
      },
    }),
  ),
  successCase(
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
  successCase(
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
  successCase(
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
  successCase(
    "spellTurnStartDamage",
    rolled("spellTurnStartDamage", {
      spellTurnStartDamage: {
        ...source,
        effectRef: fixture.spellTurnStartEffectRef,
        trigger: { kind: "condition", condition: "poisoned" },
        damage,
      },
    }),
  ),
  successCase(
    "spellTurnEndDamage",
    rolled("spellTurnEndDamage", {
      spellTurnEndDamage: {
        ...source,
        effectRef: fixture.spellTurnEndEffectRef,
        damage,
      },
    }),
  ),
  successCase(
    "movableZone",
    rolled("movableZone", {
      critical: false,
      movableZone: {
        ...source,
        effectRef: fixture.movableZoneEffectRef,
        areaId: battleAreaId("area:codec-flaming-sphere"),
        trigger: "endsTurnWithinFiveFeetOfSphere",
        save: save("dex"),
      },
    }),
  ),
  successCase(
    "spikeGrowthMovement",
    rolled("spikeGrowthMovement", {
      critical: false,
      spikeGrowthMovement: {
        ...source,
        effectRef: fixture.spikeGrowthEffectRef,
        areaId: battleAreaId("area:codec-spike-growth"),
        distanceFeet: 10,
        damage: { expr: { dice: 1, dieSize: 4 }, damageType: "piercing" },
      },
    }),
  ),
  failureCase(
    "persistentAreaSaveDamage",
    rolled("persistentAreaSaveDamage", {
      critical: false,
      persistentAreaSaveDamage: {
        ...source,
        sourceProcedureRef: fixture.insectPlagueSourceProcedureRef,
        topology: "stationary",
        effectRef: fixture.persistentAreaSaveDamageEffectRef,
        areaId: battleAreaId("area:codec-insect-plague"),
        trigger: "entersArea",
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "piercing" },
      },
    }),
  ),
  failureCase(
    "persistentAreaSaveDamage",
    rolled("persistentAreaSaveDamage", {
      critical: false,
      persistentAreaSaveDamage: {
        ...source,
        sourceProcedureRef: fixture.cloudkillSourceProcedureRef,
        topology: "translating",
        effectRef: fixture.cloudkillEffectRef,
        areaId: battleAreaId("area:codec-cloudkill"),
        trigger: "entersArea",
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "poison" },
      },
    }),
  ),
  successCase(
    "grantedAreaSaveDamageActionDamage",
    rolled("grantedAreaSaveDamageActionDamage", {
      grantedAreaSaveDamageAction: {
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
  hole("temporaryAbilityCheckRollModeActiveEffectCount", {
    kind: "temporaryAbilityCheckRollModeActiveEffectCount",
    sourceProcedureRef: invalidSource,
    maximumActiveOneMinuteEffects: 3,
    requiresTableSpellEffectCount: true,
  }),
  hole("compelledBehaviorOptionChoice", {
    kind: "compelledBehaviorOptionChoice",
    sourceProcedureRef: invalidSource,
    choices: ["approach"],
  }),
  hole("spatialMeleeSpellAttackProxyPosition", {
    kind: "spatialMeleeSpellAttackProxyPosition",
    sourceProcedureRef: invalidSource,
    mode: "cast",
    maxDistanceFeet: 60,
    requiresTableSpatialFact: true,
  }),
  hole("directionalPersistentAreaDirectionChoice", {
    kind: "directionalPersistentAreaDirectionChoice",
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
  failureCase(
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
  failureCase(
    "saveGatedConditionRepeatSaveWrongOwner",
    saving(
      "saveGatedConditionRepeatSaveWrongOwner",
      "saveGatedConditionRepeatSave",
      "wis",
      {
        ...source,
        effectRef: fixture.effectRef,
        trigger: "damage",
        save: save("wis"),
      },
    ),
  ),
  ...sourceOwningHoleCases.map((replacement) =>
    failureCase(`${replacement.kind}UnboundSource`, replacement),
  ),
];

const canonicalPersistentAreaSaveDamageCases = [
  ...savingThrowCases,
  ...rolledDiceCases,
].filter(
  (entry) =>
    (entry.hole.kind === "savingThrowOutcome" ||
      entry.hole.kind === "rolledDice") &&
    "persistentAreaSaveDamage" in entry.hole,
);

function persistentAreaSaveDamageOwner(hole: EncodedHole) {
  if (
    (hole.kind === "savingThrowOutcome" || hole.kind === "rolledDice") &&
    "persistentAreaSaveDamage" in hole
  ) {
    return hole.persistentAreaSaveDamage;
  }
  return undefined;
}

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
  test("the exhaustive active-effect projection owns each snapshot location", () => {
    const projectionsByEffectRef = new Map(
      fixture.activeEffects.map((effect) => [
        String(effect.effectRef),
        battleActiveEffectOccurrenceSpatialProjection(effect),
      ]),
    );
    const observedSpatialClasses = new Set<string>();

    for (const occurrence of fixture.snapshot.combatants.flatMap(
      (combatant) => combatant.activeEffectOccurrences,
    )) {
      const projection = projectionsByEffectRef.get(
        String(occurrence.effectRef),
      );
      expect(projection).toBeDefined();
      expect(occurrence.location).toEqual(projection?.location);
      if (projection !== undefined) {
        observedSpatialClasses.add(projection.spatialClass);
      }
    }

    expect(observedSpatialClasses).toEqual(
      new Set(["nonSpatial", "area", "line", "object", "anchored"]),
    );

    const glyph = fixture.activeEffects.find(
      (effect) => effect.kind === "glyphDurableOccurrence",
    );
    if (glyph?.kind !== "glyphDurableOccurrence") {
      throw new Error("Expected the codec Glyph effect occurrence.");
    }
    expect(
      battleActiveEffectOccurrenceSpatialProjection({
        ...glyph,
        anchor: {
          kind: "closeableObject",
          objectId: battleObjectId("object:codec-glyph-anchor"),
        },
      }),
    ).toEqual({
      spatialClass: "anchored",
      location: {
        kind: "object",
        objectId: battleObjectId("object:codec-glyph-anchor"),
      },
    });
  });

  test.each([
    ["persistentAreaSaveCondition", { kind: "nonSpatial" }],
    [
      "directionalPersistentArea",
      { kind: "area", areaId: battleAreaId("area:codec-wrong-class") },
    ],
    ["glyphDurableOccurrence", { kind: "nonSpatial" }],
    [
      "controlledVerticalSuspension",
      { kind: "area", areaId: battleAreaId("area:codec-wrong-class") },
    ],
  ] as const)(
    "rejects %s when its structural occurrence uses another spatial class",
    (activeEffectKind, location) => {
      let replacementCount = 0;
      const snapshot: EncodedSnapshot = {
        ...fixture.snapshot,
        combatants: fixture.snapshot.combatants.map((combatant) => ({
          ...combatant,
          activeEffectOccurrences: combatant.activeEffectOccurrences.map(
            (occurrence) => {
              if (
                occurrence.activeEffectKind !== activeEffectKind ||
                replacementCount > 0
              ) {
                return occurrence;
              }
              replacementCount += 1;
              return {
                ...occurrence,
                location: location as EncodedOccurrenceLocation,
              };
            },
          ),
        })),
      };
      expect(replacementCount).toBe(1);
      expectSnapshotDecodeFailure(snapshot);
    },
  );

  test.each(cases)("$expected $name", ({ expected, hole: replacement }) => {
    const decoded = Schema.decodeUnknownResult(
      BattleCheckpointFrontierEnvelopeSchema,
    )(
      replaceActHole(fixture.envelope, fixture.sourceProcedureRef, replacement),
    );
    expect(
      Result.isSuccess(decoded),
      Result.isFailure(decoded) ? String(decoded.failure) : undefined,
    ).toBe(expected === "Success");
  });

  test.each(canonicalPersistentAreaSaveDamageCases)(
    "Success canonical $name full-envelope binding",
    ({ hole: replacement }) => {
      const owner = persistentAreaSaveDamageOwner(replacement);
      if (owner === undefined) {
        throw new Error("Expected a persistent-area save-damage codec owner.");
      }
      const sourceProcedureRef =
        owner.topology === "stationary"
          ? fixture.insectPlagueSourceProcedureRef
          : fixture.cloudkillSourceProcedureRef;
      const decoded = Schema.decodeUnknownResult(
        BattleCheckpointFrontierEnvelopeSchema,
      )(
        replaceCastActWithPersistentAreaSaveDamage(fixture.envelope, {
          sourceProcedureRef,
          targetId: skeletonId,
          effectRef: owner.effectRef,
          areaId: owner.areaId,
          hole: replacement,
        }),
      );
      expect(
        Result.isSuccess(decoded),
        Result.isFailure(decoded) ? String(decoded.failure) : undefined,
      ).toBe(true);
    },
  );

  test("accepts only the exact Cloudkill wind-strength hole pair", () => {
    if (fixture.envelope.frontier.kind !== "acts") {
      throw new Error("Expected the codec Acts frontier.");
    }
    const cloudkillAct = fixture.envelope.frontier.acts.find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "endPersistentAreaSaveDamageForEnvironment",
    );
    if (cloudkillAct === undefined) {
      throw new Error("Expected the Cloudkill dispersal act.");
    }
    expect(cloudkillAct.initialHoles).toHaveLength(1);
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        fixture.envelope,
      ),
    ).not.toThrow();
    expectEnvelopeDecodeFailure({
      ...fixture.envelope,
      frontier: {
        ...fixture.envelope.frontier,
        acts: fixture.envelope.frontier.acts.map((act) =>
          act === cloudkillAct
            ? {
                ...act,
                initialHoles: [...act.initialHoles, ...act.initialHoles],
              }
            : act,
        ),
      },
    });
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
      const envelope = replaceActHole(
        fixture.envelope,
        fixture.sourceProcedureRef,
        entry.hole,
      );
      const withoutOccurrence = {
        ...envelope,
        checkpoint: {
          ...envelope.checkpoint,
          combatants: envelope.checkpoint.combatants.map((combatant) => ({
            ...combatant,
            activeEffectOccurrences: combatant.activeEffectOccurrences.filter(
              (occurrence) => occurrence.effectRef !== effectRef,
            ),
          })),
        },
      };

      expectEnvelopeDecodeFailure(withoutOccurrence);
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
      expectEnvelopeDecodeFailure(
        replaceActHole(
          fixture.envelope,
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
    [
      "spellDamageReduction",
      rolledDiceCases[2],
      fixture.sourceDamageRollPenaltyEffectRef,
    ],
    [
      "sourceDamageRollPenalty",
      rolledDiceCases[3],
      fixture.spellDamageReductionEffectRef,
    ],
  ] as const)(
    "rejects %s when the same owner has the referenced occurrence under another subtype",
    (_, entry, effectRef) => {
      if (entry === undefined) {
        throw new Error("Expected the damage protocol codec case.");
      }
      expectEnvelopeDecodeFailure(
        replaceActHole(
          fixture.envelope,
          fixture.sourceProcedureRef,
          damageProtocolHoleWithEffectRef(entry, effectRef),
        ),
      );
    },
  );

  test.each([
    [
      "area",
      battleAreaId("area:codec-wrong-gust"),
      battleLineDirectionId("direction:codec-gust"),
    ],
    [
      "direction",
      battleAreaId("area:codec-gust"),
      battleLineDirectionId("direction:codec-wrong-gust"),
    ],
  ] as const)(
    "rejects a Gust occurrence ref with the wrong %s geometry",
    (_, areaId, directionId) => {
      const replacement = saving(
        "directionalPersistentAreaSaveWrongGeometry",
        "directionalPersistentArea",
        "str",
        {
          targetId: skeletonId,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          effectRef: fixture.gustOfWindEffectRef,
          areaId,
          directionId,
          trigger: "endsTurnInLine",
          save: { ability: "str", dc: { kind: "caster_spell_save_dc" } },
          pushDistanceFeet: 15,
        },
      );
      expectEnvelopeDecodeFailure(
        replaceActHole(
          fixture.envelope,
          fixture.sourceProcedureRef,
          replacement,
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
      expectEnvelopeDecodeFailure(
        replaceActHole(
          fixture.envelope,
          fixture.sourceProcedureRef,
          damageProtocolHoleWithEffectRef(entry, fixture.storedLightEmitterRef),
        ),
      );
    },
  );

  test("rejects a damage occurrence at the owner's allocation cursor", () => {
    const envelope = replaceActHole(
      fixture.envelope,
      fixture.sourceProcedureRef,
      rolledDiceCases[2]!.hole,
    );
    const invalidCursor = {
      ...envelope,
      checkpoint: {
        ...envelope.checkpoint,
        combatants: envelope.checkpoint.combatants.map((combatant) =>
          combatant.combatantId === skeletonId
            ? { ...combatant, nextEffectOrdinal: 0 }
            : combatant,
        ),
      },
    };

    expectEnvelopeDecodeFailure(invalidCursor);
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
              kind: "areaMovementDistanceDamage",
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
        directionalPersistentAreaMovement: {
          kind: "directionalPersistentAreaMovement",
          effectRef: fixture.gustOfWindEffectRef,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          areaId: battleAreaId("area:codec-gust"),
          directionId: battleLineDirectionId("direction:codec-gust"),
          totalDistanceFeet: 10,
          closerDistanceFeet: 5,
        },
        controlledVerticalSuspensionMovement: {
          kind: "controlledVerticalSuspensionMovement",
          effectRef: fixture.levitateEffectRef,
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          fixedObjectOrSurfaceWithinReach: true,
        },
      },
    });
    const altitudeChange = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "controlledVerticalSuspensionAltitudeChange",
      holeId: holeId("exact-levitate-altitude"),
      value: { direction: "up", distanceFeet: 10 },
      spatialFacts: [
        {
          kind: "controlledVerticalSuspensionTargetWithinRange",
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
              kind: "areaMovementDistanceDamage",
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
        directionalPersistentAreaMovement: {
          kind: "directionalPersistentAreaMovement",
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
        controlledVerticalSuspensionMovement: {
          kind: "controlledVerticalSuspensionMovement",
          sourceCombatantId: wizardId,
          sourceProcedureRef: fixture.sourceProcedureRef,
          fixedObjectOrSurfaceWithinReach: true,
        },
      },
    },
    {
      kind: "controlledVerticalSuspensionAltitudeChange",
      holeId: holeId("missing-levitate-spatial-occurrence"),
      value: { direction: "up", distanceFeet: 10 },
      spatialFacts: [
        {
          kind: "controlledVerticalSuspensionTargetWithinRange",
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
    const altitudeHole = hole("controlledVerticalSuspensionAltitudeChange", {
      kind: "controlledVerticalSuspensionAltitudeChange",
      effectRef: fixture.levitateEffectRef,
      actorId: wizardId,
      targetId: skeletonId,
      maxDistanceFeet: 20,
      directions: ["up", "down"],
      requiresTargetWithinRangeFact: true,
    });
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          replaceCastActWithLevitateAltitudeControl(fixture.envelope, {
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
      expectEnvelopeDecodeFailure(
        replaceCastActWithLevitateAltitudeControl(fixture.envelope, {
          sourceProcedureRef: fixture.sourceProcedureRef,
          subjectEffectRef: fixture.levitateEffectRef,
          altitudeHole: encodeHole({ ...altitudeHole, effectRef }),
        }),
      );
    }
    expectEnvelopeDecodeFailure(
      replaceCastActWithLevitateAltitudeControl(fixture.envelope, {
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
      kind: "magicSuppressionEmanation" as const,
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
    const envelope = replaceActHole(
      fixture.envelope,
      fixture.sourceProcedureRef,
      targetHole,
    );
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          envelope,
        ),
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
      expectEnvelopeDecodeFailure(
        replaceActHole(
          fixture.envelope,
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

    expectEnvelopeDecodeFailure({
      ...envelope,
      checkpoint: {
        ...envelope.checkpoint,
        combatants: envelope.checkpoint.combatants.map((combatant) => ({
          ...combatant,
          activeEffectOccurrences: combatant.activeEffectOccurrences.filter(
            (occurrence) =>
              occurrence.effectRef !== fixture.antimagicFieldEffectRef,
          ),
        })),
      },
    });
  });

  test("rejects a Hideous Laughter repeat-save hole without its occurrence ref", () => {
    const decoded = Schema.decodeUnknownResult(BattleHoleSchema)({
      ...baseHole("saveGatedConditionRepeatSaveMissingEffectRef"),
      kind: "savingThrowOutcome",
      damageOccurrence: { kind: "untrackedDamage" },
      saveGatedConditionRepeatSave: {
        ...source,
        trigger: "damage",
        save: save("wis"),
      },
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    });
    expect(Result.isFailure(decoded)).toBe(true);
  });

  test("rejects an empty interrupt decision choice frontier", () => {
    const decoded = Schema.decodeUnknownResult(
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
    expect(Result.isFailure(decoded)).toBe(true);
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
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          pendingEnvelope,
        ),
      ),
    ).toBe(true);
    if (pendingEnvelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected a pending interrupt-decision frontier.");
    }
    expectEnvelopeDecodeFailure({
      ...pendingEnvelope,
      frontier: {
        ...pendingEnvelope.frontier,
        decisionHole: {
          ...pendingEnvelope.frontier.decisionHole,
          trigger: "attackHit",
        },
      },
    });
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
      const decoded = Schema.decodeUnknownResult(
        BattleCheckpointFrontierEnvelopeSchema,
      )({
        ...pendingEnvelope,
        frontier: {
          ...pendingEnvelope.frontier,
          choices: [malformedChoice],
        },
      });
      expect(Result.isFailure(decoded)).toBe(true);
    }
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure({
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
    expectEnvelopeDecodeFailure(malformedTargetEnvelope);
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
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
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
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
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
    expectEnvelopeDecodeFailure(malformed);
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
    expectEnvelopeDecodeFailure(malformed);
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
    expectEnvelopeDecodeFailure(malformed);
  });
});
