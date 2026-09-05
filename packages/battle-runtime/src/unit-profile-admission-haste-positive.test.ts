import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  monsterMultiattackStatBlock,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { BattleSnapshotSchema, discoverBattleActCandidates } from "./index.ts";
import { battleEffectExecutionRef } from "./identity.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L5-C17-HASTE-POSITIVE-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L5-C18-HASTE-LETHARGY-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-C17-HASTE-POSITIVE-RUNTIME haste
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-C18-HASTE-LETHARGY-RUNTIME haste
// UNIT-IDENTITY-REPLAY: L5-C17-HASTE-POSITIVE-RUNTIME haste doReplayHastePositiveEffects
// UNIT-IDENTITY-REPLAY: L5-C18-HASTE-LETHARGY-RUNTIME haste doReplayHasteLethargy
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-haste-positive
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { openClassFeatureExtraAttackResource } from "./battle-reducer/attack-resolution.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";
import {
  extraAttackSupportProfile,
  fighterExtraAttackUnitId,
  hasteUnitId,
  sleepUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { Result } from "effect";
import {
  battleUnitRefWithSupportProfiles,
  breakBattleConcentration,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  applyCondition,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";
import type { RuntimeActionResource } from "@dnd/shared-algebras/action-economy-algebra";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  CombatantId,
} from "./unit-profile-admission.test-support.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import { compositeTargetBuffWithAftermathProfile } from "./battle-reducer/spell-procedure-profiles/composite-target-buff.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function hasteMechanics(): ActivationSpellMechanics {
  const mechanics = spellRecord(hasteUnitId).mechanics;
  if (mechanics.family !== "activation")
    throw new Error("Expected Haste activation mechanics.");
  return mechanics;
}

function syntheticCompositeTargetBuffRecord(
  mechanics: ActivationSpellMechanics,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_composite_target_buff_${suffix}`,
    kind: "spell",
    name: `Synthetic Composite Target Buff ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_composite_target_buff_${suffix}`,
    },
    mechanics,
  });
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function malformedCompositeTargetBuffSource(
  mutate: (mechanics: ActivationSpellMechanics) => void,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(hasteUnitId));
  const mechanics = structuredClone(hasteMechanics());
  mutate(mechanics);
  return { ...mechanicsSource(source), mechanics };
}

function admissionIssueShape(
  result: ReturnType<
    typeof compositeTargetBuffWithAftermathProfile.admitMechanics
  >,
) {
  return result.tag === "unsupported"
    ? result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("compositeTargetBuffWithAftermath static mechanics admission", () => {
  test("projects execution facts with exact complete-root evidence", () => {
    const source = spellAdmissionSource(spellRecord(hasteUnitId));
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 3,
      rangeFeet: 30,
      duration: {
        kind: "concentration",
        upTo: { amount: 1, unit: "minute" },
      },
      speedRatio: { numerator: 2, denominator: 1 },
      armorClassBonus: 2,
      savingThrowAdvantage: { ability: "dex", mode: "advantage" },
      actionRestriction: {
        kind: "allow_only",
        actions: [
          {
            action: "attack",
            attackLimit: { kind: "attack_count", count: 1 },
          },
          { action: "dash" },
          { action: "disengage" },
          { action: "hide" },
          { action: "utilize" },
        ],
      },
      spellEndTargetState: { condition: "incapacitated" },
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        ...[1, 2, 3, 4, 5].map((ordinal) =>
          spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(ordinal),
          ),
        ),
      ],
      unowned: [],
    });

    const session = spellBattle({
      preparedSpells: [],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected the spell caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) throw new Error("Expected spell admission context.");
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        ...context,
        castingSource: source.castingSource,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      procedure: "compositeTargetBuffWithAftermath",
      rangeFeet: 30,
      activeEffects: {
        speedRatio: { numerator: 2, denominator: 1 },
        armorClassBonus: { bonus: 2 },
        dexteritySavingThrowAdvantage: {
          ability: "dex",
          mode: "advantage",
        },
        grantedActionResource: { restriction: { kind: "allow_only" } },
        spellEndTargetState: { condition: "incapacitated" },
      },
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes renamed synthetic mechanics without authored identity dispatch", () => {
    const original = spellAdmissionSource(spellRecord(hasteUnitId));
    const renamed = spellAdmissionSource(
      syntheticCompositeTargetBuffRecord(hasteMechanics(), "renamed"),
    );
    const originalResult =
      compositeTargetBuffWithAftermathProfile.admitMechanics(
        mechanicsSource(original),
      );
    const renamedResult =
      compositeTargetBuffWithAftermathProfile.admitMechanics(
        mechanicsSource(renamed),
      );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported" || renamedResult.tag !== "supported")
      return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("canonicalizes semantically reordered synthetic action choices", () => {
    const original = spellAdmissionSource(spellRecord(hasteUnitId));
    const mechanics = structuredClone(hasteMechanics());
    const phase = mechanics.phases[0];
    if (phase?.kind !== "direct")
      throw new Error("Expected Haste direct mechanics.");
    const extraAction = (phase.effects ?? []).find(
      (effect) => effect.kind === "grant_extra_action",
    );
    if (extraAction?.kind !== "grant_extra_action")
      throw new Error("Expected Haste's extra action effect.");
    if (extraAction.restriction.kind !== "allow_only")
      throw new Error("Expected Haste's restricted action set.");
    Reflect.set(
      extraAction.restriction,
      "actions",
      [...extraAction.restriction.actions].reverse(),
    );
    const reordered = spellAdmissionSource(
      syntheticCompositeTargetBuffRecord(mechanics, "reordered_actions"),
    );
    const originalResult =
      compositeTargetBuffWithAftermathProfile.admitMechanics(
        mechanicsSource(original),
      );
    const reorderedResult =
      compositeTargetBuffWithAftermathProfile.admitMechanics(
        mechanicsSource(reordered),
      );

    expect(originalResult.tag).toBe("supported");
    expect(reorderedResult.tag).toBe("supported");
    if (
      originalResult.tag !== "supported" ||
      reorderedResult.tag !== "supported"
    )
      return;
    expect(reorderedResult.admitted.facts.actionRestriction).toEqual(
      originalResult.admitted.facts.actionRestriction,
    );
    expect(reorderedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("does not represent an unrelated activation spell root", () => {
    const source = spellAdmissionSource(spellRecord(sleepUnitId));
    expect(
      compositeTargetBuffWithAftermathProfile.admitMechanics(
        mechanicsSource(source),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates complete-root, target, and every effect issue at exact paths", () => {
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      malformedCompositeTargetBuffSource((mechanics) => {
        Reflect.set(mechanics, "unexpectedRootFact", true);
        Reflect.set(mechanics, "school", "illusion");
        const phase = mechanics.phases[0];
        if (
          mechanics.duration.kind !== "concentration" ||
          phase?.kind !== "direct" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target"
        )
          throw new Error("Expected Haste direct mechanics.");
        Reflect.set(mechanics.duration.upTo, "amount", 2);
        Reflect.set(phase.attachment.value.selection, "visibility", "none");
        const [speed, armor, savingThrow, action, aftermath] =
          phase.effects ?? [];
        Reflect.set(speed ?? {}, "numerator", 3);
        if (armor?.kind === "modify_ac") Reflect.set(armor.delta, "amount", 3);
        Reflect.set(savingThrow ?? {}, "mode", "disadvantage");
        if (action?.kind === "grant_extra_action")
          Reflect.set(action.restriction, "actions", [{ action: "dash" }]);
        Reflect.set(aftermath ?? {}, "condition", "stunned");
      }),
    );

    expect(admissionIssueShape(result)).toEqual([
      { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      {
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
      },
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "targetSelection",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "speedRatio",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
      {
        failedFact: "armorClassBonus",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(2),
        ),
      },
      {
        failedFact: "savingThrowAdvantage",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(3),
        ),
      },
      {
        failedFact: "actionRestriction",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(4),
        ),
      },
      {
        failedFact: "spellEndTargetState",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(5),
        ),
      },
    ]);
  });

  test("selects the characteristic phase behind a leading extra direct phase", () => {
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      malformedCompositeTargetBuffSource((mechanics) => {
        const characteristicPhase = mechanics.phases[0];
        if (characteristicPhase?.kind !== "direct")
          throw new Error("Expected Haste direct mechanics.");
        const speedRatio = characteristicPhase.effects?.[0];
        if (speedRatio?.kind !== "set_speed_ratio")
          throw new Error("Expected Haste's speed-ratio effect.");
        Reflect.set(speedRatio, "numerator", 3);
        Reflect.set(mechanics, "phases", [
          {
            ...characteristicPhase,
            attachment: { kind: "self" },
            effects: [
              {
                kind: "audible",
                audibleRadiusFeet: 30,
                sound: "synthetic prelude",
              },
            ],
          },
          characteristicPhase,
        ]);
      }),
    );

    expect(result.tag).toBe("unsupported");
    expect(admissionIssueShape(result)).toEqual([
      {
        failedFact: "phaseCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
      {
        failedFact: "speedRatio",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(2),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("retains original ordinals when a non-Effect child shifts a malformed owned effect", () => {
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      malformedCompositeTargetBuffSource((mechanics) => {
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct")
          throw new Error("Expected Haste direct mechanics.");
        const effects = phase.effects ?? [];
        const speedRatio = effects[0];
        if (speedRatio?.kind !== "set_speed_ratio")
          throw new Error("Expected Haste's speed-ratio effect.");
        Reflect.set(speedRatio, "numerator", 3);
        Reflect.set(phase, "effects", [
          {
            kind: "push_unsecured_objects",
            distanceFeet: 10,
            objectLocation: "entirely_within_area",
            originDirection: "away_from_caster",
          },
          ...effects,
        ]);
      }),
    );

    expect(admissionIssueShape(result)).toEqual([
      {
        failedFact: "effectCount",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
      {
        failedFact: "speedRatio",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(2),
        ),
      },
    ]);
  });

  test("reports an ordinary replacement at its ordinal and the missing semantic fact at the phase", () => {
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      malformedCompositeTargetBuffSource((mechanics) => {
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct")
          throw new Error("Expected Haste direct mechanics.");
        const effects = [...(phase.effects ?? [])];
        effects[2] = {
          kind: "audible",
          audibleRadiusFeet: 30,
          sound: "synthetic chime",
        };
        Reflect.set(phase, "effects", effects);
      }),
    );

    expect(admissionIssueShape(result)).toEqual([
      {
        failedFact: "effectCount",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(3),
        ),
      },
      {
        failedFact: "savingThrowAdvantage",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("reports material and duration children at their nested paths", () => {
    const result = compositeTargetBuffWithAftermathProfile.admitMechanics(
      malformedCompositeTargetBuffSource((mechanics) => {
        Reflect.set(mechanics.components, "materialCostGp", 5);
        Reflect.set(mechanics.components, "materialConsumed", true);
        if (mechanics.duration.kind !== "concentration")
          throw new Error("Expected Haste concentration duration.");
        Reflect.set(mechanics.duration.upTo, "upcastTiers", [
          { atSlot: 4, amount: 2 },
        ]);
        Reflect.set(mechanics.duration, "earlyEnd", [
          { kind: "target_takes_damage" },
        ]);
      }),
    );

    expect(admissionIssueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("cost"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("consumption"),
      },
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
    ]);
  });
});

describe("L5-C17/L5-C18 Haste runtime profile", () => {
  test("admits Haste as a level-3 Magic Action spell and applies positive effects", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetUnitRefs: [extraAttackBattleUnitRef()],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          hasteUnitId,
          3,
          "compositeTargetBuffWithAftermath",
        ),
      ),
      mode: { tag: "cast" },
    });

    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole,
    });

    expect(resolved.snapshot).toMatchObject({
      combatants: [
        expect.objectContaining({
          combatantId: spellCasterId,
          concentrating: true,
        }),
        expect.objectContaining({
          combatantId: spellTargetId,
          armorClass: 12,
          movement: expect.objectContaining({ speedFeet: 60 }),
        }),
      ],
    });
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") return;
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(Number(effectiveWalkSpeed(resolved.state, target))).toBe(60);
    expect(target.activeEffects.map((effect) => effect.kind)).toEqual(
      expect.arrayContaining([
        "speedRatio",
        "spellArmorClassBonus",
        "savingThrowRollMode",
        "spellGrantedActionResource",
      ]),
    );
    const hasteEffects = target.activeEffects.filter((effect) =>
      isHastePositiveEffectKind(effect.kind),
    );
    expect(hasteEffects).toHaveLength(5);
    expect(hasteEffects.every((effect) => "effectRef" in effect)).toBe(true);
    expect(
      new Set(
        hasteEffects.flatMap((effect) =>
          "effectRef" in effect ? [effect.effectRef] : [],
        ),
      ).size,
    ).toBe(hasteEffects.length);
    expect(savingThrowRollModeProjections(resolved.state, "dex")).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    expect(savingThrowRollModeProjections(resolved.state, "con")).toEqual([]);

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const spellEffectResource =
      targetTurn.state.currentTurnResources.actionResources[1];
    expect(targetTurn.state.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
      }),
    ]);
    expect(spellEffectResource).toBeDefined();
    if (spellEffectResource === undefined) return;

    const ordinaryActionSpent = spendAction(
      targetTurn.state.currentTurnResources,
      "magic",
    );
    expect(Result.isSuccess(ordinaryActionSpent)).toBe(true);
    if (Result.isFailure(ordinaryActionSpent)) return;
    expect(canSpendAction(ordinaryActionSpent.success, "magic")).toBe(false);
    expect(canSpendAction(ordinaryActionSpent.success, "dash")).toBe(true);

    const noExtraAttackFromHasteAction = openClassFeatureExtraAttackResource({
      state: stateAfterSpendingResource(targetTurn.state, spellEffectResource),
      actorId: spellTargetId,
      spentResource: spellEffectResource,
    });
    expect(
      noExtraAttackFromHasteAction.actionResources.some(
        (resource) => resource.source === "classFeatureExtraAttack",
      ),
    ).toBe(false);
  });

  test("keeps the bound Haste Action while a Stat Block Multiattack continuation is active", () => {
    const spell = spellRecord(hasteUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetStatBlock: monsterMultiattackStatBlock(),
    });
    const act = spellAct({
      session,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const cast = resolveHaste({
      state: session.state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const ordinaryTurn = Schema.encodeSync(BattleSnapshotSchema)(
      targetTurn.snapshot,
    );
    const ordinaryHasteResource = ordinaryTurn.turn.actionResources.find(
      (resource) => resource.source === "spellEffect",
    );
    expect(ordinaryHasteResource).toBeDefined();
    if (ordinaryHasteResource === undefined) return;
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(ordinaryTurn),
      ),
    ).toBe(true);
    const ordinaryHasteOccurrence = ordinaryTurn.combatants
      .find((combatant) => combatant.combatantId === spellTargetId)
      ?.activeEffectOccurrences.find(
        (occurrence) =>
          occurrence.effectRef === ordinaryHasteResource.sourceEffectRef,
      );
    expect(ordinaryHasteOccurrence).toBeDefined();
    if (ordinaryHasteOccurrence === undefined) return;
    const inactiveHaste = {
      ...ordinaryTurn,
      combatants: ordinaryTurn.combatants.map((combatant) =>
        combatant.combatantId === spellTargetId
          ? {
              ...combatant,
              activeEffectOccurrences: combatant.activeEffectOccurrences.filter(
                (occurrence) =>
                  occurrence.effectRef !==
                  ordinaryHasteResource.sourceEffectRef,
              ),
            }
          : combatant,
      ),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(inactiveHaste),
      ),
    ).toBe(true);
    const foreignOwner = ordinaryTurn.combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(foreignOwner?.origin.kind).toBe("character");
    if (foreignOwner?.origin.kind !== "character") return;
    const foreignEffectOrdinal = 999;
    const foreignEffectRef = battleEffectExecutionRef(
      JSON.stringify({
        kind: "effectOccurrence",
        ownerScopeRef: foreignOwner.origin.execution.scopeRef,
        ordinal: foreignEffectOrdinal,
      }),
    );
    const foreignHaste = {
      ...ordinaryTurn,
      combatants: ordinaryTurn.combatants.map((combatant) =>
        combatant.combatantId === spellCasterId
          ? {
              ...combatant,
              activeEffectOccurrences: [
                ...combatant.activeEffectOccurrences,
                {
                  ...ordinaryHasteOccurrence,
                  effectRef: foreignEffectRef,
                },
              ],
            }
          : combatant,
      ),
      turn: {
        ...ordinaryTurn.turn,
        actionResources: ordinaryTurn.turn.actionResources.map((resource) =>
          resource.source === "spellEffect"
            ? { ...resource, sourceEffectRef: foreignEffectRef }
            : resource,
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(foreignHaste),
      ),
    ).toBe(true);
    const duplicatedOrdinaryHaste = {
      ...ordinaryTurn,
      turn: {
        ...ordinaryTurn.turn,
        actionResources: [
          ...ordinaryTurn.turn.actionResources,
          ordinaryHasteResource,
        ],
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          duplicatedOrdinaryHaste,
        ),
      ),
    ).toBe(true);
    const multiattack = discoverBattleActCandidates(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.actorId === spellTargetId &&
        candidate.subject.action === "multiattack",
    );
    expect(multiattack).toBeDefined();
    if (multiattack === undefined) return;
    const opened = resolveBattleSubject({
      state: targetTurn.state,
      subject: multiattack.subject,
      fills: [],
    });
    expect(opened.tag).toBe("resolved");
    if (opened.tag !== "resolved") return;

    expect(
      opened.snapshot.turn.actionResources.filter(
        (resource) => resource.source === "spellEffect",
      ),
    ).toHaveLength(1);
    expect(
      opened.snapshot.turn.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(
      opened.snapshot.turn.actionResources.filter(
        (resource) => resource.source === "statBlockMultiattack",
      ).length,
    ).toBeGreaterThan(0);

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(opened.snapshot);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(encoded),
      ),
    ).toBe(true);
    const forgedSpellRestriction = {
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "spellEffect"
            ? { ...resource, restriction: { kind: "none" } }
            : resource,
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          forgedSpellRestriction,
        ),
      ),
    ).toBe(true);
    const forgedSpellOwner = {
      ...encoded,
      turn: {
        ...encoded.turn,
        actionResources: encoded.turn.actionResources.map((resource) =>
          resource.source === "spellEffect"
            ? { ...resource, sourceOwnerId: spellCasterId }
            : resource,
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(forgedSpellOwner),
      ),
    ).toBe(true);
  });

  test("grants the spell action resource immediately when Haste targets the current actor", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(resolved.state.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
      }),
    ]);
    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("removes the current-turn spell action resource when self-cast Haste ends", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole,
      targetId: spellCasterId,
    });

    expect(canSpendAction(resolved.state.currentTurnResources, "dash")).toBe(
      true,
    );

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = requireCombatant(ended, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(caster.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(ended, caster))).toBe(0);
    expect(
      caster.activeEffects.some(
        (effect) =>
          effect.kind === "spellGrantedActionResource" &&
          effect.sourceCombatantId === spellCasterId,
      ),
    ).toBe(false);
    expect(ended.currentTurnResources.actionResources).toEqual([]);
    expect(canSpendAction(ended.currentTurnResources, "dash")).toBe(false);
  });

  test("promotes source-owned lethargy when Haste concentration ends", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const targetBeforeLethargy = requireCombatant(
      resolved.state,
      spellTargetId,
    );

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = requireCombatant(ended, spellCasterId);
    const target = requireCombatant(ended, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(ended, target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
    const lethargyRefs = target.activeEffects.flatMap((effect) =>
      (effect.kind === "spellCondition" || effect.kind === "spellSpeedZero") &&
      "effectRef" in effect
        ? [effect.effectRef]
        : [],
    );
    expect(new Set(lethargyRefs).size).toBe(2);
    expect(Number(target.nextEffectOrdinal)).toBe(
      Number(targetBeforeLethargy.nextEffectOrdinal) + 2,
    );
  });

  test("Haste lethargy Incapacitated breaks the target's own Concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = stateWithSyntheticTargetConcentration(base.state);
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...base, state }),
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const target = requireCombatant(ended, spellTargetId);

    expect(target.concentration).toBeNull();
    expect(hasSyntheticTargetConcentrationEffect(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(ended, target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("a failed Sleep save breaks Haste and the Sleep caster's Concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const sleep = spellRecord(sleepUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetPreparedSpells: [sleep],
    });
    const act = spellAct({
      session: base,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state: base.state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const sleepSession = battleRuntimeSessionForTest({
      ...base,
      state: targetTurn.state,
    });
    const sleepAct = spellAct({
      session: sleepSession,
      spellId: sleepUnitId,
      slotLevel: 1,
    });
    const sleepSave = requireHole(sleepAct.initialHoles, "savingThrowOutcome");
    const ended = resolveBattleSubject({
      state: targetTurn.state,
      subject: sleepAct.subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: sleepSave.holeId,
          value: {
            area: {
              originAnchorId: spellTargetId,
              affectedTargetIds: [spellCasterId],
            },
            outcomes: [{ targetId: spellCasterId, succeeded: false }],
          },
        },
      ],
    });
    if (ended.tag !== "resolved") {
      throw new Error(
        `Expected the failed Sleep save to resolve: ${ended.tag === "invalid" ? ended.message : ended.tag}`,
      );
    }
    expect(ended.tag).toBe("resolved");

    const caster = requireCombatant(ended.state, spellCasterId);
    const target = requireCombatant(ended.state, spellTargetId);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(caster.conditions, "incapacitated")).toBe(false);
    expect(target.concentration).toBeNull();
    expect(hasSyntheticTargetConcentrationEffect(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(ended.state, target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("expires Haste lethargy at target turn end without removing unrelated Incapacitated", () => {
    const spell = spellRecord(hasteUnitId);
    const base = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const state = stateWithDirectIncapacitated(base.state, spellTargetId);
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...base, state }),
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    const targetTurn = expectEndTurn(ended, spellCasterId);
    expect(hasHasteSpeedZero(requireCombatant(targetTurn, spellTargetId))).toBe(
      true,
    );

    const afterTargetTurn = expectEndTurn(targetTurn, spellTargetId);
    const target = requireCombatant(afterTargetTurn, spellTargetId);

    expect(hasHasteLethargyCondition(target)).toBe(false);
    expect(hasHasteSpeedZero(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(afterTargetTurn, target))).toBe(30);
  });

  test("duration expiry applies Haste lethargy and clears caster concentration", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const nearExpiry = stateWithHasteDurationTicks(
      resolved.state,
      elapsedTimeTicks(1),
    );

    const targetTurn = expectEndTurn(nearExpiry, spellCasterId);
    const nextRound = expectEndTurn(targetTurn, spellTargetId);
    const caster = requireCombatant(nextRound, spellCasterId);
    const target = requireCombatant(nextRound, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(nextRound, target))).toBe(0);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
  });

  test("duration expiry into the target's next round turn clears Haste lethargy at that turn end", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state: state.state,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });
    const nearExpiry = stateWithTargetAlreadyActedAndCasterLast(
      stateWithHasteDurationTicks(resolved.state, elapsedTimeTicks(1)),
    );

    const targetTurn = expectEndTurn(nearExpiry, spellCasterId);
    const targetDuringTurn = requireCombatant(targetTurn, spellTargetId);
    expect(targetTurn.initiative.stillToAct[0].creature).toBe(spellTargetId);
    expect(hasHastePositiveEffects(targetDuringTurn)).toBe(false);
    expect(hasHasteLethargyCondition(targetDuringTurn)).toBe(true);
    expect(hasHasteSpeedZero(targetDuringTurn)).toBe(true);
    expect(Number(effectiveWalkSpeed(targetTurn, targetDuringTurn))).toBe(0);

    const afterTargetTurn = expectEndTurn(targetTurn, spellTargetId);
    const caster = requireCombatant(afterTargetTurn, spellCasterId);
    const target = requireCombatant(afterTargetTurn, spellTargetId);

    expect(caster.concentration).toBeNull();
    expect(hasHastePositiveEffects(target)).toBe(false);
    expect(hasHasteLethargyCondition(target)).toBe(false);
    expect(hasHasteSpeedZero(target)).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(Number(effectiveWalkSpeed(afterTargetTurn, target))).toBe(30);
  });

  test("recasting Haste starts the new spell after old Haste lethargy is promoted", () => {
    const spell = spellRecord(hasteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 2 }],
    });
    const firstAct = spellAct({
      session: state,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const initialTargetOrdinal = Number(
      requireCombatant(state.state, spellTargetId).nextEffectOrdinal,
    );
    const first = resolveHaste({
      state: state.state,
      subject: firstAct.subject,
      targetHole: requireHole(firstAct.initialHoles, "targetChoice"),
    });
    const firstTarget = requireCombatant(first.state, spellTargetId);
    const firstHasteRefs = firstTarget.activeEffects.flatMap((effect) =>
      isHastePositiveEffectKind(effect.kind) && "effectRef" in effect
        ? [effect.effectRef]
        : [],
    );
    expect(firstHasteRefs).toHaveLength(5);
    expect(Number(firstTarget.nextEffectOrdinal)).toBe(
      initialTargetOrdinal + 5,
    );
    const targetTurn = expectEndTurn(first.state, spellCasterId);
    const nextCasterTurn = expectEndTurn(targetTurn, spellTargetId);
    const secondAct = spellAct({
      session: battleRuntimeSessionForTest({ ...state, state: nextCasterTurn }),
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const ordinalBeforeRecast = Number(
      requireCombatant(nextCasterTurn, spellTargetId).nextEffectOrdinal,
    );
    const second = resolveHaste({
      state: nextCasterTurn,
      subject: secondAct.subject,
      targetHole: requireHole(secondAct.initialHoles, "targetChoice"),
    });
    const caster = requireCombatant(second.state, spellCasterId);
    const target = requireCombatant(second.state, spellTargetId);
    const secondHasteRefs = target.activeEffects.flatMap((effect) =>
      isHastePositiveEffectKind(effect.kind) && "effectRef" in effect
        ? [effect.effectRef]
        : [],
    );

    expect(caster.concentration).toEqual(
      expect.objectContaining({
        effectKind: "spellEffect",
        sourceProcedureRef: secondAct.subject.procedureRef,
      }),
    );
    expect(hasHastePositiveEffects(target)).toBe(true);
    expect(hasHasteLethargyCondition(target)).toBe(true);
    expect(hasHasteSpeedZero(target)).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(second.state, target))).toBe(0);
    expect(secondHasteRefs).toHaveLength(5);
    expect(secondHasteRefs.every((ref) => !firstHasteRefs.includes(ref))).toBe(
      true,
    );
    // Recasting promotes the old Haste end-state into two occurrences, then
    // binds five fresh positive effects.
    expect(Number(target.nextEffectOrdinal)).toBe(ordinalBeforeRecast + 7);
  });

  test("Haste creation preserves a target-owned concentration effect", () => {
    const spell = spellRecord(hasteUnitId);
    const initial = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const withTargetConcentration = stateWithSyntheticTargetConcentration(
      initial.state,
    );
    const session = battleRuntimeSessionForTest({
      ...initial,
      state: withTargetConcentration,
    });
    const act = spellAct({
      session,
      spellId: hasteUnitId,
      slotLevel: 3,
    });
    const resolved = resolveHaste({
      state: withTargetConcentration,
      subject: act.subject,
      targetHole: requireHole(act.initialHoles, "targetChoice"),
    });

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(hasSyntheticTargetConcentrationEffect(target)).toBe(true);
    expect(hasHastePositiveEffects(target)).toBe(true);
  });
});

function resolveHaste(input: {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof spellAct>["subject"];
  readonly targetHole: Extract<
    ReturnType<typeof spellAct>["initialHoles"][number],
    { readonly kind: "targetChoice" }
  >;
  readonly targetId?: CombatantId;
}) {
  const targetId = input.targetId ?? spellTargetId;
  const resolved = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      knownWillingSpellTargetFill(
        input.targetHole,
        hasteUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Haste positive effects to resolve.");
  }
  return resolved;
}

function expectEndTurn(state: BattleState, actorId: CombatantId): BattleState {
  const resolved = endTurn({ state, actorId });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected ${actorId} to end its turn.`);
  }
  return resolved.state;
}

function hasHastePositiveEffects(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      isHastePositiveEffectKind(effect.kind) &&
      "sourceProcedureRef" in effect &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function isHastePositiveEffectKind(kind: BattleActiveEffect["kind"]): boolean {
  return (
    kind === "speedRatio" ||
    kind === "spellArmorClassBonus" ||
    kind === "savingThrowRollMode" ||
    kind === "spellGrantedActionResource" ||
    kind === "spellEndTargetState"
  );
}

function hasHasteLethargyCondition(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellCondition" &&
      effect.sourceCombatantId === spellCasterId &&
      effect.condition === "incapacitated",
  );
}

function hasHasteSpeedZero(combatant: BattleCreatureState): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      effect.kind === "spellSpeedZero" &&
      effect.sourceCombatantId === spellCasterId,
  );
}

function stateWithSyntheticTargetConcentration(
  state: BattleState,
): BattleState {
  const target = requireCombatant(state, spellTargetId);
  const concentrationEffect = {
    kind: "spellArmorClassBonus",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "synthetic-target-concentration-fixture",
    ),
    sourceCombatantId: spellTargetId,
    bonus: 1,
    negatesRepeatedDamageAllocation: false,
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
    },
  } as const;
  const concentratingState = {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        effectKind: "spellEffect",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-target-concentration-fixture",
        ),
      },
    }),
  };
  return battleStateWithAllocatedEffectForTest({
    state: concentratingState,
    ownerId: spellTargetId,
    effect: concentrationEffect,
  });
}

function hasSyntheticTargetConcentrationEffect(
  combatant: BattleCreatureState,
): boolean {
  return combatant.activeEffects.some(
    (effect) =>
      "sourceProcedureRef" in effect &&
      effect.sourceCombatantId === spellTargetId,
  );
}

function stateWithDirectIncapacitated(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error(
      "Expected direct Incapacitated fixture target to be awake.",
    );
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      conditions: applyCondition(combatant.conditions, "incapacitated"),
    }),
  };
}

function stateWithHasteDurationTicks(
  state: BattleState,
  ticks: Extract<
    Extract<
      BattleActiveEffect,
      { readonly kind: "spellEndTargetState" }
    >["expiresAt"],
    { readonly kind: "concentration" }
  >["durationTicks"],
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.map((effect) =>
            effectIsOwnedByHaste(effect) &&
            "expiresAt" in effect &&
            effect.expiresAt.kind === "concentration" &&
            effect.expiresAt.durationTicks !== undefined
              ? // The guards above prove this is a BattleActiveEffect with a
                // tickable Concentration expiration; the spread only replaces
                // that branded duration count.
                ({
                  ...effect,
                  expiresAt: { ...effect.expiresAt, durationTicks: ticks },
                } as BattleActiveEffect)
              : effect,
          ),
        },
      ]),
    ),
  };
}

function stateWithTargetAlreadyActedAndCasterLast(
  state: BattleState,
): BattleState {
  const entries = [
    ...state.initiative.alreadyActed,
    ...state.initiative.stillToAct,
  ];
  const targetEntry = entries.find((entry) => entry.creature === spellTargetId);
  const casterEntry = entries.find((entry) => entry.creature === spellCasterId);
  if (targetEntry === undefined || casterEntry === undefined) {
    throw new Error("Expected Haste fixture initiative entries.");
  }
  const initiative: BattleState["initiative"] = {
    ...state.initiative,
    alreadyActed: [targetEntry],
    stillToAct: [casterEntry],
  };
  return { ...state, initiative };
}

function effectIsOwnedByHaste(effect: BattleActiveEffect): boolean {
  return (
    "sourceProcedureRef" in effect && effect.sourceCombatantId === spellCasterId
  );
}

function extraAttackBattleUnitRef() {
  const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Result.succeed({
      unit: unitLibrary.requireUnit(fighterExtraAttackUnitId),
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  return unitRef.success;
}

function stateAfterSpendingResource(
  state: BattleState,
  spentResource: RuntimeActionResource,
): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: state.currentTurnResources.actionResources.filter(
        (resource) => resource !== spentResource,
      ),
    },
  };
}

defineSelectedIdentityReplayWitness({
  describeLabel: "L5-C17/L5-C18 Haste selected identity replay",
  taskId: "L5-C17-HASTE-POSITIVE-RUNTIME",
  initialProjection: {
    unitId: hasteUnitId,
    procedure: "initial",
    targetHasHaste: false,
    targetLethargic: false,
  },
  units: [
    {
      unitId: hasteUnitId,
      procedures: [
        {
          actionName: "doReplayHastePositiveEffects",
          projectionAfter: {
            unitId: hasteUnitId,
            procedure: "compositeTargetBuffWithAftermath",
            targetHasHaste: true,
            targetLethargic: false,
          },
          discover: () => {
            const resolved = replayHasteCast();
            return {
              unitId: hasteUnitId,
              procedure: "compositeTargetBuffWithAftermath",
              targetHasHaste: hasHastePositiveEffects(
                requireCombatant(resolved.state, spellTargetId),
              ),
              targetLethargic: hasCondition(
                requireCombatant(resolved.state, spellTargetId).conditions,
                "incapacitated",
              ),
            };
          },
        },
        {
          actionName: "doReplayHasteLethargy",
          projectionAfter: {
            unitId: hasteUnitId,
            procedure: "hasteLethargy",
            targetHasHaste: false,
            targetLethargic: true,
          },
          discover: () => {
            const resolved = replayHasteCast();
            const ended = breakBattleConcentration(
              resolved.state,
              spellCasterId,
            );
            const target = requireCombatant(ended, spellTargetId);
            return {
              unitId: hasteUnitId,
              procedure: "hasteLethargy",
              targetHasHaste: hasHastePositiveEffects(target),
              targetLethargic: hasCondition(target.conditions, "incapacitated"),
            };
          },
        },
      ],
    },
  ],
});

function replayHasteCast(): {
  readonly state: BattleState;
} {
  const spell = spellRecord(hasteUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  const act = spellAct({ session: state, spellId: hasteUnitId, slotLevel: 3 });
  return resolveHaste({
    state: state.state,
    subject: act.subject,
    targetHole: requireHole(act.initialHoles, "targetChoice"),
  });
}
