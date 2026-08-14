// Spell target holes and target legality validation extracted from spells-holes-fills.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-range-increase
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { SIZES } from "@dnd/shared/types";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  type BattleObjectContactTargetsHole,
  type BattleExecutableSpellInvocation,
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
  type TargetListSpellInvocation,
} from "../battle-state-execution.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  ATTACK_TARGET_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import { COMMAND_OPTIONS } from "./domain-constants.ts";
import {
  distantSpellRangeModifierForApplications,
  type SpellMetamagicApplicationFact,
} from "./metamagic-support.ts";
import {
  legalRepeatedDamageAllocationInvocationFacts,
  repeatedDamageAllocationAdmissionFactsForInvocation,
  repeatedDamageAllocationInvocationCanAffectTargets,
  repeatedDamageAllocationInvocationFacts,
  repeatedDamageAllocationTargetCardinality,
} from "./spell-procedure-profiles/repeated-damage-allocation-facts.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";
import {
  type BattleObjectId,
  type BattleProcedureExecutionRef,
  type BattleTablePositionId,
  type CombatantId,
} from "../identity.ts";
import { combatantWearingArmor } from "./creature-state-leaves.ts";
import {
  singleTargetSpellRangeFeet,
  spellAttackSequencePartName,
} from "./spells-execution-facts.ts";
import {
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";

type RuntimeSpellProcedure = RuntimeSpellProcedureExecution;

type SingleCreatureOrObjectSpellAttackDamageInvocation = Extract<
  RuntimeSpellProcedure,
  {
    readonly procedure:
      | "heldLightHurl"
      | "spellAttackSequence"
      | "spellAttackDamage";
  }
>;
type SpellAttackSequenceInvocation = Extract<
  RuntimeSpellProcedure,
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
      RuntimeSpellProcedure,
      {
        readonly procedure: "objectContactDamage";
      }
    >
  | Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure: "objectLight";
      }
    >;

type MechanicalTargetListSpellInvocation =
  import("../battle-state-execution.ts").TargetListSpellInvocationOf<RuntimeSpellProcedure>;
type MagicWeaponEnhancementSpellExecution = Extract<
  RuntimeSpellProcedure,
  { readonly procedure: "magicWeaponEnhancement" }
>;

type SpellTargetLegalityOptions = {
  readonly spiritualWeaponForcePositionId?: BattleTablePositionId;
};
export type ObjectLightTargetFact = Extract<
  BattleTargetSpatialFact,
  {
    readonly kind:
      | "spellObjectLightTarget"
      | "spellDistantObjectLightTarget"
      | "spellTouchedObjectTarget"
      | "spellDistantTouchedObjectTarget";
  }
>;
type LightCantripObjectTargetFact = Extract<
  ObjectLightTargetFact,
  { readonly kind: "spellObjectLightTarget" | "spellDistantObjectLightTarget" }
>;
type TouchedObjectTargetFact = Extract<
  ObjectLightTargetFact,
  {
    readonly kind:
      | "spellTouchedObjectTarget"
      | "spellDistantTouchedObjectTarget";
  }
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
  invocation: BattleExecutableSpellInvocation,
): BattleTargetChoiceHole {
  const choices = [...state.combatants.keys()].filter(
    (id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation) &&
      spiritualWeaponRepeatTargetingAllows(invocation, id),
  );
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: `Spell target`,
    procedureRef: invocation.sourceProcedureRef,
    requiresTableSpatialFact: true,
    ...(invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "featherFallMitigation"
      ? {}
      : ordinarySpellTargetSpatialFactRequest(actorId, invocation)),
    ...(spellTargetRequiresAttackRollRelationshipFact(invocation) &&
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: actorId,
          },
        }
      : {}),
    choices,
  };
}

export function spellTargetRequiresAttackRollRelationshipFact(
  invocation: RuntimeSpellProcedure,
): boolean {
  return (
    invocation.procedure === "spellAttackDamage" ||
    invocation.procedure === "spellAttackSequence" ||
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "weaponAttackOverride" ||
    invocation.procedure === "spellHostedWeaponAttack" ||
    invocation.procedure === "attackBurstSaveDamage" ||
    invocation.procedure === "chainedSpellAttackDamage"
  );
}

function spiritualWeaponRepeatTargetingAllows(
  invocation: RuntimeSpellProcedure,
  targetId: CombatantId,
): boolean {
  return (
    invocation.procedure !== "spiritualWeaponRepeatAttack" ||
    invocation.activeEffect.repeatTargeting.kind === "unrestricted" ||
    invocation.activeEffect.repeatTargeting.combatantId === targetId
  );
}

export function spiritualWeaponForcePositionHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure:
          | "spiritualWeaponAttackProxy"
          | "spiritualWeaponRepeatAttack";
      }
    >
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
  const key = `battle:spiritual-weapon-force-position:${invocation.procedure}:${mode}`;
  return {
    kind: "spiritualWeaponForcePosition",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: mode === "cast" ? `Spell force position` : `Spell force reposition`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    mode,
    maxDistanceFeet,
    requiresTableSpatialFact: true,
  };
}

export function spiritualWeaponForcePositionInvalidReason(
  forcePosition: BattleSpiritualWeaponForcePosition,
  invocation: Extract<
    RuntimeSpellProcedure,
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
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "spellAttackSequence" }
    >
  >,
  partIndex: number,
): BattleTargetChoiceHole {
  const holeKey = spellAttackSequencePartTargetHoleKey(invocation, partIndex);
  const partName = spellAttackSequencePartName();
  return {
    kind: "targetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell ${partName} ${partIndex + 1} target`,
    procedureRef: invocation.sourceProcedureRef,
    requiresTableSpatialFact: true,
    spellTargetSpatialFactRequest: {
      casterId: actorId,
      sourceProcedureRef: invocation.sourceProcedureRef,
      rangeFeet: invocation.rangeFeet,
      visibility: "notSpecifiedByProcedure",
    },
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: actorId,
          },
        }
      : {}),
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellAttackSequencePartTargetHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): BattleHoleId {
  return holeId(spellAttackSequencePartTargetHoleKey(invocation, partIndex));
}

function spellAttackSequencePartTargetHoleKey(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "spellAttackSequence" }
  >,
  partIndex: number,
): string {
  return `battle:spell:attack-sequence-part-target:${invocation.procedure}:${partIndex}`;
}

export function spellObjectTargetHole(
  invocation: BattleExecutableSpellInvocation<SingleObjectSpellInvocation>,
): BattleObjectTargetChoiceHole {
  const holeKey = `battle:spell:object-target:${invocation.procedure}`;
  return {
    kind: "objectTargetChoice",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell object target`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    requiresTableSpatialFact: true,
  };
}

export function spellAttackSequencePartObjectTargetHole(
  invocation: BattleExecutableSpellInvocation<SpellAttackSequenceObjectTargetHoleInvocation>,
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
    label: `Spell ${partName} ${partIndex + 1} object target`,
    sourceProcedureRef: invocation.sourceProcedureRef,
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
  return `battle:spell:attack-sequence-part-object-target:${invocation.procedure}:${partIndex}`;
}

export function spellObjectTargetHoleId(
  invocation: SingleObjectSpellInvocation,
): BattleHoleId {
  return holeId(`battle:spell:object-target:${invocation.procedure}`);
}

export function magicWeaponTargetItemHole(
  invocation: BattleExecutableSpellInvocation<MagicWeaponEnhancementSpellExecution>,
): BattleMagicWeaponTargetItemHole {
  const holeKey = `battle:spell:magic-weapon-target-item:${invocation.procedure}`;
  return {
    kind: "magicWeaponTargetItem",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell target item`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    requiresTableItemFact: true,
  };
}

export function magicWeaponTargetItemHoleId(
  invocation: MagicWeaponEnhancementSpellExecution,
): BattleHoleId {
  return holeId(
    `battle:spell:magic-weapon-target-item:${invocation.procedure}`,
  );
}

export function spellObjectContactTargetsHole(input: {
  readonly state: BattleState;
  readonly sourceCombatantId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure: "objectContactDamage" | "objectContactDamageRepeat";
      }
    >
  >;
  readonly requiresObjectWithinRange: boolean;
}): BattleObjectContactTargetsHole {
  const holeIdForSelection = spellObjectContactTargetsHoleId({
    procedure: input.invocation.procedure,
    objectId: input.objectId,
  });
  return {
    kind: "objectContactTargets",
    holeId: holeIdForSelection,
    holeInstanceKey: holeInstanceKey(holeIdForSelection),
    label: `Spell contact creatures`,
    objectContact: {
      sourceCombatantId: input.sourceCombatantId,
      sourceProcedureRef: objectContactDamageSourceProcedureRef(
        input.invocation,
      ),
      objectId: input.objectId,
      rangeFeet:
        input.invocation.procedure === "objectContactDamageRepeat"
          ? input.invocation.activeEffect.rangeFeet
          : input.invocation.rangeFeet,
      requiresObjectWithinRange: input.requiresObjectWithinRange,
    },
    choices: [...input.state.combatants.keys()].filter(
      (targetId) =>
        magicalEffectTargetsInterdictionMessage({
          state: input.state,
          source: SPELL_MAGICAL_EFFECT_SOURCE,
          targetIds: [targetId],
        }) === null,
    ),
    requiresTableSpatialFact: true,
  };
}

export function objectContactDamageSourceProcedureRef(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure: "objectContactDamage" | "objectContactDamageRepeat";
      }
    >
  >,
): BattleProcedureExecutionRef {
  return invocation.procedure === "objectContactDamageRepeat"
    ? invocation.activeEffect.sourceProcedureRef
    : invocation.sourceProcedureRef;
}

export function spellObjectContactTargetsHoleId(input: {
  readonly procedure: "objectContactDamage" | "objectContactDamageRepeat";
  readonly objectId: BattleObjectId;
}): BattleHoleId {
  return holeId(
    `battle:spell:object-contact-targets:${input.procedure}:${input.objectId}`,
  );
}

export function spellDancingLightsPlacementHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure:
          | "dancingLightsSeparateCast"
          | "dancingLightsCombinedCast"
          | "dancingLightsReposition";
      }
    >
  >,
  form: BattleDancingLightsPlacementHole["form"],
  activeLightIds: readonly BattleDancingLightsPlacementHole["activeLightIds"][number][],
): BattleDancingLightsPlacementHole {
  const mode =
    invocation.procedure === "dancingLightsReposition" ? "reposition" : "cast";
  const holeKey = `battle:spell:dancing-lights-placement:${invocation.procedure}:${mode}:${form}`;
  return {
    kind: "dancingLightsPlacement",
    holeId: holeId(holeKey),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell placement`,
    sourceProcedureRef: invocation.sourceProcedureRef,
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
    RuntimeSpellProcedure,
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
    `battle:spell:dancing-lights-placement:${invocation.procedure}:${mode}:${form}`,
  );
}

export function spellTargetAllocationHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
): BattleHoleId {
  return holeId(`battle:spell:target-allocation:${invocation.procedure}`);
}

export function spellTargetAllocationHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "repeatedDamageAllocation" }
    >
  >,
): BattleSpellTargetAllocationHole {
  const holeKey = `battle:spell:target-allocation:${invocation.procedure}`;
  return {
    kind: "spellTargetAllocation",
    holeId: spellTargetAllocationHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell target allocation`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    allocationCount: repeatedDamageAllocationTargetCardinality(
      repeatedDamageAllocationAdmissionFactsForInvocation(invocation),
    ).maximumTargetCount,
    requiresTableSpatialFact: true,
    spellTargetSpatialFactRequest: {
      casterId: actorId,
      sourceProcedureRef: invocation.sourceProcedureRef,
      rangeFeet: invocation.rangeFeet,
      visibility: "requiresSight",
    },
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
    ),
  };
}

export function spellTargetListHoleId(
  invocation: RuntimeSpellProcedure,
): BattleHoleId {
  return holeId(`battle:spell:target-list:${invocation.procedure}`);
}

export function spellTargetListHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MechanicalTargetListSpellInvocation>,
): BattleSpellTargetListHole {
  const holeKey = `battle:spell:target-list:${invocation.procedure}`;
  const choices = [...state.combatants.keys()].filter((id) =>
    spellTargetHasNonSpatialPrerequisites(state, actorId, id, invocation),
  );
  return {
    kind: "spellTargetList",
    holeId: spellTargetListHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell targets`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    minTargets: invocation.targeting.minTargets,
    maxTargets: targetListHoleMaxTargets(invocation, choices.length),
    spatialTargeting:
      invocation.targeting.kind === "pointOriginSphereTargetList"
        ? {
            kind: "pointOriginSphere",
            radiusFeet: invocation.targeting.area.radiusFeet,
          }
        : { kind: "individualTargets" },
    requiresTableSpatialFact: true,
    ...(invocation.targeting.kind === "pointOriginSphereTargetList"
      ? {}
      : ordinarySpellTargetSpatialFactRequest(actorId, invocation)),
    ...(spellInvocationRequiresKnownWillingTarget(invocation)
      ? { requiresKnownWillingTargets: true as const }
      : {}),
    ...("saveRollModeRule" in invocation &&
    invocation.saveRollModeRule?.kind === "hostileTarget"
      ? {
          relationshipFactRequest: {
            kind: "spellTargetIsHostileToCaster" as const,
            casterId: actorId,
            sourceProcedureRef: invocation.sourceProcedureRef,
          },
        }
      : {}),
    choices,
  };
}

function ordinarySpellTargetSpatialFactRequest(
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): Pick<BattleSpellTargetListHole, "spellTargetSpatialFactRequest"> {
  const rangeFeet =
    "rangeFeet" in invocation
      ? invocation.rangeFeet
      : singleTargetSpellRangeFeet(invocation.spellRuleFacts.range);
  return rangeFeet === null
    ? {}
    : {
        spellTargetSpatialFactRequest: {
          casterId: actorId,
          sourceProcedureRef: invocation.sourceProcedureRef,
          rangeFeet,
          visibility: "notSpecifiedByProcedure" as const,
        },
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
  invocation: MechanicalTargetListSpellInvocation,
  choiceCount: number,
): number {
  return targetListTargetingHasFixedMaximum(invocation.targeting)
    ? invocation.targeting.maxTargets
    : choiceCount;
}

export function commandOptionChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "command" }>
  >,
): BattleCommandOptionChoiceHole {
  const holeKey = `battle:spell:command-option:${invocation.procedure}`;
  return {
    kind: "commandOptionChoice",
    holeId: commandOptionChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell command option`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices: COMMAND_OPTIONS,
  };
}

export function commandOptionChoiceHoleId(
  invocation: Extract<RuntimeSpellProcedure, { readonly procedure: "command" }>,
): BattleHoleId {
  return holeId(`battle:spell:command-option:${invocation.procedure}`);
}

export function selfTransformationModeChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "selfTransformationMode" }
    >
  >,
): BattleSelfTransformationModeChoiceHole {
  const holeKey = `battle:spell:self-transformation-mode:${invocation.procedure}`;
  return {
    kind: "selfTransformationModeChoice",
    holeId: selfTransformationModeChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell mode`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    choices: invocation.modeChoices,
  };
}

export function selfTransformationModeChoiceHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "selfTransformationMode" }
  >,
): BattleHoleId {
  return holeId(
    `battle:spell:self-transformation-mode:${invocation.procedure}`,
  );
}

export function spellAreaChoiceHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      {
        readonly procedure:
          | "fogCloudObscurement"
          | "magicalDarknessPointOrigin"
          | "antimagicFieldOngoingSpellSuppression"
          | "flamingSphere"
          | "spikeGrowthMovementHazard"
          | "moonbeam"
          | "sleetStormAreaHazard"
          | "insectPlagueAreaHazard"
          | "cloudkillAreaHazard"
          | "webRestraintHazard";
      }
    >
  >,
): BattleSpellAreaChoiceHole {
  const holeKey = `battle:spell:area-choice:${invocation.procedure}`;
  return {
    kind: "spellAreaChoice",
    holeId: spellAreaChoiceHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell area`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    area: invocation.targeting,
  };
}

export function spellAreaChoiceHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    {
      readonly procedure:
        | "fogCloudObscurement"
        | "magicalDarknessPointOrigin"
        | "antimagicFieldOngoingSpellSuppression"
        | "flamingSphere"
        | "spikeGrowthMovementHazard"
        | "moonbeam"
        | "sleetStormAreaHazard"
        | "insectPlagueAreaHazard"
        | "cloudkillAreaHazard"
        | "webRestraintHazard";
    }
  >,
): BattleHoleId {
  return holeId(`battle:spell:area-choice:${invocation.procedure}`);
}

export function spellTeleportDestinationHole(
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "selfTeleport" }>
  >,
  actorId: CombatantId,
): BattleTeleportDestinationHole {
  const holeKey = spellTeleportDestinationHoleKey(invocation, actorId);
  return {
    kind: "teleportDestination",
    holeId: spellTeleportDestinationHoleId(invocation, actorId),
    holeInstanceKey: holeInstanceKey(holeKey),
    label: `Spell destination`,
    sourceProcedureRef: invocation.sourceProcedureRef,
    actorId,
    maxDistanceFeet: invocation.maxDistanceFeet,
    requiresTableSpatialFact: true,
  };
}

export function spellTeleportDestinationHoleId(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
): BattleHoleId {
  return holeId(spellTeleportDestinationHoleKey(invocation, actorId));
}

function spellTeleportDestinationHoleKey(
  invocation: Extract<
    RuntimeSpellProcedure,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
): string {
  return `battle:spell:teleport-destination:${actorId}:${invocation.procedure}`;
}

export function spellTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
  facts: readonly BattleTargetSpatialFact[],
  options: SpellTargetLegalityOptions = {},
): boolean {
  return (
    spellTargetSatisfiesNonDispositionRequirements(
      state,
      actorId,
      targetId,
      invocation,
      facts,
      options,
    ) &&
    (!spellInvocationRequiresKnownWillingTarget(invocation) ||
      spellTargetIsKnownWilling(actorId, targetId, invocation, facts))
  );
}

function spellTargetSatisfiesNonDispositionRequirements(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
  facts: readonly BattleTargetSpatialFact[],
  options: SpellTargetLegalityOptions = {},
): boolean {
  if (
    !spellTargetHasNonSpatialPrerequisites(state, actorId, targetId, invocation)
  ) {
    return false;
  }
  const hasSpellTargetFact = facts.some((fact) =>
    spellTargetSpatialFactMatches(fact, actorId, targetId, invocation, options),
  );
  if (!hasSpellTargetFact) {
    return false;
  }
  return true;
}

export function spellTargetSpatialFactMatches(
  fact: BattleTargetSpatialFact,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
  options: SpellTargetLegalityOptions = {},
): boolean {
  const sourceProcedureRef = invocation.sourceProcedureRef;
  if (
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack"
  ) {
    const forcePositionId = options.spiritualWeaponForcePositionId;
    return (
      fact.kind === "spiritualWeaponTargetWithinForceReach" &&
      fact.casterId === actorId &&
      fact.targetId === targetId &&
      fact.sourceProcedureRef === sourceProcedureRef &&
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
      fact.sourceProcedureRef === sourceProcedureRef &&
      fact.rangeFeet === invocation.rangeFeet
    );
  }
  if (fact.kind !== "spellTarget") {
    return false;
  }
  if (
    fact.casterId !== actorId ||
    fact.targetId !== targetId ||
    fact.sourceProcedureRef !== sourceProcedureRef
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
  invocation: BattleExecutableSpellInvocation<SingleCreatureOrObjectSpellAttackDamageInvocation>,
): Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectTarget" }
> | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
        fact.rangeFeet === invocation.rangeFeet,
    ) ?? null
  );
}

export function spellObjectTargetSightFact(
  facts: readonly ObjectTargetSightFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<SingleCreatureOrObjectSpellAttackDamageInvocation>,
): ObjectTargetSightFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef,
    ) ?? null
  );
}

export function spellObjectIgnitionFact(
  facts: readonly ObjectIgnitionFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "spellAttackDamage" }>
  >,
): ObjectIgnitionFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef,
    ) ?? null
  );
}

export function spellManufacturedMetalObjectTargetFact(
  facts: readonly ManufacturedMetalObjectTargetFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "objectContactDamage" }
    >
  >,
): ManufacturedMetalObjectTargetFact | null {
  return (
    facts.find(
      (fact) =>
        fact.casterId === actorId &&
        fact.objectId === objectId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
        fact.rangeFeet === invocation.rangeFeet &&
        fact.casterCanSeeObject,
    ) ?? null
  );
}

export function spellObjectLightTargetFact(
  facts: readonly ObjectLightTargetFact[],
  actorId: CombatantId,
  objectId: BattleObjectId,
  invocation: BattleExecutableSpellInvocation<
    Extract<RuntimeSpellProcedure, { readonly procedure: "objectLight" }>
  >,
  applications?: readonly SpellMetamagicApplicationFact[],
): ObjectLightTargetFact | null {
  const distantRange = distantSpellRangeModifierForApplications(applications);
  if (invocation.targeting.object.kind === "touchedObject") {
    return (
      facts.find(
        (fact): fact is TouchedObjectTargetFact =>
          fact.casterId === actorId &&
          fact.objectId === objectId &&
          fact.sourceProcedureRef === invocation.sourceProcedureRef &&
          (distantRange === null
            ? fact.kind === "spellTouchedObjectTarget"
            : fact.kind === "spellDistantTouchedObjectTarget" &&
              fact.rangeFeet === distantRange.rangeFeet),
      ) ?? null
    );
  }
  const objectTargeting = invocation.targeting.object;
  const fact =
    facts.find(
      (candidate): candidate is LightCantripObjectTargetFact =>
        candidate.casterId === actorId &&
        candidate.objectId === objectId &&
        candidate.sourceProcedureRef === invocation.sourceProcedureRef &&
        (distantRange === null
          ? candidate.kind === "spellObjectLightTarget"
          : candidate.kind === "spellDistantObjectLightTarget" &&
            candidate.rangeFeet === distantRange.rangeFeet),
    ) ?? null;
  return fact !== null &&
    objectSizeIsAtMost(fact.size, objectTargeting.maxSize) &&
    fact.wornOrCarried.kind !== "someoneElse"
    ? fact
    : null;
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
  invocation: RuntimeSpellProcedure,
): boolean {
  const target = state.combatants.get(targetId);
  if (
    magicalEffectTargetsInterdictionMessage({
      state,
      source: SPELL_MAGICAL_EFFECT_SOURCE,
      targetIds: [targetId],
    }) !== null
  ) {
    return false;
  }
  if (
    invocation.procedure === "persistentArmorEffect" &&
    target !== undefined &&
    combatantWearingArmor(state, target)
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
  invocation: BattleExecutableSpellInvocation<
    Extract<
      RuntimeSpellProcedure,
      { readonly procedure: "repeatedDamageAllocation" }
    >
  >,
  allocations: readonly BattleSpellTargetAllocation[],
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  /* v8 ignore start -- Malformed raw allocation fill: the repeated-damage allocation choice cannot be submitted without at least one selected target. */
  if (allocations.length === 0) {
    return "Spell target allocation must include at least one target.";
  }
  /* v8 ignore stop */
  const seen = new Set<CombatantId>();
  for (const allocation of allocations) {
    /* v8 ignore start -- Malformed raw allocation entry: allocation choices author repeated-effect counts as positive integers; this rejects forged numeric values. */
    if (!Number.isInteger(allocation.count) || allocation.count <= 0) {
      return "Spell target allocation entries must assign a positive integer count.";
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed duplicate allocation: target selection combines all repeated effects for one combatant into one entry. */
    if (seen.has(allocation.targetId)) {
      return "Spell target allocation must combine repeated effects for the same target into one entry.";
    }
    /* v8 ignore stop */
    seen.add(allocation.targetId);
    /* v8 ignore start -- Malformed allocation target: discovery admits only battle members satisfying the selected spell's spatial targeting facts. */
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
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed allocation cardinality: discovery constructs invocation facts from an admitted target count within the rule-core bounds. */
  if (!legalRepeatedDamageAllocationInvocationFacts(invocationFacts)) {
    return `Spell target allocation must choose between ${targetCardinality.minimumTargetCount} and ${targetCardinality.maximumTargetCount} target entries.`;
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Contradictory allocation facts: every target was individually admitted above, so the rule-core projection cannot report an unaffectable set. */
  if (!repeatedDamageAllocationInvocationCanAffectTargets(invocationFacts)) {
    return "Spell target allocation entries must be combatants within the selected spell's supported range.";
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed allocation total: the discovered hole fixes the exact number of repeated effects that must be distributed. */
  if (allocatedCount !== targetCardinality.maximumTargetCount) {
    return `Spell target allocation must assign exactly ${targetCardinality.maximumTargetCount} repeated effects.`;
  }
  /* v8 ignore stop */
  return null;
}

export function validateSpellTargetList(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<MechanicalTargetListSpellInvocation>,
  targetIds: readonly CombatantId[],
  facts: readonly BattleSpellTargetListSpatialFact[],
): string | null {
  if (targetIds.length < invocation.targeting.minTargets) {
    return `Spell must target at least ${invocation.targeting.minTargets} creature.`;
  }
  if (
    targetListTargetingHasFixedMaximum(invocation.targeting) &&
    targetIds.length > invocation.targeting.maxTargets
  ) {
    return `Spell can target at most ${invocation.targeting.maxTargets} creatures.`;
  }
  if (
    targetListTargetingRequiresCaster(invocation.targeting) &&
    !targetIds.includes(actorId)
  ) {
    return `Spell must include the caster among its targets.`;
  }
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state,
    source: SPELL_MAGICAL_EFFECT_SOURCE,
    targetIds,
  });
  if (antimagicInterdiction !== null) {
    return antimagicInterdiction;
  }
  const seen = new Set<CombatantId>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) {
      return "Spell target list must not repeat a target.";
    }
    seen.add(targetId);
    if (
      invocation.targeting.kind !== "pointOriginSphereTargetList" &&
      !spellTargetSatisfiesNonDispositionRequirements(
        state,
        actorId,
        targetId,
        invocation,
        facts,
      )
    ) {
      return "Spell targets must be combatants within the selected spell's supported range.";
    }
    if (
      spellInvocationRequiresKnownWillingTarget(invocation) &&
      !spellTargetIsKnownWilling(actorId, targetId, invocation, facts)
    ) {
      return "Spell targets must be known willing combatants.";
    }
  }
  if (
    invocation.procedure === "directHitPointRestoration" &&
    invocation.targeting.kind === "pointOriginSphereTargetList"
  ) {
    const expectedRadiusFeet = invocation.targeting.area.radiusFeet;
    const matchingAreaFacts = facts.filter(
      (fact) =>
        fact.kind === "spellTargetsInPointOriginSphere" &&
        fact.casterId === actorId &&
        fact.sourceProcedureRef === invocation.sourceProcedureRef &&
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
  invocation: RuntimeSpellProcedure,
): boolean {
  return (
    invocation.procedure === "persistentArmorEffect" ||
    invocation.procedure === "creatureTypeProtection" ||
    invocation.procedure ===
      "conditionImmunityAndTurnStartTemporaryHitPoints" ||
    invocation.procedure === "wardingBond" ||
    invocation.procedure === "dragonsBreathInitial" ||
    invocationHasWillingTargetList(invocation)
  );
}

function invocationHasWillingTargetList(
  invocation: RuntimeSpellProcedure,
): boolean {
  return (
    "targeting" in invocation &&
    invocation.targeting.kind === "targetList" &&
    "requiredTargetDisposition" in invocation.targeting &&
    invocation.targeting.requiredTargetDisposition === "willing"
  );
}

export function spellTargetIsKnownWilling(
  actorId: CombatantId,
  targetId: CombatantId,
  invocation?: BattleExecutableSpellInvocation,
  facts: readonly BattleTargetSpatialFact[] = [],
): boolean {
  const sourceProcedureRef = invocation?.sourceProcedureRef;
  return (
    actorId === targetId ||
    (invocation !== undefined &&
      facts.some(
        (fact) =>
          fact.kind === "spellTargetKnownWilling" &&
          fact.casterId === actorId &&
          fact.targetId === targetId &&
          fact.sourceProcedureRef === sourceProcedureRef,
      ))
  );
}
