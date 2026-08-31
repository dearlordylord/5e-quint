// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
import { optionalProperty } from "../optional-property.ts";
import { Match } from "effect";
import { bindStoredSpellProcedureExecutionFacts } from "../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../character-execution.ts";
import type {
  ActionSpellBattleResolutionInput,
  BattleMagicalDarknessAreaChoice,
  BattleExecutableSpellInvocation,
  BattleSpellAreaIdentityChoice,
  BattleSpellAreaChoice,
  BattleResolutionResult,
  BattleState,
  BattleTrackedOngoingSpellLightEmitter,
} from "../battle-state-execution.ts";
import type { GlyphStoredAreaOngoingProcedure } from "../glyph-stored-spell-invocation.ts";
import type { CombatantId } from "../identity.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  applyRamMovablePersistentAreaCastEffect,
  applyAreaMovementDistanceDamageCastEffect,
  applyPersistentAreaTraitCastEffect,
  applyDirectionalPersistentAreaCastEffect,
  applyMagicalDarknessPointOriginCastEffect,
  applyTranslatingPersistentAreaAreaHazardCastEffect,
  applyStationaryPersistentAreaAreaHazardCastEffect,
  applyMovablePersistentAreaCastEffect,
  applyPersistentAreaSaveCompositeCastEffect,
  applyPersistentAreaSaveConditionEscapeCastEffect,
} from "./spells-active-effects.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";
import { spellAreaChoiceHole } from "./spells-holes-fills.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  saveMetamagicSelectionState,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
import { validateDirectionalPersistentAreaAreaPushFacts } from "./directional-area-push-facts.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import { failedSavingThrowTargetIds } from "./saving-throw-outcomes.ts";
import { isTrackedOngoingSpellLightEmitter } from "./magic-suppression-ongoing-effect.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";

const byProcedure = Match.discriminator("procedure");

export type StoredGlyphAreaOngoingSpellInvocation = Extract<
  SpellProcedureExecution,
  { readonly procedure: GlyphStoredAreaOngoingProcedure }
>;
type StoredGlyphCenteredSpellAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  {
    readonly kind:
      | "persistentAreaTraitArea"
      | "magicalDarknessArea"
      | "pointOriginSphereDiameterArea"
      | "anchoredPointOriginSphereArea"
      | "anchoredPointOriginCylinderArea"
      | "pointOriginCubeArea";
  }
>;
type AreaOngoingSpellReleaseResource =
  | {
      readonly kind: "ordinarySpellCast";
      readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
    }
  | {
      readonly kind: "storedGlyphSpellRelease";
      readonly selfOriginAreaAnchorId: CombatantId;
    };

function ordinarySpellCastResource(
  metamagicApplications:
    | readonly CharacterBattleMetamagicOptionFact[]
    | undefined = undefined,
): AreaOngoingSpellReleaseResource {
  return metamagicApplications === undefined
    ? { kind: "ordinarySpellCast" }
    : { kind: "ordinarySpellCast", metamagicApplications };
}

function areaOngoingSpellFillSetHasUnrelatedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  const optionalFills = [
    fillSet.targetId,
    fillSet.objectTarget,
    fillSet.targetAllocation,
    fillSet.targetList,
    fillSet.attackRoll,
    fillSet.savingThrowOutcomes,
    fillSet.skillChoice,
    fillSet.targetAbilityChoices,
    fillSet.abilityChoice,
    fillSet.compelledBehaviorOptionChoice,
    fillSet.damageTypeChoice,
    fillSet.damageRoll,
    fillSet.movement,
    fillSet.attackBurstDamageRoll,
    fillSet.healingRoll,
  ];
  const repeatedFills = [
    fillSet.concentrationSavingThrows,
    fillSet.damageDispositions,
    fillSet.spellDamageReductionRolls,
  ];
  return (
    optionalFills.some((fill) => fill !== undefined) ||
    repeatedFills.some((fills) => fills.length > 0)
  );
}

function areaOngoingSpellReleaseResourceState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly resource: AreaOngoingSpellReleaseResource;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.resource.kind === "storedGlyphSpellRelease") {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellCastResources({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.state,
    ...optionalProperty(
      "metamagicApplications",
      input.resource.metamagicApplications,
    ),
  });
}

function resolveAreaOngoingSpellEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly resource: AreaOngoingSpellReleaseResource;
  readonly applyEffect: (state: BattleState) => BattleState;
}): BattleResolutionResult {
  const resourced = areaOngoingSpellReleaseResourceState(input);
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = input.applyEffect(resourced.state);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function invalidStoredGlyphAreaCenterResult(input: {
  readonly state: BattleState;
  readonly areaChoice: StoredGlyphCenteredSpellAreaChoice;
  readonly releaseResource: AreaOngoingSpellReleaseResource | undefined;
}): Extract<BattleResolutionResult, { readonly tag: "invalid" }> | null {
  if (input.releaseResource?.kind !== "storedGlyphSpellRelease") {
    return null;
  }
  if (
    "originAnchor" in input.areaChoice &&
    input.areaChoice.originAnchor.kind === "combatant" &&
    input.areaChoice.originAnchor.combatantId ===
      input.releaseResource.selfOriginAreaAnchorId
  ) {
    return null;
  }
  return invalidResult(
    input.state,
    "invalidFill",
    "Stored glyph area release must use a spell area centered on the triggering creature.",
  );
}

export function resolveStoredGlyphAreaOngoingSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: StoredGlyphAreaOngoingSpellInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly selfOriginAreaAnchorId: CombatantId;
}): BattleResolutionResult {
  const releaseResource = {
    kind: "storedGlyphSpellRelease",
    selfOriginAreaAnchorId: input.selfOriginAreaAnchorId,
  } as const;
  const invocation = bindStoredSpellProcedureExecutionFacts(
    input.invocation,
    input.input.subject.procedureRef,
  );
  if (invocation.procedure === "persistentAreaSaveDamage") {
    return Match.value(invocation).pipe(
      Match.when({ lifecycle: { kind: "stationary" } }, (invocation) =>
        resolveStationaryPersistentAreaAreaHazardSpellAct({
          ...input,
          invocation,
          releaseResource,
        }),
      ),
      Match.when(
        { lifecycle: { kind: "sourceTurnTranslation" } },
        (invocation) =>
          resolveTranslatingPersistentAreaAreaHazardSpellAct({
            ...input,
            invocation,
            releaseResource,
          }),
      ),
      Match.when(
        {
          lifecycle: {
            kind: "casterActionReposition",
            actionCost: "bonusAction",
          },
        },
        (invocation) =>
          resolveRamMovablePersistentAreaSpellAct({
            ...input,
            invocation,
            releaseResource,
          }),
      ),
      Match.when(
        {
          lifecycle: {
            kind: "casterActionReposition",
            actionCost: "magicAction",
          },
        },
        (invocation) =>
          resolveMovablePersistentAreaSpellAct({
            ...input,
            invocation,
            releaseResource,
          }),
      ),
      Match.exhaustive,
    );
  }
  return Match.value(invocation).pipe(
    byProcedure("persistentAreaTrait", (invocation) =>
      resolvePersistentAreaTraitSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("magicalDarknessPointOrigin", (invocation) =>
      resolveMagicalDarknessPointOriginSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("areaMovementDistanceDamage", (invocation) =>
      resolveAreaMovementDistanceDamageSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("persistentAreaSaveConditionEscape", (invocation) =>
      resolvePersistentAreaSaveConditionEscapeSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("directionalPersistentArea", (invocation) =>
      resolveDirectionalPersistentAreaSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    Match.exhaustive,
  );
}

export function resolvePersistentAreaTraitSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaTrait" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "persistent-area trait uses one table-supplied fog area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "persistentAreaTraitArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "persistent-area trait area id must be a non-empty fog area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyPersistentAreaTraitCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveMagicalDarknessPointOriginSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Darkness uses one table-supplied magical Darkness area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "magicalDarknessArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Darkness area id must be a non-empty magical Darkness area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }
  const invalidOverlap = magicalDarknessAreaChoiceInvalidReason(
    input.input.state,
    areaChoice,
    input.invocation,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidOverlap !== null) {
    return invalidResult(input.input.state, "invalidFill", invalidOverlap);
  }
  /* v8 ignore stop -- @preserve */

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyMagicalDarknessPointOriginCastEffect({
        state,
        actorId: input.actorId,
        areaChoice,
        invocation: input.invocation,
      }),
  });
}

function magicalDarknessAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleMagicalDarknessAreaChoice,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >,
): string | null {
  const trackedEmitters = trackedOngoingSpellLightEmittersByEffectRef(state);
  for (const overlap of areaChoice.spellCreatedLightOverlaps) {
    const emitter = trackedEmitters.get(overlap.effectRef);
    if (emitter === undefined) {
      return "Darkness spell-light overlap must reference a tracked ongoing spell light.";
    }
    if (
      emitter.sourceSpellLevel >
      invocation.dispelledSpellCreatedLightMaxSpellLevel
    ) {
      return "Darkness can only dispel overlapping spell-created light at or below its supported spell level limit.";
    }
  }
  return null;
}

function trackedOngoingSpellLightEmittersByEffectRef(
  state: ActionSpellBattleResolutionInput["state"],
): ReadonlyMap<
  BattleTrackedOngoingSpellLightEmitter["effectRef"],
  BattleTrackedOngoingSpellLightEmitter
> {
  return new Map(
    state.lightEmitters.flatMap((emitter) =>
      isTrackedOngoingSpellLightEmitter(emitter)
        ? [[emitter.effectRef, emitter]]
        : [],
    ),
  );
}

export function resolveRamMovablePersistentAreaSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "bonusAction";
      };
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable sphere uses one table-supplied sphere area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "pointOriginSphereDiameterArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable sphere area id must be a non-empty sphere area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyRamMovablePersistentAreaCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveAreaMovementDistanceDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "areaMovementDistanceDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "area movement-distance damage uses one table-supplied sphere area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "anchoredPointOriginSphereArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "area movement-distance damage area id must be a non-empty sphere area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyAreaMovementDistanceDamageCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveMovablePersistentAreaSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "magicAction";
      };
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable cylinder uses one table-supplied cylinder area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "anchoredPointOriginCylinderArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable cylinder area id must be a non-empty cylinder area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyMovablePersistentAreaCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolvePersistentAreaSaveConditionEscapeSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaSaveConditionEscape" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape uses one table-supplied cube area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "pointOriginCubeArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "PersistentAreaSaveConditionEscape area id must be a non-empty cube area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyPersistentAreaSaveConditionEscapeCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolvePersistentAreaSaveCompositeSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "persistentAreaSaveComposite" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "persistent-area save-composite uses one table-supplied cylinder area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "anchoredPointOriginCylinderArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "persistent-area save-composite area id must be a non-empty cylinder area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyPersistentAreaSaveCompositeCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveStationaryPersistentAreaAreaHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "stationary" };
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "stationary persistent area uses one table-supplied sphere area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "anchoredPointOriginSphereArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "stationary persistent area area id must be a non-empty sphere area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyStationaryPersistentAreaAreaHazardCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveTranslatingPersistentAreaAreaHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaOngoingSpellFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "TranslatingPersistentArea uses one table-supplied sphere area fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "anchoredPointOriginSphereArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "TranslatingPersistentArea area id must be a non-empty sphere area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const areaChoice = input.fillSet.areaChoice;

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
    applyEffect: (state) =>
      applyTranslatingPersistentAreaAreaHazardCastEffect({
        state,
        actorId: input.actorId,
        areaId: areaChoice.areaId,
        invocation: input.invocation,
      }),
  });
}

export function resolveDirectionalPersistentAreaSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "directionalPersistentArea" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.compelledBehaviorOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "directional persistent area uses one Line-area Saving Throw fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
    input.releaseResource?.kind === "storedGlyphSpellRelease"
      ? {
          selfOriginAreaAnchorId: input.releaseResource.selfOriginAreaAnchorId,
        }
      : {},
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !("area" in savingThrowOutcomes) ||
    savingThrowOutcomes.area.kind !== "directionalPersistentAreaArea"
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "directional persistent area requires Line area and direction facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "directionalPersistentAreaArea" }
  > = savingThrowOutcomes.area;
  const failedTargetIds = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  const areaValidation = validateDirectionalPersistentAreaAreaPushFacts({
    area,
    failedTargetIds,
    pushDistanceFeet: input.invocation.pushDistanceFeet,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", areaValidation);
  }
  /* v8 ignore stop -- @preserve */
  if (failedTargetIds.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargetIds[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: spellReplayContinuation(input.input),
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  return resolveAreaOngoingSpellEffect({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    resource:
      input.releaseResource ??
      ordinarySpellCastResource(input.metamagicApplications),
    applyEffect: (state) =>
      applyDirectionalPersistentAreaCastEffect({
        state,
        actorId: input.actorId,
        area,
        invocation: input.invocation,
        heightenedSpellTargetId:
          metamagicSelections.heightenedSpellTargetId ?? null,
      }),
  });
}
