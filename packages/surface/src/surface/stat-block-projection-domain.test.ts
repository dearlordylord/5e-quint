import { Either, Match, Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  StatBlockScopedFidelityProjectionSchema,
  type StatBlockScopedFidelityProjection,
} from "./stat-block-raw-projection.ts";

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
    kind: "static" as const,
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
      kind: "dice_expression" as const,
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

const resourceLimit = positiveInteger.map((uses) => ({
  kind: "daily" as const,
  uses,
  ownership: "shared" as const,
}));

const spellGroup = fc.oneof(
  positiveInteger.map((count) => ({
    kind: "at_will" as const,
    spells: [{ spellId: "synthetic_spell", count }],
    resourceLimits: [] as const,
  })),
  fc.tuple(positiveInteger, resourceLimit).map(([count, limit]) => ({
    kind: "limited" as const,
    spells: [{ spellId: "synthetic_spell", count }],
    resourceLimits: [limit],
  })),
);

const procedureArbitrary = fc.oneof(
  attackProcedure,
  positiveInteger.map((count) => ({
    section: "Actions" as const,
    name: "Synthetic Multiattack",
    kind: "multiattack" as const,
    dispatches: [{ procedureName: "Synthetic Strike", count }],
    resourceLimits: [],
  })),
  fc.constant({
    section: "Actions" as const,
    name: "Synthetic Options",
    kind: "action_option" as const,
    options: ["Synthetic Strike", "Synthetic Burst"],
    resourceLimits: [],
  }),
  spellGroup.map((group) => ({
    section: "Actions" as const,
    name: "Synthetic Spellcasting",
    kind: "spellcasting" as const,
    ability: "int" as const,
    components: { kind: "spell_definition" as const },
    groups: [group],
    resourceLimits: [],
  })),
  fc
    .tuple(positiveInteger, damageType, damageAmount)
    .map(([dc, type, amount]) => ({
      section: "Actions" as const,
      name: "Synthetic Burst",
      kind: "save" as const,
      ability: "dex" as const,
      dc,
      area: { kind: "cone" as const, lengthFeet: 15 },
      onFail: { kind: "damage" as const, damageType: type, amount },
      onSuccess: "half_damage" as const,
      resourceLimits: [],
    })),
);

const speeds = fc.oneof(
  fc.constant([
    { kind: "walk" as const, feet: { kind: "literal" as const, value: 30 } },
  ]),
  fc.boolean().map((hover) => [
    {
      kind: "fly" as const,
      feet: { kind: "literal" as const, value: 30 },
      ...(hover ? { hover: true as const } : {}),
    },
  ]),
  fc.constant([
    {
      kind: "gm_choice" as const,
      alternatives: [
        {
          kind: "climb" as const,
          feet: { kind: "literal" as const, value: 20 },
        },
        {
          kind: "fly" as const,
          feet: { kind: "literal" as const, value: 20 },
          hover: true as const,
        },
      ],
    },
  ]),
);

const nonEmptyDamageTypes = fc.uniqueArray(damageType, {
  minLength: 1,
  maxLength: 4,
});
const resistances = fc.oneof(
  fc.constant({ kind: "none" as const }),
  nonEmptyDamageTypes.map((damageTypes) => ({
    kind: "fixed" as const,
    damageTypes,
  })),
  nonEmptyDamageTypes.map((options) => ({
    kind: "choose_one_from" as const,
    options,
  })),
);
const immunities = fc.oneof(
  fc.constant({ kind: "none" as const }),
  nonEmptyDamageTypes.map((damageTypes) => ({
    kind: "some" as const,
    value: { damageTypes },
  })),
  fc.constant({
    kind: "some" as const,
    value: {
      conditions: ["charmed" as const],
      qualifiedConditions: [
        { condition: "frightened" as const, qualifier: "synthetic source" },
      ],
    },
  }),
);

const communication = fc.oneof(
  fc.constant({ kind: "none" as const }),
  fc.constant({
    kind: "spoken_and_understood" as const,
    languages: { kind: "named" as const, languages: ["Common"] },
  }),
);

const traits = fc.oneof(
  fc.constant([]),
  fc.constant([
    {
      name: "Synthetic Trait",
      description: "Synthetic comparison evidence.",
      effect: {
        kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target" as const,
      },
    },
  ]),
);

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
  .record({
    sizeAndSwarm,
    procedure: procedureArbitrary,
    speeds,
    resistances,
    immunities,
    communication,
    traits,
  })
  .map(
    ({
      sizeAndSwarm: sizeAndSwarmValue,
      procedure,
      speeds: speedValues,
      resistances: resistanceValue,
      immunities: immunityValue,
      communication: communicationValue,
      traits: traitValues,
    }): unknown => ({
      generalFacts: {
        challengeRating: 1,
        sizeAndSwarm: sizeAndSwarmValue,
        creatureType: "construct",
        creatureTypeTags: [],
        alignment: "unaligned",
        ac: { kind: "literal", value: 12, annotations: [] },
        hp: { kind: "literal", value: 20 },
        speeds: speedValues,
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
        resistances: resistanceValue,
        immunities: immunityValue,
        senses: [],
        passivePerception: 10,
        gear: [],
        communication: communicationValue,
      },
      resources: [],
      entryNames: ["Actions/Synthetic Strike"],
      traits: traitValues,
      textOnlyProcedures: [],
      procedures: [procedure],
    }),
  );

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
      Match.when({ kind: "textOnly" }, () => undefined),
      Match.when({ kind: "save" }, (save) => {
        expect(save.dc).toBeGreaterThan(0);
        expect(save.onFail.amount.static).toBeGreaterThan(0);
      }),
      Match.when({ kind: "multiattack" }, (multiattack) => {
        expect(multiattack.dispatches.length).toBeGreaterThan(0);
      }),
      Match.when({ kind: "action_option" }, (options) => {
        expect(options.options.length).toBeGreaterThan(0);
      }),
      Match.when({ kind: "spellcasting" }, (spellcasting) => {
        expect(spellcasting.groups.length).toBeGreaterThan(0);
        for (const group of spellcasting.groups) {
          Match.value(group).pipe(
            Match.when({ kind: "at_will" }, (atWill) => {
              expect(atWill.spells.length).toBeGreaterThan(0);
              expect(atWill.resourceLimits).toHaveLength(0);
            }),
            Match.when({ kind: "limited" }, (limited) => {
              expect(limited.spells.length).toBeGreaterThan(0);
              expect(limited.resourceLimits.length).toBeGreaterThan(0);
            }),
            Match.exhaustive,
          );
        }
      }),
      Match.exhaustive,
    );
  }
  const swarm = projection.generalFacts.sizeAndSwarm.swarm;
  if (swarm !== undefined) {
    expect(swarm.constituentSize).toBe("tiny");
    expect(["medium", "large"]).toContain(
      projection.generalFacts.sizeAndSwarm.size,
    );
  }
  for (const speed of projection.generalFacts.speeds) {
    Match.value(speed).pipe(
      Match.when({ kind: "gm_choice" }, ({ alternatives }) => {
        expect(alternatives.length).toBeGreaterThanOrEqual(2);
        expect(
          new Set(alternatives.map((alternative) => alternative.kind)).size,
        ).toBe(alternatives.length);
      }),
      Match.when({ kind: "fly" }, (fly) => {
        expect(fly.feet.value).toBeGreaterThan(0);
        expect(fly.hover === undefined || fly.hover === true).toBe(true);
      }),
      Match.when({ kind: "walk" }, (nonFly) => {
        expect("hover" in nonFly).toBe(false);
      }),
      Match.when({ kind: "burrow" }, (nonFly) => {
        expect("hover" in nonFly).toBe(false);
      }),
      Match.when({ kind: "climb" }, (nonFly) => {
        expect("hover" in nonFly).toBe(false);
      }),
      Match.when({ kind: "swim" }, (nonFly) => {
        expect("hover" in nonFly).toBe(false);
      }),
      Match.exhaustive,
    );
  }
  Match.value(projection.generalFacts.resistances).pipe(
    Match.when({ kind: "none" }, () => undefined),
    Match.when({ kind: "fixed" }, ({ damageTypes }) => {
      expect(damageTypes.length).toBeGreaterThan(0);
    }),
    Match.when({ kind: "choose_one_from" }, ({ options }) => {
      expect(options.length).toBeGreaterThan(0);
    }),
    Match.exhaustive,
  );
  Match.value(projection.generalFacts.immunities).pipe(
    Match.when({ kind: "none" }, () => undefined),
    Match.when({ kind: "some" }, ({ value }) => {
      const fixed = new Set<string>(
        "conditions" in value ? value.conditions : [],
      );
      const qualified =
        "qualifiedConditions" in value ? value.qualifiedConditions : [];
      expect(qualified.every(({ condition }) => !fixed.has(condition))).toBe(
        true,
      );
    }),
    Match.exhaustive,
  );
}

describe("domain-valid scoped Stat Block projections", () => {
  test("round-trips constrained valid products through the production schema", () => {
    fc.assert(
      fc.property(projectionArbitrary, (candidate) => {
        const decoded = decodeProjection(candidate);
        expect(Either.isRight(decoded)).toBe(true);
        if (Either.isLeft(decoded)) return;
        expectIndependentProjectionInvariants(decoded.right);
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
    const sampledAttack = fc.sample(attackProcedure, {
      numRuns: 1,
      seed: 491,
    })[0];
    const sampledProjection = Schema.decodeUnknownSync(
      StatBlockScopedFidelityProjectionSchema,
    )(sampled);
    const candidate = Schema.decodeUnknownSync(
      StatBlockScopedFidelityProjectionSchema,
    )({
      ...sampledProjection,
      procedures: [sampledAttack],
    });
    const generalFacts = candidate.generalFacts;
    const firstProcedure = candidate.procedures[0];
    if (firstProcedure === undefined) {
      throw new Error(
        "The constrained projection generator omitted its attack",
      );
    }
    const procedure = Match.value(firstProcedure).pipe(
      Match.when({ kind: "attack_roll" }, (attack) => attack),
      Match.when({ kind: "textOnly" }, () => {
        throw new Error("The constrained projection generator made text-only");
      }),
      Match.when({ kind: "save" }, () => {
        throw new Error("The constrained projection generator made a save");
      }),
      Match.when({ kind: "multiattack" }, () => {
        throw new Error(
          "The constrained projection generator made multiattack",
        );
      }),
      Match.when({ kind: "action_option" }, () => {
        throw new Error("The constrained projection generator made options");
      }),
      Match.when({ kind: "spellcasting" }, () => {
        throw new Error(
          "The constrained projection generator made spellcasting",
        );
      }),
      Match.exhaustive,
    );
    const damage = procedure.onHit[0];
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
                amount: {
                  kind: "dice_expression",
                  static: 4,
                  expr: { dice: 1 },
                },
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
                  kind: "dice_expression",
                  static: 4,
                  expr: { dieSize: 6 },
                },
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
                  kind: "static",
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
                resourceLimits: [],
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
        generalFacts: { ...generalFacts, creatureTypeTags: ["swarm"] },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          savingThrowModifiers: [
            { ability: "dex", modifier: 2 },
            { ability: "dex", modifier: 4 },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          legendaryActionUses: { kind: "fixed", uses: 3 },
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          speeds: [{ kind: "gm_choice", alternatives: [] }],
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
                {
                  kind: "walk",
                  feet: { kind: "literal", value: 20 },
                  availability: {
                    kind: "forms_only",
                    forms: ["synthetic_form"],
                  },
                },
                { kind: "fly", feet: { kind: "literal", value: 20 } },
              ],
            },
          ],
        },
      },
      {
        ...candidate,
        generalFacts: {
          ...generalFacts,
          communication: {
            kind: "spoken_and_understood",
            languages: { kind: "named", languages: [] },
          },
        },
      },
      {
        ...candidate,
        traits: [
          {
            name: "Synthetic Trait",
            description: "Synthetic comparison evidence.",
            effect: null,
          },
        ],
      },
    ];

    const invalidLabels = [
      "melee attack with range",
      "ranged attack with reach",
      "attack with empty on-hit effects",
      "ranged attack with reversed range",
      "ambiguous attack with duplicate abilities",
      "ambiguous attack with one ability",
      "damage dice without die size",
      "damage die size without dice",
      "static damage with a modifier",
      "non-fly speed with explicit false hover",
      "non-fly speed with true hover",
      "GM speed choice with one alternative",
      "GM speed choice with duplicate alternatives",
      "nullable swarm sentinel",
      "swarm with invalid aggregate size",
      "empty fixed resistance",
      "empty chosen resistance",
      "empty present immunity",
      "overlapping fixed and qualified immunity",
      "empty multiattack dispatches",
      "empty action options",
      "material component true sentinel",
      "spellcasting with no groups",
      "at-will group with no spells",
      "limited group with no resources",
      "at-will group with a resource",
      "swarm encoded as creature type tag",
      "duplicate saving throw abilities",
      "legendary uses without legendary actions",
      "GM speed choice with no alternatives",
      "GM speed choice with restricted alternative",
      "named language set with no languages",
      "trait null effect sentinel",
    ] as const;

    expect(invalidCandidates).toHaveLength(invalidLabels.length);

    invalidCandidates.forEach((invalid, index) => {
      const label = invalidLabels[index] ?? "unlabeled invalid projection";
      const decoded = decodeProjection(invalid);
      expect(Either.isLeft(decoded), label).toBe(true);
      if (Either.isLeft(decoded)) {
        const message = String(decoded.left);
        if (label === "ambiguous attack with duplicate abilities") {
          expect(message, label).toContain("distinct abilities");
        }
        if (label === "overlapping fixed and qualified immunity") {
          expect(message, label).toContain(
            "cannot be both fixed and qualified",
          );
        }
        if (label === "legendary uses without legendary actions") {
          expect(message, label).toContain(
            "Legendary Action uses and a nonempty Legendary Action section",
          );
        }
      }
    });
  });
});
