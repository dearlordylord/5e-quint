// Spell target holes and target legality validation extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { SIZES } from "@dnd/shared/types";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
  type BattleObjectContactTargetsHole,
  type BattleHoleId,
  type BattleCommandOptionChoiceHole,
  type BattleDancingLightsPlacementHole,
  type BattleSelfTransformationModeChoiceHole,
  type BattleSpellTargetAllocation,
  type BattleSpiritualWeaponForcePosition,
  type BattleSpellAreaChoiceHole,
  type BattleSpiritualWeaponForcePositionHole,
  type BattleSpellTargetAllocationHole,
  type BattleSpellTargetListHole,
  type BattleSpellTargetListSpatialFact,
  type BattleState,
  type BattleTeleportDestinationHole,
  type BattleMagicWeaponTargetItemHole,
  type BattleObjectTargetChoiceHole,
  type BattleCreatureState,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  type MagicWeaponEnhancementSpellInvocation,
  type SupportedSpellInvocation,
  type TargetListSpellInvocation,
} from "../battle-reducer.ts";
import { COMMAND_OPTIONS } from "./domain-constants.ts";
import {
  legalRepeatedDamageAllocationInvocationFacts,
  repeatedDamageAllocationAdmissionFactsForInvocation,
  repeatedDamageAllocationInvocationCanAffectTargets,
  repeatedDamageAllocationInvocationFacts,
  repeatedDamageAllocationTargetCardinality,
} from "./spell-procedure-profiles/repeated-damage-allocation-facts.ts";
import { registeredSpellProcedureProfile } from "./spell-procedure-profiles/registry.ts";
import {
  spellId,
  type BattleObjectId,
  type BattleTablePositionId,
  type CombatantId,
} from "../identity.ts";
import { combatantWearingArmor } from "./creature-state-leaves.ts";
import { spellAttackSequencePartName } from "./spells-profile-shared.ts";

type SingleCreatureOrObjectSpellAttackDamageInvocation =
  Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectTarget" }
  > extends infer ObjectFact
    ? {
        readonly procedure:
          | "heldLightHurl"
          | "spellAttackSequence"
          | "spellAttackDamage";
        readonly spell: { readonly id: string; readonly name: string };
        readonly rangeFeet: ObjectFact extends {
          readonly rangeFeet: infer RangeFeet;
        }
          ? RangeFeet
          : never;
      }
    : never;
type SpellAttackSequenceInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackSequence" }
>;
type SpellAttackSequenceObjectTargetHoleInvocation =
  SpellAttackSequenceInvocation;
type SingleObjectSpellInvocation =
  | Exclude<
      SingleCreatureOrObjectSpellAttackDamageInvocation,
      { readonly procedure: "spellAttackSequence" }
    >
  | SpellAttackSequenceObjectTargetHoleInvocation
  | Extract<
      SupportedSpellInvocation,
      {
        readonly procedure: "objectContactDamage";
        readonly spell: { readonly id: string; readonly name: string };
      }
    >
  | Extract<
      SupportedSpellInvocation,
      {
        readonly procedure: "objectLight";
        readonly spell: { readonly id: string; readonly name: string };
      }
    >;

type SpellTargetLegalityOptions = {
  readonly spiritualWeaponForcePositionId?: BattleTablePositionId;
};
type ObjectLightTargetFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectLightTarget" | "spellTouchedObjectTarget" }
>;
type LightCantripObjectTargetFact = Extract<
  ObjectLightTargetFact,
  { readonly kind: "spellObjectLightTarget" }
>;
type TouchedObjectTargetFact = Extract<
  ObjectLightTargetFact,
  { readonly kind: "spellTouchedObjectTarget" }
>;
type ObjectTargetSightFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectTargetSight" }
>;
type ObjectIgnitionFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectIgnition" }
>;
type ManufacturedMetalObjectTargetFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellManufacturedMetalObjectTarget" }
>;
type ObjectLightTargetSize = LightCantripObjectTargetFact["size"];

export function spellTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: `${invocation.spell.name} target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spiritualWeaponForcePositionHole(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack";
    }
  >,
): BattleSpiritualWeaponForcePositionHole {
  const mode =
    invocation.procedure === "spiritualWeaponAttackProxy"
      ? "cast"
      : "reposition";
  const maxDistanceFeet =
    invocation.procedure === "spiritualWeaponAttackProxy"
      ? invocation.rangeFeet
      : invocation.repeatMoveMaxFeet;
  const key = `battle:spiritual-weapon-force-position:${invocation.spell.id}:${mode}`;
  return {
    kind: "spiritualWeaponForcePosition",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label:
      mode === "cast"
        ? `${invocation.spell.name} force position`
        : `${invocation.spell.name} force reposition`,
    spell: invocation,
    mode,
    maxDistanceFeet,
    requiresTableSpatialFact: true,
  };
}

export function spiritualWeaponForcePositionInvalidReason(
  forcePosition: BattleSpiritualWeaponForcePosition,
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "spiritualWeaponAttackProxy"
        | "spiritualWeaponRepeatAttack";
    }
  >,
): string | null {
  if (invocation.procedure === "spiritualWeaponAttackProxy") {
    if (forcePosition.mode !== "cast") {
      return "Spiritual Weapon cast requires a cast force-position fill.";
    }
    if (
      !Number.isInteger(forcePosition.distanceFromCasterFeet) ||
      forcePosition.distanceFromCasterFeet < 0 ||
      forcePosition.distanceFromCasterFeet > invocation.rangeFeet
    ) {
      return "Spiritual Weapon force placement must be within the spell range.";
    }
    return null;
  }
  if (forcePosition.mode !== "reposition") {
    return "Spiritual Weapon repeat attack requires a reposition fill.";
  }
  if (
    !Number.isInteger(forcePosition.moveDistanceFeet) ||
    forcePosition.moveDistanceFeet < 0 ||
    forcePosition.moveDistanceFeet > invocation.repeatMoveMaxFeet
  ) {
    return "Spiritual Weapon force movement exceeds the spell's maximum.";
  }
  return null;
}

export function spellAttackSequencePartTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): BattleTargetChoiceHole {
  const holeKey = spellAttackSequencePartTargetHoleKey(invocation, partIndex);
  const partName = spellAttackSequencePartName();
  return {
    kind: "targetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} target`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellAttackSequencePartTargetHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): BattleHoleId {
  return holeId(spellAttackSequencePartTargetHoleKey(invocation, partIndex));
}

function spellAttackSequencePartTargetHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): string {
  return `battle:spell:attack-sequence-part-target:${invocation.spell.id}:${partIndex}`;
}

export function spellObjectTargetHole(
  invocation: SingleObjectSpellInvocation,
): BattleObjectTargetChoiceHole {
  const holeKey = `battle:spell:object-target:${invocation.spell.id}`;
  return {
    kind: "objectTargetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} object target`,
    requiresTableSpatialFact: true,
  };
}

export function spellAttackSequencePartObjectTargetHole(
  invocation: SpellAttackSequenceObjectTargetHoleInvocation,
  partIndex: number,
): BattleObjectTargetChoiceHole {
  const holeKey = spellAttackSequencePartObjectTargetHoleKey(
    invocation,
    partIndex,
  );
  const partName = spellAttackSequencePartName();
  return {
    kind: "objectTargetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} ${partName} ${partIndex + 1} object target`,
    requiresTableSpatialFact: true,
  };
}

export function spellAttackSequencePartObjectTargetHoleId(
  invocation: SpellAttackSequenceInvocation,
  partIndex: number,
): BattleHoleId {
  return holeId(
    spellAttackSequencePartObjectTargetHoleKey(invocation, partIndex),
  );
}

function spellAttackSequencePartObjectTargetHoleKey(
  invocation: SpellAttackSequenceInvocation,
  partIndex: number,
): string {
  return `battle:spell:attack-sequence-part-object-target:${invocation.spell.id}:${partIndex}`;
}

export function spellObjectTargetHoleId(
  invocation: SingleObjectSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:object-target:${invocation.spell.id}`);
}

export function magicWeaponTargetItemHole(
  invocation: MagicWeaponEnhancementSpellInvocation,
): BattleMagicWeaponTargetItemHole {
  const holeKey = `battle:spell:magic-weapon-target-item:${invocation.spell.id}`;
  return {
    kind: "magicWeaponTargetItem",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} target item`,
    spell: invocation,
    requiresTableItemFact: true,
  };
}

export function magicWeaponTargetItemHoleId(
  invocation: MagicWeaponEnhancementSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:magic-weapon-target-item:${invocation.spell.id}`);
}

export function spellObjectContactTargetsHole(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectContactDamage" | "objectContactDamageRepeat" }
  >;
  readonly requiresObjectWithinRange: boolean;
}): BattleObjectContactTargetsHole {
  const holeKey = `battle:spell:object-contact-targets:${input.invocation.spell.id}:${input.objectId}`;
  return {
    kind: "objectContactTargets",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${input.invocation.spell.name} contact creatures`,
    objectContact: {
      sourceCombatantId: input.sourceCombatantId,
      sourceSpellId: spellId(input.invocation.spell.id),
      objectId: input.objectId,
      rangeFeet: input.invocation.rangeFeet,
      requiresObjectWithinRange: input.requiresObjectWithinRange,
    },
    choices: [...input.state.combatants.keys()],
    requiresTableSpatialFact: true,
  };
}

export function spellObjectContactTargetsHoleId(input: {
  readonly spellId: string;
  readonly objectId: BattleObjectId;
}): BattleHoleId {
  return holeId(
    `battle:spell:object-contact-targets:${input.spellId}:${input.objectId}`,
  );
}

export function spellDancingLightsPlacementHole(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast"
        | "dancingLightsReposition";
    }
  >,
  form: BattleDancingLightsPlacementHole["form"],
  activeLightIds: readonly BattleDancingLightsPlacementHole["activeLightIds"][number][],
): BattleDancingLightsPlacementHole {
  const mode =
    invocation.procedure === "dancingLightsReposition" ? "reposition" : "cast";
  const holeKey = `battle:spell:dancing-lights-placement:${invocation.spell.id}:${mode}:${form}`;
  return {
    kind: "dancingLightsPlacement",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} placement`,
    spell: invocation,
    mode,
    form,
    activeLightIds,
    rangeFeet: invocation.rangeFeet,
    maxMoveFeet: invocation.maxMoveFeet,
    spacingFeet: invocation.spacingFeet,
    requiresTableSpatialFact: true,
  };
}

export function spellDancingLightsPlacementHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast"
        | "dancingLightsReposition";
    }
  >,
  form: BattleDancingLightsPlacementHole["form"],
): BattleHoleId {
  const mode =
    invocation.procedure === "dancingLightsReposition" ? "reposition" : "cast";
  return holeId(
    `battle:spell:dancing-lights-placement:${invocation.spell.id}:${mode}:${form}`,
  );
}

export function spellTargetAllocationHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:target-allocation:${invocation.spell.id}`);
}

export function spellTargetAllocationHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
): BattleSpellTargetAllocationHole {
  const holeKey = `battle:spell:target-allocation:${invocation.spell.id}`;
  return {
    kind: "spellTargetAllocation",
    holeId: spellTargetAllocationHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} target allocation`,
    spell: invocation,
    allocationCount: repeatedDamageAllocationTargetCardinality(
      repeatedDamageAllocationAdmissionFactsForInvocation(invocation),
    ).maximumTargetCount,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellTargetListHoleId(
  invocation: SupportedSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:target-list:${invocation.spell.id}`);
}

export function spellTargetListHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: TargetListSpellInvocation,
): BattleSpellTargetListHole {
  const holeKey = `battle:spell:target-list:${invocation.spell.id}`;
  const choices = [...state.combatants.keys()].filter((id) =>
    spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
  );
  return {
    kind: "spellTargetList",
    holeId: spellTargetListHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} targets`,
    spell: invocation,
    minTargets: invocation.targeting.minTargets,
    maxTargets: targetListHoleMaxTargets(invocation, choices.length),
    requiresTableSpatialFact: true,
    choices,
  };
}

export function targetListTargetingHasFixedMaximum(
  targeting: TargetListSpellInvocation["targeting"],
): targeting is TargetListSpellInvocation["targeting"] & {
  readonly maxTargets: number;
} {
  return (
    "maxTargets" in targeting && targeting.maxTargets !== "allLegalTargets"
  );
}

function targetListTargetingRequiresCaster(
  targeting: TargetListSpellInvocation["targeting"],
): boolean {
  return targeting.kind === "selfAndChosenLegalTargets";
}

function targetListHoleMaxTargets(
  invocation: TargetListSpellInvocation,
  choiceCount: number,
): number {
  return targetListTargetingHasFixedMaximum(invocation.targeting)
    ? invocation.targeting.maxTargets
    : choiceCount;
}

export function commandOptionChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
): BattleCommandOptionChoiceHole {
  const holeKey = `battle:spell:command-option:${invocation.spell.id}`;
  return {
    kind: "commandOptionChoice",
    holeId: commandOptionChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} command option`,
    spell: invocation,
    choices: COMMAND_OPTIONS,
  };
}

export function commandOptionChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "command" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:command-option:${invocation.spell.id}`);
}

export function selfTransformationModeChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTransformationMode" }
  >,
): BattleSelfTransformationModeChoiceHole {
  const holeKey = `battle:spell:self-transformation-mode:${invocation.spell.id}`;
  return {
    kind: "selfTransformationModeChoice",
    holeId: selfTransformationModeChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} mode`,
    spell: invocation,
    choices: invocation.modeChoices,
  };
}

export function selfTransformationModeChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTransformationMode" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:self-transformation-mode:${invocation.spell.id}`);
}

export function spellAreaChoiceHole(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "fogCloudObscurement"
        | "magicalDarknessPointOrigin"
        | "antimagicFieldOngoingSpellSuppression"
        | "flamingSphere"
        | "spikeGrowthMovementHazard"
        | "moonbeam"
        | "webRestraintHazard";
    }
  >,
): BattleSpellAreaChoiceHole {
  const holeKey = `battle:spell:area-choice:${invocation.spell.id}`;
  return {
    kind: "spellAreaChoice",
    holeId: spellAreaChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} area`,
    spell: invocation,
    area: invocation.targeting,
  };
}

export function spellAreaChoiceHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "fogCloudObscurement"
        | "magicalDarknessPointOrigin"
        | "antimagicFieldOngoingSpellSuppression"
        | "flamingSphere"
        | "spikeGrowthMovementHazard"
        | "moonbeam"
        | "webRestraintHazard";
    }
  >,
): BattleHoleId {
  return holeId(`battle:spell:area-choice:${invocation.spell.id}`);
}

export function spellTeleportDestinationHole(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
): BattleTeleportDestinationHole {
  const holeKey = spellTeleportDestinationHoleKey(invocation, actorId);
  return {
    kind: "teleportDestination",
    holeId: spellTeleportDestinationHoleId(invocation, actorId),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `${invocation.spell.name} destination`,
    spell: invocation,
    actorId,
    maxDistanceFeet: invocation.maxDistanceFeet,
    requiresTableSpatialFact: true,
  };
}

export function spellTeleportDestinationHoleId(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
): BattleHoleId {
  return holeId(spellTeleportDestinationHoleKey(invocation, actorId));
}

function spellTeleportDestinationHoleKey(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
): string {
  return `battle:spell:teleport-destination:${actorId}:${invocation.spell.id}`;
}

export function spellTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
  facts: readonly BattleTargetSpatialFact[],
  options: SpellTargetLegalityOptions = {},
): boolean {
  if (
    !spellTargetHasNonSpatialPrerequisites(
      state,
      actorId,
      targetId,
      invocation,
      facts,
    )
  ) {
    return false;
  }
  const hasSpellTargetFact = facts.some((fact) =>
    spellTargetSpatialFactMatches(fact, actorId, targetId, invocation, options),
  );
  if (!hasSpellTargetFact) {
    return false;
  }
  return (
    !spellInvocationRequiresKnownWillingTarget(invocation) ||
    spellTargetIsKnownWilling(actorId, targetId, invocation, facts)
  );
}

export function spellTargetSpatialFactMatches(
  fact: BattleTargetSpatialFact,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
  options: SpellTargetLegalityOptions = {},
): boolean {
  if (
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack"
  ) {
    const forcePositionId = options.spiritualWeaponForcePositionId;
    return (
      fact.kind === "spiritualWeaponTargetWithinForceReach" &&
      fact.casterId === actorId &&
      fact.targetId === targetId &&
      fact.spellId === invocation.spell.id &&
      (forcePositionId === undefined ||
        fact.forcePositionId === forcePositionId) &&
      fact.reachFeet === invocation.forceReachFeet
    );
  }
  if (invocation.procedure === "featherFallMitigation") {
    return (
      fact.kind === "featherFallTargetFallingWithinRange" &&
      fact.casterId === actorId &&
      fact.targetId === targetId &&
      fact.spellId === invocation.spell.id &&
      fact.rangeFeet === invocation.rangeFeet
    );
  }
  if (fact.kind !== "spellTarget") {
    return false;
  }
  if (
    fact.casterId !== actorId ||
    fact.targetId !== targetId ||
    fact.spellId !== invocation.spell.id
  ) {
    return false;
  }
  return !(
    invocation.procedure === "directHitPointRestoration" &&
    invocation.targeting.kind === "pointOriginSphereTargetList"
  );
}

export function spellObjectTargetFact(
  facts: readonly Extract<
    BattleTargetSpatialFact,
    { readonly kind: "spellObjectTarget" }
  >[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: SingleCreatureOrObjectSpellAttackDamageInvocation,
): Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectTarget" }
> | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet,
    ) ?? null
  );
}

export function spellObjectTargetSightFact(
  facts: readonly ObjectTargetSightFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: SingleCreatureOrObjectSpellAttackDamageInvocation,
): ObjectTargetSightFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id,
    ) ?? null
  );
}

export function spellObjectIgnitionFact(
  facts: readonly ObjectIgnitionFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellAttackDamage" }
  >,
): ObjectIgnitionFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id,
    ) ?? null
  );
}

export function spellManufacturedMetalObjectTargetFact(
  facts: readonly ManufacturedMetalObjectTargetFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectContactDamage" }
  >,
): ManufacturedMetalObjectTargetFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id &&
        fact.rangeFeet === invocation.rangeFeet &&
        fact.casterCanSeeObject,
    ) ?? null
  );
}

export function spellObjectLightTargetFact(
  facts: readonly ObjectLightTargetFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "objectLight" }
  >,
): ObjectLightTargetFact | null {
  if (invocation.targeting.object.kind === "touchedObject") {
    return (
      facts.find(
        (fact): fact is TouchedObjectTargetFact =>
          fact.kind === "spellTouchedObjectTarget" &&
          fact.casterId === actorId &&
          fact.objectId === objectId &&
          fact.spellId === invocation.spell.id,
      ) ?? null
    );
  }
  const objectTargeting = invocation.targeting.object;
  return (
    facts.find(
      (fact): fact is LightCantripObjectTargetFact =>
        fact.kind === "spellObjectLightTarget" &&
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.spellId === invocation.spell.id &&
        objectSizeIsAtMost(fact.size, objectTargeting.maxSize) &&
        fact.wornOrCarried.kind !== "someoneElse",
    ) ?? null
  );
}

function objectSizeIsAtMost(
  objectSize: ObjectLightTargetSize,
  maxSize: ObjectLightTargetSize,
): boolean {
  return SIZES.indexOf(objectSize) <= SIZES.indexOf(maxSize);
}

export function spellTargetHasNonSpatialPrerequisites(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
  facts: readonly BattleTargetSpatialFact[] = [],
): boolean {
  const target = state.combatants.get(targetId);
  if (
    spellInvocationRequiresKnownWillingTarget(invocation) &&
    invocation.procedure !== "wardingBond" &&
    invocation.procedure !== "creatureTypeProtection" &&
    !spellTargetIsKnownWilling(actorId, targetId, invocation, facts)
  ) {
    return false;
  }
  if (
    invocation.procedure === "persistentArmorEffect" &&
    target !== undefined &&
    combatantWearingArmor(target)
  ) {
    return false;
  }
  if (
    invocation.procedure === "markedDamageRider" &&
    invocation.action === "transfer" &&
    targetId === invocation.activeEffect.targetCombatantId
  ) {
    return false;
  }
  if (invocation.procedure === "wardingBond" && targetId === actorId) {
    return false;
  }
  if (invocation.procedure === "makeStable") {
    return target !== undefined && combatantCanBeMadeStable(target);
  }
  const targetCreatureType =
    target === undefined ? null : battleCreatureType(target);
  if (
    invocation.procedure === "saveGatedCondition" &&
    invocation.targetCreatureTypes !== null &&
    (targetCreatureType === null ||
      !invocation.targetCreatureTypes.includes(targetCreatureType))
  ) {
    return false;
  }
  return target !== undefined;
}

function combatantCanBeMadeStable(combatant: BattleCreatureState): boolean {
  return (
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.deathSaves.dead
  );
}

export function validateSpellTargetAllocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  allocations: readonly BattleSpellTargetAllocation[],
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  if (allocations.length === 0) {
    return "Spell target allocation must include at least one target.";
  }
  const seen = new Set<CombatantId>();
  for (const allocation of allocations) {
    if (!Number.isInteger(allocation.count) || allocation.count <= 0) {
      return "Spell target allocation entries must assign a positive integer count.";
    }
    if (seen.has(allocation.targetId)) {
      return "Spell target allocation must combine repeated effects for the same target into one entry.";
    }
    seen.add(allocation.targetId);
    if (
      !spellTargetIsLegal(
        state,
        actorId,
        allocation.targetId,
        invocation,
        facts,
      )
    ) {
      return "Spell target allocation entries must be combatants within the selected spell's supported range.";
    }
  }
  const allocatedCount = allocations.reduce(
    (total, allocation) => total + allocation.count,
    0,
  );
  const invocationFacts = repeatedDamageAllocationInvocationFacts({
    invocation,
    targetCount: allocations.length,
    targetsAreValid: true,
  });
  const targetCardinality =
    repeatedDamageAllocationTargetCardinality(invocationFacts);
  if (!legalRepeatedDamageAllocationInvocationFacts(invocationFacts)) {
    return `${invocation.spell.name} target allocation must choose between ${targetCardinality.minimumTargetCount} and ${targetCardinality.maximumTargetCount} target entries.`;
  }
  if (!repeatedDamageAllocationInvocationCanAffectTargets(invocationFacts)) {
    return "Spell target allocation entries must be combatants within the selected spell's supported range.";
  }
  if (allocatedCount !== targetCardinality.maximumTargetCount) {
    return `${invocation.spell.name} target allocation must assign exactly ${targetCardinality.maximumTargetCount} repeated effects.`;
  }
  return null;
}

export function validateSpellTargetList(
  state: BattleState,
  actorId: CombatantId,
  invocation: TargetListSpellInvocation,
  targetIds: readonly CombatantId[],
  facts: readonly BattleSpellTargetListSpatialFact[],
): string | null {
  if (targetIds.length < invocation.targeting.minTargets) {
    return `${invocation.spell.name} must target at least ${invocation.targeting.minTargets} creature.`;
  }
  if (
    targetListTargetingHasFixedMaximum(invocation.targeting) &&
    targetIds.length > invocation.targeting.maxTargets
  ) {
    return `${invocation.spell.name} can target at most ${invocation.targeting.maxTargets} creatures.`;
  }
  if (
    targetListTargetingRequiresCaster(invocation.targeting) &&
    !targetIds.includes(actorId)
  ) {
    return `${invocation.spell.name} must include the caster among its targets.`;
  }
  const seen = new Set<CombatantId>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) {
      return "Spell target list must not repeat a target.";
    }
    seen.add(targetId);
    if (
      invocation.targeting.kind !== "pointOriginSphereTargetList" &&
      !spellTargetIsLegal(state, actorId, targetId, invocation, facts)
    ) {
      return "Spell targets must be combatants within the selected spell's supported range.";
    }
    if (
      invocation.procedure === "jumpMovementReplacement" &&
      !facts.some(
        (fact) =>
          fact.kind === "spellTargetKnownWilling" &&
          fact.casterId === actorId &&
          fact.targetId === targetId &&
          fact.spellId === invocation.spell.id,
      )
    ) {
      return "Jump targets must be known willing combatants.";
    }
  }
  if (
    invocation.procedure === "directHitPointRestoration" &&
    invocation.targeting.kind === "pointOriginSphereTargetList"
  ) {
    return validatePointOriginSphereSpellTargetList(
      state,
      actorId,
      invocation,
      targetIds,
      facts,
    );
  }
  return null;
}

export function validatePointOriginSphereSpellTargetList(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
  targetIds: readonly CombatantId[],
  facts: readonly BattleSpellTargetListSpatialFact[],
): string | null {
  if (invocation.targeting.kind !== "pointOriginSphereTargetList") {
    return "Area healing targets must use a point-origin Sphere target list.";
  }
  const expectedRadiusFeet = invocation.targeting.area.radiusFeet;
  const matchingAreaFacts = facts.filter(
    (fact) =>
      fact.kind === "spellTargetsInPointOriginSphere" &&
      fact.casterId === actorId &&
      fact.spellId === invocation.spell.id &&
      fact.areaId.length > 0 &&
      fact.radiusFeet === expectedRadiusFeet &&
      sameCombatantIdSet(fact.targetIds, targetIds),
  );
  if (matchingAreaFacts.length !== 1) {
    return "Area healing targets must share one selected point-origin Sphere.";
  }
  for (const targetId of targetIds) {
    if (
      !spellTargetHasNonSpatialPrerequisites(
        state,
        actorId,
        targetId,
        invocation,
      )
    ) {
      return "Spell targets must be combatants within the selected spell's supported range.";
    }
  }
  return null;
}

export function sameCombatantIdSet(
  left: readonly CombatantId[],
  right: readonly CombatantId[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  if (leftIds.size !== left.length || rightIds.size !== right.length) {
    return false;
  }
  return left.every((id) => rightIds.has(id));
}

export function spellInvocationRequiresKnownWillingTarget(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    invocation.procedure === "persistentArmorEffect" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure ===
      "conditionImmunityAndTurnStartTemporaryHitPoints" ||
    invocation.procedure === "wardingBond" ||
    invocation.procedure === "dragonsBreathInitial" ||
    (invocation.procedure === "scalarBuff" &&
      invocation.targeting.kind === "targetList" &&
      invocation.targeting.requiredTargetDisposition === "willing") ||
    (registeredSpellProcedureProfile(
      invocation.procedure,
    )?.knownWillingTargetSpellIds.includes(invocation.spell.id) ??
      false)
  );
}

export function spellTargetIsKnownWilling(
  actorId: CombatantId,
  targetId: CombatantId,
  invocation?: SupportedSpellInvocation,
  facts: readonly BattleTargetSpatialFact[] = [],
): boolean {
  return (
    actorId === targetId ||
    (invocation !== undefined &&
      facts.some(
        (fact) =>
          fact.kind === "spellTargetKnownWilling" &&
          fact.casterId === actorId &&
          fact.targetId === targetId &&
          fact.spellId === invocation.spell.id,
      ))
  );
}
