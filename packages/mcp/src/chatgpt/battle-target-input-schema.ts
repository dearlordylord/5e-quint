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

function pinFact<const Facts extends object>(
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

const ATTACK_SUPPLEMENTAL_FACT_DEFINITION = "AttackSupplementalSpatialFact";

function targetFactMembers(
  member: McpOutputSchema,
  definitions: McpOutputSchema,
) {
  const spatial = resolveLocalSchemaReference(
    record(record(member.properties).spatialFacts),
    definitions,
  );
  return alternatives(record(spatial.items), definitions);
}

type AttackTargetRequest = NonNullable<
  Extract<BattleHole, { readonly kind: "targetChoice" }>["attack"]
>;

function attackDistanceWitnesses(
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

function attackTargetSchemas(
  member: McpOutputSchema,
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attack: AttackTargetRequest,
  definitions: McpOutputSchema,
): readonly McpOutputSchema[] {
  return hole.choices.flatMap((targetId) =>
    attackDistanceWitnesses(member, attack, targetId, definitions).map(
      (witness) => ({
        ...member,
        required: [
          ...new Set([
            ...(Array.isArray(member.required) ? member.required : []),
            "spatialFacts",
          ]),
        ],
        properties: {
          ...record(member.properties),
          value: { const: targetId },
          spatialFacts: {
            type: "array",
            minItems: 1,
            prefixItems: [witness],
            items: { $ref: `#/$defs/${ATTACK_SUPPLEMENTAL_FACT_DEFINITION}` },
          },
        },
      }),
    ),
  );
}

function targetSpatialConstraints(
  member: McpOutputSchema,
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  definitions: McpOutputSchema,
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
    properties: { ...properties, value: { enum: hole.choices } },
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
        if: { required: ["value"], properties: { value: { const: targetId } } },
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

function rangedSpellTargetSchema(
  member: McpOutputSchema,
  hole: Extract<
    BattleHole,
    { readonly kind: "targetChoice" | "objectTargetChoice" }
  >,
  definitions: McpOutputSchema,
): McpOutputSchema {
  const request = Match.value(hole).pipe(
    Match.when(
      { kind: "targetChoice" },
      (request) => request.spellTargetSpatialFactRequest,
    ),
    Match.when(
      { kind: "objectTargetChoice" },
      (request) => request.spellObjectTargetSpatialFactRequest,
    ),
    Match.exhaustive,
  );
  if (request?.requiresEnemyProximityQualification !== true) return member;
  const properties = record(member.properties);
  const spatial = resolveLocalSchemaReference(
    record(properties.spatialFacts),
    definitions,
  );
  const facts = targetFactMembers(member, definitions).filter(
    (candidate) =>
      RANGED_SPELL_ATTACK_TARGET_SPATIAL_FACT_KINDS.some((kind) =>
        hasKind(candidate, kind, definitions),
      ) &&
      (hole.kind !== "targetChoice" ||
        !("objectId" in record(candidate.properties))) &&
      (!hasKind(candidate, "spellLeapTargetWithinRange", definitions) ||
        (hole.kind === "targetChoice" &&
          hole.spellLeapTargetSpatialFactRequest !== undefined)) &&
      (!hasKind(candidate, "spellTargetKnownWilling", definitions) ||
        (hole.kind === "targetChoice" &&
          hole.spellTargetSpatialFactRequest?.requiresKnownWillingTarget ===
            true)),
  );
  const qualification = facts.filter((fact) =>
    hasKind(fact, "rangedSpellAttackEnemyProximity", definitions),
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
          {
            contains: {
              anyOf: qualification.map((fact) =>
                pinFact(fact, {
                  kind: "rangedSpellAttackEnemyProximity",
                  casterId: request.casterId,
                  sourceProcedureRef: request.sourceProcedureRef,
                }),
              ),
            },
            maxContains: 1,
          },
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
              ]
            : []),
        ],
      },
    },
  };
}

function creatureTargetInputSchemas(
  members: readonly McpOutputSchema[],
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  canonicalDefinitions: McpOutputSchema,
) {
  const attack =
    hole.spellTargetSpatialFactRequest === undefined ? hole.attack : undefined;
  const definitions =
    attack === undefined
      ? canonicalDefinitions
      : {
          ...canonicalDefinitions,
          [ATTACK_SUPPLEMENTAL_FACT_DEFINITION]: {
            anyOf: members
              .flatMap((member) =>
                targetFactMembers(member, canonicalDefinitions),
              )
              .filter(
                (candidate) =>
                  !hasKind(
                    candidate,
                    "attackTargetDistance",
                    canonicalDefinitions,
                  ),
              ),
          },
        };
  return {
    definitions,
    distanceFirst: attack !== undefined,
    members: members.flatMap((member) =>
      attack === undefined
        ? [
            targetSpatialConstraints(
              rangedSpellTargetSchema(member, hole, definitions),
              hole,
              definitions,
            ),
          ]
        : attackTargetSchemas(member, hole, attack, definitions),
    ),
  };
}

export function targetInputSchemas(
  members: readonly McpOutputSchema[],
  hole: Extract<
    BattleHole,
    { readonly kind: "targetChoice" | "objectTargetChoice" }
  >,
  canonicalDefinitions: McpOutputSchema,
) {
  return Match.value(hole).pipe(
    Match.when({ kind: "targetChoice" }, (request) =>
      creatureTargetInputSchemas(members, request, canonicalDefinitions),
    ),
    Match.when({ kind: "objectTargetChoice" }, (request) => ({
      definitions: canonicalDefinitions,
      distanceFirst: false,
      members: members.map((member) =>
        rangedSpellTargetSchema(member, request, canonicalDefinitions),
      ),
    })),
    Match.exhaustive,
  );
}
