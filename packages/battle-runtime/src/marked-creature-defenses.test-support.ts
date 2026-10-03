// RAW: .references/srd-5.2.1/classes.md:6813-6816.
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  startBattleSessionRight,
  battleId,
  characterSeed,
  skeletonId,
  skeletonCreatureInit,
  statBlockCreatureInit,
  unitLibrary,
  supportedBattleUnitRef,
  spellRecord,
  wizardSpellcasting,
  discoverBattleActs,
  findHole,
  targetFill,
  requireResolved,
  resolveBattleSubject,
  resistantSkeletonCreatureInit,
  combatantId,
  type CombatantId,
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleProcedureExecutionRefForTest,
  elapsedTimeTicks,
  tickDurationEffects,
} from "./battle-runtime.test-support.ts";

export const characterTargetId = combatantId("character:marked-prey");
export function markedSession(
  feature = true,
  targetId: CombatantId = skeletonId,
  resistant = false,
) {
  const session = startBattleSessionRight({
    battleId: battleId("battle:marked-defense-disclosure"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: feature
          ? [
              supportedBattleUnitRef(
                unitLibrary.requireUnit("ranger_hunters_lore"),
              ),
            ]
          : [],
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("hunters_mark")],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
      resistant
        ? resistantSkeletonCreatureInit({ initiative: 5 })
        : skeletonCreatureInit({ initiative: 5 }),
      characterSeed({ combatantId: characterTargetId, initiative: 1 }),
    ],
  });
  const act = discoverBattleActs(session).find(
    (act) =>
      battleActSpellPresentation(act)?.invocation.spellId === "hunters_mark",
  );
  if (act === undefined) throw new Error("Expected mark spell.");
  const marked = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill(findHole(act.initialHoles, "targetChoice"), targetId)],
    }),
  );
  return battleRuntimeSessionForTest({
    state: marked.state,
    context: session.context,
  });
}

export function markedDefenseEffectLifetime() {
  const session = markedSession();
  const allocation = battleStateWithAllocatedEffectOccurrencesForTest({
    state: session.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "damageResistance",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-marked-prey-fire-resistance",
          ),
          sourceCombatantId: skeletonId,
          damageType: "fire",
          expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
        },
      },
      {
        kind: "activeEffect",
        ownerId: skeletonId,
        effect: {
          kind: "conditionImmunity",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-marked-prey-charm-immunity",
          ),
          sourceCombatantId: skeletonId,
          condition: "charmed",
          conditionHadNonSpellSource: false,
          expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
        },
      },
    ],
  });
  const defended = battleRuntimeSessionForTest({
    state: allocation.state,
    context: session.context,
  });
  const expired = battleRuntimeSessionForTest({
    state: {
      ...defended.state,
      combatants: tickDurationEffects(defended.state.combatants).value,
    },
    context: session.context,
  });
  return { defended, expired };
}
