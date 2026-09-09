import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { NonNegativeInteger, movementFeet } from "@dnd/shared/types";
import { cantripSpellInvocationRef } from "./battle-subjects.ts";
import {
  BattleActDiscoveryCandidateSchema,
  BattleCheckpointFrontierHolesSchema,
  BattleDroppedObjectOutcomeSchema,
  BattleFallingCreatureMitigationTriggerFactSchema,
  BattleInterruptDecisionFillSchema,
  BattleObjectDamageOutcomeSchema,
  BattleObjectIgnitionOutcomeSchema,
  BattleShovePushOutcomeSchema,
  BattleSpellPresentationSchema,
  BattleUnitSupportSourceSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  battleCharacterExecutionScopeRef,
  battleId,
  battleObjectId,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
  battleTablePositionId,
  combatantId,
  battleExecutionScopeOrdinal,
} from "./identity.ts";
import {
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";

const codecBattleId = battleId("sr04g-codec");
const sourceCombatantId = combatantId("sr04g-source");
const targetCombatantId = combatantId("sr04g-target");
const sourceScope = battleCharacterExecutionScopeRef(
  codecBattleId,
  sourceCombatantId,
  battleExecutionScopeOrdinal(0),
);
const sourceProcedureRef = battleProcedureExecutionRef(
  sourceScope,
  NonNegativeInteger(0),
);
const formExecutionRef = battleStatBlockExecutionScopeRef(
  codecBattleId,
  sourceCombatantId,
  battleExecutionScopeOrdinal(1),
);

describe("SR-04 battle codec contracts", () => {
  test("round-trips falling witnesses across both trigger forms", () => {
    const reactorFalls = {
      kind: "fallingCreatureMitigationTrigger",
      reactorId: sourceCombatantId,
      sourceProcedureRef,
      witness: { kind: "reactorFalls" },
    };
    const visibleCreatureFalls = {
      kind: "fallingCreatureMitigationTrigger",
      reactorId: sourceCombatantId,
      sourceProcedureRef,
      witness: {
        kind: "visibleCreatureFalls",
        fallingCreatureId: targetCombatantId,
        distanceFeet: movementFeet(30),
      },
    };

    for (const value of [reactorFalls, visibleCreatureFalls]) {
      const decoded = Schema.decodeUnknownSync(
        BattleFallingCreatureMitigationTriggerFactSchema,
      )(value);
      expect(
        Schema.decodeUnknownSync(
          BattleFallingCreatureMitigationTriggerFactSchema,
        )(
          Schema.encodeSync(BattleFallingCreatureMitigationTriggerFactSchema)(
            decoded,
          ),
        ),
      ).toEqual(decoded);
    }

    const malformed = Schema.decodeUnknownResult(
      BattleFallingCreatureMitigationTriggerFactSchema,
    )({
      ...visibleCreatureFalls,
      witness: {
        ...visibleCreatureFalls.witness,
        distanceFeet: -1,
      },
    });
    expect(Result.isFailure(malformed)).toBe(true);
    if (Result.isFailure(malformed)) {
      expect(String(malformed.failure)).toContain("distanceFeet");
    }
  });

  test("round-trips object outcomes and enforces damage transition invariants", () => {
    const ordinary = Schema.decodeUnknownSync(BattleObjectDamageOutcomeSchema)({
      kind: "hitPoints",
      objectId: battleObjectId("sr04g-damaged-object"),
      components: [{ damageType: "fire", rolledDamage: 5 }],
      rolledDamage: 5,
      damageAfterImmunities: 5,
      damageThreshold: null,
      effectiveDamage: 5,
      priorHitPoints: 10,
      nextHitPoints: 5,
      destroyed: false,
    });
    const thresholdBlocked = Schema.decodeUnknownSync(
      BattleObjectDamageOutcomeSchema,
    )({
      kind: "hitPoints",
      objectId: battleObjectId("sr04g-threshold-object"),
      components: [
        { damageType: "poison", rolledDamage: 4 },
        { damageType: "psychic", rolledDamage: 2 },
        { damageType: "fire", rolledDamage: 3 },
      ],
      rolledDamage: 9,
      damageAfterImmunities: 3,
      damageThreshold: 5,
      effectiveDamage: 0,
      priorHitPoints: 10,
      nextHitPoints: 10,
      destroyed: false,
    });
    const tableResolved = Schema.decodeUnknownSync(
      BattleObjectDamageOutcomeSchema,
    )({
      kind: "tableResolved",
      objectId: battleObjectId("sr04g-table-object"),
      components: [{ damageType: "bludgeoning", rolledDamage: 6 }],
      rolledDamage: 6,
    });

    for (const value of [ordinary, thresholdBlocked, tableResolved]) {
      const encoded = Schema.encodeSync(BattleObjectDamageOutcomeSchema)(value);
      expect(
        Schema.decodeUnknownSync(BattleObjectDamageOutcomeSchema)(encoded),
      ).toEqual(value);
    }

    const inconsistent = Schema.decodeUnknownResult(
      BattleObjectDamageOutcomeSchema,
    )({
      kind: "hitPoints",
      objectId: battleObjectId("sr04g-invalid-object"),
      components: [{ damageType: "fire", rolledDamage: 5 }],
      rolledDamage: 6,
      damageAfterImmunities: 5,
      damageThreshold: null,
      effectiveDamage: 5,
      priorHitPoints: 10,
      nextHitPoints: 5,
      destroyed: false,
    });
    expect(Result.isFailure(inconsistent)).toBe(true);
    if (Result.isFailure(inconsistent)) {
      expect(String(inconsistent.failure)).toContain(
        "Object damage components",
      );
    }
  });

  test("round-trips object ignition, drop provenance, and shove dispositions", () => {
    const ignition = {
      kind: "startsBurning",
      objectId: battleObjectId("sr04g-ignited-object"),
      sourceCombatantId,
      sourceProcedureRef,
    };
    const decodedIgnition = Schema.decodeUnknownSync(
      BattleObjectIgnitionOutcomeSchema,
    )(ignition);
    expect(
      Schema.decodeUnknownSync(BattleObjectIgnitionOutcomeSchema)(
        Schema.encodeSync(BattleObjectIgnitionOutcomeSchema)(decodedIgnition),
      ),
    ).toEqual(decodedIgnition);

    const droppedObjects = [
      {
        kind: "objectDropped",
        actorId: sourceCombatantId,
        objectId: battleObjectId("sr04g-spell-dropped-object"),
        source: {
          kind: "spell",
          sourceCombatantId,
          sourceProcedureRef,
        },
      },
      {
        kind: "objectDropped",
        actorId: sourceCombatantId,
        objectId: battleObjectId("sr04g-companion-dropped-object"),
        source: {
          kind: "companionDisappearance",
          ownerId: sourceCombatantId,
          companionId: targetCombatantId,
        },
      },
      {
        kind: "objectDropped",
        actorId: sourceCombatantId,
        objectId: battleObjectId("sr04g-wild-shape-dropped-object"),
        source: {
          kind: "druidWildShape",
          procedureRef: sourceProcedureRef,
          formExecutionRef,
        },
      },
    ];
    for (const dropped of droppedObjects) {
      const decoded = Schema.decodeUnknownSync(
        BattleDroppedObjectOutcomeSchema,
      )(dropped);
      expect(
        Schema.decodeUnknownSync(BattleDroppedObjectOutcomeSchema)(
          Schema.encodeSync(BattleDroppedObjectOutcomeSchema)(decoded),
        ),
      ).toEqual(decoded);
    }

    const shoveDispositions = [
      {
        targetId: targetCombatantId,
        disposition: {
          kind: "pushed",
          distanceFeet: movementFeet(10),
          destinationId: battleTablePositionId("sr04g-destination"),
          provokesOpportunityAttacks: false,
        },
      },
      {
        targetId: targetCombatantId,
        disposition: {
          kind: "blocked",
          distanceFeet: movementFeet(0),
          reason: "noLegalDestination",
          provokesOpportunityAttacks: false,
        },
      },
    ];
    for (const disposition of shoveDispositions) {
      const decoded = Schema.decodeUnknownSync(BattleShovePushOutcomeSchema)(
        disposition,
      );
      expect(
        Schema.decodeUnknownSync(BattleShovePushOutcomeSchema)(
          Schema.encodeSync(BattleShovePushOutcomeSchema)(decoded),
        ),
      ).toEqual(decoded);
    }

    const malformed = Schema.decodeUnknownResult(
      BattleDroppedObjectOutcomeSchema,
    )({
      ...droppedObjects[0],
      source: { ...droppedObjects[0].source, kind: "unknown" },
    });
    expect(Result.isFailure(malformed)).toBe(true);
    if (Result.isFailure(malformed)) {
      expect(String(malformed.failure)).toContain("source");
    }
  });

  test("round-trips support-source and spell-presentation codecs with exact tags", () => {
    const supportSource = {
      id: unitId("sr04g-alternate-action-cost"),
      syntheticLabel: "Synthetic alternate action cost",
      provenance: { kind: "classic-2024-mechanics-source-lane" },
      kind: "class_feature",
      mechanics: {
        family: "alternate_action_cost",
        from: { kind: "standard_action", actions: ["dash"] },
        to: { kind: "bonus_action" },
      },
    };
    const decodedSupport = Schema.decodeUnknownSync(
      BattleUnitSupportSourceSchema,
    )(supportSource);
    expect(
      Schema.decodeUnknownSync(BattleUnitSupportSourceSchema)(
        Schema.encodeSync(BattleUnitSupportSourceSchema)(decodedSupport),
      ),
    ).toEqual(decodedSupport);

    const presentation = {
      kind: "spell",
      procedureRef: sourceProcedureRef,
      invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
    };
    const decodedPresentation = Schema.decodeUnknownSync(
      BattleSpellPresentationSchema,
    )(presentation);
    expect(
      Schema.decodeUnknownSync(BattleSpellPresentationSchema)(
        Schema.encodeSync(BattleSpellPresentationSchema)(decodedPresentation),
      ),
    ).toEqual(decodedPresentation);

    const malformed = Schema.decodeUnknownResult(BattleUnitSupportSourceSchema)(
      {
        ...supportSource,
        provenance: { kind: "unknown-source" },
      },
    );
    expect(Result.isFailure(malformed)).toBe(true);
    if (Result.isFailure(malformed)) {
      expect(String(malformed.failure)).toContain("provenance");
    }
  });

  test("round-trips interrupt fills and a live holes frontier", () => {
    const interruptFills = [
      {
        kind: "interruptDecision",
        holeId: "sr04g-interrupt-hole",
        value: { kind: "decline", responderId: fighterId },
      },
      {
        kind: "interruptDecision",
        holeId: "sr04g-interrupt-hole",
        value: {
          kind: "resolve",
          responderId: fighterId,
          choice: { kind: "releaseReadiedMovement", fills: [] },
        },
      },
    ];
    for (const fill of interruptFills) {
      const decoded = Schema.decodeUnknownSync(
        BattleInterruptDecisionFillSchema,
      )(fill);
      expect(
        Schema.decodeUnknownSync(BattleInterruptDecisionFillSchema)(
          Schema.encodeSync(BattleInterruptDecisionFillSchema)(decoded),
        ),
      ).toEqual(decoded);
    }

    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const result = resolveBattleSubject({ state, subject, fills: [] });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected an attack subject to expose holes.");
    }
    const candidate = findAct(state, subject);
    const decodedCandidate = Schema.decodeUnknownSync(
      BattleActDiscoveryCandidateSchema,
    )(candidate);
    expect(
      Schema.decodeUnknownSync(BattleActDiscoveryCandidateSchema)(
        Schema.encodeSync(BattleActDiscoveryCandidateSchema)(decodedCandidate),
      ),
    ).toEqual(decodedCandidate);

    const frontier = {
      kind: "holes" as const,
      subject: result.subject,
      holes: result.holes,
      continuation: { kind: "ordinaryReplay" as const },
    };
    const decodedFrontier = Schema.decodeUnknownSync(
      BattleCheckpointFrontierHolesSchema,
    )(frontier);
    expect(
      Schema.decodeUnknownSync(BattleCheckpointFrontierHolesSchema)(
        Schema.encodeSync(BattleCheckpointFrontierHolesSchema)(decodedFrontier),
      ),
    ).toEqual(decodedFrontier);

    const malformed = Schema.decodeUnknownResult(
      BattleCheckpointFrontierHolesSchema,
    )({
      ...frontier,
      holes: [],
    });
    expect(Result.isFailure(malformed)).toBe(true);
    if (Result.isFailure(malformed)) {
      expect(String(malformed.failure)).toContain("holes");
    }
  });
});
