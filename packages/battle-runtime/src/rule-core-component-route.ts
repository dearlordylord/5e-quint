import {
  quintField,
  quintList,
  quintVariantTag,
  quintVariantValue,
} from "./battle-runtime-mbt-driver-kit.ts";

const RULE_CORE_COMPONENT_OWNERS = [
  "RuleCoreAbilitySkillCommandOwner",
  "RuleCoreAttackDamageDispositionOwner",
  "RuleCoreFeatureProfileSemanticsOwner",
  "RuleCoreHitPointDamageOwner",
  "RuleCoreMovementGrappleOwner",
  "RuleCoreReactionContinuationConcentrationOwner",
  "RuleCoreShoveOutcomeOwner",
  "RuleCoreSpellProcedureProfileOwner",
  "RuleCoreStatBlockControlOwner",
] as const;

export type RuleCoreComponentOwner =
  (typeof RULE_CORE_COMPONENT_OWNERS)[number];

const RULE_CORE_COMPONENT_ROUTE_EVENT_KINDS = [
  "RuleCoreComponentParseInput",
  "RuleCoreComponentAdmitInput",
  "RuleCoreComponentCall",
  "RuleCoreComponentProjectResult",
] as const;

type RuleCoreComponentRouteEventKind =
  (typeof RULE_CORE_COMPONENT_ROUTE_EVENT_KINDS)[number];

export type RuleCoreComponentRouteEvent = {
  readonly kind: RuleCoreComponentRouteEventKind;
  readonly owner: RuleCoreComponentOwner;
};

export type RuleCoreComponentRoutedProjection = {
  readonly componentRoute: readonly RuleCoreComponentRouteEvent[];
};

export function ruleCoreComponentRoute(
  owner: RuleCoreComponentOwner,
): readonly RuleCoreComponentRouteEvent[] {
  return RULE_CORE_COMPONENT_ROUTE_EVENT_KINDS.map((kind) => ({
    kind,
    owner,
  }));
}

export function withRuleCoreComponentRoute<T extends object>(
  owner: RuleCoreComponentOwner,
  projection: T,
): T & RuleCoreComponentRoutedProjection {
  return {
    ...projection,
    componentRoute: ruleCoreComponentRoute(owner),
  };
}

export function decodeRuleCoreComponentRoute(
  raw: unknown,
): readonly RuleCoreComponentRouteEvent[] {
  return quintList(raw, "qComponentRoute").map(decodeRuleCoreComponentRouteEvent);
}

function decodeRuleCoreComponentRouteEvent(
  raw: unknown,
): RuleCoreComponentRouteEvent {
  const kind = quintVariantTag(raw, "qComponentRoute[]");
  if (!isRuleCoreComponentRouteEventKind(kind)) {
    throw new Error(`Unknown rule-core component route event ${kind}.`);
  }
  const payload = quintVariantValue(raw, kind, "qComponentRoute[]");
  if (!isRecord(payload)) {
    throw new Error(`Expected rule-core component route ${kind} payload.`);
  }
  return {
    kind,
    owner: ruleCoreComponentOwner(quintField(payload, "owner")),
  };
}

function ruleCoreComponentOwner(raw: unknown): RuleCoreComponentOwner {
  const tag = quintVariantTag(raw, "qComponentRoute[].owner");
  if (isRuleCoreComponentOwner(tag)) return tag;
  throw new Error(`Unknown rule-core component owner ${tag}.`);
}

function isRuleCoreComponentOwner(
  raw: string,
): raw is RuleCoreComponentOwner {
  return RULE_CORE_COMPONENT_OWNERS.some((owner) => owner === raw);
}

function isRuleCoreComponentRouteEventKind(
  raw: string,
): raw is RuleCoreComponentRouteEventKind {
  return RULE_CORE_COMPONENT_ROUTE_EVENT_KINDS.some((kind) => kind === raw);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}
