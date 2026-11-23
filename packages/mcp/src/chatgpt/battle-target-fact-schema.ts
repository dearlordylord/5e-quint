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
      {
        contains: {
          anyOf: scoped.map((fact) => pinFact(fact, { kind, ...scope })),
        },
      },
      { contains: factOfKind(kind), maxContains: 1 },
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
