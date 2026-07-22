// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// Spell invocation predicates and lightweight projections keep narrowing logic
// close to the spell invocation vocabulary.

import type {
  BattleCreatureState,
  DamageSpellSource,
  PreparedDamageSpellSource,
  ScalarBuffSpellTargeting,
  SupportedSpellInvocation,
  TargetListSpellInvocation,
} from "../battle-state-execution.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";

type RuntimeSpellProcedure =
  | SupportedSpellInvocation
  | RuntimeSpellProcedureExecution;
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Match } from "effect";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";
import { activeDruidWildShapeEffect } from "./druid-wild-shape.ts";
import {
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import {
  DRUID_BEAST_SPELLS_CLASS_LEVEL,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  type BattleDruidWildShapeKnownFormSupportProfile,
} from "../druid-wild-shape-support-execution.ts";

const byKind = Match.discriminator("kind");

type SpellComponents = SpellMechanics["components"];
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
    RuntimeSpellProcedure,
    { readonly procedure: "scalarBuff" }
  >,
): invocation is Extract<
  RuntimeSpellProcedure,
  { readonly procedure: "scalarBuff" }
> & {
  readonly targeting: Extract<
    ScalarBuffSpellTargeting,
    { readonly kind: "targetList" }
  >;
} {
  return invocation.targeting.kind === "targetList";
}

export function isTargetListSpellInvocation<
  Invocation extends RuntimeSpellProcedure,
>(
  invocation: Invocation,
): invocation is Invocation & TargetListSpellInvocation {
  return (
    "targeting" in invocation &&
    (invocation.targeting.kind === "targetList" ||
      invocation.targeting.kind === "pointOriginSphereTargetList" ||
      invocation.targeting.kind === "selfAndChosenLegalTargets")
  );
}

export function activeOngoingFeaturesPreventSpellInvocation(
  actor: BattleCreatureState,
  invocation: RuntimeSpellProcedure,
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
  invocation: RuntimeSpellProcedure,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  const profile = activeDruidWildShapeSupportProfile(actor, actor.origin);
  return (
    profile !== null &&
    Number(profile.classLevel) >= DRUID_BEAST_SPELLS_CLASS_LEVEL &&
    !("spellRuleFacts" in invocation
      ? invocation.spellRuleFacts.components.hasPricedOrConsumedMaterial
      : spellDefinitionHasPricedOrConsumedMaterialComponent(invocation.spell))
  );
}

function activeDruidWildShapeSupportProfile(
  actor: BattleCreatureState,
  origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >,
): BattleDruidWildShapeKnownFormSupportProfile | null {
  const activeWildShape = activeDruidWildShapeEffect(actor);
  if (activeWildShape === null) {
    return null;
  }
  const procedure = characterUnitProcedure(
    origin.execution,
    activeWildShape.sourceProcedureRef,
    DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  );
  if (procedure?.kind === "unitFeature") {
    return procedure.execution.kind ===
      DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE
      ? procedure.execution
      : null;
  }
  if (procedure?.kind !== "unitSupportProfile") return null;
  const execution = procedure.execution;
  return typeof execution === "object" &&
    execution.kind === DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE
    ? execution
    : null;
}

export function spellDefinitionHasPricedOrConsumedMaterialComponent(spell: {
  readonly mechanics: SpellMechanics;
}): boolean {
  const components = spell.mechanics.components;
  if (components.m === false) {
    return false;
  }
  if (typeof components.m === "string") {
    return (
      ("materialCostGp" in components &&
        components.materialCostGp !== undefined) ||
      ("materialConsumed" in components && components.materialConsumed === true)
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
