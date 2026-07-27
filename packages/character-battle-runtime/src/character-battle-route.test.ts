import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS,
  CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS,
  CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS,
  CHARACTER_SESSION_SHEET_DERIVED_BATTLE_ACTS_ROUTE_ACTIONS,
  appendCharacterBattleFeatureResourceHandoffRoute,
  characterBattleEncounterCompositionRoute,
  characterBattleEncounterCompositionRouteStep,
  characterBattleInitProjectionRouteAfter,
  characterBattleInitProjectionRouteStep,
  characterBattleSettlementRouteStep,
  characterSessionSheetDerivedBattleActsRouteStep,
  composeBattleEncounterRoute,
  enterBattleRuntimeRoute,
  initialCharacterBattleEncounterCompositionRoute,
  initialCharacterBattleFeatureResourceHandoffRoute,
  initialCharacterBattleInitProjectionRoute,
  initialCharacterBattleSettlementRoute,
  initialCharacterSessionSheetDerivedBattleActsRoute,
  projectCharacterSheetToBattleRoute,
  recordCharacterBattleHandoffFactsRoute,
  rejectCharacterBattleHandoffRoute,
  settleBattleToCharacterSheetRoute,
  type CharacterBattleFeatureResourceRouteObservation,
} from "./character-battle-route.ts";

describe("character battle route ownership", () => {
  test("builds every init, encounter, session, and settlement route step", () => {
    expect(initialCharacterBattleInitProjectionRoute()).toEqual([]);
    for (const action of CHARACTER_BATTLE_INIT_PROJECTION_ROUTE_ACTIONS) {
      expect(
        characterBattleInitProjectionRouteStep([], action).length,
      ).toBeGreaterThan(0);
      expect(
        characterBattleInitProjectionRouteAfter(action).length,
      ).toBeGreaterThan(0);
    }

    expect(initialCharacterBattleEncounterCompositionRoute()).toEqual([]);
    for (const action of CHARACTER_BATTLE_ENCOUNTER_COMPOSITION_ROUTE_ACTIONS) {
      expect(
        characterBattleEncounterCompositionRouteStep([], action),
      ).not.toEqual([]);
    }
    expect(characterBattleEncounterCompositionRoute()).toHaveLength(5);

    expect(initialCharacterSessionSheetDerivedBattleActsRoute()).toEqual([]);
    for (const action of CHARACTER_SESSION_SHEET_DERIVED_BATTLE_ACTS_ROUTE_ACTIONS) {
      expect(
        characterSessionSheetDerivedBattleActsRouteStep([], action),
      ).not.toEqual([]);
    }

    for (const action of CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS) {
      expect(
        characterBattleSettlementRouteStep(
          initialCharacterBattleSettlementRoute(),
          action,
        ),
      ).not.toEqual([]);
    }
  });

  test("routes accepted and rejected feature-resource observations", () => {
    const tags = [
      "layOnHands",
      "featureResourceRest",
      "fontOfMagicSlotToPoints",
      "fontOfMagicPointsToSlot",
      "uncannyMetabolism",
      "metamagicBattleBridgeAccepted",
    ] as const satisfies readonly CharacterBattleFeatureResourceRouteObservation["tag"][];

    for (const tag of tags) {
      for (const result of [Either.right(null), Either.left(null)]) {
        const route = appendCharacterBattleFeatureResourceHandoffRoute(
          initialCharacterBattleFeatureResourceHandoffRoute(),
          { tag, result },
        );
        expect(route.length).toBeGreaterThan(1);
      }
    }
  });

  test("constructs primitive events and canonicalizes set-like facts", () => {
    expect(
      projectCharacterSheetToBattleRoute({
        subject: "sheetToBattleInit",
        owner: "characterBattleSheet",
      }),
    ).toMatchObject({ kind: "projectCharacterSheetToBattle" });
    expect(
      enterBattleRuntimeRoute({
        subject: "handoffBattleMutation",
        owner: "characterBattleRuntime",
      }),
    ).toMatchObject({ kind: "enterBattleRuntime" });
    expect(
      composeBattleEncounterRoute({
        subject: "handoffParticipantMembership",
        facts: [
          "sheetDerivedParticipantCandidate",
          "nonSheetParticipantMembership",
          "sheetDerivedParticipantCandidate",
        ],
        owner: "characterBattleEncounterSetup",
      }),
    ).toMatchObject({
      facts: [
        "nonSheetParticipantMembership",
        "sheetDerivedParticipantCandidate",
      ],
    });
    expect(
      rejectCharacterBattleHandoffRoute({
        subject: "battleToSheetSettlement",
        fill: "settlementRejection",
        holes: ["settlementConflict", "settlementConflict"],
        owner: "characterBattleSettlement",
      }),
    ).toMatchObject({
      kind: "rejectCharacterBattleHandoff",
      holes: ["settlementConflict"],
    });
    expect(
      settleBattleToCharacterSheetRoute({
        subject: "battleToSheetSettlement",
        fill: "battleDelta",
        holes: ["hitPointProjection"],
        owner: "characterBattleSettlement",
      }),
    ).toMatchObject({ kind: "settleBattleToCharacterSheet" });
    expect(
      recordCharacterBattleHandoffFactsRoute({
        subject: "handoffResourceProjection",
        facts: ["sourceExactSpellSlotDelta", "sourceExactSpellSlotDelta"],
        owner: "characterBattleResourceProjection",
      }),
    ).toMatchObject({ facts: ["sourceExactSpellSlotDelta"] });
  });
});
