import { Either, Match, Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  StatBlockScopedFidelityProjectionSchema,
  type StatBlockScopedFidelityProjection,
} from "./stat-block-raw-projection.ts";

type ProjectedProcedure =
  StatBlockScopedFidelityProjection["procedures"][number];
type ProjectedAttack = Extract<
  ProjectedProcedure,
  { readonly kind: "attack_roll" }
>;
type ProjectedAttackEffect = ProjectedAttack["onHit"][number];
type ProjectedSpellGroup = Extract<
  ProjectedProcedure,
  { readonly kind: "spellcasting" }
>["groups"][number];

const impossibleMeleeAttack: ProjectedAttack = {
  section: "Actions",
  name: "Synthetic Strike",
  kind: "attack_roll",
  attackType: "melee",
  attackBonus: 4,
  attackAbilityEvidence: { kind: "resolved", ability: "str" },
  // @ts-expect-error A melee attack cannot carry ranged distance.
  rangeFeet: { normal: 30, long: 120 },
  onHit: [
    {
      kind: "damage",
      damageType: "force",
      amount: { kind: "fixed", static: 4 },
    },
  ],
  resourceLimits: [],
};

const impossibleDamage: ProjectedAttackEffect = {
  kind: "damage",
  damageType: "force",
  // @ts-expect-error Dice count without a die size is not a damage expression.
  amount: { kind: "fixed", static: 4, expr: { dice: 1 } },
};

const impossibleAtWillGroup: ProjectedSpellGroup = {
  kind: "at_will",
  spells: [{ spellId: "synthetic_spell" }],
  // @ts-expect-error At-will spells cannot consume a limited-use resource.
  resourceLimits: [{ kind: "daily", uses: 1, ownership: "shared" }],
};

void [impossibleMeleeAttack, impossibleDamage, impossibleAtWillGroup];

const positiveInteger = fc.integer({ min: 1, max: 300 });
const attackAbility = fc.constantFrom("str", "dex", "int", "wis", "cha");
const damageType = fc.constantFrom(
  "acid",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "poison",
  "psychic",
  "radiant",
  "thunder",
);

const damageAmount = fc.oneof(
  positiveInteger.map((staticDamage) => ({
    kind: "fixed" as const,
    static: staticDamage,
  })),
  fc
    .record({
      staticDamage: positiveInteger,
      dice: fc.integer({ min: 1, max: 20 }),
      dieSize: fc.constantFrom(4, 6, 8, 10, 12),
      flat: fc.option(fc.integer({ min: -5, max: 20 }), { nil: undefined }),
    })
    .map(({ staticDamage, dice, dieSize, flat }) => ({
      kind: "fixed" as const,
      static: staticDamage,
      expr: {
        dice,
        dieSize,
        ...(flat === undefined ? {} : { flat }),
      },
    })),
);

const attackEvidence = fc.oneof(
  attackAbility.map((ability) => ({ kind: "resolved" as const, ability })),
  fc
    .uniqueArray(attackAbility, { minLength: 2, maxLength: 5 })
    .map((candidates) => ({ kind: "unresolved" as const, candidates })),
);

const attackProcedure = fc
  .record({
    attackBonus: fc.integer({ min: -5, max: 20 }),
    attackAbilityEvidence: attackEvidence,
    damageType,
    amount: damageAmount,
    distance: fc.oneof(
      positiveInteger.map((reachFeet) => ({
        attackType: "melee" as const,
        reachFeet,
      })),
      fc
        .record({ normal: positiveInteger, extension: positiveInteger })
        .map(({ normal, extension }) => ({
          attackType: "ranged" as const,
          rangeFeet: { normal, long: normal + extension },
        })),
    ),
  })
  .map(({ distance, damageType: type, amount, ...attack }) => ({
    section: "Actions" as const,
    name: "Synthetic Strike",
    kind: "attack_roll" as const,
    ...attack,
    ...distance,
    onHit: [{ kind: "damage" as const, damageType: type, amount }],
    resourceLimits: [],
  }));

const sizeAndSwarm = fc.oneof(
  fc
    .constantFrom("tiny", "small", "medium", "large", "huge", "gargantuan")
    .map((size) => ({ size })),
  fc.constantFrom(
    { size: "medium" as const, swarm: { constituentSize: "tiny" as const } },
    { size: "large" as const, swarm: { constituentSize: "tiny" as const } },
  ),
);

const projectionArbitrary = fc
  .record({ sizeAndSwarm, procedure: attackProcedure })
  .map(({ sizeAndSwarm: sizeAndSwarmValue, procedure }): unknown => ({
    generalFacts: {
      challengeRating: 1,
      sizeAndSwarm: sizeAndSwarmValue,
      creatureType: "construct",
      creatureTypeTags: [],
      alignment: "unaligned",
      ac: { kind: "literal", value: 12, annotations: [] },
      hp: { kind: "literal", value: 20 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
      initiative: { modifier: 0, score: 10 },
      savingThrowModifiers: [],
      saveProficiencies: [],
      skillModifiers: [],
      vulnerabilities: { kind: "none" },
      resistances: { kind: "none" },
      immunities: { kind: "none" },
      senses: [],
      passivePerception: 10,
      gear: [],
      communication: { kind: "none" },
    },
    resources: [],
    entryNames: ["Actions/Synthetic Strike"],
    traits: [],
    textOnlyProcedures: [],
    procedures: [procedure],
  }));

const decodeProjection = Schema.decodeUnknownEither(
  StatBlockScopedFidelityProjectionSchema,
);

function expectIndependentProjectionInvariants(
  projection: StatBlockScopedFidelityProjection,
): void {
  for (const procedure of projection.procedures) {
    Match.value(procedure).pipe(
      Match.when({ kind: "attack_roll", attackType: "melee" }, (attack) => {
        expect(attack.reachFeet).toBeGreaterThan(0);
        expect("rangeFeet" in attack).toBe(false);
        expect("ammunition" in attack).toBe(false);
        expect(attack.onHit.length).toBeGreaterThan(0);
      }),
      Match.when({ kind: "attack_roll", attackType: "ranged" }, (attack) => {
        expect(attack.rangeFeet.normal).toBeLessThanOrEqual(
          attack.rangeFeet.long,
        );
        expect("reachFeet" in attack).toBe(false);
        expect(attack.onHit.length).toBeGreaterThan(0);
      }),
      Match.orElse(() => undefined),
    );
  }
  const swarm = projection.generalFacts.sizeAndSwarm.swarm;
  if (swarm !== undefined) {
    expect(swarm.constituentSize).toBe("tiny");
    expect(["medium", "large"]).toContain(
      projection.generalFacts.sizeAndSwarm.size,
    );
  }
}

describe("domain-valid scoped Stat Block projections", () => {
  test("round-trips constrained valid products through the production schema", () => {
    fc.assert(
      fc.property(projectionArbitrary, (candidate) => {
        const decoded = decodeProjection(candidate);
        expect(Either.isRight(decoded)).toBe(true);
        if (Either.isLeft(decoded)) return;
        const projection = decoded.right as StatBlockScopedFidelityProjection;
        expectIndependentProjectionInvariants(projection);
        const encoded = Schema.encodeUnknownEither(
          StatBlockScopedFidelityProjectionSchema,
        )(decoded.right);
        expect(Either.isRight(encoded)).toBe(true);
        if (Either.isRight(encoded)) {
          const decodedAgain = decodeProjection(encoded.right);
          expect(Either.isRight(decodedAgain)).toBe(true);
          if (Either.isRight(decodedAgain)) {
            expect(decodedAgain.right).toEqual(decoded.right);
          }
        }
      }),
      { numRuns: 50, seed: 490 },
    );
  });

  test("rejects former impossible product states at the complete boundary", () => {
    const sampled = fc.sample(projectionArbitrary, {
      numRuns: 1,
      seed: 490,
    })[0];
    const candidate = Schema.decodeUnknownSync(
      StatBlockScopedFidelityProjectionSchema,
    )(sampled) as Record<string, unknown>;
    const generalFacts = candidate.generalFacts as Record<string, unknown>;
    const procedure =
      (candidate.procedures as readonly Record<string, unknown>[])[0] ?? {};
    const onHit = procedure.onHit as readonly Record<string, unknown>[];
    const damage = onHit[0] ?? {};
    const invalidCandidates: readonly unknown[] = [
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            attackType: "melee",
            reachFeet: 5,
            rangeFeet: { normal: 30, long: 120 },
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            attackType: "ranged",
            rangeFeet: { normal: 30, long: 120 },
            reachFeet: 5,
          },
        ],
      },
      {
        ...candidate,
        procedures: [{ ...procedure, onHit: [] }],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            attackType: "ranged",
            rangeFeet: { normal: 120, long: 30 },
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            attackAbilityEvidence: {
              kind: "unresolved",
              candidates: ["str", "str"],
            },
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            attackAbilityEvidence: {
              kind: "unresolved",
              candidates: ["str"],
            },
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            onHit: [
              {
                ...damage,
                amount: { kind: "fixed", static: 4, expr: { dice: 1 } },
              },
            ],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            onHit: [
              {
                ...damage,
                amount: { kind: "fixed", static: 4, expr: { dieSize: 6 } },
              },
            ],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            ...procedure,
            onHit: [
              {
                ...damage,
                amount: {
                  kind: "fixed",
                  static: 4,
                  spellcastingMod: true,
                },
              },
            ],
          },
        ],
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          speeds: [
            {
              kind: "walk",
              feet: { kind: "literal", value: 30 },
              hover: false,
            },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          speeds: [
            {
              kind: "walk",
              feet: { kind: "literal", value: 30 },
              hover: true,
            },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          speeds: [
            {
              kind: "gm_choice",
              alternatives: [
                { kind: "walk", feet: { kind: "literal", value: 30 } },
              ],
            },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          speeds: [
            {
              kind: "gm_choice",
              alternatives: [
                { kind: "walk", feet: { kind: "literal", value: 30 } },
                { kind: "walk", feet: { kind: "literal", value: 30 } },
              ],
            },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          sizeAndSwarm: { size: "medium", swarm: null },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          sizeAndSwarm: {
            size: "tiny",
            swarm: { constituentSize: "tiny" },
          },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          resistances: { kind: "fixed", damageTypes: [] },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          resistances: { kind: "choose_one_from", options: [] },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          immunities: { kind: "some", value: {} },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          immunities: {
            kind: "some",
            value: {
              conditions: ["charmed"],
              qualifiedConditions: [
                { condition: "charmed", qualifier: "synthetic source" },
              ],
            },
          },
        },
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Multiattack",
            kind: "multiattack",
            dispatches: [],
            resourceLimits: [],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Options",
            kind: "action_option",
            options: [],
            resourceLimits: [],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Spellcasting",
            kind: "spellcasting",
            ability: "int",
            components: { kind: "fixed", v: true, s: true, m: true },
            groups: [
              {
                kind: "at_will",
                spells: [{ spellId: "synthetic_spell" }],
                resourceLimits: [
                  { kind: "daily", uses: 1, ownership: "shared" },
                ],
              },
            ],
            resourceLimits: [],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Spellcasting",
            kind: "spellcasting",
            ability: "int",
            components: { kind: "spell_definition" },
            groups: [],
            resourceLimits: [],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Spellcasting",
            kind: "spellcasting",
            ability: "int",
            components: { kind: "spell_definition" },
            groups: [{ kind: "at_will", spells: [], resourceLimits: [] }],
            resourceLimits: [],
          },
        ],
      },
      {
        ...candidate,
        procedures: [
          {
            section: "Actions",
            name: "Synthetic Spellcasting",
            kind: "spellcasting",
            ability: "int",
            components: { kind: "spell_definition" },
            groups: [
              {
                kind: "limited",
                spells: [{ spellId: "synthetic_spell" }],
                resourceLimits: [],
              },
            ],
            resourceLimits: [],
          },
        ],
      },
    ];

    for (const invalid of invalidCandidates) {
      expect(Either.isLeft(decodeProjection(invalid))).toBe(true);
    }
  });
});
