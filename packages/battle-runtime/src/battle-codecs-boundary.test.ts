import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  BattleHoleSchema,
  BattleSnapshotSchema,
  battleId,
  characterSeed,
  skeletonCreatureInit,
  snapshotBattle,
  startBattleSessionRight,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  skeletonId,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleAreaId, battleSpellEffectOccurrenceId } from "./identity.ts";

type EncodedHole = Schema.Schema.Encoded<typeof BattleHoleSchema>;
type EncodedSnapshot = Schema.Schema.Encoded<typeof BattleSnapshotSchema>;
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
  const snapshot = Schema.encodeSync(BattleSnapshotSchema)(
    snapshotBattle(session.state),
  );
  const wizard = snapshot.combatants.find((c) => c.combatantId === wizardId);
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
    snapshot,
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
const save = (ability: "dex" | "wis" | "con") => ({
  ability,
  dc: { kind: "caster_spell_save_dc" },
});
const saving = (
  name: string,
  variant: string,
  ability: "dex" | "wis" | "con",
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
];

const invalidSource = battleProcedureExecutionRefForTest(
  "codec-unbound-source",
);
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
];

describe("battle codec execution-reference boundaries", () => {
  test.each(cases)("$expected $name", ({ expected, hole: replacement }) => {
    const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)(
      replaceActHole(fixture.snapshot, fixture.sourceProcedureRef, replacement),
    );
    expect(Either.isRight(decoded)).toBe(expected === "Right");
  });
});
