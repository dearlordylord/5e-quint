import { Effect, Match, Random } from "effect";

import { battleMainHandDamageDie } from "@dnd/core/battle-machine-creature.ts";
import type {
  BattleContext,
  CreatureId,
} from "@dnd/core/battle-machine-types.ts";
import type {
  BattleResolutionRequest,
  BattleResolutionRuntimeInputs,
  ResolutionRequest,
  ResolutionRuntimeInputs,
} from "@dnd/core/available-actions.ts";
import { bardicInspirationDie } from "@dnd/core/features/class-bard.ts";
import { classHitDie } from "@dnd/core/features/class-tables.ts";
import { pMartialArtsDie } from "@dnd/core/features/class-monk.ts";
import type { DndContext } from "@dnd/core/machine-types.ts";

export function buildRuntimeInputs(
  request: ResolutionRequest,
  context: DndContext,
): Effect.Effect<ResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "none" }, () =>
      Effect.succeed({ runtime: "none" as const }),
    ),
    Match.when({ runtime: "startTurn" }, () =>
      Effect.succeed({
        runtime: "startTurn" as const,
        values: {},
      }),
    ),
    // These actions already have an owned pending trigger window in core state.
    // The current machine/event contract still reduces the underlying reroll/save
    // math to a final success boolean, so MCP can only supply that boolean here.
    // For now the demo runtime samples it randomly; richer battle/session-level
    // roll ownership should replace this once the machine owns more than the
    // final success/failure outcome.
    Match.when({ runtime: "tacticalMind" }, () =>
      Effect.map(Random.nextBoolean, (boostedCheckSucceeds) => ({
        runtime: "tacticalMind" as const,
        values: { boostedCheckSucceeds },
      })),
    ),
    Match.when({ runtime: "wholenessOfBody" }, () => {
      const monk = context.classStates.monk;
      const dieSize = pMartialArtsDie(monk?.level ?? 0);
      const wisMod = monk?.wholenessMax ?? 0;
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (dieRoll) => ({
        runtime: "wholenessOfBody" as const,
        values: { healRoll: Math.max(1, dieRoll + wisMod) },
      }));
    }),
    Match.when({ runtime: "uncannyMetabolism" }, () => {
      const monk = context.classStates.monk;
      const dieSize = pMartialArtsDie(monk?.level ?? 0);
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (healRoll) => ({
        runtime: "uncannyMetabolism" as const,
        values: { healRoll },
      }));
    }),
    Match.when({ runtime: "secondWind" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "secondWind" as const,
        values: { d10Roll },
      })),
    ),
    Match.when({ runtime: "tireless" }, () =>
      Effect.map(Random.nextIntBetween(1, 9), (d8Roll) => ({
        runtime: "tireless" as const,
        values: { d8Roll },
      })),
    ),
    Match.when({ runtime: "peerlessSkill" }, () =>
      Effect.map(Random.nextBoolean, (success) => ({
        runtime: "peerlessSkill" as const,
        values: { success },
      })),
    ),
    Match.when({ runtime: "relentlessRage" }, () =>
      Effect.map(Random.nextBoolean, (conSaveSucceeded) => ({
        runtime: "relentlessRage" as const,
        values: { conSaveSucceeded },
      })),
    ),
    Match.when({ runtime: "shortRest" }, (resolved) =>
      Effect.forEach(resolved.token.spendHitDice, (className) =>
        Effect.map(
          Random.nextIntBetween(1, classHitDie(className) + 1),
          (roll) => ({ className, roll }),
        ),
      ).pipe(
        Effect.map((hdRolls) => ({
          runtime: "shortRest" as const,
          values: { hdRolls },
        })),
      ),
    ),
    Match.exhaustive,
  );
}

export function buildBattleRuntimeInputs(
  request: BattleResolutionRequest,
  context: BattleContext,
): Effect.Effect<BattleResolutionRuntimeInputs> {
  return Match.value(request).pipe(
    Match.when({ runtime: "battleAttack" }, () =>
      Effect.die(
        "battleAttack runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "battleGrapple" }, () =>
      Effect.die(
        "battleGrapple runtime inputs must be supplied explicitly by execute_action.",
      ),
    ),
    Match.when({ runtime: "none" }, () =>
      Effect.succeed({ runtime: "none" as const }),
    ),
    Match.when({ runtime: "counterspell" }, () =>
      Effect.map(Random.nextBoolean, (saveSucceeded) => ({
        runtime: "counterspell" as const,
        values: { saveSucceeded },
      })),
    ),
    Match.when({ runtime: "cuttingWords" }, () => {
      const bardLevel =
        context.creatures.get(request.token.actorId as CreatureId)?.bardLevel ??
        0;
      const dieSize = bardicInspirationDie(bardLevel);
      return Effect.map(Random.nextIntBetween(1, dieSize + 1), (reduction) => ({
        runtime: "cuttingWords" as const,
        values: { reduction },
      }));
    }),
    Match.when({ runtime: "deflectAttacks" }, () =>
      Effect.map(Random.nextIntBetween(1, 11), (d10Roll) => ({
        runtime: "deflectAttacks" as const,
        values: { d10Roll },
      })),
    ),
    Match.when({ runtime: "readyAttack" }, () => {
      const actor = context.creatures.get(request.token.actorId as CreatureId);
      const damageDie =
        actor == null ? 8 : (battleMainHandDamageDie(actor, true) ?? 8);
      return Effect.all({
        atkRoll: Random.nextIntBetween(1, 21),
        dmg: Random.nextIntBetween(1, damageDie + 1),
        tgtAc: Random.nextIntBetween(10, 19),
        crit: Random.nextBoolean,
        knockOut: Effect.succeed(false),
      }).pipe(
        Effect.map((values) => ({
          runtime: "readyAttack" as const,
          values,
        })),
      );
    }),
    Match.when({ runtime: "readySpellRelease" }, () =>
      Effect.map(Random.nextIntBetween(1, 21), (saveRoll) => ({
        runtime: "readySpellRelease" as const,
        values: { saveRoll },
      })),
    ),
    Match.when({ runtime: "monsterSaveEffect" }, () =>
      Effect.all({
        saveRoll: Random.nextIntBetween(1, 21),
        actorCanSeeTarget: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "monsterSaveEffect" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "hellishRebuke" }, () =>
      Effect.all({
        damage: Random.nextIntBetween(1, 21),
        saveSucceeded: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "hellishRebuke" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "retaliation" }, () =>
      Effect.all({
        attackRoll: Random.nextIntBetween(1, 21),
        damage: Random.nextIntBetween(1, 9),
        targetAc: Random.nextIntBetween(10, 19),
        critical: Random.nextBoolean,
      }).pipe(
        Effect.map((values) => ({
          runtime: "retaliation" as const,
          values,
        })),
      ),
    ),
    Match.when({ runtime: "fireShield" }, () =>
      Effect.map(Random.nextIntBetween(2, 17), (damage) => ({
        runtime: "fireShield" as const,
        values: { damage },
      })),
    ),
    Match.exhaustive,
  );
}
