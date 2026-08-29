// RAW trace: .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field
// No one can teleport into or out of an Antimagic Field aura.
import { describe, expect, test } from "vitest";

import {
  magicSuppressionEmanationEffectTemplateForTest,
  magicSuppressionEmanationMembershipForTest,
} from "./antimagic-field.test-support.ts";
import { battleStateWithAllocatedEffectForTest } from "./battle-runtime.test-support.ts";
import {
  ANTIMAGIC_FIELD_TRANSIT_BLOCKING_MESSAGE,
  magicSuppressionTransitInvalidReason,
} from "./battle-reducer/antimagic-field-transit-blocking.ts";
import {
  battleAreaId,
  type BattleMagicSuppressionTransitWitness,
  type BattleState,
} from "./index.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";

const antimagicFieldAreaId = battleAreaId(
  "unit-profile-antimagic-transit-blocking-area",
);
const unmatchedAntimagicFieldAreaId = battleAreaId(
  "unit-profile-unmatched-antimagic-transit-area",
);

describe("Antimagic Field teleport transit witnesses", () => {
  test("accepts an empty witness set when no aura is active", () => {
    expect(
      magicSuppressionTransitInvalidReason({
        state: transitBattleState(),
        actorId: spellCasterId,
        witnesses: [],
      }),
    ).toBeNull();
  });

  test.each([
    {
      name: "outside the aura",
      actorInsideAura: false,
      destinationInsideAura: false,
    },
    {
      name: "inside the aura",
      actorInsideAura: true,
      destinationInsideAura: true,
    },
  ])(
    "accepts matching origin and destination facts $name",
    ({ actorInsideAura, destinationInsideAura }) => {
      expect(
        magicSuppressionTransitInvalidReason({
          state: activeAntimagicTransitState(actorInsideAura),
          actorId: spellCasterId,
          witnesses: [
            antimagicTransitWitness({
              originInsideAura: actorInsideAura,
              destinationInsideAura,
            }),
          ],
        }),
      ).toBeNull();
    },
  );

  test("rejects a witness that does not identify one active aura", () => {
    expect(
      magicSuppressionTransitInvalidReason({
        state: transitBattleState(),
        actorId: spellCasterId,
        witnesses: [
          {
            ...antimagicTransitWitness({
              originInsideAura: false,
              destinationInsideAura: false,
            }),
            areaId: unmatchedAntimagicFieldAreaId,
          },
        ],
      }),
    ).toBe("Antimagic Field transit witness must reference one active aura.");
  });

  test.each([
    { name: "missing", witnesses: [] },
    {
      name: "duplicated",
      witnesses: [
        antimagicTransitWitness({
          originInsideAura: false,
          destinationInsideAura: false,
        }),
        antimagicTransitWitness({
          originInsideAura: false,
          destinationInsideAura: false,
        }),
      ],
    },
  ] satisfies ReadonlyArray<{
    readonly name: string;
    readonly witnesses: readonly BattleMagicSuppressionTransitWitness[];
  }>)("rejects a $name witness for an active aura", ({ witnesses }) => {
    expect(
      magicSuppressionTransitInvalidReason({
        state: activeAntimagicTransitState(false),
        actorId: spellCasterId,
        witnesses,
      }),
    ).toBe(
      "Teleport destination table fact must include one Antimagic Field transit witness for each active aura.",
    );
  });

  test("rejects an origin fact that disagrees with active aura membership", () => {
    expect(
      magicSuppressionTransitInvalidReason({
        state: activeAntimagicTransitState(true),
        actorId: spellCasterId,
        witnesses: [
          antimagicTransitWitness({
            originInsideAura: false,
            destinationInsideAura: false,
          }),
        ],
      }),
    ).toBe(
      "Antimagic Field transit origin witness must match the active aura membership.",
    );
  });

  test.each([
    {
      name: "into",
      actorInsideAura: false,
      destinationInsideAura: true,
    },
    {
      name: "out of",
      actorInsideAura: true,
      destinationInsideAura: false,
    },
  ])(
    "blocks teleportation $name an active aura",
    ({ actorInsideAura, destinationInsideAura }) => {
      expect(
        magicSuppressionTransitInvalidReason({
          state: activeAntimagicTransitState(actorInsideAura),
          actorId: spellCasterId,
          witnesses: [
            antimagicTransitWitness({
              originInsideAura: actorInsideAura,
              destinationInsideAura,
            }),
          ],
        }),
      ).toBe(ANTIMAGIC_FIELD_TRANSIT_BLOCKING_MESSAGE);
    },
  );
});

function transitBattleState(): BattleState {
  return spellBattle({}).state;
}

function activeAntimagicTransitState(actorInsideAura: boolean): BattleState {
  const state = transitBattleState();
  const aura = magicSuppressionEmanationMembershipForTest({
    sourceCombatantId: spellTargetId,
    originIncluded: true,
    nonOriginCombatantIds: actorInsideAura ? [spellCasterId] : [],
  });
  const sourceBefore = state.combatants.get(aura.sourceCombatantId);
  if (sourceBefore === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  const withAura = battleStateWithAllocatedEffectForTest({
    state,
    ownerId: aura.sourceCombatantId,
    effect: magicSuppressionEmanationEffectTemplateForTest({
      areaId: antimagicFieldAreaId,
      aura,
    }),
  });
  expect(
    Number(withAura.combatants.get(aura.sourceCombatantId)?.nextEffectOrdinal),
  ).toBe(Number(sourceBefore.nextEffectOrdinal) + 1);
  return withAura;
}

function antimagicTransitWitness(input: {
  readonly originInsideAura: boolean;
  readonly destinationInsideAura: boolean;
}): BattleMagicSuppressionTransitWitness {
  return {
    kind: "magicSuppressionTransit",
    areaId: antimagicFieldAreaId,
    sourceCombatantId: spellTargetId,
    originInsideAura: input.originInsideAura,
    destinationInsideAura: input.destinationInsideAura,
  };
}
