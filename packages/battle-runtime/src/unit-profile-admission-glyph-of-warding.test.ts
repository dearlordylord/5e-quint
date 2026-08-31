import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-EXPLOSIVE-RUNE-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-SPELL-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-SUMMON-OBJECT-PLACEMENT glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-REMAINING-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-AREA-ONGOING-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-AREA-CONTROL-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-SINGLE-CREATURE-ACTIVE-EFFECT-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-GLYPH-STORED-SELF-TRANSFORMATION-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-EXPLOSIVE-RUNE-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-SPELL-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-SUMMON-OBJECT-PLACEMENT glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-REMAINING-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-AREA-ONGOING-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-AREA-CONTROL-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-SINGLE-CREATURE-ACTIVE-EFFECT-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-SELF-TRANSFORMATION-CONCENTRATION glyph_of_warding
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE glyph_of_warding doReplayGlyphDurableOccurrence
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-EXPLOSIVE-RUNE-RELEASE glyph_of_warding doReplayGlyphExplosiveRuneRelease
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-SPELL-RELEASE glyph_of_warding doReplayGlyphStoredSpellRelease
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-CONCENTRATION glyph_of_warding doReplayGlyphStoredConcentration
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-SUMMON-OBJECT-PLACEMENT glyph_of_warding doReplayGlyphStoredSummonObjectPlacement
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-REMAINING-CONCENTRATION glyph_of_warding doReplayGlyphStoredRemainingConcentration
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-AREA-ONGOING-CONCENTRATION glyph_of_warding doReplayGlyphStoredAreaOngoingConcentration
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-AREA-CONTROL-CONCENTRATION glyph_of_warding doReplayGlyphStoredAreaControlConcentration
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-SINGLE-CREATURE-ACTIVE-EFFECT-CONCENTRATION glyph_of_warding doReplayGlyphStoredSingleCreatureActiveEffectConcentration
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-GLYPH-STORED-SELF-TRANSFORMATION-CONCENTRATION glyph_of_warding doReplayGlyphStoredSelfTransformationConcentration
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import type { RolledDiceGroup } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  Round,
  movementFeet,
  proficiencyBonus,
  resourceCount,
} from "@dnd/shared/types";
import type {
  DamageType,
  GlyphWardingMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  type AuthoredSelectedSpellInvocation,
  characterExecutionWithSpellInvocations,
  characterSpellProcedure,
  characterSpellProcedureRef,
  characterSpellProcedureRefs,
  characterStoredSpellProcedureRef,
  spellProcedureExecution,
} from "./character-execution-admission.ts";
import {
  addGlyphDurableOccurrence,
  endGlyphDurableOccurrence,
  glyphExplosiveRuneDamageRollHole,
  glyphExplosiveRuneSavingThrowOutcomeHole,
  glyphExplosiveRuneReleaseProfileForSpell,
  glyphDurableOccurrenceProfileForSpell,
  glyphStoredSpellReleaseProfileForSpell,
  glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection,
  releaseGlyphExplosiveRune,
  releaseGlyphStoredSpell,
  type CompletedGlyphInscriptionWitness,
  type GlyphDurableOccurrenceEndWitness,
  type GlyphDurableOccurrenceProfile,
  type GlyphDurableOccurrenceTemplate,
  type GlyphExplosiveRuneReleaseProfile,
  type GlyphStoredSpellReleaseProfile,
} from "./battle-reducer/glyph-durable-occurrence.ts";
import { glyphDurableOccurrenceEffectFromCompletedInscription } from "./glyph-durable-occurrence-admission.ts";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleSpellCastReactionFact,
  type GlyphStoredSpellInvocationCandidate,
} from "./battle-state-execution.ts";
import type { BattleCreatureInit } from "./battle-init.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES,
  type GlyphStoredSingleCreatureActiveEffectProcedure,
} from "./glyph-stored-spell-invocation.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "./battle-reducer/spells-effective-level.ts";
import {
  alterSelfUnitId,
  barbarianDangerSenseUnitId,
  blindnessDeafnessUnitId,
  spellCastInterruptionReactionUnitId,
  darknessUnitId,
  blessUnitId,
  dissonantWhispersUnitId,
  enlargeReduceUnitId,
  fireballUnitId,
  flamingSphereUnitId,
  greaseAreaId,
  greaseUnitId,
  gustOfWindUnitId,
  holdPersonDurationTicks,
  guidingBoltUnitId,
  glyphOfWardingUnitId,
  holdPersonUnitId,
  hasteUnitId,
  heroismUnitId,
  saveGatedAreaControlDurationTicks,
  saveGatedAreaControlUnitId,
  saveGatedConditionWithRepeatUnitId,
  iceKnifeUnitId,
  invisibilityUnitId,
  levitateUnitId,
  mindSpikeUnitId,
  moonbeamUnitId,
  orcRelentlessEnduranceUnitId,
  protectionFromEvilAndGoodUnitId,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellTargetId,
  shieldOfFaithUnitId,
  spiritualWeaponUnitId,
  spikeGrowthUnitId,
  thunderwaveSecondTargetId,
  thunderwaveUnitId,
  unitLibrary,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";
import {
  attackRollFill,
  interruptDecisionFill,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  spellAct,
  flamingSphereAreaFill,
  greaseSavingThrowOutcomeFill,
  directionalPersistentAreaSavingThrowOutcomeFill,
  moonbeamAreaFill,
  savingThrowOutcomeFill,
  spellTargetListFill,
  spikeGrowthAreaFill,
  spatialMeleeSpellAttackProxyTargetFill,
  spatialMeleeSpellAttackProxyPositionFill,
  selfOriginCubePushArea,
  webAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  battleD20TestNaturalOneRerollSupportForUnit,
  battlePassiveSavingThrowRollModeSupportForUnit,
  breakBattleConcentration,
  discoverBattleActCandidates,
  endTurn,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleObjectIgnitionDisposition,
  type BattleRuntimeSession,
  type BattleSpellAreaOriginAnchor,
  type BattleState,
  type BattleTargetSpatialFact,
  type CombatantId,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  hasCondition,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
  spellSaveDcForCaster,
} from "./unit-profile-admission.test-support.ts";
import {
  battleSpellEffectOccurrenceId,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
} from "./identity.ts";
import {
  battleProcedureExecutionRefForSpellHoleForTest,
  battleEffectExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  battleFrontierInterruptDecisionForState,
  combatantId,
  battleProcedureExecutionRefForTest,
  characterBattleFeatureInitForTest,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

const executionRegistry = spellProcedureExecutionRegistry();

type StoredGlyphDurableOccurrenceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "glyphDurableOccurrence" }
>;
type TestSpellSlotLevel = NonNullable<
  Parameters<typeof spellBattle>[0]["spellSlots"]
>[number]["spellLevel"];
type StoredSpellInvocationCaster = Pick<
  Parameters<typeof spellBattle>[0],
  | "casterClassLevels"
  | "casterD20Statistics"
  | "casterProficiencyBonus"
  | "spellSlots"
>;
type NonEmptyDamageDice = readonly [number, ...ReadonlyArray<number>];
const glyphSourceEffectId = battleSpellEffectOccurrenceId(
  "glyph:durable-occurrence:test-effect",
);
const glyphProcedureRef = battleProcedureExecutionRefForTest(
  "completed-glyph-inscription",
);
const glyphCoveredAreaId = battleAreaId("glyph-covered-area");
const glyphSurfaceAnchorAreaId = battleAreaId("glyph-surface-anchor");
const glyphCloseableObjectId = battleObjectId("glyph-closeable-object");
const glyphCastLocationId = battleTablePositionId("glyph-cast-location");
const glyphHarmfulObjectPositionId = battleTablePositionId(
  "glyph-harmful-object-position",
);
const spatialMeleeSpellAttackProxyRelationshipSourceId = combatantId(
  "spiritual-weapon-relationship-source",
);
const fogCloudUnitId = "fog_cloud";
const glyphStoredFogCloudAreaId = battleAreaId("glyph-stored-fog-cloud-area");
const glyphStoredDarknessAreaId = battleAreaId("glyph-stored-darkness-area");
const glyphStoredFlamingSphereAreaId = battleAreaId(
  "glyph-stored-flaming-sphere-area",
);
const glyphStoredSpikeGrowthAreaId = battleAreaId(
  "glyph-stored-spike-growth-area",
);
const glyphStoredMoonbeamAreaId = battleAreaId(
  "glyph-stored-persistentAreaSaveDamage-area",
);
const glyphStoredWebAreaId = battleAreaId("glyph-stored-web-area");
const glyphStoredGustOfWindAreaId = battleAreaId(
  "glyph-stored-gust-of-wind-area",
);
const glyphStoredAreaOriginAnchor = {
  kind: "combatant",
  combatantId: spellTargetId,
} as const satisfies BattleSpellAreaOriginAnchor;
const glyphStoredWrongAreaOriginAnchor = {
  kind: "combatant",
  combatantId: spellCasterId,
} as const satisfies BattleSpellAreaOriginAnchor;
const glyphStoredUnanchoredAreaOrigin = {
  kind: "tableSelectedPoint",
} as const satisfies BattleSpellAreaOriginAnchor;
const bardFiveGlyphCaster = {
  casterClassLevels: [{ className: "bard", level: 5 }],
  casterD20Statistics: testCharacterD20Statistics({ cha: 16 }),
  casterProficiencyBonus: proficiencyBonus(3),
  spellSlots: [
    { spellLevel: 1, count: 4 },
    { spellLevel: 2, count: 3 },
    { spellLevel: 3, count: 2 },
  ],
} as const satisfies StoredSpellInvocationCaster;

type GlyphStoredAreaOngoingReleaseCase = {
  readonly label: string;
  readonly spellId: string;
  readonly slotLevel: TestSpellSlotLevel;
  readonly procedure: GlyphStoredSpellInvocationCandidate["procedure"];
  readonly effectKind: BattleActiveEffect["kind"];
  readonly areaId: ReturnType<typeof battleAreaId>;
  readonly fillsFromHoles: (
    holes: readonly BattleHole[],
    originAnchor?: BattleSpellAreaOriginAnchor,
  ) => readonly BattleFill[];
};
const GLYPH_STORED_AREA_ONGOING_RELEASE_CASES = [
  {
    label: "Fog Cloud",
    spellId: fogCloudUnitId,
    slotLevel: 1,
    procedure: "persistentAreaTrait",
    effectKind: "persistentAreaTrait",
    areaId: glyphStoredFogCloudAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      glyphStoredAreaChoiceFill(requireReleaseHole(holes, "spellAreaChoice"), {
        kind: "persistentAreaTraitArea",
        areaId: glyphStoredFogCloudAreaId,
        originAnchor,
      }),
    ],
  },
  {
    label: "Darkness",
    spellId: darknessUnitId,
    slotLevel: 2,
    procedure: "magicalDarknessPointOrigin",
    effectKind: "magicalDarknessPointOrigin",
    areaId: glyphStoredDarknessAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      glyphStoredAreaChoiceFill(requireReleaseHole(holes, "spellAreaChoice"), {
        kind: "magicalDarknessArea",
        areaId: glyphStoredDarknessAreaId,
        originAnchor,
        spellCreatedLightOverlaps: [],
      }),
    ],
  },
  {
    label: "Flaming Sphere",
    spellId: flamingSphereUnitId,
    slotLevel: 2,
    procedure: "persistentAreaSaveDamage",
    effectKind: "persistentAreaSaveDamage",
    areaId: glyphStoredFlamingSphereAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      flamingSphereAreaFill(
        requireReleaseHole(holes, "spellAreaChoice"),
        glyphStoredFlamingSphereAreaId,
        originAnchor,
      ),
    ],
  },
  {
    label: "Spike Growth",
    spellId: spikeGrowthUnitId,
    slotLevel: 2,
    procedure: "areaMovementDistanceDamage",
    effectKind: "areaMovementDistanceDamage",
    areaId: glyphStoredSpikeGrowthAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      spikeGrowthAreaFill(
        requireReleaseHole(holes, "spellAreaChoice"),
        glyphStoredSpikeGrowthAreaId,
        originAnchor,
      ),
    ],
  },
  {
    label: "Moonbeam",
    spellId: moonbeamUnitId,
    slotLevel: 2,
    procedure: "persistentAreaSaveDamage",
    effectKind: "persistentAreaSaveDamage",
    areaId: glyphStoredMoonbeamAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      moonbeamAreaFill(
        requireReleaseHole(holes, "spellAreaChoice"),
        glyphStoredMoonbeamAreaId,
        originAnchor,
      ),
    ],
  },
  {
    label: "Web",
    spellId: webUnitId,
    slotLevel: 2,
    procedure: "persistentAreaSaveConditionEscape",
    effectKind: "persistentAreaSaveConditionEscape",
    areaId: glyphStoredWebAreaId,
    fillsFromHoles: (holes, originAnchor = glyphStoredAreaOriginAnchor) => [
      webAreaFill(
        requireReleaseHole(holes, "spellAreaChoice"),
        glyphStoredWebAreaId,
        originAnchor,
      ),
    ],
  },
  {
    label: "Gust of Wind",
    spellId: gustOfWindUnitId,
    slotLevel: 2,
    procedure: "directionalPersistentArea",
    effectKind: "directionalPersistentArea",
    areaId: glyphStoredGustOfWindAreaId,
    fillsFromHoles: (holes) => [
      gustOfWindGlyphSavingThrowOutcomeFill(
        requireReleaseHole(holes, "savingThrowOutcome"),
      ),
    ],
  },
] as const satisfies ReadonlyArray<GlyphStoredAreaOngoingReleaseCase>;
const GLYPH_STORED_SPELL_AREA_CHOICE_RELEASE_CASES =
  GLYPH_STORED_AREA_ONGOING_RELEASE_CASES.filter(
    (releaseCase) => releaseCase.procedure !== "directionalPersistentArea",
  );

type GlyphStoredSingleCreatureActiveEffectReleaseCase = {
  readonly label: string;
  readonly spellId: string;
  readonly slotLevel: TestSpellSlotLevel;
  readonly procedure: GlyphStoredSingleCreatureActiveEffectProcedure;
  readonly effectKinds: readonly BattleActiveEffect["kind"][];
  readonly targetFacts: (
    sourceProcedureRef: BattleProcedureExecutionRef,
  ) => readonly BattleTargetSpatialFact[];
  readonly fillsFromHoles?: (
    holes: readonly BattleHole[],
  ) => readonly BattleFill[];
};
const GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_RELEASE_CASES: ReadonlyArray<GlyphStoredSingleCreatureActiveEffectReleaseCase> =
  [
    {
      label: "Shield of Faith scalar Armor Class bonus",
      spellId: shieldOfFaithUnitId,
      slotLevel: 1,
      procedure: "scalarBuff",
      effectKinds: ["spellArmorClassBonus"],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
    },
    {
      label: "Enlarge creature size increase",
      spellId: enlargeReduceUnitId,
      slotLevel: 2,
      procedure: "creatureSizeIncrease",
      effectKinds: ["spellCreatureSizeChange"],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
    },
    {
      label: "Levitate creature",
      spellId: levitateUnitId,
      slotLevel: 2,
      procedure: "controlledVerticalSuspension",
      effectKinds: ["controlledVerticalSuspension"],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
      fillsFromHoles: (holes) => [
        controlledVerticalSuspensionInitialRiseFill(
          requireReleaseHole(holes, "controlledVerticalSuspensionInitialRise"),
        ),
      ],
    },
    {
      label: "Invisibility direct condition",
      spellId: invisibilityUnitId,
      slotLevel: 2,
      procedure: "directCondition",
      effectKinds: ["targetActionEndedSpellCondition"],
      targetFacts: (sourceProcedureRef) =>
        storedSingleCreatureSpellTargetFacts(spellTargetId, sourceProcedureRef),
    },
    {
      label: "Haste positive effects",
      spellId: hasteUnitId,
      slotLevel: 3,
      procedure: "compositeTargetBuffWithAftermath",
      effectKinds: [
        "speedRatio",
        "spellArmorClassBonus",
        "savingThrowRollMode",
        "spellGrantedActionResource",
        "spellEndTargetState",
      ],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
    },
    {
      label: "Protection from Evil and Good creature-type protection",
      spellId: protectionFromEvilAndGoodUnitId,
      slotLevel: 1,
      procedure: "creatureTypeProtection",
      effectKinds: ["creatureTypeProtection"],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
    },
    {
      label: "Heroism condition immunity and turn-start Temporary Hit Points",
      spellId: heroismUnitId,
      slotLevel: 1,
      procedure: "conditionImmunityAndTurnStartTemporaryHitPoints",
      effectKinds: ["conditionImmunity", "turnStartTemporaryHitPoints"],
      targetFacts: storedKnownWillingSingleCreatureSpellTargetFacts,
    },
  ];

describe("SRD Glyph of Warding durable occurrence admission", () => {
  test("rejects an unsupported Glyph Surface level", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const mechanics = requireGlyphMechanics(glyph);
    const unsupportedDurable = decodeSpellRecordForTest({
      ...glyph,
      mechanics: {
        ...mechanics,
        level: 4,
      },
    });
    expect(
      glyphDurableOccurrenceProfileForSpell(unsupportedDurable),
    ).toBeNull();
  });

  test("rejects projected-out stored spells", () => {
    const profile = requireGlyphProfile();
    const storedInvocation = storedSpellInvocation(guidingBoltUnitId, 1);
    const witness = completedGlyphInscriptionWitness({
      anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      release: { kind: "spellGlyph", storedInvocation },
    });
    expect(
      glyphDurableOccurrenceEffectFromCompletedInscriptionWithProjection({
        profile,
        witness,
        projectStoredInvocation: () => undefined,
      }),
    ).toEqual({
      tag: "storedSpellProcedureUnsupported",
      storedInvocation,
    });
  });

  test("admits the durable occurrence profile by Surface shape, not authored identity", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const profile = glyphDurableOccurrenceProfileForSpell(glyph);
    const release = requireGlyphExplosiveRuneProfile();
    const synthetic = {
      ...glyph,
      id: parseSharedUnitId("synthetic_completed_mark"),
      name: "Synthetic Completed Mark",
    } satisfies SpellRecord;

    expect(profile).toEqual({
      kind: "glyphDurableOccurrenceProfile",
      minimumSpellLevel: testBattleSpellEffectLevel(3),
      creationBoundary: {
        kind: "completedOneHourInscription",
        castingHours: 1,
      },
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
      release: {
        explosiveRune: release,
        spellGlyph: requireGlyphStoredSpellProfile(),
      },
    });
    expect(glyphDurableOccurrenceProfileForSpell(synthetic)).toEqual(profile);
  });

  test("admits the explosive-rune release profile by Surface shape, not authored identity", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const profile = glyphExplosiveRuneReleaseProfileForSpell(glyph);
    const synthetic = {
      ...glyph,
      id: parseSharedUnitId("synthetic_delayed_burst_mark"),
      name: "Synthetic Delayed Burst Mark",
    } satisfies SpellRecord;
    const glyphMechanics = requireGlyphMechanics(glyph);
    const renamedDamageTypeHole = {
      ...synthetic,
      mechanics: {
        ...glyphMechanics,
        release: {
          ...glyphMechanics.release,
          explosiveRune: {
            ...glyphMechanics.release.explosiveRune,
            damage: {
              ...glyphMechanics.release.explosiveRune.damage,
              damageType: {
                ...glyphMechanics.release.explosiveRune.damage.damageType,
                holeId: "synthetic_delayed_burst_damage_type",
              },
            },
          },
        },
      },
    } satisfies SpellRecord;

    expect(profile).toEqual({
      kind: "glyphExplosiveRuneReleaseProfile",
      area: {
        kind: "sphere",
        radiusFeet: movementFeet(20),
        origin: "glyph",
        membership: "table_witnessed_area_membership",
      },
      save: {
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        successDamage: "half",
      },
      damage: {
        damageTypes: ["acid", "cold", "fire", "lightning", "thunder"],
        dice: {
          baseDice: 5,
          dieSize: 8,
          perSlotAboveBaseDice: 1,
          baseLevel: 3,
        },
      },
    });
    expect(glyphExplosiveRuneReleaseProfileForSpell(synthetic)).toEqual(
      profile,
    );
    expect(
      glyphExplosiveRuneReleaseProfileForSpell(renamedDamageTypeHole),
    ).toEqual(profile);
    expect(
      glyphDurableOccurrenceProfileForSpell(renamedDamageTypeHole)?.release,
    ).toEqual({
      explosiveRune: profile,
      spellGlyph: requireGlyphStoredSpellProfile(),
    });
    expect(
      glyphDurableOccurrenceProfileForSpell(renamedDamageTypeHole)?.release
        .explosiveRune,
    ).toEqual(profile);
  });

  test("admits the stored-spell release profile by Surface shape, not authored identity", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const profile = glyphStoredSpellReleaseProfileForSpell(glyph);
    const synthetic = {
      ...glyph,
      id: parseSharedUnitId("synthetic_delayed_spell_mark"),
      name: "Synthetic Delayed Spell Mark",
    } satisfies SpellRecord;
    expect(profile).toEqual({
      kind: "glyphStoredSpellReleaseProfile",
      storage: {
        spellAccess: "prepared_spell",
        castAsPartOfCreatingGlyph: true,
        immediateEffect: "none",
        baseMaxStoredSpellLevel: 3,
        upcastMaxStoredSpellLevel: "same_as_cast_slot_level",
        targetShapes: ["singleCreature", "area"],
      },
      release: {
        when: "glyph_triggered",
        retargeting: {
          singleCreatureSpellTarget: "triggering_creature",
          areaSpellOrigin: "centered_on_triggering_creature",
        },
        hostilePlacement: {
          appliesTo: ["summoned_hostile_creatures", "harmful_objects", "traps"],
          placement: "as_close_as_possible_to_triggering_creature",
          attackTarget: "triggering_creature",
        },
        concentration: {
          ifStoredSpellRequiresConcentration: "lasts_full_duration",
          owner: "duration",
        },
      },
    });
    expect(glyphStoredSpellReleaseProfileForSpell(synthetic)).toEqual(profile);
  });

  test("creates and adds a durable occurrence only from a completed inscription witness", () => {
    const profile = requireGlyphProfile();
    const state = glyphBattle();
    const created = glyphDurableOccurrenceEffectFromCompletedInscription({
      profile,
      witness: completedGlyphInscriptionWitness({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
    });
    expect(created.tag).toBe("created");
    if (created.tag !== "created") return;
    const effect = created.effect;
    const added = addGlyphDurableOccurrence({ state, effect });

    expect(effect).toEqual({
      kind: "glyphDurableOccurrence",
      sourceProcedureRef: glyphProcedureRef,
      sourceCombatantId: spellCasterId,
      sourceEffectId: glyphSourceEffectId,
      sourceSpellLevel: testBattleSpellEffectLevel(3),
      release: { kind: "explosiveRune", damageType: "thunder" },
      anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      coveredAreaId: glyphCoveredAreaId,
      castLocationId: glyphCastLocationId,
      maxCoveredDiameterFeet: movementFeet(10),
      notice: profile.notice,
      trigger: profile.trigger,
      movementInvalidation: profile.movementInvalidation,
      expiresAt: { kind: "untilDispelled" },
    });
    expect(added.tag).toBe("added");
    if (added.tag !== "added") return;
    expect("effectRef" in effect).toBe(false);
    expect(added.effect.effectRef).toBeDefined();
    expect(glyphEffects(added.state)).toEqual([added.effect]);
    expect(
      Number(added.state.combatants.get(spellCasterId)?.nextEffectOrdinal),
    ).toBe(Number(state.combatants.get(spellCasterId)?.nextEffectOrdinal) + 1);
    expect(
      addGlyphDurableOccurrence({ state: added.state, effect }),
    ).toMatchObject({
      tag: "duplicateOccurrence",
      sourceEffectId: glyphSourceEffectId,
    });
    expect(
      addGlyphDurableOccurrence({
        state: stateWithoutCaster(state),
        effect,
      }),
    ).toMatchObject({
      tag: "sourceCombatantNotFound",
      sourceCombatantId: spellCasterId,
    });
  });

  test("reports stale release and end witnesses after their occurrence is absent", () => {
    const state = glyphBattle();
    const staleEffectRef = battleEffectExecutionRefForTest(
      "missing-glyph-occurrence",
    );
    const explosiveRuneProfile = requireGlyphExplosiveRuneProfile();

    expect(
      releaseGlyphExplosiveRune({
        state,
        profile: explosiveRuneProfile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(staleEffectRef),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            kind: "noCreaturesInArea",
            affectedTargetIds: [],
          },
        },
      }),
    ).toMatchObject({
      tag: "notFound",
      sourceEffectId: glyphSourceEffectId,
    });
    expect(
      releaseGlyphStoredSpell({
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(staleEffectRef, []),
        executionRegistry,
      }),
    ).toMatchObject({
      tag: "notFound",
      sourceEffectId: glyphSourceEffectId,
    });
    expect(
      endGlyphDurableOccurrence({
        state,
        witness: glyphTriggerOccurrenceWitness(staleEffectRef),
      }),
    ).toMatchObject({
      tag: "notFound",
      sourceEffectId: glyphSourceEffectId,
    });
  });

  test("stores a prepared spell invocation without applying an immediate effect", () => {
    const storedInvocation = storedSpellInvocation(guidingBoltUnitId, 1);
    const state = glyphBattle({ targetHp: 50, targetMaxHp: 50 });
    const created = glyphDurableOccurrenceEffectFromCompletedInscription({
      profile: requireGlyphProfile(),
      witness: completedGlyphInscriptionWitness({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
    });

    expect(created.tag).toBe("created");
    if (created.tag !== "created") return;
    expect(created.effect.release).toEqual({
      kind: "spellGlyph",
      executionKind: "ordinaryTriggeringCreature",
      storedProcedure: spellProcedureExecution(storedInvocation),
    });
    const added = addGlyphDurableOccurrence({ state, effect: created.effect });

    expect(added.tag).toBe("added");
    if (added.tag !== "added") return;
    expect(Number(added.state.combatants.get(spellTargetId)?.hp)).toBe(50);
  });

  test("restores an unavailable spell procedure with its original ref", () => {
    const invocation = storedSpellInvocation(guidingBoltUnitId, 1);
    const state = glyphBattle({
      preparedSpells: [spellRecord(guidingBoltUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const caster = requireCombatant(state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected character spell caster.");
    }
    const originalRef = characterSpellProcedureRef(
      caster.origin.execution,
      invocation,
    );
    if (originalRef === undefined) {
      throw new Error("Expected original spell procedure binding.");
    }

    const unavailable = characterExecutionWithSpellInvocations(
      caster.origin.execution,
      [],
    );
    expect(characterSpellProcedure(unavailable, originalRef)).toBeUndefined();
    expect(characterExecutionWithSpellInvocations(unavailable, [])).toBe(
      unavailable,
    );

    const staleSelected = characterExecutionWithSpellInvocations(unavailable, [
      {
        ...invocation,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "stale-selected-spell-procedure",
        ),
      },
    ]);
    expect(characterSpellProcedure(staleSelected, originalRef)).toBeUndefined();

    const reappeared = characterExecutionWithSpellInvocations(staleSelected, [
      invocation,
    ]);
    const restoredRef = characterSpellProcedureRef(reappeared, invocation);
    expect(restoredRef).toBe(originalRef);
    expect(characterSpellProcedure(reappeared, originalRef)).toMatchObject({
      procedure: invocation.procedure,
    });
    expect(characterStoredSpellProcedureRef(reappeared, invocation)).toBe(
      originalRef,
    );
  });

  test("preserves distinct refs for mechanically identical spell occurrences", () => {
    const firstInvocation = storedSpellInvocation(guidingBoltUnitId, 1);
    const secondInvocation = firstInvocation;
    const guidingBolt = spellRecord(guidingBoltUnitId);
    const state = glyphBattle({
      preparedSpells: [guidingBolt],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const caster = requireCombatant(state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected character spell caster.");
    }
    const duplicated = characterExecutionWithSpellInvocations(
      caster.origin.execution,
      [firstInvocation, secondInvocation],
    );
    const originalRefs = characterSpellProcedureRefs(duplicated, [
      firstInvocation,
      secondInvocation,
    ]).filter((ref) => ref !== undefined);
    const storedBindings = JSON.stringify(duplicated.procedureBindings);
    expect(storedBindings).not.toContain(guidingBolt.name);
    expect(storedBindings).not.toContain(guidingBolt.provenance.section);
    expect(originalRefs).toHaveLength(2);
    expect(new Set(originalRefs).size).toBe(2);
    const [firstRef, secondRef] = originalRefs;
    if (firstRef === undefined || secondRef === undefined) {
      throw new Error("Expected two distinct spell procedure refs.");
    }

    const selectedFirst = { ...firstInvocation, sourceProcedureRef: firstRef };
    const selectedSecond = {
      ...secondInvocation,
      sourceProcedureRef: secondRef,
    };
    const duplicateSelectedRef = characterExecutionWithSpellInvocations(
      duplicated,
      [selectedFirst, selectedFirst],
    );
    expect(duplicateSelectedRef.procedureBindings).toHaveLength(
      duplicated.procedureBindings.length,
    );
    expect(
      characterSpellProcedure(duplicateSelectedRef, firstRef),
    ).toBeDefined();
    expect(
      characterSpellProcedure(duplicateSelectedRef, secondRef),
    ).toBeUndefined();

    const oneRemaining = characterExecutionWithSpellInvocations(duplicated, [
      selectedSecond,
    ]);
    expect(
      characterSpellProcedureRefs(oneRemaining, [secondInvocation]),
    ).toEqual([secondRef]);

    const restored = characterExecutionWithSpellInvocations(oneRemaining, [
      selectedFirst,
      selectedSecond,
    ]);
    expect(
      characterSpellProcedureRefs(restored, [
        firstInvocation,
        secondInvocation,
      ]),
    ).toEqual(originalRefs);
  });

  test("rejects a completed inscription witness below the admitted minimum spell level", () => {
    const profile = requireGlyphProfile();

    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile,
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          sourceSpellLevel: testBattleSpellEffectLevel(2),
        }),
      }),
    ).toEqual({
      tag: "sourceSpellLevelBelowMinimum",
      sourceSpellLevel: testBattleSpellEffectLevel(2),
      minimumSpellLevel: profile.minimumSpellLevel,
    });
    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile,
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "explosiveRune", damageType: "force" },
        }),
      }),
    ).toEqual({
      tag: "unsupportedExplosiveRuneDamageType",
      damageType: "force",
      supportedDamageTypes: ["acid", "cold", "fire", "lightning", "thunder"],
    });
    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile,
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          sourceSpellLevel: testBattleSpellEffectLevel(3),
          release: {
            kind: "spellGlyph",
            storedInvocation: storedSpellInvocation(fireballUnitId, 4),
          },
        }),
      }),
    ).toMatchObject({
      tag: "storedSpellLevelAboveGlyphSlot",
      storedSpellLevel: testBattleSpellEffectLevel(3),
      sourceSpellLevel: testBattleSpellEffectLevel(3),
    });
  });

  test("does not discover the one-hour creation as a Magic Action spell invocation", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(glyphOfWardingUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });

    expect(
      maybeSpellAct({
        session: state,
        spellId: glyphOfWardingUnitId,
        slotLevel: 3,
      }),
    ).toBeUndefined();
  });

  test("table-witnessed trigger occurrence cannot bypass explosive-rune release", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
    );
    const ended = endGlyphDurableOccurrence({
      state,
      witness: {
        kind: "tableWitnessedGlyphTriggerOccurrence",
        effectRef: glyphEffectRef(state),
        sourceEffectId: glyphSourceEffectId,
      },
    });

    expect(ended).toMatchObject({
      tag: "invalidWitness",
      reason: "releaseRequired",
    });
    expect(glyphEffects(ended.state)).toEqual(glyphEffects(state));
  });

  test("table-witnessed trigger occurrence cannot bypass stored-spell release", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: {
          kind: "spellGlyph",
          storedInvocation: storedSpellInvocation(guidingBoltUnitId, 1),
        },
      }),
    );
    const ended = endGlyphDurableOccurrence({
      state,
      witness: {
        kind: "tableWitnessedGlyphTriggerOccurrence",
        effectRef: glyphEffectRef(state),
        sourceEffectId: glyphSourceEffectId,
      },
    });

    expect(ended).toMatchObject({
      tag: "invalidWitness",
      reason: "releaseRequired",
    });
    expect(glyphEffects(ended.state)).toEqual(glyphEffects(state));
  });

  test("stored single-creature release retargets the triggering creature and cleans up the glyph", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: {
          kind: "spellGlyph",
          storedInvocation: storedSpellInvocation(guidingBoltUnitId, 1),
        },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(guidingBoltUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
        targetHp: 50,
        targetMaxHp: 50,
      }),
    );
    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [],
          spellCasterId,
        ),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "triggerCreatureTargetMismatch",
    });
    const needsAttackRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        [],
      ),
    });

    expect(needsAttackRoll.tag).toBe("needsHoles");
    if (needsAttackRoll.tag !== "needsHoles") return;
    const attackRoll = requireReleaseHole(needsAttackRoll.holes, "attackRoll");
    expect("spell" in attackRoll).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(attackRoll),
    ).toBeDefined();
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [attackRollFill(attackRoll, { total: 18, naturalD20: 12 })],
        spellTargetId,
        [],
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          glyphDamageRollFill(damageRoll, [[4, 4, 4, 4]]),
        ],
        spellTargetId,
        [],
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(34);
    const caster = requireCombatant(released.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") return;
    expect(
      caster.origin.spellcasting?.spellSlots.find(
        (slot) => slot.spellLevel === 1,
      )?.expended,
    ).toBe(0);
  });

  test("stored Ice Knife keeps its attack roll before the trigger-creature burst", () => {
    const storedInvocation = storedSpellInvocation(
      iceKnifeUnitId,
      2,
      "attackBurstSaveDamage",
    );
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(iceKnifeUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        targetHp: 20,
        targetMaxHp: 20,
      }),
    );
    const initialWitness = storedSingleCreatureReleaseWitness(
      glyphEffectRef(state),
      [],
      spellTargetId,
      [],
    );
    const needsAttack = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: initialWitness,
    });
    const attack = requireReleaseHole(
      expectNeedsReleaseHoles(needsAttack),
      "attackRoll",
    );
    const attackFill = attackRollFill(attack, {
      total: 6,
      naturalD20: 1,
    });
    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: { ...initialWitness, fills: [attackFill] },
    });
    const save = requireReleaseHole(
      expectNeedsReleaseHoles(needsSave),
      "savingThrowOutcome",
    );
    const saveFill = {
      kind: "savingThrowOutcome" as const,
      holeId: save.holeId,
      value: {
        area: {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellTargetId],
        },
        outcomes: [{ targetId: spellTargetId, succeeded: false }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const needsBurstDamage = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: { ...initialWitness, fills: [attackFill, saveFill] },
    });
    const burstDamage = requireReleaseHole(
      expectNeedsReleaseHoles(needsBurstDamage),
      "rolledDice",
    );
    expect(burstDamage).toMatchObject({
      label: "Spell burst damage (3d6-cold)",
    });
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: {
        ...initialWitness,
        fills: [
          attackFill,
          saveFill,
          glyphDamageRollFill(burstDamage, [[2, 2, 2]]),
        ],
      },
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(14);
    const caster = requireCombatant(released.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") return;
    expect(
      caster.origin.spellcasting?.spellSlots.find(
        (slot) => slot.spellLevel === 2,
      )?.expended,
    ).toBe(0);
  });

  test("stored spell glyph release retains its original ref after that procedure becomes unavailable", () => {
    const storedInvocation = storedSpellInvocation(guidingBoltUnitId, 1);
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(guidingBoltUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
    );
    const caster = requireCombatant(state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected character spell caster.");
    }
    const originalRef = characterSpellProcedureRef(
      caster.origin.execution,
      storedInvocation,
    );
    if (originalRef === undefined) {
      throw new Error("Expected stored spell procedure binding.");
    }
    const unavailableExecution = characterExecutionWithSpellInvocations(
      caster.origin.execution,
      [],
    );
    const unavailableState = {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...caster,
        origin: { ...caster.origin, execution: unavailableExecution },
      }),
    };

    expect(
      characterStoredSpellProcedureRef(unavailableExecution, storedInvocation),
    ).toBe(originalRef);

    const release = releaseGlyphStoredSpell({
      executionRegistry,
      state: unavailableState,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        [],
      ),
    });

    expect(release.tag).toBe("needsHoles");
    if (release.tag !== "needsHoles") return;
    expect(
      characterSpellProcedure(unavailableExecution, originalRef),
    ).toBeUndefined();
  });

  test("stored single-creature Concentration release survives a save-failed interrupt for its full duration", () => {
    const storedInvocation = storedSpellInvocation(holdPersonUnitId, 2);
    const session = glyphBattleSession({
      preparedSpells: [
        spellRecord(holdPersonUnitId),
        spellRecord(guidingBoltUnitId),
      ],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const state = stateWithUnrelatedReadiedSpell(
      battleRuntimeSessionForTest({
        state: stateWithGlyphEffect(
          requireCompletedGlyphEffect({
            anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
            release: { kind: "spellGlyph", storedInvocation },
          }),
          session.state,
        ),
        context: session.context,
      }),
      "saveFailed",
    ).state;
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell" as const,
    };
    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSave.holes,
      "savingThrowOutcome",
    );
    const awaitingInterrupt = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(awaitingInterrupt).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    if (awaitingInterrupt.tag !== "needsHoles") return;
    const released = resolveBattleInterrupt({
      state: awaitingInterrupt.state,
      fill: interruptDecisionFill(
        requireReleaseHole(awaitingInterrupt.holes, "interruptDecision"),
        { kind: "decline", responderId: spellCasterId },
      ),
    });

    expect(released.tag).toBe("resolved");
    if (released.tag !== "resolved") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toEqual(readiedConcentration);
    expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(
      requireCombatant(released.state, spellTargetId).concentration,
    ).toBeNull();
    expect(casterSpellSlotExpended(released.state, 2)).toBe(0);
    expect(requireCombatant(released.state, spellTargetId).conditions).toEqual(
      expect.objectContaining({ paralyzed: true }),
    );
    expect(
      requireCombatant(released.state, spellTargetId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellConditionEndTurnSave",
          sourceProcedureRef: storedSpellProcedureRefInState(
            state,
            storedInvocation,
          ),
          expiresAt: {
            kind: "duration",
            durationTicks: holdPersonDurationTicks,
          },
        }),
      ]),
    );
  });

  test("stored readied-compatible Concentration damage release lasts full duration without replacing Concentration", () => {
    const storedInvocation = storedSpellInvocation(mindSpikeUnitId, 2);
    expect(storedInvocation.procedure).toBe("saveGatedDamage");
    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    const session = glyphBattleSession({
      preparedSpells: [
        spellRecord(guidingBoltUnitId),
        spellRecord(mindSpikeUnitId),
      ],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 2 },
      ],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const state = stateWithUnrelatedReadiedSpell(
      battleRuntimeSessionForTest({
        state: stateWithPriorCasterSpellSlotUse(
          stateWithGlyphEffect(
            requireCompletedGlyphEffect({
              anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
              release: { kind: "spellGlyph", storedInvocation },
            }),
            session.state,
          ),
          2,
        ),
        context: session.context,
      }),
    ).state;
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell" as const,
    };

    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSave.holes,
      "savingThrowOutcome",
    );
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
          glyphDamageRollFill(damageRoll, [[4, 4, 4]]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(18);
    expect(casterSpellSlotExpended(released.state, 2)).toBe(1);
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toEqual(readiedConcentration);
    expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spellConcentrationDuration",
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
  });

  test("stored readied-compatible Concentration damage release preserves same-spell ordinary Concentration", () => {
    const storedInvocation = storedSpellInvocation(mindSpikeUnitId, 2);
    const state = stateWithOrdinaryMindSpikeConcentration(
      stateWithPriorCasterSpellSlotUse(
        stateWithGlyphEffect(
          requireCompletedGlyphEffect({
            anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
            release: { kind: "spellGlyph", storedInvocation },
          }),
          glyphBattle({
            preparedSpells: [spellRecord(mindSpikeUnitId)],
            spellSlots: [{ spellLevel: 2, count: 2 }],
            targetHp: 30,
            targetMaxHp: 30,
          }),
        ),
        2,
      ),
    );

    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSave.holes,
      "savingThrowOutcome",
    );
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
          glyphDamageRollFill(damageRoll, [[4, 4, 4]]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(
          spellTargetId,
          storedSpellProcedureRefInState(state, storedInvocation),
        ),
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const caster = requireCombatant(released.state, spellCasterId);
    const mindSpikeDurations = caster.activeEffects.filter(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellConcentrationDuration" }
      > =>
        effect.kind === "spellConcentrationDuration" &&
        effect.sourceCombatantId === spellCasterId,
    );
    expect(caster.concentration?.effectKind).toBe("spellEffect");
    expect(
      mindSpikeDurations.some(
        (effect) =>
          effect.sourceProcedureRef ===
          caster.concentration?.sourceProcedureRef,
      ),
    ).toBe(true);
    expect(mindSpikeDurations).toHaveLength(2);
    expect(mindSpikeDurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(600),
          },
        }),
        expect.objectContaining({
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(600),
          },
        }),
      ]),
    );
  });

  test("rejects stored Concentration save-gated damage with area targeting outside the full-duration subset", () => {
    const singleCreatureInvocation = storedSpellInvocation(mindSpikeUnitId, 2);
    if (
      singleCreatureInvocation.procedure !== "saveGatedDamage" ||
      singleCreatureInvocation.spell.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected Mind Spike save-gated damage Concentration.");
    }
    const areaInvocation = storedSpellInvocation(fireballUnitId, 3);
    if (areaInvocation.procedure !== "saveGatedDamage") {
      throw new Error("Expected Fireball save-gated damage targeting.");
    }
    const storedInvocation = {
      ...singleCreatureInvocation,
      targeting: areaInvocation.targeting,
    } satisfies GlyphStoredSpellInvocationCandidate;

    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile: requireGlyphProfile(),
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
      }),
    ).toEqual({
      tag: "storedSpellConcentrationFullDurationUnsupported",
      storedInvocation,
    });
  });

  test("rejects stored roll modifiers that are not exact single-creature releases", () => {
    const storedInvocation = storedSpellInvocation(blessUnitId, 1);
    expect(storedInvocation.procedure).toBe("rollModifier");
    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    expect(
      GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_PROCEDURES.some(
        (procedure) => procedure === storedInvocation.procedure,
      ),
    ).toBe(true);

    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile: requireGlyphProfile(),
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
      }),
    ).toEqual({
      tag: "storedSpellConcentrationFullDurationUnsupported",
      storedInvocation,
    });
  });

  test.each(GLYPH_STORED_SINGLE_CREATURE_ACTIVE_EFFECT_RELEASE_CASES)(
    "stored single-creature active-effect Concentration release for $label lasts full duration without slot spend or ordinary Concentration",
    (releaseCase) => {
      const storedInvocation = storedSpellInvocation(
        releaseCase.spellId,
        releaseCase.slotLevel,
        releaseCase.procedure,
      );
      expect(storedInvocation.procedure).toBe(releaseCase.procedure);
      expect(storedInvocation.spell.mechanics.duration.kind).toBe(
        "concentration",
      );
      const session = sessionWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
        {
          preparedSpells: [
            spellRecord(guidingBoltUnitId),
            spellRecord(releaseCase.spellId),
          ],
          spellSlots:
            releaseCase.slotLevel === 1
              ? [{ spellLevel: 1, count: 3 }]
              : [
                  { spellLevel: 1, count: 1 },
                  { spellLevel: releaseCase.slotLevel, count: 2 },
                ],
        },
      );
      const state = stateWithPriorCasterSpellSlotUse(
        stateWithUnrelatedReadiedSpell(session).state,
        releaseCase.slotLevel,
      );
      const targetFacts = releaseCase.targetFacts(
        storedSpellProcedureRefInState(state, storedInvocation),
      );
      const priorTurnSpellSlotUses =
        state.currentTurnResources.spellSlotUsesThisTurn;
      const priorExpended = casterSpellSlotExpended(
        state,
        releaseCase.slotLevel,
      );
      const readiedBefore = state.readiedSpells.get(spellCasterId);
      const initialRelease = releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [],
          spellTargetId,
          targetFacts,
        ),
      });
      const released =
        releaseCase.fillsFromHoles === undefined
          ? initialRelease
          : releaseGlyphStoredSpell({
              executionRegistry,
              state,
              profile: requireGlyphStoredSpellProfile(),
              witness: storedSingleCreatureReleaseWitness(
                glyphEffectRef(state),
                releaseCase.fillsFromHoles(
                  expectNeedsReleaseHoles(initialRelease),
                ),
                spellTargetId,
                targetFacts,
              ),
            });

      expect(released.tag).toBe("released");
      if (released.tag !== "released") return;
      expect(glyphEffects(released.state)).toEqual([]);
      expect(
        requireCombatant(released.state, spellCasterId).concentration,
      ).toEqual({
        sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
        effectKind: "readiedSpell",
      });
      expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
        readiedBefore,
      );
      expect(
        requireCombatant(released.state, spellTargetId).concentration,
      ).toBeNull();
      expect(
        casterSpellSlotExpended(released.state, releaseCase.slotLevel),
      ).toBe(priorExpended);
      expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
        priorTurnSpellSlotUses,
      );
      const expectedEffectKinds = new Set<BattleActiveEffect["kind"]>(
        releaseCase.effectKinds,
      );
      const target = requireCombatant(released.state, spellTargetId);
      const storedEffects = target.activeEffects.filter(
        (
          effect,
        ): effect is BattleActiveEffect & {
          readonly sourceProcedureRef: string;
        } =>
          "sourceProcedureRef" in effect &&
          expectedEffectKinds.has(effect.kind),
      );
      for (const effectKind of releaseCase.effectKinds) {
        expect(storedEffects).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ kind: effectKind }),
          ]),
        );
      }
      for (const effect of storedEffects) {
        expect(effect.expiresAt).toEqual(
          expect.objectContaining({ kind: "duration" }),
        );
      }
    },
  );

  test("stored Invisibility replaces an ordinary same-procedure effect without duplication", () => {
    const storedInvocation = storedSpellInvocation(
      invisibilityUnitId,
      2,
      "directCondition",
    );
    if (storedInvocation.procedure !== "directCondition") {
      throw new Error("Expected stored direct-condition Invisibility.");
    }
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [spellRecord(invisibilityUnitId)],
        spellSlots: [{ spellLevel: 2, count: 2 }],
      },
    );
    const act = spellAct({
      session,
      spellId: invisibilityUnitId,
      slotLevel: 2,
    });
    const ordinarilyInvisible = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          requireReleaseHole(act.initialHoles, "spellTargetList"),
          spellCasterId,
          invisibilityUnitId,
          [spellTargetId],
        ),
      ],
    });
    if (ordinarilyInvisible.tag !== "resolved") {
      throw new Error("Expected ordinary Invisibility cast to resolve.");
    }
    const storedProcedureRef = storedSpellProcedureRefInState(
      ordinarilyInvisible.state,
      storedInvocation,
    );
    expect(storedProcedureRef).toBe(act.subject.procedureRef);
    const ordinaryEffects = requireCombatant(
      ordinarilyInvisible.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) =>
        effect.kind === "targetActionEndedSpellCondition" &&
        effect.sourceProcedureRef === storedProcedureRef,
    );
    expect(ordinaryEffects).toHaveLength(1);
    expect(ordinaryEffects[0]?.expiresAt).toEqual(
      expect.objectContaining({ kind: "concentration" }),
    );
    const ordinaryConcentration = requireCombatant(
      ordinarilyInvisible.state,
      spellCasterId,
    ).concentration;
    if (ordinaryConcentration === null) {
      throw new Error("Expected ordinary Invisibility Concentration.");
    }

    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state: ordinarilyInvisible.state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(ordinarilyInvisible.state),
        [],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(spellTargetId, storedProcedureRef),
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const releasedEffects = requireCombatant(
      released.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) =>
        effect.kind === "targetActionEndedSpellCondition" &&
        effect.sourceProcedureRef === storedProcedureRef,
    );
    expect(releasedEffects).toEqual([
      expect.objectContaining({
        condition: "invisible",
        expiresAt: {
          kind: "duration",
          durationTicks: storedInvocation.activeEffect.expiresAt.durationTicks,
        },
      }),
    ]);
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toEqual(ordinaryConcentration);
    const afterOrdinaryConcentrationEnds = breakBattleConcentration(
      released.state,
      spellCasterId,
    );
    expect(
      requireCombatant(afterOrdinaryConcentrationEnds, spellCasterId)
        .concentration,
    ).toBeNull();
    expect(
      requireCombatant(
        afterOrdinaryConcentrationEnds,
        spellTargetId,
      ).activeEffects.filter(
        (effect) =>
          effect.kind === "targetActionEndedSpellCondition" &&
          effect.sourceProcedureRef === storedProcedureRef,
      ),
    ).toEqual(releasedEffects);
  });

  test("stored self-transformation Concentration release applies the chosen mode to the triggering creature for full duration", () => {
    const storedInvocation = storedSpellInvocation(
      alterSelfUnitId,
      2,
      "selfTransformationMode",
    );
    expect(storedInvocation.procedure).toBe("selfTransformationMode");
    expect(storedInvocation.spell.mechanics.range).toEqual({ kind: "self" });
    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [
          spellRecord(guidingBoltUnitId),
          spellRecord(alterSelfUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 2, count: 2 },
        ],
      },
    );
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithUnrelatedReadiedSpell(session).state,
      2,
    );
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;
    const priorExpended = casterSpellSlotExpended(state, 2);
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const initialRelease = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        [],
      ),
    });
    const modeHole = requireReleaseHole(
      expectNeedsReleaseHoles(initialRelease),
      "selfTransformationModeChoice",
    );

    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          {
            kind: "selfTransformationModeChoice",
            holeId: modeHole.holeId,
            value: "aquaticAdaptation",
          },
        ],
        spellTargetId,
        [],
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell",
    });
    expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(
      requireCombatant(released.state, spellTargetId).concentration,
    ).toBeNull();
    expect(casterSpellSlotExpended(released.state, 2)).toBe(priorExpended);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
    expect(
      requireCombatant(released.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        sourceCombatantId: spellCasterId,
        mode: "aquaticAdaptation",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
    const targetTurn = endTurn({
      state: released.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    expect(
      discoverBattleActCandidates(targetTurn.state).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "replaceSelfTransformationMode",
      ),
    ).toBe(false);
  });

  test("stored self-transformation Natural Weapons release consumes the procedure damage-type choice", () => {
    const storedInvocation = storedSpellInvocation(
      alterSelfUnitId,
      2,
      "selfTransformationMode",
    );
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(alterSelfUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
    );
    const initialRelease = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        [],
      ),
    });
    const modeHole = requireReleaseHole(
      expectNeedsReleaseHoles(initialRelease),
      "selfTransformationModeChoice",
    );
    const modeOnly = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          {
            kind: "selfTransformationModeChoice",
            holeId: modeHole.holeId,
            value: "naturalWeapons",
          },
        ],
        spellTargetId,
        [],
      ),
    });
    const damageTypeHole = requireReleaseHole(
      expectNeedsReleaseHoles(modeOnly),
      "damageTypeChoice",
    );
    expect(damageTypeHole.choices).toEqual([
      "slashing",
      "piercing",
      "bludgeoning",
    ]);

    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          {
            kind: "selfTransformationModeChoice",
            holeId: modeHole.holeId,
            value: "naturalWeapons",
          },
          {
            kind: "damageTypeChoice",
            holeId: damageTypeHole.holeId,
            value: "piercing",
          },
        ],
        spellTargetId,
        [],
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(
      requireCombatant(released.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        sourceCombatantId: spellCasterId,
        mode: "naturalWeapons",
        naturalWeaponDamageType: "piercing",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
  });

  test.each(GLYPH_STORED_AREA_ONGOING_RELEASE_CASES)(
    "stored area ongoing Concentration release for $label lasts full duration without slot spend or ordinary Concentration",
    (releaseCase) => {
      const storedInvocation = storedSpellInvocation(
        releaseCase.spellId,
        releaseCase.slotLevel,
      );
      expect(storedInvocation.procedure).toBe(releaseCase.procedure);
      expect(storedInvocation.spell.mechanics.duration.kind).toBe(
        "concentration",
      );
      if (!("durationTicks" in storedInvocation)) {
        throw new Error("Expected stored area ongoing duration ticks.");
      }
      const session = sessionWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
        {
          preparedSpells: [
            spellRecord(guidingBoltUnitId),
            spellRecord(releaseCase.spellId),
          ],
          spellSlots:
            releaseCase.slotLevel === 1
              ? [{ spellLevel: 1, count: 2 }]
              : [
                  { spellLevel: 1, count: 1 },
                  { spellLevel: releaseCase.slotLevel, count: 1 },
                ],
        },
      );
      const state = stateWithPriorCasterSpellSlotUse(
        stateWithUnrelatedReadiedSpell(session).state,
        releaseCase.slotLevel,
      );
      const priorTurnSpellSlotUses =
        state.currentTurnResources.spellSlotUsesThisTurn;
      const priorExpended = casterSpellSlotExpended(
        state,
        releaseCase.slotLevel,
      );
      const readiedBefore = state.readiedSpells.get(spellCasterId);
      const needsAreaWitness = releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: [],
        }),
      });

      expect(needsAreaWitness.tag).toBe("needsHoles");
      if (needsAreaWitness.tag !== "needsHoles") return;
      const released = releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: releaseCase.fillsFromHoles(needsAreaWitness.holes),
        }),
      });

      expect(released.tag).toBe("released");
      if (released.tag !== "released") return;
      const caster = requireCombatant(released.state, spellCasterId);
      const storedAreaEffect = caster.activeEffects.find(
        (effect) =>
          effect.kind === releaseCase.effectKind &&
          "areaId" in effect &&
          effect.areaId === releaseCase.areaId,
      );
      expect(storedAreaEffect).toMatchObject({
        kind: releaseCase.effectKind,
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        sourceCombatantId: spellCasterId,
        areaId: releaseCase.areaId,
        expiresAt: {
          kind: "duration",
          durationTicks: storedInvocation.durationTicks,
        },
      });
      expect(caster.concentration).toEqual({
        sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
        effectKind: "readiedSpell",
      });
      expect(glyphEffects(released.state)).toEqual([]);
      expect(
        casterSpellSlotExpended(released.state, releaseCase.slotLevel),
      ).toBe(priorExpended);
      expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
        priorTurnSpellSlotUses,
      );
    },
  );

  test.each(GLYPH_STORED_SPELL_AREA_CHOICE_RELEASE_CASES)(
    "stored area ongoing Concentration release for $label rejects area fills not centered on the triggering creature",
    (releaseCase) => {
      const storedInvocation = storedSpellInvocation(
        releaseCase.spellId,
        releaseCase.slotLevel,
      );
      const state = stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
        glyphBattle({
          preparedSpells: [spellRecord(releaseCase.spellId)],
          spellSlots: [{ spellLevel: releaseCase.slotLevel, count: 1 }],
        }),
      );
      const needsAreaWitness = releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: [],
        }),
      });

      expect(needsAreaWitness.tag).toBe("needsHoles");
      if (needsAreaWitness.tag !== "needsHoles") return;
      for (const originAnchor of [
        glyphStoredUnanchoredAreaOrigin,
        glyphStoredWrongAreaOriginAnchor,
      ] as const) {
        const rejected = releaseGlyphStoredSpell({
          executionRegistry,
          state,
          profile: requireGlyphStoredSpellProfile(),
          witness: storedAreaReleaseWitness({
            effectRef: glyphEffectRef(state),
            originAnchorId: spellTargetId,
            fills: releaseCase.fillsFromHoles(
              needsAreaWitness.holes,
              originAnchor,
            ),
          }),
        });

        expect(rejected).toMatchObject({
          tag: "invalidWitness",
          reason: "storedSpellResolutionInvalid",
          message:
            "Stored glyph area release must use a spell area centered on the triggering creature.",
        });
      }
      expect(glyphEffects(state)).toHaveLength(1);
    },
  );

  test("stored area control Concentration release lasts full duration without slot spend or ordinary Concentration", () => {
    const storedInvocation = storedSpellInvocation(
      saveGatedAreaControlUnitId,
      3,
    );
    expect(storedInvocation.procedure).toBe("saveGatedAreaControl");
    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    const nonConcentrationStoredInvocation = {
      ...storedInvocation,
      spell: {
        ...storedInvocation.spell,
        mechanics: {
          ...storedInvocation.spell.mechanics,
          duration: { kind: "instantaneous" },
        },
      },
      // This negative fixture deliberately violates the narrowed stored
      // invocation type so the runtime admission guard can reject a
      // non-Concentration stored area-control shape.
    } as GlyphStoredSpellInvocationCandidate;
    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile: requireGlyphProfile(),
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: {
            kind: "spellGlyph",
            storedInvocation: nonConcentrationStoredInvocation,
          },
        }),
      }),
    ).toEqual({
      tag: "storedSpellProcedureUnsupported",
      storedInvocation: nonConcentrationStoredInvocation,
    });
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [
          spellRecord(guidingBoltUnitId),
          spellRecord(saveGatedAreaControlUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 3, count: 2 },
        ],
      },
    );
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithUnrelatedReadiedSpell(session).state,
      3,
    );
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;
    const priorExpended = casterSpellSlotExpended(state, 3);
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell" as const,
    };
    const needsAreaSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsAreaSave.holes,
      "savingThrowOutcome",
    );
    expect("spell" in savingThrow).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(savingThrow),
    ).toBeDefined();

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: [
            glyphStoredHypnoticPatternSavingThrowOutcomeFill(
              savingThrow,
              [{ targetId: spellTargetId, succeeded: false }],
              spellCasterId,
            ),
          ],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "areaCenterMismatch",
    });

    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [
          glyphStoredHypnoticPatternSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const caster = requireCombatant(released.state, spellCasterId);
    const target = requireCombatant(released.state, spellTargetId);
    const control = target.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "saveGatedAreaControl" }
      > => effect.kind === "saveGatedAreaControl",
    );

    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(released.state, target))).toBe(0);
    expect(control).toMatchObject({
      kind: "saveGatedAreaControl",
      sourceCombatantId: spellCasterId,
      expiresAt: {
        kind: "duration",
        durationTicks: saveGatedAreaControlDurationTicks,
      },
    });
    expect(caster.concentration).toEqual(readiedConcentration);
    expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(glyphEffects(released.state)).toEqual([]);
    expect(casterSpellSlotExpended(released.state, 3)).toBe(priorExpended);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
    if (control === undefined) {
      throw new Error("Expected Hypnotic Pattern control effect.");
    }

    const almostExpiredTarget = {
      ...target,
      activeEffects: target.activeEffects.map((effect) =>
        effect === control
          ? {
              ...control,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    };
    const expiredCombatants = tickDurationEffects(
      new Map(released.state.combatants).set(
        spellTargetId,
        almostExpiredTarget,
      ),
    ).value;
    const expiredTarget = expiredCombatants.get(spellTargetId);
    if (expiredTarget === undefined) {
      throw new Error("Expected target after duration cleanup.");
    }
    expect(
      expiredTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(false);
    expect(hasCondition(expiredTarget.conditions, "charmed")).toBe(false);
    expect(hasCondition(expiredTarget.conditions, "incapacitated")).toBe(false);
    expect(
      Number(
        effectiveWalkSpeed(
          { ...released.state, combatants: expiredCombatants },
          expiredTarget,
        ),
      ),
    ).toBeGreaterThan(0);
    expect(expiredCombatants.get(spellCasterId)?.concentration).toEqual(
      readiedConcentration,
    );
  });

  test("stored area control Concentration release preserves glyph replay across save-failed interrupts", () => {
    const storedInvocation = storedSpellInvocation(
      saveGatedAreaControlUnitId,
      3,
    );
    expect(storedInvocation.procedure).toBe("saveGatedAreaControl");
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [
          spellRecord(guidingBoltUnitId),
          spellRecord(saveGatedAreaControlUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 3, count: 2 },
        ],
      },
    );
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithUnrelatedReadiedSpell(session, "saveFailed").state,
      3,
    );
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;
    const priorExpended = casterSpellSlotExpended(state, 3);
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell" as const,
    };
    const needsAreaSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsAreaSave.holes,
      "savingThrowOutcome",
    );
    const awaitingSaveFailedReaction = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [
          glyphStoredHypnoticPatternSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    });

    expect(awaitingSaveFailedReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    if (awaitingSaveFailedReaction.tag !== "needsHoles") return;
    expect(
      battleFrontierInterruptDecisionForState(awaitingSaveFailedReaction.state)
        ?.choices,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "nestedProcedure",
          subject: expect.objectContaining({
            command: "releaseReadiedSpell",
            readiedSpellCasterId: spellCasterId,
          }),
        }),
      ]),
    );
    const afterDecline = resolveBattleInterrupt({
      state: awaitingSaveFailedReaction.state,
      fill: interruptDecisionFill(
        requireReleaseHole(
          awaitingSaveFailedReaction.holes,
          "interruptDecision",
        ),
        { kind: "decline", responderId: spellCasterId },
      ),
    });

    expect(afterDecline.tag).toBe("resolved");
    if (afterDecline.tag !== "resolved") return;
    expect(
      battleFrontierInterruptDecisionForState(afterDecline.state),
    ).toBeNull();
    const caster = requireCombatant(afterDecline.state, spellCasterId);
    const target = requireCombatant(afterDecline.state, spellTargetId);
    const control = target.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "saveGatedAreaControl" }
      > => effect.kind === "saveGatedAreaControl",
    );

    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(afterDecline.state, target))).toBe(0);
    expect(control).toMatchObject({
      kind: "saveGatedAreaControl",
      sourceProcedureRef: storedSpellProcedureRefInState(
        state,
        storedInvocation,
      ),
      sourceCombatantId: spellCasterId,
      expiresAt: {
        kind: "duration",
        durationTicks: saveGatedAreaControlDurationTicks,
      },
    });
    expect(caster.concentration).toEqual(readiedConcentration);
    expect(
      caster.activeEffects.some(
        (effect) =>
          effect.kind === "spellConcentrationDuration" &&
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(false);
    expect(afterDecline.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(glyphEffects(afterDecline.state)).toEqual([]);
    expect(casterSpellSlotExpended(afterDecline.state, 3)).toBe(priorExpended);
    expect(
      afterDecline.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toEqual(priorTurnSpellSlotUses);
  });

  test("stored area damage release resumes from a save-failed interrupt into its damage roll", () => {
    const storedInvocation = storedSpellInvocation(fireballUnitId, 3);
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [
          spellRecord(guidingBoltUnitId),
          spellRecord(fireballUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 3, count: 1 },
        ],
        targetHp: 50,
        targetMaxHp: 50,
      },
    );
    const state = stateWithUnrelatedReadiedSpell(session, "saveFailed").state;
    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });
    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const save = requireReleaseHole(needsSave.holes, "savingThrowOutcome");
    const saveFill = fireballGlyphSavingThrowOutcomeFill(
      save,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );

    const awaitingInterrupt = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [saveFill],
      }),
    });
    expect(awaitingInterrupt).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    if (awaitingInterrupt.tag !== "needsHoles") return;

    const resumed = resolveBattleInterrupt({
      state: awaitingInterrupt.state,
      fill: interruptDecisionFill(
        requireReleaseHole(awaitingInterrupt.holes, "interruptDecision"),
        { kind: "decline", responderId: spellCasterId },
      ),
    });
    expect(resumed.tag).toBe("needsHoles");
    if (resumed.tag !== "needsHoles") return;
    const damage = requireReleaseHole(resumed.holes, "rolledDice");

    const released = resolveBattleSubject({
      state: resumed.state,
      subject: resumed.subject,
      fills: [glyphDamageRollFill(damage, [[4, 4, 4, 4, 4, 4, 4, 4]])],
    });
    expect(released.tag).toBe("resolved");
    if (released.tag !== "resolved") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(18);
    expect(released.state.interruptStack).toEqual([]);
  });

  test("rejects non-Concentration save-gated condition stored spells outside Task 29 scope", () => {
    const storedInvocation = storedSpellInvocation(blindnessDeafnessUnitId, 2);

    expect(storedInvocation.procedure).toBe("saveGatedCondition");
    expect(storedInvocation.spell.mechanics.duration.kind).not.toBe(
      "concentration",
    );
    expect(
      glyphDurableOccurrenceEffectFromCompletedInscription({
        profile: requireGlyphProfile(),
        witness: completedGlyphInscriptionWitness({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
      }),
    ).toEqual({
      tag: "storedSpellProcedureUnsupported",
      storedInvocation,
    });
  });

  test("stored area release consumes centered save and damage fills without spending a current slot", () => {
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: {
            kind: "spellGlyph",
            storedInvocation: storedSpellInvocation(fireballUnitId, 3),
          },
        }),
        glyphBattle({
          preparedSpells: [spellRecord(fireballUnitId)],
          spellSlots: [{ spellLevel: 3, count: 2 }],
          targetHp: 50,
          targetMaxHp: 50,
          targetSpellcasting: spellCastInterruptionReactionSpellcasting(),
        }),
      ),
      3,
    );
    expect(casterSpellSlotExpended(state, 3)).toBe(1);
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellCasterId,
          fills: [],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "areaCenterMismatch",
    });
    const needsAreaSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [
          spellCastReactionFactsFill([
            spellCastInterruptionReactionTriggerFact({
              reactorId: spellTargetId,
              casterId: spellCasterId,
            }),
          ]),
        ],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    expect(
      needsAreaSave.holes.some((hole) => hole.kind === "interruptDecision"),
    ).toBe(false);
    const savingThrow = requireReleaseHole(
      needsAreaSave.holes,
      "savingThrowOutcome",
    );
    expect("spell" in savingThrow).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(savingThrow),
    ).toBeDefined();
    const saveFill = fireballGlyphSavingThrowOutcomeFill(
      savingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [saveFill],
      }),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [
          saveFill,
          glyphDamageRollFill(damageRoll, [[4, 4, 4, 4, 4, 4, 4, 4]]),
        ],
      }),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(18);
    expect(casterSpellSlotExpended(released.state, 3)).toBe(1);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
  });

  test("stored Dissonant Whispers successful save deals half damage to the triggering creature without spending a current slot or Reaction", () => {
    const storedInvocation = storedSpellInvocation(
      dissonantWhispersUnitId,
      1,
      "saveGatedDamage",
      bardFiveGlyphCaster,
    );
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
        glyphBattle({
          ...bardFiveGlyphCaster,
          preparedSpells: [spellRecord(dissonantWhispersUnitId)],
          targetHp: 30,
          targetMaxHp: 30,
        }),
      ),
      1,
    );
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;
    const targetFacts = storedSingleCreatureSpellTargetFacts(
      spellTargetId,
      storedSpellProcedureRefInState(state, storedInvocation),
    );
    const needsSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        targetFacts,
      ),
    });

    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSave.holes,
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [saveFill],
        spellTargetId,
        targetFacts,
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [saveFill, glyphDamageRollFill(damageRoll, [[4, 4, 4]])],
        spellTargetId,
        targetFacts,
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(24);
    expect(
      requireCombatant(released.state, spellTargetId).reactionAvailable,
    ).toBe(true);
    expect(casterSpellSlotExpended(released.state, 1)).toBe(1);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
  });

  test("stored self-origin area release centers on the triggering creature", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: {
          kind: "spellGlyph",
          storedInvocation: storedSpellInvocation(thunderwaveUnitId, 1),
        },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(thunderwaveUnitId)],
        spellSlots: [{ spellLevel: 1, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        extraTargetIds: [thunderwaveSecondTargetId],
        extraTargetHp: 30,
        extraTargetMaxHp: 30,
      }),
    );
    const needsAreaSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsAreaSave.holes,
      "savingThrowOutcome",
    );
    expect("spell" in savingThrow).toBe(false);
    expect(savingThrow).toMatchObject({
      sourceProcedureRef: expect.any(String),
      outcomeTargeting: "area",
    });
    const saveFill = thunderwaveGlyphSavingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: thunderwaveSecondTargetId, succeeded: true },
    ]);
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [saveFill],
      }),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [saveFill, glyphDamageRollFill(damageRoll, [[4, 4]])],
      }),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(22);
    expect(
      Number(released.state.combatants.get(thunderwaveSecondTargetId)?.hp),
    ).toBe(26);
  });

  test("stored hostile trap release consumes close-placement witness without spending a current slot", () => {
    const storedInvocation = storedSpellInvocation(greaseUnitId, 1);
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: {
            kind: "spellGlyph",
            storedInvocation,
          },
        }),
        glyphBattle({
          preparedSpells: [spellRecord(greaseUnitId)],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      ),
      1,
    );
    expect(casterSpellSlotExpended(state, 1)).toBe(1);
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: [],
          hostilePlacement: {
            kind: "storedSpellHostilePlacementNotApplicable",
          },
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hostilePlacementRequired",
    });
    const needsSavingThrow = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
        hostilePlacement: storedTrapPlacementWitness(),
      }),
    });

    expect(needsSavingThrow.tag).toBe("needsHoles");
    if (needsSavingThrow.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSavingThrow.holes,
      "savingThrowOutcome",
    );
    expect("spell" in savingThrow).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(savingThrow),
    ).toBeDefined();
    const saveFill = greaseGlyphSavingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellTargetId,
          fills: [
            greaseSavingThrowOutcomeFillWithAreaId(
              saveFill,
              battleAreaId("wrong-glyph-grease-area"),
            ),
          ],
          hostilePlacement: storedTrapPlacementWitness(),
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hostilePlacementAreaMismatch",
    });
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [saveFill],
        hostilePlacement: storedTrapPlacementWitness(),
      }),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(casterSpellSlotExpended(released.state, 1)).toBe(1);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "persistentAreaSaveCondition",
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);
  });

  test("stored harmful-object release keeps frontiers durable and lasts full duration", () => {
    const storedInvocation = storedSpellInvocation(spiritualWeaponUnitId, 2);
    expect(storedInvocation.procedure).toBe("spatialMeleeSpellAttackProxy");
    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    const session = sessionWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: { kind: "spellGlyph", storedInvocation },
      }),
      {
        preparedSpells: [
          spellRecord(guidingBoltUnitId),
          spellRecord(spiritualWeaponUnitId),
        ],
        spellSlots: [
          { spellLevel: 1, count: 1 },
          { spellLevel: 2, count: 2 },
        ],
        targetHp: 20,
        targetMaxHp: 20,
      },
    );
    const state = stateWithUnrelatedReadiedSpell(
      battleRuntimeSessionForTest({
        state: stateWithPriorCasterSpellSlotUse(session.state, 2),
        context: session.context,
      }),
    ).state;
    expect(casterSpellSlotExpended(state, 2)).toBe(1);
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceProcedureRef: readiedBefore?.procedureRef ?? glyphProcedureRef,
      effectKind: "readiedSpell" as const,
    };
    const spatialMeleeSpellAttackProxyTargetFacts = (
      targetId: CombatantId,
      forcePositionId = glyphHarmfulObjectPositionId,
    ) =>
      storedSpiritualWeaponTargetFacts(
        targetId,
        forcePositionId,
        storedSpellProcedureRefInState(state, storedInvocation),
      );

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [],
          spellTargetId,
          spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
          storedHostilePlacementNotApplicable(),
        ),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hostilePlacementRequired",
    });
    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [],
          spellCasterId,
          spatialMeleeSpellAttackProxyTargetFacts(spellCasterId),
          storedHarmfulObjectPlacementWitness(),
        ),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "triggerCreatureTargetMismatch",
    });

    const needsForcePosition = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [],
        spellTargetId,
        spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
        storedHarmfulObjectPlacementWitness(),
      ),
    });

    expect(needsForcePosition.tag).toBe("needsHoles");
    if (needsForcePosition.tag !== "needsHoles") return;
    const forcePosition = requireReleaseHole(
      needsForcePosition.holes,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const forcePositionFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: forcePosition,
      positionId: glyphHarmfulObjectPositionId,
    });
    const wrongForcePositionFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: forcePosition,
      positionId: battleTablePositionId("wrong-glyph-harmful-object"),
    });

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [wrongForcePositionFill],
          spellTargetId,
          spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
          storedHarmfulObjectPlacementWitness(),
        ),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hostilePlacementPositionMismatch",
    });
    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          [forcePositionFill],
          spellTargetId,
          spatialMeleeSpellAttackProxyTargetFacts(
            spellTargetId,
            battleTablePositionId("wrong-glyph-harmful-object"),
          ),
          storedHarmfulObjectPlacementWitness(),
        ),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hostilePlacementReachMismatch",
    });

    const needsAttackRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [forcePositionFill],
        spellTargetId,
        spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
        storedHarmfulObjectPlacementWitness(),
      ),
    });

    expect(needsAttackRoll.tag).toBe("needsHoles");
    if (needsAttackRoll.tag !== "needsHoles") return;
    const attackRoll = requireReleaseHole(needsAttackRoll.holes, "attackRoll");
    expect("spell" in attackRoll).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(attackRoll),
    ).toBeDefined();
    const needsDamageRoll = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          forcePositionFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
        spellTargetId,
        spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
        storedHarmfulObjectPlacementWitness(),
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    expect(needsDamageRoll.state).toEqual(state);
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      executionRegistry,
      state: needsDamageRoll.state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        glyphEffectRef(state),
        [
          forcePositionFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          glyphDamageRollFill(damageRoll, [[5]]),
        ],
        spellTargetId,
        spatialMeleeSpellAttackProxyTargetFacts(spellTargetId),
        storedHarmfulObjectPlacementWitness(),
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(12);
    expect(casterSpellSlotExpended(released.state, 2)).toBe(1);
    expect(released.state.currentTurnResources.spellSlotUsesThisTurn).toEqual(
      priorTurnSpellSlotUses,
    );
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toEqual(readiedConcentration);
    expect(released.state.readiedSpells.get(spellCasterId)).toEqual(
      readiedBefore,
    );
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spatialMeleeSpellAttackProxy",
        sourceProcedureRef: storedSpellProcedureRefInState(
          state,
          storedInvocation,
        ),
        sourceCombatantId: spellCasterId,
        forcePositionId: glyphHarmfulObjectPositionId,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);

    const targetTurn = endTurn({
      state: released.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const repeatAct = discoverBattleActCandidates(casterTurn.state).find(
      (candidate) => {
        if (candidate.subject.tag !== "bonusActionSpell") return false;
        const procedure = characterSpellProcedureForSubject(
          casterTurn.state,
          candidate.subject.procedureRef,
        );
        return (
          procedure?.procedure === "spatialMeleeSpellAttackProxy" &&
          procedure.operation === "repositionAndAttack"
        );
      },
    );
    expect(repeatAct).toBeDefined();
    if (repeatAct === undefined) return;
    const repeatTarget = requireReleaseHole(
      repeatAct.initialHoles,
      "targetChoice",
    );
    expect(repeatTarget.choices).toEqual([spellTargetId]);
    const repeatForce = requireReleaseHole(
      repeatAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: glyphHarmfulObjectPositionId,
      moveDistanceFeet: 0,
    });
    const wrongRepeatTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      repeatTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellCasterId,
      glyphHarmfulObjectPositionId,
    );

    expect(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeatAct.subject,
        fills: [repeatForceFill, wrongRepeatTargetFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Glyph-stored spatial melee spell-attack proxy repeat attacks must target the triggering creature.",
    });
  });

  test("stored Spiritual Weapon fixes the triggering-creature target after force placement", () => {
    const release = spatialMeleeSpellAttackProxyGlyphReleaseDriver();
    const needsForcePosition = release.resolve([]);
    const forcePosition = requireReleaseHole(
      expectNeedsReleaseHoles(needsForcePosition),
      "spatialMeleeSpellAttackProxyPosition",
    );
    const forcePositionFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: forcePosition,
      positionId: glyphHarmfulObjectPositionId,
    });

    const needsAttackRoll = release.resolve(
      [forcePositionFill],
      needsForcePosition.state,
    );

    expect(expectNeedsReleaseHoles(needsAttackRoll)).toEqual([
      expect.objectContaining({ kind: "attackRoll" }),
    ]);
    expect(glyphEffects(needsAttackRoll.state)).toHaveLength(1);
  });

  test("stored Spiritual Weapon damage ends a relationship-gated condition", () => {
    const release = spatialMeleeSpellAttackProxyGlyphReleaseDriver({
      targetHp: 20,
      targetMaxHp: 20,
      extraTargetIds: [spatialMeleeSpellAttackProxyRelationshipSourceId],
    });
    const target = requireCombatant(release.state, spellTargetId);
    const relationshipEffect = {
      kind: "spellCondition" as const,
      effectRef: battleEffectExecutionRefForTest(
        "spiritual-weapon-relationship-condition",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "spiritual-weapon-relationship-source",
      ),
      sourceCombatantId: spatialMeleeSpellAttackProxyRelationshipSourceId,
      condition: "charmed" as const,
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" as const },
      turnStartDamage: null,
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const state: BattleState = {
      ...release.state,
      combatants: new Map(release.state.combatants).set(
        spellTargetId,
        battleCreatureWithSpellActiveEffects(target, [
          ...target.activeEffects,
          relationshipEffect,
        ]),
      ),
    };
    expect(
      hasCondition(
        requireCombatant(state, spellTargetId).conditions,
        "charmed",
      ),
    ).toBe(true);
    const damageFrontier = storedSpiritualWeaponDamageFrontier(release, state);
    const relationship = requireReleaseHole(
      expectNeedsReleaseHoles(damageFrontier.result),
      "damageRelationshipDecisions",
    );
    expect(relationship.questions).toEqual([
      expect.objectContaining({
        kind: "targetDamagedByCasterOrAlly",
        targetId: spellTargetId,
      }),
    ]);
    const resolved = release.resolve(
      [...damageFrontier.fills, relationshipDecisionFill(relationship, true)],
      state,
    );

    expect(resolved.tag).toBe("released");
    if (resolved.tag !== "released") return;
    const damagedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(Number(damagedTarget.hp)).toBe(12);
    expect(hasCondition(damagedTarget.conditions, "charmed")).toBe(false);
    expect(
      damagedTarget.activeEffects.some(
        (effect) =>
          effect.kind === "spellCondition" &&
          effect.effectRef === relationshipEffect.effectRef,
      ),
    ).toBe(false);
    expect(glyphEffects(resolved.state)).toEqual([]);
  });

  test("stored Spiritual Weapon damage breaks target Concentration after a failed save", () => {
    const release = spatialMeleeSpellAttackProxyGlyphReleaseDriver({
      targetHp: 20,
      targetMaxHp: 20,
    });
    const state = stateWithTargetConcentration(release.state, spellTargetId);
    const damageFrontier = storedSpiritualWeaponDamageFrontier(release, state);
    const concentration = requireReleaseHole(
      expectNeedsReleaseHoles(damageFrontier.result),
      "concentrationSavingThrow",
    );
    expect(concentration.combatantId).toBe(spellTargetId);
    expect(glyphEffects(damageFrontier.result.state)).toHaveLength(1);

    const released = release.resolve(
      [
        ...damageFrontier.fills,
        concentrationSavingThrowFill(concentration, false),
      ],
      state,
    );

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const damagedTarget = requireCombatant(released.state, spellTargetId);
    expect(Number(damagedTarget.hp)).toBe(12);
    expect(damagedTarget.concentration).toBeNull();
    expect(glyphEffects(released.state)).toEqual([]);
    expect(
      requireCombatant(released.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spatialMeleeSpellAttackProxy",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );
  });

  test("stored Spiritual Weapon damage uses and consumes a zero-HP replacement", () => {
    const targetResource = unitLibrary.requireUnit(
      orcRelentlessEnduranceUnitId,
    );
    const release = spatialMeleeSpellAttackProxyGlyphReleaseDriver({
      targetHp: 1,
      targetMaxHp: 20,
      targetResources: [{ unit: targetResource }],
      targetUnitRefs: [
        {
          unit: targetResource,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const damageFrontier = storedSpiritualWeaponDamageFrontier(release);
    const disposition = requireReleaseHole(
      expectNeedsReleaseHoles(damageFrontier.result),
      "attackDamageDisposition",
    );
    expect(disposition.targetId).toBe(spellTargetId);
    expect(disposition.choices).toContainEqual(
      expect.objectContaining({ kind: "zeroHitPointReplacement" }),
    );
    const replacement = disposition.choices.find(
      (choice) => choice.kind === "zeroHitPointReplacement",
    );
    if (replacement === undefined) return;
    const resolved = release.resolve([
      ...damageFrontier.fills,
      attackDamageDispositionFill(disposition, replacement),
    ]);

    expect(resolved.tag).toBe("released");
    if (resolved.tag !== "released") return;
    const target = requireCombatant(resolved.state, spellTargetId);
    expect(Number(target.hp)).toBe(1);
    expect(hasCondition(target.conditions, "unconscious")).toBe(false);
    if (target.origin.kind !== "character") {
      throw new Error("Expected Relentless Endurance target character.");
    }
    const resourcePoolRef = release.session.context.characters
      .get(spellTargetId)
      ?.resourceOwnership.find(
        (ownership) => ownership.unit.id === orcRelentlessEnduranceUnitId,
      )?.resourcePoolRef;
    expect(
      target.origin.resources.find(
        (resource) => resource.resourcePoolRef === resourcePoolRef,
      )?.usesRemaining,
    ).toBe(0);
    expect(glyphEffects(resolved.state)).toEqual([]);
    expect(casterSpellSlotExpended(resolved.state, 2)).toBe(0);
  });

  test("stored Spiritual Weapon force damage leaves an immune target's HP unchanged", () => {
    const release = spatialMeleeSpellAttackProxyGlyphReleaseDriver({
      targetStatBlock: damageImmuneHumanoidStatBlock("force"),
    });
    const initialTargetHp = requireCombatant(release.state, spellTargetId).hp;
    const resolved = storedSpiritualWeaponDamageFrontier(release).result;

    expect(resolved.tag).toBe("released");
    if (resolved.tag !== "released") return;
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(
      initialTargetHp,
    );
    expect(glyphEffects(resolved.state)).toEqual([]);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spatialMeleeSpellAttackProxy",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );
  });

  test("stored area release requires the area origin to be centered on the triggering creature", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        release: {
          kind: "spellGlyph",
          storedInvocation: storedSpellInvocation(fireballUnitId, 3),
        },
      }),
      glyphBattle({
        preparedSpells: [spellRecord(fireballUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetHp: 50,
        targetMaxHp: 50,
      }),
    );

    expect(
      releaseGlyphStoredSpell({
        executionRegistry,
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          effectRef: glyphEffectRef(state),
          originAnchorId: spellCasterId,
          fills: [],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "areaCenterMismatch",
    });
    const needsAreaSave = releaseGlyphStoredSpell({
      executionRegistry,
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        effectRef: glyphEffectRef(state),
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsAreaSave.holes,
      "savingThrowOutcome",
    );
    expect("spell" in savingThrow).toBe(false);
    expect(
      battleProcedureExecutionRefForSpellHoleForTest(savingThrow),
    ).toBeDefined();
  });

  test("explosive-rune release uses area witnesses, chosen damage type, slot scaling, save half damage, and cleanup", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        sourceSpellLevel: testBattleSpellEffectLevel(5),
      }),
      glyphBattle({
        targetHp: 50,
        targetMaxHp: 50,
        extraTargetIds: [thunderwaveSecondTargetId],
        extraTargetHp: 50,
        extraTargetMaxHp: 50,
      }),
    );
    const effect = glyphEffects(state)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const profile = requireGlyphExplosiveRuneProfile();
    const saveHole = requireGlyphSavingThrowOutcomeHole({
      state,
      effect,
      targetIds: [spellTargetId, thunderwaveSecondTargetId],
    });
    expect(saveHole).toMatchObject({
      ability: "dex",
      dc: { kind: "fixed", dc: spellSaveDcForCaster(state, spellCasterId) },
      glyphExplosiveRune: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: glyphProcedureRef,
        effectRef: effect.effectRef,
        radiusFeet: 20,
      },
      targetIds: [spellTargetId, thunderwaveSecondTargetId],
    });
    const released = releaseGlyphExplosiveRune({
      state,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(glyphEffectRef(state)),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership: {
          kind: "creaturesInArea",
          affectedTargetIds: [spellTargetId, thunderwaveSecondTargetId],
          savingThrowOutcomes: [
            glyphSavingThrowOutcomeFill(saveHole, [
              {
                targetId: spellTargetId,
                succeeded: false,
                withoutRoll: true,
              },
              {
                targetId: thunderwaveSecondTargetId,
                succeeded: true,
                withoutRoll: true,
              },
            ]),
          ],
          damageRoll: glyphDamageRollFill(
            glyphExplosiveRuneDamageRollHole({ profile, effect }),
            [[4, 4, 4, 4, 4, 4, 4]],
          ),
          spellDamageReductionRolls: [],
          concentrationSavingThrows: [],
          damageDispositions: [],
          saveGatedConditionWithRepeatDamageRepeatSaves: [],
        },
      },
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(released.damageRollTotal).toBe(28);
    expect(released.affectedTargetIds).toEqual([
      spellTargetId,
      thunderwaveSecondTargetId,
    ]);
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(22);
    expect(
      Number(released.state.combatants.get(thunderwaveSecondTargetId)?.hp),
    ).toBe(36);
  });

  test.each([
    {
      scenario: "partial reduction",
      createBattle: () => glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
      damagePips: [2, 2, 2, 2, 2] as const,
      expectedDamage: 6,
    },
    {
      scenario: "zero damage after immunity",
      createBattle: () =>
        glyphBattle({
          targetStatBlock: damageImmuneHumanoidStatBlock("thunder"),
        }),
      damagePips: [1, 1, 1, 1, 1] as const,
      expectedDamage: 0,
    },
  ])(
    "explosive-rune release requests and consumes spell damage reduction fills before damage: $scenario",
    ({ createBattle, damagePips, expectedDamage }) => {
      const profile = requireGlyphExplosiveRuneProfile();
      const baseState = stateWithSpellDamageReduction(
        stateWithGlyphEffect(
          requireCompletedGlyphEffect({
            anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
            release: { kind: "explosiveRune", damageType: "thunder" },
          }),
          createBattle(),
        ),
        spellTargetId,
        "thunder",
      );
      const effect = glyphEffects(baseState)[0];
      expect(effect).toBeDefined();
      if (effect === undefined) return;
      const areaMembership = {
        kind: "creaturesInArea" as const,
        affectedTargetIds: [spellTargetId] as const,
        savingThrowOutcomes: [
          glyphSavingThrowOutcomeFillForTargets({
            state: baseState,
            effect,
            targetIds: [spellTargetId],
            outcomes: [
              {
                targetId: spellTargetId,
                succeeded: false,
                withoutRoll: true,
              },
            ],
          }),
        ],
        damageRoll: glyphDamageRollFill(
          glyphExplosiveRuneDamageRollHole({ profile, effect }),
          [damagePips],
        ),
        spellDamageReductionRolls: [],
        concentrationSavingThrows: [],
        damageDispositions: [],
        saveGatedConditionWithRepeatDamageRepeatSaves: [],
      };

      const needsReduction = releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(
            glyphEffectRef(baseState),
          ),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership,
        },
      });

      expect(needsReduction.tag).toBe("needsHoles");
      if (needsReduction.tag !== "needsHoles") return;
      const reductionHole = requireReleaseHole(
        needsReduction.holes,
        "rolledDice",
      );
      expect(reductionHole).toMatchObject({
        spellDamageReduction: {
          targetId: spellTargetId,
          damageType: "thunder",
        },
      });
      const reductionFill = glyphDamageRollFill(reductionHole, [[4]]);

      expect(
        releaseGlyphExplosiveRune({
          state: baseState,
          profile,
          witness: {
            kind: "tableWitnessedGlyphExplosiveRuneRelease",
            triggerOccurrence: glyphTriggerOccurrenceWitness(
              glyphEffectRef(baseState),
            ),
            coveredAreaId: glyphCoveredAreaId,
            areaMembership: {
              ...areaMembership,
              spellDamageReductionRolls: [reductionFill, reductionFill],
            },
          },
        }),
      ).toMatchObject({
        tag: "invalidWitness",
        reason: "spellDamageReductionMismatch",
      });

      const released = releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(
            glyphEffectRef(baseState),
          ),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            ...areaMembership,
            spellDamageReductionRolls: [reductionFill],
          },
        },
      });

      expect(released.tag).toBe("released");
      if (released.tag !== "released") return;
      const damagedTarget = requireCombatant(released.state, spellTargetId);
      expect(Number(damagedTarget.hp)).toBe(
        Number(requireCombatant(baseState, spellTargetId).hp) - expectedDamage,
      );
      expect(damagedTarget.activeEffects).toContainEqual(
        expect.objectContaining({
          kind: "spellDamageReduction",
          damageType: "thunder",
          usedThisTurn: true,
        }),
      );
    },
  );

  test("explosive-rune release validates area, saving throws, and damage roll witnesses", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
    );
    const effect = glyphEffects(state)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const profile = requireGlyphExplosiveRuneProfile();
    const saveFill = glyphSavingThrowOutcomeFillForTargets({
      state,
      effect,
      targetIds: [spellTargetId],
      outcomes: [
        {
          targetId: spellTargetId,
          succeeded: false,
          withoutRoll: true,
        },
      ],
    });
    const validWitness = {
      kind: "tableWitnessedGlyphExplosiveRuneRelease" as const,
      triggerOccurrence: glyphTriggerOccurrenceWitness(glyphEffectRef(state)),
      coveredAreaId: glyphCoveredAreaId,
      areaMembership: {
        kind: "creaturesInArea" as const,
        affectedTargetIds: [spellTargetId] as const,
        savingThrowOutcomes: [saveFill],
        damageRoll: glyphDamageRollFill(
          glyphExplosiveRuneDamageRollHole({ profile, effect }),
          [[5, 5, 5, 5, 5]],
        ),
        spellDamageReductionRolls: [],
        concentrationSavingThrows: [],
        damageDispositions: [],
        saveGatedConditionWithRepeatDamageRepeatSaves: [],
      },
    };

    expect(
      releaseGlyphExplosiveRune({
        state,
        profile,
        witness: {
          ...validWitness,
          coveredAreaId: battleAreaId("wrong-glyph-covered-area"),
        },
      }),
    ).toMatchObject({ tag: "invalidWitness", reason: "coveredAreaMismatch" });
    const missingSave = releaseGlyphExplosiveRune({
      state,
      profile,
      witness: {
        ...validWitness,
        areaMembership: {
          ...validWitness.areaMembership,
          savingThrowOutcomes: [],
        },
      },
    });
    expect(missingSave.tag).toBe("needsHoles");
    if (missingSave.tag !== "needsHoles") return;
    expect(
      requireReleaseHole(missingSave.holes, "savingThrowOutcome"),
    ).toMatchObject({
      ability: "dex",
      dc: { kind: "fixed", dc: spellSaveDcForCaster(state, spellCasterId) },
      targetIds: [spellTargetId],
      glyphExplosiveRune: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: glyphProcedureRef,
        effectRef: effect.effectRef,
        radiusFeet: 20,
      },
    });
    const areaMembershipWithoutDamageRoll = {
      kind: validWitness.areaMembership.kind,
      affectedTargetIds: validWitness.areaMembership.affectedTargetIds,
      savingThrowOutcomes: validWitness.areaMembership.savingThrowOutcomes,
      spellDamageReductionRolls:
        validWitness.areaMembership.spellDamageReductionRolls,
      concentrationSavingThrows:
        validWitness.areaMembership.concentrationSavingThrows,
      damageDispositions: validWitness.areaMembership.damageDispositions,
      saveGatedConditionWithRepeatDamageRepeatSaves:
        validWitness.areaMembership
          .saveGatedConditionWithRepeatDamageRepeatSaves,
    };
    const missingDamageRoll = releaseGlyphExplosiveRune({
      state,
      profile,
      witness: {
        ...validWitness,
        areaMembership: areaMembershipWithoutDamageRoll,
      },
    });
    expect(missingDamageRoll.tag).toBe("needsHoles");
    if (missingDamageRoll.tag !== "needsHoles") return;
    expect(
      requireReleaseHole(missingDamageRoll.holes, "rolledDice"),
    ).toMatchObject({
      glyphExplosiveRune: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: glyphProcedureRef,
        effectRef: effect.effectRef,
        damage: {
          expr: {
            dice: 5,
            dieSize: 8,
          },
        },
      },
    });
    expect(
      releaseGlyphExplosiveRune({
        state,
        profile,
        witness: {
          ...validWitness,
          areaMembership: {
            ...validWitness.areaMembership,
            savingThrowOutcomes: [
              {
                ...saveFill,
                holeId: "wrong-glyph-save-hole" as typeof saveFill.holeId,
              },
            ],
          },
        },
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "savingThrowOutcomeMismatch",
    });
    const wrongDamageRollHoleId =
      "wrong-glyph-damage-hole" as typeof validWitness.areaMembership.damageRoll.holeId;
    expect(
      releaseGlyphExplosiveRune({
        state,
        profile,
        witness: {
          ...validWitness,
          areaMembership: {
            ...validWitness.areaMembership,
            damageRoll: {
              ...validWitness.areaMembership.damageRoll,
              holeId: wrongDamageRollHoleId,
            },
          },
        },
      }),
    ).toMatchObject({ tag: "invalidWitness", reason: "damageRollMismatch" });
  });

  test("explosive-rune release validates Saving Throw d20 fills before damage", () => {
    const profile = requireGlyphExplosiveRuneProfile();
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
    );
    const effect = glyphEffects(state)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const malformedWithoutRollOutcome = {
      targetId: spellTargetId,
      succeeded: false,
      withoutRoll: true,
      naturalD20: DieRollResult(1),
      // Typed callers cannot construct this fill; the cast exercises runtime
      // boundary validation for decoded or otherwise weak fill input.
    } as Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    >["value"]["outcomes"][number];

    expect(
      releaseGlyphExplosiveRune({
        state,
        profile,
        witness: glyphExplosiveRuneReleaseWitness({
          effectRef: glyphEffectRef(state),
          effect,
          profile,
          state,
          outcomes: [malformedWithoutRollOutcome],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "savingThrowOutcomeMismatch",
    });

    const dangerSenseUnit = unitLibrary.requireUnit(barbarianDangerSenseUnitId);
    const dangerSenseSupport =
      battlePassiveSavingThrowRollModeSupportForUnit(dangerSenseUnit);
    if (dangerSenseSupport === null || dangerSenseSupport === "unsupported") {
      throw new Error("Expected admitted Danger Sense support.");
    }
    const dangerSenseState = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({
        targetHp: 50,
        targetMaxHp: 50,
        targetUnitRefs: [
          {
            unit: dangerSenseUnit,
            supportProfiles: [dangerSenseSupport],
          },
        ],
        targetUnitFeatures: [
          characterBattleFeatureInitForTest(dangerSenseUnit),
        ],
      }),
    );
    const dangerSenseEffect = glyphEffects(dangerSenseState)[0];
    if (dangerSenseEffect === undefined) {
      throw new Error("Expected a Glyph effect in the Danger Sense fixture.");
    }
    expect(
      releaseGlyphExplosiveRune({
        state: dangerSenseState,
        profile,
        witness: glyphExplosiveRuneReleaseWitness({
          effectRef: glyphEffectRef(dangerSenseState),
          effect: dangerSenseEffect,
          profile,
          state: dangerSenseState,
          outcomes: [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: DieRollResult(10),
            },
          ],
        }),
      }).tag,
    ).toBe("released");

    const luckUnit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const luckSupport = battleD20TestNaturalOneRerollSupportForUnit(luckUnit);
    expect(luckSupport).toMatchObject({
      kind: "d20TestNaturalOneReroll",
    });
    if (luckSupport === null || luckSupport === "unsupported") return;
    const luckState = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({
        targetHp: 50,
        targetMaxHp: 50,
        targetUnitRefs: [
          {
            unit: unitLibrary.requireUnit(speciesHalflingLuckUnitId),
            supportProfiles: [luckSupport],
          },
        ],
        targetUnitFeatures: [characterBattleFeatureInitForTest(luckUnit)],
      }),
    );
    const luckEffect = glyphEffects(luckState)[0];
    expect(luckEffect).toBeDefined();
    if (luckEffect === undefined) return;

    expect(
      releaseGlyphExplosiveRune({
        state: luckState,
        profile,
        witness: glyphExplosiveRuneReleaseWitness({
          effectRef: glyphEffectRef(luckState),
          effect: luckEffect,
          profile,
          state: luckState,
          outcomes: [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: DieRollResult(1),
            },
          ],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "savingThrowOutcomeMismatch",
    });

    const rerolled = releaseGlyphExplosiveRune({
      state: luckState,
      profile,
      witness: glyphExplosiveRuneReleaseWitness({
        effectRef: glyphEffectRef(luckState),
        effect: luckEffect,
        profile,
        state: luckState,
        outcomes: [
          {
            targetId: spellTargetId,
            succeeded: false,
            naturalD20: DieRollResult(1),
            d20TestNaturalOneReroll: {
              kind: "reroll",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
              replacement: {
                succeeded: true,
                naturalD20: DieRollResult(12),
              },
            },
          },
        ],
      }),
    });

    expect(rerolled.tag).toBe("released");
    if (rerolled.tag !== "released") return;
    expect(Number(rerolled.state.combatants.get(spellTargetId)?.hp)).toBe(38);
  });

  test("explosive-rune release can clean up a triggered glyph with no creatures in the area", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
    );
    const released = releaseGlyphExplosiveRune({
      state,
      profile: requireGlyphExplosiveRuneProfile(),
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(glyphEffectRef(state)),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership: {
          kind: "noCreaturesInArea",
          affectedTargetIds: [],
        },
      },
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    expect(glyphEffects(released.state)).toEqual([]);
    expect(Number(released.state.combatants.get(spellTargetId)?.hp)).toBe(50);
  });

  test("explosive-rune release requests and consumes Concentration save fills before damage", () => {
    const baseState = stateWithTargetConcentration(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        }),
        glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
      ),
      spellTargetId,
    );
    const effect = glyphEffects(baseState)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const profile = requireGlyphExplosiveRuneProfile();
    const areaMembership = {
      kind: "creaturesInArea" as const,
      affectedTargetIds: [spellTargetId] as const,
      savingThrowOutcomes: [
        glyphSavingThrowOutcomeFillForTargets({
          state: baseState,
          effect,
          targetIds: [spellTargetId],
          outcomes: [
            {
              targetId: spellTargetId,
              succeeded: false,
              withoutRoll: true,
            },
          ],
        }),
      ],
      damageRoll: glyphDamageRollFill(
        glyphExplosiveRuneDamageRollHole({ profile, effect }),
        [[4, 4, 4, 4, 4]],
      ),
      spellDamageReductionRolls: [],
      concentrationSavingThrows: [],
      damageDispositions: [],
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership,
      },
    });

    expect(pending.tag).toBe("needsHoles");
    if (pending.tag !== "needsHoles") return;
    const concentration = requireReleaseHole(
      pending.holes,
      "concentrationSavingThrow",
    );
    expect(concentration.combatantId).toBe(spellTargetId);
    expect(Number(concentration.damageAmount)).toBe(20);
    const failedConcentrationFill = concentrationSavingThrowFill(
      concentration,
      false,
    );

    expect(
      releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(
            glyphEffectRef(baseState),
          ),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            ...areaMembership,
            concentrationSavingThrows: [
              failedConcentrationFill,
              failedConcentrationFill,
            ],
          },
        },
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "concentrationSavingThrowMismatch",
    });

    const released = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership: {
          ...areaMembership,
          concentrationSavingThrows: [failedConcentrationFill],
        },
      },
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const damagedTarget = released.state.combatants.get(spellTargetId);
    expect(Number(damagedTarget?.hp)).toBe(30);
    expect(damagedTarget?.concentration).toBeNull();
  });

  test("explosive-rune release requests and consumes zero-HP damage disposition fills", () => {
    const targetResource = unitLibrary.requireUnit(
      orcRelentlessEnduranceUnitId,
    );
    const baseSession = spellBattle({
      preparedSpells: [],
      spellSlots: [],
      targetHp: 10,
      targetMaxHp: 50,
      targetResources: [{ unit: targetResource }],
      targetUnitRefs: [
        {
          unit: unitLibrary.requireUnit(orcRelentlessEnduranceUnitId),
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const baseState = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      baseSession.state,
    );
    const effect = glyphEffects(baseState)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const profile = requireGlyphExplosiveRuneProfile();
    const areaMembership = {
      kind: "creaturesInArea" as const,
      affectedTargetIds: [spellTargetId] as const,
      savingThrowOutcomes: [
        glyphSavingThrowOutcomeFillForTargets({
          state: baseState,
          effect,
          targetIds: [spellTargetId],
          outcomes: [
            {
              targetId: spellTargetId,
              succeeded: false,
              withoutRoll: true,
            },
          ],
        }),
      ],
      damageRoll: glyphDamageRollFill(
        glyphExplosiveRuneDamageRollHole({ profile, effect }),
        [[4, 4, 4, 4, 4]],
      ),
      spellDamageReductionRolls: [],
      concentrationSavingThrows: [],
      damageDispositions: [],
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership,
      },
    });

    expect(pending.tag).toBe("needsHoles");
    if (pending.tag !== "needsHoles") return;
    const disposition = requireReleaseHole(
      pending.holes,
      "attackDamageDisposition",
    );
    expect(disposition.targetId).toBe(spellTargetId);
    expect(disposition.choices).toContainEqual({
      kind: "zeroHitPointReplacement",
      procedureRef: requireCharacterUnitProcedureRefForTest(
        battleRuntimeSessionForTest({
          state: baseState,
          context: baseSession.context,
        }),
        spellTargetId,
        orcRelentlessEnduranceUnitId,
      ),
    });
    const replacementDispositionFill = attackDamageDispositionFill(
      disposition,
      {
        kind: "zeroHitPointReplacement",
        procedureRef: requireCharacterUnitProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: baseState,
            context: baseSession.context,
          }),
          spellTargetId,
          orcRelentlessEnduranceUnitId,
        ),
      },
    );

    expect(
      releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(
            glyphEffectRef(baseState),
          ),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            ...areaMembership,
            damageDispositions: [
              replacementDispositionFill,
              replacementDispositionFill,
            ],
          },
        },
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "damageDispositionMismatch",
    });

    const released = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership: {
          ...areaMembership,
          damageDispositions: [replacementDispositionFill],
        },
      },
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
    const damagedTarget = released.state.combatants.get(spellTargetId);
    expect(Number(damagedTarget?.hp)).toBe(1);
  });

  test("explosive-rune release rejects duplicate Hideous Laughter repeat-save fills", () => {
    const baseSession = glyphBattleSession({
      preparedSpells: [spellRecord(saveGatedConditionWithRepeatUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetHp: 50,
      targetMaxHp: 50,
    });
    const baseState = stateWithTargetStagedCondition(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
        }),
        baseSession.state,
      ),
      spellTargetId,
      requireCharacterSpellProcedureRefForTest(
        baseSession,
        spellCasterId,
        spellSlotInvocationRef(
          saveGatedConditionWithRepeatUnitId,
          1,
          "saveGatedConditionWithRepeat",
        ),
      ),
    );
    const effect = glyphEffects(baseState)[0];
    expect(effect).toBeDefined();
    if (effect === undefined) return;
    const profile = requireGlyphExplosiveRuneProfile();
    const areaMembership = {
      kind: "creaturesInArea" as const,
      affectedTargetIds: [spellTargetId] as const,
      savingThrowOutcomes: [
        glyphSavingThrowOutcomeFillForTargets({
          state: baseState,
          effect,
          targetIds: [spellTargetId],
          outcomes: [
            {
              targetId: spellTargetId,
              succeeded: false,
              withoutRoll: true,
            },
          ],
        }),
      ],
      damageRoll: glyphDamageRollFill(
        glyphExplosiveRuneDamageRollHole({ profile, effect }),
        [[4, 4, 4, 4, 4]],
      ),
      spellDamageReductionRolls: [],
      concentrationSavingThrows: [],
      damageDispositions: [],
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership,
      },
    });

    expect(pending.tag).toBe("needsHoles");
    if (pending.tag !== "needsHoles") return;
    const repeatSave = requireReleaseHole(pending.holes, "savingThrowOutcome");
    expect(repeatSave).toMatchObject({
      saveGatedConditionRepeatSave: {
        targetId: spellTargetId,
        trigger: "damage",
      },
    });
    const repeatSaveFill = repeatSavingThrowOutcomeFill(repeatSave, [
      {
        targetId: spellTargetId,
        succeeded: false,
        withoutRoll: true,
      },
    ]);
    const resumed = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(
          glyphEffectRef(baseState),
        ),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership: {
          ...areaMembership,
          saveGatedConditionWithRepeatDamageRepeatSaves: [repeatSaveFill],
        },
      },
    });
    expect(resumed.tag).not.toBe("invalidWitness");
    if (resumed.tag === "needsHoles") {
      expect(
        resumed.holes.some(
          (hole) =>
            hole.kind === "savingThrowOutcome" &&
            "saveGatedConditionRepeatSave" in hole,
        ),
      ).toBe(false);
    }

    expect(
      releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(
            glyphEffectRef(baseState),
          ),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            ...areaMembership,
            saveGatedConditionWithRepeatDamageRepeatSaves: [
              repeatSaveFill,
              repeatSaveFill,
            ],
          },
        },
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "saveGatedConditionWithRepeatDamageRepeatSaveMismatch",
    });
  });

  test("movement invalidation consumes cast-location and more-than-threshold witnesses", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "closeableObject", objectId: glyphCloseableObjectId },
      }),
    );

    expect(
      endGlyphDurableOccurrence({
        state,
        witness: movementInvalidationWitness({
          effectRef: glyphEffectRef(state),
          castLocationId: battleTablePositionId("wrong-cast-location"),
          distanceFeet: movementFeet(11),
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "castLocationMismatch",
    });
    expect(
      endGlyphDurableOccurrence({
        state,
        witness: movementInvalidationWitness({
          effectRef: glyphEffectRef(state),
          castLocationId: glyphCastLocationId,
          distanceFeet: movementFeet(10),
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "movementNotBeyondThreshold",
    });

    const ended = endGlyphDurableOccurrence({
      state,
      witness: movementInvalidationWitness({
        effectRef: glyphEffectRef(state),
        castLocationId: glyphCastLocationId,
        distanceFeet: movementFeet(11),
      }),
    });

    expect(ended.tag).toBe("ended");
    if (ended.tag !== "ended") return;
    expect(ended.reason).toBe("movementInvalidation");
    expect(glyphEffects(ended.state)).toEqual([]);
  });

  test("end witnesses select an exact occurrence across removal, recast, and clone", () => {
    const template = requireCompletedGlyphEffect({
      anchor: { kind: "closeableObject", objectId: glyphCloseableObjectId },
    });
    const stateWithFirst = stateWithGlyphEffect(template);
    const first = glyphEffects(stateWithFirst)[0];
    if (first === undefined) {
      throw new Error("Expected the first stored Glyph occurrence.");
    }
    const firstEnd = endGlyphDurableOccurrence({
      state: stateWithFirst,
      witness: movementInvalidationWitness({
        effectRef: first.effectRef,
        castLocationId: glyphCastLocationId,
        distanceFeet: movementFeet(11),
      }),
    });
    expect(firstEnd.tag).toBe("ended");

    const stateWithRecast = stateWithGlyphEffect(template, firstEnd.state);
    const recast = glyphEffects(stateWithRecast)[0];
    if (recast === undefined) {
      throw new Error("Expected the recast Glyph occurrence.");
    }
    expect(recast.effectRef).not.toBe(first.effectRef);
    const explosiveRuneProfile = requireGlyphExplosiveRuneProfile();
    const firstDamageHole = glyphExplosiveRuneDamageRollHole({
      profile: explosiveRuneProfile,
      effect: first,
    });
    const recastDamageHole = glyphExplosiveRuneDamageRollHole({
      profile: explosiveRuneProfile,
      effect: recast,
    });
    expect(firstDamageHole.glyphExplosiveRune.effectRef).toBe(first.effectRef);
    expect(recastDamageHole.glyphExplosiveRune.effectRef).toBe(
      recast.effectRef,
    );
    expect(recastDamageHole.holeId).not.toBe(firstDamageHole.holeId);

    expect(
      endGlyphDurableOccurrence({
        state: stateWithRecast,
        witness: movementInvalidationWitness({
          effectRef: first.effectRef,
          castLocationId: glyphCastLocationId,
          distanceFeet: movementFeet(11),
        }),
      }),
    ).toMatchObject({ tag: "notFound" });
    expect(glyphEffects(stateWithRecast)).toEqual([recast]);

    expect(
      releaseGlyphExplosiveRune({
        state: stateWithRecast,
        profile: explosiveRuneProfile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(first.effectRef),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            kind: "noCreaturesInArea",
            affectedTargetIds: [],
          },
        },
      }),
    ).toMatchObject({ tag: "notFound" });
    expect(glyphEffects(stateWithRecast)).toEqual([recast]);

    expect(
      endGlyphDurableOccurrence({
        state: stateWithRecast,
        witness: {
          ...movementInvalidationWitness({
            effectRef: recast.effectRef,
            castLocationId: glyphCastLocationId,
            distanceFeet: movementFeet(11),
          }),
          sourceEffectId: battleSpellEffectOccurrenceId(
            "wrong-glyph-source-effect",
          ),
        },
      }),
    ).toMatchObject({ tag: "invalidWitness", reason: "sourceEffectMismatch" });

    const caster = requireCombatant(stateWithRecast, spellCasterId);
    const stateWithClonedOccurrence = {
      ...stateWithRecast,
      combatants: new Map(stateWithRecast.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.effectRef === recast.effectRef ? { ...effect } : effect,
        ),
      }),
    };
    const clonedEnd = endGlyphDurableOccurrence({
      state: stateWithClonedOccurrence,
      witness: movementInvalidationWitness({
        effectRef: recast.effectRef,
        castLocationId: glyphCastLocationId,
        distanceFeet: movementFeet(11),
      }),
    });
    expect(clonedEnd.tag).toBe("ended");
    expect(glyphEffects(clonedEnd.state)).toEqual([]);
  });
});

function requireGlyphProfile(): GlyphDurableOccurrenceProfile {
  const profile = glyphDurableOccurrenceProfileForSpell(
    spellRecord(glyphOfWardingUnitId),
  );
  if (profile === null) {
    throw new Error("Expected Glyph of Warding durable occurrence profile.");
  }
  return profile;
}

function requireGlyphExplosiveRuneProfile(): GlyphExplosiveRuneReleaseProfile {
  const profile = glyphExplosiveRuneReleaseProfileForSpell(
    spellRecord(glyphOfWardingUnitId),
  );
  if (profile === null) {
    throw new Error("Expected Glyph of Warding explosive rune profile.");
  }
  return profile;
}

function requireGlyphStoredSpellProfile(): GlyphStoredSpellReleaseProfile {
  const profile = glyphStoredSpellReleaseProfileForSpell(
    spellRecord(glyphOfWardingUnitId),
  );
  if (profile === null) {
    throw new Error("Expected Glyph of Warding stored-spell profile.");
  }
  return profile;
}

function storedSpellInvocation(
  storedSpellId: string,
  slotLevel: TestSpellSlotLevel,
  expectedProcedure?: GlyphStoredSpellInvocationCandidate["procedure"],
  caster: StoredSpellInvocationCaster = {},
): GlyphStoredSpellInvocationCandidate {
  const session = spellBattle({
    ...caster,
    preparedSpells: [spellRecord(storedSpellId)],
    spellSlots: caster.spellSlots ?? [{ spellLevel: slotLevel, count: 1 }],
  });
  const invocation = session.context.characters
    .get(spellCasterId)
    ?.spellPresentationSources.map((source) => source.invocation)
    .find(
      (
        candidate,
      ): candidate is AuthoredSelectedSpellInvocation &
        GlyphStoredSpellInvocationCandidate =>
        candidate.spell.id === storedSpellId &&
        "access" in candidate &&
        candidate.access.tag === "prepared" &&
        "resource" in candidate &&
        candidate.resource.tag === "spellSlot" &&
        Number(candidate.resource.slotLevel) === slotLevel &&
        ("targeting" in candidate ||
          candidate.procedure === "selfTransformationMode") &&
        (expectedProcedure === undefined ||
          candidate.procedure === expectedProcedure),
    );
  if (invocation === undefined) {
    throw new Error(
      `Expected prepared spell-slot invocation for ${storedSpellId}.`,
    );
  }
  const { sourceProcedureRef: _selectedProcedureRef, ...unselectedInvocation } =
    invocation;
  return unselectedInvocation;
}

function storedSpellProcedureRefInState(
  state: BattleState,
  invocation: GlyphStoredSpellInvocationCandidate,
): BattleProcedureExecutionRef {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character spell caster.");
  }
  const procedureRef = characterStoredSpellProcedureRef(
    caster.origin.execution,
    invocation,
  );
  if (procedureRef === undefined) {
    throw new Error("Expected stored spell procedure binding.");
  }
  return procedureRef;
}

function characterSpellProcedureForSubject(
  state: BattleState,
  procedureRef: BattleProcedureExecutionRef,
) {
  const caster = requireCombatant(state, spellCasterId);
  return caster.origin.kind === "character"
    ? characterSpellProcedure(caster.origin.execution, procedureRef, caster)
    : undefined;
}

function storedSingleCreatureReleaseWitness(
  effectRef: BattleEffectExecutionRef,
  fills: readonly BattleFill[],
  targetId: CombatantId = spellTargetId,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = storedSingleCreatureSpellTargetFacts(
    targetId,
  ),
  hostilePlacement:
    | ReturnType<typeof storedHostilePlacementNotApplicable>
    | ReturnType<
        typeof storedHarmfulObjectPlacementWitness
      > = storedHostilePlacementNotApplicable(),
) {
  return {
    kind: "tableWitnessedGlyphStoredSpellRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(effectRef),
    triggeringCreatureId: spellTargetId,
    targeting: {
      kind: "storedSpellTargetsTriggeringCreature" as const,
      targetId,
      targetSpatialFacts,
    },
    hostilePlacement,
    fills,
  };
}

function storedSingleCreatureSpellTargetFacts(
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef = glyphProcedureRef,
): readonly BattleTargetSpatialFact[] {
  return [
    {
      kind: "spellTarget",
      casterId: spellCasterId,
      targetId,
      sourceProcedureRef,
    },
  ];
}

function storedKnownWillingSingleCreatureSpellTargetFacts(
  sourceProcedureRef: BattleProcedureExecutionRef,
): readonly BattleTargetSpatialFact[] {
  return [
    ...storedSingleCreatureSpellTargetFacts(spellTargetId, sourceProcedureRef),
    {
      kind: "spellTargetKnownWilling",
      casterId: spellCasterId,
      targetId: spellTargetId,
      sourceProcedureRef,
    },
  ];
}

function storedSpiritualWeaponTargetFacts(
  targetId: CombatantId,
  forcePositionId: ReturnType<
    typeof battleTablePositionId
  > = glyphHarmfulObjectPositionId,
  sourceProcedureRef: BattleProcedureExecutionRef = glyphProcedureRef,
): readonly BattleTargetSpatialFact[] {
  return [
    {
      kind: "spatialMeleeSpellAttackProxyTargetWithinReach",
      casterId: spellCasterId,
      targetId,
      sourceProcedureRef,
      forcePositionId,
      reachFeet: movementFeet(5),
    },
  ];
}

function stateWithUnrelatedReadiedSpell(
  session: BattleRuntimeSession,
  trigger: "spellCast" | "saveFailed" = "spellCast",
): BattleRuntimeSession {
  const state = session.state;
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character spell caster.");
  }
  const characterContext = session.context.characters.get(spellCasterId);
  if (characterContext === undefined) {
    throw new Error("Expected spell caster runtime context.");
  }
  const readiedProcedureSource = characterContext.spellPresentationSources.find(
    (source) =>
      source.invocation.spell.id === guidingBoltUnitId &&
      source.invocation.procedure === "spellAttackDamage" &&
      source.invocation.resource.tag === "spellSlot" &&
      Number(source.invocation.resource.slotLevel) === 1,
  );
  if (readiedProcedureSource === undefined) {
    throw new Error("Expected prepared Guiding Bolt readied-spell invocation.");
  }
  const procedureRef = readiedProcedureSource.procedureRef;
  return battleRuntimeSessionForTest({
    context: session.context,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: procedureRef,
          effectKind: "readiedSpell",
        },
      }),
      readiedSpells: new Map(state.readiedSpells).set(spellCasterId, {
        procedureRef,
        trigger,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellCasterId,
          round: Round(1),
        },
      }),
    },
  });
}

function stateWithOrdinaryMindSpikeConcentration(
  state: BattleState,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character spell caster.");
  }
  const procedureRef = characterSpellProcedureRef(
    caster.origin.execution,
    storedSpellInvocation(mindSpikeUnitId, 2),
  );
  if (procedureRef === undefined) {
    throw new Error("Expected bound Mind Spike procedure.");
  }
  const durationEffect = {
    kind: "spellConcentrationDuration",
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: procedureRef,
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(600),
    },
  } as const;
  const allocatedState = battleStateWithAllocatedEffectForTest({
    state,
    ownerId: spellCasterId,
    effect: durationEffect,
  });
  const allocatedCaster = requireCombatant(allocatedState, spellCasterId);
  return {
    ...allocatedState,
    combatants: new Map(allocatedState.combatants).set(spellCasterId, {
      ...allocatedCaster,
      concentration: {
        sourceProcedureRef: durationEffect.sourceProcedureRef,
        effectKind: "spellEffect",
      },
    }),
  };
}

function spellCastInterruptionReactionSpellcasting(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  return {
    spellcastingSource: {
      tag: "classSpellcasting",
      className: "wizard" as const,
      abilityModifier: abilityModifier(3),
    },
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: [spellRecord(spellCastInterruptionReactionUnitId)],
    featurePreparedSpells: [],
    spellAccesses: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: [{ spellLevel: 3 as const, count: 1 }],
  };
}

function spellCastInterruptionReactionTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): BattleSpellCastReactionFact {
  return {
    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spellCastInterruptionReactionUnitId),
    ),
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly BattleSpellCastReactionFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

function storedAreaReleaseWitness(input: {
  readonly effectRef: BattleEffectExecutionRef;
  readonly originAnchorId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly hostilePlacement?: ReturnType<
    | typeof storedHostilePlacementNotApplicable
    | typeof storedTrapPlacementWitness
    | typeof storedHarmfulObjectPlacementWitness
  >;
}) {
  return {
    kind: "tableWitnessedGlyphStoredSpellRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(input.effectRef),
    triggeringCreatureId: spellTargetId,
    targeting: {
      kind: "storedSpellAreaCenteredOnTriggeringCreature" as const,
      originAnchorId: input.originAnchorId,
    },
    hostilePlacement:
      input.hostilePlacement ?? storedHostilePlacementNotApplicable(),
    fills: input.fills,
  };
}

function glyphStoredAreaChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
  value: Extract<BattleFill, { readonly kind: "spellAreaChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value,
  };
}

function gustOfWindGlyphSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const fill = directionalPersistentAreaSavingThrowOutcomeFill(
    hole,
    [{ targetId: spellTargetId, succeeded: true }],
    { areaId: glyphStoredGustOfWindAreaId },
  );
  const value = fill.value;
  if (
    !("area" in value) ||
    value.area.kind !== "directionalPersistentAreaArea"
  ) {
    throw new Error("Expected Gust of Wind to produce a Line area fill.");
  }
  return {
    ...fill,
    value: {
      ...value,
      area: {
        ...value.area,
        originAnchorId: spellTargetId,
      },
    },
  };
}

function glyphStoredHypnoticPatternSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  originAnchorId: CombatantId = spellTargetId,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "saveGatedAreaControlArea",
        originAnchorId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 30,
        affectedCreatureWitnesses: outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          canSeePattern: true,
        })),
      },
      outcomes,
    },
  };
}

function storedHostilePlacementNotApplicable() {
  return {
    kind: "storedSpellHostilePlacementNotApplicable" as const,
  };
}

function storedTrapPlacementWitness() {
  return {
    kind: "storedSpellHostilePlacement" as const,
    subject: "traps" as const,
    areaId: greaseAreaId,
    placement: "as_close_as_possible_to_triggering_creature" as const,
    attackTargetId: spellTargetId,
  };
}

function storedHarmfulObjectPlacementWitness() {
  return {
    kind: "storedSpellHostilePlacement" as const,
    subject: "harmful_objects" as const,
    positionId: glyphHarmfulObjectPositionId,
    placement: "as_close_as_possible_to_triggering_creature" as const,
    attackTargetId: spellTargetId,
  };
}

function greaseGlyphSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const fill = greaseSavingThrowOutcomeFill(hole, outcomes);
  const value = fill.value;
  if (!("area" in value)) {
    throw new Error("Expected Grease to produce an area saving throw fill.");
  }
  if (value.area.kind !== "persistentAreaSaveConditionArea") {
    throw new Error("Expected Grease to produce a grease ground area fill.");
  }
  return {
    ...fill,
    value: {
      ...value,
      area: {
        ...value.area,
        areaId: greaseAreaId,
        originAnchorId: spellTargetId,
      },
    },
  };
}

function greaseSavingThrowOutcomeFillWithAreaId(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  areaId: ReturnType<typeof battleAreaId>,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const value = fill.value;
  if (!("area" in value)) {
    throw new Error("Expected Grease to produce an area saving throw fill.");
  }
  if (value.area.kind !== "persistentAreaSaveConditionArea") {
    throw new Error("Expected Grease to produce a grease ground area fill.");
  }
  return {
    ...fill,
    value: {
      ...value,
      area: {
        ...value.area,
        areaId,
      },
    },
  };
}

function completedGlyphInscriptionWitness(input: {
  readonly anchor: CompletedGlyphInscriptionWitness["anchor"];
  readonly sourceSpellLevel?: BattleSpellEffectLevel;
  readonly release?: CompletedGlyphInscriptionWitness["release"];
}): CompletedGlyphInscriptionWitness {
  return {
    kind: "completedGlyphInscription",
    sourceEffectId: glyphSourceEffectId,
    sourceProcedureRef: glyphProcedureRef,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel: input.sourceSpellLevel ?? testBattleSpellEffectLevel(3),
    release: input.release ?? { kind: "explosiveRune", damageType: "thunder" },
    anchor: input.anchor,
    coveredAreaId: glyphCoveredAreaId,
    castLocationId: glyphCastLocationId,
  };
}

function requireCompletedGlyphEffect(input: {
  readonly anchor: CompletedGlyphInscriptionWitness["anchor"];
  readonly sourceSpellLevel?: BattleSpellEffectLevel;
  readonly release?: CompletedGlyphInscriptionWitness["release"];
}): GlyphDurableOccurrenceTemplate {
  const result = glyphDurableOccurrenceEffectFromCompletedInscription({
    profile: requireGlyphProfile(),
    witness: completedGlyphInscriptionWitness({
      anchor: input.anchor,
      ...(input.sourceSpellLevel === undefined
        ? {}
        : { sourceSpellLevel: input.sourceSpellLevel }),
      ...(input.release === undefined ? {} : { release: input.release }),
    }),
  });
  if (result.tag !== "created") {
    throw new Error("Expected completed Glyph witness to create an effect.");
  }
  return result.effect;
}

function movementInvalidationWitness(input: {
  readonly effectRef: BattleEffectExecutionRef;
  readonly castLocationId: ReturnType<typeof battleTablePositionId>;
  readonly distanceFeet: ReturnType<typeof movementFeet>;
}): GlyphDurableOccurrenceEndWitness {
  return {
    kind: "tableWitnessedGlyphMovementInvalidation",
    effectRef: input.effectRef,
    sourceEffectId: glyphSourceEffectId,
    movedSubject: "inscribed_surface_or_object",
    castLocationId: input.castLocationId,
    distanceFrom: "cast_location",
    distanceFeet: input.distanceFeet,
  };
}

function glyphTriggerOccurrenceWitness(effectRef: BattleEffectExecutionRef) {
  return {
    kind: "tableWitnessedGlyphTriggerOccurrence" as const,
    effectRef,
    sourceEffectId: glyphSourceEffectId,
  };
}

function glyphEffectRef(state: BattleState): BattleEffectExecutionRef {
  const effect = glyphEffects(state)[0];
  if (effect === undefined) {
    throw new Error("Expected a stored Glyph occurrence.");
  }
  return effect.effectRef;
}

function glyphBattle(
  input: Parameters<typeof spellBattle>[0] = {},
): BattleState {
  return glyphBattleSession(input).state;
}

function glyphBattleSession(
  input: Parameters<typeof spellBattle>[0] = {},
): BattleRuntimeSession {
  return spellBattle({ preparedSpells: [], spellSlots: [], ...input });
}

function stateWithGlyphEffect(
  effect: GlyphDurableOccurrenceTemplate,
  state: BattleState = glyphBattle(),
): BattleState {
  const added = addGlyphDurableOccurrence({ state, effect });
  if (added.tag !== "added") {
    throw new Error("Expected Glyph occurrence to be added.");
  }
  return added.state;
}

function sessionWithGlyphEffect(
  effect: GlyphDurableOccurrenceTemplate,
  input: Parameters<typeof spellBattle>[0] = {},
): BattleRuntimeSession {
  const session = glyphBattleSession(input);
  return battleRuntimeSessionForTest({
    state: stateWithGlyphEffect(effect, session.state),
    context: session.context,
  });
}

function stateWithPriorCasterSpellSlotUse(
  state: BattleState,
  slotLevel: TestSpellSlotLevel,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character caster in Glyph test fixture.");
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Expected spellcasting caster in Glyph test fixture.");
  }
  const combatants = new Map(state.combatants).set(spellCasterId, {
    ...caster,
    origin: {
      ...caster.origin,
      spellcasting: {
        ...spellcasting,
        spellSlots: spellcasting.spellSlots.map((slot) =>
          slot.spellLevel === slotLevel
            ? {
                ...slot,
                expended: resourceCount(
                  Math.min(Number(slot.count), Number(slot.expended) + 1),
                ),
              }
            : slot,
        ),
      },
    },
  });
  return {
    ...state,
    combatants,
    currentTurnResources: {
      ...state.currentTurnResources,
      spellSlotUsesThisTurn: [
        ...state.currentTurnResources.spellSlotUsesThisTurn,
        { kind: "committed" as const, combatantId: spellCasterId },
      ],
      levelOnePlusSpellCastsThisTurn: [
        ...state.currentTurnResources.levelOnePlusSpellCastsThisTurn,
        spellCasterId,
      ],
    },
  };
}

function casterSpellSlotExpended(
  state: BattleState,
  slotLevel: TestSpellSlotLevel,
): number | undefined {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected character caster in Glyph test fixture.");
  }
  return caster.origin.spellcasting?.spellSlots.find(
    (slot) => slot.spellLevel === slotLevel,
  )?.expended;
}

function glyphEffects(
  state: BattleState,
): readonly StoredGlyphDurableOccurrenceEffect[] {
  return (
    state.combatants
      .get(spellCasterId)
      ?.activeEffects.filter(
        (effect): effect is StoredGlyphDurableOccurrenceEffect =>
          effect.kind === "glyphDurableOccurrence",
      ) ?? []
  );
}

function stateWithoutCaster(state: BattleState): BattleState {
  const combatants = new Map(state.combatants);
  combatants.delete(spellCasterId);
  return { ...state, combatants };
}

function stateWithTargetConcentration(
  state: BattleState,
  combatantId: typeof spellTargetId,
): BattleState {
  const target = requireCombatant(state, combatantId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...target,
      concentration: {
        sourceProcedureRef: glyphProcedureRef,
        effectKind: "spellEffect",
      },
    }),
  };
}

function stateWithTargetStagedCondition(
  state: BattleState,
  combatantId: typeof spellTargetId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  const saveGatedConditionWithRepeatEffect = {
    kind: "saveGatedConditionWithRepeat",
    sourceProcedureRef,
    sourceCombatantId: spellCasterId,
    conditionHadNonSpellProneSource: false,
    conditionHadNonSpellIncapacitatedSource: false,
    repeatSaveRollMode: null,
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(60),
    },
  } as const;
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: combatantId,
    effect: saveGatedConditionWithRepeatEffect,
  });
}

function stateWithSpellDamageReduction(
  state: BattleState,
  targetId: CombatantId,
  damageType: DamageType,
): BattleState {
  const spellDamageReductionEffect = {
    kind: "spellDamageReduction",
    sourceProcedureRef: glyphProcedureRef,
    sourceCombatantId: spellCasterId,
    damageType,
    amount: { dice: 1, dieSize: 4 },
    usedThisTurn: false,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(60),
    },
  } as const;
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: targetId,
    effect: spellDamageReductionEffect,
  });
}

function damageImmuneHumanoidStatBlock(damageType: "force" | "thunder") {
  const target = statBlockWithCreatureType("humanoid");
  return {
    ...target,
    statBlock: {
      ...target.statBlock,
      immunities: decodeCreatureImmunityDeclarationSync({
        damageTypes: [damageType] as const,
      }),
    },
  };
}

function requireCombatant(state: BattleState, combatantId: CombatantId) {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error("Expected combatant in Glyph test fixture.");
  }
  return combatant;
}

function requireReleaseHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} release hole.`);
  }
  return hole;
}

function expectNeedsReleaseHoles(
  result: ReturnType<typeof releaseGlyphStoredSpell>,
): readonly BattleHole[] {
  expect(result.tag).toBe("needsHoles");
  if (result.tag !== "needsHoles") {
    throw new Error("Expected stored Glyph release to need holes.");
  }
  return result.holes;
}

function relationshipDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "damageRelationshipDecisions" }>,
  answer: boolean,
): Extract<BattleFill, { readonly kind: "damageRelationshipDecisions" }> {
  const [firstQuestion, ...remainingQuestions] = hole.questions;
  if (firstQuestion === undefined) {
    throw new Error("Expected a relationship decision question.");
  }
  return {
    kind: "damageRelationshipDecisions",
    holeId: hole.holeId,
    answers: [
      { questionId: firstQuestion.questionId, answer },
      ...remainingQuestions.map((question) => ({
        questionId: question.questionId,
        answer,
      })),
    ],
  };
}

function spatialMeleeSpellAttackProxyGlyphReleaseDriver(
  input: Parameters<typeof spellBattle>[0] = {},
) {
  const casterClassLevels = input.casterClassLevels ?? [
    { className: "cleric" as const, level: 5 },
  ];
  const storedInvocation = storedSpellInvocation(
    spiritualWeaponUnitId,
    2,
    undefined,
    { casterClassLevels },
  );
  const effect = requireCompletedGlyphEffect({
    anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
    release: { kind: "spellGlyph", storedInvocation },
  });
  const session = sessionWithGlyphEffect(effect, {
    casterClassLevels,
    preparedSpells: [spellRecord(spiritualWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...input,
  });
  const state = session.state;
  const procedureRef = storedSpellProcedureRefInState(state, storedInvocation);
  return {
    session,
    state,
    resolve: (
      fills: readonly BattleFill[],
      releaseState: BattleState = state,
    ) =>
      releaseGlyphStoredSpell({
        executionRegistry,
        state: releaseState,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness(
          glyphEffectRef(state),
          fills,
          spellTargetId,
          storedSpiritualWeaponTargetFacts(
            spellTargetId,
            glyphHarmfulObjectPositionId,
            procedureRef,
          ),
          storedHarmfulObjectPlacementWitness(),
        ),
      }),
  };
}

function storedSpiritualWeaponDamageFrontier(
  release: ReturnType<typeof spatialMeleeSpellAttackProxyGlyphReleaseDriver>,
  state: BattleState = release.state,
) {
  const needsForcePosition = release.resolve([], state);
  const forcePosition = requireReleaseHole(
    expectNeedsReleaseHoles(needsForcePosition),
    "spatialMeleeSpellAttackProxyPosition",
  );
  const forcePositionFill = spatialMeleeSpellAttackProxyPositionFill({
    hole: forcePosition,
    positionId: glyphHarmfulObjectPositionId,
  });
  const needsAttackRoll = release.resolve(
    [forcePositionFill],
    needsForcePosition.state,
  );
  const attackRoll = requireReleaseHole(
    expectNeedsReleaseHoles(needsAttackRoll),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 18,
    naturalD20: 12,
  });
  const needsDamageRoll = release.resolve(
    [forcePositionFill, attackFill],
    needsAttackRoll.state,
  );
  const damageRoll = requireReleaseHole(
    expectNeedsReleaseHoles(needsDamageRoll),
    "rolledDice",
  );
  const damageFill = glyphDamageRollFill(damageRoll, [[5]]);
  const fills = [forcePositionFill, attackFill, damageFill] as const;
  return {
    fills,
    result: release.resolve(fills, needsDamageRoll.state),
  };
}

function controlledVerticalSuspensionInitialRiseFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "controlledVerticalSuspensionInitialRise" }
  >,
): Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionInitialRise" }
> {
  return {
    kind: "controlledVerticalSuspensionInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(12) },
  };
}

function concentrationSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "concentrationSavingThrow" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }> {
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: { succeeded, withoutRoll: true },
  };
}

function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

function glyphSavingThrowOutcomeFillForTargets(input: {
  readonly state: BattleState;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
  readonly targetIds: readonly [CombatantId, ...CombatantId[]];
  readonly outcomes: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"];
}): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return glyphSavingThrowOutcomeFill(
    requireGlyphSavingThrowOutcomeHole({
      state: input.state,
      effect: input.effect,
      targetIds: input.targetIds,
    }),
    input.outcomes,
  );
}

function glyphExplosiveRuneReleaseWitness(input: {
  readonly state: BattleState;
  readonly effectRef: BattleEffectExecutionRef;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly outcomes: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"];
}) {
  const targetIds = [spellTargetId] as const;
  return {
    kind: "tableWitnessedGlyphExplosiveRuneRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(input.effectRef),
    coveredAreaId: glyphCoveredAreaId,
    areaMembership: {
      kind: "creaturesInArea" as const,
      affectedTargetIds: targetIds,
      savingThrowOutcomes: [
        glyphSavingThrowOutcomeFillForTargets({
          state: input.state,
          effect: input.effect,
          targetIds,
          outcomes: input.outcomes,
        }),
      ],
      damageRoll: glyphDamageRollFill(
        glyphExplosiveRuneDamageRollHole({
          profile: input.profile,
          effect: input.effect,
        }),
        [[5, 5, 5, 5, 5]],
      ),
      spellDamageReductionRolls: [],
      concentrationSavingThrows: [],
      damageDispositions: [],
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    },
  };
}

function requireGlyphSavingThrowOutcomeHole(input: {
  readonly state: BattleState;
  readonly effect: StoredGlyphDurableOccurrenceEffect;
  readonly targetIds: readonly [CombatantId, ...CombatantId[]];
}): NonNullable<ReturnType<typeof glyphExplosiveRuneSavingThrowOutcomeHole>> {
  const hole = glyphExplosiveRuneSavingThrowOutcomeHole(input);
  if (hole === null) {
    throw new Error("Expected Glyph explosive rune Saving Throw outcome hole.");
  }
  return hole;
}

function glyphSavingThrowOutcomeFill(
  hole: NonNullable<
    ReturnType<typeof glyphExplosiveRuneSavingThrowOutcomeHole>
  >,
  outcomes: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function repeatSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function fireballGlyphSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  objectIgnitionFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectIgnitionDisposition;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "pointOriginSphereSaveDamageArea",
        originAnchorId: spellTargetId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts,
      },
      outcomes,
    },
  };
}

function thunderwaveGlyphSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        ...selfOriginCubePushArea(
          outcomes.map((outcome) => outcome.targetId),
          outcomes.flatMap((outcome) =>
            outcome.succeeded ? [] : [outcome.targetId],
          ),
        ),
        originAnchorId: spellTargetId,
      },
      outcomes,
    },
  };
}

function glyphDamageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly [NonEmptyDamageDice, ...ReadonlyArray<NonEmptyDamageDice>],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...remainingGroups] = groups;
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroupFromNumbers(firstGroup),
      ...remainingGroups.map(rolledDiceGroupFromNumbers),
    ],
  };
}

function rolledDiceGroupFromNumbers(
  group: NonEmptyDamageDice,
): RolledDiceGroup {
  const [first, ...rest] = group;
  return {
    results: [DieRollResult(first), ...rest.map(DieRollResult)],
  };
}

function requireGlyphMechanics(spell: SpellRecord): GlyphWardingMechanics {
  if (spell.mechanics.family !== "glyph_warding") {
    throw new Error("Expected Glyph of Warding mechanics in test fixture.");
  }
  return spell.mechanics;
}

function testBattleSpellEffectLevel(value: number) {
  const parsed = parseBattleSpellEffectLevel(value);
  if (parsed === null) {
    throw new Error(`Expected ${value} to be a valid battle spell level.`);
  }
  return parsed;
}

defineSelectedIdentityReplayWitness({
  describeLabel: "Glyph of Warding selected identity replay",
  taskId: "L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE",
  initialProjection: {
    unitId: glyphOfWardingUnitId,
    procedure: "initial",
    profileAdmitted: false,
  },
  units: [
    {
      unitId: glyphOfWardingUnitId,
      procedures: [
        glyphReplayProcedure(
          "doReplayGlyphDurableOccurrence",
          "glyphDurableOccurrence",
          () =>
            glyphDurableOccurrenceProfileForSpell(
              spellRecord(glyphOfWardingUnitId),
            ) !== null,
        ),
        glyphReplayProcedure(
          "doReplayGlyphExplosiveRuneRelease",
          "glyphExplosiveRuneRelease",
          () =>
            glyphExplosiveRuneReleaseProfileForSpell(
              spellRecord(glyphOfWardingUnitId),
            ) !== null,
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredSpellRelease",
          "glyphStoredSpellRelease",
          () =>
            glyphStoredSpellReleaseProfileForSpell(
              spellRecord(glyphOfWardingUnitId),
            ) !== null,
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredConcentration",
          "glyphStoredConcentrationFullDuration",
          () =>
            glyphStoredSpellReleaseProfileForSpell(
              spellRecord(glyphOfWardingUnitId),
            )?.release.concentration.ifStoredSpellRequiresConcentration ===
            "lasts_full_duration",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredSummonObjectPlacement",
          "glyphStoredSummonObjectPlacement",
          () =>
            storedSpellInvocation(
              spiritualWeaponUnitId,
              2,
              "spatialMeleeSpellAttackProxy",
            ).procedure === "spatialMeleeSpellAttackProxy",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredRemainingConcentration",
          "glyphStoredRemainingConcentration",
          () =>
            storedSpellInvocation(mindSpikeUnitId, 2, "saveGatedDamage")
              .procedure === "saveGatedDamage",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredAreaOngoingConcentration",
          "glyphStoredAreaOngoingConcentration",
          () =>
            storedSpellInvocation(fogCloudUnitId, 1, "persistentAreaTrait")
              .procedure === "persistentAreaTrait",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredAreaControlConcentration",
          "glyphStoredAreaControlConcentration",
          () =>
            storedSpellInvocation(
              saveGatedAreaControlUnitId,
              3,
              "saveGatedAreaControl",
            ).procedure === "saveGatedAreaControl",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredSingleCreatureActiveEffectConcentration",
          "glyphStoredSingleCreatureActiveEffectConcentration",
          () =>
            storedSpellInvocation(
              hasteUnitId,
              3,
              "compositeTargetBuffWithAftermath",
            ).procedure === "compositeTargetBuffWithAftermath",
        ),
        glyphReplayProcedure(
          "doReplayGlyphStoredSelfTransformationConcentration",
          "glyphStoredSelfTransformationConcentration",
          () =>
            storedSpellInvocation(alterSelfUnitId, 2, "selfTransformationMode")
              .procedure === "selfTransformationMode",
        ),
      ],
    },
  ],
});

function glyphReplayProcedure(
  actionName: `do${string}`,
  procedure: string,
  admit: () => boolean,
) {
  const projection = {
    unitId: glyphOfWardingUnitId,
    procedure,
    profileAdmitted: true,
  };
  return {
    actionName,
    projectionAfter: projection,
    discover: () => {
      if (!admit()) {
        throw new Error(`Expected selected Glyph replay for ${procedure}.`);
      }
      return projection;
    },
  };
}
