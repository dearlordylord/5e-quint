import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { movementDeltaFeet, movementFeet } from "@dnd/shared/types";

import type {
  BattleActiveEffectOccurrenceTemplate,
  BattleAllocatedEffectOccurrence,
  BattleEffectOccurrenceAllocationTemplate,
} from "./effect-execution-ref.ts";
import {
  allocateBattleEffectOccurrenceTemplatesForCreature,
  allocateBattleEffectOccurrenceForCreature,
  spellActiveEffectForExecutionRef,
} from "./effect-execution-ref.ts";
import type { BattleCreatureState } from "./battle-state-execution.ts";
import {
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  fighterId,
  goblinId,
  spellRecord,
  startBattleRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  battleEffectExecutionRef,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import { BattleSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x3810cc } as const;

const OCCURRENCE_KINDS = [
  "speedDelta",
  "turnStartTemporaryHitPoints",
  "findFamiliarSharedSenses",
  "spellLightEmitter",
] as const;
type OccurrenceKind = (typeof OCCURRENCE_KINDS)[number];
type OccurrenceDescriptor = {
  readonly kind: OccurrenceKind;
  readonly marker: number;
  readonly sourceIsOwner: boolean;
};

const occurrenceDescriptorArbitrary: fc.Arbitrary<OccurrenceDescriptor> =
  fc.record({
    kind: fc.constantFrom(...OCCURRENCE_KINDS),
    marker: fc.integer({ min: 0, max: 4 }),
    sourceIsOwner: fc.boolean(),
  });

function occurrenceFixture(): {
  readonly state: ReturnType<typeof startBattleRight>;
  readonly fighter: BattleCreatureState;
  readonly goblin: BattleCreatureState;
} {
  const state = startBattleRight({
    battleId: battleId("effect-occurrence-allocation-property"),
    combatants: [
      characterSeed({
        initiative: 20,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord("light")],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const fighter = state.combatants.get(fighterId);
  const goblin = state.combatants.get(goblinId);
  if (fighter === undefined || goblin === undefined) {
    throw new Error("Expected both effect occurrence allocation owners.");
  }
  return { state, fighter, goblin };
}

function occurrenceTemplate(input: {
  readonly descriptor: OccurrenceDescriptor;
  readonly ownerId: CombatantId;
  readonly alternateSourceId: CombatantId;
  readonly sourceProcedureRef?: BattleProcedureExecutionRef;
}): BattleEffectOccurrenceAllocationTemplate {
  const { descriptor } = input;
  const sourceCombatantId = descriptor.sourceIsOwner
    ? input.ownerId
    : input.alternateSourceId;
  const sourceProcedureRef =
    input.sourceProcedureRef ??
    battleProcedureExecutionRefForTest(
      `occurrence-source:${sourceCombatantId}:${descriptor.marker}`,
    );
  switch (descriptor.kind) {
    case "speedDelta":
      return {
        kind: "activeEffect",
        effect: {
          kind: "speedDelta",
          sourceCombatantId,
          sourceProcedureRef,
          deltaFeet: movementDeltaFeet(descriptor.marker + 1),
          expiresAt: { kind: "untilDispelled" },
        },
      };
    case "turnStartTemporaryHitPoints":
      return {
        kind: "activeEffect",
        effect: {
          kind: "turnStartTemporaryHitPoints",
          sourceCombatantId,
          sourceProcedureRef,
          amount: descriptor.marker + 1,
          expiresAt: { kind: "untilDispelled" },
        },
      };
    case "findFamiliarSharedSenses":
      return {
        kind: "activeEffect",
        effect: {
          kind: "findFamiliarSharedSenses",
          source: {
            kind: "companionSharedSenses",
            ownerId: sourceCombatantId,
            companionId: input.alternateSourceId,
          },
          sourceCombatantId,
          familiarId: input.alternateSourceId,
          canSeeThroughFamiliar: true,
          canHearThroughFamiliar: true,
          familiarSenses: [],
          expiresAt: { kind: "startOfTurn", combatantId: sourceCombatantId },
        },
      };
    case "spellLightEmitter":
      return {
        kind: "storedLightEmitter",
        emitter: {
          kind: "spellLightEmitter",
          sourceCombatantId,
          sourceProcedureRef,
          attachment: {
            kind: "combatant",
            combatantId: input.ownerId,
          },
          emission: {
            kind: "dim",
            radiusFeet: movementFeet(descriptor.marker + 1),
          },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: { kind: "untilDispelled" },
        },
      };
  }
}

function occurrenceRef(
  occurrence: BattleAllocatedEffectOccurrence,
): BattleEffectExecutionRef {
  return occurrence.kind === "activeEffect"
    ? occurrence.effect.effectRef
    : occurrence.emitter.effectRef;
}

function occurrenceWithoutRef(occurrence: BattleAllocatedEffectOccurrence) {
  if (occurrence.kind === "activeEffect") {
    const { effectRef: _effectRef, ...effect } = occurrence.effect;
    return { kind: occurrence.kind, effect };
  }
  const { effectRef: _effectRef, ...emitter } = occurrence.emitter;
  return { kind: occurrence.kind, emitter };
}

function allocateSequentially(input: {
  readonly owner: BattleCreatureState;
  readonly occurrences: readonly BattleEffectOccurrenceAllocationTemplate[];
}) {
  return input.occurrences.reduce<{
    readonly owner: BattleCreatureState;
    readonly occurrences: readonly BattleAllocatedEffectOccurrence[];
  }>(
    (result, occurrence) => {
      const allocated = allocateBattleEffectOccurrenceTemplatesForCreature({
        owner: result.owner,
        occurrences: [occurrence],
      });
      return {
        owner: allocated.owner,
        occurrences: [...result.occurrences, ...allocated.occurrences],
      };
    },
    { owner: input.owner, occurrences: [] },
  );
}

describe("durable effect occurrence allocation properties", () => {
  test.each([
    { descriptors: [] as const },
    {
      descriptors: [
        {
          kind: "speedDelta",
          marker: 0,
          sourceIsOwner: true,
        } satisfies OccurrenceDescriptor,
      ],
    },
    {
      descriptors: [
        {
          kind: "speedDelta",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
        {
          kind: "spellLightEmitter",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
        {
          kind: "speedDelta",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
      ],
    },
  ])(
    "allocates explicit empty, singleton, and repeated mixed edge %#",
    ({ descriptors }) => {
      const { goblin } = occurrenceFixture();
      const occurrences = descriptors.map((descriptor) =>
        occurrenceTemplate({
          descriptor,
          ownerId: goblinId,
          alternateSourceId: fighterId,
        }),
      );
      const allocated = allocateBattleEffectOccurrenceTemplatesForCreature({
        owner: goblin,
        occurrences,
      });
      expect(allocated.occurrences).toHaveLength(occurrences.length);
      expect(Number(allocated.owner.nextEffectOrdinal)).toBe(
        Number(goblin.nextEffectOrdinal) + occurrences.length,
      );
    },
  );

  test("preserves order and facts while matching sequential allocation", () => {
    fc.assert(
      fc.property(
        fc.array(occurrenceDescriptorArbitrary, { maxLength: 12 }),
        (descriptors) => {
          const { goblin } = occurrenceFixture();
          const occurrences = descriptors.map((descriptor) =>
            occurrenceTemplate({
              descriptor,
              ownerId: goblinId,
              alternateSourceId: fighterId,
            }),
          );
          const templatesBefore = structuredClone(occurrences);
          const batch = allocateBattleEffectOccurrenceTemplatesForCreature({
            owner: goblin,
            occurrences,
          });
          const sequential = allocateSequentially({
            owner: goblin,
            occurrences,
          });
          const refs = batch.occurrences.map(occurrenceRef);

          expect(occurrences).toEqual(templatesBefore);
          expect(batch.occurrences.map(occurrenceWithoutRef)).toEqual(
            occurrences,
          );
          expect(new Set(refs).size).toBe(refs.length);
          expect(batch.occurrences).toEqual(sequential.occurrences);
          expect(batch.owner.nextEffectOrdinal).toBe(
            sequential.owner.nextEffectOrdinal,
          );
          expect(Number(batch.owner.nextEffectOrdinal)).toBe(
            Number(goblin.nextEffectOrdinal) + occurrences.length,
          );
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("scopes identical batches to two owners independently of source", () => {
    fc.assert(
      fc.property(
        fc.array(occurrenceDescriptorArbitrary, {
          minLength: 1,
          maxLength: 8,
        }),
        (descriptors) => {
          const { fighter, goblin } = occurrenceFixture();
          const forGoblin = descriptors.map((descriptor) =>
            occurrenceTemplate({
              descriptor: { ...descriptor, sourceIsOwner: false },
              ownerId: goblinId,
              alternateSourceId: fighterId,
            }),
          );
          const forFighter = descriptors.map((descriptor) =>
            occurrenceTemplate({
              descriptor: { ...descriptor, sourceIsOwner: false },
              ownerId: fighterId,
              alternateSourceId: goblinId,
            }),
          );
          const goblinAllocation =
            allocateBattleEffectOccurrenceTemplatesForCreature({
              owner: goblin,
              occurrences: forGoblin,
            });
          const fighterAllocation =
            allocateBattleEffectOccurrenceTemplatesForCreature({
              owner: fighter,
              occurrences: forFighter,
            });
          const goblinRefs = goblinAllocation.occurrences.map(occurrenceRef);
          const fighterRefs = fighterAllocation.occurrences.map(occurrenceRef);

          expect(new Set([...goblinRefs, ...fighterRefs]).size).toBe(
            goblinRefs.length + fighterRefs.length,
          );
          expect(
            goblinAllocation.occurrences.map(occurrenceWithoutRef),
          ).toEqual(forGoblin);
          expect(
            fighterAllocation.occurrences.map(occurrenceWithoutRef),
          ).toEqual(forFighter);
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("mutations preserve a ref while replacements allocate fresh refs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("mutate" as const, "replace" as const), {
          maxLength: 16,
        }),
        (operations) => {
          const { goblin } = occurrenceFixture();
          const template = {
            kind: "speedDelta",
            sourceCombatantId: fighterId,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "replacement-property",
            ),
            deltaFeet: movementDeltaFeet(5),
            expiresAt: { kind: "untilDispelled" },
          } as const satisfies BattleActiveEffectOccurrenceTemplate;
          let allocation = allocateBattleEffectOccurrenceForCreature({
            owner: goblin,
            effect: template,
          });
          let replacementCount = 0;
          let mutationCount = 0;
          const seenRefs = new Set([allocation.effect.effectRef]);

          for (const operation of operations) {
            const previousRef = allocation.effect.effectRef;
            if (operation === "mutate") {
              mutationCount += 1;
              allocation = {
                owner: allocation.owner,
                effect: {
                  ...allocation.effect,
                  deltaFeet: movementDeltaFeet(5 + mutationCount),
                },
              };
              expect(allocation.effect.effectRef).toBe(previousRef);
              expect(Number(allocation.effect.deltaFeet)).toBe(
                5 + mutationCount,
              );
            } else {
              replacementCount += 1;
              allocation = allocateBattleEffectOccurrenceForCreature({
                owner: allocation.owner,
                effect: template,
              });
              expect(allocation.effect.effectRef).not.toBe(previousRef);
              seenRefs.add(allocation.effect.effectRef);
            }
          }

          expect(seenRefs.size).toBe(replacementCount + 1);
          expect(mutationCount + replacementCount).toBe(operations.length);
          expect(Number(allocation.owner.nextEffectOrdinal)).toBe(
            Number(goblin.nextEffectOrdinal) + replacementCount + 1,
          );
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("exact selection rejects stale refs after replacement and removal", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: 1, max: 120 }),
        (initialRadius, mutatedRadius) => {
          const { goblin } = occurrenceFixture();
          const template = {
            kind: "heldLight",
            sourceCombatantId: fighterId,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "held-light-property",
            ),
            brightRadiusFeet: movementFeet(initialRadius),
            dimAdditionalFeet: movementFeet(5),
            expiresAt: { kind: "untilDispelled" },
          } as const satisfies BattleActiveEffectOccurrenceTemplate;
          const initial = allocateBattleEffectOccurrenceForCreature({
            owner: goblin,
            effect: template,
          });
          const mutatedEffects = [
            {
              ...initial.effect,
              brightRadiusFeet: movementFeet(mutatedRadius),
            },
          ];
          expect(
            spellActiveEffectForExecutionRef(
              mutatedEffects,
              initial.effect.effectRef,
            ),
          ).toMatchObject({
            effectRef: initial.effect.effectRef,
            brightRadiusFeet: movementFeet(mutatedRadius),
          });

          const replacement = allocateBattleEffectOccurrenceForCreature({
            owner: initial.owner,
            effect: template,
          });
          const replacedEffects = [replacement.effect];
          expect(replacement.effect.effectRef).not.toBe(
            initial.effect.effectRef,
          );
          expect(
            spellActiveEffectForExecutionRef(
              replacedEffects,
              initial.effect.effectRef,
            ),
          ).toBeUndefined();
          expect(
            spellActiveEffectForExecutionRef(
              replacedEffects,
              replacement.effect.effectRef,
            ),
          ).toBe(replacement.effect);

          const removedEffects = replacedEffects.filter(
            (effect) => effect.effectRef !== replacement.effect.effectRef,
          );
          expect(removedEffects).toEqual([]);
          expect(
            spellActiveEffectForExecutionRef(
              removedEffects,
              replacement.effect.effectRef,
            ),
          ).toBeUndefined();
          expect(
            removedEffects.filter(
              (effect) => effect.effectRef !== replacement.effect.effectRef,
            ),
          ).toEqual(removedEffects);
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("snapshot codecs reject bounded occurrence-census mutations", () => {
    fc.assert(
      fc.property(
        fc.array(occurrenceDescriptorArbitrary, { maxLength: 6 }),
        (generatedDescriptors) => {
          const { state, fighter } = occurrenceFixture();
          if (fighter.origin.kind !== "character") {
            throw new Error("Expected the character occurrence source.");
          }
          const sourceProcedureRef =
            fighter.origin.execution.procedureBindings.find(
              (binding) => binding.procedure.kind === "spellInvocation",
            )?.procedureRef;
          if (sourceProcedureRef === undefined) {
            throw new Error("Expected the spell occurrence source binding.");
          }
          const descriptors: readonly OccurrenceDescriptor[] = [
            { kind: "speedDelta", marker: 0, sourceIsOwner: false },
            { kind: "spellLightEmitter", marker: 0, sourceIsOwner: false },
            ...generatedDescriptors,
          ];
          const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
            state,
            occurrences: descriptors.map((descriptor, index) => {
              const ownerId = index % 2 === 0 ? goblinId : fighterId;
              return {
                ...occurrenceTemplate({
                  descriptor: { ...descriptor, sourceIsOwner: false },
                  ownerId,
                  alternateSourceId: fighterId,
                  sourceProcedureRef,
                }),
                ownerId,
              };
            }),
          });
          const encoded = Schema.encodeSync(BattleSnapshotSchema)(
            snapshotBattle(allocated.state),
          );
          expect(
            Result.isSuccess(
              Schema.decodeUnknownResult(BattleSnapshotSchema)(encoded),
            ),
          ).toBe(true);

          const goblin = encoded.combatants.find(
            (combatant) => combatant.combatantId === goblinId,
          );
          const fighterSnapshot = encoded.combatants.find(
            (combatant) => combatant.combatantId === fighterId,
          );
          if (goblin === undefined || fighterSnapshot === undefined) {
            throw new Error("Expected both encoded occurrence owners.");
          }
          const goblinOccurrence = goblin.effectOccurrences[0];
          const fighterOccurrence = fighterSnapshot.effectOccurrences[0];
          if (
            goblinOccurrence === undefined ||
            fighterOccurrence === undefined
          ) {
            throw new Error("Expected both encoded occurrence censuses.");
          }

          const withoutCensus = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === goblinId
                ? (({ effectOccurrences: _effectOccurrences, ...rest }) =>
                    rest)(combatant)
                : combatant,
            ),
          };
          const missingRef = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === goblinId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.map(
                      (occurrence, index) =>
                        index === 0
                          ? (({ effectRef: _effectRef, ...rest }) => rest)(
                              occurrence,
                            )
                          : occurrence,
                    ),
                  }
                : combatant,
            ),
          };
          const duplicateAcrossKinds = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === fighterId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.map(
                      (occurrence, index) =>
                        index === 0
                          ? {
                              ...occurrence,
                              effectRef: goblinOccurrence.effectRef,
                            }
                          : occurrence,
                    ),
                  }
                : combatant,
            ),
          };
          const wrongOwner = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === goblinId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.slice(1),
                  }
                : combatant.combatantId === fighterId
                  ? {
                      ...combatant,
                      effectOccurrences: [
                        ...combatant.effectOccurrences,
                        goblinOccurrence,
                      ],
                    }
                  : combatant,
            ),
          };
          const futureRef = battleEffectExecutionRef(
            JSON.stringify({
              kind: "effectOccurrence",
              ownerScopeRef: fighter.origin.execution.scopeRef,
              ordinal: Number(fighterSnapshot.nextEffectOrdinal),
            }),
          );
          const future = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === fighterId
                ? {
                    ...combatant,
                    effectOccurrences: [
                      ...combatant.effectOccurrences,
                      {
                        ...fighterOccurrence,
                        effectRef: futureRef,
                      },
                    ],
                  }
                : combatant,
            ),
          };
          const crossKind = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === goblinId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.map(
                      (occurrence, index) =>
                        index === 0
                          ? {
                              ...occurrence,
                              kind:
                                occurrence.kind === "activeEffect"
                                  ? ("storedLightEmitter" as const)
                                  : ("activeEffect" as const),
                            }
                          : occurrence,
                    ),
                  }
                : combatant,
            ),
          };
          const injectedProjectionRef = {
            ...encoded,
            lightEmitters: encoded.lightEmitters.map((emitter, index) =>
              index === 0
                ? { ...emitter, effectRef: goblinOccurrence.effectRef }
                : emitter,
            ),
          };

          for (const invalid of [
            withoutCensus,
            missingRef,
            duplicateAcrossKinds,
            wrongOwner,
            future,
            crossKind,
            injectedProjectionRef,
          ]) {
            expect(
              Result.isFailure(
                Schema.decodeUnknownResult(BattleSnapshotSchema)(invalid),
              ),
            ).toBe(true);
          }
        },
      ),
      { ...PROPERTY_OPTIONS, numRuns: 24 },
    );
  });
});
