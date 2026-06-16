// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// Spell invocation predicates and lightweight projections extracted from
// ../battle-reducer.ts. Keeps narrowing logic close to the spell invocation
// vocabulary while the reducer facade continues to own the public type surface.

import type {
  BattleCreatureState,
  DamageSpellSource,
  PreparedDamageSpellSource,
  ScalarBuffSpellTargeting,
  SupportedSpellInvocation,
  TargetListSpellInvocation,
} from "../battle-reducer.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state.ts";
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import type { SpellProcedureAnyTargetListInvocationClassifier } from "./spell-procedure-profiles/profile.ts";
import { registeredSpellProcedureProfile } from "./spell-procedure-profiles/registry.ts";
import {
  DRUID_BEAST_SPELLS_CLASS_LEVEL,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  type BattleDruidWildShapeKnownFormSupportProfile,
} from "../unit-feature-support.ts";

const byKind = Match.discriminator("kind");

type SpellComponents = SpellRecord["mechanics"]["components"];
type StructuredMaterialComponent = Exclude<
  SpellComponents["m"],
  boolean | string
>;

export function isPreparedDamageSpellSource(
  source: DamageSpellSource,
): source is PreparedDamageSpellSource {
  return source.access.tag === "prepared";
}

export function damageSpellSource(
  source: DamageSpellSource,
): DamageSpellSource {
  return isPreparedDamageSpellSource(source)
    ? { access: source.access, resource: source.resource }
    : { access: source.access, resource: source.resource };
}

export function isScalarBuffTargetListInvocation(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "scalarBuff" }
> & {
  readonly targeting: Extract<
    ScalarBuffSpellTargeting,
    { readonly kind: "targetList" }
  >;
} {
  return invocation.targeting.kind === "targetList";
}

export function isTargetListSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is TargetListSpellInvocation {
  const profile = registeredSpellProcedureProfile(invocation.procedure);
  if (profile === null) {
    return false;
  }

  return targetListInvocationClassifierMatches(
    profile.targetListInvocation,
    invocation,
  );
}

function targetListInvocationClassifierMatches(
  classifier: SpellProcedureAnyTargetListInvocationClassifier,
  invocation: SupportedSpellInvocation,
): invocation is TargetListSpellInvocation {
  if (classifier.kind === "none") {
    return false;
  }
  if (classifier.kind === "always") {
    return true;
  }
  return (
    "targeting" in invocation &&
    invocation.targeting.kind === classifier.targetingKind
  );
}

export function activeOngoingFeaturesPreventSpellInvocation(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  if (!spellInvocationIsSpellcasting(invocation)) {
    return false;
  }
  const activeWildShape = activeDruidWildShapeEffect(actor);
  return (
    (activeWildShape !== null &&
      !druidBeastSpellsAllowsInvocation(actor, invocation)) ||
    activeOngoingNonWildShapeFeaturesPreventSpellcasting(actor)
  );
}

function activeOngoingNonWildShapeFeaturesPreventSpellcasting(
  actor: BattleCreatureState,
): boolean {
  return [...activeOngoingFeatureOccurrencesForCombatant(actor)].some(
    ([key]) =>
      ongoingFeatureProfileForSourceKey(
        actor,
        key,
      )?.actionRestrictions.includes("spellcasting") === true,
  );
}

function druidBeastSpellsAllowsInvocation(
  actor: BattleCreatureState,
  invocation: SupportedSpellInvocation,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  const profile = activeDruidWildShapeSupportProfile(actor, actor.origin);
  return (
    profile !== null &&
    Number(profile.classLevel) >= DRUID_BEAST_SPELLS_CLASS_LEVEL &&
    !spellDefinitionHasPricedOrConsumedMaterialComponent(invocation.spell)
  );
}

function activeDruidWildShapeSupportProfile(
  actor: BattleCreatureState,
  origin: Extract<BattleCreatureState["origin"], { readonly kind: "character" }>,
): BattleDruidWildShapeKnownFormSupportProfile | null {
  const activeWildShape = activeDruidWildShapeEffect(actor);
  if (activeWildShape === null) {
    return null;
  }
  const unitRef = origin.characterUnitRefs.find(
    (candidate) => candidate.unitId === activeWildShape.sourceUnitId,
  );
  const profileFromUnitRef =
    unitRef?.supportProfiles.find(
      (profile): profile is BattleDruidWildShapeKnownFormSupportProfile =>
        typeof profile === "object" &&
        profile.kind === DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
    ) ?? null;
  if (profileFromUnitRef !== null) {
    return profileFromUnitRef;
  }

  const resource = origin.resources.find(
    (candidate) => candidate.unit.id === activeWildShape.sourceUnitId,
  );
  if (resource === undefined) {
    return null;
  }
  const profileFromResource = parseSupportedUnitFeatureProfile(
    resource.unit,
    origin.classLevels,
  );
  return profileFromResource?.kind ===
    DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE
    ? profileFromResource
    : null;
}

export function spellDefinitionHasPricedOrConsumedMaterialComponent(
  spell: SpellRecord,
): boolean {
  const components = spell.mechanics.components;
  if (components.m === false) {
    return false;
  }
  if (typeof components.m === "string") {
    return (
      ("materialCostGp" in components &&
        components.materialCostGp !== undefined) ||
      ("materialConsumed" in components &&
        components.materialConsumed === true)
    );
  }
  return structuredMaterialComponentHasSpecifiedCostOrConsumes(components.m);
}

function structuredMaterialComponentHasSpecifiedCostOrConsumes(
  materialComponent: StructuredMaterialComponent,
): boolean {
  return Match.value(materialComponent).pipe(
    byKind("paired_worn_items", () => true),
    Match.exhaustive,
  );
}
