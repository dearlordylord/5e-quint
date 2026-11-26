import {
  RANGED_SPELL_ATTACK_TARGET_SPATIAL_FACT_KINDS,
  type BattleHole,
} from "@dnd/battle-runtime";
import { Match } from "effect";
import {
  resolveLocalSchemaReference,
  jsonSchemaRecord as record,
  jsonSchemaAlternatives as alternatives,
  jsonSchemaHasKind as hasKind,
} from "../json-schema-sharing.ts";
import type { McpOutputSchema } from "../schema-codec.ts";

/** Pins each named fact field of a target fact schema to one value. */
export function pinFact<const Facts extends object>(
  schema: McpOutputSchema,
  facts: Facts,
): McpOutputSchema {
  return {
    ...schema,
    properties: {
      ...record(schema.properties),
      ...Object.fromEntries(
        Object.entries(facts).map(([field, value]) => [
          field,
          { const: value },
        ]),
      ),
    },
  };
}

/** The fact schemas a target fill member accepts in `spatialFacts`. */
export function targetFactMembers(
  member: McpOutputSchema,
  definitions: McpOutputSchema,
): readonly McpOutputSchema[] {
  const spatial = resolveLocalSchemaReference(
    record(record(member.properties).spatialFacts),
    definitions,
  );
  return alternatives(record(spatial.items), definitions);
}

/** A ranged attack roll needs exactly one enemy proximity fact scoped to it. */
export function enemyProximityConstraint(
  facts: readonly McpOutputSchema[],
  definitions: McpOutputSchema,
  scope: { readonly attackerId: string; readonly procedureRef: string },
): McpOutputSchema {
  return exactlyOneScopedFact(
    "rangedAttackEnemyProximity",
    facts,
    definitions,
    scope,
  );
}

/** Any other attack takes no thrown weapon landing fact. */
export const NO_THROWN_WEAPON_LANDING: McpOutputSchema = {
  not: { contains: factOfKind("thrownWeaponLanding") },
};

/** A thrown weapon attack needs exactly one landing fact scoped to it. */
export function thrownWeaponLandingConstraint(
  facts: readonly McpOutputSchema[],
  definitions: McpOutputSchema,
  scope: { readonly attackerId: string; readonly procedureRef: string },
): McpOutputSchema {
  return exactlyOneScopedFact("thrownWeaponLanding", facts, definitions, scope);
}

function exactlyOneScopedFact(
  kind: "rangedAttackEnemyProximity" | "thrownWeaponLanding",
  facts: readonly McpOutputSchema[],
  definitions: McpOutputSchema,
  scope: { readonly attackerId: string; readonly procedureRef: string },
): McpOutputSchema {
  const scoped = facts.filter((fact) => hasKind(fact, kind, definitions));
  if (scoped.length === 0)
    throw new Error(`The canonical target fill must contain the ${kind} fact.`);
  // The runtime takes exactly one fact of the kind in all, so the scoped fact
  // must be there and no other fact of the kind may sit beside it.
  return {
    allOf: [
      { contains: { anyOf: scoped }, maxContains: 1 },
      {
        contains: {
          anyOf: scoped.map((fact) => pinFact(fact, { kind, ...scope })),
        },
      },
    ],
  };
}

/** Any fact of one kind, whatever else it states. */
function factOfKind(kind: string): McpOutputSchema {
  return {
    type: "object",
    required: ["kind"],
    properties: { kind: { const: kind } },
  };
}

export type AttackTargetRequest = NonNullable<
  Extract<BattleHole, { readonly kind: "targetChoice" }>["attack"]
>;

type CreatureTargetSpatialRequest = Pick<
  Extract<BattleHole, { readonly kind: "targetChoice" }>,
  | "choices"
  | "attack"
  | "spellTargetSpatialFactRequest"
  | "spellLeapTargetSpatialFactRequest"
>;
type RangedTargetHole =
  | Extract<
      BattleHole,
      { readonly kind: "targetChoice" | "objectTargetChoice" }
    >
  | Extract<
      BattleHole,
      {
        readonly kind: "targetingSaveInterdictionOutcome";
        readonly replacementTargetKind: "attackRoll";
      }
    >;

export function attackDistanceWitnesses(
  member: McpOutputSchema,
  attack: AttackTargetRequest,
  targetId: AttackTargetRequest["actorId"],
  definitions: McpOutputSchema,
): readonly McpOutputSchema[] {
  const selectionField = Match.value(attack.selection).pipe(
    Match.when(
      { statBlockDamageSelection: Match.defined },
      (): "statBlockDamageSelection" => "statBlockDamageSelection",
    ),
    Match.when(
      { attackAbility: Match.defined },
      (): "attackAbility" => "attackAbility",
    ),
    Match.exhaustive,
  );
  const candidates = targetFactMembers(member, definitions).filter(
    (candidate) =>
      hasKind(candidate, "attackTargetDistance", definitions) &&
      Array.isArray(candidate.required) &&
      candidate.required.includes(selectionField),
  );
  if (candidates.length === 0)
    throw new Error(
      "The canonical target fill must contain its attack selection.",
    );
  const maximum = Match.value(attack.targetConstraint).pipe(
    Match.when({ kind: "meleeReach" }, ({ reachFeet }) => reachFeet),
    Match.when({ kind: "rangedRange" }, ({ longFeet }) => longFeet),
    Match.exhaustive,
  );
  return candidates.map((candidate) => {
    const pinned = pinFact(candidate, {
      kind: "attackTargetDistance",
      actorId: attack.actorId,
      targetId,
      ...attack.selection,
    });
    const fields = record(pinned.properties);
    return {
      ...pinned,
      properties: {
        ...fields,
        distanceFeet: { ...record(fields.distanceFeet), maximum },
      },
    };
  });
}

export function targetSpatialConstraints(
  member: McpOutputSchema,
  hole: CreatureTargetSpatialRequest,
  definitions: McpOutputSchema,
  targetField: "value" | "targetId",
): McpOutputSchema {
  if (
    hole.attack === undefined &&
    hole.spellTargetSpatialFactRequest === undefined
  )
    return member;
  const properties = record(member.properties);
  const spatial = resolveLocalSchemaReference(
    record(properties.spatialFacts),
    definitions,
  );
  const factMembers = alternatives(record(spatial.items), definitions);
  const fact = <const Pins extends object>(kind: string, pins: Pins) => {
    const candidates = factMembers.filter((candidate) =>
      hasKind(candidate, kind, definitions),
    );
    if (candidates.length === 0)
      throw new Error(
        "The canonical target fill must contain its requested spatial fact.",
      );
    return { anyOf: candidates.map((candidate) => pinFact(candidate, pins)) };
  };
  return {
    ...member,
    properties: { ...properties, [targetField]: { enum: hole.choices } },
    required: [
      ...new Set([
        ...(Array.isArray(member.required) ? member.required : []),
        "spatialFacts",
      ]),
    ],
    allOf: hole.choices.map((targetId) => {
      const requiredFacts: McpOutputSchema[] = [];
      if (hole.attack !== undefined) {
        const attack = hole.attack;
        requiredFacts.push({
          anyOf: attackDistanceWitnesses(member, attack, targetId, definitions),
        });
        requiredFacts.push(
          fact("attackTargetDistance", {
            kind: "attackTargetDistance",
            actorId: attack.actorId,
            targetId,
            procedureRef: attack.selection.procedureRef,
          }),
        );
      }
      const request = hole.spellTargetSpatialFactRequest;
      if (request !== undefined) {
        const spell = fact("spellTarget", {
          kind: "spellTarget",
          casterId: request.casterId,
          sourceProcedureRef: request.sourceProcedureRef,
          targetId,
        });
        requiredFacts.push({
          ...spell,
          allOf: [
            {
              ...(request.requiresExactDistance === true
                ? { required: ["distanceFeet"] }
                : {}),
              properties: { distanceFeet: { maximum: request.rangeFeet } },
            },
          ],
        });
        if (
          request.requiresKnownWillingTarget === true &&
          targetId !== request.casterId
        )
          requiredFacts.push(
            fact("spellTargetKnownWilling", {
              kind: "spellTargetKnownWilling",
              casterId: request.casterId,
              sourceProcedureRef: request.sourceProcedureRef,
              targetId,
            }),
          );
        const leap = hole.spellLeapTargetSpatialFactRequest;
        if (leap !== undefined)
          requiredFacts.push(
            fact("spellLeapTargetWithinRange", {
              kind: "spellLeapTargetWithinRange",
              previousTargetId: leap.previousTargetId,
              sourceProcedureRef: request.sourceProcedureRef,
              targetId,
              rangeFeet: leap.rangeFeet,
            }),
          );
      }
      return {
        if: {
          required: [targetField],
          properties: { [targetField]: { const: targetId } },
        },
        then: {
          properties: {
            spatialFacts: {
              allOf: requiredFacts.map((witness) => ({
                contains: witness,
                ...(hole.attack === undefined ? {} : { maxContains: 1 }),
              })),
            },
          },
        },
      };
    }),
  };
}

function rangedSpellFactKinds(hole: RangedTargetHole) {
  return RANGED_SPELL_ATTACK_TARGET_SPATIAL_FACT_KINDS.filter((kind) => {
    if (kind === "spellLeapTargetWithinRange")
      return (
        hole.kind !== "objectTargetChoice" &&
        hole.spellLeapTargetSpatialFactRequest !== undefined
      );
    if (kind === "spellTargetKnownWilling")
      return (
        hole.kind !== "objectTargetChoice" &&
        hole.spellTargetSpatialFactRequest?.requiresKnownWillingTarget === true
      );
    return true;
  });
}

export function rangedSpellTargetSchema(
  member: McpOutputSchema,
  hole: RangedTargetHole,
  definitions: McpOutputSchema,
): McpOutputSchema {
  const request = Match.value(hole).pipe(
    Match.when(
      { kind: "targetChoice" },
      (request) => request.spellTargetSpatialFactRequest,
    ),
    Match.when(
      { kind: "targetingSaveInterdictionOutcome" },
      (request) => request.spellTargetSpatialFactRequest,
    ),
    Match.when(
      { kind: "objectTargetChoice" },
      (request) => request.spellObjectTargetSpatialFactRequest,
    ),
    Match.exhaustive,
  );
  if (request?.requiresEnemyProximityQualification !== true)
    return hole.kind === "objectTargetChoice" && request !== undefined
      ? withObjectTargetSightConstraint(member, request, definitions)
      : member;
  const properties = record(member.properties);
  const spatial = resolveLocalSchemaReference(
    record(properties.spatialFacts),
    definitions,
  );
  const allowedKinds = rangedSpellFactKinds(hole);
  const facts = targetFactMembers(member, definitions).filter(
    (candidate) =>
      allowedKinds.some((kind) => hasKind(candidate, kind, definitions)) &&
      (hole.kind === "objectTargetChoice" ||
        !("objectId" in record(candidate.properties))),
  );
  return {
    ...member,
    required: [
      ...new Set([
        ...(Array.isArray(member.required) ? member.required : []),
        "spatialFacts",
      ]),
    ],
    properties: {
      ...properties,
      spatialFacts: {
        ...spatial,
        items: { anyOf: facts },
        allOf: [
          ...(Array.isArray(spatial.allOf) ? spatial.allOf : []),
          enemyProximityConstraint(facts, definitions, {
            attackerId: request.casterId,
            procedureRef: request.sourceProcedureRef,
          }),
          ...(hole.kind === "objectTargetChoice"
            ? [
                {
                  contains: {
                    anyOf: facts
                      .filter((fact) =>
                        hasKind(fact, "spellObjectTarget", definitions),
                      )
                      .map((fact) => ({
                        ...pinFact(fact, {
                          kind: "spellObjectTarget",
                          casterId: request.casterId,
                          sourceProcedureRef: request.sourceProcedureRef,
                          rangeFeet: request.rangeFeet,
                        }),
                        allOf: [
                          {
                            properties: {
                              distanceFeet: { maximum: request.rangeFeet },
                            },
                          },
                        ],
                      })),
                  },
                  maxContains: 1,
                },
                objectTargetSightConstraint(facts, request, definitions),
              ]
            : []),
        ],
      },
    },
  };
}

type ObjectTargetSightRequest = Pick<
  NonNullable<
    Extract<
      BattleHole,
      { readonly kind: "objectTargetChoice" }
    >["spellObjectTargetSpatialFactRequest"]
  >,
  "casterId" | "sourceProcedureRef"
>;

/**
 * SRD "Unseen Attackers and Targets": every spell attack against an object
 * carries exactly one table answer to whether the caster can see it.
 */
function objectTargetSightConstraint(
  facts: readonly McpOutputSchema[],
  request: ObjectTargetSightRequest,
  definitions: McpOutputSchema,
): McpOutputSchema {
  return {
    contains: {
      anyOf: facts
        .filter((fact) => hasKind(fact, "spellObjectTargetSight", definitions))
        .map((fact) =>
          pinFact(fact, {
            kind: "spellObjectTargetSight",
            casterId: request.casterId,
            sourceProcedureRef: request.sourceProcedureRef,
          }),
        ),
    },
    maxContains: 1,
  };
}

function withObjectTargetSightConstraint(
  member: McpOutputSchema,
  request: ObjectTargetSightRequest,
  definitions: McpOutputSchema,
): McpOutputSchema {
  const properties = record(member.properties);
  const spatial = resolveLocalSchemaReference(
    record(properties.spatialFacts),
    definitions,
  );
  return {
    ...member,
    required: [
      ...new Set([
        ...(Array.isArray(member.required) ? member.required : []),
        "spatialFacts",
      ]),
    ],
    properties: {
      ...properties,
      spatialFacts: {
        ...spatial,
        allOf: [
          ...(Array.isArray(spatial.allOf) ? spatial.allOf : []),
          objectTargetSightConstraint(
            targetFactMembers(member, definitions),
            request,
            definitions,
          ),
        ],
      },
    },
  };
}
