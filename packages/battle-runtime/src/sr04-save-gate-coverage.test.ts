import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
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
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  areaSaveGateSpellRangeFeet,
  hasSaveGateRepeatSaves,
  isPsychicDamageNextAttackDisadvantageRiderShape,
  saveGateTargetCountFactsFromSelection,
  saveGateTargeting,
  saveGatedConditionMechanicsFacts,
  supportedFailedSavePostDamageRiders,
  supportedSaveGateFailedSaveEffects,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import { chainedSpellAttackDamageProfile } from "./battle-reducer/spell-procedure-profiles/chained-spell-attack-damage.ts";
import { fallingCreatureMitigationReactionProfile } from "./battle-reducer/spell-procedure-profiles/falling-creature-mitigation-reaction.ts";
import { grantedAreaSaveDamageActionProfile } from "./battle-reducer/spell-procedure-profiles/granted-area-save-damage.ts";
import { saveGatedTurnConstraintBundleProfile } from "./battle-reducer/spell-procedure-profiles/save-gated-turn-constraint-bundle.ts";
import { saveGatedConditionWithRepeatProfile } from "./battle-reducer/spell-procedure-profiles/staged-save-condition.ts";

type SpellId = Parameters<typeof spellRecord>[0];

function firstPhase(spellId: SpellId): ActivationPhase {
  const phase = spellRecord(spellId).mechanics;
  if (phase.family !== "activation" && phase.family !== "triggered_reaction") {
    throw new Error("Expected phased spell mechanics.");
  }
  const first = phase.phases[0];
  if (first === undefined) throw new Error("Expected a spell phase.");
  return first;
}

function firstSaveGatePhase(spellId: SpellId) {
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
  const source = spellAdmissionSource(spellRecord(spellId));
  return source;
}

function syntheticSpell(
  spellId: SpellId,
  id: string,
  mechanics: SpellRecord["mechanics"],
): SpellRecord {
  const base = spellRecord(spellId);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: `Synthetic ${id}`,
    provenance: { kind: "synthetic-test", section: id },
    mechanics,
  });
}

function mechanicsSourceWithMutation(
  spellId: SpellId,
  suffix: string,
  mechanics: SpellRecord["mechanics"],
) {
  return spellAdmissionSource(
    syntheticSpell(spellId, unitId(`synthetic_sr04_${suffix}`), mechanics),
  );
}

function expectUnsupportedFact(
  result: {
    readonly tag: string;
    readonly issues?: readonly { readonly failedFact: string }[];
  },
  failedFact: string,
): void {
  expect(result.tag).toBe("unsupported");
  if (result.tag !== "unsupported" || result.issues === undefined) return;
  expect(result.issues.map(({ failedFact: actual }) => actual)).toContain(
    failedFact,
  );
}

function targetSelection(
  selection: TargetSelection,
): Extract<Attachment, { readonly kind: "hole" }> {
  const base = firstAttachment("hold_person");
  if (base.kind !== "hole" || base.value.kind !== "target") {
    throw new Error("Expected a target hole.");
  }
  return {
    ...base,
    value: { ...base.value, selection },
  };
}

describe("SR-04 save-gate coverage boundaries", () => {
  test("recognizes every ordinary save-gate targeting shape and rejects near misses", () => {
    expect(
      saveGateTargeting(
        targetSelection({ mode: "one", targetKinds: ["creature"] }),
      ),
    ).toEqual({
      kind: "singleCombatant",
    });
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
        targetSelection({ mode: "one", targetKinds: ["object"] }),
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

  test("keeps range projection coupled to the targeting origin", () => {
    const point = { kind: "point", feet: 60 } as const;
    const self = { kind: "self" } as const;
    const targeting = [
      "pointOriginSphere",
      "pointOriginSphereDiameter",
      "pointOriginCubeExcludingCaster",
      "pointOriginCube",
      "pointOriginGroundSquare",
      "primaryTargetOriginEmanation",
      "pointOriginCylinder",
      "targetList",
    ] as const;
    for (const kind of targeting) {
      expect(
        areaSaveGateSpellRangeFeet(point, {
          kind,
          ...(kind === "pointOriginSphere"
            ? { radiusFeet: movementFeet(5) }
            : {}),
          ...(kind === "pointOriginSphereDiameter"
            ? { diameterFeet: movementFeet(10) }
            : {}),
          ...(kind === "pointOriginCubeExcludingCaster" ||
          kind === "pointOriginCube"
            ? { sideFeet: movementFeet(15) }
            : {}),
          ...(kind === "pointOriginGroundSquare"
            ? { sideFeet: movementFeet(5) }
            : {}),
          ...(kind === "primaryTargetOriginEmanation" || kind === "targetList"
            ? {}
            : {}),
          ...(kind === "pointOriginCylinder"
            ? { radiusFeet: movementFeet(10), heightFeet: movementFeet(20) }
            : {}),
        } as never),
      ).toEqual(movementFeet(60));
    }
    for (const kind of [
      "selfOriginCube",
      "selfOriginCone",
      "selfOriginLine",
      "selfOriginEmanation",
    ] as const) {
      expect(
        areaSaveGateSpellRangeFeet(self, {
          kind,
          ...(kind === "selfOriginCube" ? { sideFeet: movementFeet(15) } : {}),
          ...(kind === "selfOriginCone"
            ? { lengthFeet: movementFeet(15) }
            : {}),
          ...(kind === "selfOriginLine"
            ? { lengthFeet: movementFeet(100), widthFeet: movementFeet(5) }
            : {}),
          ...(kind === "selfOriginEmanation"
            ? { radiusFeet: movementFeet(10) }
            : {}),
        } as never),
      ).toEqual(movementFeet(0));
    }
    expect(
      areaSaveGateSpellRangeFeet(
        { kind: "touch" },
        {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(5),
        },
      ),
    ).toBeNull();
  });

  test("retains only the supported linear target-count facts", () => {
    const valid = {
      mode: "choose_up_to",
      count: { kind: "linear", base: 1, baseLevel: 2, perSlotAboveBase: 1 },
    } as const;
    expect(saveGateTargetCountFactsFromSelection(valid, 2)).toEqual({
      base: PositiveInteger(1),
      baseLevel: spellSlotLevel(2),
      perSlotAboveBase: PositiveInteger(1),
    });
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
          count: { ...valid.count, base: 0 },
        },
        2,
      ),
    ).toBeNull();
    expect(
      saveGateTargetCountFactsFromSelection(
        {
          ...valid,
          count: { ...valid.count, baseLevel: 0 as never },
        },
        2,
      ),
    ).toBeNull();
    expect(
      saveGateTargetCountFactsFromSelection(
        {
          ...valid,
          count: { ...valid.count, perSlotAboveBase: 0 },
        },
        2,
      ),
    ).toBeNull();
  });

  test("recognizes the exact repeat-save boundary and psychic rider", () => {
    expect(hasSaveGateRepeatSaves(undefined)).toBe(false);
    expect(hasSaveGateRepeatSaves(firstPhase("vicious_mockery"))).toBe(false);
    expect(
      hasSaveGateRepeatSaves(firstSaveGatePhase("ray_of_enfeeblement")),
    ).toBe(true);

    const psychicPhase = firstSaveGatePhase("vicious_mockery");
    expect(
      isPsychicDamageNextAttackDisadvantageRiderShape(
        sourceFor("vicious_mockery"),
        psychicPhase,
      ),
    ).toBe(true);
    expect(
      isPsychicDamageNextAttackDisadvantageRiderShape(
        sourceFor("ray_of_enfeeblement"),
        firstSaveGatePhase("ray_of_enfeeblement"),
      ),
    ).toBe(false);
  });

  test("projects single and composite failed-save effects with post-save ownership", () => {
    const acid = sourceFor("acid_splash");
    const acidPhase = firstSaveGatePhase("acid_splash");
    expect(
      supportedSaveGateFailedSaveEffects(acid, acidPhase, acidPhase.onFail),
    ).toMatchObject({
      damage: expect.objectContaining({ kind: "damage", damageType: "acid" }),
      additionalDamageComponents: [],
      postDamageRiders: [],
    });

    expect(
      supportedSaveGateFailedSaveEffects(acid, acidPhase, acidPhase.onFail, {
        kind: "selfOriginCubePush",
        creaturePush: {
          distanceFeet: movementFeet(10),
          originDirection: "away_from_caster",
        },
        unsecuredObjectPush: {
          distanceFeet: movementFeet(10),
          originDirection: "away_from_caster",
          objectLocation: "entirely_within_area",
        },
        audibleBoom: {
          sound: "thunderous boom",
          audibleRadiusFeet: movementFeet(300),
        },
      }),
    ).toBeNull();
    expect(
      supportedSaveGateFailedSaveEffects(acid, acidPhase, acidPhase.onFail, {
        kind: "selfOriginCubePush",
        creaturePush: {
          distanceFeet: movementFeet(10),
          originDirection: "away_from_caster",
        },
        unsecuredObjectPush: {
          distanceFeet: movementFeet(10),
          originDirection: "away_from_caster",
          objectLocation: "entirely_within_area",
        },
        audibleBoom: {
          sound: "thunderous boom",
          audibleRadiusFeet: movementFeet(300),
        },
      }),
    ).toBeNull();
  });

  test("projects post-damage riders and rejects unrelated effects", () => {
    const spell = sourceFor("vicious_mockery");
    const phase = firstSaveGatePhase("vicious_mockery");
    if (phase.onFail.kind !== "composite") {
      throw new Error("Expected a composite failed-save effect.");
    }
    expect(
      supportedFailedSavePostDamageRiders(spell, phase, [
        phase.onFail.effects[1]!,
      ]),
    ).toEqual([
      {
        kind: "nextAttackRollByTarget",
        mode: "disadvantage",
        expiresAt: "endOfTargetNextTurn",
      },
    ]);
    expect(
      supportedFailedSavePostDamageRiders(spell, phase, [
        ...phase.onFail.effects,
        { kind: "none" },
      ]),
    ).toBeNull();
  });

  test("rejects unsupported spell families before attempting save-gate parsing", () => {
    expect(
      saveGatedConditionMechanicsFacts({
        mechanics: sourceFor("fly").mechanics,
      }),
    ).toEqual({ tag: "notRepresented" });
  });
});

describe("SR-04 save-gate profile admission boundaries", () => {
  test("Dragon Breath rejects each independently malformed operation witness", () => {
    const base = spellRecord("dragons_breath");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.operations[0]?.effect.kind !== "save_gate"
    ) {
      throw new Error("Expected Dragon Breath ongoing save-gate mechanics.");
    }
    const operation = base.mechanics.operations[0];
    const effect = operation.effect;
    const sourceForEffect = (suffix: string, nextEffect: typeof effect) =>
      mechanicsSourceWithMutation(
        "dragons_breath",
        `dragons_breath_${suffix}`,
        {
          ...base.mechanics,
          operations: [{ ...operation, effect: nextEffect }],
        },
      );
    const admit = (suffix: string, nextEffect: typeof effect) =>
      grantedAreaSaveDamageActionProfile.admitMechanics(
        sourceForEffect(suffix, nextEffect),
      );

    expectUnsupportedFact(
      grantedAreaSaveDamageActionProfile.admitMechanics(
        mechanicsSourceWithMutation(
          "dragons_breath",
          "dragons_breath_wrong_trigger",
          {
            ...base.mechanics,
            operations: [
              {
                ...operation,
                trigger: {
                  kind: "on_caster_spends_action",
                  cost: { kind: "bonus_action" },
                },
              },
            ],
          },
        ),
      ),
      "trigger",
    );
    expectUnsupportedFact(
      admit("wrong_save_ability", { ...effect, ability: "str" }),
      "saveAbility",
    );
    expectUnsupportedFact(
      admit("wrong_save_dc", { ...effect, dc: { kind: "fixed", dc: 12 } }),
      "saveDc",
    );
    expectUnsupportedFact(
      admit("wrong_cone", {
        ...effect,
        attachment: {
          ...effect.attachment,
          shape: { kind: "cone", lengthFeet: 10 },
        },
      }),
      "cone",
    );
    expectUnsupportedFact(
      admit("wrong_success", { ...effect, onSuccess: { kind: "none" } }),
      "successOutcome",
    );
    expectUnsupportedFact(
      admit("missing_damage", { ...effect, onFail: { kind: "none" } }),
      "damageEffect",
    );

    if (
      effect.onFail.kind !== "damage" ||
      effect.onFail.damageType.kind !== "hole"
    ) {
      throw new Error("Expected Dragon Breath damage choice mechanics.");
    }
    expectUnsupportedFact(
      admit("wrong_damage_amount", {
        ...effect,
        onFail: {
          ...effect.onFail,
          amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
        },
      }),
      "damageAmount",
    );
    expectUnsupportedFact(
      admit("wrong_damage_choices", {
        ...effect,
        onFail: {
          ...effect.onFail,
          damageType: {
            ...effect.onFail.damageType,
            value: { ...effect.onFail.damageType.value, options: ["acid"] },
          },
        },
      }),
      "damageTypeChoices",
    );
  });

  test("Slow requires every distinct failed-save constraint role", () => {
    const base = spellRecord("slow");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "save_gate" ||
      base.mechanics.phases[0].onFail.kind !== "composite"
    ) {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const failed = phase.onFail;
    const mutateEffect = (
      effectKind: string,
      replacement: (
        effect: Extract<
          (typeof failed.effects)[number],
          { readonly kind: string }
        >,
      ) => unknown,
    ) =>
      failed.effects.map((effect) =>
        effect.kind === effectKind ? replacement(effect) : effect,
      ) as typeof failed.effects;
    const malformed = (suffix: string, effects: typeof failed.effects) =>
      saveGatedTurnConstraintBundleProfile.admitMechanics(
        mechanicsSourceWithMutation("slow", `slow_${suffix}`, {
          ...base.mechanics,
          phases: [{ ...phase, onFail: { ...failed, effects } }],
        }),
      );

    const cases = [
      [
        "speed",
        "set_speed_ratio",
        (
          effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "set_speed_ratio" }
          >,
        ) => ({
          ...effect,
          numerator: 2,
        }),
      ],
      [
        "armor",
        "modify_ac",
        (
          effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "modify_ac" }
          >,
        ) => ({
          ...effect,
          delta: { ...effect.delta, sign: "+" },
        }),
      ],
      [
        "dexterity",
        "modify_roll_numeric",
        (
          effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "modify_roll_numeric" }
          >,
        ) => ({
          ...effect,
          abilityFilter: ["str"],
        }),
      ],
      [
        "reaction",
        "restrict_action_usage",
        (
          effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "restrict_action_usage" }
          >,
        ) => ({
          ...effect,
          actions: ["bonus_action"],
        }),
      ],
      [
        "attack_cap",
        "cap_attack_action_attacks",
        (
          _effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "cap_attack_action_attacks" }
          >,
        ) => ({
          kind: "none",
        }),
      ],
      [
        "somatic",
        "somatic_spell_failure_chance",
        (
          _effect: Extract<
            (typeof failed.effects)[number],
            { readonly kind: "somatic_spell_failure_chance" }
          >,
        ) => ({
          kind: "none",
        }),
      ],
    ] as const;
    for (const [suffix, kind, replacement] of cases) {
      const result = malformed(
        suffix,
        mutateEffect(kind, replacement as never),
      );
      expectUnsupportedFact(result, "extraFailedSaveEffect");
      expectUnsupportedFact(result, "missingFailedSaveEffect");
    }

    const withoutRepeat = saveGatedTurnConstraintBundleProfile.admitMechanics(
      mechanicsSourceWithMutation("slow", "slow_wrong_repeat", {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            repeatSaves: [
              {
                cadence: "end_of_target_turn",
                onSuccess: "ends_on_target",
                rollMode: "advantage",
              },
            ],
          },
        ],
      }),
    );
    expectUnsupportedFact(withoutRepeat, "repeatSave");
  });

  test("Feather Fall keeps trigger, target, and mitigation witnesses exact", () => {
    const base = spellRecord("feather_fall");
    if (
      base.mechanics.family !== "triggered_reaction" ||
      base.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Feather Fall direct reaction mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const admitted = (suffix: string, mechanics: SpellRecord["mechanics"]) =>
      fallingCreatureMitigationReactionProfile.admitMechanics(
        mechanicsSourceWithMutation("feather_fall", suffix, mechanics),
      );
    expectUnsupportedFact(
      admitted("wrong_level", { ...base.mechanics, level: 2 }),
      "level",
    );
    expectUnsupportedFact(
      admitted("wrong_material_components", {
        ...base.mechanics,
        components: { ...base.mechanics.components, s: true },
      }),
      "components",
    );
    expectUnsupportedFact(
      admitted("wrong_range", {
        ...base.mechanics,
        range: { kind: "point", feet: 30 },
      }),
      "range",
    );
    expectUnsupportedFact(
      admitted("wrong_trigger_range", {
        ...base.mechanics,
        castingTime: {
          ...base.mechanics.castingTime,
          trigger: { kind: "takes_damage_from_creature", rangeFeet: 30 },
        },
      }),
      "castingTime",
    );
    expectUnsupportedFact(
      admitted("wrong_selection", {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            attachment: {
              ...phase.attachment,
              value: {
                ...phase.attachment.value,
                selection: {
                  mode: "choose_up_to",
                  count: 4,
                  targetKinds: ["creature"],
                  stateFilter: ["falling"],
                },
              },
            },
          },
        ],
      }),
      "targetSelection",
    );
    expectUnsupportedFact(
      admitted("wrong_effect", {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            effects: [{ kind: "none" }],
          },
        ],
      }),
      "effect",
    );
    expectUnsupportedFact(
      admitted("wrong_interrupt_flag", {
        ...base.mechanics,
        interruptsTrigger: false,
      }),
      "interruptsTrigger",
    );
  });

  test("Sleep staged conditions reject targeting and repeat near misses", () => {
    const base = spellRecord("hideous_laughter");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Hideous Laughter save-gate mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const admitted = (suffix: string, nextPhase: typeof phase) =>
      saveGatedConditionWithRepeatProfile.admitMechanics(
        mechanicsSourceWithMutation("hideous_laughter", `laughter_${suffix}`, {
          ...base.mechanics,
          phases: [nextPhase],
        }),
      );
    expectUnsupportedFact(
      admitted("wrong_ability", { ...phase, ability: "str" }),
      "phaseAbility",
    );
    expectUnsupportedFact(
      admitted("wrong_dc", { ...phase, dc: { kind: "fixed", dc: 12 } }),
      "phaseDc",
    );
    expectUnsupportedFact(
      admitted("wrong_success", {
        ...phase,
        onSuccess: { kind: "half_damage" },
      }),
      "successOutcome",
    );
    expectUnsupportedFact(
      admitted("wrong_target_mode", {
        ...phase,
        attachment: {
          ...phase.attachment,
          value: {
            ...phase.attachment.value,
            selection: { mode: "one" },
          },
        },
      }),
      "phaseAttachment",
    );
    if (phase.repeatSaves === undefined) {
      throw new Error("Expected Sleep repeat-save mechanics.");
    }
    expectUnsupportedFact(
      admitted("wrong_repeat", {
        ...phase,
        repeatSaves: phase.repeatSaves.map((repeat) => ({
          ...repeat,
          rollMode: "advantage",
        })),
      }),
      "extraRepeat",
    );
  });

  test("Chromatic Orb keeps primary/leap attack and damage correlations exact", () => {
    const base = spellRecord("chromatic_orb");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "attack_roll" ||
      base.mechanics.phases[0].continue?.kind !== "repeat"
    ) {
      throw new Error("Expected Chromatic Orb chained attack mechanics.");
    }
    const phase = base.mechanics.phases[0];
    const continuation = phase.continue;
    const leap = continuation.next[0];
    if (leap?.kind !== "attack_roll") {
      throw new Error("Expected Chromatic Orb leap attack mechanics.");
    }
    const admitted = (suffix: string, nextPhase: typeof phase) =>
      chainedSpellAttackDamageProfile.admitMechanics(
        mechanicsSourceWithMutation("chromatic_orb", `orb_${suffix}`, {
          ...base.mechanics,
          phases: [nextPhase],
        }),
      );
    expectUnsupportedFact(
      admitted("wrong_primary_attack_kind", {
        ...phase,
        attackKind: "melee_spell_attack",
      }),
      "leapAttackKind",
    );
    expectUnsupportedFact(
      admitted("wrong_primary_target", {
        ...phase,
        attachment: {
          ...phase.attachment,
          value: {
            ...phase.attachment.value,
            selection: { mode: "one", targetKinds: ["object"] },
          },
        },
      }),
      "attachment",
    );
    expectUnsupportedFact(
      admitted("wrong_primary_miss", {
        ...phase,
        onMiss: [{ kind: "apply_condition", condition: "prone" }],
      }),
      "missDamage",
    );
    expectUnsupportedFact(
      admitted("extra_primary_hit", {
        ...phase,
        onHit: [...phase.onHit, { kind: "none" }],
      }),
      "hitDamage",
    );
    expectUnsupportedFact(
      admitted("wrong_continuation_trigger", {
        ...phase,
        continue: {
          ...continuation,
          limits: [{ kind: "max_leaps_from_slot_level" }],
        },
      }),
      "continuation",
    );
    expectUnsupportedFact(
      admitted("wrong_leap_attack_kind", {
        ...phase,
        continue: {
          ...continuation,
          next: [{ ...leap, attackKind: "melee_spell_attack" }],
        },
      }),
      "leapAttackKind",
    );
    expectUnsupportedFact(
      admitted("wrong_leap_miss", {
        ...phase,
        continue: {
          ...continuation,
          next: [
            {
              ...leap,
              onMiss: [
                { kind: "none" },
                { kind: "apply_condition", condition: "prone" },
              ],
            },
          ],
        },
      }),
      "leapMissDamage",
    );
  });

  test("profile witnesses remain represented but unsupported after unrelated phase insertion", () => {
    const slow = spellRecord("slow");
    if (slow.mechanics.family !== "activation") {
      throw new Error("Expected Slow activation mechanics.");
    }
    const source = mechanicsSourceWithMutation("slow", "slow_extra_phase", {
      ...slow.mechanics,
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [{ kind: "none" }],
        },
        ...slow.mechanics.phases,
      ],
    });
    const result = saveGatedTurnConstraintBundleProfile.admitMechanics(source);
    expectUnsupportedFact(result, "phaseCount");
    expectUnsupportedFact(result, "phaseOrder");
  });
});
