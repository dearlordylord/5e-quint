// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES glyph_of_warding haste protection_from_energy sleet_storm slow
// UNIT-IDENTITY-MBT-REPLAY: L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES glyph_of_warding doDiscoverGlyphDurableOccurrence doDiscoverGlyphExplosiveRuneRelease doDiscoverGlyphStoredSpellRelease
// UNIT-IDENTITY-MBT-REPLAY: L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES haste doDiscoverHastePositiveEffects
// UNIT-IDENTITY-MBT-REPLAY: L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES protection_from_energy doDiscoverProtectionFromEnergyResistance
// UNIT-IDENTITY-MBT-REPLAY: L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES sleet_storm doDiscoverSleetStormAreaHazard
// UNIT-IDENTITY-MBT-REPLAY: L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES slow doDiscoverSlowActivePenalties
import type { SpellRecord } from "@dnd/surface/surface/types";
import { expect } from "vitest";

import {
  glyphDurableOccurrenceProfileForSpell,
  glyphExplosiveRuneReleaseProfileForSpell,
  glyphStoredSpellReleaseProfileForSpell,
} from "./battle-reducer/glyph-durable-occurrence.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  glyphOfWardingUnitId,
  hasteUnitId,
  protectionFromEnergyUnitId,
  sleetStormUnitId,
  slowUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  damageTypeChoiceFill,
  knownWillingSpellTargetFill,
  sleetStormAreaFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleHole,
  BattleSpellSavingThrowOutcomeHole,
} from "./unit-profile-admission-test-support.ts";

const LEVEL3_SPELL_SELECTED_IDENTITY_TASK_ID =
  "L5UG-GATE-04-LEVEL15-SELECTED-IDENTITY-WITNESSES";

const LEVEL3_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  GlyphDurableOccurrence: "glyphDurableOccurrence",
  GlyphExplosiveRuneRelease: "glyphExplosiveRuneRelease",
  GlyphStoredSpellRelease: "glyphStoredSpellRelease",
  HastePositiveEffects: "hastePositiveEffects",
  ProtectionFromEnergyResistance: "protectionFromEnergyResistance",
  SleetStormAreaHazard: "sleetStormAreaHazard",
  SlowActivePenalties: "slowActivePenalties",
} as const satisfies Readonly<Record<string, Level3SpellSelectedIdentityResult>>;

type Level3SpellSelectedIdentityResult =
  | "init"
  | "glyphDurableOccurrence"
  | "glyphExplosiveRuneRelease"
  | "glyphStoredSpellRelease"
  | "hastePositiveEffects"
  | "protectionFromEnergyResistance"
  | "sleetStormAreaHazard"
  | "slowActivePenalties";
type Level3SpellSelectedIdentityProjection = {
  readonly lastResult: Level3SpellSelectedIdentityResult;
};
type Level3ActionSpellUnitId =
  | typeof hasteUnitId
  | typeof protectionFromEnergyUnitId
  | typeof sleetStormUnitId
  | typeof slowUnitId;
type Level3ActionSpellProcedure = Parameters<
  typeof spellSlotInvocationRef
>[2];

defineSelectedIdentityWitness({
  describeLabel: "Level 3 spell selected identity MBT",
  taskId: LEVEL3_SPELL_SELECTED_IDENTITY_TASK_ID,
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level3-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: LEVEL3_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: glyphOfWardingUnitId,
      procedures: [
        selectedProcedure(
          "doDiscoverGlyphDurableOccurrence",
          "glyphDurableOccurrence",
          discoverGlyphDurableOccurrence,
        ),
        selectedProcedure(
          "doDiscoverGlyphExplosiveRuneRelease",
          "glyphExplosiveRuneRelease",
          discoverGlyphExplosiveRuneRelease,
        ),
        selectedProcedure(
          "doDiscoverGlyphStoredSpellRelease",
          "glyphStoredSpellRelease",
          discoverGlyphStoredSpellRelease,
        ),
      ],
    },
    {
      unitId: hasteUnitId,
      procedures: [
        selectedProcedure(
          "doDiscoverHastePositiveEffects",
          "hastePositiveEffects",
          () =>
            discoverLevel3ActionSpell({
              spellId: hasteUnitId,
              procedure: "hastePositive",
              result: "hastePositiveEffects",
              verify: verifyHastePositiveEffects,
            }),
        ),
      ],
    },
    {
      unitId: protectionFromEnergyUnitId,
      procedures: [
        selectedProcedure(
          "doDiscoverProtectionFromEnergyResistance",
          "protectionFromEnergyResistance",
          () =>
            discoverLevel3ActionSpell({
              spellId: protectionFromEnergyUnitId,
              procedure: "chosenDamageResistance",
              result: "protectionFromEnergyResistance",
              verify: verifyProtectionFromEnergyResistance,
            }),
        ),
      ],
    },
    {
      unitId: sleetStormUnitId,
      procedures: [
        selectedProcedure(
          "doDiscoverSleetStormAreaHazard",
          "sleetStormAreaHazard",
          () =>
            discoverLevel3ActionSpell({
              spellId: sleetStormUnitId,
              procedure: "sleetStormAreaHazard",
              result: "sleetStormAreaHazard",
              verify: verifySleetStormAreaHazard,
            }),
        ),
      ],
    },
    {
      unitId: slowUnitId,
      procedures: [
        selectedProcedure(
          "doDiscoverSlowActivePenalties",
          "slowActivePenalties",
          () =>
            discoverLevel3ActionSpell({
              spellId: slowUnitId,
              procedure: "slowActivePenalties",
              result: "slowActivePenalties",
              verify: verifySlowActivePenalties,
            }),
        ),
      ],
    },
  ],
});

function selectedProcedure(
  actionName: `do${string}`,
  result: Exclude<Level3SpellSelectedIdentityResult, "init">,
  discover: () => Level3SpellSelectedIdentityProjection,
) {
  return {
    actionName,
    projectionAfter: expectedProjection(result),
    discover,
  };
}

function discoverLevel3ActionSpell(input: {
  readonly spellId: Level3ActionSpellUnitId;
  readonly procedure: Level3ActionSpellProcedure;
  readonly result: Exclude<Level3SpellSelectedIdentityResult, "init">;
  readonly verify: (input: {
    readonly state: ReturnType<typeof selectedSpellBattle>;
    readonly act: ReturnType<typeof spellAct>;
    readonly spell: SpellRecord;
  }) => void;
}): Level3SpellSelectedIdentityProjection {
  const spell = spellRecord(input.spellId);
  const state = selectedSpellBattle(spell);
  const act = spellAct({
    state,
    spellId: input.spellId,
    slotLevel: 3,
  });
  expect(act.subject).toEqual({
    tag: "actionSpell",
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(input.spellId, 3, input.procedure),
    mode: { tag: "cast" },
  });
  input.verify({ state, act, spell });
  return expectedProjection(input.result);
}

function verifyHastePositiveEffects(input: {
  readonly state: ReturnType<typeof selectedSpellBattle>;
  readonly act: ReturnType<typeof spellAct>;
  readonly spell: SpellRecord;
}): void {
  const targetHole = requireHole(input.act.initialHoles, "targetChoice");
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        hasteUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Haste selected identity replay to resolve.");
  }
  expect(
    requireCombatant(resolved.state, spellTargetId).activeEffects.map(
      (effect) => effect.kind,
    ),
  ).toEqual(
    expect.arrayContaining([
      "speedRatio",
      "spellArmorClassBonus",
      "savingThrowRollMode",
      "spellGrantedActionResource",
    ]),
  );
}

function verifyProtectionFromEnergyResistance(input: {
  readonly state: ReturnType<typeof selectedSpellBattle>;
  readonly act: ReturnType<typeof spellAct>;
  readonly spell: SpellRecord;
}): void {
  const targetHole = requireHole(input.act.initialHoles, "targetChoice");
  const damageTypeHole = requireHole(input.act.initialHoles, "damageTypeChoice");
  expect(damageTypeHole.choices).toEqual([
    "acid",
    "cold",
    "fire",
    "lightning",
    "thunder",
  ]);
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        protectionFromEnergyUnitId,
        spellCasterId,
        spellTargetId,
      ),
      damageTypeChoiceFill(damageTypeHole, "fire"),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error(
      "Expected Protection from Energy selected identity replay to resolve.",
    );
  }
  expect(
    requireCombatant(resolved.state, spellTargetId).activeEffects,
  ).toContainEqual(
    expect.objectContaining({
      kind: "damageResistance",
      sourceSpellId: protectionFromEnergyUnitId,
      sourceCombatantId: spellCasterId,
      damageType: "fire",
    }),
  );
}

function verifySleetStormAreaHazard(input: {
  readonly state: ReturnType<typeof selectedSpellBattle>;
  readonly act: ReturnType<typeof spellAct>;
  readonly spell: SpellRecord;
}): void {
  const area = requireHole(input.act.initialHoles, "spellAreaChoice");
  expect(area).toEqual(
    expect.objectContaining({
      label: "Sleet Storm area",
      area: expect.objectContaining({
        kind: "pointOriginCylinder",
      }),
    }),
  );
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.act.subject,
    fills: [sleetStormAreaFill(area)],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Sleet Storm selected identity replay to resolve.");
  }
  expect(
    requireCombatant(resolved.state, spellCasterId).activeEffects,
  ).toContainEqual(
    expect.objectContaining({
      kind: "sleetStormAreaHazard",
      sourceSpellId: sleetStormUnitId,
      sourceCombatantId: spellCasterId,
    }),
  );
}

function verifySlowActivePenalties(input: {
  readonly state: ReturnType<typeof selectedSpellBattle>;
  readonly act: ReturnType<typeof spellAct>;
  readonly spell: SpellRecord;
}): void {
  const savingThrow = requireSpellSavingThrowOutcomeHole(input.act.initialHoles);
  expect(savingThrow).toEqual(
    expect.objectContaining({
      label: "Slow point-origin Cube Saving Throw outcomes",
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
    }),
  );
  expect(savingThrow.spell).toEqual(
    expect.objectContaining({
      procedure: "slowActivePenalties",
      spell: input.spell,
      resource: { tag: "spellSlot", slotLevel: 3 },
      targeting: { kind: "pointOriginCube", sideFeet: 40 },
      maxTargets: 6,
      rangeFeet: 120,
    }),
  );
}

function discoverGlyphDurableOccurrence(): Level3SpellSelectedIdentityProjection {
  const profile = requireGlyphProfile(
    glyphDurableOccurrenceProfileForSpell(glyphSpell()),
    "durable occurrence",
  );
  expect(profile.release).toEqual(
    expect.objectContaining({
      explosiveRune: expect.objectContaining({
        kind: "glyphExplosiveRuneReleaseProfile",
      }),
      spellGlyph: expect.objectContaining({
        kind: "glyphStoredSpellReleaseProfile",
      }),
    }),
  );
  expect(Number(profile.maxCoveredDiameterFeet)).toBe(10);
  return expectedProjection("glyphDurableOccurrence");
}

function discoverGlyphExplosiveRuneRelease(): Level3SpellSelectedIdentityProjection {
  const profile = requireGlyphProfile(
    glyphExplosiveRuneReleaseProfileForSpell(glyphSpell()),
    "explosive rune release",
  );
  expect(profile.save).toEqual(
    expect.objectContaining({
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      successDamage: "half",
    }),
  );
  expect(Number(profile.area.radiusFeet)).toBe(20);
  expect(profile.damage).toEqual(
    expect.objectContaining({
      damageTypes: ["acid", "cold", "fire", "lightning", "thunder"],
      dice: expect.objectContaining({
        baseDice: 5,
        dieSize: 8,
        perSlotAboveBaseDice: 1,
      }),
    }),
  );
  return expectedProjection("glyphExplosiveRuneRelease");
}

function discoverGlyphStoredSpellRelease(): Level3SpellSelectedIdentityProjection {
  const profile = requireGlyphProfile(
    glyphStoredSpellReleaseProfileForSpell(glyphSpell()),
    "stored spell release",
  );
  expect(profile.storage).toEqual(
    expect.objectContaining({
      spellAccess: "prepared_spell",
      castAsPartOfCreatingGlyph: true,
      immediateEffect: "none",
      baseMaxStoredSpellLevel: 3,
    }),
  );
  expect(profile.release).toEqual(
    expect.objectContaining({
      retargeting: {
        singleCreatureSpellTarget: "triggering_creature",
        areaSpellOrigin: "centered_on_triggering_creature",
      },
      concentration: {
        ifStoredSpellRequiresConcentration: "lasts_full_duration",
        owner: "duration",
      },
    }),
  );
  return expectedProjection("glyphStoredSpellRelease");
}

function requireGlyphProfile<T>(
  profile: T | null,
  profileName: string,
): T {
  expect(profile).not.toBeNull();
  if (profile === null) {
    throw new Error(`Expected Glyph of Warding ${profileName} profile.`);
  }
  return profile;
}

function glyphSpell(): SpellRecord {
  return spellRecord(glyphOfWardingUnitId);
}

function requireSpellSavingThrowOutcomeHole(
  holes: readonly BattleHole[],
): BattleSpellSavingThrowOutcomeHole {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("spell" in hole)) {
    throw new Error("Expected spell Saving Throw outcome hole.");
  }
  return hole;
}

function selectedSpellBattle(spell: SpellRecord) {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
}

function expectedProjection(
  lastResult: Level3SpellSelectedIdentityResult,
): Level3SpellSelectedIdentityProjection {
  return { lastResult };
}
