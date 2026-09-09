import { describe, expect, test } from "vitest";
import {
  movementFeet,
  PositiveInteger,
  spellSlotLevel,
} from "@dnd/shared/types";
import type {
  ActivationPhase,
  Attachment,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  areaSaveGateSpellRangeFeet,
  hasSaveGateRepeatSaves,
  isPsychicDamageNextAttackDisadvantageRiderShape,
  oneAdditionalTargetPerSpellSlotAboveBaseLevel,
  saveGateTargetCountFactsFromSelection,
  saveGateTargeting,
  saveGatedConditionMechanicsFacts,
  saveGatedDamageMechanicsFacts,
  supportedFailedSavePostDamageRiders,
  supportedSaveGateFailedSaveEffects,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

type SpellId = Parameters<typeof spellRecord>[0];

function firstPhase(spellId: SpellId): ActivationPhase {
  const mechanics = spellRecord(spellId).mechanics;
  if (
    mechanics.family !== "activation" &&
    mechanics.family !== "triggered_reaction"
  ) {
    throw new Error("Expected phased spell mechanics.");
  }
  const phase = mechanics.phases[0];
  if (phase === undefined) throw new Error("Expected a spell phase.");
  return phase;
}

function firstSaveGatePhase(
  spellId: SpellId,
): Extract<ActivationPhase, { readonly kind: "save_gate" }> {
  const phase = firstPhase(spellId);
  if (phase.kind !== "save_gate") {
    throw new Error("Expected a save-gate phase.");
  }
  return phase;
}

function firstAttachment(spellId: SpellId): Attachment {
  return firstSaveGatePhase(spellId).attachment;
}

function sourceFor(spellId: SpellId) {
  return spellAdmissionSource(spellRecord(spellId));
}

function targetAttachment(
  selection: TargetSelection,
): Extract<Attachment, { readonly kind: "hole" }> {
  const attachment = firstAttachment("hold_person");
  if (attachment.kind !== "hole" || attachment.value.kind !== "target") {
    throw new Error("Expected a target hole.");
  }
  return {
    ...attachment,
    value: { ...attachment.value, selection },
  };
}

function malformedHoldPersonAbility(): SpellRecord {
  const base = spellRecord("hold_person");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Hold Person activation mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Hold Person save-gate mechanics.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_hold_person_wrong_save_ability",
    name: "Synthetic Hold Effect With Wrong Save Ability",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic_hold_person_wrong_save_ability",
    },
    mechanics: {
      ...base.mechanics,
      phases: [{ ...phase, ability: "str" }],
    },
  });
}

describe("SR-04 save-gate helper contracts", () => {
  test("projects ordinary target attachments and rejects unsupported shapes", () => {
    expect(
      saveGateTargeting(
        targetAttachment({ mode: "one", targetKinds: ["creature"] }),
      ),
    ).toEqual({ kind: "singleCombatant" });
    expect(saveGateTargeting(firstAttachment("acid_splash"))).toEqual({
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(5),
    });
    expect(saveGateTargeting(firstAttachment("thunderwave"))).toEqual({
      kind: "selfOriginCube",
      sideFeet: movementFeet(15),
    });
    expect(
      saveGateTargeting({
        kind: "area",
        origin: { kind: "self" },
        shape: { kind: "cone", lengthFeet: 15 },
      }),
    ).toEqual({
      kind: "selfOriginCone",
      lengthFeet: movementFeet(15),
    });
    expect(saveGateTargeting(firstAttachment("lightning_bolt"))).toEqual({
      kind: "selfOriginLine",
      lengthFeet: movementFeet(100),
      widthFeet: movementFeet(5),
    });

    expect(
      saveGateTargeting(
        targetAttachment({ mode: "one", targetKinds: ["object"] }),
      ),
    ).toBeNull();
    expect(
      saveGateTargeting({
        kind: "area",
        origin: { kind: "self" },
        shape: { kind: "sphere", radiusFeet: 5 },
      }),
    ).toBeNull();
  });

  test("keeps range projection coupled to point and self origins", () => {
    const pointRange = { kind: "point", feet: 60 } as const;
    const selfRange = { kind: "self" } as const;
    const pointGroundSquare = {
      kind: "pointOriginGroundSquare",
      sideFeet: movementFeet(5),
    } satisfies Parameters<typeof areaSaveGateSpellRangeFeet>[1];
    expect(areaSaveGateSpellRangeFeet(pointRange, pointGroundSquare)).toEqual(
      movementFeet(60),
    );
    expect(areaSaveGateSpellRangeFeet(selfRange, pointGroundSquare)).toBeNull();
    expect(
      areaSaveGateSpellRangeFeet(
        { kind: "touch" },
        { kind: "pointOriginSphere", radiusFeet: movementFeet(5) },
      ),
    ).toBeNull();
  });

  test("retains only supported linear target-count facts and scales them", () => {
    const valid = {
      mode: "choose_up_to",
      count: { kind: "linear", base: 1, baseLevel: 2, perSlotAboveBase: 1 },
    } satisfies TargetSelection;
    expect(saveGateTargetCountFactsFromSelection(valid, 2)).toEqual({
      base: PositiveInteger(1),
      baseLevel: spellSlotLevel(2),
      perSlotAboveBase: PositiveInteger(1),
    });
    const scale = oneAdditionalTargetPerSpellSlotAboveBaseLevel(valid, 2);
    expect(scale?.(spellSlotLevel(2))).toBe(1);
    expect(scale?.(spellSlotLevel(5))).toBe(4);

    expect(
      saveGateTargetCountFactsFromSelection(
        { ...valid, repeatsAllowed: true },
        2,
      ),
    ).toBeNull();
    expect(
      saveGateTargetCountFactsFromSelection({ ...valid, count: 2 }, 2),
    ).toBeNull();
    expect(
      saveGateTargetCountFactsFromSelection(
        {
          ...valid,
          count: {
            kind: "threshold_tiers",
            axis: "character",
            base: 1,
            tiers: [{ atLevel: 5, value: 2 }],
          },
        },
        2,
      ),
    ).toBeNull();
    expect(
      saveGateTargetCountFactsFromSelection(
        {
          ...valid,
          count: { ...valid.count, baseLevel: 1 },
        },
        2,
      ),
    ).toBeNull();
  });

  test("distinguishes repeat-save presence from psychic rider eligibility", () => {
    expect(hasSaveGateRepeatSaves(undefined)).toBe(false);
    expect(hasSaveGateRepeatSaves(firstPhase("vicious_mockery"))).toBe(false);
    expect(
      hasSaveGateRepeatSaves(firstSaveGatePhase("ray_of_enfeeblement")),
    ).toBe(true);

    expect(
      isPsychicDamageNextAttackDisadvantageRiderShape(
        sourceFor("vicious_mockery"),
        firstSaveGatePhase("vicious_mockery"),
      ),
    ).toBe(true);
    expect(
      isPsychicDamageNextAttackDisadvantageRiderShape(
        sourceFor("ray_of_enfeeblement"),
        firstSaveGatePhase("ray_of_enfeeblement"),
      ),
    ).toBe(false);
  });

  test("projects direct and composite failed-save effects with area ownership", () => {
    const acid = sourceFor("acid_splash");
    const acidPhase = firstSaveGatePhase("acid_splash");
    expect(
      supportedSaveGateFailedSaveEffects(acid, acidPhase, acidPhase.onFail),
    ).toMatchObject({
      damage: { kind: "damage", damageType: "acid" },
      additionalDamageComponents: [],
      postDamageRiders: [],
      conditionEffects: [],
      abilityChoices: null,
    });

    const thunderwave = sourceFor("thunderwave");
    const thunderwaveProjection = saveGatedDamageMechanicsFacts(thunderwave);
    if (thunderwaveProjection.tag !== "supported") {
      throw new Error("Expected Thunderwave save-gate projection.");
    }
    const postSaveAreaEffect = thunderwaveProjection.facts.postSaveAreaEffect;
    expect(postSaveAreaEffect?.kind).toBe("selfOriginCubePush");
    expect(
      supportedSaveGateFailedSaveEffects(
        acid,
        acidPhase,
        acidPhase.onFail,
        postSaveAreaEffect,
      ),
    ).toBeNull();

    const mockeryPhase = firstSaveGatePhase("vicious_mockery");
    if (mockeryPhase.onFail.kind !== "composite") {
      throw new Error("Expected Vicious Mockery composite failed-save effect.");
    }
    expect(
      supportedSaveGateFailedSaveEffects(
        sourceFor("vicious_mockery"),
        mockeryPhase,
        mockeryPhase.onFail,
      ),
    ).toMatchObject({
      damage: { kind: "damage", damageType: "psychic" },
      additionalDamageComponents: [],
      postDamageRiders: [
        {
          kind: "nextAttackRollByTarget",
          mode: "disadvantage",
          expiresAt: "endOfTargetNextTurn",
        },
      ],
    });
    expect(
      supportedSaveGateFailedSaveEffects(
        sourceFor("hold_person"),
        firstSaveGatePhase("hold_person"),
        firstSaveGatePhase("hold_person").onFail,
      ),
    ).toBeNull();
  });

  test("projects supported riders, consumed area riders, and rejects unrelated effects", () => {
    const mockery = sourceFor("vicious_mockery");
    const mockeryPhase = firstSaveGatePhase("vicious_mockery");
    if (mockeryPhase.onFail.kind !== "composite") {
      throw new Error("Expected Vicious Mockery composite failed-save effect.");
    }
    const mockeryRider = mockeryPhase.onFail.effects.find(
      (effect) => effect.kind === "modify_roll_advantage",
    );
    if (mockeryRider === undefined) {
      throw new Error("Expected Vicious Mockery roll rider.");
    }
    expect(
      supportedFailedSavePostDamageRiders(mockery, mockeryPhase, [
        mockeryRider,
      ]),
    ).toEqual([
      {
        kind: "nextAttackRollByTarget",
        mode: "disadvantage",
        expiresAt: "endOfTargetNextTurn",
      },
    ]);
    expect(
      supportedFailedSavePostDamageRiders(mockery, mockeryPhase, [
        { kind: "none" },
      ]),
    ).toBeNull();

    const thunderwave = sourceFor("thunderwave");
    const thunderwavePhase = firstSaveGatePhase("thunderwave");
    const thunderwaveProjection = saveGatedDamageMechanicsFacts(thunderwave);
    if (
      thunderwaveProjection.tag !== "supported" ||
      thunderwaveProjection.facts.postSaveAreaEffect?.kind !==
        "selfOriginCubePush" ||
      thunderwavePhase.onFail.kind !== "composite"
    ) {
      throw new Error("Expected Thunderwave cube-push projection.");
    }
    const forceMove = thunderwavePhase.onFail.effects.find(
      (effect) => effect.kind === "force_move",
    );
    if (forceMove === undefined) {
      throw new Error("Expected Thunderwave creature-push rider.");
    }
    expect(
      supportedFailedSavePostDamageRiders(
        thunderwave,
        thunderwavePhase,
        [forceMove],
        thunderwaveProjection.facts.postSaveAreaEffect,
      ),
    ).toEqual([]);

    const whispers = sourceFor("dissonant_whispers");
    const whispersPhase = firstSaveGatePhase("dissonant_whispers");
    if (whispersPhase.onFail.kind !== "composite") {
      throw new Error(
        "Expected Dissonant Whispers composite failed-save effect.",
      );
    }
    const movement = whispersPhase.onFail.effects.find(
      (effect) => effect.kind === "forced_reaction_movement",
    );
    if (movement === undefined) {
      throw new Error("Expected Dissonant Whispers forced-movement rider.");
    }
    expect(
      supportedFailedSavePostDamageRiders(whispers, whispersPhase, [movement]),
    ).toEqual([
      {
        kind: "forcedReactionMovement",
        direction: "awayFromCaster",
        route: "safest",
        distance: "asFarAsPossible",
        cost: "targetReactionIfAvailable",
      },
    ]);
  });

  test("decodes malformed authored mechanics before reporting unsupported save-gate facts", () => {
    const malformed = malformedHoldPersonAbility();
    const result = saveGatedConditionMechanicsFacts({
      mechanics: malformed.mechanics,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ failedFact: "phaseAbility" }),
      ]),
    );
  });
});
