// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
import { Match } from "effect";
import type {
  ActionSpellBattleResolutionInput,
  BattleMagicalDarknessAreaChoice,
  BattleSpellAreaIdentityChoice,
  BattleSpellAreaChoice,
  BattleResolutionResult,
  BattleState,
  BattleTrackedOngoingSpellLightEmitter,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  GLYPH_STORED_AREA_ONGOING_PROCEDURES,
  type GlyphStoredAreaOngoingProcedure,
} from "../active-effect/types.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  applyFlamingSphereCastEffect,
  applySpikeGrowthMovementHazardCastEffect,
  applyFogCloudObscurementCastEffect,
  applyGustOfWindLineCastEffect,
  applyMagicalDarknessPointOriginCastEffect,
  applyMoonbeamCastEffect,
  applySleetStormAreaHazardCastEffect,
  applyWebRestraintHazardCastEffect,
} from "./spells-active-effects.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";
import { spellAreaChoiceHole } from "./spells-holes-fills.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { maybeOpenInterruptWindow, snapshotBattle } from "./dispatcher.ts";
import {
  saveMetamagicSelectionState,
  validateGustOfWindLineAreaPushFacts,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import { isTrackedOngoingSpellLightEmitter } from "./antimagic-field-suppression.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resources.ts";

const byProcedure = Match.discriminator("procedure");

type StoredGlyphAreaOngoingSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: GlyphStoredAreaOngoingProcedure }
>;
type StoredGlyphCenteredSpellAreaChoice = Extract<
  BattleSpellAreaIdentityChoice,
  {
    readonly kind:
      | "fogCloudArea"
      | "magicalDarknessArea"
      | "flamingSphereArea"
      | "spikeGrowthArea"
      | "moonbeamCylinderArea"
      | "webCubeArea";
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

export function isGlyphStoredAreaOngoingSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is StoredGlyphAreaOngoingSpellInvocation {
  return GLYPH_STORED_AREA_ONGOING_PROCEDURES.some(
    (procedure) => procedure === invocation.procedure,
  );
}

function ordinarySpellCastResource(
  metamagicApplications:
    | readonly CharacterBattleMetamagicOptionFact[]
    | undefined = undefined,
): AreaOngoingSpellReleaseResource {
  return metamagicApplications === undefined
    ? { kind: "ordinarySpellCast" }
    : { kind: "ordinarySpellCast", metamagicApplications };
}

function areaOngoingSpellReleaseResourceState(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
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
    errorState: input.errorState,
    ...(input.resource.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.resource.metamagicApplications }),
  });
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
  return Match.value(input.invocation).pipe(
    byProcedure("fogCloudObscurement", (invocation) =>
      resolveFogCloudObscurementSpellAct({
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
    byProcedure("flamingSphere", (invocation) =>
      resolveFlamingSphereSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("spikeGrowthMovementHazard", (invocation) =>
      resolveSpikeGrowthMovementHazardSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("moonbeam", (invocation) =>
      resolveMoonbeamSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("webRestraintHazard", (invocation) =>
      resolveWebRestraintHazardSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    byProcedure("gustOfWindLine", (invocation) =>
      resolveGustOfWindLineSpellAct({
        ...input,
        invocation,
        releaseResource,
      }),
    ),
    Match.exhaustive,
  );
}

export function resolveFogCloudObscurementSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Fog Cloud uses one table-supplied fog area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "fogCloudArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Fog Cloud area id must be a non-empty fog area.",
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyFogCloudObscurementCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMagicalDarknessPointOriginSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Darkness uses one table-supplied magical Darkness area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
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
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }
  const invalidOverlap = magicalDarknessAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
    input.invocation,
  );
  if (invalidOverlap !== null) {
    return invalidResult(input.input.state, "invalidFill", invalidOverlap);
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMagicalDarknessPointOriginCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaChoice: input.fillSet.areaChoice,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function magicalDarknessAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleMagicalDarknessAreaChoice,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >,
): string | null {
  const trackedEmitters = trackedOngoingSpellLightEmittersByEffectId(state);
  for (const overlap of areaChoice.spellCreatedLightOverlaps) {
    const emitter = trackedEmitters.get(overlap.sourceEffectId);
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

function trackedOngoingSpellLightEmittersByEffectId(
  state: ActionSpellBattleResolutionInput["state"],
): ReadonlyMap<
  BattleTrackedOngoingSpellLightEmitter["sourceEffectId"],
  BattleTrackedOngoingSpellLightEmitter
> {
  return new Map(
    state.lightEmitters.flatMap((emitter) =>
      isTrackedOngoingSpellLightEmitter(emitter)
        ? [[emitter.sourceEffectId, emitter]]
        : [],
    ),
  );
}

export function resolveFlamingSphereSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "flamingSphere" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Movable sphere uses one table-supplied sphere area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "flamingSphereArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable sphere area id must be a non-empty sphere area.",
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyFlamingSphereCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSpikeGrowthMovementHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spikeGrowthMovementHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Spike Growth uses one table-supplied sphere area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "spikeGrowthArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spike Growth area id must be a non-empty sphere area.",
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applySpikeGrowthMovementHazardCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMoonbeamSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "moonbeam" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Movable cylinder uses one table-supplied cylinder area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "moonbeamCylinderArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable cylinder area id must be a non-empty cylinder area.",
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMoonbeamCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveWebRestraintHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "webRestraintHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Web uses one table-supplied cube area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "webCubeArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Web area id must be a non-empty cube area.",
    );
  }
  const invalidStoredGlyphCenter = invalidStoredGlyphAreaCenterResult({
    state: input.input.state,
    areaChoice: input.fillSet.areaChoice,
    releaseResource: input.releaseResource,
  });
  if (invalidStoredGlyphCenter !== null) {
    return invalidStoredGlyphCenter;
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource: input.releaseResource ?? ordinarySpellCastResource(),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyWebRestraintHazardCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSleetStormAreaHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleetStormAreaHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Sleet Storm uses one table-supplied cylinder area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "sleetStormCylinderArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Sleet Storm area id must be a non-empty cylinder area.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applySleetStormAreaHazardCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveGustOfWindLineSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "gustOfWindLine" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
  readonly releaseResource?: AreaOngoingSpellReleaseResource;
}): BattleResolutionResult {
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
    input.fillSet.commandOptionChoice !== undefined ||
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
      "Gust of Wind uses one Line-area Saving Throw fill.",
    );
  }

  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
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
    savingThrowHole,
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
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  if (
    !("area" in savingThrowOutcomes) ||
    savingThrowOutcomes.area.kind !== "gustOfWindLineArea"
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Gust of Wind requires Line area and direction facts.",
    );
  }
  const area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "gustOfWindLineArea" }
  > = savingThrowOutcomes.area;
  const failedTargetIds = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const areaValidation = validateGustOfWindLineAreaPushFacts({
    area,
    failedTargetIds,
    pushDistanceFeet: input.invocation.pushDistanceFeet,
  });
  if (areaValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", areaValidation);
  }
  if (failedTargetIds.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargetIds[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = areaOngoingSpellReleaseResourceState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    resource:
      input.releaseResource ??
      ordinarySpellCastResource(input.metamagicApplications),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyGustOfWindLineCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    area,
    invocation: input.invocation,
    heightenedSpellTargetId:
      metamagicSelections.heightenedSpellTargetId ?? null,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
