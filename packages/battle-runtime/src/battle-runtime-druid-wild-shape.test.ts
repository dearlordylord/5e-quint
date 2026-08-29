import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  statBlockId,
  unitId as parseSharedUnitId,
  statBlockId as parseSharedStatBlockId,
} from "@dnd/shared/game-facts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-D20-STAT-PROJECTION druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS druid_wild_shape
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS druid_wild_shape
import {
  battleActSpellPresentation,
  discoverBattleActsWithStatBlockProjectionIssues,
  battleSubjectPresentation,
} from "./battle-act-composition.ts";
import {
  armorClass,
  armorClassDelta,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  abilityModifier,
  attackBonus,
  ClassLevel,
  D6RollResult,
  Hp,
} from "@dnd/shared/types";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import {
  decodeUnitRecordSync,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceOrdinalSchema,
  StatBlockRecordSchema,
} from "@dnd/surface/surface/schema";
import druidWildShapeInput from "../../surface/content/druid_wild_shape.json";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { expect, test } from "vitest";
import { resolveReplayContinuationFromState } from "./battle-execution-composition.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "./character-battle-resource-execution.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import { spellDefinitionHasPricedOrConsumedMaterialComponent } from "./battle-reducer/spells-invocation-guards.ts";

type CharacterSeedInput = Parameters<typeof characterSeed>[0];

import {
  activeDruidWildShape,
  spendActiveDruidWildShapeProcedureResources,
} from "./battle-reducer/druid-wild-shape.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { sacredWeaponHeldMeleeWeapons } from "./battle-reducer/unit-feature-discovery.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import {
  attackInitialTargetHole,
  attackDamageDispositionFill,
  attackRollFill,
  attackTargetFill,
  battleId,
  battleObjectId,
  battleTablePositionId,
  characterSeed,
  combatantId,
  damageRollFill,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  findHole,
  goblinAttackSubject,
  goblinId,
  requireHole,
  requireNonSwarmStatBlockRecordForTest,
  requireResolved,
  resolveBattleSubject,
  resource,
  snapshotBattle,
  spellRecord,
  startBattleSessionRight,
  statBlockCatalog,
  statBlockCreatureInit,
  targetFill,
  testCharacterWeaponAttackForUnit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import {
  activeDruidWildShapeEffect,
  activeDruidWildShapeForm,
  applyBattleHeldWeaponPickup,
  battleDruidWildShapeKnownFormSupportForUnit,
  battleStateWithGroundObjects,
  battleAvailableDruidWildShapeKnownForms,
  wildShapeKnownFormsIssueMessage,
  BattleFillSchema,
  battleShapeShiftedRuntimeState,
  combatantAbilityCheckModifier,
  combatantD20AbilityScore,
  characterEffectiveLoadout,
  combatantHasActiveDruidWildShape,
  combatantIsShapeShifted,
  combatantSavingThrowModifier,
  combatantSkillModifier,
  parseSupportedUnitFeatureProfile,
  removeBattleRuntimeCombatants,
  revertShapeShiftedCombatantToTrueForm,
  revertShapeShiftedRuntimeState,
  startBattle,
  validateWildShapeEquipmentDispositionFill,
  wildShapeFormActionSurfaceInventory,
  wildShapeLoadoutObjectRefs,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CharacterBattleCreatureState,
  type CharacterBattleD20Statistics,
  type CharacterWeaponAttackActionOption,
  type WildShapeEquipmentDispositionChoice,
  type WildShapeLoadoutObjectRef,
} from "./index.ts";
import { canonicalHeldObjectIdsForActor } from "./battle-reducer/command-procedure-discovery.ts";
import {
  statBlockProjectionIssuesForActor,
  statBlockProcedurePresentations,
  statBlockProcedurePresentationsForActor,
} from "./stat-block-presentation.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import type {
  BattleRuntimeContext,
  BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import { DRUID_BEAST_SPELLS_CLASS_LEVEL } from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { shillelaghUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import { bonusSpellAct } from "./unit-profile-admission-spell-fill.test-support.ts";

const druidId = combatantId("wild-shape-druid");
const ratId = statBlockId("stat_block_rat");
const ridingHorseId = statBlockId("stat_block_riding_horse");
const lizardId = statBlockId("stat_block_lizard");
const catId = statBlockId("stat_block_cat");

type DruidWildShapeInputPhase =
  (typeof druidWildShapeInput.mechanics.phases)[number];

function syntheticDruidWildShapeUnit(
  id: string,
  mutatePhase: (phase: DruidWildShapeInputPhase) => unknown,
) {
  return decodeUnitRecordSync({
    ...druidWildShapeInput,
    id,
    name: id,
    provenance: { kind: "synthetic-test", section: id },
    mechanics: {
      ...druidWildShapeInput.mechanics,
      phases: druidWildShapeInput.mechanics.phases.map(mutatePhase),
    },
  });
}
const wolfId = statBlockId("stat_block_wolf");
const spiderId = statBlockId("stat_block_spider");
const syntheticNonLiteralSizeFormId = "synthetic_non_literal_size_form";
const syntheticCoordinatedShapeId = "synthetic_coordinated_shape";
const syntheticUntypedCoordinatedShapeId =
  "synthetic_untyped_coordinated_shape";
const syntheticActionSectionFormId = "synthetic_action_section_form";
const syntheticSupportedNonAttackFormId = "synthetic_supported_non_attack_form";
const syntheticTraitProjectionFormId = "synthetic_trait_projection_form";
const syntheticTypedRidersFormId = "synthetic_typed_riders_form";
const packAllyId = combatantId("wild-shape-pack-ally");
const druidGroundPositionId = battleTablePositionId(
  "wild-shape-druid-ground-position",
);
const druidOffHandGroundPositionId = battleTablePositionId(
  "wild-shape-druid-off-hand-ground-position",
);
const incapacitatedPackAllyId = combatantId(
  "wild-shape-incapacitated-pack-ally",
);

type AttackProcedureEntry = Extract<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
  { readonly kind: "executable" }
> & {
  readonly procedure: Extract<
    Extract<
      NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
      { readonly kind: "executable" }
    >["procedure"],
    { readonly kind: "attack_roll" }
  >;
};

function testProcedureOrdinal(value: number) {
  return Schema.decodeSync(StatBlockProcedureOrdinalSchema)(value);
}

function testResourceOrdinal(value: number) {
  return Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(value);
}

test("replay rejects a Wild Shape subject bound to an unrelated procedure", () => {
  const state = druidWildShapeBattle();
  const subject = wildShapeSubject(state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const actor = requireCharacter(state, druidId);
  const unrelatedProcedureRef = actor.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef !== subject.procedureRef,
  )?.procedureRef;
  if (unrelatedProcedureRef === undefined) {
    throw new Error("Expected an unrelated Druid procedure binding.");
  }

  expect(
    resolveReplayContinuationFromState(
      state,
      {
        kind: "replay",
        subject: { ...subject, procedureRef: unrelatedProcedureRef },
        fills: [],
      },
      "attackHit",
      [],
    ),
  ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
});

test("assumes, reuses, and dismisses a known Beast Wild Shape form", () => {
  const initial = druidWildShapeBattle();
  const assumeRidingHorse = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });

  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(initial, assumeRidingHorse),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const activeForm = activeDruidWildShapeForm(activeDruid);
  expect(activeForm?.id).toBe(ridingHorseId);
  expect(Number(activeDruid.tempHp)).toBe(2);
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);
  expect(assumed.state.currentTurnResources.currentHasBonusAction).toBe(false);
  expect(
    assumed.routeEvents?.filter(
      (event) => "subject" in event && event.subject === "activeFormLifecycle",
    ),
  ).toEqual([
    expect.objectContaining({
      fill: "wildShapeEquipmentDisposition",
      owner: "battleActionEconomy",
    }),
    expect.objectContaining({ owner: "battleFeatureResource" }),
    expect.objectContaining({ owner: "battleTemporaryHitPoint" }),
    expect.objectContaining({ owner: "battleActiveEffect" }),
    expect.objectContaining({ owner: "battleCreatureState" }),
    expect.objectContaining({ owner: "battleMovementResource" }),
  ]);

  const activeSnapshot = snapshotCreature(assumed.snapshot, druidId);
  expect(activeSnapshot.size).toBe("large");
  expect(Number(activeSnapshot.armorClass)).toBe(11);
  expect(Number(activeSnapshot.movement.speedFeet)).toBe(60);

  const activeActs = discoverBattleActCandidates(assumed.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(assumed.state, "Hooves"),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        act.subject.tag === "actionSpell" ||
        isAttackActForProcedure(
          act,
          trueFormMainAttackProcedureRef(assumed.state),
        ),
    ),
  ).toBe(false);

  const nextTurn = restoreBonusAction(assumed.state);
  const assumeCat = wildShapeSubject(nextTurn, {
    action: "assumeForm",
    formStatBlockId: catId,
  });
  const reused = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(nextTurn, assumeCat),
  );
  const reusedDruid = requireCharacter(reused.state, druidId);
  expect(activeDruidWildShapeForm(reusedDruid)?.id).toBe(catId);
  expect(
    discoverBattleActCandidates(reused.state).some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(reused.state, "Scratch"),
      ),
    ),
  ).toBe(true);
  expect(
    reusedDruid.activeEffects.filter(
      (effect) => effect.kind === "druidWildShapeForm",
    ),
  ).toHaveLength(1);
  expect(druidWildShapeUsesRemaining(reusedDruid)).toBe(0);

  const dismissTurn = restoreBonusAction(reused.state);
  const dismiss = wildShapeSubject(dismissTurn, { action: "dismiss" });
  const dismissed = requireResolved(
    resolveDruidWildShape(dismissTurn, dismiss),
  );
  const dismissedDruid = requireCharacter(dismissed.state, druidId);
  expect(combatantHasActiveDruidWildShape(dismissedDruid)).toBe(false);
  expect(druidWildShapeUsesRemaining(dismissedDruid)).toBe(0);
  expect(
    dismissed.routeEvents?.filter(
      (event) => "subject" in event && event.subject === "activeFormLifecycle",
    ),
  ).toEqual([
    expect.objectContaining({ owner: "battleActionEconomy" }),
    expect.objectContaining({ owner: "battleActiveEffect" }),
    expect.objectContaining({ owner: "battleCreatureState" }),
    expect.objectContaining({ owner: "battleMovementResource" }),
  ]);

  const dismissedSnapshot = snapshotCreature(dismissed.snapshot, druidId);
  expect(dismissedSnapshot.size).toBe("medium");
  expect(Number(dismissedSnapshot.movement.speedFeet)).toBe(30);
});

test("projects active Wild Shape lifecycle ownership when turn control returns to the druid", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const targetTurn = requireResolved(
    endTurn({ state: assumed.state, actorId: druidId }),
  );
  const druidTurn = requireResolved(
    endTurn({ state: targetTurn.state, actorId: goblinId }),
  );

  expect(
    druidTurn.routeEvents?.filter(
      (event) => "subject" in event && event.subject === "activeFormLifecycle",
    ),
  ).toEqual([
    expect.objectContaining({ owner: "battleTurnBoundary" }),
    expect.objectContaining({ owner: "battleTurnBoundary" }),
    expect.objectContaining({ owner: "battleActionEconomy" }),
  ]);
});

test("rejects Wild Shape subjects when their form lifecycle becomes stale", () => {
  const initial = druidWildShapeBattle();
  const assumeSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const dismissSubject: Extract<
    BattleSubject,
    { readonly tag: "druidWildShape" }
  > = {
    tag: "druidWildShape",
    actorId: druidId,
    procedureRef: assumeSubject.procedureRef,
    action: "dismiss",
  };
  expect(resolveDruidWildShape(initial, dismissSubject)).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
  });

  const initialDruid = requireCharacter(initial, druidId);
  const missingResourceState = {
    ...initial,
    combatants: new Map(initial.combatants).set(druidId, {
      ...initialDruid,
      origin: {
        ...initialDruid.origin,
        resources: [],
      },
    }),
  };
  expect(
    resolveDruidWildShape(missingResourceState, assumeSubject),
  ).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
    message: "Druid Wild Shape is no longer available for the current actor.",
  });

  const unavailableFormState = {
    ...initial,
    combatants: new Map(initial.combatants).set(druidId, {
      ...initialDruid,
      origin: {
        ...initialDruid.origin,
        druidWildShapeAvailableForms: [],
      },
    }),
  };
  expect(
    resolveDruidWildShape(unavailableFormState, assumeSubject),
  ).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
  });

  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(initial, assumeSubject),
  );
  const assumedDruid = requireCharacter(assumed.state, druidId);
  const exhaustedState = restoreBonusAction({
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(druidId, {
      ...assumedDruid,
      origin: {
        ...assumedDruid.origin,
        resources: assumedDruid.origin.resources.map((resource) =>
          resourceHasUsesRemaining(resource)
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  });
  expect(resolveDruidWildShape(exhaustedState, assumeSubject)).toMatchObject({
    tag: "invalid",
    reason: "staleSubject",
  });
});

test("re-assuming a Wild Shape form preserves its committed Stat Block resources", () => {
  const baseForm = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const limitedFormId = "synthetic_limited_wild_shape_form";
  const baseAttack = baseForm.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" && entry.procedure.kind === "attack_roll",
  );
  if (baseAttack === undefined) {
    throw new Error("Expected the Riding Horse attack fixture.");
  }
  const limitedForm: StatBlockRecord = {
    ...baseForm,
    id: parseSharedStatBlockId(limitedFormId),
    name: "Synthetic Limited Wild Shape Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-limited-wild-shape-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      actions: [
        {
          ...baseAttack,
          procedureOrdinal: testProcedureOrdinal(1),
          resourceRefs: {
            kind: "some",
            ordinals: [testResourceOrdinal(1)],
          },
        },
      ],
      resources: [
        {
          ordinal: testResourceOrdinal(1),
          ownership: "each",
          limit: { kind: "daily", uses: 1 },
        },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(limitedForm),
  });
  const assumeSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: limitedFormId,
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(initial, assumeSubject),
  );
  const assumedDruid = requireCharacter(assumed.state, druidId);
  const firstActive = activeDruidWildShape(assumedDruid);
  const limitedBinding =
    firstActive?.admission.execution.procedureBindings.find(
      (binding) => binding.resourcePoolRefs.length > 0,
    );
  const limitedPool = firstActive?.admission.execution.resourcePools.find(
    (pool) => pool.kind === "daily",
  );
  if (
    firstActive === null ||
    limitedBinding === undefined ||
    limitedPool === undefined
  ) {
    throw new Error("Expected the active limited-use form procedure.");
  }
  const spentDruid = spendActiveDruidWildShapeProcedureResources(
    assumedDruid,
    limitedBinding.procedureRef,
  );
  const spentActive = activeDruidWildShape(spentDruid);
  expect(
    spentActive?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === limitedPool.resourcePoolRef,
    ),
  ).toMatchObject({ usesRemaining: 0 });

  const spentState: BattleState = {
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(druidId, spentDruid),
  };
  const reAssumeTurn = restoreBonusAction(spentState);
  const reAssumeSubject = wildShapeSubject(reAssumeTurn, {
    action: "assumeForm",
    formStatBlockId: limitedFormId,
  });
  const reAssumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(reAssumeTurn, reAssumeSubject),
  );
  const reAssumedActive = activeDruidWildShape(
    requireCharacter(reAssumed.state, druidId),
  );
  expect(reAssumedActive?.admission.execution.scopeRef).toBe(
    firstActive.admission.execution.scopeRef,
  );
  expect(
    reAssumedActive?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === limitedPool.resourcePoolRef,
    ),
  ).toMatchObject({ usesRemaining: 0 });
});

test("an active Wild Shape form restores a spent recharge action from its start-turn roll", () => {
  const baseForm = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const rechargeFormId = "synthetic_recharge_wild_shape_form";
  const baseAttack = baseForm.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" && entry.procedure.kind === "attack_roll",
  );
  if (baseAttack === undefined) {
    throw new Error("Expected the Riding Horse attack fixture.");
  }
  const rechargeForm: StatBlockRecord = {
    ...baseForm,
    id: parseSharedStatBlockId(rechargeFormId),
    name: "Synthetic Recharge Wild Shape Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-recharge-wild-shape-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      actions: [
        {
          ...baseAttack,
          procedureOrdinal: testProcedureOrdinal(1),
          resourceRefs: {
            kind: "some",
            ordinals: [testResourceOrdinal(1)],
          },
        },
      ],
      resources: [
        {
          ordinal: testResourceOrdinal(1),
          ownership: "each",
          limit: { kind: "recharge", minimumRoll: 5 },
        },
      ],
    },
  };
  const initialSession = druidWildShapeSession({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(rechargeForm),
  });
  const initial = initialSession.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: rechargeFormId,
      }),
    ),
  );
  const assumedDruid = requireCharacter(assumed.state, druidId);
  const active = activeDruidWildShape(assumedDruid);
  const rechargePool = active?.admission.execution.resourcePools.find(
    (pool) => pool.kind === "recharge",
  );
  const rechargeBinding =
    rechargePool === undefined
      ? undefined
      : active?.admission.execution.procedureBindings.find(
          (binding) =>
            binding.procedure.kind !== "spellcasting" &&
            binding.resourcePoolRefs.includes(rechargePool.resourcePoolRef),
        );
  if (
    active === null ||
    rechargeBinding === undefined ||
    rechargePool === undefined
  ) {
    throw new Error("Expected the active recharge form procedure.");
  }
  const attackSubject = statBlockAttackSubject(
    assumed.state,
    baseAttack.procedure.name,
    initialSession.context,
  );
  expect(attackSubject.procedureRef).toBe(rechargeBinding.procedureRef);
  const targetHole = attackInitialTargetHole(assumed.state, attackSubject);
  const targetSelection = attackTargetFill(targetHole, druidId, goblinId);
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject: attackSubject,
      fills: [targetSelection],
    }),
    "attackRoll",
  );
  const attackRollSelection = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject: attackSubject,
      fills: [targetSelection, attackRollSelection],
    }),
    "rolledDice",
  );
  const spentState = requireResolved(
    resolveBattleSubject({
      state: assumed.state,
      subject: attackSubject,
      fills: [targetSelection, attackRollSelection, damageRollFill(damage, 1)],
    }),
  ).state;
  expect(
    activeDruidWildShape(
      requireCharacter(spentState, druidId),
    )?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === rechargePool.resourcePoolRef,
    ),
  ).toMatchObject({ available: false });
  const targetTurn = requireResolved(
    endTurn({ state: spentState, actorId: druidId }),
  ).state;
  const rechargeRequest = endTurn({ state: targetTurn, actorId: goblinId });
  expect(rechargeRequest).toMatchObject({
    tag: "needsHoles",
    holes: [
      {
        kind: "statBlockRechargeRoll",
        rechargeTargets: [rechargePool.resourcePoolRef],
      },
    ],
  });
  if (rechargeRequest.tag !== "needsHoles") {
    throw new Error("Expected the Wild Shape form recharge roll.");
  }
  const rechargeHole = requireHole(rechargeRequest, "statBlockRechargeRoll");
  const recharged = requireResolved(
    resolveBattleSubject({
      state: rechargeRequest.state,
      subject: rechargeRequest.subject,
      fills: [
        {
          kind: "statBlockRechargeRoll",
          holeId: rechargeHole.holeId,
          value: [
            {
              target: rechargePool.resourcePoolRef,
              roll: D6RollResult(rechargePool.minimumRoll),
            },
          ],
        },
      ],
    }),
  );
  const rechargedActive = activeDruidWildShape(
    requireCharacter(recharged.state, druidId),
  );
  expect(
    rechargedActive?.admission.execution.resourcePools.find(
      (pool) => pool.resourcePoolRef === rechargePool.resourcePoolRef,
    ),
  ).toMatchObject({ available: true });
});

test("derives Wild Shape equipment disposition candidates from selected loadout object refs", () => {
  const selectedLoadout = wildShapeSelectedLoadout();
  expect(wildShapeLoadoutObjectRefs(selectedLoadout)).toEqual([
    {
      kind: "armor",
      objectId: "armor:equipment_leather",
    },
    {
      kind: "shield",
      objectId: "shield:equipment_shield",
    },
    {
      kind: "mainWeapon",
      objectId: "main:weapon_quarterstaff",
    },
    {
      kind: "offHandWeapon",
      objectId: "offhand:weapon_dagger",
    },
  ]);
  expect(wildShapeLoadoutObjectRefs({})).toEqual([]);
});

test("decodes Wild Shape worn equipment disposition fills for selected loadout objects", () => {
  const decodeFill = Schema.decodeUnknownEither(BattleFillSchema);
  expect(
    Either.isRight(
      decodeFill({
        kind: "wildShapeEquipmentDisposition",
        holeId: "wild-shape-equipment-hole",
        value: {
          formLimbs: { kind: "canHandleObjects" },
          choices: [
            {
              item: {
                kind: "shield",
                objectId: "shield:equipment_shield",
                unitId: "equipment_shield",
              },
              disposition: "worn",
              practicality: { kind: "practicalToWear" },
            },
          ],
        },
      }),
    ),
  ).toBe(true);
  expect(
    Either.isRight(
      decodeFill({
        kind: "wildShapeEquipmentDisposition",
        holeId: "wild-shape-equipment-hole",
        value: {
          formLimbs: { kind: "cannotHandleObjects" },
          choices: [
            {
              item: {
                kind: "mainWeapon",
                objectId: "main:weapon_quarterstaff",
                unitId: "weapon_quarterstaff",
              },
              disposition: "merges",
            },
          ],
        },
      }),
    ),
  ).toBe(true);

  for (const wornWeaponKind of ["mainWeapon", "offHandWeapon"] as const) {
    expect(
      Either.isRight(
        decodeFill({
          kind: "wildShapeEquipmentDisposition",
          holeId: "wild-shape-equipment-hole",
          value: {
            formLimbs: { kind: "canHandleObjects" },
            choices: [
              {
                item: {
                  kind: wornWeaponKind,
                  objectId:
                    wornWeaponKind === "mainWeapon"
                      ? "main:weapon_quarterstaff"
                      : "offhand:weapon_dagger",
                  unitId:
                    wornWeaponKind === "mainWeapon"
                      ? "weapon_quarterstaff"
                      : "weapon_dagger",
                },
                disposition: "worn",
                practicality: { kind: "practicalToWear" },
              },
            ],
          },
        }),
      ),
    ).toBe(true);
  }
});

test("requires and validates Wild Shape equipment disposition fills for selected loadout equipment", () => {
  const initial = druidWildShapeBattle({
    armorClass: shieldArmorClassState({ rightHandUse: "mainWeapon" }),
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  if (!("procedureRef" in subject) || subject.action !== "assumeForm") {
    throw new Error("Expected admitted Wild Shape procedure.");
  }

  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  expect(dispositionHole.candidates.map((candidate) => candidate.kind)).toEqual(
    ["armor", "shield", "mainWeapon"],
  );
  expect(druidWildShapeUsesRemaining(requireCharacter(initial, druidId))).toBe(
    2,
  );

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(
        dispositionHole,
        dispositionHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual(
    dispositionHole.candidates.map((item) => ({ item, disposition: "merges" })),
  );
  expect(effect?.formLimbs).toEqual({ kind: "canHandleObjects" });
  expect(druidWildShapeUsesRemaining(activeDruid)).toBe(1);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    11,
  );
  expect(
    combatantHandUses(resolved.state, activeDruid, resolved.state.grapples),
  ).toEqual({ left: "free", right: "free" });

  const activeActs = discoverBattleActCandidates(resolved.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(false);
});

test("rejects Wild Shape equipment disposition fills from a different form hole", () => {
  const initial = druidWildShapeBattle({
    selectedLoadout: wildShapeBattleSelectedLoadout(),
  });
  const ridingHorseSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const catSubject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: catId,
  });

  const ridingHorseNeedsDisposition = resolveDruidWildShape(
    initial,
    ridingHorseSubject,
  );
  const catNeedsDisposition = resolveDruidWildShape(initial, catSubject);
  if (
    ridingHorseNeedsDisposition.tag !== "needsHoles" ||
    catNeedsDisposition.tag !== "needsHoles"
  ) {
    throw new Error("Expected Wild Shape equipment disposition holes.");
  }
  const ridingHorseHole = requireWildShapeEquipmentDispositionHole(
    ridingHorseNeedsDisposition.holes,
  );
  const catHole = requireWildShapeEquipmentDispositionHole(
    catNeedsDisposition.holes,
  );

  expect(catHole.holeId).not.toBe(ridingHorseHole.holeId);
  expect(
    resolveDruidWildShape(initial, catSubject, [
      wildShapeDispositionFill(
        ridingHorseHole,
        ridingHorseHole.candidates.map((item) => ({
          item,
          disposition: "merges" as const,
        })),
      ),
    ]),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Druid Wild Shape equipment disposition fill must match the equipment disposition hole.",
  });
});

test("projects practical worn Wild Shape equipment into the effective loadout", () => {
  const initial = druidWildShapeBattle({
    armorClass: shieldArmorClassState({ rightHandUse: "mainWeapon" }),
    selectedLoadout: {
      shield: {
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
      },
      weapon: {
        itemId: battleObjectId("main:weapon_quarterstaff"),
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "shield",
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (shield === undefined || mainWeapon === undefined) {
    throw new Error("Expected shield and main weapon disposition candidates.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
        {
          item: mainWeapon,
          disposition: "merges",
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([
    { item: shield, disposition: "worn" },
    { item: mainWeapon, disposition: "merges" },
  ]);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    13,
  );
  expect(
    combatantHandUses(resolved.state, activeDruid, resolved.state.grapples),
  ).toEqual({ left: "shield", right: "free" });
  expect(
    discoverBattleActCandidates(resolved.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(false);
});

test("uses a practical worn Wild Shape weapon when form limbs can handle objects", () => {
  const initial = druidWildShapeBattle({
    attack: {
      ...weakTrueFormLongswordAttack(),
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: abilityModifier(2),
          attackBonus: attackBonus(4),
          damageAbilityModifier: abilityModifier(2),
        },
      ],
    },
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_longsword"),
        unitId: parseSharedUnitId("weapon_longsword"),
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  expect(activeDruidWildShapeEffect(activeDruid)?.equipmentDisposition).toEqual(
    [{ item: mainWeapon, disposition: "worn" }],
  );

  const activeActs = discoverBattleActCandidates(resolved.state);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        wildShapeStatBlockAttackProcedureRef(resolved.state, "Hooves"),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(true);

  const longswordAct = activeActs.find((act) =>
    isAttackActForProcedure(
      act,
      trueFormMainAttackProcedureRef(resolved.state),
    ),
  );
  if (longswordAct?.subject.tag !== "action") {
    throw new Error("Expected Longsword attack act.");
  }
  const target = findHole(longswordAct.initialHoles, "targetChoice");
  const targetChoice = attackTargetFill(target, druidId, goblinId);
  const needsAttackRoll = resolveBattleSubject({
    state: resolved.state,
    subject: longswordAct.subject,
    fills: [targetChoice],
  });
  if (needsAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected weapon_longsword attack roll hole.");
  }
  const attackRoll = findHole(needsAttackRoll.holes, "attackRoll");
  if (attackRoll.kind !== "attackRoll") {
    throw new Error("Expected weapon_longsword attack roll hole.");
  }
  if (!("attack" in attackRoll)) {
    throw new Error("Expected weapon attack roll hole.");
  }
  expect(Number(attackRoll.attackBonus)).toBe(5);
  expect(attackRoll.attack).toMatchObject({
    kind: "weapon",
    ability: "str",
    abilityModifier: 3,
    attackBonus: 5,
    damageAbilityModifier: 3,
  });
  expect(
    attackActionOptionsForActor(resolved.state, druidId).find(
      (attack) => attack.kind === "weapon" && attack.ability === "dex",
    ),
  ).toMatchObject({
    kind: "weapon",
    ability: "dex",
    abilityModifier: 1,
    attackBonus: 3,
    damageAbilityModifier: 1,
  });

  const needsDamage = resolveBattleSubject({
    state: resolved.state,
    subject: longswordAct.subject,
    fills: [
      targetChoice,
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (needsDamage.tag !== "needsHoles") {
    throw new Error("Expected weapon_longsword damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected weapon_longsword damage hole.");
  }
  expect(damage.label).toBe("weapon_longsword damage (1d8+3-slashing)");
});

test("keeps worn Wild Shape off-hand weapons in the Light-property Bonus Action lane with form statistics", () => {
  const initial = druidWildShapeBattle({
    includeUnrelatedResource: true,
    armorClass: {
      ...defaultArmorClassState(),
      leftHandUse: "offWeapon",
      rightHandUse: "mainWeapon",
    },
    attack: weakTrueFormShortswordAttack(),
    offHandAttack: weakTrueFormDaggerAttack(),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_shortsword"),
        unitId: parseSharedUnitId("weapon_shortsword"),
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId: battleObjectId("offhand:weapon_dagger"),
        unitId: parseSharedUnitId("weapon_dagger"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  const offHandWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "offHandWeapon",
  );
  if (mainWeapon === undefined || offHandWeapon === undefined) {
    throw new Error(
      "Expected main and off-hand weapon disposition candidates.",
    );
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
        {
          item: offHandWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  expect(
    sacredWeaponHeldMeleeWeapons(resolved.state, activeDruid).map(
      ({ itemId }) => itemId,
    ),
  ).toEqual([
    battleObjectId("main:weapon_shortsword"),
    battleObjectId("offhand:weapon_dagger"),
  ]);
  expect(
    combatantHandUses(resolved.state, activeDruid, resolved.state.grapples),
  ).toEqual({ left: "offWeapon", right: "mainWeapon" });
  const battleReadyState = restoreBonusAction(resolved.state);

  const activeActs = discoverBattleActCandidates(battleReadyState);
  expect(
    activeActs.some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(battleReadyState),
      ),
    ),
  ).toBe(true);
  expect(
    activeActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(battleReadyState),
        ) && act.subject.tag === "action",
    ),
  ).toBe(false);
  expect(
    activeActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(battleReadyState),
        ) && act.subject.tag === "bonusAction",
    ),
  ).toBe(false);

  const shortswordAct = activeActs.find((act) =>
    isAttackActForProcedure(
      act,
      trueFormMainAttackProcedureRef(battleReadyState),
    ),
  );
  if (shortswordAct?.subject.tag !== "action") {
    throw new Error("Expected Shortsword attack act.");
  }
  const shortswordTarget = findHole(shortswordAct.initialHoles, "targetChoice");
  const shortswordTargetChoice = attackTargetFill(
    shortswordTarget,
    druidId,
    goblinId,
  );
  const needsShortswordAttackRoll = resolveBattleSubject({
    state: battleReadyState,
    subject: shortswordAct.subject,
    fills: [shortswordTargetChoice],
  });
  if (needsShortswordAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Shortsword attack roll hole.");
  }
  const shortswordAttackRoll = findHole(
    needsShortswordAttackRoll.holes,
    "attackRoll",
  );
  const afterQualifyingAttack = requireResolved(
    resolveBattleSubject({
      state: battleReadyState,
      subject: shortswordAct.subject,
      fills: [
        shortswordTargetChoice,
        attackRollFill(shortswordAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    }),
  ).state;

  const afterLightActs = discoverBattleActCandidates(afterQualifyingAttack);
  expect(
    afterLightActs.some(
      (act) =>
        isAttackActForProcedure(
          act,
          trueFormOffHandAttackProcedureRef(afterQualifyingAttack),
        ) && act.subject.tag === "action",
    ),
  ).toBe(false);
  const daggerAct = afterLightActs.find(
    (act) =>
      isAttackActForProcedure(
        act,
        trueFormOffHandAttackProcedureRef(afterQualifyingAttack),
      ) && act.subject.tag === "bonusAction",
  );
  if (daggerAct?.subject.tag !== "bonusAction") {
    throw new Error("Expected Dagger off-hand Bonus Action act.");
  }
  const daggerTarget = findHole(daggerAct.initialHoles, "targetChoice");
  const daggerTargetChoice = attackTargetFill(daggerTarget, druidId, goblinId);
  const needsDaggerAttackRoll = resolveBattleSubject({
    state: afterQualifyingAttack,
    subject: daggerAct.subject,
    fills: [daggerTargetChoice],
  });
  if (needsDaggerAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected weapon_dagger attack roll hole.");
  }
  const daggerAttackRoll = findHole(needsDaggerAttackRoll.holes, "attackRoll");
  if (daggerAttackRoll.kind !== "attackRoll") {
    throw new Error("Expected weapon_dagger attack roll hole.");
  }
  if (!("attack" in daggerAttackRoll)) {
    throw new Error("Expected weapon attack roll hole.");
  }
  expect(Number(daggerAttackRoll.attackBonus)).toBe(5);
  expect(daggerAttackRoll.attack).toMatchObject({
    kind: "weapon",
    ability: "str",
    abilityModifier: 3,
    attackBonus: 5,
    damageAbilityModifier: 0,
  });

  const needsDamage = resolveBattleSubject({
    state: afterQualifyingAttack,
    subject: daggerAct.subject,
    fills: [
      daggerTargetChoice,
      attackRollFill(daggerAttackRoll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (needsDamage.tag !== "needsHoles") {
    throw new Error("Expected weapon_dagger damage hole.");
  }
  const damage = findHole(needsDamage.holes, "rolledDice");
  if (damage.kind !== "rolledDice") {
    throw new Error("Expected weapon_dagger damage hole.");
  }
  expect(damage.label).toBe("weapon_dagger damage (1d4-piercing)");
  expect(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject: daggerAct.subject,
      fills: [
        daggerTargetChoice,
        attackRollFill(daggerAttackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    }),
  ).toMatchObject({ tag: "resolved" });
});

test("blocks worn Wild Shape weapon use when form limbs cannot handle objects", () => {
  const initial = druidWildShapeBattle({
    armorClass: {
      ...defaultArmorClassState(),
      rightHandUse: "mainWeapon",
    },
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_longsword"),
        unitId: parseSharedUnitId("weapon_longsword"),
        grip: "one_handed",
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (mainWeapon === undefined) {
    throw new Error("Expected main weapon disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(
        dispositionHole,
        [
          {
            item: mainWeapon,
            disposition: "worn",
            practicality: { kind: "practicalToWear" },
          },
        ],
        { kind: "cannotHandleObjects" },
      ),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  expect(
    combatantHandUses(resolved.state, activeDruid, resolved.state.grapples),
  ).toEqual({ left: "free", right: "free" });

  expect(
    discoverBattleActCandidates(resolved.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(resolved.state),
      ),
    ),
  ).toBe(false);
});

test("retains Shillelagh only while Wild Shape can keep holding its worn Quarterstaff", () => {
  const selectedLoadout = {
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "one_handed" as const,
    },
  };
  const session = druidWildShapeSession({
    armorClass: {
      ...defaultArmorClassState(),
      rightHandUse: "mainWeapon",
    },
    attack: testCharacterWeaponAttackForUnit(selectedLoadout.weapon.unitId),
    cantrips: [spellRecord(shillelaghUnitId)],
    selectedLoadout,
  });
  const shillelaghAct = bonusSpellAct({
    session,
    spellId: shillelaghUnitId,
  });
  const enchanted = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: shillelaghAct.subject,
      fills: [],
    }),
  ).state;
  const readyToShape = restoreBonusAction(enchanted);

  for (const disposition of ["worn", "merges", "falls"] as const) {
    const subject = wildShapeSubject(readyToShape, {
      action: "assumeForm",
      formStatBlockId: ridingHorseId,
    });
    const needsDisposition = resolveDruidWildShape(readyToShape, subject);
    if (needsDisposition.tag !== "needsHoles") {
      throw new Error("Expected Wild Shape equipment disposition hole.");
    }
    const dispositionHole = requireWildShapeEquipmentDispositionHole(
      needsDisposition.holes,
    );
    const mainWeapon = dispositionHole.candidates.find(
      (candidate) => candidate.kind === "mainWeapon",
    );
    if (mainWeapon === undefined) {
      throw new Error("Expected Quarterstaff disposition candidate.");
    }
    const shaped = requireResolved(
      resolveDruidWildShape(readyToShape, subject, [
        wildShapeDispositionFill(dispositionHole, [
          disposition === "worn"
            ? {
                item: mainWeapon,
                disposition,
                practicality: { kind: "practicalToWear" },
              }
            : disposition === "falls"
              ? {
                  item: mainWeapon,
                  disposition,
                  fallInActorSpace: {
                    kind: "actorSpace",
                    positionId: druidGroundPositionId,
                  },
                }
              : { item: mainWeapon, disposition },
        ]),
      ]),
    );

    expect(
      requireCharacter(shaped.state, druidId).activeEffects.some(
        (effect) => effect.kind === "spellWeaponAttackOverride",
      ),
    ).toBe(disposition === "worn");
  }
});

test("projects practical worn Wild Shape armor into the effective loadout", () => {
  const initial = druidWildShapeBattle({
    armorClass: heavyArmorClassState(),
    selectedLoadout: {
      armor: {
        itemId: battleObjectId("armor:equipment_chain_mail"),
        unitId: parseSharedUnitId("equipment_chain_mail"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const armor = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "armor",
  );
  if (armor === undefined) {
    throw new Error("Expected armor disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: armor,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([
    { item: armor, disposition: "worn" },
  ]);
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    16,
  );
});

test("returns Wild Shape fallen equipment at the explicit object boundary", () => {
  const initial = druidWildShapeBattle({
    unarmoredArmorClassBases: {
      shielded: defaultUnarmoredArmorClassBase(),
      unshielded: {
        kind: "ability_sum",
        base: armorClass(13),
        abilityModifiers: ["dex"],
        source: "unarmored_defense",
        sourceUnitId: "synthetic_unshielded_defense",
      },
    },
    selectedLoadout: {
      shield: {
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  if (!("procedureRef" in subject) || subject.action !== "assumeForm") {
    throw new Error("Expected admitted Wild Shape procedure.");
  }
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const shield = dispositionHole.candidates[0];
  if (shield === undefined) {
    throw new Error("Expected shield disposition candidate.");
  }

  const resolved = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: shield,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  const activeDruid = requireCharacter(resolved.state, druidId);
  const effect = activeDruidWildShapeEffect(activeDruid);
  expect(effect?.equipmentDisposition).toEqual([]);
  expect(resolved.droppedObjects).toEqual([
    {
      kind: "objectDropped",
      actorId: druidId,
      objectId: shield.objectId,
      source: {
        kind: "druidWildShape",
        procedureRef: subject.procedureRef,
        formExecutionRef: subject.formExecutionRef,
      },
    },
  ]);
  expect(
    resolved.state.groundObjects.get(druidId)?.get(shield.objectId),
  ).toEqual({
    positionId: druidGroundPositionId,
    source: {
      kind: "druidWildShape",
      procedureRef: subject.procedureRef,
      formExecutionRef: subject.formExecutionRef,
    },
  });
  expect(Number(snapshotCreature(resolved.snapshot, druidId).armorClass)).toBe(
    11,
  );
  expect(canonicalHeldObjectIdsForActor(resolved.state, druidId)).toEqual([]);
  const otherActor = {
    ...activeDruid,
    combatantId: combatantId("wild-shape-ground-object-collision-peer"),
  };
  const collisionState = {
    ...resolved.state,
    combatants: new Map(resolved.state.combatants).set(
      otherActor.combatantId,
      otherActor,
    ),
  };
  expect(characterEffectiveLoadout(collisionState, otherActor).shield).toEqual(
    activeDruid.origin.selectedLoadout.shield,
  );
  expect(
    battleStateWithGroundObjects(resolved.state, [
      {
        actorId: druidId,
        objectId: shield.objectId,
        positionId: druidGroundPositionId,
        source: {
          kind: "druidWildShape",
          procedureRef: subject.procedureRef,
          formExecutionRef: subject.formExecutionRef,
        },
      },
    ]),
  ).toMatchObject({
    tag: "conflict",
    actorId: druidId,
    objectId: shield.objectId,
  });

  const dismissTurn = restoreBonusAction(resolved.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );
  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    13,
  );
  expect(canonicalHeldObjectIdsForActor(reverted.state, druidId)).toEqual([]);
});

test("does not turn fallen Heavy armor into worn armor through weapon pickup", () => {
  const armorObjectId = battleObjectId("armor:equipment_chain_mail");
  const initial = druidWildShapeBattle({
    armorClass: heavyArmorClassState(),
    selectedLoadout: {
      armor: {
        itemId: armorObjectId,
        unitId: parseSharedUnitId("equipment_chain_mail"),
      },
    },
  });
  const assume = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const armor = hole.candidates.find(isWildShapeArmorLoadoutObjectRef);
  if (armor === undefined) {
    throw new Error("Expected Heavy armor disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(initial, assume, [
      wildShapeDispositionFill(hole, [
        {
          item: armor,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(fallen.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  const invalidWeaponPickup = applyBattleHeldWeaponPickup(reverted.state, {
    interaction: {
      actorId: druidId,
      objectId: armorObjectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: druidGroundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });

  expect(invalidWeaponPickup).toMatchObject({
    tag: "invalid",
    reason: "selectedLoadoutMismatch",
  });
  expect(reverted.state.groundObjects.get(druidId)?.has(armorObjectId)).toBe(
    true,
  );
  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    10,
  );
});

test("does not turn a fallen Shield into a wielded Shield through weapon pickup", () => {
  const shieldObjectId = battleObjectId("shield:equipment_shield");
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      shield: {
        itemId: shieldObjectId,
        unitId: parseSharedUnitId("equipment_shield"),
      },
    },
  });
  const assume = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const shield = hole.candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (shield === undefined) {
    throw new Error("Expected Shield disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(initial, assume, [
      wildShapeDispositionFill(hole, [
        {
          item: shield,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(fallen.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  expect(
    applyBattleHeldWeaponPickup(reverted.state, {
      interaction: {
        actorId: druidId,
        objectId: shieldObjectId,
        actorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
      loadoutSlot: "mainWeapon",
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "selectedLoadoutMismatch",
  });
  expect(reverted.state.groundObjects.get(druidId)?.has(shieldObjectId)).toBe(
    true,
  );
});

test("held-weapon pickup reports boundary failures and preserves other fallen objects", () => {
  const mainWeaponItemId = battleObjectId("main:weapon_quarterstaff");
  const offHandWeaponItemId = battleObjectId("offhand:weapon_dagger");
  const initial = druidWildShapeBattle({
    selectedLoadout: {
      weapon: {
        itemId: mainWeaponItemId,
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId: offHandWeaponItemId,
        unitId: parseSharedUnitId("weapon_dagger"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  if (subject.action !== "assumeForm") {
    throw new Error("Expected admitted Wild Shape assume-form subject.");
  }
  const droppedSource = {
    kind: "druidWildShape" as const,
    procedureRef: subject.procedureRef,
    formExecutionRef: subject.formExecutionRef,
  };
  const placed = battleStateWithGroundObjects(initial, [
    {
      actorId: druidId,
      objectId: mainWeaponItemId,
      positionId: druidGroundPositionId,
      source: droppedSource,
    },
    {
      actorId: druidId,
      objectId: offHandWeaponItemId,
      positionId: druidOffHandGroundPositionId,
      source: droppedSource,
    },
  ]);
  if (placed.tag !== "applied") {
    throw new Error(placed.message);
  }
  const placedDruid = requireCharacter(placed.state, druidId);
  expect(characterEffectiveLoadout(placed.state, placedDruid)).toEqual({});
  const pickup = (
    actorId: typeof druidId,
    objectId: typeof mainWeaponItemId,
    positionId: typeof druidGroundPositionId,
    loadoutSlot: Parameters<
      typeof applyBattleHeldWeaponPickup
    >[1]["loadoutSlot"] = "mainWeapon",
  ) =>
    applyBattleHeldWeaponPickup(placed.state, {
      interaction: {
        actorId,
        objectId,
        actorSpace: { kind: "actorSpace", positionId },
      },
      loadoutSlot,
    });

  expect(
    pickup(
      combatantId("missing-pickup-actor"),
      mainWeaponItemId,
      druidGroundPositionId,
    ),
  ).toMatchObject({ tag: "invalid", reason: "missingCombatant" });
  expect(
    pickup(goblinId, mainWeaponItemId, druidGroundPositionId),
  ).toMatchObject({ tag: "invalid", reason: "actorNotCharacter" });
  expect(
    pickup(
      druidId,
      battleObjectId("missing-ground-object"),
      druidGroundPositionId,
    ),
  ).toMatchObject({ tag: "invalid", reason: "objectNotOnGround" });
  expect(
    pickup(druidId, mainWeaponItemId, druidOffHandGroundPositionId),
  ).toMatchObject({ tag: "invalid", reason: "positionMismatch" });

  const pickedUp = pickup(druidId, mainWeaponItemId, druidGroundPositionId);
  if (pickedUp.tag !== "applied") {
    throw new Error(pickedUp.message);
  }
  const remainingGroundObjects = pickedUp.state.groundObjects.get(druidId);
  if (remainingGroundObjects === undefined) {
    throw new Error("Expected the off-hand weapon to remain on the ground.");
  }
  expect([...remainingGroundObjects.entries()]).toEqual([
    [
      offHandWeaponItemId,
      {
        positionId: druidOffHandGroundPositionId,
        source: droppedSource,
      },
    ],
  ]);

  const offHandPickedUp = pickup(
    druidId,
    offHandWeaponItemId,
    druidOffHandGroundPositionId,
    "offHandWeapon",
  );
  if (offHandPickedUp.tag !== "applied") {
    throw new Error(offHandPickedUp.message);
  }
  const remainingAfterOffHandPickup =
    offHandPickedUp.state.groundObjects.get(druidId);
  if (remainingAfterOffHandPickup === undefined) {
    throw new Error("Expected the main weapon to remain on the ground.");
  }
  expect([...remainingAfterOffHandPickup.keys()]).toEqual([mainWeaponItemId]);
});

test("uses the Shield-compatible unarmored base when armor falls but the Shield remains worn", () => {
  const armoredWithShield = {
    ...heavyArmorClassState(),
    bonuses: [
      {
        kind: "shield" as const,
        bonus: armorClassDelta(2),
        handUse: "shield" as const,
        trainingRequired: "shield" as const,
      },
    ],
    armorTraining: new Set(["heavy", "shield"] as const),
    leftHandUse: "shield" as const,
  };
  const shieldCompatibleBase = {
    kind: "ability_sum" as const,
    base: armorClass(13),
    abilityModifiers: ["dex"] as const,
    source: "unarmored_defense" as const,
    sourceUnitId: "synthetic_shield_compatible_unarmored_defense",
  };
  const initial = druidWildShapeBattle({
    armorClass: armoredWithShield,
    unarmoredArmorClassBases: {
      shielded: shieldCompatibleBase,
      unshielded: defaultUnarmoredArmorClassBase(),
    },
    selectedLoadout: {
      armor: {
        itemId: battleObjectId("armor:equipment_chain_mail"),
        unitId: parseSharedUnitId("equipment_chain_mail"),
      },
      shield: {
        itemId: battleObjectId("shield:equipment_shield"),
        unitId: parseSharedUnitId("equipment_shield"),
      },
    },
  });
  const subject = wildShapeSubject(initial, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(initial, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  const armor = hole.candidates.find(isWildShapeArmorLoadoutObjectRef);
  const shield = hole.candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (armor === undefined || shield === undefined) {
    throw new Error("Expected armor and Shield disposition candidates.");
  }
  const assumed = requireResolved(
    resolveDruidWildShape(initial, subject, [
      wildShapeDispositionFill(hole, [
        {
          item: armor,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
        {
          item: shield,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const dismissTurn = restoreBonusAction(assumed.state);
  const reverted = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );

  expect(Number(snapshotCreature(reverted.snapshot, druidId).armorClass)).toBe(
    15,
  );
});

test("rejects invalid Wild Shape equipment disposition choices and converts impossible worn choices to RAW fallback", () => {
  const candidates = wildShapeLoadoutObjectRefs({
    armor: {
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
    },
  });
  const armor = candidates.find(isWildShapeArmorLoadoutObjectRef);
  const shield = candidates.find(isWildShapeShieldLoadoutObjectRef);
  if (armor === undefined || shield === undefined) {
    throw new Error("Expected armor and shield candidates.");
  }

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [{ item: armor, disposition: "merges" }],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          {
            item: armor,
            disposition: "falls",
            fallInActorSpace: {
              kind: "actorSpace",
              positionId: druidGroundPositionId,
            },
          },
          { item: armor, disposition: "merges" },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  const unknown = {
    kind: "mainWeapon",
    objectId: battleObjectId("main:weapon_synthetic"),
  } as const satisfies WildShapeLoadoutObjectRef;
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          { item: armor, disposition: "merges" },
          {
            item: unknown,
            disposition: "falls",
            fallInActorSpace: {
              kind: "actorSpace",
              positionId: druidGroundPositionId,
            },
          },
        ],
      },
    }),
  ).toMatchObject({ tag: "invalid" });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: { disposition: "merges" },
            },
          },
          {
            item: shield,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: {
                disposition: "falls",
                fallInActorSpace: {
                  kind: "actorSpace",
                  positionId: druidGroundPositionId,
                },
              },
            },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      {
        item: shield,
        disposition: "falls",
        fallInActorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
    ],
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates,
      value: {
        formLimbs: { kind: "cannotHandleObjects" },
        choices: [
          {
            item: armor,
            disposition: "worn",
            practicality: {
              kind: "notPracticalToWear",
              fallback: { disposition: "merges" },
            },
          },
          { item: shield, disposition: "merges" },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [
      { item: armor, disposition: "merges" },
      { item: shield, disposition: "merges" },
    ],
  });

  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates: [shield],
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [
          {
            item: shield,
            disposition: "worn",
            practicality: { kind: "practicalToWear" },
          },
        ],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [{ item: shield, disposition: "worn" }],
  });

  const [mainWeapon] = wildShapeLoadoutObjectRefs({
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "one_handed",
    },
  });
  if (mainWeapon?.kind !== "mainWeapon") {
    throw new Error("Expected main weapon candidate.");
  }
  const practicalWornMainWeapon: WildShapeEquipmentDispositionChoice = {
    item: mainWeapon,
    disposition: "worn",
    practicality: { kind: "practicalToWear" },
  };
  expect(
    validateWildShapeEquipmentDispositionFill({
      candidates: [mainWeapon],
      value: {
        formLimbs: { kind: "canHandleObjects" },
        choices: [practicalWornMainWeapon],
      },
    }),
  ).toEqual({
    tag: "valid",
    dispositions: [{ item: mainWeapon, disposition: "worn" }],
  });
});

test("uses Beast Strength for Shove while in Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const subject: BattleSubject = {
    tag: "action",
    actorId: druidId,
    action: "shove",
  };
  const target = requireHole(
    resolveBattleSubject({ state: assumed.state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        targetFill(target, goblinId, [
          {
            kind: "shoveTargetWithinReach",
            shoverId: druidId,
            targetId: goblinId,
          },
        ]),
      ],
    }),
    "shoveOutcome",
  );
  if (outcome.kind !== "shoveOutcome") {
    throw new Error("Expected Shove outcome.");
  }

  expect(outcome.dc).toBe(13);
});

test("projects Beast physical and retained character mental Ability Scores", () => {
  const initial = druidWildShapeBattle({
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 8,
        con: 8,
        int: 16,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: [],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantD20AbilityScore(druid, "str")).toBe(16);
  expect(combatantD20AbilityScore(druid, "dex")).toBe(13);
  expect(combatantD20AbilityScore(druid, "con")).toBe(12);
  expect(combatantD20AbilityScore(druid, "int")).toBe(16);
  expect(combatantD20AbilityScore(druid, "wis")).toBe(14);
  expect(combatantD20AbilityScore(druid, "cha")).toBe(12);
});

test("projects retained and Beast Skill modifiers while in Wild Shape", () => {
  const ridingHorseWithSkills: StatBlockRecord = {
    ...assertStatBlockForTest(statBlockCatalog, ridingHorseId),
    statBlock: {
      ...assertStatBlockForTest(statBlockCatalog, ridingHorseId).statBlock,
      skillModifiers: [
        { modifier: 5, skill: "perception" },
        { modifier: 4, skill: "stealth" },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSkills,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 16,
        wis: 14,
        cha: 10,
      },
      savingThrowProficiencies: [],
      skillProficiencies: ["nature", "stealth"],
      skillExpertise: ["stealth"],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(
    combatantAbilityCheckModifier(druid, { ability: "int", skill: "nature" }),
  ).toBe(5);
  expect(combatantSkillModifier(druid, "stealth")).toBe(5);
  expect(combatantSkillModifier(druid, "perception")).toBe(5);
});

test("projects retained and higher Beast Saving Throw modifiers while in Wild Shape", () => {
  const ridingHorseWithSavingThrows: StatBlockRecord = {
    ...assertStatBlockForTest(statBlockCatalog, ridingHorseId),
    statBlock: {
      ...assertStatBlockForTest(statBlockCatalog, ridingHorseId).statBlock,
      savingThrowModifiers: [
        { ability: "dex", modifier: 6 },
        { ability: "wis", modifier: 1 },
      ],
    },
  };
  const initial = druidWildShapeBattle({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(
      ridingHorseWithSavingThrows,
    ),
    d20Statistics: {
      abilityScores: {
        str: 8,
        dex: 10,
        con: 10,
        int: 10,
        wis: 14,
        cha: 12,
      },
      savingThrowProficiencies: ["dex", "wis"],
      skillProficiencies: [],
      skillExpertise: [],
    },
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);

  expect(combatantSavingThrowModifier(druid, "dex")).toBe(6);
  expect(combatantSavingThrowModifier(druid, "wis")).toBe(4);
  expect(combatantSavingThrowModifier(druid, "cha")).toBe(1);
});

test("offers one assume-form act for each known Beast form", () => {
  const initial = druidWildShapeBattle();
  const acts = discoverBattleActCandidates(initial);
  expect(
    acts.filter(
      (act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm",
    ),
  ).toHaveLength(4);
});

test("offers no assume-form acts when no Wild Shape forms are battle-available", () => {
  const initial = druidWildShapeBattle({ knownForms: [] });
  const acts = discoverBattleActCandidates(initial);
  expect(
    acts.filter(
      (act) =>
        act.subject.tag === "druidWildShape" &&
        act.subject.action === "assumeForm",
    ),
  ).toEqual([]);
});

test("rejects omitted Wild Shape available-form subset for a direct battle init", () => {
  const result = startBattle({
    battleId: battleId("battle-druid-wild-shape-omitted-forms"),
    combatants: [
      characterSeed({
        combatantId: druidId,
        displayName: "Druid",
        initiative: 20,
        classLevels: [{ className: "druid", level: 2 }],
        resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(battleStateInitIssueMessage(result.left)).toBe(
      "Druid Wild Shape battle initialization requires an available known-form subset.",
    );
  }
});

test("rejects ineligible known Beast forms before battle initialization", () => {
  const wildShapeUnit = unitLibrary.requireUnit("druid_wild_shape");
  expect(parseSupportedUnitFeatureProfile(wildShapeUnit, [])).toBeNull();
  expect(
    parseSupportedUnitFeatureProfile(wildShapeUnit, [
      { className: "druid", level: ClassLevel.make(1) },
    ]),
  ).toBeNull();
  const profile = parseSupportedUnitFeatureProfile(wildShapeUnit, [
    { className: "druid", level: ClassLevel.make(2) },
  ]);
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      assertStatBlockForTest(statBlockCatalog, ratId),
      assertStatBlockForTest(statBlockCatalog, ridingHorseId),
      assertStatBlockForTest(statBlockCatalog, catId),
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_skeleton"),
      ),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(wildShapeKnownFormsIssueMessage(result.left.issues)).toBe(
      "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
    );
  }
});

test("projects canonical level-2 Wild Shape access and rejects a transform-free synthetic record", () => {
  const wildShape = unitLibrary.requireUnit("druid_wild_shape");
  const levelTwo = [
    { className: "druid", level: ClassLevel.make(2) },
  ] as const satisfies readonly CharacterBattleClassLevel[];
  const withoutTransform = syntheticDruidWildShapeUnit(
    "synthetic_druid_wild_shape_without_transform",
    (phase) => ({
      ...phase,
      effects: phase.effects.filter(
        (effect) => effect.kind !== "transform_target",
      ),
    }),
  );

  expect(parseSupportedUnitFeatureProfile(wildShape, levelTwo)).toEqual({
    kind: "druidWildShapeKnownForm",
    unit: wildShape,
    classLevel: 2,
    knownFormRoster: {
      creatureType: "beast",
      count: 4,
      maxChallengeRating: 0.25,
      flySpeed: "forbidden",
    },
  });
  expect(
    parseSupportedUnitFeatureProfile(withoutTransform, levelTwo),
  ).toBeNull();
});

test("rejects decoded synthetic Wild Shape mechanics outside the admitted support profile", () => {
  const classLevels = [
    { className: "druid", level: ClassLevel.make(2) },
  ] as const satisfies readonly CharacterBattleClassLevel[];
  const unsupportedTemporaryHitPoints = syntheticDruidWildShapeUnit(
    "synthetic_druid_wild_shape_temp_hp",
    (phase) => ({
      ...phase,
      effects: phase.effects.map((effect) =>
        "amount" in effect && effect.kind === "grant_temp_hp"
          ? {
              ...effect,
              amount: {
                ...effect.amount,
                base: { ...effect.amount.base, flat: 2 },
              },
            }
          : effect,
      ),
    }),
  );
  const additionalChoiceEncoding = syntheticDruidWildShapeUnit(
    "synthetic_druid_wild_shape_additional_choices",
    (phase) => ({
      ...phase,
      effects: phase.effects.map((effect) =>
        "newForm" in effect &&
        effect.kind === "transform_target" &&
        effect.newForm.kind === "known_forms_roster"
          ? {
              ...effect,
              newForm: {
                ...effect.newForm,
                knownForms: {
                  kind: "class_level_additional_choices",
                  initial: 1,
                  increases: [{ atLevel: 3, choose: 1 }],
                },
              },
            }
          : effect,
      ),
    }),
  );

  expect(
    battleDruidWildShapeKnownFormSupportForUnit(unsupportedTemporaryHitPoints),
  ).toBe("unsupported");
  expect(
    parseSupportedUnitFeatureProfile(
      unsupportedTemporaryHitPoints,
      classLevels,
    ),
  ).toBeNull();
  expect(
    battleDruidWildShapeKnownFormSupportForUnit(additionalChoiceEncoding),
  ).toBe("unsupported");
  expect(
    parseSupportedUnitFeatureProfile(additionalChoiceEncoding, classLevels),
  ).toBeNull();
});

test("filters unsupported Wild Shape procedure forms without dropping later supported forms", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const unsupportedForm = syntheticActionSectionForm();
  const projection = projectAuthoredStatBlock(unsupportedForm);
  if (Either.isRight(projection)) {
    throw new Error(
      "Expected the synthetic action-section form to be unsupported.",
    );
  }
  expect(projection.left.reason).toBe("unsupportedProcedureBinding");
  if (projection.left.reason !== "unsupportedProcedureBinding") {
    throw new Error("Expected accumulated unsupported procedure bindings.");
  }
  expect(projection.left.issues.length).toBeGreaterThan(1);

  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      unsupportedForm,
      assertStatBlockForTest(statBlockCatalog, ridingHorseId),
    ],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([ridingHorseId]);
  }
});

test("rejects duplicate supplied Wild Shape form records before battle initialization", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      assertStatBlockForTest(statBlockCatalog, ratId),
      assertStatBlockForTest(statBlockCatalog, ratId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(wildShapeKnownFormsIssueMessage(result.left.issues)).toBe(
      "Druid Wild Shape battle initialization requires distinct available known forms.",
    );
  }
});

test("rejects known Beast forms without promoted movement facts", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const ridingHorse = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const noWalkSpeedForm = {
    ...ridingHorse,
    statBlock: {
      ...ridingHorse.statBlock,
      speeds: [
        {
          kind: "swim" as const,
          feet: { kind: "literal" as const, value: 30 },
        },
      ] as const,
    },
  };
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      assertStatBlockForTest(statBlockCatalog, ratId),
      noWalkSpeedForm,
      assertStatBlockForTest(statBlockCatalog, lizardId),
      assertStatBlockForTest(statBlockCatalog, catId),
    ],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(wildShapeKnownFormsIssueMessage(result.left.issues)).toBe(
      "Druid Wild Shape battle forms require literal Walk Speed.",
    );
  }
});

test("rejects known Beast forms without literal Size", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const baseForm = requireNonSwarmStatBlockRecordForTest(
    assertStatBlockForTest(statBlockCatalog, ratId),
  );
  const nonLiteralSizeForm: StatBlockRecord = {
    ...baseForm,
    id: parseSharedStatBlockId(syntheticNonLiteralSizeFormId),
    name: "Synthetic Nonliteral Size Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-non-literal-size-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      size: {
        kind: "alternatives",
        options: ["small", "medium"],
      },
    },
  };
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [nonLiteralSizeForm],
  });

  expect(Either.isLeft(result)).toBe(true);
  if (Either.isLeft(result)) {
    expect(wildShapeKnownFormsIssueMessage(result.left.issues)).toBe(
      "Druid Wild Shape battle forms require literal Size.",
    );
  }
});

test("rejects known Beast forms with nonliteral Armor Class at the authored parser boundary", () => {
  const baseForm = assertStatBlockForTest(statBlockCatalog, ratId);
  const malformed = {
    ...baseForm,
    id: parseSharedStatBlockId("synthetic_nonliteral_armor_class_form"),
    name: "Synthetic Nonliteral Armor Class Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-nonliteral-armor-class-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      ac: {
        ...baseForm.statBlock.ac,
        value: { kind: "caster_derived", source: "spell_save_dc" },
      },
    },
  };

  expect(
    Either.isLeft(Schema.decodeUnknownEither(StatBlockRecordSchema)(malformed)),
  ).toBe(true);
});

test("rejects known Beast forms with conditional Speed at the authored parser boundary", () => {
  const baseForm = assertStatBlockForTest(statBlockCatalog, ratId);
  const firstSpeed = baseForm.statBlock.speeds[0];
  const malformed = {
    ...baseForm,
    id: parseSharedStatBlockId("synthetic_conditional_speed_form"),
    name: "Synthetic Conditional Speed Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-conditional-speed-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      speeds: [
        {
          ...firstSpeed,
          feet: { kind: "caster_derived", source: "spell_save_dc" },
        },
        ...baseForm.statBlock.speeds.slice(1),
      ],
    },
  };

  expect(
    Either.isLeft(Schema.decodeUnknownEither(StatBlockRecordSchema)(malformed)),
  ).toBe(true);
});

test("admits selected Beast forms with multi-component attack damage and typed hit riders", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      assertStatBlockForTest(statBlockCatalog, ratId),
      assertStatBlockForTest(statBlockCatalog, ridingHorseId),
      assertStatBlockForTest(statBlockCatalog, spiderId),
      assertStatBlockForTest(statBlockCatalog, wolfId),
    ],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([
      ratId,
      ridingHorseId,
      spiderId,
      wolfId,
    ]);
  }
});

test("retains text-only traits without inferring typed attack-roll support", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const baseForm = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const traitAdvantageForm = {
    ...baseForm,
    id: parseSharedStatBlockId(syntheticUntypedCoordinatedShapeId),
    provenance: {
      kind: "synthetic-test" as const,
      section: "synthetic-untyped-coordinated-shape",
    },
    statBlock: {
      ...baseForm.statBlock,
      traits: [
        {
          name: "Coordinated Strike",
          description:
            "The form has Advantage on attack rolls against a creature if an ally is next to the creature.",
        },
      ],
    },
  } satisfies StatBlockRecord;

  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [baseForm, traitAdvantageForm],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([
      ridingHorseId,
      syntheticUntypedCoordinatedShapeId,
    ]);
  }
});

test("admits typed trait-derived attack-roll advantage from battle-available forms", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const baseForm = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const traitAdvantageForm = syntheticCoordinatedShape();

  const result = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [baseForm, traitAdvantageForm],
  });

  expect(Either.isRight(result)).toBe(true);
  if (Either.isRight(result)) {
    expect(result.right.map((form) => form.id)).toEqual([
      ridingHorseId,
      syntheticCoordinatedShapeId,
    ]);
  }
});

test("threads typed trait-derived attack-roll advantage through caller spatial witnesses", () => {
  const form = syntheticCoordinatedShape();
  const initialSession = druidWildShapeSession({
    knownForms: druidWildShapeKnownFormsReplacingRidingHorse(form),
    extraCombatants: [
      characterSeed({
        combatantId: packAllyId,
        displayName: "Pack Ally",
        initiative: 5,
        attack: null,
      }),
      characterSeed({
        combatantId: incapacitatedPackAllyId,
        displayName: "Incapacitated Pack Ally",
        initiative: 4,
        attack: null,
        conditions: ["incapacitated"],
      }),
    ],
  });
  const initial = initialSession.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: syntheticCoordinatedShapeId,
      }),
    ),
  );
  const subject = statBlockAttackSubject(
    assumed.state,
    "Hooves",
    initialSession.context,
  );
  const targetHole = attackInitialTargetHole(assumed.state, subject);
  const rollWithoutWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [attackTargetFill(targetHole, druidId, goblinId)],
    }),
    "attackRoll",
  );
  expect(rollWithoutWitness).not.toMatchObject({ rollMode: "advantage" });

  const rollWithIncapacitatedWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, undefined, [
          {
            kind: "attackerAllyWithin5FeetOfTarget",
            attackerId: druidId,
            targetId: goblinId,
            allyId: incapacitatedPackAllyId,
          },
        ]),
      ],
    }),
    "attackRoll",
  );
  expect(rollWithIncapacitatedWitness).not.toMatchObject({
    rollMode: "advantage",
  });

  const rollWithWitness = requireHole(
    resolveBattleSubject({
      state: assumed.state,
      subject,
      fills: [
        attackTargetFill(targetHole, druidId, goblinId, undefined, [
          {
            kind: "attackerAllyWithin5FeetOfTarget",
            attackerId: druidId,
            targetId: goblinId,
            allyId: packAllyId,
          },
        ]),
      ],
    }),
    "attackRoll",
  );
  expect(rollWithWitness).toMatchObject({ rollMode: "advantage" });
});

test("classifies eligible Wild Shape Beast action surfaces without making ids the category owner", () => {
  const profile = parseSupportedUnitFeatureProfile(
    unitLibrary.requireUnit("druid_wild_shape"),
    [{ className: "druid", level: ClassLevel.make(2) }],
  );
  if (profile?.kind !== "druidWildShapeKnownForm") {
    throw new Error("Expected Druid Wild Shape support profile.");
  }
  const inventory = wildShapeFormActionSurfaceInventory({
    forms: [
      ...statBlockCatalog.listStatBlocks(),
      assertStatBlockForTest(
        statBlockCatalog,
        parseSharedStatBlockId("stat_block_skeleton"),
      ),
      syntheticTypedRidersForm(),
      syntheticActionSectionForm(),
    ],
    profile,
  });

  expect(inventory).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        category: "simpleLiteralAttackSingleDamage",
        exampleStatBlockIds: expect.arrayContaining([ratId, ridingHorseId]),
      }),
      expect.objectContaining({
        category: "multiDamageComponentsOnHit",
        exampleStatBlockIds: expect.arrayContaining([spiderId]),
      }),
      expect.objectContaining({
        category: "attackHitTargetSizeConditionRider",
        exampleStatBlockIds: expect.arrayContaining([
          wolfId,
          syntheticTypedRidersFormId,
        ]),
      }),
      expect.objectContaining({
        category: "traitDerivedConditionalAttackRollAdvantage",
        exampleStatBlockIds: expect.arrayContaining([wolfId]),
      }),
      expect.objectContaining({
        category: "attackHitOtherRider",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticTypedRidersFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("attack-hit rider owner"),
          reason: expect.stringContaining("typed payload"),
        }),
      }),
      expect.objectContaining({
        category: "tableOrProseOnlyTrait",
        exampleStatBlockIds: expect.arrayContaining([ratId]),
      }),
      expect.objectContaining({
        category: "statBlockActionMultiattack",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Multiattack control owner"),
          reason: expect.stringContaining("actions.multiattacks"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionSaveGate",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("save-gated action procedure owner"),
          reason: expect.stringContaining("actions.saves"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionSupport",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("support-action procedure owner"),
          reason: expect.stringContaining("actions.supports"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockActionOption",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("action-option procedure owner"),
          reason: expect.stringContaining("generic Utilize"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockSpecialAction",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("special-action payload"),
          reason: expect.stringContaining("Surface specials"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockBonusActionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Bonus Action lifecycle"),
          reason: expect.stringContaining("bonusActions"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockReactionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Reaction trigger"),
          reason: expect.stringContaining("Surface reactions"),
        }),
      }),
      expect.objectContaining({
        category: "statBlockLegendaryActionSection",
        exampleStatBlockIds: expect.arrayContaining([
          syntheticActionSectionFormId,
        ]),
        closedBoundary: expect.objectContaining({
          owner: expect.stringContaining("Legendary Action lifecycle"),
          reason: expect.stringContaining("legendaryActions"),
        }),
      }),
    ]),
  );
  const srdEligibleInventory = wildShapeFormActionSurfaceInventory({
    forms: statBlockCatalog.listStatBlocks(),
    profile,
  });
  expect(srdEligibleInventory.map((entry) => entry.category)).not.toEqual(
    expect.arrayContaining([
      "statBlockActionMultiattack",
      "statBlockActionSaveGate",
      "statBlockActionSupport",
      "statBlockActionOption",
      "statBlockSpecialAction",
      "statBlockBonusActionSection",
      "statBlockReactionSection",
      "statBlockLegendaryActionSection",
    ]),
  );
  expect(
    inventory.some((entry) => entry.category === "attackHitConditionRider"),
  ).toBe(false);
  expect(
    inventory.some(
      (entry) => entry.category === "attackHitForcedMovementRider",
    ),
  ).toBe(false);
});

function syntheticTypedRidersForm(): StatBlockRecord {
  const base = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const hooves = base.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" && entry.procedure.kind === "attack_roll",
  );
  if (hooves === undefined) {
    throw new Error("Expected Riding Horse Hooves fixture.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(syntheticTypedRidersFormId),
    name: "Synthetic Typed Riders Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-typed-riders-form",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        {
          ...hooves,
          procedure: {
            ...hooves.procedure,
            onHit: [
              ...hooves.procedure.onHit,
              {
                kind: "apply_condition_if_target_size_at_most",
                condition: "prone",
                maxCreatureSize: "medium",
              },
              {
                kind: "conditional_bonus_damage",
                when: { kind: "attack_roll_had_advantage" },
                damageType: "bludgeoning",
                amount: { kind: "fixed", static: 1 },
              },
            ],
            name: "Synthetic Rider Strike",
          },
        },
      ],
    },
  };
}

function syntheticActionSectionForm(): StatBlockRecord {
  const base = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const hooves = base.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" && entry.procedure.kind === "attack_roll",
  );
  if (hooves === undefined) {
    throw new Error("Expected Riding Horse Hooves fixture.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(syntheticActionSectionFormId),
    name: "Synthetic Action Section Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-action-section-form",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        hooves,
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(2),
          procedure: {
            kind: "multiattack",
            name: "Synthetic Multiattack",
            dispatches: [
              {
                procedureOrdinal: hooves.procedureOrdinal,
                count: { kind: "literal", value: 1 },
              },
            ],
          },
          resourceRefs: { kind: "none" },
        },
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(3),
          procedure: {
            kind: "save",
            name: "Synthetic Save Pulse",
            ability: "dex",
            dc: { kind: "fixed", dc: 12 },
            target: { kind: "one_creature_in_range", rangeFeet: 5 },
            onFail: {
              kind: "damage",
              damageType: "bludgeoning",
              amount: { kind: "fixed", static: 1 },
            },
            onSuccess: { kind: "half_damage" },
          },
          resourceRefs: { kind: "none" },
        },
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(4),
          procedure: {
            kind: "support",
            name: "Synthetic Self Aid",
            target: "self",
            effect: {
              kind: "damage",
              damageType: "bludgeoning",
              amount: {
                kind: "fixed",
                static: 1,
              },
            },
          },
          resourceRefs: { kind: "none" },
        },
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(5),
          procedure: {
            kind: "action_option",
            name: "Synthetic Action Option",
            options: ["disengage", "utilize"],
          },
          resourceRefs: { kind: "none" },
        },
        {
          kind: "textOnly",
          procedureOrdinal: testProcedureOrdinal(6),
          name: "Synthetic Special",
          description: "The form attempts a table-adjudicated special action.",
          reason: "required_table_adjudication",
          resourceRefs: { kind: "none" },
        },
      ],
      bonusActions: [
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(1),
          procedure: {
            kind: "action_option",
            name: "Synthetic Quick Option",
            options: ["disengage", "hide"],
          },
          resourceRefs: { kind: "none" },
        },
      ],
      reactions: [
        {
          kind: "textOnly",
          procedureOrdinal: testProcedureOrdinal(1),
          name: "Synthetic Response",
          description: "The form responds to a table-supplied trigger.",
          reason: "required_table_adjudication",
          resourceRefs: { kind: "none" },
        },
      ],
      legendaryActions: {
        uses: { kind: "fixed", uses: 1 },
        entries: [
          {
            kind: "textOnly",
            procedureOrdinal: testProcedureOrdinal(1),
            name: "Synthetic Legendary Move",
            description: "The form uses a table-adjudicated legendary action.",
            reason: "required_table_adjudication",
            resourceRefs: { kind: "none" },
          },
        ],
      },
    },
  };
}

function syntheticSupportedNonAttackForm(): StatBlockRecord {
  const base = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  const hooves = base.statBlock.actions?.find(
    (entry): entry is AttackProcedureEntry =>
      entry.kind === "executable" && entry.procedure.kind === "attack_roll",
  );
  if (hooves === undefined) {
    throw new Error("Expected Riding Horse Hooves fixture.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(syntheticSupportedNonAttackFormId),
    name: "Synthetic Supported Non-Attack Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-supported-non-attack-form",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        hooves,
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(2),
          procedure: {
            kind: "multiattack",
            name: "Synthetic Multiattack",
            dispatches: [
              {
                procedureOrdinal: hooves.procedureOrdinal,
                count: { kind: "literal", value: 1 },
              },
            ],
          },
          resourceRefs: { kind: "none" },
        },
      ],
      bonusActions: [
        {
          kind: "executable",
          procedureOrdinal: testProcedureOrdinal(1),
          procedure: {
            kind: "action_option",
            name: "Synthetic Quick Option",
            options: ["disengage", "hide"],
          },
          resourceRefs: { kind: "none" },
        },
      ],
    },
  };
}

test("surfaces active Wild Shape typed trait projection issues", () => {
  const baseForm = syntheticSupportedNonAttackForm();
  const traitForm: StatBlockRecord = {
    ...baseForm,
    id: parseSharedStatBlockId(syntheticTraitProjectionFormId),
    name: "Synthetic Trait Projection Form",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-trait-projection-form",
    },
    statBlock: {
      ...baseForm.statBlock,
      traits: [
        {
          name: "Table Trait",
          description: "The form has a table-adjudicated trait.",
        },
      ],
    },
  };
  const initial = druidWildShapeSession({ knownForms: [traitForm] });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial.state,
      wildShapeSubject(initial.state, {
        action: "assumeForm",
        formStatBlockId: syntheticTraitProjectionFormId,
      }),
    ),
  );

  expect(
    statBlockProjectionIssuesForActor(assumed.state, initial.context, druidId),
  ).toEqual([
    {
      tag: "statBlockProjectionIssue",
      source: { kind: "trait", nonExecutableReason: "textOnlyTrait" },
    },
  ]);
  expect(
    discoverBattleActsWithStatBlockProjectionIssues(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: initial.context,
      }),
    ).statBlockProjectionIssues,
  ).toEqual([
    {
      combatantId: druidId,
      issues: [
        {
          tag: "statBlockProjectionIssue",
          source: { kind: "trait", nonExecutableReason: "textOnlyTrait" },
        },
      ],
    },
  ]);
});

test("surfaces active Wild Shape non-attack presentation join issues", () => {
  const initial = startBattleSessionRight({
    battleId: battleId("battle-druid-wild-shape-presentation-join"),
    combatants: [
      druidWildShapeCreatureInit({
        knownForms: [syntheticSupportedNonAttackForm()],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial.state,
      wildShapeSubject(initial.state, {
        action: "assumeForm",
        formStatBlockId: syntheticSupportedNonAttackFormId,
      }),
    ),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const activeForm = activeDruidWildShape(activeDruid);
  if (activeForm === null) {
    throw new Error("Expected active Wild Shape form.");
  }
  const druidContext = initial.context.characters.get(druidId);
  if (druidContext === undefined) {
    throw new Error("Expected Druid presentation context.");
  }
  const formPresentations = druidContext.druidWildShapeFormPresentations;
  if (formPresentations === undefined) {
    throw new Error("Expected Wild Shape form presentations.");
  }
  const source = formPresentations.get(activeForm.admission.execution.scopeRef);
  if (source === undefined) {
    throw new Error("Expected active Wild Shape presentation source.");
  }

  for (const joinMode of ["missing", "mismatch"] as const) {
    for (const procedureCase of [
      {
        action: "multiattack",
        presentationKind: "multiattack",
        executionKind: "multiattack",
      },
      {
        action: "statBlockActionOption",
        presentationKind: "bonusActionOption",
        executionKind: "bonusActionOption",
      },
    ] as const) {
      const binding = activeForm.admission.execution.procedureBindings.find(
        ({ procedure }) => procedure.kind === procedureCase.executionKind,
      );
      if (binding === undefined || !("procedureOrdinal" in binding.procedure)) {
        throw new Error(
          `Expected active Wild Shape ${procedureCase.executionKind} binding.`,
        );
      }
      const subject =
        procedureCase.action === "multiattack"
          ? {
              tag: "action" as const,
              actorId: druidId,
              action: "multiattack" as const,
              procedureRef: binding.procedureRef,
            }
          : binding.procedure.kind === "bonusActionOption"
            ? {
                tag: "bonusAction" as const,
                actorId: druidId,
                action: "statBlockActionOption" as const,
                procedureRef: binding.procedureRef,
                standardAction: binding.procedure.standardActions[0],
              }
            : (() => {
                throw new Error(
                  "Expected the active Wild Shape bonus action option binding.",
                );
              })();
      const selectedPresentation = source.orderedProcedures.find(
        ({ kind }) => kind === procedureCase.presentationKind,
      );
      if (selectedPresentation === undefined) {
        throw new Error(
          `Expected ${procedureCase.presentationKind} presentation.`,
        );
      }
      const executionProcedureOrdinal = binding.procedure.procedureOrdinal;
      const orderedProcedures = source.orderedProcedures.map((procedure) => {
        if (procedure !== selectedPresentation) return procedure;
        if (joinMode === "missing") {
          return {
            ...procedure,
            procedureOrdinal: testProcedureOrdinal(
              procedure.procedureOrdinal + 100,
            ),
          };
        }
        return {
          section: procedure.section,
          procedureOrdinal: procedure.procedureOrdinal,
          name: `Synthetic ${procedureCase.presentationKind} mismatch`,
          description: "Synthetic text-only presentation mismatch.",
          kind: "textOnly" as const,
          reason: "required_table_adjudication" as const,
          resourceRefs: procedure.resourceRefs,
        };
      });
      const formPresentationsWithIssue = new Map(formPresentations).set(
        activeForm.admission.execution.scopeRef,
        { ...source, orderedProcedures },
      );
      const contextWithIssue = battleRuntimeContextForTest(
        new Map(initial.context.characters).set(druidId, {
          ...druidContext,
          druidWildShapeFormPresentations: formPresentationsWithIssue,
        }),
        initial.context.statBlocks,
      );
      const presentation = battleSubjectPresentation(
        battleRuntimeSessionForTest({
          state: assumed.state,
          context: contextWithIssue,
        }),
        subject,
      );
      const issue =
        joinMode === "missing"
          ? {
              tag: "statBlockProcedurePresentationJoinIssue" as const,
              reason: "missingPresentation" as const,
              section: selectedPresentation.section,
              procedureOrdinal: executionProcedureOrdinal,
              executionKind: procedureCase.executionKind,
            }
          : {
              tag: "statBlockProcedurePresentationJoinIssue" as const,
              reason: "presentationKindMismatch" as const,
              section: selectedPresentation.section,
              procedureOrdinal: executionProcedureOrdinal,
              executionKind: procedureCase.executionKind,
              presentationKind: "textOnly" as const,
            };
      expect(presentation).toEqual({
        kind: "presentationIssue",
        issue: {
          tag: "attackPresentationJoinIssue",
          reason: "statBlockProcedurePresentationJoin",
          issues: [issue],
        },
      });
    }
  }
});

test("projects automatic reversion when Wild Shape ends from Incapacitated", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const activeDruid = requireCharacter(assumed.state, druidId);
  const incapacitatedDruid: BattleCreatureState = {
    ...activeDruid,
    conditions: applyCondition(activeDruid.conditions, "incapacitated"),
    positiveHpUnconscious: null,
  };
  const state: BattleState = {
    ...assumed.state,
    combatants: new Map(assumed.state.combatants).set(
      druidId,
      incapacitatedDruid,
    ),
  };

  expect(combatantHasActiveDruidWildShape(incapacitatedDruid)).toBe(false);
  const snapshot = snapshotCreature(snapshotBattle(state), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("reverts Wild Shape and projects the terminal route when damage causes Instant Death after exhausting its Temporary Hit Points", () => {
  const initial = druidWildShapeBattle({
    hitPointMaximum: Hp(1),
  });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const goblinTurn = requireResolved(
    endTurn({ state: assumed.state, actorId: druidId }),
  );
  const subject = goblinAttackSubject(goblinTurn.state, "Scimitar");
  const target = attackInitialTargetHole(goblinTurn.state, subject);
  const targetSelection = attackTargetFill(target, goblinId, druidId);
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [targetSelection],
    }),
    "attackRoll",
  );
  const attackRollSelection = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [targetSelection, attackRollSelection],
    }),
    "rolledDice",
  );
  const damageFills = [
    targetSelection,
    attackRollSelection,
    damageRollFill(damage, 2),
  ];
  const damageResult = resolveBattleSubject({
    state: goblinTurn.state,
    subject,
    fills: damageFills,
  });
  const disposition = requireHole(damageResult, "attackDamageDisposition");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [
        ...damageFills,
        attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
      ],
    }),
  );

  const druid = requireCharacter(resolved.state, druidId);
  expect(activeDruidWildShapeEffect(druid)).toBeNull();
  expect(Number(druid.hp)).toBe(0);
  expect(Number(druid.tempHp)).toBe(0);
  const routeEvents = resolved.routeEvents;
  if (routeEvents === undefined) {
    throw new Error("Expected Wild Shape terminal route events.");
  }
  expect(
    routeEvents.filter(
      (event) => "subject" in event && event.subject === "activeFormLifecycle",
    ),
  ).toEqual([
    expect.objectContaining({ owner: "battleHitPointAndZeroHpLifecycle" }),
    expect.objectContaining({ owner: "battleHitPointAndZeroHpLifecycle" }),
    expect.objectContaining({ owner: "battleActiveEffect" }),
    expect.objectContaining({ owner: "battleCreatureState" }),
    expect.objectContaining({ owner: "battleMovementResource" }),
  ]);
});

test("shared shape-shift owner projects and reverts active Wild Shape", () => {
  const initial = druidWildShapeBattle();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const shapeShiftedDruid = requireCharacter(assumed.state, druidId);
  expect(combatantIsShapeShifted(shapeShiftedDruid)).toBe(true);
  expect(battleShapeShiftedRuntimeState(shapeShiftedDruid)).toMatchObject({
    kind: "shapeShifted",
    trueForm: { kind: "combatantBaseState" },
    source: { kind: "classFeature" },
    replacementForm: { kind: "runtimeCreatureForm", creatureSize: "large" },
    reversionOwner: { kind: "druidWildShapeActiveEffect" },
  });

  const result = revertShapeShiftedCombatantToTrueForm({
    state: assumed.state,
    combatantId: druidId,
  });
  expect(result.tag).toBe("reverted");
  const revertedState = result.state;

  const revertedDruid = requireCharacter(revertedState, druidId);
  expect(combatantIsShapeShifted(revertedDruid)).toBe(false);
  expect(activeDruidWildShapeForm(revertedDruid)).toBe(null);
  const snapshot = snapshotCreature(snapshotBattle(revertedState), druidId);
  expect(snapshot.size).toBe("medium");
  expect(Number(snapshot.movement.speedFeet)).toBe(30);
});

test("shape-shift reversion reports a missing combatant distinctly", () => {
  const initial = druidWildShapeBattle();
  const missingId = combatantId("missing-shape-shift-combatant");
  const result = revertShapeShiftedCombatantToTrueForm({
    state: initial,
    combatantId: missingId,
  });

  expect(result).toMatchObject({
    tag: "missingCombatant",
    combatantId: missingId,
  });
});

test("active Wild Shape reversion reports an owner removed through the public roster lifecycle", () => {
  const session = druidWildShapeSession();
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      session.state,
      wildShapeSubject(session.state, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const druid = requireCharacter(assumed.state, druidId);
  const shapeShift = battleShapeShiftedRuntimeState(druid);
  if (shapeShift.kind !== "shapeShifted") {
    throw new Error("Expected active Wild Shape runtime state.");
  }
  const removed = removeBattleRuntimeCombatants({
    session: battleRuntimeSessionForTest({
      state: assumed.state,
      context: session.context,
    }),
    combatantIds: [druidId],
  });
  if (Either.isLeft(removed)) {
    throw new Error(JSON.stringify(removed.left));
  }

  expect(
    revertShapeShiftedRuntimeState({
      state: removed.right.state,
      shapeShift,
    }),
  ).toMatchObject({
    tag: "missingCombatant",
    combatantId: druidId,
  });
});

test("Wild Shape blocks spell invocation before Beast Spells", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL - 1,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "cure_wounds",
    ),
  ).toBe(false);
});

test("Beast Spells admits no-Material spell invocation while Wild Shape is active", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("cure_wounds")],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "cure_wounds",
    ),
  ).toBe(true);
});

test("Beast Spells retains the usable Shillelagh slot through resolution when held slots share an item identity", () => {
  const itemId = battleObjectId("duplicate:weapon_quarterstaff");
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    cantrips: [spellRecord("shillelagh")],
    attack: weakTrueFormWeaponAttack("weapon_quarterstaff"),
    offHandAttack: weakTrueFormWeaponAttack("weapon_quarterstaff"),
    selectedLoadout: {
      weapon: {
        itemId,
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
      offHandWeapon: {
        itemId,
        unitId: parseSharedUnitId("weapon_quarterstaff"),
      },
    },
  });
  const preShapeShillelagh = discoverBattleActs(session).find(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === "shillelagh",
  );
  if (preShapeShillelagh?.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected pre-shape Shillelagh act.");
  }
  const subject = wildShapeSubject(session.state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(session.state, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const mainWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  const offHandWeapon = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "offHandWeapon",
  );
  if (mainWeapon === undefined || offHandWeapon === undefined) {
    throw new Error("Expected both Quarterstaff disposition candidates.");
  }
  const merged = requireResolved(
    resolveDruidWildShape(session.state, subject, [
      wildShapeDispositionFill(dispositionHole, [
        { item: mainWeapon, disposition: "merges" },
        { item: offHandWeapon, disposition: "merges" },
      ]),
    ]),
  );
  const mergedNextTurn = nextDruidTurn(merged.state);

  expect(
    hasSpell(
      battleRuntimeSessionForTest({
        state: mergedNextTurn,
        context: session.context,
      }),
      "shillelagh",
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: mergedNextTurn,
      subject: preShapeShillelagh.subject,
      fills: [],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "unsupportedSubject",
  });

  const worn = requireResolved(
    resolveDruidWildShape(session.state, subject, [
      wildShapeDispositionFill(dispositionHole, [
        { item: mainWeapon, disposition: "merges" },
        {
          item: offHandWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
      ]),
    ]),
  );
  const wornNextTurn = nextDruidTurn(worn.state);
  const wornNextTurnSession = battleRuntimeSessionForTest({
    state: wornNextTurn,
    context: session.context,
  });
  const shillelaghActs = discoverBattleActs(wornNextTurnSession).filter(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === shillelaghUnitId,
  );
  expect(shillelaghActs).toHaveLength(1);
  const offHandShillelagh = shillelaghActs[0]!;

  const mainWorn = requireResolved(
    resolveDruidWildShape(session.state, subject, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: mainWeapon,
          disposition: "worn",
          practicality: { kind: "practicalToWear" },
        },
        { item: offHandWeapon, disposition: "merges" },
      ]),
    ]),
  );
  const mainWornNextTurn = nextDruidTurn(mainWorn.state);
  expect(
    hasSpell(
      battleRuntimeSessionForTest({
        state: mainWornNextTurn,
        context: session.context,
      }),
      "shillelagh",
    ),
  ).toBe(true);
  expect(
    resolveBattleSubject({
      state: mainWornNextTurn,
      subject: offHandShillelagh.subject,
      fills: [],
    }),
  ).toMatchObject({ tag: "invalid", reason: "unsupportedSubject" });
});

test("fallen Wild Shape weapons stay unavailable after reversion until picked up and held", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    cantrips: [spellRecord("shillelagh")],
    attack: weakTrueFormWeaponAttack("weapon_quarterstaff"),
    selectedLoadout: {
      weapon: {
        itemId: battleObjectId("main:weapon_quarterstaff"),
        unitId: parseSharedUnitId("weapon_quarterstaff"),
        grip: "one_handed",
      },
    },
  });
  const shillelagh = discoverBattleActs(session).find(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === "shillelagh",
  );
  if (shillelagh?.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected pre-shape Shillelagh act.");
  }
  const assume = wildShapeSubject(session.state, {
    action: "assumeForm",
    formStatBlockId: ridingHorseId,
  });
  const needsDisposition = resolveDruidWildShape(session.state, assume);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const dispositionHole = requireWildShapeEquipmentDispositionHole(
    needsDisposition.holes,
  );
  const quarterstaff = dispositionHole.candidates.find(
    (candidate) => candidate.kind === "mainWeapon",
  );
  if (quarterstaff === undefined) {
    throw new Error("Expected Quarterstaff disposition candidate.");
  }
  const fallen = requireResolved(
    resolveDruidWildShape(session.state, assume, [
      wildShapeDispositionFill(dispositionHole, [
        {
          item: quarterstaff,
          disposition: "falls",
          fallInActorSpace: {
            kind: "actorSpace",
            positionId: druidGroundPositionId,
          },
        },
      ]),
    ]),
  );
  expect(
    applyBattleHeldWeaponPickup(fallen.state, {
      interaction: {
        actorId: druidId,
        objectId: quarterstaff.objectId,
        actorSpace: {
          kind: "actorSpace",
          positionId: druidGroundPositionId,
        },
      },
      loadoutSlot: "mainWeapon",
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "activeFormPickupUnsupported",
  });
  const dismissTurn = restoreBonusAction(fallen.state);
  const dismissed = requireResolved(
    resolveDruidWildShape(
      dismissTurn,
      wildShapeSubject(dismissTurn, { action: "dismiss" }),
    ),
  );
  const revertedSession = battleRuntimeSessionForTest({
    state: restoreBonusAction(dismissed.state),
    context: session.context,
  });

  expect(hasSpell(revertedSession, "shillelagh")).toBe(false);
  expect(
    discoverBattleActCandidates(revertedSession.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(revertedSession.state),
      ),
    ),
  ).toBe(false);
  expect(
    resolveBattleSubject({
      state: revertedSession.state,
      subject: shillelagh.subject,
      fills: [],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "unsupportedSubject",
  });

  const pickedUp = applyBattleHeldWeaponPickup(revertedSession.state, {
    interaction: {
      actorId: druidId,
      objectId: quarterstaff.objectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: druidGroundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });
  if (pickedUp.tag !== "applied") {
    throw new Error(pickedUp.message);
  }
  const restoredSession = battleRuntimeSessionForTest({
    state: pickedUp.state,
    context: session.context,
  });
  expect(hasSpell(restoredSession, "shillelagh")).toBe(true);
  expect(
    discoverBattleActCandidates(restoredSession.state).some((act) =>
      isAttackActForProcedure(
        act,
        trueFormMainAttackProcedureRef(restoredSession.state),
      ),
    ),
  ).toBe(true);
});

test("Beast Spells admits focus-replaceable Material spell invocation while Wild Shape is active", () => {
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [spellRecord("animal_friendship")],
    targetStatBlock: assertStatBlockForTest(statBlockCatalog, catId),
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  expect(
    hasActionSpell(
      battleRuntimeSessionForTest({
        state: assumed.state,
        context: session.context,
      }),
      "animal_friendship",
    ),
  ).toBe(true);
});

test("Beast Spells rejects priced or consumed Material spells while Wild Shape is active", () => {
  expect(
    spellDefinitionHasPricedOrConsumedMaterialComponent(
      spellRecord("continual_flame"),
    ),
  ).toBe(true);
  expect(
    spellDefinitionHasPricedOrConsumedMaterialComponent(
      spellRecord("cure_wounds"),
    ),
  ).toBe(false);
  expect(
    spellDefinitionHasPricedOrConsumedMaterialComponent(
      spellRecord("warding_bond"),
    ),
  ).toBe(true);
  const session = druidWildShapeSession({
    druidLevel: DRUID_BEAST_SPELLS_CLASS_LEVEL,
    preparedSpells: [
      spellRecord("cure_wounds"),
      spellRecord("continual_flame"),
    ],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const initial = session.state;
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: catId,
      }),
    ),
  );

  const assumedSession = battleRuntimeSessionForTest({
    state: assumed.state,
    context: session.context,
  });
  expect(hasActionSpell(assumedSession, "cure_wounds")).toBe(true);
  expect(hasActionSpell(assumedSession, "continual_flame")).toBe(false);
});

test("rounds odd-level duration down through the general division rule", () => {
  const initial = druidWildShapeBattle({ druidLevel: 3 });
  const assumed = requireResolved(
    resolveDruidWildShapeWithoutLoadoutEquipment(
      initial,
      wildShapeSubject(initial, {
        action: "assumeForm",
        formStatBlockId: ridingHorseId,
      }),
    ),
  );
  const effect = activeDruidWildShapeEffect(
    requireCharacter(assumed.state, druidId),
  );
  expect(Number(effect?.expiresAt.durationTicks)).toBe(600);
});

type DruidWildShapeCreatureInput = {
  readonly druidLevel?: number;
  readonly includeUnrelatedResource?: boolean;
  readonly hitPointMaximum?: Hp;
  readonly armorClass?: ArmorClassState;
  readonly unarmoredArmorClassBases?: CharacterSeedInput["unarmoredArmorClassBases"];
  readonly attack?: CharacterSeedInput["attack"];
  readonly offHandAttack?: CharacterSeedInput["offHandAttack"];
  readonly d20Statistics?: CharacterBattleD20Statistics;
  readonly knownForms?: readonly StatBlockRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly cantrips?: readonly SpellRecord[];
  readonly selectedLoadout?: CharacterBattleCreatureState["origin"]["selectedLoadout"];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
};

type DruidWildShapeBattleInput = DruidWildShapeCreatureInput & {
  readonly extraCombatants?: readonly ReturnType<typeof characterSeed>[];
  readonly targetStatBlock?: StatBlockRecord;
};

function druidWildShapeBattle(input?: DruidWildShapeBattleInput): BattleState {
  return druidWildShapeSession(input).state;
}

function druidWildShapeSession(
  input?: DruidWildShapeBattleInput,
): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle-druid-wild-shape"),
    combatants: [
      druidWildShapeCreatureInit(input),
      statBlockCreatureInit({
        initiative: 10,
        ...(input?.targetStatBlock === undefined
          ? {}
          : { statBlock: input.targetStatBlock }),
      }),
      ...(input?.extraCombatants ?? []),
    ],
  });
}

function druidWildShapeCreatureInit(input?: DruidWildShapeCreatureInput) {
  return characterSeed({
    combatantId: druidId,
    displayName: "Druid",
    initiative: 20,
    ...(input?.hitPointMaximum === undefined
      ? {}
      : {
          currentHp: input.hitPointMaximum,
          maxHp: input.hitPointMaximum,
        }),
    classLevels:
      input?.includeUnrelatedResource === true
        ? [
            { className: "druid", level: input?.druidLevel ?? 2 },
            { className: "fighter", level: 1 },
          ]
        : [{ className: "druid", level: input?.druidLevel ?? 2 }],
    resources: [
      { unit: unitLibrary.requireUnit("druid_wild_shape") },
      ...(input?.includeUnrelatedResource === true ? [resource()] : []),
    ],
    ...(input?.d20Statistics === undefined
      ? {}
      : { d20Statistics: input.d20Statistics }),
    ...(input?.armorClass === undefined
      ? {}
      : { armorClass: input.armorClass }),
    ...(input?.unarmoredArmorClassBases === undefined
      ? {}
      : { unarmoredArmorClassBases: input.unarmoredArmorClassBases }),
    attack:
      input?.attack ??
      (input?.selectedLoadout?.weapon === undefined
        ? null
        : testCharacterWeaponAttackForUnit(
            input.selectedLoadout.weapon.unitId,
          )),
    ...(input?.offHandAttack === undefined
      ? {}
      : { offHandAttack: input.offHandAttack }),
    druidWildShapeAvailableForms:
      input?.knownForms ?? druidWildShapeKnownFormsWith(catId),
    selectedLoadout: input?.selectedLoadout ?? {},
    spellcasting: {
      ...wizardSpellcasting({
        cantrips: input?.cantrips ?? [spellRecord("produce_flame")],
        preparedSpells: input?.preparedSpells ?? [spellRecord("cure_wounds")],
        ...(input?.spellSlots === undefined
          ? {}
          : { spellSlots: input.spellSlots }),
      }),
      spellcastingSource: {
        tag: "classSpellcasting",
        className: "druid",
        abilityModifier: 3,
      },
    },
  });
}

function hasActionSpell(
  session: BattleRuntimeSession,
  spellId: string,
): boolean {
  return discoverBattleActs(session).some(
    (act) =>
      act.subject.tag === "actionSpell" &&
      battleActSpellPresentation(act)?.invocation.spellId === spellId,
  );
}

function hasSpell(session: BattleRuntimeSession, spellId: string): boolean {
  return discoverBattleActs(session).some(
    (act) => battleActSpellPresentation(act)?.invocation.spellId === spellId,
  );
}

function nextDruidTurn(state: BattleState): BattleState {
  const targetTurn = requireResolved(endTurn({ state, actorId: druidId }));
  return requireResolved(
    endTurn({ state: targetTurn.state, actorId: goblinId }),
  ).state;
}

function weakTrueFormLongswordAttack(): NonNullable<
  CharacterSeedInput["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_longsword");
}

function weakTrueFormShortswordAttack(): NonNullable<
  CharacterSeedInput["attack"]
> {
  return weakTrueFormWeaponAttack("weapon_shortsword");
}

function weakTrueFormDaggerAttack(): NonNullable<
  CharacterSeedInput["offHandAttack"]
> {
  return weakTrueFormWeaponAttack("weapon_dagger");
}

function weakTrueFormWeaponAttack(
  unitId:
    | "weapon_longsword"
    | "weapon_shortsword"
    | "weapon_dagger"
    | "weapon_quarterstaff",
): CharacterWeaponAttackActionOption {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected weapon Unit.");
  }
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: abilityModifier(-1),
    attackBonus: attackBonus(1),
    damageAbilityModifier: abilityModifier(-1),
  };
}

function druidWildShapeKnownFormsWith(
  fourthFormId: StatBlockRecord["id"],
  fourthForm: StatBlockRecord = assertStatBlockForTest(
    statBlockCatalog,
    fourthFormId,
  ),
): readonly StatBlockRecord[] {
  return [
    assertStatBlockForTest(statBlockCatalog, ratId),
    assertStatBlockForTest(statBlockCatalog, ridingHorseId),
    assertStatBlockForTest(statBlockCatalog, lizardId),
    fourthForm,
  ];
}

function druidWildShapeKnownFormsReplacingRidingHorse(
  ridingHorse: StatBlockRecord,
): readonly StatBlockRecord[] {
  return [
    assertStatBlockForTest(statBlockCatalog, ratId),
    ridingHorse,
    assertStatBlockForTest(statBlockCatalog, lizardId),
    assertStatBlockForTest(statBlockCatalog, catId),
  ];
}

function syntheticCoordinatedShape(): StatBlockRecord {
  const baseForm = assertStatBlockForTest(statBlockCatalog, ridingHorseId);
  return {
    ...baseForm,
    id: parseSharedStatBlockId(syntheticCoordinatedShapeId),
    name: "Synthetic Coordinated Shape",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic-coordinated-shape",
    },
    statBlock: {
      ...baseForm.statBlock,
      traits: [
        {
          name: "Coordinated Strike",
          description:
            "The form has Advantage on attack rolls against a creature if a non-incapacitated ally is within 5 feet of the creature.",
          effect: {
            kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
          },
        },
      ],
    },
  } satisfies StatBlockRecord;
}

function statBlockAttackSubject(
  state: BattleState,
  attackName: string,
  context?: BattleRuntimeContext,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const procedureRef = wildShapeStatBlockAttackProcedureRef(
    state,
    attackName,
    context,
  );
  const subject = discoverBattleActCandidates(state).find((act) =>
    isAttackActForProcedure(act, procedureRef),
  )?.subject;
  if (
    subject?.tag !== "action" ||
    subject.action !== "attack" ||
    subject.actorId !== druidId
  ) {
    throw new Error("Expected Wild Shape Stat Block attack subject.");
  }
  return subject;
}

type AttackCandidate = ReturnType<typeof discoverBattleActCandidates>[number];
type AttackProcedureRef = Extract<
  BattleSubject,
  | { readonly tag: "action"; readonly action: "attack" }
  | { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
>["procedureRef"];

function isAttackActForProcedure(
  act: AttackCandidate,
  procedureRef: AttackProcedureRef | null,
): boolean {
  return (
    procedureRef !== null &&
    ((act.subject.tag === "action" && act.subject.action === "attack") ||
      (act.subject.tag === "bonusAction" &&
        act.subject.action === "offHandAttack")) &&
    act.subject.procedureRef === procedureRef
  );
}

function wildShapeStatBlockAttackProcedureRef(
  state: BattleState,
  attackName: string,
  context?: BattleRuntimeContext,
): AttackProcedureRef | null {
  const active = activeDruidWildShape(requireCharacter(state, druidId));
  if (active === null) return null;
  if (context !== undefined) {
    const presentations = statBlockProcedurePresentationsForActor(
      state,
      context,
      druidId,
    );
    if (presentations === null) return null;
    if (Either.isLeft(presentations)) return null;
    return (
      presentations.right.find(
        (presentation) =>
          presentation.kind === "attack" && presentation.name === attackName,
      )?.procedureRef ?? null
    );
  }
  const presentation = Either.getOrThrow(
    projectAuthoredStatBlock(
      assertStatBlockForTest(statBlockCatalog, active.admission.statBlock.id),
    ),
  ).presentation;
  return (
    Either.getOrThrow(
      statBlockProcedurePresentations({
        execution: active.admission.execution,
        presentation,
      }),
    ).find(
      (presentation) =>
        presentation.kind === "attack" && presentation.name === attackName,
    )?.procedureRef ?? null
  );
}

function trueFormMainAttackProcedureRef(
  state: BattleState,
): AttackProcedureRef | null {
  return requireCharacter(state, druidId).origin.attack?.procedureRef ?? null;
}

function trueFormOffHandAttackProcedureRef(
  state: BattleState,
): AttackProcedureRef | null {
  return (
    requireCharacter(state, druidId).origin.offHandAttack?.procedureRef ?? null
  );
}

function wildShapeSubject(
  state: BattleState,
  input:
    | {
        readonly action: "assumeForm";
        readonly formStatBlockId: string;
      }
    | { readonly action: "dismiss" },
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const actor = requireCharacter(state, druidId);
  const formExecutionRef =
    input.action === "assumeForm"
      ? actor.origin.druidWildShapeAvailableForms?.find(
          (admission) => admission.statBlock.id === input.formStatBlockId,
        )?.execution.scopeRef
      : undefined;
  const subject = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === input.action &&
      (input.action === "dismiss" ||
        (act.subject.action === "assumeForm" &&
          act.subject.formExecutionRef === formExecutionRef)),
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape act.");
  }
  return subject;
}

function resolveDruidWildShape(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
  fills: readonly BattleFill[] = [],
) {
  return resolveBattleSubject({ state, subject, fills });
}

function resolveDruidWildShapeWithoutLoadoutEquipment(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "druidWildShape" }>,
) {
  const needsDisposition = resolveDruidWildShape(state, subject);
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape object handling hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  expect(hole.candidates).toEqual([]);
  return resolveDruidWildShape(state, subject, [
    wildShapeDispositionFill(hole, []),
  ]);
}

function wildShapeSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
    },
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "two_handed",
    },
    offHandWeapon: {
      itemId: battleObjectId("offhand:weapon_dagger"),
      unitId: parseSharedUnitId("weapon_dagger"),
    },
  };
}

function wildShapeBattleSelectedLoadout(): CharacterBattleCreatureState["origin"]["selectedLoadout"] {
  return {
    armor: {
      itemId: battleObjectId("armor:equipment_leather"),
      unitId: parseSharedUnitId("equipment_leather"),
    },
    shield: {
      itemId: battleObjectId("shield:equipment_shield"),
      unitId: parseSharedUnitId("equipment_shield"),
    },
    weapon: {
      itemId: battleObjectId("main:weapon_quarterstaff"),
      unitId: parseSharedUnitId("weapon_quarterstaff"),
      grip: "one_handed",
    },
  };
}

function shieldArmorClassState(input?: {
  readonly rightHandUse?: ArmorClassState["rightHandUse"];
}): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    bonuses: [
      {
        kind: "shield",
        bonus: armorClassDelta(2),
        handUse: "shield",
        trainingRequired: "shield",
      },
    ],
    armorTraining: new Set(["shield"]),
    leftHandUse: "shield",
    rightHandUse: input?.rightHandUse ?? "free",
  };
}

function heavyArmorClassState(): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
  };
}

function isWildShapeArmorLoadoutObjectRef(
  item: WildShapeLoadoutObjectRef,
): item is Extract<WildShapeLoadoutObjectRef, { readonly kind: "armor" }> {
  return item.kind === "armor";
}

function isWildShapeShieldLoadoutObjectRef(
  item: WildShapeLoadoutObjectRef,
): item is Extract<WildShapeLoadoutObjectRef, { readonly kind: "shield" }> {
  return item.kind === "shield";
}

function requireWildShapeEquipmentDispositionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "wildShapeEquipmentDisposition" }
    > => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  return hole;
}

function wildShapeDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }>,
  choices: readonly WildShapeEquipmentDispositionChoice[],
  formLimbs: Extract<
    BattleFill,
    { readonly kind: "wildShapeEquipmentDisposition" }
  >["value"]["formLimbs"] = { kind: "canHandleObjects" },
): Extract<BattleFill, { readonly kind: "wildShapeEquipmentDisposition" }> {
  return {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      formLimbs,
      choices,
    },
  };
}

function requireCharacter(
  state: BattleState,
  combatantId: typeof druidId,
): CharacterBattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error("Expected Druid character combatant.");
  }
  return combatant;
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState | undefined,
): combatant is CharacterBattleCreatureState {
  return combatant?.origin.kind === "character";
}

function druidWildShapeUsesRemaining(
  combatant: CharacterBattleCreatureState,
): number {
  const [resource, ...additionalResources] = combatant.origin.resources;
  if (
    resource === undefined ||
    additionalResources.length > 0 ||
    !("usesRemaining" in resource)
  ) {
    throw new Error("Expected the fixture's sole Wild Shape use resource.");
  }
  return Number(resource.usesRemaining);
}

function restoreBonusAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      currentHasBonusAction: true,
    },
  };
}

function snapshotCreature(
  snapshot: ReturnType<typeof snapshotBattle>,
  combatantId: typeof druidId,
) {
  const creature = snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (creature === undefined) {
    throw new Error("Expected Druid snapshot.");
  }
  return creature;
}
