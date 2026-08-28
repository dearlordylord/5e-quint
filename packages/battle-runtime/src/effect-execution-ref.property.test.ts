import fc from "fast-check";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { movementFeet } from "@dnd/shared/types";

import type {
  BattleActiveEffectOccurrenceTemplate,
  BattleAllocatedEffectOccurrence,
  BattleEffectOccurrenceAllocationTemplate,
} from "./effect-execution-ref.ts";
import {
  allocateBattleEffectOccurrenceTemplatesForCreature,
  spellActiveEffectForExecutionRef,
} from "./effect-execution-ref.ts";
import type { BattleCreatureState } from "./battle-state-execution.ts";
import {
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  goblinId,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
  wizardId,
} from "./battle-runtime.test-support.ts";
import {
  battleEffectExecutionRef,
  battleEffectExecutionRefBelongsToScope,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import {
  BattleHoleSchema,
  BattleSnapshotSchema,
} from "./battle-reducer/battle-codecs.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { replaceTargetActiveEffect } from "./battle-reducer/active-effect-replacement.ts";
import { updateCombatantWithActiveEffectOccurrence } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x3810cc } as const;

const OCCURRENCE_KINDS = [
  "heldLight",
  "findFamiliarSharedSenses",
  "spellLightEmitter",
] as const;
type OccurrenceKind = (typeof OCCURRENCE_KINDS)[number];
type OccurrenceDescriptor =
  | {
      readonly kind: Exclude<OccurrenceKind, "findFamiliarSharedSenses">;
      readonly marker: number;
      readonly sourceIsOwner: boolean;
    }
  | {
      readonly kind: "findFamiliarSharedSenses";
      readonly marker: number;
    };

const occurrenceDescriptorArbitrary: fc.Arbitrary<OccurrenceDescriptor> =
  fc.oneof(
    fc.record({
      kind: fc.constantFrom("heldLight" as const, "spellLightEmitter" as const),
      marker: fc.integer({ min: 0, max: 4 }),
      sourceIsOwner: fc.boolean(),
    }),
    fc.record({
      kind: fc.constant("findFamiliarSharedSenses" as const),
      marker: fc.integer({ min: 0, max: 4 }),
    }),
  );

const sourcedOccurrenceDescriptorArbitrary = fc.record({
  kind: fc.constantFrom("heldLight" as const, "spellLightEmitter" as const),
  marker: fc.integer({ min: 0, max: 4 }),
  sourceIsOwner: fc.boolean(),
});

function descriptorWithAlternateSource(
  descriptor: OccurrenceDescriptor,
): OccurrenceDescriptor {
  return descriptor.kind === "findFamiliarSharedSenses"
    ? descriptor
    : { ...descriptor, sourceIsOwner: false };
}

function occurrenceFixture(): {
  readonly state: ReturnType<typeof startBattleRight>;
  readonly fighter: BattleCreatureState;
  readonly goblin: BattleCreatureState;
} {
  const state = startBattleSessionRight({
    battleId: battleId("effect-occurrence-allocation-property"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        initiative: 20,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord("light"), spellRecord("produce_flame")],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  }).state;
  const fighter = state.combatants.get(wizardId);
  const goblin = state.combatants.get(goblinId);
  if (fighter === undefined || goblin === undefined) {
    throw new Error("Expected both effect occurrence allocation owners.");
  }
  return { state, fighter, goblin };
}

function lightProcedureRefForDescriptor(
  source: BattleCreatureState,
  descriptor: OccurrenceDescriptor,
): BattleProcedureExecutionRef | undefined {
  if (
    descriptor.kind === "findFamiliarSharedSenses" ||
    source.origin.kind !== "character"
  ) {
    return undefined;
  }
  const expectedProcedure =
    descriptor.kind === "heldLight" ? "heldLight" : "objectLight";
  const sourceProcedureRef = source.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === expectedProcedure,
  )?.procedureRef;
  if (sourceProcedureRef === undefined) {
    throw new Error(`Expected ${expectedProcedure} occurrence source.`);
  }
  return sourceProcedureRef;
}

function occurrenceTemplateWithBoundSource(input: {
  readonly descriptor: OccurrenceDescriptor;
  readonly source: BattleCreatureState;
  readonly ownerId: CombatantId;
  readonly alternateSourceId: CombatantId;
}): BattleEffectOccurrenceAllocationTemplate {
  const sourceProcedureRef = lightProcedureRefForDescriptor(
    input.source,
    input.descriptor,
  );
  return occurrenceTemplate({
    descriptor: input.descriptor,
    ownerId: input.ownerId,
    alternateSourceId: input.alternateSourceId,
    ...(sourceProcedureRef === undefined ? {} : { sourceProcedureRef }),
  });
}

function occurrenceTemplate(input: {
  readonly descriptor: OccurrenceDescriptor;
  readonly ownerId: CombatantId;
  readonly alternateSourceId: CombatantId;
  readonly sourceProcedureRef?: BattleProcedureExecutionRef;
}): BattleEffectOccurrenceAllocationTemplate {
  const { descriptor } = input;
  const sourceCombatantId =
    descriptor.kind === "findFamiliarSharedSenses" || descriptor.sourceIsOwner
      ? input.ownerId
      : input.alternateSourceId;
  const sourceProcedureRef =
    input.sourceProcedureRef ??
    battleProcedureExecutionRefForTest(
      `occurrence-source:${sourceCombatantId}:${descriptor.marker}`,
    );
  switch (descriptor.kind) {
    case "heldLight":
      return {
        kind: "activeEffect",
        effect: {
          kind: "heldLight",
          sourceCombatantId,
          sourceProcedureRef,
          brightRadiusFeet: movementFeet(descriptor.marker + 1),
          dimAdditionalFeet: movementFeet(descriptor.marker + 2),
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
            ownerId: input.ownerId,
            companionId: input.alternateSourceId,
          },
          sourceCombatantId,
          familiarId: input.alternateSourceId,
          canSeeThroughFamiliar: true,
          canHearThroughFamiliar: true,
          familiarSenses: [],
          expiresAt: { kind: "startOfTurn", combatantId: input.ownerId },
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
          kind: "heldLight",
          marker: 0,
          sourceIsOwner: true,
        } satisfies OccurrenceDescriptor,
      ],
    },
    {
      descriptors: [
        {
          kind: "heldLight",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
        {
          kind: "spellLightEmitter",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
        {
          kind: "heldLight",
          marker: 1,
          sourceIsOwner: false,
        } satisfies OccurrenceDescriptor,
      ],
    },
  ])(
    "allocates explicit empty, singleton, and repeated mixed edge %#",
    ({ descriptors }) => {
      const { fighter, goblin } = occurrenceFixture();
      const occurrences = descriptors.map((descriptor) =>
        occurrenceTemplateWithBoundSource({
          descriptor,
          source: fighter,
          ownerId: goblinId,
          alternateSourceId: wizardId,
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
          const { fighter, goblin } = occurrenceFixture();
          const occurrences = descriptors.map((descriptor) =>
            occurrenceTemplateWithBoundSource({
              descriptor,
              source: fighter,
              ownerId: goblinId,
              alternateSourceId: wizardId,
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
        fc.array(sourcedOccurrenceDescriptorArbitrary, {
          minLength: 1,
          maxLength: 8,
        }),
        (descriptors) => {
          const { fighter, goblin } = occurrenceFixture();
          const forGoblin = descriptors.map((descriptor) =>
            occurrenceTemplate({
              descriptor: descriptorWithAlternateSource(descriptor),
              ownerId: goblinId,
              alternateSourceId: wizardId,
            }),
          );
          const forFighter = descriptors.map((descriptor) =>
            occurrenceTemplate({
              descriptor: descriptorWithAlternateSource(descriptor),
              ownerId: wizardId,
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

          expect(
            goblinRefs.every((ref) =>
              battleEffectExecutionRefBelongsToScope(
                ref,
                goblin.origin.execution.scopeRef,
              ),
            ),
          ).toBe(true);
          expect(
            goblinRefs.every(
              (ref) =>
                !battleEffectExecutionRefBelongsToScope(
                  ref,
                  fighter.origin.execution.scopeRef,
                ),
            ),
          ).toBe(true);
          expect(
            fighterRefs.every((ref) =>
              battleEffectExecutionRefBelongsToScope(
                ref,
                fighter.origin.execution.scopeRef,
              ),
            ),
          ).toBe(true);
          expect(
            fighterRefs.every(
              (ref) =>
                !battleEffectExecutionRefBelongsToScope(
                  ref,
                  goblin.origin.execution.scopeRef,
                ),
            ),
          ).toBe(true);

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
          const { state: baseState, fighter, goblin } = occurrenceFixture();
          const heldLightSource = {
            kind: "heldLight",
            marker: 0,
            sourceIsOwner: false,
          } as const satisfies OccurrenceDescriptor;
          const heldLightProcedureRef = lightProcedureRefForDescriptor(
            fighter,
            heldLightSource,
          );
          if (heldLightProcedureRef === undefined) {
            throw new Error("Expected held-light replacement source.");
          }
          const template = {
            kind: "heldLight",
            sourceCombatantId: wizardId,
            sourceProcedureRef: heldLightProcedureRef,
            brightRadiusFeet: movementFeet(5),
            dimAdditionalFeet: movementFeet(5),
            expiresAt: { kind: "untilDispelled" },
          } as const satisfies BattleActiveEffectOccurrenceTemplate;
          const initial = battleStateWithAllocatedEffectOccurrencesForTest({
            state: baseState,
            occurrences: [
              { kind: "activeEffect", ownerId: goblinId, effect: template },
            ],
          });
          const initialOccurrence = initial.occurrences[0];
          if (
            initialOccurrence?.kind !== "activeEffect" ||
            initialOccurrence.effect.kind !== "heldLight"
          ) {
            throw new Error("Expected the allocated held-light occurrence.");
          }
          let state = initial.state;
          let currentEffect = initialOccurrence.effect;
          let replacementCount = 0;
          let mutationCount = 0;
          const seenRefs = new Set([currentEffect.effectRef]);

          for (const operation of operations) {
            const previousRef = currentEffect.effectRef;
            if (operation === "mutate") {
              mutationCount += 1;
              const updated = updateCombatantWithActiveEffectOccurrence(
                state.combatants,
                goblinId,
                currentEffect,
                (target) => ({
                  ...target,
                  activeEffects: target.activeEffects.map((effect) =>
                    effect.effectRef === previousRef &&
                    effect.kind === "heldLight"
                      ? {
                          ...effect,
                          brightRadiusFeet: movementFeet(5 + mutationCount),
                        }
                      : effect,
                  ),
                }),
              );
              expect(updated.tag).toBe("updated");
              state = { ...state, combatants: updated.combatants };
            } else {
              replacementCount += 1;
              state = replaceTargetActiveEffect(
                state,
                goblinId,
                (effect) => effect.effectRef === previousRef,
                template,
              );
            }
            const activeMatches =
              state.combatants
                .get(goblinId)
                ?.activeEffects.filter(
                  (effect) =>
                    effect.kind === "heldLight" &&
                    effect.sourceProcedureRef === template.sourceProcedureRef,
                ) ?? [];
            expect(activeMatches).toHaveLength(1);
            const [nextEffect] = activeMatches;
            if (nextEffect?.kind !== "heldLight") {
              throw new Error("Expected the current held-light occurrence.");
            }
            currentEffect = nextEffect;
            if (operation === "mutate") {
              expect(currentEffect.effectRef).toBe(previousRef);
              expect(Number(currentEffect.brightRadiusFeet)).toBe(
                5 + mutationCount,
              );
            } else {
              expect(currentEffect.effectRef).not.toBe(previousRef);
              expect(
                state.combatants
                  .get(goblinId)
                  ?.activeEffects.some(
                    (effect) => effect.effectRef === previousRef,
                  ),
              ).toBe(false);
              seenRefs.add(currentEffect.effectRef);
            }
          }

          expect(seenRefs.size).toBe(replacementCount + 1);
          expect(mutationCount + replacementCount).toBe(operations.length);
          expect(
            Number(state.combatants.get(goblinId)?.nextEffectOrdinal),
          ).toBe(Number(goblin.nextEffectOrdinal) + replacementCount + 1);
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
          const { state: baseState, fighter } = occurrenceFixture();
          const heldLightSource = {
            kind: "heldLight",
            marker: 0,
            sourceIsOwner: false,
          } as const satisfies OccurrenceDescriptor;
          const heldLightProcedureRef = lightProcedureRefForDescriptor(
            fighter,
            heldLightSource,
          );
          if (heldLightProcedureRef === undefined) {
            throw new Error("Expected held-light exact-selection source.");
          }
          const template = {
            kind: "heldLight",
            sourceCombatantId: wizardId,
            sourceProcedureRef: heldLightProcedureRef,
            brightRadiusFeet: movementFeet(initialRadius),
            dimAdditionalFeet: movementFeet(5),
            expiresAt: { kind: "untilDispelled" },
          } as const satisfies BattleActiveEffectOccurrenceTemplate;
          const initial = battleStateWithAllocatedEffectOccurrencesForTest({
            state: baseState,
            occurrences: [
              { kind: "activeEffect", ownerId: goblinId, effect: template },
            ],
          });
          const initialOccurrence = initial.occurrences[0];
          if (
            initialOccurrence?.kind !== "activeEffect" ||
            initialOccurrence.effect.kind !== "heldLight"
          ) {
            throw new Error("Expected the allocated held-light occurrence.");
          }
          const initialEffect = initialOccurrence.effect;
          const mutated = updateCombatantWithActiveEffectOccurrence(
            initial.state.combatants,
            goblinId,
            initialEffect,
            (target) => ({
              ...target,
              activeEffects: target.activeEffects.map((effect) =>
                effect.effectRef === initialEffect.effectRef &&
                effect.kind === "heldLight"
                  ? {
                      ...effect,
                      brightRadiusFeet: movementFeet(mutatedRadius),
                    }
                  : effect,
              ),
            }),
          );
          expect(mutated.tag).toBe("updated");
          const mutatedState = {
            ...initial.state,
            combatants: mutated.combatants,
          };
          const mutatedEffects =
            mutatedState.combatants.get(goblinId)?.activeEffects ?? [];
          expect(
            spellActiveEffectForExecutionRef(
              mutatedEffects,
              initialEffect.effectRef,
            ),
          ).toMatchObject({
            effectRef: initialEffect.effectRef,
            brightRadiusFeet: movementFeet(mutatedRadius),
          });

          const replacedState = replaceTargetActiveEffect(
            mutatedState,
            goblinId,
            (effect) => effect.effectRef === initialEffect.effectRef,
            template,
          );
          const replacedEffects =
            replacedState.combatants.get(goblinId)?.activeEffects ?? [];
          const replacement = replacedEffects.find(
            (effect) =>
              effect.kind === "heldLight" &&
              effect.sourceProcedureRef === template.sourceProcedureRef,
          );
          if (replacement?.kind !== "heldLight") {
            throw new Error("Expected the replacement held-light occurrence.");
          }
          expect(replacement.effectRef).not.toBe(initialEffect.effectRef);
          expect(
            spellActiveEffectForExecutionRef(
              replacedEffects,
              initialEffect.effectRef,
            ),
          ).toBeUndefined();
          expect(
            spellActiveEffectForExecutionRef(
              replacedEffects,
              replacement.effectRef,
            ),
          ).toBe(replacement);

          const removed = updateCombatantWithActiveEffectOccurrence(
            replacedState.combatants,
            goblinId,
            replacement,
            (target) => ({
              ...target,
              activeEffects: target.activeEffects.filter(
                (effect) => effect.effectRef !== replacement.effectRef,
              ),
            }),
          );
          expect(removed.tag).toBe("updated");
          const removedEffects =
            removed.combatants.get(goblinId)?.activeEffects ?? [];
          expect(removedEffects).toEqual([]);
          expect(
            spellActiveEffectForExecutionRef(
              removedEffects,
              replacement.effectRef,
            ),
          ).toBeUndefined();
          expect(
            updateCombatantWithActiveEffectOccurrence(
              removed.combatants,
              goblinId,
              replacement,
              (target) => target,
            ).tag,
          ).toBe("unchanged");
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
          const session = spellBattle({
            cantrips: [spellRecord("light"), spellRecord("produce_flame")],
            preparedSpells: [spellRecord("dispel_magic")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          });
          const state = session.state;
          const dispelAct = spellAct({
            session,
            spellId: "dispel_magic",
            slotLevel: 3,
          });
          const caster = state.combatants.get(spellCasterId);
          if (caster?.origin.kind !== "character") {
            throw new Error("Expected the character occurrence source.");
          }
          const heldLightProcedureRef =
            caster.origin.execution.procedureBindings.find(
              (binding) =>
                binding.procedure.kind === "spellInvocation" &&
                binding.procedure.execution.procedure === "heldLight",
            )?.procedureRef;
          const objectLightProcedureRef =
            caster.origin.execution.procedureBindings.find(
              (binding) =>
                binding.procedure.kind === "spellInvocation" &&
                binding.procedure.execution.procedure === "objectLight",
            )?.procedureRef;
          const dispelProcedureRef =
            caster.origin.execution.procedureBindings.find(
              (binding) =>
                binding.procedure.kind === "spellInvocation" &&
                binding.procedure.execution.procedure === "ongoingSpellEnd",
            )?.procedureRef;
          if (
            heldLightProcedureRef === undefined ||
            objectLightProcedureRef === undefined ||
            dispelProcedureRef === undefined
          ) {
            throw new Error("Expected light and Dispel source bindings.");
          }
          const descriptors: readonly OccurrenceDescriptor[] = [
            { kind: "heldLight", marker: 0, sourceIsOwner: false },
            { kind: "spellLightEmitter", marker: 0, sourceIsOwner: false },
            { kind: "findFamiliarSharedSenses", marker: 0 },
            ...generatedDescriptors,
          ];
          const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
            state,
            occurrences: descriptors.map((descriptor) => {
              const ownerId =
                descriptor.kind === "findFamiliarSharedSenses"
                  ? spellCasterId
                  : spellTargetId;
              return {
                ...occurrenceTemplate({
                  descriptor: descriptorWithAlternateSource(descriptor),
                  ownerId,
                  alternateSourceId:
                    ownerId === spellCasterId ? spellTargetId : spellCasterId,
                  sourceProcedureRef:
                    descriptor.kind === "spellLightEmitter"
                      ? objectLightProcedureRef
                      : heldLightProcedureRef,
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
          const decoded =
            Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded);
          expect(Schema.encodeSync(BattleSnapshotSchema)(decoded)).toEqual(
            encoded,
          );

          const goblin = encoded.combatants.find(
            (combatant) => combatant.combatantId === spellTargetId,
          );
          const fighterSnapshot = encoded.combatants.find(
            (combatant) => combatant.combatantId === spellCasterId,
          );
          if (goblin === undefined || fighterSnapshot === undefined) {
            throw new Error("Expected both encoded occurrence owners.");
          }
          const goblinOccurrence = goblin.effectOccurrences[0];
          const fighterOccurrence = fighterSnapshot.effectOccurrences[0];
          const goblinStoredOccurrence = goblin.effectOccurrences.find(
            (occurrence) => occurrence.kind === "storedLightEmitter",
          );
          if (
            goblinOccurrence === undefined ||
            fighterOccurrence === undefined ||
            goblinStoredOccurrence === undefined
          ) {
            throw new Error("Expected both encoded occurrence censuses.");
          }

          const withoutCensus = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === spellTargetId
                ? (({ effectOccurrences: _effectOccurrences, ...rest }) =>
                    rest)(combatant)
                : combatant,
            ),
          };
          const missingRef = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === spellTargetId
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
              combatant.combatantId === spellTargetId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.map(
                      (occurrence) =>
                        occurrence.effectRef ===
                        goblinStoredOccurrence.effectRef
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
              combatant.combatantId === spellTargetId
                ? {
                    ...combatant,
                    effectOccurrences: combatant.effectOccurrences.slice(1),
                  }
                : combatant.combatantId === spellCasterId
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
              ownerScopeRef: caster.origin.execution.scopeRef,
              ordinal: Number(fighterSnapshot.nextEffectOrdinal),
            }),
          );
          const future = {
            ...encoded,
            combatants: encoded.combatants.map((combatant) =>
              combatant.combatantId === spellCasterId
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
          const boundStoredOccurrenceHole = Schema.encodeSync(BattleHoleSchema)(
            Schema.decodeUnknownSync(BattleHoleSchema)({
              holeId: "battle:property:stored-occurrence-kind",
              holeInstanceKey: "battle:property:stored-occurrence-kind",
              label: "Property stored occurrence storage kind",
              kind: "spellcastingAbilityCheck",
              dc: 13,
              spellcastingAbilityCheck: {
                casterId: spellCasterId,
                sourceProcedureRef: dispelProcedureRef,
                target: {
                  kind: "magicalEffect",
                  effect: {
                    kind: "spellLightEmitter",
                    effectRef: goblinStoredOccurrence.effectRef,
                  },
                },
                contestedSpellLevel: 4,
              },
            }),
          );
          expect(dispelAct.subject.procedureRef).toBe(dispelProcedureRef);
          const snapshotWithBoundStoredOccurrence = {
            ...encoded,
            acts: [
              ...encoded.acts,
              {
                subject: dispelAct.subject,
                initialHoles: [boundStoredOccurrenceHole],
              },
            ],
          };
          expect(
            Result.isSuccess(
              Schema.decodeUnknownResult(BattleSnapshotSchema)(
                snapshotWithBoundStoredOccurrence,
              ),
            ),
          ).toBe(true);
          const crossKind = {
            ...snapshotWithBoundStoredOccurrence,
            acts: snapshotWithBoundStoredOccurrence.acts.map((act, index) =>
              index === snapshotWithBoundStoredOccurrence.acts.length - 1
                ? {
                    ...act,
                    initialHoles: act.initialHoles.map((hole) =>
                      hole.kind === "spellcastingAbilityCheck" &&
                      hole.spellcastingAbilityCheck.target.kind ===
                        "magicalEffect" &&
                      hole.spellcastingAbilityCheck.target.effect.kind ===
                        "spellLightEmitter"
                        ? {
                            ...hole,
                            spellcastingAbilityCheck: {
                              ...hole.spellcastingAbilityCheck,
                              target: {
                                ...hole.spellcastingAbilityCheck.target,
                                effect: {
                                  ...hole.spellcastingAbilityCheck.target
                                    .effect,
                                  effectRef: goblinOccurrence.effectRef,
                                },
                              },
                            },
                          }
                        : hole,
                    ),
                  }
                : act,
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
