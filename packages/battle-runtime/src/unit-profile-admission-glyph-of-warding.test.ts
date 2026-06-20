// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE glyph_of_warding
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-glyph-durable-occurrence
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE
import { movementFeet } from "@dnd/shared/types";
import type {
  GlyphWardingMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  addGlyphDurableOccurrence,
  endGlyphDurableOccurrence,
  glyphDurableOccurrenceEffectFromCompletedInscription,
  glyphDurableOccurrenceProfileForSpell,
  type CompletedGlyphInscriptionWitness,
  type GlyphDurableOccurrenceEndWitness,
  type GlyphDurableOccurrenceProfile,
} from "./battle-reducer/glyph-durable-occurrence.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "./battle-reducer/spells-effective-level.ts";
import {
  glyphOfWardingUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { maybeSpellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  type BattleActiveEffect,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";

type GlyphDurableOccurrenceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "glyphDurableOccurrence" }
>;
const glyphSourceEffectId = battleSpellEffectOccurrenceId(
  "glyph:durable-occurrence:test-effect",
);
const glyphCoveredAreaId = battleAreaId("glyph-covered-area");
const glyphSurfaceAnchorAreaId = battleAreaId("glyph-surface-anchor");
const glyphCloseableObjectId = battleObjectId("glyph-closeable-object");
const glyphCastLocationId = battleTablePositionId("glyph-cast-location");

describe("SRD Glyph of Warding durable occurrence admission", () => {
  test("admits the durable occurrence profile by Surface shape, not authored identity", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const profile = glyphDurableOccurrenceProfileForSpell(glyph);
    const synthetic = {
      ...glyph,
      id: "synthetic_completed_mark",
      name: "Synthetic Completed Mark",
      description: "Synthetic durable mark record for identity-free tests.",
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
    });
    expect(glyphDurableOccurrenceProfileForSpell(synthetic)).toEqual(profile);
  });

  test("rejects adjacent glyph shapes that change occurrence or trigger facts", () => {
    const glyph = spellRecord(glyphOfWardingUnitId);
    const glyphMechanics = requireGlyphMechanics(glyph);
    const wrongMovement = malformedGlyphRecordForAdmissionRejection({
      glyph,
      mechanics: {
        ...glyphMechanics,
        occurrence: {
          ...glyphMechanics.occurrence,
          movementInvalidation: {
            ...glyphMechanics.occurrence.movementInvalidation,
            moreThanFeet: 5,
          },
        },
      },
    });
    const wrongTriggerOutcome = malformedGlyphRecordForAdmissionRejection({
      glyph,
      mechanics: {
        ...glyphMechanics,
        trigger: {
          ...glyphMechanics.trigger,
          onTriggered: "release_only",
        },
      },
    });

    expect(glyphDurableOccurrenceProfileForSpell(wrongMovement)).toBeNull();
    expect(glyphDurableOccurrenceProfileForSpell(wrongTriggerOutcome)).toBeNull();
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
      sourceSpellId: glyphOfWardingUnitId,
      sourceCombatantId: spellCasterId,
      sourceEffectId: glyphSourceEffectId,
      sourceSpellLevel: testBattleSpellEffectLevel(3),
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
    expect(glyphEffects(added.state)).toEqual([effect]);
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
  });

  test("does not discover the one-hour creation as a Magic Action spell invocation", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(glyphOfWardingUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });

    expect(
      maybeSpellAct({
        state,
        spellId: glyphOfWardingUnitId,
        slotLevel: 3,
      }),
    ).toBeUndefined();
  });

  test("table-witnessed trigger occurrence ends the durable occurrence without release", () => {
    const state = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
    );
    const ended = endGlyphDurableOccurrence({
      state,
      witness: {
        kind: "tableWitnessedGlyphTriggerOccurrence",
        sourceEffectId: glyphSourceEffectId,
      },
    });

    expect(ended.tag).toBe("ended");
    if (ended.tag !== "ended") return;
    expect(ended.reason).toBe("triggered");
    expect(glyphEffects(ended.state)).toEqual([]);
    expect(ended.state.lightEmitters).toEqual(state.lightEmitters);
    expect(ended.state.combatants.get(spellCasterId)?.hp).toBe(
      state.combatants.get(spellCasterId)?.hp,
    );
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
        castLocationId: glyphCastLocationId,
        distanceFeet: movementFeet(11),
      }),
    });

    expect(ended.tag).toBe("ended");
    if (ended.tag !== "ended") return;
    expect(ended.reason).toBe("movementInvalidation");
    expect(glyphEffects(ended.state)).toEqual([]);
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

function completedGlyphInscriptionWitness(input: {
  readonly anchor: CompletedGlyphInscriptionWitness["anchor"];
  readonly sourceSpellLevel?: BattleSpellEffectLevel;
}): CompletedGlyphInscriptionWitness {
  return {
    kind: "completedGlyphInscription",
    sourceEffectId: glyphSourceEffectId,
    sourceSpellId: glyphOfWardingUnitId,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel: input.sourceSpellLevel ?? testBattleSpellEffectLevel(3),
    anchor: input.anchor,
    coveredAreaId: glyphCoveredAreaId,
    castLocationId: glyphCastLocationId,
  };
}

function requireCompletedGlyphEffect(input: {
  readonly anchor: CompletedGlyphInscriptionWitness["anchor"];
}): GlyphDurableOccurrenceEffect {
  const result = glyphDurableOccurrenceEffectFromCompletedInscription({
    profile: requireGlyphProfile(),
    witness: completedGlyphInscriptionWitness({ anchor: input.anchor }),
  });
  if (result.tag !== "created") {
    throw new Error("Expected completed Glyph witness to create an effect.");
  }
  return result.effect;
}

function movementInvalidationWitness(input: {
  readonly castLocationId: ReturnType<typeof battleTablePositionId>;
  readonly distanceFeet: ReturnType<typeof movementFeet>;
}): GlyphDurableOccurrenceEndWitness {
  return {
    kind: "tableWitnessedGlyphMovementInvalidation",
    sourceEffectId: glyphSourceEffectId,
    movedSubject: "inscribed_surface_or_object",
    castLocationId: input.castLocationId,
    distanceFrom: "cast_location",
    distanceFeet: input.distanceFeet,
  };
}

function glyphBattle(): BattleState {
  return spellBattle({ preparedSpells: [], spellSlots: [] });
}

function stateWithGlyphEffect(effect: GlyphDurableOccurrenceEffect): BattleState {
  const added = addGlyphDurableOccurrence({ state: glyphBattle(), effect });
  if (added.tag !== "added") {
    throw new Error("Expected Glyph occurrence to be added.");
  }
  return added.state;
}

function glyphEffects(state: BattleState): readonly GlyphDurableOccurrenceEffect[] {
  return (
    state.combatants
      .get(spellCasterId)
      ?.activeEffects.filter(
        (effect): effect is GlyphDurableOccurrenceEffect =>
          effect.kind === "glyphDurableOccurrence",
      ) ?? []
  );
}

function stateWithoutCaster(state: BattleState): BattleState {
  const combatants = new Map(state.combatants);
  combatants.delete(spellCasterId);
  return { ...state, combatants };
}

function requireGlyphMechanics(spell: SpellRecord): GlyphWardingMechanics {
  if (spell.mechanics.family !== "glyph_warding") {
    throw new Error("Expected Glyph of Warding mechanics in test fixture.");
  }
  return spell.mechanics;
}

function malformedGlyphRecordForAdmissionRejection(input: {
  readonly glyph: SpellRecord;
  readonly mechanics: unknown;
}): SpellRecord {
  // Negative admission tests need malformed mechanic shapes that SpellRecord
  // cannot represent; the fixture starts from a local valid Glyph record and
  // replaces only mechanics so the typed admission reader sees the rejection case.
  // A parser or type guard would reject before exercising that typed boundary.
  return {
    ...input.glyph,
    mechanics: input.mechanics,
  } as unknown as SpellRecord;
}

function testBattleSpellEffectLevel(value: number) {
  const parsed = parseBattleSpellEffectLevel(value);
  if (parsed === null) {
    throw new Error(`Expected ${value} to be a valid battle spell level.`);
  }
  return parsed;
}
