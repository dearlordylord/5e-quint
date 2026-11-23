import { type BattleHole } from "@dnd/battle-runtime";
import { Match } from "effect";
import {
  resolveLocalSchemaReference,
  jsonSchemaRecord as record,
  jsonSchemaAlternatives as alternatives,
  jsonSchemaHasKind as hasKind,
} from "../json-schema-sharing.ts";
import type { McpOutputSchema } from "../schema-codec.ts";
import {
  enemyProximityConstraint,
  attackDistanceWitnesses,
  NO_THROWN_WEAPON_LANDING,
  targetSpatialConstraints,
  rangedSpellTargetSchema,
  type AttackTargetRequest,
  targetFactMembers,
  thrownWeaponLandingConstraint,
} from "./battle-target-fact-schema.ts";

const ATTACK_SUPPLEMENTAL_FACT_DEFINITION = "AttackSupplementalSpatialFact";

function attackTargetSchemas(
  member: McpOutputSchema,
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attack: AttackTargetRequest,
  definitions: McpOutputSchema,
): readonly McpOutputSchema[] {
  const scope = {
    attackerId: attack.actorId,
    procedureRef: attack.selection.procedureRef,
  };
  const facts = targetFactMembers(member, definitions);
  const supplemental = [
    ...(attack.targetConstraint.kind === "rangedRange"
      ? [enemyProximityConstraint(facts, definitions, scope)]
      : []),
    ...(attack.requiresThrownWeaponLanding === true
      ? [thrownWeaponLandingConstraint(facts, definitions, scope)]
      : []),
  ];
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
            minItems: 1 + supplemental.length,
            prefixItems: [witness],
            items: { $ref: `#/$defs/${ATTACK_SUPPLEMENTAL_FACT_DEFINITION}` },
            allOf: [
              ...supplemental,
              ...(attack.requiresThrownWeaponLanding === true
                ? []
                : [NO_THROWN_WEAPON_LANDING]),
            ],
          },
        },
      }),
    ),
  );
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
              "value",
            ),
          ]
        : attackTargetSchemas(member, hole, attack, definitions),
    ),
  };
}

function replacementTargetInputSchemas(
  members: readonly McpOutputSchema[],
  hole: Extract<
    BattleHole,
    { readonly kind: "targetingSaveInterdictionOutcome" }
  >,
  definitions: McpOutputSchema,
) {
  if (hole.replacementTargetKind !== "attackRoll")
    return { members, definitions, distanceFirst: false };
  const projectOutcome = (
    outcome: McpOutputSchema,
  ): readonly McpOutputSchema[] => {
    if (!hasKind(outcome, "newTarget", definitions)) return [outcome];
    const replacement = record(
      record(outcome.properties).replacementTargetKind,
    );
    if (
      !(
        replacement.const === "attackRoll" ||
        (Array.isArray(replacement.enum) &&
          replacement.enum.includes("attackRoll"))
      )
    )
      return [];
    const constrained = targetSpatialConstraints(
      rangedSpellTargetSchema(outcome, hole, definitions),
      hole,
      definitions,
      "targetId",
    );
    if (hole.attack?.targetConstraint.kind !== "rangedRange")
      return [constrained];
    const properties = record(constrained.properties);
    const spatial = resolveLocalSchemaReference(
      record(properties.spatialFacts),
      definitions,
    );
    return [
      {
        ...constrained,
        properties: {
          ...properties,
          spatialFacts: {
            ...spatial,
            allOf: [
              ...(Array.isArray(spatial.allOf) ? spatial.allOf : []),
              enemyProximityConstraint(
                targetFactMembers(outcome, definitions),
                definitions,
                {
                  attackerId: hole.attack.actorId,
                  procedureRef: hole.attack.selection.procedureRef,
                },
              ),
            ],
          },
        },
      },
    ];
  };
  return {
    definitions,
    distanceFirst: false,
    members: members.map((member) => {
      const properties = record(member.properties);
      const values = alternatives(record(properties.value), definitions).map(
        (value) => {
          const fields = record(value.properties);
          if (!("outcome" in fields)) return value;
          return {
            ...value,
            properties: {
              ...fields,
              outcome: {
                anyOf: alternatives(
                  record(fields.outcome),
                  definitions,
                ).flatMap(projectOutcome),
              },
            },
          };
        },
      );
      return {
        ...member,
        properties: { ...properties, value: { anyOf: values } },
      };
    }),
  };
}

export function targetInputSchemas(
  members: readonly McpOutputSchema[],
  hole: Extract<
    BattleHole,
    {
      readonly kind:
        | "targetChoice"
        | "objectTargetChoice"
        | "targetingSaveInterdictionOutcome";
    }
  >,
  canonicalDefinitions: McpOutputSchema,
) {
  return Match.value(hole).pipe(
    Match.when({ kind: "targetingSaveInterdictionOutcome" }, (request) =>
      replacementTargetInputSchemas(members, request, canonicalDefinitions),
    ),
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
