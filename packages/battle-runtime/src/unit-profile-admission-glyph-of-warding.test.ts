// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-EXPLOSIVE-RUNE-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-SPELL-RELEASE glyph_of_warding
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GLYPH-STORED-CONCENTRATION glyph_of_warding
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration
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
  addGlyphDurableOccurrence,
  endGlyphDurableOccurrence,
  glyphExplosiveRuneDamageRollHole,
  glyphExplosiveRuneSavingThrowOutcomeHole,
  glyphExplosiveRuneReleaseProfileForSpell,
  glyphDurableOccurrenceEffectFromCompletedInscription,
  glyphDurableOccurrenceProfileForSpell,
  glyphStoredSpellReleaseProfileForSpell,
  releaseGlyphExplosiveRune,
  releaseGlyphStoredSpell,
  type CompletedGlyphInscriptionWitness,
  type GlyphDurableOccurrenceEndWitness,
  type GlyphDurableOccurrenceProfile,
  type GlyphExplosiveRuneReleaseProfile,
  type GlyphStoredSpellReleaseProfile,
} from "./battle-reducer/glyph-durable-occurrence.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleSpellCastReactionFact,
  type GlyphStoredSpellInvocationCandidate,
  type ReadiedSpellInvocation,
} from "./battle-reducer.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "./battle-reducer/spells-effective-level.ts";
import {
  blindnessDeafnessUnitId,
  counterspellUnitId,
  fireballUnitId,
  greaseAreaId,
  greaseUnitId,
  holdPersonDurationTicks,
  guidingBoltUnitId,
  glyphOfWardingUnitId,
  holdPersonUnitId,
  moonbeamUnitId,
  orcRelentlessEnduranceUnitId,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  thunderwaveUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { attackRollFill } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  greaseSavingThrowOutcomeFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  thunderwaveArea,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  battleD20TestNaturalOneRerollSupportForUnit,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleObjectIgnitionDisposition,
  type BattleState,
  type BattleTargetSpatialFact,
  type CombatantId,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  resolveBattleSubject,
  spellSaveDcForCaster,
} from "./unit-profile-admission-test-support.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";

type GlyphDurableOccurrenceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "glyphDurableOccurrence" }
>;
type TestSpellSlotLevel = NonNullable<
  Parameters<typeof spellBattle>[0]["spellSlots"]
>[number]["spellLevel"];
type NonEmptyDamageDice = readonly [number, ...ReadonlyArray<number>];
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
    const release = requireGlyphExplosiveRuneProfile();
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
      id: "synthetic_delayed_burst_mark",
      name: "Synthetic Delayed Burst Mark",
      description:
        "Synthetic delayed mark record for identity-free release tests.",
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
    } as unknown as SpellRecord;

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
      id: "synthetic_delayed_spell_mark",
      name: "Synthetic Delayed Spell Mark",
      description:
        "Synthetic delayed mark record for stored-spell release tests.",
    } satisfies SpellRecord;
    const glyphMechanics = requireGlyphMechanics(glyph);
    const immediateEffectRecord = malformedGlyphRecordForAdmissionRejection({
      glyph,
      mechanics: {
        ...glyphMechanics,
        release: {
          ...glyphMechanics.release,
          spellGlyph: {
            ...glyphMechanics.release.spellGlyph,
            storage: {
              ...glyphMechanics.release.spellGlyph.storage,
              immediateEffect: "stored_spell_takes_effect_now",
            },
          },
        },
      },
    });

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
    expect(
      glyphStoredSpellReleaseProfileForSpell(immediateEffectRecord),
    ).toBeNull();
    expect(
      glyphDurableOccurrenceProfileForSpell(immediateEffectRecord),
    ).toBeNull();
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
    const wrongExplosiveRuneRadius = malformedGlyphRecordForAdmissionRejection({
      glyph,
      mechanics: {
        ...glyphMechanics,
        release: {
          ...glyphMechanics.release,
          explosiveRune: {
            ...glyphMechanics.release.explosiveRune,
            area: {
              ...glyphMechanics.release.explosiveRune.area,
              radiusFeet: 10,
            },
          },
        },
      },
    });
    const wrongExplosiveRuneDamageTypes =
      malformedGlyphRecordForAdmissionRejection({
        glyph,
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
                  value: {
                    ...glyphMechanics.release.explosiveRune.damage.damageType
                      .value,
                    options: ["force"],
                  },
                },
              },
            },
          },
        },
      });

    expect(glyphDurableOccurrenceProfileForSpell(wrongMovement)).toBeNull();
    expect(
      glyphDurableOccurrenceProfileForSpell(wrongTriggerOutcome),
    ).toBeNull();
    expect(
      glyphExplosiveRuneReleaseProfileForSpell(wrongExplosiveRuneRadius),
    ).toBeNull();
    expect(
      glyphDurableOccurrenceProfileForSpell(wrongExplosiveRuneRadius),
    ).toBeNull();
    expect(
      glyphExplosiveRuneReleaseProfileForSpell(wrongExplosiveRuneDamageTypes),
    ).toBeNull();
    expect(
      glyphDurableOccurrenceProfileForSpell(wrongExplosiveRuneDamageTypes),
    ).toBeNull();
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
      storedInvocation,
    });
    const added = addGlyphDurableOccurrence({ state, effect: created.effect });

    expect(added.tag).toBe("added");
    if (added.tag !== "added") return;
    expect(Number(added.state.combatants.get(spellTargetId)?.hp)).toBe(50);
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
        state,
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
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedSingleCreatureReleaseWitness([], spellCasterId),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "triggerCreatureTargetMismatch",
    });
    const needsAttackRoll = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness([], spellTargetId, []),
    });

    expect(needsAttackRoll.tag).toBe("needsHoles");
    if (needsAttackRoll.tag !== "needsHoles") return;
    const attackRoll = requireReleaseHole(needsAttackRoll.holes, "attackRoll");
    expect(attackRoll).toMatchObject({
      spell: expect.objectContaining({
        procedure: "spellAttackDamage",
        spell: expect.objectContaining({ id: guidingBoltUnitId }),
      }),
    });
    const needsDamageRoll = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        [attackRollFill(attackRoll, { total: 18, naturalD20: 12 })],
        spellTargetId,
        [],
      ),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
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

  test("stored Concentration release lasts for full duration without spell Concentration ownership", () => {
    const storedInvocation = storedSpellInvocation(holdPersonUnitId, 2);
    const state = stateWithUnrelatedReadiedSpell(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "spellGlyph", storedInvocation },
        }),
        glyphBattle({
          preparedSpells: [
            spellRecord(holdPersonUnitId),
            spellRecord(guidingBoltUnitId),
          ],
          spellSlots: [
            { spellLevel: 1, count: 1 },
            { spellLevel: 2, count: 1 },
          ],
        }),
      ),
    );
    const readiedBefore = state.readiedSpells.get(spellCasterId);
    const readiedConcentration = {
      sourceSpellId: guidingBoltUnitId,
      effectKind: "readiedSpell" as const,
    };
    const needsSave = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        [],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(spellTargetId, holdPersonUnitId),
      ),
    });

    expect(needsSave.tag).toBe("needsHoles");
    if (needsSave.tag !== "needsHoles") return;
    const savingThrow = requireReleaseHole(
      needsSave.holes,
      "savingThrowOutcome",
    );
    const released = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedSingleCreatureReleaseWitness(
        [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
        spellTargetId,
        storedSingleCreatureSpellTargetFacts(spellTargetId, holdPersonUnitId),
      ),
    });

    expect(released.tag).toBe("released");
    if (released.tag !== "released") return;
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
          sourceSpellId: holdPersonUnitId,
          expiresAt: {
            kind: "duration",
            durationTicks: holdPersonDurationTicks,
          },
        }),
      ]),
    );
  });

  test("rejects stored Concentration procedures outside the full-duration subset", () => {
    const storedInvocation = storedSpellInvocation(moonbeamUnitId, 2);

    expect(storedInvocation.spell.mechanics.duration.kind).toBe(
      "concentration",
    );
    expect(storedInvocation.procedure).not.toBe("saveGatedCondition");
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
          targetSpellcasting: counterspellSpellcasting(),
        }),
      ),
      3,
    );
    expect(casterSpellSlotExpended(state, 3)).toBe(1);
    const priorTurnSpellSlotUses =
      state.currentTurnResources.spellSlotUsesThisTurn;

    expect(
      releaseGlyphStoredSpell({
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          originAnchorId: spellCasterId,
          fills: [],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "areaCenterMismatch",
    });
    const needsAreaSave = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        originAnchorId: spellTargetId,
        fills: [
          spellCastReactionFactsFill([
            counterspellTriggerFact({
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
    expect(savingThrow).toMatchObject({
      spell: expect.objectContaining({
        procedure: "saveGatedDamage",
        spell: expect.objectContaining({ id: fireballUnitId }),
      }),
    });
    const saveFill = fireballGlyphSavingThrowOutcomeFill(
      savingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );
    const needsDamageRoll = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        originAnchorId: spellTargetId,
        fills: [saveFill],
      }),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
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
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
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
    expect(savingThrow).toMatchObject({
      spell: expect.objectContaining({
        procedure: "saveGatedDamage",
        spell: expect.objectContaining({ id: thunderwaveUnitId }),
        targeting: expect.objectContaining({ kind: "selfOriginCube" }),
      }),
    });
    const saveFill = thunderwaveGlyphSavingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: thunderwaveSecondTargetId, succeeded: true },
    ]);
    const needsDamageRoll = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        originAnchorId: spellTargetId,
        fills: [saveFill],
      }),
    });

    expect(needsDamageRoll.tag).toBe("needsHoles");
    if (needsDamageRoll.tag !== "needsHoles") return;
    const damageRoll = requireReleaseHole(needsDamageRoll.holes, "rolledDice");
    const released = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
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
    const state = stateWithPriorCasterSpellSlotUse(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: {
            kind: "spellGlyph",
            storedInvocation: storedSpellInvocation(greaseUnitId, 1),
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
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
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
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
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
    expect(savingThrow).toMatchObject({
      spell: expect.objectContaining({
        procedure: "greaseGroundHazard",
        spell: expect.objectContaining({ id: greaseUnitId }),
      }),
    });
    const saveFill = greaseGlyphSavingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);

    expect(
      releaseGlyphStoredSpell({
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
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
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
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
        kind: "greaseGroundHazard",
        sourceSpellId: greaseUnitId,
        sourceCombatantId: spellCasterId,
        areaId: greaseAreaId,
        save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
      }),
    ]);
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
        state,
        profile: requireGlyphStoredSpellProfile(),
        witness: storedAreaReleaseWitness({
          originAnchorId: spellCasterId,
          fills: [],
        }),
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "areaCenterMismatch",
    });
    const needsAreaSave = releaseGlyphStoredSpell({
      state,
      profile: requireGlyphStoredSpellProfile(),
      witness: storedAreaReleaseWitness({
        originAnchorId: spellTargetId,
        fills: [],
      }),
    });

    expect(needsAreaSave.tag).toBe("needsHoles");
    if (needsAreaSave.tag !== "needsHoles") return;
    expect(
      requireReleaseHole(needsAreaSave.holes, "savingThrowOutcome"),
    ).toMatchObject({
      spell: expect.objectContaining({
        procedure: "saveGatedDamage",
        spell: expect.objectContaining({ id: fireballUnitId }),
      }),
    });
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
        sourceSpellId: glyphOfWardingUnitId,
        sourceEffectId: glyphSourceEffectId,
        radiusFeet: 20,
      },
      targetIds: [spellTargetId, thunderwaveSecondTargetId],
    });
    const released = releaseGlyphExplosiveRune({
      state,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
          hideousLaughterDamageRepeatSaves: [],
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

  test("explosive-rune release requests and consumes spell damage reduction fills before damage", () => {
    const profile = requireGlyphExplosiveRuneProfile();
    const baseState = stateWithSpellDamageReduction(
      stateWithGlyphEffect(
        requireCompletedGlyphEffect({
          anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
          release: { kind: "explosiveRune", damageType: "thunder" },
        }),
        glyphBattle({ targetHp: 50, targetMaxHp: 50 }),
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
        [[2, 2, 2, 2, 2]],
      ),
      spellDamageReductionRolls: [],
      concentrationSavingThrows: [],
      damageDispositions: [],
      hideousLaughterDamageRepeatSaves: [],
    };

    const needsReduction = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
          triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
    expect(Number(damagedTarget.hp)).toBe(44);
    expect(damagedTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        damageType: "thunder",
        usedThisTurn: true,
      }),
    );
  });

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
      triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
        hideousLaughterDamageRepeatSaves: [],
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
        sourceSpellId: glyphOfWardingUnitId,
        sourceEffectId: glyphSourceEffectId,
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
      hideousLaughterDamageRepeatSaves:
        validWitness.areaMembership.hideousLaughterDamageRepeatSaves,
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
        sourceSpellId: glyphOfWardingUnitId,
        sourceEffectId: glyphSourceEffectId,
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
    } as unknown as Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    >["value"]["outcomes"][number];

    expect(
      releaseGlyphExplosiveRune({
        state,
        profile,
        witness: glyphExplosiveRuneReleaseWitness({
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
            unitId: speciesHalflingLuckUnitId,
            supportProfiles: [luckSupport],
          },
        ],
        targetUnitFeatures: [{ unit: luckUnit }],
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
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
      hideousLaughterDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
          triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
    const baseState = stateWithGlyphEffect(
      requireCompletedGlyphEffect({
        anchor: { kind: "surface", areaId: glyphSurfaceAnchorAreaId },
      }),
      glyphBattle({
        targetHp: 10,
        targetMaxHp: 50,
        targetResources: [{ unit: targetResource }],
        targetUnitRefs: [
          {
            unitId: orcRelentlessEnduranceUnitId,
            supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
          },
        ],
      }),
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
      hideousLaughterDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
      unitId: orcRelentlessEnduranceUnitId,
    });
    const replacementDispositionFill = attackDamageDispositionFill(
      disposition,
      {
        kind: "zeroHitPointReplacement",
        unitId: orcRelentlessEnduranceUnitId,
      },
    );

    expect(
      releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
    const baseState = stateWithTargetHideousLaughter(
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
      hideousLaughterDamageRepeatSaves: [],
    };
    const pending = releaseGlyphExplosiveRune({
      state: baseState,
      profile,
      witness: {
        kind: "tableWitnessedGlyphExplosiveRuneRelease",
        triggerOccurrence: glyphTriggerOccurrenceWitness(),
        coveredAreaId: glyphCoveredAreaId,
        areaMembership,
      },
    });

    expect(pending.tag).toBe("needsHoles");
    if (pending.tag !== "needsHoles") return;
    const repeatSave = requireReleaseHole(pending.holes, "savingThrowOutcome");
    expect(repeatSave).toMatchObject({
      hideousLaughterRepeatSave: {
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

    expect(
      releaseGlyphExplosiveRune({
        state: baseState,
        profile,
        witness: {
          kind: "tableWitnessedGlyphExplosiveRuneRelease",
          triggerOccurrence: glyphTriggerOccurrenceWitness(),
          coveredAreaId: glyphCoveredAreaId,
          areaMembership: {
            ...areaMembership,
            hideousLaughterDamageRepeatSaves: [repeatSaveFill, repeatSaveFill],
          },
        },
      }),
    ).toMatchObject({
      tag: "invalidWitness",
      reason: "hideousLaughterDamageRepeatSaveMismatch",
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
): GlyphStoredSpellInvocationCandidate {
  const state = spellBattle({
    preparedSpells: [spellRecord(storedSpellId)],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });
  const act = spellAct({
    state,
    spellId: storedSpellId,
    slotLevel,
  });
  const spellHole =
    storedSpellInvocationHole(act.initialHoles) ??
    storedSpellInvocationHole(
      storedSpellInvocationHolesAfterTarget({
        state,
        subject: act.subject,
        initialHoles: act.initialHoles,
        storedSpellId,
      }),
    );
  if (spellHole === undefined) {
    throw new Error("Expected stored spell act to expose an invocation hole.");
  }
  const invocation = spellHole.spell;
  if (
    invocation.access.tag !== "prepared" ||
    invocation.resource.tag !== "spellSlot" ||
    !("targeting" in invocation)
  ) {
    throw new Error("Expected prepared spell-slot invocation with targeting.");
  }
  return invocation;
}

function storedSpellInvocationHole(
  holes: readonly BattleHole[],
):
  | (BattleHole & { readonly spell: GlyphStoredSpellInvocationCandidate })
  | undefined {
  return holes.find(
    (
      hole,
    ): hole is BattleHole & {
      readonly spell: GlyphStoredSpellInvocationCandidate;
    } => "spell" in hole,
  );
}

function storedSpellInvocationHolesAfterTarget(input: {
  readonly state: BattleState;
  readonly subject: Parameters<typeof resolveBattleSubject>[0]["subject"];
  readonly initialHoles: readonly BattleHole[];
  readonly storedSpellId: string;
}): readonly BattleHole[] {
  const targetHole = input.initialHoles.find(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
  if (targetHole === undefined) {
    return [];
  }
  const result = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      spellTargetFill(
        targetHole,
        input.storedSpellId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  return result.tag === "needsHoles" ? result.holes : [];
}

function storedSingleCreatureReleaseWitness(
  fills: readonly BattleFill[],
  targetId: CombatantId = spellTargetId,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = storedSingleCreatureSpellTargetFacts(
    targetId,
  ),
) {
  return {
    kind: "tableWitnessedGlyphStoredSpellRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(),
    triggeringCreatureId: spellTargetId,
    targeting: {
      kind: "storedSpellTargetsTriggeringCreature" as const,
      targetId,
      targetSpatialFacts,
    },
    hostilePlacement: storedHostilePlacementNotApplicable(),
    fills,
  };
}

function storedSingleCreatureSpellTargetFacts(
  targetId: CombatantId,
  spellId: string = guidingBoltUnitId,
): readonly BattleTargetSpatialFact[] {
  return [
    {
      kind: "spellTarget",
      casterId: spellCasterId,
      targetId,
      spellId,
    },
  ];
}

function stateWithUnrelatedReadiedSpell(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  const readiedInvocation = requireReadiedSpellInvocation(
    storedSpellInvocation(guidingBoltUnitId, 1),
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      concentration: {
        sourceSpellId: guidingBoltUnitId,
        effectKind: "readiedSpell",
      },
    }),
    readiedSpells: new Map(state.readiedSpells).set(spellCasterId, {
      invocation: readiedInvocation,
      trigger: "spellCast",
      expiresAt: {
        kind: "endOfTurn",
        combatantId: spellCasterId,
        round: Round(1),
      },
    }),
  };
}

function requireReadiedSpellInvocation(
  invocation: GlyphStoredSpellInvocationCandidate,
): ReadiedSpellInvocation {
  if (
    invocation.procedure === "greaseGroundHazard" ||
    invocation.procedure === "saveGatedCondition"
  ) {
    throw new Error("Expected a Readied Spell-compatible invocation.");
  }
  return invocation;
}

function counterspellSpellcasting() {
  return {
    sourceClassName: "wizard" as const,
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: [spellRecord(counterspellUnitId)],
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: [{ spellLevel: 3 as const, count: 1 }],
  };
}

function counterspellTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): BattleSpellCastReactionFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: counterspellUnitId,
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
  readonly originAnchorId: CombatantId;
  readonly fills: readonly BattleFill[];
  readonly hostilePlacement?: ReturnType<
    | typeof storedHostilePlacementNotApplicable
    | typeof storedTrapPlacementWitness
  >;
}) {
  return {
    kind: "tableWitnessedGlyphStoredSpellRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
  if (value.area.kind !== "greaseGroundArea") {
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
  if (value.area.kind !== "greaseGroundArea") {
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
    sourceSpellId: glyphOfWardingUnitId,
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
}): GlyphDurableOccurrenceEffect {
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

function glyphTriggerOccurrenceWitness() {
  return {
    kind: "tableWitnessedGlyphTriggerOccurrence" as const,
    sourceEffectId: glyphSourceEffectId,
  };
}

function glyphBattle(
  input: Parameters<typeof spellBattle>[0] = {},
): BattleState {
  return spellBattle({ preparedSpells: [], spellSlots: [], ...input });
}

function stateWithGlyphEffect(
  effect: GlyphDurableOccurrenceEffect,
  state: BattleState = glyphBattle(),
): BattleState {
  const added = addGlyphDurableOccurrence({ state, effect });
  if (added.tag !== "added") {
    throw new Error("Expected Glyph occurrence to be added.");
  }
  return added.state;
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
): readonly GlyphDurableOccurrenceEffect[] {
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
        sourceSpellId: glyphOfWardingUnitId,
        effectKind: "spellEffect",
      },
    }),
  };
}

function stateWithTargetHideousLaughter(
  state: BattleState,
  combatantId: typeof spellTargetId,
): BattleState {
  const target = requireCombatant(state, combatantId);
  const hideousLaughterEffect = {
    kind: "hideousLaughter",
    sourceSpellId: "synthetic_laughter",
    sourceCombatantId: spellCasterId,
    conditionHadNonSpellProneSource: false,
    conditionHadNonSpellIncapacitatedSource: false,
    repeatSaveRollMode: null,
    save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(60),
    },
  } satisfies Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>;
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...target,
      activeEffects: [...target.activeEffects, hideousLaughterEffect],
    }),
  };
}

function stateWithSpellDamageReduction(
  state: BattleState,
  targetId: CombatantId,
  damageType: DamageType,
): BattleState {
  const target = requireCombatant(state, targetId);
  const spellDamageReductionEffect = {
    kind: "spellDamageReduction",
    sourceSpellId: glyphOfWardingUnitId,
    sourceCombatantId: spellCasterId,
    damageType,
    amount: { dice: 1, dieSize: 4 },
    usedThisTurn: false,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(60),
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellDamageReduction" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [...target.activeEffects, spellDamageReductionEffect],
    }),
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
  readonly effect: GlyphDurableOccurrenceEffect;
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
  readonly effect: GlyphDurableOccurrenceEffect;
  readonly profile: GlyphExplosiveRuneReleaseProfile;
  readonly outcomes: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"];
}) {
  const targetIds = [spellTargetId] as const;
  return {
    kind: "tableWitnessedGlyphExplosiveRuneRelease" as const,
    triggerOccurrence: glyphTriggerOccurrenceWitness(),
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
      hideousLaughterDamageRepeatSaves: [],
    },
  };
}

function requireGlyphSavingThrowOutcomeHole(input: {
  readonly state: BattleState;
  readonly effect: GlyphDurableOccurrenceEffect;
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
        kind: "fireballArea",
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
        ...thunderwaveArea(
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
