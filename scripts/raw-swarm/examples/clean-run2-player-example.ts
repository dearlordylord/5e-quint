import type { PlayerContinuation } from "@dnd/player-sdk";

export const continueBattle: PlayerContinuation = async (context) => {
  /**
   * A cleaned, representative slice of database run 2's public-SDK player
   * program. This exact wrapper can replace the harness's attempt.ts.
   */
  type AvailableBattleAct = ReturnType<
    typeof context.sdk.discoverBattleActs
  >[number];
  type BattleFill = Parameters<
    typeof context.sdk.resolveBattleRuntimeSubject
  >[0]["fills"][number];
  type RolledDiceFill = Extract<BattleFill, { readonly kind: "rolledDice" }>;
  type DieRollResult = RolledDiceFill["value"][number]["results"][number];

  const d4Result = (value: 1 | 2 | 3 | 4): DieRollResult =>
    value as DieRollResult;
  const magicMissileAct = (): AvailableBattleAct | undefined =>
    context.sdk
      .discoverBattleActs(context.session)
      .find(
        (act) =>
          act.label === "Magic Missile" &&
          act.presentation.kind === "spell" &&
          act.presentation.invocation.tag === "spellSlot" &&
          act.presentation.invocation.slotLevel === 1,
      );

  const act = magicMissileAct();
  if (act === undefined) {
    return {
      kind: "continue",
      session: context.session,
      observation: {
        note: "No surfaced 1st-level Magic Missile act is available.",
      },
    };
  }

  const targetHole = act.initialHoles.find(
    (hole) => hole.kind === "spellTargetAllocation",
  );
  if (targetHole === undefined) {
    return {
      kind: "continue",
      session: context.session,
      observation: { note: "Magic Missile did not surface target allocation." },
    };
  }

  const targetId = targetHole.choices[0];
  if (targetId === undefined) {
    return {
      kind: "continue",
      session: context.session,
      observation: {
        note: "The surfaced target-allocation hole has no legal target.",
      },
    };
  }

  const targetFill = {
    kind: "spellTargetAllocation",
    holeId: targetHole.holeId,
    value: { allocations: [{ targetId, count: 3 }] },
    // The scenario SDK derives current range and sight facts from its session.
    spatialFacts: [],
  } satisfies Extract<BattleFill, { readonly kind: "spellTargetAllocation" }>;

  // A needsHoles result does not retain this prefix for a later replay. Keep
  // the accepted target fill when asking for damage.
  const targetResult = context.sdk.resolveBattleRuntimeSubject({
    session: context.session,
    subject: act.subject,
    fills: [targetFill],
  });
  if (targetResult.tag !== "needsHoles") {
    return {
      kind: "continue",
      session: targetResult.session,
      observation: {
        note: `Magic Missile for ${String(act.subject.actorId)} returned ${targetResult.tag}.`,
      },
    };
  }

  const damageHole = targetResult.holes.find(
    (hole) => hole.kind === "rolledDice",
  );
  if (damageHole === undefined) {
    return {
      kind: "continue",
      session: targetResult.session,
      observation: {
        note: `Magic Missile returned ${targetResult.tag}; holes: ${targetResult.holes.map((hole) => hole.kind).join(", ")}.`,
      },
    };
  }

  const damageFill = {
    kind: "rolledDice",
    holeId: damageHole.holeId,
    value: [
      {
        // One allocation of three darts requires one group of three results.
        results: [d4Result(4), d4Result(4), d4Result(4)],
      },
    ],
  } satisfies RolledDiceFill;

  const result = context.sdk.resolveBattleRuntimeSubject({
    session: targetResult.session,
    subject: targetResult.subject,
    fills: [targetFill, damageFill],
  });

  return {
    kind: "continue",
    session: result.session,
    observation: {
      note: `Magic Missile for ${String(act.subject.actorId)} returned ${result.tag}.`,
    },
  };
};
